'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { aspirantsApi } from '../../../../lib/api';
import { evaluationsApi } from '../../../../lib/api';

// ─── Constantes ───────────────────────────────────────────────────────────────
const PHYSICAL_TESTS = [
  { value: 'run_1000m', label: 'Carrera 1000m', unit: 'segundos' },
  { value: 'run_2000m', label: 'Carrera 2000m', unit: 'segundos' },
  { value: 'pushups',   label: 'Flexiones',     unit: 'repeticiones' },
  { value: 'situps',    label: 'Abdominales',   unit: 'repeticiones' },
  { value: 'pullups',   label: 'Dominadas',     unit: 'repeticiones' },
  { value: 'swim_50m',  label: 'Natación 50m',  unit: 'segundos' },
];

const PSYCH_TESTS = [
  '16PF', 'MMPI-2', 'Wartegg', 'HTP', 'Bender', 'Raven', 'Zung', 'Otro'
];

const BLOOD_TYPES = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

// ─── Tab activo ───────────────────────────────────────────────────────────────
const TabBtn = ({ active, onClick, children, color }) => (
  <button onClick={onClick}
    className={`px-4 py-2 text-sm font-medium rounded-t transition-colors border-b-2
      ${active
        ? `${color} border-current`
        : 'text-military-400 border-transparent hover:text-military-200'}`}>
    {children}
  </button>
);

// ─── Tabla genérica de registros ──────────────────────────────────────────────
const RecordRow = ({ cols, row }) => (
  <tr className="border-t border-military-700 hover:bg-military-700/30 transition-colors">
    {cols.map((col, i) => (
      <td key={i} className={`px-4 py-2 text-xs ${col.cls || 'text-military-300'}`}>
        {col.render ? col.render(row) : row[col.key] ?? '—'}
      </td>
    ))}
  </tr>
);

