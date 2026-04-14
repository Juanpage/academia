'use client';
import { useState, useEffect } from 'react';
import { financieroAPI, aspirantesAPI, cohortesAPI } from '@/lib/api';
import { Download, Plus, CheckCircle, Clock, AlertTriangle, Search } from 'lucide-react';

type Tab = 'pagos' | 'registrar' | 'gastos' | 'flujo' | 'vencidos';

export default function AdminFinancieroPage() {
  const [tab, setTab] = useState<Tab>('pagos');
  const [vencidos, setVencidos]   = useState<any[]>([]);
  const [gastos, setGastos]       = useState<any[]>([]);
  const [flujo, setFlujo]         = useState<any[]>([]);
  const [aspirantes, setAspirantes] = useState<any[]>([]);
  const [planes, setPlanes]       = useState<any[]>([]);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(false);
  const [msg, setMsg]             = useState('');

  // Form registrar pago
  const [form, setForm] = useState({
    aspirante_id: '', plan_id: '', monto: '', metodo_pago: 'EFECTIVO',
    referencia: '', periodo: '', cedula_ruc: '', nombre_receptor: '', observaciones: '',
  });

  // Form gasto
  const [gastoForm, setGastoForm] = useState({
    categoria: 'SUELDOS', descripcion: '', monto: '', fecha: new Date().toISOString().slice(0, 10), proveedor: '', comprobante_ref: '',
  });

  useEffect(() => {
    Promise.all([
      financieroAPI.getPagosVencidos(),
      financieroAPI.getGastos({}),
      financieroAPI.getFlujoCaja({}),
      aspirantesAPI.getAll({ limit: 200 }),
    ]).then(([v, g, f, a]) => {
      setVencidos(v.data);
      setGastos(g.data);
      setFlujo(f.data);
      setAspirantes(a.data.data || []);
    });

    // Planes hardcoded para MVP (en producción vienen de /api/planes)
    setPlanes([
      { id: 1, nombre: 'Matrícula Regular',     tipo: 'MATRICULA',   monto: 250 },
      { id: 2, nombre: 'Mensualidad Regular',   tipo: 'MENSUALIDAD', monto: 120 },
      { id: 3, nombre: 'Curso Intensivo 1 mes', tipo: 'INTENSIVO',   monto: 350 },
      { id: 4, nombre: 'Examen Diagnóstico',    tipo: 'EXAMEN',      monto: 30  },
    ]);
  }, []);

  const handleRegistrarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await financieroAPI.registrarPago({ ...form, monto: parseFloat(form.monto) });
      setMsg(`✅ Pago registrado — Comprobante N° ${res.data.numeroComprobante}`);
      setForm({ aspirante_id:'', plan_id:'', monto:'', metodo_pago:'EFECTIVO', referencia:'', periodo:'', cedula_ruc:'', nombre_receptor:'', observaciones:'' });
    } catch (err: any) {
      setMsg(`❌ ${err.response?.data?.error || 'Error al registrar'}`);
    } finally { setLoading(false); }
  };

  const handleRegistrarGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await financieroAPI.registrarGasto({ ...gastoForm, monto: parseFloat(gastoForm.monto) });
      setMsg('✅ Gasto registrado correctamente');
      const g = await financieroAPI.getGastos({});
      setGastos(g.data);
    } catch (err: any) {
      setMsg(`❌ ${err.response?.data?.error || 'Error'}`);
    } finally { setLoading(false); }
  };

  const filteredAsp = aspirantes.filter(a =>
    `${a.nombre} ${a.apellido} ${a.cedula}`.toLowerCase().includes(search.toLowerCase())
  );

  const tabs: { id: Tab; label: string }[] = [
    { id: 'pagos',     label: '💳 Registrar Pago' },
    { id: 'vencidos',  label: `⚠️ Vencidos (${vencidos.length})` },
    { id: 'gastos',    label: '📤 Gastos' },
    { id: 'flujo',     label: '📊 Flujo de Caja' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#1B4332] text-white px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <a href="/admin" className="text-green-300 hover:text-white text-sm">← Panel Admin</a>
          <span className="text-green-500">/</span>
          <h1 className="font-bold">Módulo Financiero</h1>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {msg && (
          <div className={`px-4 py-3 rounded-lg text-sm font-medium ${msg.startsWith('✅') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {msg} <button onClick={() => setMsg('')} className="float-right text-gray-500">✕</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t.id ? 'border-[#1B4332] text-[#1B4332]' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>{t.label}</button>
          ))}
        </div>

        {/* ─── Registrar Pago ─────────────────────────────────────────────── */}
        {tab === 'pagos' && (
          <div className="card max-w-2xl">
            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Plus size={18} /> Registrar Pago Manual
            </h2>
            <form onSubmit={handleRegistrarPago} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Buscar Aspirante</label>
                <input className="input mb-2" placeholder="Nombre o cédula..." value={search} onChange={e => setSearch(e.target.value)} />
                <select className="input" required value={form.aspirante_id}
                  onChange={e => {
                    const asp = aspirantes.find(a => String(a.id) === e.target.value);
                    setForm(f => ({ ...f, aspirante_id: e.target.value, cedula_ruc: asp?.cedula || '', nombre_receptor: asp ? `${asp.apellido} ${asp.nombre}` : '' }));
                  }}>
                  <option value="">— Seleccionar aspirante —</option>
                  {filteredAsp.map(a => (
                    <option key={a.id} value={a.id}>{a.apellido} {a.nombre} — {a.cedula}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Plan de Pago</label>
                  <select className="input" required value={form.plan_id}
                    onChange={e => {
                      const plan = planes.find(p => String(p.id) === e.target.value);
                      setForm(f => ({ ...f, plan_id: e.target.value, monto: plan?.monto?.toString() || '' }));
                    }}>
                    <option value="">— Plan —</option>
                    {planes.map(p => <option key={p.id} value={p.id}>{p.nombre} (${p.monto})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Monto ($)</label>
                  <input type="number" step="0.01" className="input" required value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Método de Pago</label>
                  <select className="input" value={form.metodo_pago} onChange={e => setForm(f => ({ ...f, metodo_pago: e.target.value }))}>
                    {['EFECTIVO','TRANSFERENCIA','PAYPHONE','STRIPE','DATAFAST'].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Período</label>
                  <input className="input" placeholder="ENE-2025" value={form.periodo} onChange={e => setForm(f => ({ ...f, periodo: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Cédula/RUC receptor</label>
                  <input className="input" required value={form.cedula_ruc} onChange={e => setForm(f => ({ ...f, cedula_ruc: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Nombre receptor</label>
                  <input className="input" required value={form.nombre_receptor} onChange={e => setForm(f => ({ ...f, nombre_receptor: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Referencia / N° Transacción</label>
                <input className="input" value={form.referencia} onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))} />
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Registrando...' : '✅ Registrar Pago y Emitir Comprobante'}
              </button>
            </form>
          </div>
        )}

        {/* ─── Vencidos ─────────────────────────────────────────────────────── */}
        {tab === 'vencidos' && (
          <div className="card">
            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" /> Pagos Vencidos
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="text-left py-2 font-medium">Aspirante</th>
                    <th className="text-left py-2 font-medium">Cédula</th>
                    <th className="text-right py-2 font-medium">Monto</th>
                    <th className="text-center py-2 font-medium">Días vencido</th>
                    <th className="text-left py-2 font-medium">Período</th>
                    <th className="text-left py-2 font-medium">Cohorte</th>
                  </tr>
                </thead>
                <tbody>
                  {vencidos.map(v => (
                    <tr key={v.id} className="border-b hover:bg-red-50">
                      <td className="py-3 font-medium">{v.nombre} {v.apellido}</td>
                      <td className="py-3 text-gray-500">{v.cedula}</td>
                      <td className="py-3 text-right font-semibold text-red-600">${parseFloat(v.monto).toFixed(2)}</td>
                      <td className="py-3 text-center">
                        <span className="badge-vencido">{v.dias_vencido}d</span>
                      </td>
                      <td className="py-3 text-gray-500">{v.periodo || '—'}</td>
                      <td className="py-3 text-gray-500">{v.cohorte || '—'}</td>
                    </tr>
                  ))}
                  {vencidos.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">Sin pagos vencidos 🎉</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── Gastos ───────────────────────────────────────────────────────── */}
        {tab === 'gastos' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4">Registrar Gasto</h3>
              <form onSubmit={handleRegistrarGasto} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Categoría</label>
                    <select className="input" value={gastoForm.categoria} onChange={e => setGastoForm(f => ({ ...f, categoria: e.target.value }))}>
                      {['SUELDOS','INFRAESTRUCTURA','MARKETING','SERVICIOS','MATERIALES','OTROS'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Monto ($)</label>
                    <input type="number" step="0.01" className="input" required value={gastoForm.monto} onChange={e => setGastoForm(f => ({ ...f, monto: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Descripción</label>
                  <input className="input" required value={gastoForm.descripcion} onChange={e => setGastoForm(f => ({ ...f, descripcion: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Fecha</label>
                    <input type="date" className="input" value={gastoForm.fecha} onChange={e => setGastoForm(f => ({ ...f, fecha: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Proveedor</label>
                    <input className="input" value={gastoForm.proveedor} onChange={e => setGastoForm(f => ({ ...f, proveedor: e.target.value }))} />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">Registrar Gasto</button>
              </form>
            </div>
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4">Últimos Gastos</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {gastos.slice(0, 20).map(g => (
                  <div key={g.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg text-sm">
                    <div>
                      <p className="font-medium text-gray-800">{g.descripcion}</p>
                      <p className="text-xs text-gray-500">{g.categoria} · {g.proveedor || '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600">${parseFloat(g.monto).toFixed(2)}</p>
                      <p className="text-xs text-gray-400">{new Date(g.fecha).toLocaleDateString('es-EC')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Flujo de Caja ────────────────────────────────────────────────── */}
        {tab === 'flujo' && (
          <div className="card">
            <h2 className="font-bold text-gray-800 mb-4">📊 Flujo de Caja</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="text-left py-2 font-medium">Mes</th>
                    <th className="text-right py-2 font-medium text-green-700">Ingresos</th>
                    <th className="text-right py-2 font-medium text-red-700">Gastos</th>
                    <th className="text-right py-2 font-medium">Neto</th>
                  </tr>
                </thead>
                <tbody>
                  {flujo.map(f => (
                    <tr key={f.mes} className="border-b hover:bg-gray-50">
                      <td className="py-3 font-medium">{f.mes}</td>
                      <td className="py-3 text-right text-green-700 font-semibold">${parseFloat(f.ingresos).toFixed(2)}</td>
                      <td className="py-3 text-right text-red-600">${parseFloat(f.gastos).toFixed(2)}</td>
                      <td className={`py-3 text-right font-bold ${parseFloat(f.neto) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        ${parseFloat(f.neto).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {flujo.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-gray-400">Sin datos</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
