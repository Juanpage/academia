'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { aspirantsApi } from '../../lib/api';

const STATUS_LABELS = {
  registered: { label: 'Registrado', color: 'bg-yellow-900 text-yellow-300' },
  active:     { label: 'Activo',      color: 'bg-green-900 text-green-300' },
  inactive:   { label: 'Inactivo',    color: 'bg-gray-700 text-gray-300' },
  graduated:  { label: 'Graduado',    color: 'bg-blue-900 text-blue-300' },
  expelled:   { label: 'Expulsado',   color: 'bg-red-900 text-red-300' },
};

const Badge = ({ status }) => {
  const s = STATUS_LABELS[status] || { label: status, color: 'bg-gray-700 text-gray-300' };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>;
};

export default function AspirantsPage() {
  const router = useRouter();
  const [aspirants, setAspirants] = useState([]);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [search,    setSearch]    = useState('');
  const [status,    setStatus]    = useState('');
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [apiError,  setApiError]  = useState('');
  const [form, setForm] = useState({ cedula:'', first_name:'', last_name:'', email:'', phone:'', gender:'M', birth_date:'', address:'', city:'Quito', genero:'M' });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setApiError('');
    try {
      const { data } = await aspirantsApi.list({ page, limit: 20, ...(search ? { search } : {}), ...(status ? { status } : {}) });
      setAspirants(data.data);
      setTotal(data.total);
    } catch (err) {
      setApiError(err.response?.data?.error || 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    if (!localStorage.getItem('access_token')) { router.push('/login'); return; }
    load();
  }, [load, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      await aspirantsApi.create(form);
      setShowModal(false);
      setForm({ cedula:'', first_name:'', last_name:'', email:'', phone:'', gender:'M', birth_date:'', address:'', city:'Quito', genero:'M' });
      load();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Error al registrar');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-military-900">
      <nav className="bg-military-800 border-b border-military-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="/dashboard" className="text-military-400 hover:text-military-200 text-sm">Atras</a>
          <div className="w-px h-4 bg-military-600" />
          <h1 className="font-display text-gold-400 font-bold text-sm tracking-widest">GESTION DE ASPIRANTES</h1>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-gold-500 hover:bg-gold-400 text-military-900 font-semibold px-4 py-1.5 rounded text-sm transition-colors">
          + Nuevo Aspirante
        </button>
      </nav>

      <main className="p-6 max-w-7xl mx-auto">
        <div className="flex gap-3 mb-5">
          <input type="text" placeholder="Buscar por nombre, apellido o cedula..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="flex-1 bg-military-800 border border-military-700 rounded px-3 py-2 text-military-100 focus:outline-none focus:border-military-500 placeholder-military-500 text-sm" />
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="bg-military-800 border border-military-700 rounded px-3 py-2 text-military-300 text-sm">
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_LABELS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {apiError && <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm px-4 py-3 rounded mb-4">{apiError}</div>}

        <p className="text-military-400 text-xs mb-3">{total} aspirante{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}</p>

        <div className="bg-military-800 border border-military-700 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-military-700 text-military-300 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Cedula</th>
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-right">Puntaje</th>
                <th className="px-4 py-3 text-center">Moodle</th>
                <th className="px-4 py-3 text-center">Accion</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-military-500 text-xs animate-pulse">CARGANDO...</td></tr>
              ) : aspirants.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-military-500 text-xs">No hay aspirantes registrados</td></tr>
              ) : aspirants.map((a) => (
                <tr key={a.id} className="border-t border-military-700 hover:bg-military-700/40 transition-colors">
                  <td className="px-4 py-3 font-mono text-military-300 text-xs">{a.cedula}</td>
                  <td className="px-4 py-3 text-military-100 font-medium">{a.first_name} {a.last_name}</td>
                  <td className="px-4 py-3 text-military-400 text-xs">{a.email}</td>
                  <td className="px-4 py-3 text-center"><Badge status={a.status} /></td>
                  <td className="px-4 py-3 text-right font-bold text-gold-400">{a.total_score ?? '-'}</td>
                  <td className="px-4 py-3 text-center">
                    {a.moodle_user_id ? <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> : <span className="w-2 h-2 rounded-full bg-gray-600 inline-block" />}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <a href={'/aspirants/' + a.id} className="text-military-400 hover:text-gold-400 text-xs transition-colors underline underline-offset-2">Ver detalle</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-military-800 border border-military-600 rounded-lg w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-military-700">
              <h2 className="font-display text-gold-400 font-bold tracking-wider text-sm">NUEVO ASPIRANTE</h2>
              <button onClick={() => setShowModal(false)} className="text-military-400 hover:text-military-200 text-xl">x</button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-military-300 text-xs mb-1 uppercase tracking-wider">Cedula</label>
                <input type="text" value={form.cedula} onChange={(e) => setForm({...form, cedula: e.target.value})} placeholder="0912345678" maxLength={10} required className="w-full bg-military-700 border border-military-600 rounded px-3 py-2 text-military-100 text-sm focus:outline-none focus:border-military-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-military-300 text-xs mb-1 uppercase tracking-wider">Nombres</label>
                  <input type="text" value={form.first_name} onChange={(e) => setForm({...form, first_name: e.target.value})} required className="w-full bg-military-700 border border-military-600 rounded px-3 py-2 text-military-100 text-sm focus:outline-none focus:border-military-400" />
                </div>
                <div>
                  <label className="block text-military-300 text-xs mb-1 uppercase tracking-wider">Apellidos</label>
                  <input type="text" value={form.last_name} onChange={(e) => setForm({...form, last_name: e.target.value})} required className="w-full bg-military-700 border border-military-600 rounded px-3 py-2 text-military-100 text-sm focus:outline-none focus:border-military-400" />
                </div>
              </div>
              <div>
                <label className="block text-military-300 text-xs mb-1 uppercase tracking-wider">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required className="w-full bg-military-700 border border-military-600 rounded px-3 py-2 text-military-100 text-sm focus:outline-none focus:border-military-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-military-300 text-xs mb-1 uppercase tracking-wider">Telefono</label>
                  <input type="tel" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} className="w-full bg-military-700 border border-military-600 rounded px-3 py-2 text-military-100 text-sm focus:outline-none focus:border-military-400" />
                </div>
                <div>
                  <label className="block text-military-300 text-xs mb-1 uppercase tracking-wider">Genero</label>
                  <select value={form.gender} onChange={(e) => setForm({...form, gender: e.target.value, genero: e.target.value})} className="w-full bg-military-700 border border-military-600 rounded px-3 py-2 text-military-100 text-sm">
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-military-300 text-xs mb-1 uppercase tracking-wider">Fecha de Nacimiento</label>
                  <input type="date" value={form.birth_date} onChange={(e) => setForm({...form, birth_date: e.target.value})} className="w-full bg-military-700 border border-military-600 rounded px-3 py-2 text-military-100 text-sm focus:outline-none focus:border-military-400" />
                </div>
                <div>
                  <label className="block text-military-300 text-xs mb-1 uppercase tracking-wider">Ciudad</label>
                  <input type="text" value={form.city} onChange={(e) => setForm({...form, city: e.target.value})} placeholder="Quito" className="w-full bg-military-700 border border-military-600 rounded px-3 py-2 text-military-100 text-sm focus:outline-none focus:border-military-400" />
                </div>
              </div>
              <div>
                <label className="block text-military-300 text-xs mb-1 uppercase tracking-wider">Dirección</label>
                <input type="text" value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} placeholder="Av. Principal y Calle Secundaria" className="w-full bg-military-700 border border-military-600 rounded px-3 py-2 text-military-100 text-sm focus:outline-none focus:border-military-400" />
              </div>
              {formError && <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm px-3 py-2 rounded">{formError}</div>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-military-700 hover:bg-military-600 text-military-200 py-2 rounded text-sm border border-military-600">Cancelar</button>
                <button type="submit" disabled={formLoading} className="flex-1 bg-gold-500 hover:bg-gold-400 text-military-900 py-2 rounded text-sm font-semibold disabled:opacity-50">
                  {formLoading ? 'Registrando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

