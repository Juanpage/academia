'use client';
import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { evaluationsApi, aspirantsApi } from '../../../../lib/api';

const MATERIAS = [
  { key: 'ingles',                label: 'Ingles' },
  { key: 'matematicas',           label: 'Matematicas' },
  { key: 'historia_realidad',     label: 'Historia y Realidad Nac.' },
  { key: 'lenguaje_comunicacion', label: 'Lenguaje y Comunicacion' },
  { key: 'fisica',                label: 'Fisica' },
  { key: 'trigonometria',         label: 'Trigonometria' },
];

const PRUEBAS_PSICO = [
  { key: 'test_16pf',      label: 'Test 16PF (Personalidad)',  max: 5 },
  { key: 'test_raven',     label: 'Test Raven (Inteligencia)', max: 5 },
  { key: 'entrevista',     label: 'Entrevista Psicologica',    max: 5 },
  { key: 'test_liderazgo', label: 'Test de Liderazgo',         max: 5 },
];

const PRUEBAS_FIS = [
  { label: 'Abdominales',     score: 'abd_score',         reps: 'abd_reps',         aprobado: 'abd_aprobado'         },
  { label: 'Flexion Codo',    score: 'flex_score',        reps: 'flex_reps',        aprobado: 'flex_aprobado'        },
  { label: 'Trote 2 Millas',  score: 'trote_score',       reps: 'trote_tiempo_str', aprobado: 'trote_aprobado'       },
  { label: 'Natacion 200m',   score: 'nat_score',         reps: 'nat_tiempo_str',   aprobado: 'nat_aprobado'         },
  { label: 'Salto Decision',  score: null,                reps: 'salto_metros',     aprobado: 'salto_aprobado'       },
  { label: 'Flexiones Barra', score: 'barras_flex_score', reps: 'barras_flex_reps', aprobado: 'barras_flex_aprobado' },
  { label: 'Velocidad 100m',  score: 'vel_score',         reps: 'vel_seg',          aprobado: 'vel_aprobado'         },
];

const TIPOS_SANGRE = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const TABS = [
  { key: 'academica', label: 'Academica'   },
  { key: 'fisica',    label: 'Fisica'      },
  { key: 'psico',     label: 'Psicologica' },
  { key: 'medica',    label: 'Medica'      },
];

const EMPTY_ACAD    = { ingles:'', matematicas:'', historia_realidad:'', lenguaje_comunicacion:'', fisica:'', trigonometria:'', periodo:'', notes:'' };
const EMPTY_PSICO   = { test_16pf:'', test_raven:'', entrevista:'', test_liderazgo:'', resultado:'APTO', periodo:'', notes:'' };
const EMPTY_MEDICAL = { talla_cm:'', peso_kg:'', tipo_sangre:'', institucion_emisora:'', fecha_certificado:'', notes:'' };

function imcLabel(imc) {
  if (!imc) return '';
  if (imc < 18.5) return 'Bajo peso';
  if (imc < 25)   return 'Normal';
  if (imc < 30)   return 'Sobrepeso';
  return 'Obesidad';
}

function imcColor(imc) {
  if (!imc) return 'text-military-400';
  if (imc < 18.5) return 'text-blue-400';
  if (imc < 25)   return 'text-green-400';
  if (imc < 30)   return 'text-yellow-400';
  return 'text-red-400';
}

