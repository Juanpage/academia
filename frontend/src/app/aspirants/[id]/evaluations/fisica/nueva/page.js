'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { aspirantsApi } from '../../../../../../lib/api';
import api from '../../../../../../lib/api';

const STD = {
  M: { abd: 50, flex: 45, trote: '16:57', natacion: '06:50', salto: 5.0, barras: 10, vel: 15 },
  F: { abd: 40, flex: 33, trote: '18:52', natacion: '07:10', salto: 5.0, barras: 0,  vel: 17 },
};

const EMPTY = {
  genero: 'M',
  abd_reps: '',
  flex_reps: '',
  trote_tiempo_str: '',
  nat_tiempo_str: '',
  salto_metros: '',
  barras_flex_reps: '',
  vel_seg: '',
  notes: '',
};

function TimeInput({ label, value, onChange, placeholder, hint }) {
  return (
    <div>
      <label className="text-military-400 text-xs block mb-1">{label}</label>
      <input type="text" value={value} onChange={onChange}
        placeholder={placeholder || 'MM:SS'}
        className="w-full bg-military-700 border border-military-600 rounded px-3 py-1.5 text-military-100 text-sm focus:outline-none focus:border-gold-500" />
      {hint && <p className="text-military-600 text-xs mt-0.5">{hint}</p>}
    </div>
  );
}

function NumInput({ label, value, onChange, placeholder, hint, step='1', min='0' }) {
  return (
    <div>
      <label className="text-military-400 text-xs block mb-1">{label}</label>
      <input type="number" min={min} step={step} value={value} onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-military-700 border border-military-600 rounded px-3 py-1.5 text-military-100 text-sm focus:outline-none focus:border-gold-500" />
      {hint && <p className="text-military-600 text-xs mt-0.5">{hint}</p>}
    </div>
  );
}

