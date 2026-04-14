'use client';
import { useEffect, useState } from 'react';
import { adminAPI, financieroAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Users, TrendingUp, AlertTriangle, DollarSign, LogOut, GraduationCap } from 'lucide-react';

const COLORS = ['#1B4332', '#2D6A4F', '#52B788', '#B5892A', '#6b7280'];

function KpiCard({ icon: Icon, label, value, sub, color = 'green' }: any) {
  const colors: Record<string, string> = {
    green: 'bg-green-50 text-green-700 border-green-100',
    red:   'bg-red-50   text-red-700   border-red-100',
    blue:  'bg-blue-50  text-blue-700  border-blue-100',
    gold:  'bg-amber-50 text-amber-700 border-amber-100',
  };
  return (
    <div className={`card border ${colors[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{label}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {sub && <p className="text-xs opacity-70 mt-1">{sub}</p>}
        </div>
        <div className="p-3 rounded-xl bg-white/60">
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [admin, setAdmin] = useState<any>(null);
  const [fin, setFin] = useState<any>(null);
  const [periodo, setPeriodo] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminAPI.getDashboard(),
      financieroAPI.getDashboard({ periodo }),
    ]).then(([a, f]) => {
      setAdmin(a.data);
      setFin(f.data);
    }).finally(() => setLoading(false));
  }, [periodo]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center"><div className="text-5xl mb-3 animate-pulse">🎖️</div><p className="text-gray-500">Cargando...</p></div>
    </div>
  );

  const gastosPieData = fin?.gastos?.detalle?.map((g: any) => ({
    name: g.categoria, value: parseFloat(g.total),
  })) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#1B4332] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎖️</span>
            <div>
              <h1 className="font-bold text-lg">Panel Administrativo</h1>
              <p className="text-green-300 text-xs">Academia Militar Digital</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-2 text-sm">
              {[
                { href: '/admin',            label: 'Dashboard' },
                { href: '/admin/aspirantes', label: 'Aspirantes' },
                { href: '/admin/financiero', label: 'Financiero' },
                { href: '/admin/cohortes',   label: 'Cohortes' },
              ].map(({ href, label }) => (
                <a key={href} href={href}
                   className="px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
                  {label}
                </a>
              ))}
            </nav>
            <button onClick={logout} className="p-2 hover:bg-green-800 rounded-lg transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* Selector de período */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">Resumen General</h2>
          <input
            type="month" value={periodo}
            onChange={e => setPeriodo(e.target.value)}
            className="input w-40 text-sm"
          />
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={Users} label="Total Aspirantes"
            value={admin?.resumen?.total_aspirantes ?? '—'}
            sub={`+${admin?.resumen?.nuevos_mes ?? 0} este mes`}
            color="green"
          />
          <KpiCard
            icon={DollarSign} label="Ingresos del Mes"
            value={fin?.ingresos?.total != null ? `$${parseFloat(fin.ingresos.total).toFixed(0)}` : '—'}
            sub={`${fin?.ingresos?.cantidad ?? 0} pagos`}
            color="blue"
          />
          <KpiCard
            icon={TrendingUp} label="Rentabilidad"
            value={fin?.rentabilidad != null ? `$${parseFloat(fin.rentabilidad).toFixed(0)}` : '—'}
            sub={`Margen: ${fin?.margen ?? 0}%`}
            color="gold"
          />
          <KpiCard
            icon={AlertTriangle} label="Tasa de Morosidad"
            value={`${fin?.morosidad?.tasa ?? 0}%`}
            sub={`${fin?.morosidad?.vencidos ?? 0} pagos vencidos`}
            color={parseFloat(fin?.morosidad?.tasa || '0') > 15 ? 'red' : 'green'}
          />
        </div>

        {/* Alertas del sistema */}
        {admin?.alertas?.some((a: any) => parseInt(a.cantidad) > 0) && (
          <div className="card border border-amber-200 bg-amber-50">
            <h3 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
              <AlertTriangle size={18} /> Alertas del Sistema
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {admin.alertas.map((a: any) => (
                <div key={a.tipo} className="bg-white rounded-lg p-3 border border-amber-100">
                  <p className="text-2xl font-bold text-amber-700">{a.cantidad}</p>
                  <p className="text-xs text-gray-600">{a.tipo.replace(/_/g, ' ')}</p>
                  {a.monto_total && (
                    <p className="text-xs text-red-500 mt-1">${parseFloat(a.monto_total).toFixed(2)}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tendencia de ingresos */}
          <div className="card">
            <h3 className="font-bold text-gray-800 mb-4">Tendencia de Ingresos (6 meses)</h3>
            {fin?.tendencia?.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={fin.tendencia}>
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
                  <Tooltip formatter={(v: any) => [`$${parseFloat(v).toFixed(2)}`, 'Ingresos']} />
                  <Bar dataKey="ingresos" fill="#1B4332" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-400">Sin datos</div>
            )}
          </div>

          {/* Distribución de gastos */}
          <div className="card">
            <h3 className="font-bold text-gray-800 mb-4">Distribución de Gastos</h3>
            {gastosPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={gastosPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                       dataKey="value" nameKey="name" paddingAngle={3}>
                    {gastosPieData.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => [`$${parseFloat(v).toFixed(2)}`, '']} />
                  <Legend iconType="circle" iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-400">Sin gastos registrados</div>
            )}
          </div>
        </div>

        {/* Cohortes activas */}
        <div className="card">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <GraduationCap size={18} /> Cohortes Activas
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-gray-500 font-medium">Cohorte</th>
                  <th className="text-center py-2 text-gray-500 font-medium">Aspirantes</th>
                  <th className="text-center py-2 text-gray-500 font-medium">Score Promedio</th>
                  <th className="text-center py-2 text-gray-500 font-medium">Con Mora</th>
                  <th className="text-left py-2 text-gray-500 font-medium">Período</th>
                </tr>
              </thead>
              <tbody>
                {(admin?.cohortes || []).map((c: any) => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 font-medium text-gray-800">{c.nombre}</td>
                    <td className="py-3 text-center">{c.aspirantes}</td>
                    <td className="py-3 text-center">
                      <span className={`font-semibold ${
                        (c.score_promedio || 0) >= 70 ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        {c.score_promedio ? parseFloat(c.score_promedio).toFixed(1) : '—'}
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      {c.con_mora > 0 ? (
                        <span className="badge-vencido">{c.con_mora}</span>
                      ) : (
                        <span className="text-green-600 text-xs font-medium">✓ Ninguno</span>
                      )}
                    </td>
                    <td className="py-3 text-gray-500 text-xs">
                      {c.inicio && new Date(c.inicio).toLocaleDateString('es-EC')} —{' '}
                      {c.fin && new Date(c.fin).toLocaleDateString('es-EC')}
                    </td>
                  </tr>
                ))}
                {!admin?.cohortes?.length && (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-400">Sin cohortes activas</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Aspirantes */}
        <div className="card">
          <h3 className="font-bold text-gray-800 mb-4">🏆 Top 10 Aspirantes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-center py-2 text-gray-500 font-medium w-10">#</th>
                  <th className="text-left py-2 text-gray-500 font-medium">Aspirante</th>
                  <th className="text-center py-2 text-gray-500 font-medium">Score Global</th>
                  <th className="text-center py-2 text-gray-500 font-medium">Académico</th>
                  <th className="text-center py-2 text-gray-500 font-medium">Físico</th>
                  <th className="text-left py-2 text-gray-500 font-medium">Carrera</th>
                </tr>
              </thead>
              <tbody>
                {(admin?.topAspirantes || []).map((a: any) => (
                  <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 text-center">
                      <span className={`font-bold ${
                        a.posicion === 1 ? 'text-amber-500' :
                        a.posicion === 2 ? 'text-gray-400' :
                        a.posicion === 3 ? 'text-amber-700' : 'text-gray-500'
                      }`}>
                        {a.posicion <= 3 ? ['🥇','🥈','🥉'][a.posicion - 1] : `#${a.posicion}`}
                      </span>
                    </td>
                    <td className="py-3 font-medium text-gray-800">{a.nombre} {a.apellido}</td>
                    <td className="py-3 text-center">
                      <span className={`font-bold text-lg ${
                        (a.score_global || 0) >= 80 ? 'text-green-600' :
                        (a.score_global || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {a.score_global ? parseFloat(a.score_global).toFixed(1) : '—'}
                      </span>
                    </td>
                    <td className="py-3 text-center text-gray-600">
                      {a.score_academico ? parseFloat(a.score_academico).toFixed(1) : '—'}
                    </td>
                    <td className="py-3 text-center text-gray-600">
                      {a.score_fisico ? parseFloat(a.score_fisico).toFixed(1) : '—'}
                    </td>
                    <td className="py-3">
                      <span className="bg-[#1B4332]/10 text-[#1B4332] text-xs font-medium px-2 py-0.5 rounded-full">
                        {a.carrera_objetivo}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