export default function EvaluationsPage() {
  const { id }       = useParams();
  const searchParams = useSearchParams();
  const router       = useRouter();
  const tab          = searchParams.get('tab') || 'academica';

  const [aspirant,    setAspirant]    = useState(null);
  const [academic,    setAcademic]    = useState([]);
  const [physical,    setPhysical]    = useState([]);
  const [psico,       setPsico]       = useState([]);
  const [medical,     setMedical]     = useState([]);
  const [formAcad,    setFormAcad]    = useState(EMPTY_ACAD);
  const [formPsico,   setFormPsico]   = useState(EMPTY_PSICO);
  const [formMedical, setFormMedical] = useState(EMPTY_MEDICAL);
  const [loading,     setLoading]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState('');
  const [deleting,    setDeleting]    = useState(null);
  const [userRole,    setUserRole]    = useState('');

  useEffect(() => {
    aspirantsApi.get(id).then(r => setAspirant(r.data.aspirant || r.data)).catch(() => {});
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role || '');
      }
    } catch(e) {}
  }, [id]);

  useEffect(() => {
    setError(''); setSuccess('');
    if (tab === 'academica') loadAcademic();
    if (tab === 'fisica')    loadPhysical();
    if (tab === 'psico')     loadPsico();
    if (tab === 'medica')    loadMedical();
  }, [tab, id]);

  const canEdit      = ['super_admin','admin','instructor','evaluador','psicologo','medico'].includes(userRole);
  const aspirantName = aspirant ? (aspirant.first_name + ' ' + aspirant.last_name) : '...';

  async function loadAcademic() {
    setLoading(true);
    try { const r = await evaluationsApi.getAcademic(id); setAcademic(r.data.evaluations || []); }
    catch { setError('Error cargando evaluaciones academicas'); }
    finally { setLoading(false); }
  }
  async function loadPhysical() {
    setLoading(true);
    try { const r = await evaluationsApi.getPhysical(id); setPhysical(r.data.evaluations || []); }
    catch { setError('Error cargando evaluaciones fisicas'); }
    finally { setLoading(false); }
  }
  async function loadPsico() {
    setLoading(true);
    try { const r = await evaluationsApi.getPsych(id); setPsico(r.data.evaluations || []); }
    catch { setError('Error cargando evaluaciones psicologicas'); }
    finally { setLoading(false); }
  }
  async function loadMedical() {
    setLoading(true);
    try { const r = await evaluationsApi.getMedicalEval(id); setMedical(r.data.evaluations || []); }
    catch { setError('Error cargando datos medicos'); }
    finally { setLoading(false); }
  }

  function previewAcad() {
    const vals = MATERIAS.map(m => formAcad[m.key]).filter(v => v !== '');
    if (!vals.length) return '--';
    return (vals.reduce((a,b) => a + parseFloat(b), 0) / vals.length).toFixed(2);
  }
  function previewPsico() {
    const vals = PRUEBAS_PSICO.map(p => formPsico[p.key]).filter(v => v !== '');
    if (!vals.length) return '--';
    return vals.reduce((a,b) => a + parseFloat(b), 0).toFixed(2);
  }
  function previewIMC() {
    const t = parseFloat(formMedical.talla_cm);
    const p = parseFloat(formMedical.peso_kg);
    if (!t || !p) return null;
    return parseFloat((p / Math.pow(t/100, 2)).toFixed(2));
  }

  async function submitAcademic(e) {
    e.preventDefault(); setSaving(true); setError(''); setSuccess('');
    try {
      await evaluationsApi.addAcademic({ aspirant_id: id, ...formAcad });
      setSuccess('Evaluacion academica registrada');
      setFormAcad(EMPTY_ACAD); loadAcademic();
    } catch(e) { setError(e.response?.data?.error || 'Error al guardar'); }
    finally { setSaving(false); }
  }
  async function submitPsico(e) {
    e.preventDefault(); setSaving(true); setError(''); setSuccess('');
    try {
      await evaluationsApi.addPsych({ aspirant_id: id, ...formPsico });
      setSuccess('Evaluacion psicologica registrada');
      setFormPsico(EMPTY_PSICO); loadPsico();
    } catch(e) { setError(e.response?.data?.error || 'Error al guardar'); }
    finally { setSaving(false); }
  }
  async function submitMedical(e) {
    e.preventDefault(); setSaving(true); setError(''); setSuccess('');
    try {
      await evaluationsApi.addMedicalEval({ aspirant_id: id, ...formMedical });
      setSuccess('Datos medicos registrados correctamente');
      setFormMedical(EMPTY_MEDICAL); loadMedical();
    } catch(e) { setError(e.response?.data?.error || 'Error al guardar'); }
    finally { setSaving(false); }
  }

  async function handleDelete(type, evalId) {
    if (!confirm('Eliminar este registro?')) return;
    setDeleting(evalId);
    try {
      if (type === 'academic') { await evaluationsApi.deleteAcademic(evalId);    loadAcademic(); }
      if (type === 'physical') { await evaluationsApi.deletePhysical(evalId);    loadPhysical(); }
      if (type === 'psico')    { await evaluationsApi.deletePsych(evalId);       loadPsico(); }
      if (type === 'medical')  { await evaluationsApi.deleteMedicalEval(evalId); loadMedical(); }
    } catch { setError('Error al eliminar'); }
    finally { setDeleting(null); }
  }

  const ScoreCard = ({ label, value, max, color }) => (
    <div className="text-center bg-military-800 rounded-lg p-3">
      <p className="text-military-500 text-xs mb-1">{label}</p>
      <p className={'text-lg font-bold font-display ' + (color || 'text-gold-400')}>{value != null ? parseFloat(value).toFixed(2) : '--'}</p>
      {max && <p className="text-military-600 text-xs">/{max}</p>}
    </div>
  );

  const inputCls = "w-full bg-military-700 border border-military-600 rounded px-3 py-1.5 text-military-100 text-sm focus:outline-none focus:border-gold-500";

  return (
    <div className="min-h-screen bg-military-900 text-military-100">
      <div className="max-w-4xl mx-auto px-4 py-6">

        <div className="flex items-center gap-2 mb-1">
          <button onClick={() => router.push('/aspirants/' + id)}
            className="text-military-400 hover:text-military-200 text-sm transition-colors">
            &larr; Volver
          </button>
          <span className="text-military-600">/</span>
          <h1 className="text-lg font-bold text-gold-400 font-display">Evaluaciones</h1>
        </div>
        <p className="text-military-400 text-sm mb-5 ml-14">
          Aspirante: <span className="text-military-200 font-semibold">{aspirantName}</span>
        </p>

        <div className="flex gap-2 mb-6 flex-wrap">
          {TABS.map(t => (
            <button key={t.key}
              onClick={() => router.push('/aspirants/' + id + '/evaluations?tab=' + t.key)}
              className={'px-4 py-2 rounded-lg text-sm font-medium transition-colors ' +
                (tab === t.key ? 'bg-gold-500 text-military-900 font-bold' : 'bg-military-800 text-military-400 hover:text-military-200 border border-military-700')}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── ACADEMICA ── */}
        {tab === 'academica' && (
          <div className="space-y-5">
            {canEdit && (
              <div className="bg-military-800 border border-military-700 rounded-lg p-5">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-military-300 mb-4">
                  Registrar Evaluacion Academica — {aspirantName}
                </h2>
                {error   && <p className="text-red-400 text-sm mb-3 bg-red-900/20 px-3 py-2 rounded">{error}</p>}
                {success && <p className="text-green-400 text-sm mb-3 bg-green-900/20 px-3 py-2 rounded">{success}</p>}
                <form onSubmit={submitAcademic}>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    {MATERIAS.map(m => (
                      <div key={m.key}>
                        <label className="text-military-400 text-xs block mb-1">{m.label} (0–20)</label>
                        <input type="number" min="0" max="20" step="0.01"
                          value={formAcad[m.key]}
                          onChange={e => setFormAcad(f => ({ ...f, [m.key]: e.target.value }))}
                          placeholder="0.00" className={inputCls} />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-4 bg-military-700/60 border border-military-600 rounded-lg px-4 py-3 mb-4 items-center">
                    <div className="text-center">
                      <p className="text-military-400 text-xs uppercase tracking-wide mb-0.5">Promedio /20</p>
                      <p className="text-gold-400 font-bold text-2xl font-display">{previewAcad()}</p>
                    </div>
                    <div className="ml-auto text-right text-xs text-military-500">
                      <p>Ponderacion: 40%</p>
                      <p>({MATERIAS.filter(m => formAcad[m.key] !== '').length}/6 materias)</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-military-400 text-xs block mb-1">Periodo</label>
                      <input type="text" value={formAcad.periodo} onChange={e => setFormAcad(f => ({ ...f, periodo: e.target.value }))} placeholder="Ej: 2025-I" className={inputCls} />
                    </div>
                    <div>
                      <label className="text-military-400 text-xs block mb-1">Observaciones</label>
                      <input type="text" value={formAcad.notes} onChange={e => setFormAcad(f => ({ ...f, notes: e.target.value }))} placeholder="Notas adicionales..." className={inputCls} />
                    </div>
                  </div>
                  <button type="submit" disabled={saving}
                    className="w-full bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-military-900 font-bold py-2.5 rounded-lg text-sm transition-colors">
                    {saving ? 'Guardando...' : 'Registrar Evaluacion Academica'}
                  </button>
                </form>
              </div>
            )}
            <div className="bg-military-800 border border-military-700 rounded-lg p-5">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-military-300 mb-4">Historial ({academic.length})</h2>
              {loading ? <p className="text-military-400 text-sm text-center py-4">Cargando...</p>
              : academic.length === 0 ? <p className="text-military-500 text-sm text-center py-8">Sin evaluaciones academicas registradas</p>
              : (
                <div className="space-y-3">
                  {academic.map(ev => (
                    <div key={ev.id} className="bg-military-700 border border-military-600 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-baseline gap-2">
                          <span className="text-gold-400 font-bold text-xl font-display">{parseFloat(ev.promedio_100).toFixed(2)}</span>
                          <span className="text-military-400 text-xs">/20</span>
                          {ev.periodo && <span className="text-military-400 text-xs border border-military-600 rounded px-1.5 py-0.5">{ev.periodo}</span>}
                        </div>
                        {canEdit && <button onClick={() => handleDelete('academic', ev.id)} disabled={deleting === ev.id} className="text-red-500 hover:text-red-400 text-xs disabled:opacity-50">{deleting === ev.id ? 'Eliminando...' : 'Eliminar'}</button>}
                      </div>
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-2">
                        {MATERIAS.map(m => (
                          <div key={m.key} className="text-center bg-military-800 rounded p-1.5">
                            <p className="text-military-500 text-xs truncate mb-0.5">{m.label}</p>
                            <p className={'text-sm font-semibold ' + (ev[m.key] == null ? 'text-military-600' : parseFloat(ev[m.key]) >= 14 ? 'text-green-400' : parseFloat(ev[m.key]) >= 10 ? 'text-yellow-400' : 'text-red-400')}>
                              {ev[m.key] != null ? parseFloat(ev[m.key]).toFixed(2) : '--'}
                            </p>
                          </div>
                        ))}
                      </div>
                      {ev.notes && <p className="text-military-400 text-xs">Obs: {ev.notes}</p>}
                      <p className="text-military-600 text-xs mt-1">{ev.evaluador || 'Sistema'} &middot; {new Date(ev.created_at).toLocaleDateString('es-EC',{day:'2-digit',month:'short',year:'numeric'})}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── FISICA ── */}
        {tab === 'fisica' && (
          <div className="space-y-5">
            {error && <p className="text-red-400 text-sm bg-red-900/20 px-3 py-2 rounded">{error}</p>}
            <div className="bg-military-800 border border-military-700 rounded-lg p-5">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-military-300">Historial Evaluaciones Fisicas ({physical.length})</h2>
                {canEdit && (
                  <button onClick={() => router.push('/aspirants/' + id + '/evaluations/fisica/nueva')}
                    className="bg-gold-500 hover:bg-gold-400 text-military-900 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                    + Nueva Evaluacion
                  </button>
                )}
              </div>
              {loading ? <p className="text-military-400 text-sm text-center py-4">Cargando...</p>
              : physical.length === 0 ? <p className="text-military-500 text-sm text-center py-8">Sin evaluaciones fisicas registradas</p>
              : (
                <div className="space-y-4">
                  {physical.map(ev => (
                    <div key={ev.id} className={'bg-military-700 border rounded-lg p-4 ' + (ev.es_descalificado ? 'border-red-700' : 'border-military-600')}>
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-baseline gap-2">
                          {ev.es_descalificado ? <span className="text-red-400 font-bold text-lg">DESCALIFICADO</span> : (
                            <><span className="text-gold-400 font-bold text-xl font-display">{parseFloat(ev.total_score_20||0).toFixed(2)}</span><span className="text-military-400 text-xs">/20</span></>
                          )}
                          <span className={'text-xs px-2 py-0.5 rounded font-medium ' + (ev.genero==='M' ? 'bg-blue-900/40 text-blue-300' : 'bg-pink-900/40 text-pink-300')}>
                            {ev.genero==='M' ? 'Masculino' : 'Femenino'}
                          </span>
                        </div>
                        {canEdit && <button onClick={() => handleDelete('physical', ev.id)} disabled={deleting===ev.id} className="text-red-500 hover:text-red-400 text-xs disabled:opacity-50">{deleting===ev.id ? 'Eliminando...' : 'Eliminar'}</button>}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                        {PRUEBAS_FIS.map(pr => (
                          <div key={pr.label} className="bg-military-800 rounded p-2 text-center">
                            <p className="text-military-500 text-xs mb-1">{pr.label}</p>
                            <p className="text-military-200 text-sm font-medium">{ev[pr.reps] != null ? ev[pr.reps] : '--'}</p>
                            {pr.score && ev[pr.score] != null && <p className="text-gold-400 text-xs">{parseFloat(ev[pr.score]).toFixed(2)} pts</p>}
                            <span className={'text-xs font-semibold ' + (ev[pr.aprobado] ? 'text-green-400' : 'text-red-400')}>{ev[pr.aprobado] ? 'PASA' : 'NO PASA'}</span>
                          </div>
                        ))}
                      </div>
                      {ev.notes && <p className="text-military-400 text-xs">Obs: {ev.notes}</p>}
                      <p className="text-military-600 text-xs mt-1">{ev.evaluador || 'Sistema'} &middot; {new Date(ev.created_at).toLocaleDateString('es-EC',{day:'2-digit',month:'short',year:'numeric'})}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PSICOLOGICA ── */}
        {tab === 'psico' && (
          <div className="space-y-5">
            {canEdit && (
              <div className="bg-military-800 border border-military-700 rounded-lg p-5">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-military-300 mb-4">
                  Registrar Evaluacion Psicologica — {aspirantName}
                </h2>
                {error   && <p className="text-red-400 text-sm mb-3 bg-red-900/20 px-3 py-2 rounded">{error}</p>}
                {success && <p className="text-green-400 text-sm mb-3 bg-green-900/20 px-3 py-2 rounded">{success}</p>}
                <form onSubmit={submitPsico}>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {PRUEBAS_PSICO.map(pr => (
                      <div key={pr.key}>
                        <label className="text-military-400 text-xs block mb-1">{pr.label} (0–{pr.max})</label>
                        <input type="number" min="0" max={pr.max} step="0.01"
                          value={formPsico[pr.key]}
                          onChange={e => setFormPsico(f => ({ ...f, [pr.key]: e.target.value }))}
                          placeholder="0.00" className={inputCls} />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-6 bg-military-700/60 border border-military-600 rounded-lg px-4 py-3 mb-4 items-center">
                    <div className="text-center">
                      <p className="text-military-400 text-xs uppercase tracking-wide mb-0.5">Total /20</p>
                      <p className="text-gold-400 font-bold text-2xl font-display">{previewPsico()}</p>
                    </div>
                    <div className="w-px bg-military-600 self-stretch" />
                    <div className="flex-1">
                      <p className="text-military-400 text-xs mb-2">Resultado Global</p>
                      <div className="flex gap-3">
                        {['APTO','NO_APTO'].map(r => (
                          <button type="button" key={r}
                            onClick={() => setFormPsico(f => ({ ...f, resultado: r }))}
                            className={'flex-1 py-2 rounded-lg text-sm font-bold transition-colors ' +
                              (formPsico.resultado === r ? (r==='APTO' ? 'bg-green-600 text-white' : 'bg-red-600 text-white') : 'bg-military-700 text-military-400 border border-military-600 hover:border-military-400')}>
                            {r==='APTO' ? 'APTO' : 'NO APTO'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="text-right text-xs text-military-500"><p>Ponderacion: 15%</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-military-400 text-xs block mb-1">Periodo</label>
                      <input type="text" value={formPsico.periodo} onChange={e => setFormPsico(f => ({ ...f, periodo: e.target.value }))} placeholder="Ej: 2025-I" className={inputCls} />
                    </div>
                    <div>
                      <label className="text-military-400 text-xs block mb-1">Observaciones</label>
                      <input type="text" value={formPsico.notes} onChange={e => setFormPsico(f => ({ ...f, notes: e.target.value }))} placeholder="Notas adicionales..." className={inputCls} />
                    </div>
                  </div>
                  <button type="submit" disabled={saving}
                    className="w-full bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-military-900 font-bold py-2.5 rounded-lg text-sm transition-colors">
                    {saving ? 'Guardando...' : 'Registrar Evaluacion Psicologica'}
                  </button>
                </form>
              </div>
            )}
            <div className="bg-military-800 border border-military-700 rounded-lg p-5">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-military-300 mb-4">Historial ({psico.length})</h2>
              {loading ? <p className="text-military-400 text-sm text-center py-4">Cargando...</p>
              : psico.length === 0 ? <p className="text-military-500 text-sm text-center py-8">Sin evaluaciones psicologicas registradas</p>
              : (
                <div className="space-y-3">
                  {psico.map(ev => (
                    <div key={ev.id} className={'bg-military-700 border rounded-lg p-4 ' + (ev.resultado==='NO_APTO' ? 'border-red-700' : 'border-military-600')}>
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-baseline gap-3">
                          <span className="text-gold-400 font-bold text-xl font-display">{parseFloat(ev.total_score||0).toFixed(2)}</span>
                          <span className="text-military-400 text-xs">/20</span>
                          <span className={'text-xs font-bold px-2 py-0.5 rounded ' + (ev.resultado==='APTO' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400')}>{ev.resultado==='APTO' ? 'APTO' : 'NO APTO'}</span>
                          {ev.periodo && <span className="text-military-400 text-xs border border-military-600 rounded px-1.5 py-0.5">{ev.periodo}</span>}
                        </div>
                        {canEdit && <button onClick={() => handleDelete('psico', ev.id)} disabled={deleting===ev.id} className="text-red-500 hover:text-red-400 text-xs disabled:opacity-50">{deleting===ev.id ? 'Eliminando...' : 'Eliminar'}</button>}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                        {PRUEBAS_PSICO.map(pr => (
                          <ScoreCard key={pr.key} label={pr.label} value={ev[pr.key]} max={pr.max}
                            color={ev[pr.key]==null ? 'text-military-600' : parseFloat(ev[pr.key])>=pr.max*0.7 ? 'text-green-400' : parseFloat(ev[pr.key])>=pr.max*0.5 ? 'text-yellow-400' : 'text-red-400'} />
                        ))}
                      </div>
                      {ev.notes && <p className="text-military-400 text-xs">Obs: {ev.notes}</p>}
                      <p className="text-military-600 text-xs mt-1">{ev.evaluador || 'Sistema'} &middot; {new Date(ev.created_at).toLocaleDateString('es-EC',{day:'2-digit',month:'short',year:'numeric'})}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MEDICA ── */}
        {tab === 'medica' && (
          <div className="space-y-5">
            {canEdit && (
              <div className="bg-military-800 border border-military-700 rounded-lg p-5">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-military-300 mb-4">
                  Registrar Datos Medicos — {aspirantName}
                </h2>
                {error   && <p className="text-red-400 text-sm mb-3 bg-red-900/20 px-3 py-2 rounded">{error}</p>}
                {success && <p className="text-green-400 text-sm mb-3 bg-green-900/20 px-3 py-2 rounded">{success}</p>}
                <form onSubmit={submitMedical}>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="text-military-400 text-xs block mb-1">Talla (cm)</label>
                      <input type="number" min="100" max="220" step="0.1"
                        value={formMedical.talla_cm}
                        onChange={e => setFormMedical(f => ({ ...f, talla_cm: e.target.value }))}
                        placeholder="Ej: 175.0" className={inputCls} />
                    </div>
                    <div>
                      <label className="text-military-400 text-xs block mb-1">Peso (kg)</label>
                      <input type="number" min="30" max="200" step="0.1"
                        value={formMedical.peso_kg}
                        onChange={e => setFormMedical(f => ({ ...f, peso_kg: e.target.value }))}
                        placeholder="Ej: 70.0" className={inputCls} />
                    </div>
                    <div>
                      <label className="text-military-400 text-xs block mb-1">Tipo de Sangre</label>
                      <select value={formMedical.tipo_sangre}
                        onChange={e => setFormMedical(f => ({ ...f, tipo_sangre: e.target.value }))}
                        className={inputCls}>
                        <option value="">Seleccionar...</option>
                        {TIPOS_SANGRE.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* IMC Preview */}
                  {(formMedical.talla_cm && formMedical.peso_kg) && (
                    <div className="flex gap-4 bg-military-700/60 border border-military-600 rounded-lg px-4 py-3 mb-4 items-center">
                      <div className="text-center">
                        <p className="text-military-400 text-xs uppercase tracking-wide mb-0.5">IMC</p>
                        <p className={'text-2xl font-bold font-display ' + imcColor(previewIMC())}>{previewIMC()}</p>
                      </div>
                      <div className="w-px bg-military-600 self-stretch" />
                      <div>
                        <p className={'text-sm font-semibold ' + imcColor(previewIMC())}>{imcLabel(previewIMC())}</p>
                        <p className="text-military-500 text-xs">Indice de Masa Corporal</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-military-400 text-xs block mb-1">Institucion Emisora</label>
                      <input type="text"
                        value={formMedical.institucion_emisora}
                        onChange={e => setFormMedical(f => ({ ...f, institucion_emisora: e.target.value }))}
                        placeholder="Ej: Hospital Militar Central" className={inputCls} />
                    </div>
                    <div>
                      <label className="text-military-400 text-xs block mb-1">Fecha del Certificado</label>
                      <input type="date"
                        value={formMedical.fecha_certificado}
                        onChange={e => setFormMedical(f => ({ ...f, fecha_certificado: e.target.value }))}
                        className={inputCls} />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-military-400 text-xs block mb-1">Observaciones</label>
                    <input type="text"
                      value={formMedical.notes}
                      onChange={e => setFormMedical(f => ({ ...f, notes: e.target.value }))}
                      placeholder="Notas adicionales..." className={inputCls} />
                  </div>

                  <button type="submit" disabled={saving}
                    className="w-full bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-military-900 font-bold py-2.5 rounded-lg text-sm transition-colors">
                    {saving ? 'Guardando...' : 'Registrar Datos Medicos'}
                  </button>
                </form>
              </div>
            )}

            <div className="bg-military-800 border border-military-700 rounded-lg p-5">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-military-300 mb-4">Historial ({medical.length})</h2>
              {loading ? <p className="text-military-400 text-sm text-center py-4">Cargando...</p>
              : medical.length === 0 ? <p className="text-military-500 text-sm text-center py-8">Sin datos medicos registrados</p>
              : (
                <div className="space-y-3">
                  {medical.map(ev => (
                    <div key={ev.id} className="bg-military-700 border border-military-600 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-3">
                          {ev.tipo_sangre && (
                            <span className="text-lg font-bold text-gold-400 font-display border border-gold-700 rounded px-2 py-0.5">{ev.tipo_sangre}</span>
                          )}
                          {ev.imc && (
                            <span className={'text-sm font-semibold ' + imcColor(ev.imc)}>IMC {parseFloat(ev.imc).toFixed(2)} — {imcLabel(ev.imc)}</span>
                          )}
                        </div>
                        {canEdit && <button onClick={() => handleDelete('medical', ev.id)} disabled={deleting===ev.id} className="text-red-500 hover:text-red-400 text-xs disabled:opacity-50">{deleting===ev.id ? 'Eliminando...' : 'Eliminar'}</button>}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                        <div className="bg-military-800 rounded p-2 text-center">
                          <p className="text-military-500 text-xs mb-1">Talla</p>
                          <p className="text-military-200 font-semibold">{ev.talla_cm ? ev.talla_cm + ' cm' : '--'}</p>
                        </div>
                        <div className="bg-military-800 rounded p-2 text-center">
                          <p className="text-military-500 text-xs mb-1">Peso</p>
                          <p className="text-military-200 font-semibold">{ev.peso_kg ? ev.peso_kg + ' kg' : '--'}</p>
                        </div>
                        <div className="bg-military-800 rounded p-2 text-center col-span-2">
                          <p className="text-military-500 text-xs mb-1">Institucion Emisora</p>
                          <p className="text-military-200 text-sm">{ev.institucion_emisora || '--'}</p>
                        </div>
                      </div>
                      {ev.fecha_certificado && (
                        <p className="text-military-400 text-xs">Certificado: {new Date(ev.fecha_certificado).toLocaleDateString('es-EC',{day:'2-digit',month:'long',year:'numeric'})}</p>
                      )}
                      {ev.notes && <p className="text-military-400 text-xs">Obs: {ev.notes}</p>}
                      <p className="text-military-600 text-xs mt-1">{ev.evaluador || 'Sistema'} &middot; {new Date(ev.created_at).toLocaleDateString('es-EC',{day:'2-digit',month:'short',year:'numeric'})}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