export default function EvaluationsPage() {
  const router = useRouter();
  const params = useParams();
  const id     = params?.id;

  const [aspirant,  setAspirant]  = useState(null);
  const [summary,   setSummary]   = useState(null);
  const [tab,       setTab]       = useState('physical');
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState('');

  // Forms
  const [physForm,  setPhysForm]  = useState({ test_type: 'run_1000m', raw_value: '', score: '', notes: '' });
  const [psychForm, setPsychForm] = useState({ test_name: '16PF', score: '', result: 'APTO', notes: '' });
  const [medForm,   setMedForm]   = useState({ height_cm: '', weight_kg: '', blood_type: 'O+', result: 'APTO', notes: '' });

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [asp, sum] = await Promise.all([
        aspirantsApi.get(id),
        evaluationsApi.summary(id),
      ]);
      setAspirant(asp.data);
      setSummary(sum.data);
    } catch {
      router.push('/aspirants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!localStorage.getItem('access_token')) { router.push('/login'); return; }
    load();
  }, [id]);

  const handlePhysical = async (e) => {
    e.preventDefault();
    setSaving(true); setFormError('');
    try {
      await evaluationsApi.addPhysical({ aspirant_id: id, ...physForm });
      setShowForm(false);
      setPhysForm({ test_type: 'run_1000m', raw_value: '', score: '', notes: '' });
      await load();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Error al guardar');
    } finally { setSaving(false); }
  };

  const handlePsychological = async (e) => {
    e.preventDefault();
    setSaving(true); setFormError('');
    try {
      await evaluationsApi.addPsychological({ aspirant_id: id, ...psychForm });
      setShowForm(false);
      setPsychForm({ test_name: '16PF', score: '', result: 'APTO', notes: '' });
      await load();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Error al guardar');
    } finally { setSaving(false); }
  };

  const handleMedical = async (e) => {
    e.preventDefault();
    setSaving(true); setFormError('');
    try {
      await evaluationsApi.addMedical({ aspirant_id: id, ...medForm });
      setShowForm(false);
      setMedForm({ height_cm: '', weight_kg: '', blood_type: 'O+', result: 'APTO', notes: '' });
      await load();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Error al guardar');
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-military-900 flex items-center justify-center">
        <div className="text-military-400 text-xs animate-pulse tracking-widest">CARGANDO...</div>
      </div>
    );
  }

  const scores = summary?.scores;

  return (
    <div className="min-h-screen bg-military-900">
      {/* Navbar */}
      <nav className="bg-military-800 border-b border-military-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href={'/aspirants/' + id} className="text-military-400 hover:text-military-200 text-sm">
            Atras
          </a>
          <div className="w-px h-4 bg-military-600" />
          <div>
            <h1 className="font-display text-gold-400 font-bold text-sm tracking-widest">EVALUACIONES</h1>
            {aspirant && (
              <p className="text-military-400 text-xs">{aspirant.first_name} {aspirant.last_name} · {aspirant.cedula}</p>
            )}
          </div>
        </div>
        <button onClick={() => { setShowForm(true); setFormError(''); }}
          className="bg-gold-500 hover:bg-gold-400 text-military-900 font-semibold px-4 py-1.5 rounded text-sm transition-colors">
          + Nueva Evaluacion
        </button>
      </nav>

      <main className="p-6 max-w-6xl mx-auto space-y-5">
        {/* Puntajes actuales */}
        {scores && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Academico 40%',    value: scores.academic_score,  color: 'text-blue-400' },
              { label: 'Fisico 35%',       value: scores.physical_score,  color: 'text-green-400' },
              { label: 'Psicologico 15%',  value: scores.psych_score,     color: 'text-purple-400' },
              { label: 'Medico 10%',       value: scores.medical_score,   color: 'text-red-400' },
              { label: 'TOTAL',            value: scores.total_score,     color: 'text-gold-400' },
            ].map((s) => (
              <div key={s.label} className="bg-military-800 border border-military-700 rounded-lg p-3 text-center">
                <p className="text-military-400 text-xs mb-1">{s.label}</p>
                <p className={'text-2xl font-display font-bold ' + s.color}>{s.value ?? '0'}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-military-800 border border-military-700 rounded-lg overflow-hidden">
          <div className="flex gap-1 px-4 pt-3 border-b border-military-700">
            <TabBtn active={tab === 'physical'}      onClick={() => setTab('physical')}      color="text-green-400">
              💪 Fisica ({summary?.physical?.length || 0})
            </TabBtn>
            <TabBtn active={tab === 'psychological'} onClick={() => setTab('psychological')} color="text-purple-400">
              🧠 Psicologica ({summary?.psychological?.length || 0})
            </TabBtn>
            <TabBtn active={tab === 'medical'}       onClick={() => setTab('medical')}       color="text-red-400">
              🏥 Medica ({summary?.medical?.length || 0})
            </TabBtn>
          </div>

          <div className="overflow-x-auto">
            {/* Tabla Física */}
            {tab === 'physical' && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-military-400 text-xs uppercase tracking-wider bg-military-700/50">
                    <th className="px-4 py-2 text-left">Prueba</th>
                    <th className="px-4 py-2 text-right">Valor</th>
                    <th className="px-4 py-2 text-right">Puntaje</th>
                    <th className="px-4 py-2 text-left">Notas</th>
                    <th className="px-4 py-2 text-left">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {summary?.physical?.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-6 text-center text-military-500 text-xs">Sin evaluaciones fisicas</td></tr>
                  ) : summary?.physical?.map((r) => (
                    <tr key={r.id} className="border-t border-military-700 hover:bg-military-700/30">
                      <td className="px-4 py-2 text-xs text-military-200">
                        {PHYSICAL_TESTS.find(t => t.value === r.test_type)?.label || r.test_type}
                      </td>
                      <td className="px-4 py-2 text-xs text-right text-military-300">{r.raw_value}</td>
                      <td className="px-4 py-2 text-xs text-right font-bold text-green-400">{r.score ?? '—'}</td>
                      <td className="px-4 py-2 text-xs text-military-400">{r.notes || '—'}</td>
                      <td className="px-4 py-2 text-xs text-military-500">
                        {new Date(r.evaluated_at).toLocaleDateString('es-EC')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Tabla Psicológica */}
            {tab === 'psychological' && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-military-400 text-xs uppercase tracking-wider bg-military-700/50">
                    <th className="px-4 py-2 text-left">Test</th>
                    <th className="px-4 py-2 text-right">Puntaje</th>
                    <th className="px-4 py-2 text-center">Resultado</th>
                    <th className="px-4 py-2 text-left">Notas</th>
                    <th className="px-4 py-2 text-left">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {summary?.psychological?.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-6 text-center text-military-500 text-xs">Sin evaluaciones psicologicas</td></tr>
                  ) : summary?.psychological?.map((r) => (
                    <tr key={r.id} className="border-t border-military-700 hover:bg-military-700/30">
                      <td className="px-4 py-2 text-xs text-military-200">{r.test_name}</td>
                      <td className="px-4 py-2 text-xs text-right text-purple-400 font-bold">{r.score ?? '—'}</td>
                      <td className="px-4 py-2 text-xs text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                          ${r.result === 'APTO' ? 'bg-green-900 text-green-300' :
                            r.result === 'NO_APTO' ? 'bg-red-900 text-red-300' :
                            'bg-yellow-900 text-yellow-300'}`}>
                          {r.result || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-military-400">{r.notes || '—'}</td>
                      <td className="px-4 py-2 text-xs text-military-500">
                        {new Date(r.evaluated_at).toLocaleDateString('es-EC')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Tabla Médica */}
            {tab === 'medical' && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-military-400 text-xs uppercase tracking-wider bg-military-700/50">
                    <th className="px-4 py-2 text-right">Talla</th>
                    <th className="px-4 py-2 text-right">Peso</th>
                    <th className="px-4 py-2 text-right">IMC</th>
                    <th className="px-4 py-2 text-center">Sangre</th>
                    <th className="px-4 py-2 text-center">Resultado</th>
                    <th className="px-4 py-2 text-left">Notas</th>
                    <th className="px-4 py-2 text-left">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {summary?.medical?.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-6 text-center text-military-500 text-xs">Sin evaluaciones medicas</td></tr>
                  ) : summary?.medical?.map((r) => (
                    <tr key={r.id} className="border-t border-military-700 hover:bg-military-700/30">
                      <td className="px-4 py-2 text-xs text-right text-military-300">{r.height_cm ? r.height_cm + ' cm' : '—'}</td>
                      <td className="px-4 py-2 text-xs text-right text-military-300">{r.weight_kg ? r.weight_kg + ' kg' : '—'}</td>
                      <td className="px-4 py-2 text-xs text-right text-military-300">{r.bmi ?? '—'}</td>
                      <td className="px-4 py-2 text-xs text-center text-military-300">{r.blood_type || '—'}</td>
                      <td className="px-4 py-2 text-xs text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                          ${r.result === 'APTO' ? 'bg-green-900 text-green-300' :
                            r.result === 'NO_APTO' ? 'bg-red-900 text-red-300' :
                            'bg-yellow-900 text-yellow-300'}`}>
                          {r.result}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-military-400">{r.notes || '—'}</td>
                      <td className="px-4 py-2 text-xs text-military-500">
                        {new Date(r.evaluated_at).toLocaleDateString('es-EC')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Modal de nueva evaluación */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-military-800 border border-military-600 rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-military-700">
              <h2 className="font-display text-gold-400 font-bold tracking-wider text-sm">
                NUEVA EVALUACION — {tab === 'physical' ? 'FISICA' : tab === 'psychological' ? 'PSICOLOGICA' : 'MEDICA'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-military-400 hover:text-military-200 text-xl">x</button>
            </div>

            <div className="p-5">
              {/* Tabs dentro del modal */}
              <div className="flex gap-2 mb-4">
                {['physical','psychological','medical'].map((t) => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`flex-1 py-1.5 text-xs rounded transition-colors
                      ${tab === t ? 'bg-military-600 text-military-100' : 'bg-military-700 text-military-400 hover:text-military-200'}`}>
                    {t === 'physical' ? 'Fisica' : t === 'psychological' ? 'Psicologica' : 'Medica'}
                  </button>
                ))}
              </div>

              {/* Form Física */}
              {tab === 'physical' && (
                <form onSubmit={handlePhysical} className="space-y-3">
                  <div>
                    <label className="block text-military-300 text-xs mb-1 uppercase tracking-wider">Prueba</label>
                    <select value={physForm.test_type} onChange={(e) => setPhysForm({...physForm, test_type: e.target.value})}
                      className="w-full bg-military-700 border border-military-600 rounded px-3 py-2 text-military-100 text-sm">
                      {PHYSICAL_TESTS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-military-300 text-xs mb-1 uppercase tracking-wider">
                        Valor ({PHYSICAL_TESTS.find(t => t.value === physForm.test_type)?.unit})
                      </label>
                      <input type="number" value={physForm.raw_value}
                        onChange={(e) => setPhysForm({...physForm, raw_value: e.target.value})}
                        required className="w-full bg-military-700 border border-military-600 rounded px-3 py-2 text-military-100 text-sm" />
                    </div>
                    <div>
                      <label className="block text-military-300 text-xs mb-1 uppercase tracking-wider">Puntaje (0-100)</label>
                      <input type="number" min="0" max="100" value={physForm.score}
                        onChange={(e) => setPhysForm({...physForm, score: e.target.value})}
                        className="w-full bg-military-700 border border-military-600 rounded px-3 py-2 text-military-100 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-military-300 text-xs mb-1 uppercase tracking-wider">Notas</label>
                    <textarea value={physForm.notes} onChange={(e) => setPhysForm({...physForm, notes: e.target.value})}
                      rows={2} className="w-full bg-military-700 border border-military-600 rounded px-3 py-2 text-military-100 text-sm resize-none" />
                  </div>
                  {formError && <div className="bg-red-900/40 border border-red-700 text-red-300 text-xs px-3 py-2 rounded">{formError}</div>}
                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => setShowForm(false)}
                      className="flex-1 bg-military-700 text-military-200 py-2 rounded text-sm border border-military-600">Cancelar</button>
                    <button type="submit" disabled={saving}
                      className="flex-1 bg-gold-500 hover:bg-gold-400 text-military-900 py-2 rounded text-sm font-semibold disabled:opacity-50">
                      {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </form>
              )}

              {/* Form Psicológica */}
              {tab === 'psychological' && (
                <form onSubmit={handlePsychological} className="space-y-3">
                  <div>
                    <label className="block text-military-300 text-xs mb-1 uppercase tracking-wider">Test</label>
                    <select value={psychForm.test_name} onChange={(e) => setPsychForm({...psychForm, test_name: e.target.value})}
                      className="w-full bg-military-700 border border-military-600 rounded px-3 py-2 text-military-100 text-sm">
                      {PSYCH_TESTS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-military-300 text-xs mb-1 uppercase tracking-wider">Puntaje (0-100)</label>
                      <input type="number" min="0" max="100" value={psychForm.score}
                        onChange={(e) => setPsychForm({...psychForm, score: e.target.value})}
                        className="w-full bg-military-700 border border-military-600 rounded px-3 py-2 text-military-100 text-sm" />
                    </div>
                    <div>
                      <label className="block text-military-300 text-xs mb-1 uppercase tracking-wider">Resultado</label>
                      <select value={psychForm.result} onChange={(e) => setPsychForm({...psychForm, result: e.target.value})}
                        className="w-full bg-military-700 border border-military-600 rounded px-3 py-2 text-military-100 text-sm">
                        <option value="APTO">APTO</option>
                        <option value="NO_APTO">NO APTO</option>
                        <option value="CONDICIONAL">CONDICIONAL</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-military-300 text-xs mb-1 uppercase tracking-wider">Notas</label>
                    <textarea value={psychForm.notes} onChange={(e) => setPsychForm({...psychForm, notes: e.target.value})}
                      rows={2} className="w-full bg-military-700 border border-military-600 rounded px-3 py-2 text-military-100 text-sm resize-none" />
                  </div>
                  {formError && <div className="bg-red-900/40 border border-red-700 text-red-300 text-xs px-3 py-2 rounded">{formError}</div>}
                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => setShowForm(false)}
                      className="flex-1 bg-military-700 text-military-200 py-2 rounded text-sm border border-military-600">Cancelar</button>
                    <button type="submit" disabled={saving}
                      className="flex-1 bg-gold-500 hover:bg-gold-400 text-military-900 py-2 rounded text-sm font-semibold disabled:opacity-50">
                      {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </form>
              )}

              {/* Form Médica */}
              {tab === 'medical' && (
                <form onSubmit={handleMedical} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-military-300 text-xs mb-1 uppercase tracking-wider">Talla (cm)</label>
                      <input type="number" value={medForm.height_cm}
                        onChange={(e) => setMedForm({...medForm, height_cm: e.target.value})}
                        placeholder="170" className="w-full bg-military-700 border border-military-600 rounded px-3 py-2 text-military-100 text-sm" />
                    </div>
                    <div>
                      <label className="block text-military-300 text-xs mb-1 uppercase tracking-wider">Peso (kg)</label>
                      <input type="number" value={medForm.weight_kg}
                        onChange={(e) => setMedForm({...medForm, weight_kg: e.target.value})}
                        placeholder="70" className="w-full bg-military-700 border border-military-600 rounded px-3 py-2 text-military-100 text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-military-300 text-xs mb-1 uppercase tracking-wider">Tipo de Sangre</label>
                      <select value={medForm.blood_type} onChange={(e) => setMedForm({...medForm, blood_type: e.target.value})}
                        className="w-full bg-military-700 border border-military-600 rounded px-3 py-2 text-military-100 text-sm">
                        {BLOOD_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-military-300 text-xs mb-1 uppercase tracking-wider">Resultado</label>
                      <select value={medForm.result} onChange={(e) => setMedForm({...medForm, result: e.target.value})}
                        className="w-full bg-military-700 border border-military-600 rounded px-3 py-2 text-military-100 text-sm">
                        <option value="APTO">APTO</option>
                        <option value="NO_APTO">NO APTO</option>
                        <option value="OBSERVADO">OBSERVADO</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-military-300 text-xs mb-1 uppercase tracking-wider">Notas</label>
                    <textarea value={medForm.notes} onChange={(e) => setMedForm({...medForm, notes: e.target.value})}
                      rows={2} className="w-full bg-military-700 border border-military-600 rounded px-3 py-2 text-military-100 text-sm resize-none" />
                  </div>
                  {formError && <div className="bg-red-900/40 border border-red-700 text-red-300 text-xs px-3 py-2 rounded">{formError}</div>}
                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => setShowForm(false)}
                      className="flex-1 bg-military-700 text-military-200 py-2 rounded text-sm border border-military-600">Cancelar</button>
                    <button type="submit" disabled={saving}
                      className="flex-1 bg-gold-500 hover:bg-gold-400 text-military-900 py-2 rounded text-sm font-semibold disabled:opacity-50">
                      {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
