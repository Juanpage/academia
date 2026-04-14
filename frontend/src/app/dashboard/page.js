'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { dashboardApi, moodleApi } from '../../lib/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const StatCard = ({ label, value, sub, color = 'text-military-200' }) => (
  <div className="card">
    <p className="text-military-400 text-xs tracking-wider uppercase mb-1">{label}</p>
    <p className={`text-3xl font-display font-bold ${color}`}>{value ?? '-'}</p>
    {sub && <p className="text-military-400 text-xs mt-1">{sub}</p>}
  </div>
);

export default function DashboardPage() {
  const router = useRouter();
  const [data,    setData]    = useState(null);
  const [moodle,  setMoodle]  = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { router.push('/login'); return; }

    Promise.all([
      dashboardApi.summary(),
      moodleApi.ping().catch(() => null),
    ]).then(([dash, ml]) => {
      setData(dash.data);
      setMoodle(ml?.data);
    }).finally(() => setLoading(false));
  }, [router]);

  const logout = async () => {
    localStorage.clear();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-military-900 flex items-center justify-center">
        <div className="text-military-400 font-display tracking-widest text-sm animate-pulse">
          CARGANDO SISTEMA...
        </div>
      </div>
    );
  }

  const t = data?.totals || {};
  const byStatus = data?.by_status || [];
  const top      = data?.top_aspirants || [];
  const payments = data?.payment_stats || {};

  const statusColors = {
    active:    '#3d7035',
    registered:'#c8a84b',
    inactive:  '#6b7280',
    graduated: '#1d4ed8',
    expelled:  '#991b1b',
  };

  return (
    <div className="min-h-screen bg-military-900">
      <nav className="bg-military-800 border-b border-military-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎖️</span>
          <div>
            <h1 className="font-display text-gold-400 font-bold text-sm tracking-widest">
              ACADEMIA MILITAR DIGITAL
            </h1>
            <p className="text-military-400 text-xs">Sistema de Gestion</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {moodle && (
            <span className="text-xs text-military-300 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              Moodle: {moodle.moodle?.site}
            </span>
          )}
          <button onClick={logout}
            className="text-military-400 hover:text-military-200 text-sm transition-colors">
            Salir
          </button>
        </div>
      </nav>

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Aspirantes" value={t.total_aspirants} color="text-military-200" />
          <StatCard label="Activos"  value={t.active}    color="text-green-400" />
          <StatCard label="Graduados" value={t.graduated} color="text-blue-400" />
          <StatCard label="Puntaje Promedio" value={t.avg_score ? `${t.avg_score}` : '-'}
            color="text-gold-400" sub="sobre 100 pts" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card lg:col-span-1">
            <h3 className="text-military-300 text-sm font-semibold mb-4 tracking-wider uppercase">
              Por Estado
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byStatus} layout="vertical">
                <XAxis type="number" tick={{ fill: '#5a9e50', fontSize: 11 }} />
                <YAxis type="category" dataKey="status" tick={{ fill: '#8bc97f', fontSize: 11 }} width={70} />
                <Tooltip contentStyle={{ background: '#111a0f', border: '1px solid #243d21', color: '#c4e8bc' }} />
                <Bar dataKey="count" radius={[0,4,4,0]}>
                  {byStatus.map((entry) => (
                    <Cell key={entry.status} fill={statusColors[entry.status] || '#3d7035'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card lg:col-span-2">
            <h3 className="text-military-300 text-sm font-semibold mb-4 tracking-wider uppercase">
              Ranking — Top 10
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-military-400 text-xs border-b border-military-700">
                    <th className="pb-2 text-left">#</th>
                    <th className="pb-2 text-left">Aspirante</th>
                    <th className="pb-2 text-right">Acad.</th>
                    <th className="pb-2 text-right">FÃ­s.</th>
                    <th className="pb-2 text-right">Psic.</th>
                    <th className="pb-2 text-right font-bold text-gold-400">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {top.map((a, idx) => (
                    <tr key={a.id} className="border-b border-military-700/50 hover:bg-military-700/30 transition-colors">
                      <td className="py-2 text-gold-400 font-bold text-sm w-6 text-center">{idx + 1}</td>
                      <td className="py-2 text-military-100">{a.full_name}</td>
                      <td className="py-2 text-right text-military-300">{a.academic_score ?? '-'}</td>
                      <td className="py-2 text-right text-military-300">{a.physical_score ?? '-'}</td>
                      <td className="py-2 text-right text-military-300">{a.psych_score ?? '-'}</td>
                      <td className="py-2 text-right font-bold text-gold-400">{a.total_score ?? '-'}</td>
                    </tr>
                  ))}
                  {top.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-military-500 text-xs">Sin datos aÃºn</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Pagos Pendientes" value={payments.pending} color="text-yellow-400" />
          <StatCard label="Pagos Vencidos"   value={payments.overdue} color="text-red-400" />
          <StatCard label="Total Recaudado"
            value={payments.total_collected ? `$${parseFloat(payments.total_collected).toFixed(2)}` : '$0.00'}
            color="text-green-400" />
        </div>

        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          {[
              { label: 'Aspirantes', href: '/aspirants', icon: '🎖' },
              { label: 'Moodle', href: 'http://moodle.local:8080', icon: '📖', external: true },
              { label: 'Pagos', href: '/payments', icon: '💳' },
              { label: 'Reportes', href: '/reports', icon: '📊' },
              { label: 'Usuarios', href: '/users', icon: '👤' },
          ].map((item) => (
            <a key={item.label} href={item.href}
              target={item.external ? '_blank' : undefined}
              rel={item.external ? 'noopener noreferrer' : undefined}
              className="card flex items-center gap-3 hover:border-military-500 hover:bg-military-700/50 transition-all cursor-pointer">
              <span className="text-2xl">{item.icon}</span>
              <span className="text-military-200 text-sm font-medium">{item.label}</span>
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}

