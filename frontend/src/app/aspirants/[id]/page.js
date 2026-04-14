'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { aspirantsApi } from '../../../lib/api';

const STATUS_LABELS = {
  registered: { label: 'Registrado', color: 'text-yellow-400' },
  active:     { label: 'Activo',     color: 'text-green-400' },
  inactive:   { label: 'Inactivo',   color: 'text-gray-400' },
  graduated:  { label: 'Graduado',   color: 'text-blue-400' },
  expelled:   { label: 'Expulsado',  color: 'text-red-400' },
};

const ScoreBar = ({ label, value, weight, color }) => (
  <div>
    <div className="flex justify-between text-xs mb-1">
      <span className="text-military-300">{label}</span>
      <span className="text-military-400">{weight} &nbsp;
        <span className="text-military-100 font-bold">{value ?? '0'}</span>
      </span>
    </div>
    <div className="h-2 bg-military-700 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`}
        style={{ width: (value ?? 0) + '%' }} />
    </div>
  </div>
);

export default function AspirantDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  const [aspirant, setAspirant] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('access_token')) {
      router.push('/login');
      return;
    }
    aspirantsApi.get(id)
      .then(({ data }) => setAspirant(data))
      .catch(() => router.push('/aspirants'))
      .finally(() => setLoading(false));
  }, [id, router]);

  const changeStatus = async (newStatus) => {
    setChanging(true);
    try {
      const { data } = await aspirantsApi.setStatus(id, newStatus);
      setAspirant(prev => ({ ...prev, status: data.status }));
    } catch (err) {
      alert(err.response?.data?.error || 'Error al cambiar estado');
    } finally {
      setChanging(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-military-900 flex items-center justify-center">
        <div className="text-military-400 font-display text-xs animate-pulse tracking-widest">CARGANDO...</div>
      </div>
    );
  }

  if (!aspirant) return null;

  const statusInfo = STATUS_LABELS[aspirant.status] || { label: aspirant.status, color: 'text-gray-400' };

  return (
    <div className="min-h-screen bg-military-900">
      <nav className="bg-military-800 border-b border-military-700 px-6 py-3 flex items-center gap-4">
        <a href="/aspirants" className="text-military-400 hover:text-military-200 text-sm transition-colors">
          Atras
        </a>
        <div className="w-px h-4 bg-military-600" />
        <h1 className="font-display text-gold-400 font-bold text-sm tracking-widest">
          EXPEDIENTE DEL ASPIRANTE
        </h1>
      </nav>

      <main className="p-6 max-w-5xl mx-auto space-y-5">
        <div className="bg-military-800 border border-military-700 rounded-lg p-5 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-military-100">
                {aspirant.first_name} {aspirant.last_name}
              </h2>
              <span className={'text-sm font-semibold ' + statusInfo.color}>
                {statusInfo.label}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-military-400 mt-2">
              <span>CI: {aspirant.cedula}</span>
              <span>Email: {aspirant.email}</span>
              {aspirant.phone && <span>Tel: {aspirant.phone}</span>}
              {aspirant.gender && <span>{aspirant.gender === 'M' ? 'Masculino' : 'Femenino'}</span>}
            </div>
            <div className="flex gap-3 text-xs text-military-500 mt-2">
              <span>Registrado: {new Date(aspirant.created_at).toLocaleDateString('es-EC')}</span>
              {aspirant.moodle_user_id && (
                <span className="text-green-500">Moodle ID: {aspirant.moodle_user_id}</span>
              )}
            </div>
          </div>

          <div className="text-right">
            <p className="text-military-500 text-xs mb-2 uppercase tracking-wider">Cambiar estado</p>
            <select value={aspirant.status} onChange={(e) => changeStatus(e.target.value)}
              disabled={changing}
              className="bg-military-700 border border-military-600 rounded px-3 py-1.5 text-military-200 text-xs focus:outline-none focus:border-military-400 disabled:opacity-50">
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-military-800 border border-military-700 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-military-300 text-xs font-semibold uppercase tracking-wider">Puntaje Global</h3>
            <div className="text-right">
              <span className="font-display text-3xl font-bold text-gold-400">
                {aspirant.total_score ?? '0'}
              </span>
              {aspirant.rank_position && (
                <span className="text-military-400 text-xs ml-2">Ranking #{aspirant.rank_position}</span>
              )}
            </div>
          </div>
          <div className="space-y-3">
            <ScoreBar label="Academico"    value={aspirant.academic_score} weight="40%" color="bg-blue-500" />
            <ScoreBar label="Fisico"       value={aspirant.physical_score} weight="35%" color="bg-green-500" />
            <ScoreBar label="Psicologico"  value={aspirant.psych_score}    weight="15%" color="bg-purple-500" />
            <ScoreBar label="Medico"       value={aspirant.medical_score}  weight="10%" color="bg-red-500" />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Evaluacion Academica', tab: 'academica',   icon: '📚', color: 'border-blue-700 hover:border-blue-500' },
            { label: 'Evaluacion Fisica', tab: 'fisica',      icon: '💪', color: 'border-green-700 hover:border-green-500' },
            { label: 'Evaluacion Psicologica', tab: 'psico', icon: '🧠', color: 'border-purple-700 hover:border-purple-500' },
            { label: 'Evaluacion Medica', tab: 'medica',      icon: '🏥', color: 'border-red-700 hover:border-red-500' },
          ].map((item) => (
            <div key={item.label}
                onClick={() => router.push('/aspirants/' + id + '/evaluations?tab=' + item.tab)}
              className={'bg-military-800 border rounded-lg p-4 text-center transition-colors cursor-pointer ' + item.color}>
              <div className="text-2xl mb-2">{item.icon}</div>
              <p className="text-military-300 text-xs">{item.label}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}



