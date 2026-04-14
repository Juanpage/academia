'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { aspirantsApi, evaluationsApi } from '../../lib/api';
import api from '../../lib/api';

const MATERIAS = [
  { key: 'ingles',                label: 'Ingles' },
  { key: 'matematicas',           label: 'Matematicas' },
  { key: 'historia_realidad',     label: 'Historia y Realidad Nac.' },
  { key: 'lenguaje_comunicacion', label: 'Lenguaje y Comunicacion' },
  { key: 'fisica',                label: 'Fisica' },
  { key: 'trigonometria',         label: 'Trigonometria' },
];

const PRUEBAS_PSICO = [
  { key: 'test_16pf',      label: 'Test 16PF' },
  { key: 'test_raven',     label: 'Test Raven' },
  { key: 'entrevista',     label: 'Entrevista' },
  { key: 'test_liderazgo', label: 'Liderazgo' },
];

function ScoreBar({ label, value, max = 20, weight, color }) {
  const pct = Math.min(100, ((value || 0) / max) * 100);
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-military-300 text-xs">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-military-500 text-xs">{weight}</span>
          <span className="text-gold-400 font-bold text-sm">{parseFloat(value || 0).toFixed(2)}/{max}</span>
        </div>
      </div>
      <div className="h-2 bg-military-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function MiExpedientePage() {
  const router = useRouter();
  const [aspirant,  setAspirant]  = useState(null);
  const [academic,  setAcademic]  = useState([]);
  const [psico,     setPsico]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState('resumen');

  // Modal cambio de contrasena
  const [showChangePass,   setShowChangePass]   = useState(false);
  const [passForm,         setPassForm]         = useState({ current: '', new_password: '', confirm: '' });
  const [passError,        setPassError]        = useState('');
  const [passSuccess,      setPassSuccess]      = useState('');
  const [passLoading,      setPassLoading]      = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { router.push('/login'); return; }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role !== 'aspirante') { router.push('/dashboard'); return; }
      loadData(payload.username);
    } catch { router.push('/login'); }
  }, []);

  async function loadData(username) {
    setLoading(true);
    try {
      const cedula = username.replace('asp_', '');
      const listRes = await aspirantsApi.list({ search: cedula });
      const asp = (listRes.data.aspirants || listRes.data.data || []).find(a => a.cedula === cedula);
      if (!asp) return;
      setAspirant(asp);
      const [acadRes, psicoRes] = await Promise.all([
        evaluationsApi.getAcademic(asp.id).catch(() => ({ data: { evaluations: [] } })),
        evaluationsApi.getPsych(asp.id).catch(() => ({ data: { evaluations: [] } })),
      ]);
      setAcademic(acadRes.data.evaluations || []);
      setPsico(psicoRes.data.evaluations || []);
    } catch(e) {
      console.error('Error cargando expediente:', e);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    router.push('/login');
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (passForm.new_password !== passForm.confirm)
      return setPassError('Las contrasenas no coinciden');
    if (passForm.new_password.length < 8)
      return setPassError('Minimo 8 caracteres');
    setPassLoading(true); setPassError(''); setPassSuccess('');
    try {
      await api.post('/auth/change-password', {
        current_password: passForm.current,
        new_password: passForm.new_password,
      });
      setPassSuccess('Contrasena cambiada correctamente');
      setPassForm({ current: '', new_password: '', confirm: '' });
      setTimeout(() => { setShowChangePass(false); setPassSuccess(''); }, 2000);
    } catch(e) {
      setPassError(e.response?.data?.error || 'Error al cambiar contrasena');
    } finally { setPassLoading(false); }
  }

  if (loading) return (
    <div className="min-h-screen bg-military-900 flex items-center justify-center">
      <p className="text-military-400">Cargando expediente...</p>
    </div>
  );

  if (!aspirant) return (
    <div className="min-h-screen bg-military-900 flex items-center justify-center">
      <p className="text-military-400">No se encontro su expediente.</p>
    </div>
  );

  const totalScore = (
    (aspirant.academic_score || 0) * 0.40 +
    (aspirant.physical_score || 0) * 0.35 +
    (aspirant.psych_score    || 0) * 0.15 +
    (aspirant.medical_score  || 0) * 0.10
  ).toFixed(2);

  const TABS = [
    { key: 'resumen',     label: 'Mi Resumen' },
    { key: 'academico',   label: 'Academico' },
    { key: 'psicologico', label: 'Psicologico' },
    { key: 'pagos',       label: 'Pagos' },
  ];

  return (
    <div className="min-h-screen bg-military-900 text-military-100">
      {/* Header */}
      <div className="bg-military-800 border-b border-military-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎖️</span>
          <div>
            <h1 className="text-gold-400 font-display font-bold text-sm tracking-widest">ACADEMIA MILITAR DIGITAL</h1>
            <p className="text-military-400 text-xs">Portal del Aspirante</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a href="http://moodle.local:8080" target="_blank"
            className="text-xs text-military-400 hover:text-gold-400 transition-colors">
            Ir a Moodle →
          </a>
          <button onClick={() => setShowChangePass(true)}
            className="text-xs text-military-400 hover:text-gold-400 transition-colors">
            Cambiar contrasena
          </button>
          <button onClick={logout}
            className="text-xs text-military-400 hover:text-red-400 transition-colors">
            Cerrar sesion
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Info aspirante */}
        <div className="bg-military-800 border border-military-700 rounded-lg p-5 mb-5">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-bold text-military-100">{aspirant.first_name} {aspirant.last_name}</h2>
              <p className="text-military-400 text-sm">Cedula: {aspirant.cedula}</p>
              <p className="text-military-400 text-sm">Email: {aspirant.email}</p>
            </div>
            <div className="text-right">
              <p className="text-military-400 text-xs uppercase tracking-wider mb-1">Puntaje Global</p>
              <p className="text-gold-400 font-display font-bold text-4xl">{totalScore}</p>
              <p className="text-military-500 text-xs">sobre 20 pts</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={'px-4 py-2 rounded-lg text-sm font-medium transition-colors ' +
                (tab === t.key ? 'bg-gold-500 text-military-900 font-bold' : 'bg-military-800 text-military-400 hover:text-military-200 border border-military-700')}>
              {t.label}
            </button>
          ))}
        </div>

        {/* RESUMEN */}
        {tab === 'resumen' && (
          <div className="space-y-4">
            <div className="bg-military-800 border border-military-700 rounded-lg p-5">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-military-300 mb-4">Puntajes por Area</h3>
              <ScoreBar label="Academico"   value={aspirant.academic_score} weight="40%" color="bg-blue-500" />
              <ScoreBar label="Fisico"      value={aspirant.physical_score} weight="35%" color="bg-green-500" />
              <ScoreBar label="Psicologico" value={aspirant.psych_score}    weight="15%" color="bg-purple-500" />
              <ScoreBar label="Medico"      value={aspirant.medical_score}  weight="10%" color="bg-red-500" />
            </div>
            <div className="bg-military-800 border border-military-700 rounded-lg p-5">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-military-300 mb-3">Estado</h3>
              <span className={'px-3 py-1 rounded-full text-sm font-semibold ' +
                (aspirant.status === 'active' ? 'bg-green-900/50 text-green-400' :
                 aspirant.status === 'registered' ? 'bg-blue-900/50 text-blue-400' :
                 'bg-military-700 text-military-400')}>
                {aspirant.status === 'active' ? 'Activo' :
                 aspirant.status === 'registered' ? 'Registrado' : aspirant.status}
              </span>
            </div>
            <a href="http://moodle.local:8080" target="_blank"
              className="flex items-center gap-3 bg-military-800 border border-military-700 hover:border-gold-700 rounded-lg p-4 transition-colors">
              <span className="text-2xl">📖</span>
              <div>
                <p className="text-military-200 text-sm font-medium">Plataforma Moodle</p>
                <p className="text-military-400 text-xs">Accede a tus cursos y tests psicologicos</p>
              </div>
              <span className="ml-auto text-military-500">→</span>
            </a>
          </div>
        )}

        {/* ACADEMICO */}
        {tab === 'academico' && (
          <div className="bg-military-800 border border-military-700 rounded-lg p-5">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-military-300 mb-4">
              Evaluaciones Academicas ({academic.length})
            </h3>
            {academic.length === 0 ? (
              <p className="text-military-500 text-sm text-center py-6">Sin evaluaciones academicas registradas</p>
            ) : (
              <div className="space-y-3">
                {academic.map(ev => (
                  <div key={ev.id} className="bg-military-700 border border-military-600 rounded-lg p-4">
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-gold-400 font-bold text-xl font-display">{parseFloat(ev.promedio_100).toFixed(2)}</span>
                      <span className="text-military-400 text-xs">/20</span>
                      {ev.periodo && <span className="text-military-400 text-xs border border-military-600 rounded px-1.5 py-0.5">{ev.periodo}</span>}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {MATERIAS.map(m => (
                        <div key={m.key} className="text-center bg-military-800 rounded p-1.5">
                          <p className="text-military-500 text-xs truncate mb-0.5">{m.label}</p>
                          <p className={'text-sm font-semibold ' + (ev[m.key] == null ? 'text-military-600' : parseFloat(ev[m.key]) >= 14 ? 'text-green-400' : parseFloat(ev[m.key]) >= 10 ? 'text-yellow-400' : 'text-red-400')}>
                            {ev[m.key] != null ? parseFloat(ev[m.key]).toFixed(2) : '--'}
                          </p>
                        </div>
                      ))}
                    </div>
                    <p className="text-military-600 text-xs mt-2">{new Date(ev.created_at).toLocaleDateString('es-EC', { day:'2-digit', month:'short', year:'numeric' })}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PSICOLOGICO */}
        {tab === 'psicologico' && (
          <div className="bg-military-800 border border-military-700 rounded-lg p-5">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-military-300 mb-4">
              Evaluaciones Psicologicas ({psico.length})
            </h3>
            {psico.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-military-500 text-sm mb-2">Sin evaluaciones registradas</p>
                <p className="text-military-600 text-xs">Complete los tests en la plataforma Moodle</p>
                <a href="http://moodle.local:8080" target="_blank"
                  className="inline-block mt-3 bg-military-700 hover:bg-military-600 text-military-300 text-xs px-4 py-2 rounded-lg transition-colors">
                  Ir a Moodle →
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                {psico.map(ev => (
                  <div key={ev.id} className={'bg-military-700 border rounded-lg p-4 ' + (ev.resultado === 'NO_APTO' ? 'border-red-700' : 'border-military-600')}>
                    <div className="flex items-baseline gap-3 mb-3">
                      <span className="text-gold-400 font-bold text-xl font-display">{parseFloat(ev.total_score || 0).toFixed(2)}</span>
                      <span className="text-military-400 text-xs">/20</span>
                      <span className={'text-xs font-bold px-2 py-0.5 rounded ' + (ev.resultado === 'APTO' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400')}>
                        {ev.resultado === 'APTO' ? 'APTO' : 'NO APTO'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {PRUEBAS_PSICO.map(pr => (
                        <div key={pr.key} className="bg-military-800 rounded p-2 text-center">
                          <p className="text-military-500 text-xs mb-1">{pr.label}</p>
                          <p className={'text-sm font-semibold ' + (ev[pr.key] == null ? 'text-military-600' : parseFloat(ev[pr.key]) >= 3.5 ? 'text-green-400' : parseFloat(ev[pr.key]) >= 2.5 ? 'text-yellow-400' : 'text-red-400')}>
                            {ev[pr.key] != null ? parseFloat(ev[pr.key]).toFixed(2) : '--'}/5
                          </p>
                        </div>
                      ))}
                    </div>
                    <p className="text-military-600 text-xs mt-2">{new Date(ev.created_at).toLocaleDateString('es-EC', { day:'2-digit', month:'short', year:'numeric' })}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PAGOS */}
        {tab === 'pagos' && (
          <div className="bg-military-800 border border-military-700 rounded-lg p-5">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-military-300 mb-4">Mis Pagos</h3>
            <p className="text-military-500 text-sm text-center py-6">
              Para consultar el estado de sus pagos, contacte a la administracion de la Academia.
            </p>
          </div>
        )}
      </div>

      {/* Modal cambio de contrasena */}
      {showChangePass && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-military-800 border border-military-700 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-military-200 font-semibold mb-4">Cambiar Contrasena</h3>
            {passError   && <p className="text-red-400 text-sm mb-3 bg-red-900/20 px-3 py-2 rounded">{passError}</p>}
            {passSuccess && <p className="text-green-400 text-sm mb-3 bg-green-900/20 px-3 py-2 rounded">{passSuccess}</p>}
            <form onSubmit={handleChangePassword}>
              <div className="mb-3">
                <label className="text-military-400 text-xs block mb-1">Contrasena Actual</label>
                <input type="password" value={passForm.current}
                  onChange={e => setPassForm(f => ({ ...f, current: e.target.value }))}
                  required
                  className="w-full bg-military-700 border border-military-600 rounded px-3 py-2 text-military-100 text-sm focus:outline-none focus:border-gold-500" />
              </div>
              <div className="mb-3">
                <label className="text-military-400 text-xs block mb-1">Nueva Contrasena</label>
                <input type="password" value={passForm.new_password}
                  onChange={e => setPassForm(f => ({ ...f, new_password: e.target.value }))}
                  required
                  className="w-full bg-military-700 border border-military-600 rounded px-3 py-2 text-military-100 text-sm focus:outline-none focus:border-gold-500" />
              </div>
              <div className="mb-4">
                <label className="text-military-400 text-xs block mb-1">Confirmar Nueva Contrasena</label>
                <input type="password" value={passForm.confirm}
                  onChange={e => setPassForm(f => ({ ...f, confirm: e.target.value }))}
                  required
                  className="w-full bg-military-700 border border-military-600 rounded px-3 py-2 text-military-100 text-sm focus:outline-none focus:border-gold-500" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setShowChangePass(false); setPassError(''); setPassSuccess(''); }}
                  className="flex-1 bg-military-700 hover:bg-military-600 text-military-300 py-2 rounded-lg text-sm transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={passLoading}
                  className="flex-1 bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-military-900 font-bold py-2 rounded-lg text-sm transition-colors">
                  {passLoading ? 'Guardando...' : 'Cambiar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