export default function NuevaEvaluacionFisicaPage() {
  const { id }   = useParams();
  const router   = useRouter();
  const [aspirant, setAspirant] = useState(null);
  const [form,     setForm]     = useState(EMPTY);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [preview,  setPreview]  = useState(null);

  useEffect(() => {
    aspirantsApi.get(id).then(r => {
      const asp = r.data.aspirant || r.data;
      setAspirant(asp);
      const g = asp.genero || (asp.gender === 'Femenino' || asp.gender === 'F' ? 'F' : 'M');
      setForm(f => ({ ...f, genero: g }));
    }).catch(() => {});
  }, [id]);

  const std = STD[form.genero] || STD.M;

  function parseTime(str) {
    if (!str) return null;
    const parts = str.split(':');
    if (parts.length === 2) return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    return parseFloat(str);
  }

  function calcPreview() {
    const G = form.genero === 'F' ? 'F' : 'M';
    let total = 0;
    let descalificado = false;
    const items = [];

    // Abdominales
    const abdReps = parseInt(form.abd_reps) || 0;
    const abdReq  = G === 'M' ? 50 : 40;
    const abdScore = parseFloat(Math.min(abdReps / abdReq, 1) * 1.5).toFixed(2);
    items.push({ label: 'Abdominales', score: abdScore, max: 1.5, ok: abdReps >= abdReq });
    total += parseFloat(abdScore);

    // Flexion codo
    const flexReps = parseInt(form.flex_reps) || 0;
    const flexReq  = G === 'M' ? 45 : 33;
    const flexScore = parseFloat(Math.min(flexReps / flexReq, 1) * 1.5).toFixed(2);
    items.push({ label: 'Flexion Codo', score: flexScore, max: 1.5, ok: flexReps >= flexReq });
    total += parseFloat(flexScore);

    // Trote
    const troteSeg = parseTime(form.trote_tiempo_str);
    const troteMejor = G === 'M' ? 777 : 892;
    const troteLimite = G === 'M' ? 1017 : 1132;
    let troteScore = '0.00';
    if (troteSeg) {
      troteScore = parseFloat(Math.min(troteMejor / troteSeg, 1) * 8).toFixed(2);
    }
    items.push({ label: 'Trote 2 Millas', score: troteScore, max: 8, ok: troteSeg && troteSeg <= troteLimite });
    total += parseFloat(troteScore);

    // Natacion
    const natSeg = parseTime(form.nat_tiempo_str);
    const natMejor = G === 'M' ? 290 : 310;
    const natLimite = G === 'M' ? 410 : 430;
    let natScore = '0.00';
    let natOk = false;
    if (natSeg && natSeg <= natLimite) {
      natScore = parseFloat(Math.min(natMejor / natSeg, 1) * 8).toFixed(2);
      natOk = true;
    }
    items.push({ label: 'Natacion 200m', score: natScore, max: 8, ok: natOk });
    total += parseFloat(natScore);

    // Salto
    const saltoM = parseFloat(form.salto_metros) || 0;
    const saltoOk = saltoM >= 5.0;
    if (!saltoOk && form.salto_metros !== '') descalificado = true;
    items.push({ label: 'Salto Decision', score: saltoOk ? 'PASA' : 'NO PASA', max: null, ok: saltoOk, excluyente: true });

    // Barras
    const barrasReps = parseInt(form.barras_flex_reps) || 0;
    const barrasReq  = G === 'M' ? 10 : 0;
    let barrasScore = G === 'F' ? '0.50' : parseFloat(Math.min(barrasReps / 10, 1) * 0.5).toFixed(2);
    items.push({ label: 'Flexiones Barra', score: barrasScore, max: 0.5, ok: G === 'F' || barrasReps >= barrasReq });
    total += parseFloat(barrasScore);

    // Velocidad
    const velSeg = parseFloat(form.vel_seg) || 0;
    const velLimite = G === 'M' ? 15 : 17;
    const velOk = velSeg > 0 && velSeg <= velLimite;
    const velScore = velOk ? '0.50' : '0.00';
    items.push({ label: 'Velocidad 100m', score: velScore, max: 0.5, ok: velOk });
    total += parseFloat(velScore);

    return { items, total: total.toFixed(2), descalificado };
  }

  useEffect(() => {
    setPreview(calcPreview());
  }, [form]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.post('/physical-evaluations', { aspirant_id: id, ...form });
      router.push('/aspirants/' + id + '/evaluations?tab=fisica');
    } catch(e) {
      setError(e.response?.data?.error || 'Error al guardar evaluacion');
    } finally { setSaving(false); }
  }

  const aspirantName = aspirant ? (aspirant.first_name + ' ' + aspirant.last_name) : '...';

  return (
    <div className="min-h-screen bg-military-900 text-military-100">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-5">
          <button onClick={() => router.push('/aspirants/' + id + '/evaluations?tab=fisica')}
            className="text-military-400 hover:text-military-200 text-sm transition-colors">
            &larr; Volver
          </button>
          <span className="text-military-600">/</span>
          <h1 className="text-lg font-bold text-gold-400 font-display">Nueva Evaluacion Fisica</h1>
        </div>
        <p className="text-military-400 text-sm mb-5">
          Aspirante: <span className="text-military-200 font-semibold">{aspirantName}</span>
        </p>

        {error && <p className="text-red-400 text-sm mb-4 bg-red-900/20 px-3 py-2 rounded">{error}</p>}

        <form onSubmit={handleSubmit}>
          {/* Genero */}
          <div className="bg-military-800 border border-military-700 rounded-lg p-5 mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-military-300 mb-2">Genero del Aspirante</h2>
            <span className={'inline-block px-4 py-2 rounded-lg text-sm font-bold ' + (form.genero === 'F' ? 'bg-pink-900/40 text-pink-300 border border-pink-700' : 'bg-blue-900/40 text-blue-300 border border-blue-700')}>
              {form.genero === 'F' ? 'Femenino' : 'Masculino'}
            </span>
            <p className="text-military-600 text-xs mt-1">Estandares aplicados automaticamente segun genero del aspirante</p>
          </div>

          {/* Pruebas */}
          <div className="bg-military-800 border border-military-700 rounded-lg p-5 mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-military-300 mb-4">Pruebas ESMIL</h2>
            <div className="grid grid-cols-2 gap-4">
              <NumInput label={`Abdominales 1'30" (min ${std.abd} reps)`}
                value={form.abd_reps}
                onChange={e => setForm(f => ({ ...f, abd_reps: e.target.value }))}
                placeholder={`Min: ${std.abd}`} hint="Repeticiones en 1 minuto 30 segundos" />

              <NumInput label={`Flexion Codo 1'30" (min ${std.flex} reps)`}
                value={form.flex_reps}
                onChange={e => setForm(f => ({ ...f, flex_reps: e.target.value }))}
                placeholder={`Min: ${std.flex}`} hint="Repeticiones en 1 minuto 30 segundos" />

              <TimeInput label={`Trote 2 Millas (limite ${std.trote})`}
                value={form.trote_tiempo_str}
                onChange={e => setForm(f => ({ ...f, trote_tiempo_str: e.target.value }))}
                placeholder="16:57" hint="Formato MM:SS" />

              <TimeInput label={`Natacion 200m (limite ${std.natacion})`}
                value={form.nat_tiempo_str}
                onChange={e => setForm(f => ({ ...f, nat_tiempo_str: e.target.value }))}
                placeholder="06:50" hint="Formato MM:SS" />

              <div>
                <label className="text-military-400 text-xs block mb-1">Salto de Decision — EXCLUYENTE</label>
                <div className="flex gap-3">
                  <button type="button"
                    onClick={() => setForm(f => ({ ...f, salto_metros: '5.0' }))}
                    className={'flex-1 py-2 rounded-lg text-sm font-bold transition-colors ' +
                      (form.salto_metros === '5.0' ? 'bg-green-600 text-white' : 'bg-military-700 text-military-400 border border-military-600')}>
                    PASA
                  </button>
                  <button type="button"
                    onClick={() => setForm(f => ({ ...f, salto_metros: '0' }))}
                    className={'flex-1 py-2 rounded-lg text-sm font-bold transition-colors ' +
                      (form.salto_metros === '0' ? 'bg-red-600 text-white' : 'bg-military-700 text-military-400 border border-military-600')}>
                    NO PASA
                  </button>
                </div>
                <p className="text-military-600 text-xs mt-0.5">NO PASA = DESCALIFICADO de toda la evaluacion</p>
              </div>

              <NumInput label={`Flexiones en Barra (min ${std.barras} reps)`}
                value={form.barras_flex_reps}
                onChange={e => setForm(f => ({ ...f, barras_flex_reps: e.target.value }))}
                placeholder={`Min: ${std.barras}`} hint="Repeticiones sin limite de tiempo" />

              <NumInput label={`Velocidad 100m (limite ${std.vel} seg)`}
                value={form.vel_seg}
                onChange={e => setForm(f => ({ ...f, vel_seg: e.target.value }))}
                placeholder={`${std.vel}`} step="0.01" hint="Tiempo en segundos" />

              <div>
                <label className="text-military-400 text-xs block mb-1">Observaciones</label>
                <input type="text" value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Notas adicionales..."
                  className="w-full bg-military-700 border border-military-600 rounded px-3 py-1.5 text-military-100 text-sm focus:outline-none focus:border-gold-500" />
              </div>
            </div>
          </div>

          {/* Preview */}
          {preview && (
            <div className={'bg-military-800 border rounded-lg p-5 mb-4 ' + (preview.descalificado ? 'border-red-700' : 'border-military-700')}>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-military-300">Preview Puntaje</h2>
                {preview.descalificado ? (
                  <span className="text-red-400 font-bold text-sm bg-red-900/30 px-3 py-1 rounded">DESCALIFICADO — Salto insuficiente</span>
                ) : (
                  <span className="text-gold-400 font-bold text-2xl font-display">{preview.total}/20</span>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {preview.items.map(item => (
                  <div key={item.label} className="bg-military-700 rounded p-2 text-center">
                    <p className="text-military-500 text-xs mb-1">{item.label}</p>
                    <p className={'text-sm font-bold ' + (item.ok ? 'text-green-400' : 'text-red-400')}>
                      {item.excluyente ? item.score : (item.score + (item.max ? '/' + item.max : ''))}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button type="submit" disabled={saving}
            className="w-full bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-military-900 font-bold py-3 rounded-lg text-sm transition-colors">
            {saving ? 'Guardando...' : 'Registrar Evaluacion Fisica'}
          </button>
        </form>
      </div>
    </div>
  );
}
