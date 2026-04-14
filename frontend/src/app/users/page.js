'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token') || localStorage.getItem('token');
}
function hdrs() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` };
}
async function apiFetch(url, opts = {}) {
  const r = await fetch(`${API}${url}`, { headers: hdrs(), ...opts });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'Error');
  return d;
}

const ROLES = [
  { value: 'super_admin', label: 'Super Admin',  color: '#f59e0b', desc: 'Acceso total al sistema' },
  { value: 'admin',       label: 'Administrador', color: '#3b82f6', desc: 'Gestión completa excepto config técnica' },
  { value: 'instructor',  label: 'Instructor',    color: '#22c55e', desc: 'Ve y evalúa sus grupos' },
  { value: 'evaluador',   label: 'Evaluador',     color: '#8b5cf6', desc: 'Solo ingresa evaluaciones' },
  { value: 'psicologo',   label: 'Psicólogo',     color: '#ec4899', desc: 'Solo evaluación psicológica' },
  { value: 'medico',      label: 'Médico',        color: '#ef4444', desc: 'Solo evaluación médica' },
];

const EVAL_TYPES = [
  { value: 'physical',      label: '💪 Física' },
  { value: 'academic',      label: '📚 Académica' },
  { value: 'psychological', label: '🧠 Psicológica' },
  { value: 'medical',       label: '🏥 Médica' },
];

function RoleBadge({ role }) {
  const r = ROLES.find(x => x.value === role);
  if (!r) return <span style={{ color: '#6b7280', fontSize: '12px' }}>{role}</span>;
  return (
    <span style={{
      background: r.color + '22', color: r.color,
      border: `1px solid ${r.color}55`,
      borderRadius: '999px', padding: '2px 10px',
      fontSize: '12px', fontWeight: '600',
    }}>{r.label}</span>
  );
}

const EMPTY_FORM = {
  username: '', email: '', password: '', role: 'evaluador',
  first_name: '', last_name: '', cedula: '', phone: '',
  especialidad: '', eval_types: [], is_active: true,
};

function UserForm({ user, onSave, onCancel, currentUserRole }) {
  const isEdit = !!user?.id;
  const [f, setF] = useState(isEdit ? {
    ...EMPTY_FORM, ...user,
    password: '',
    eval_types: user.assigned_eval_types || [],
  } : EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const toggleEvalType = (type) => {
    setF(p => ({
      ...p,
      eval_types: p.eval_types.includes(type)
        ? p.eval_types.filter(t => t !== type)
        : [...p.eval_types, type],
    }));
  };

  const handleSubmit = async () => {
    if (!f.username || !f.email || (!isEdit && !f.password) || !f.role) {
      setError('Usuario, email, contraseña y rol son requeridos');
      return;
    }
    setLoading(true); setError('');
    try {
      const body = { ...f };
      if (isEdit && !body.password) delete body.password;
      if (isEdit) {
        await apiFetch(`/users/${user.id}`, { method: 'PUT', body: JSON.stringify(body) });
        if (f.password) {
          await apiFetch(`/users/${user.id}/password`, {
            method: 'PATCH', body: JSON.stringify({ password: f.password }),
          });
        }
      } else {
        await apiFetch('/users', { method: 'POST', body: JSON.stringify(body) });
      }
      onSave();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const INPUT = {
    width: '100%', background: '#0f172a', border: '1px solid #334155',
    borderRadius: '8px', color: '#f1f5f9', fontSize: '14px',
    padding: '8px 12px', outline: 'none', boxSizing: 'border-box',
  };
  const LBL = { color: '#94a3b8', fontSize: '12px', marginBottom: '4px', display: 'block', fontWeight: '500' };

  // Filtrar roles que puede crear según su propio rol
  const availableRoles = currentUserRole === 'super_admin'
    ? ROLES
    : ROLES.filter(r => r.value !== 'super_admin');

  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '24px' }}>
      <h3 style={{ color: '#fff', fontWeight: 'bold', fontSize: '16px', marginBottom: '20px' }}>
        {isEdit ? '✏️ Editar Usuario' : '➕ Nuevo Usuario'}
      </h3>

      {error && (
        <div style={{ background: '#7f1d1d33', border: '1px solid #991b1b', color: '#fca5a5', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px' }}>
          ⚠ {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
        <div>
          <label style={LBL}>Nombre *</label>
          <input style={INPUT} value={f.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Nombres" />
        </div>
        <div>
          <label style={LBL}>Apellido *</label>
          <input style={INPUT} value={f.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Apellidos" />
        </div>
        <div>
          <label style={LBL}>Username *</label>
          <input style={INPUT} value={f.username} onChange={e => set('username', e.target.value)} placeholder="usuario123" disabled={isEdit} />
        </div>
        <div>
          <label style={LBL}>Email *</label>
          <input style={INPUT} type="email" value={f.email} onChange={e => set('email', e.target.value)} placeholder="correo@ejemplo.com" />
        </div>
        <div>
          <label style={LBL}>{isEdit ? 'Nueva Contraseña (dejar en blanco para no cambiar)' : 'Contraseña *'}</label>
          <input style={INPUT} type="password" value={f.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" />
        </div>
        <div>
          <label style={LBL}>Cédula</label>
          <input style={INPUT} value={f.cedula} onChange={e => set('cedula', e.target.value)} placeholder="1712345678" maxLength={10} />
        </div>
        <div>
          <label style={LBL}>Teléfono</label>
          <input style={INPUT} value={f.phone} onChange={e => set('phone', e.target.value)} placeholder="0999999999" />
        </div>
        <div>
          <label style={LBL}>Especialidad</label>
          <input style={INPUT} value={f.especialidad} onChange={e => set('especialidad', e.target.value)} placeholder="Ej: Educación Física" />
        </div>
      </div>

      {/* Rol */}
      <div style={{ marginBottom: '16px' }}>
        <label style={LBL}>Rol *</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {availableRoles.map(r => (
            <button key={r.value} onClick={() => set('role', r.value)}
              title={r.desc}
              style={{
                padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                background: f.role === r.value ? r.color + '33' : '#0f172a',
                color: f.role === r.value ? r.color : '#64748b',
                border: f.role === r.value ? `2px solid ${r.color}` : '2px solid #334155',
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
              {r.label}
            </button>
          ))}
        </div>
        <div style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>
          {ROLES.find(r => r.value === f.role)?.desc}
        </div>
      </div>

      {/* Tipos de evaluación */}
      {['instructor', 'evaluador'].includes(f.role) && (
        <div style={{ marginBottom: '16px' }}>
          <label style={LBL}>Tipos de evaluación asignados</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {EVAL_TYPES.map(et => (
              <button key={et.value} onClick={() => toggleEvalType(et.value)}
                style={{
                  padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600',
                  background: f.eval_types.includes(et.value) ? '#1d4ed833' : '#0f172a',
                  color: f.eval_types.includes(et.value) ? '#60a5fa' : '#64748b',
                  border: f.eval_types.includes(et.value) ? '1px solid #1d4ed8' : '1px solid #334155',
                  cursor: 'pointer',
                }}>
                {et.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Estado activo */}
      {isEdit && (
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ ...LBL, marginBottom: 0 }}>Estado:</label>
          <button onClick={() => set('is_active', !f.is_active)}
            style={{
              padding: '4px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '700',
              background: f.is_active ? '#14532d33' : '#7f1d1d33',
              color: f.is_active ? '#4ade80' : '#f87171',
              border: f.is_active ? '1px solid #166534' : '1px solid #991b1b',
              cursor: 'pointer',
            }}>
            {f.is_active ? '✓ Activo' : '✗ Inactivo'}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
        <button onClick={handleSubmit} disabled={loading}
          style={{
            padding: '10px 24px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px',
            background: loading ? '#374151' : '#ca8a04', color: '#fff',
            border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
          }}>
          {loading ? 'Guardando...' : isEdit ? '💾 Actualizar' : '➕ Crear Usuario'}
        </button>
        <button onClick={onCancel}
          style={{ padding: '10px 20px', borderRadius: '8px', background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', cursor: 'pointer', fontSize: '14px' }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const router = useRouter();
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [search,   setSearch]   = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { router.push('/login'); return; }
    const u = localStorage.getItem('user');
    if (u) {
      try { setCurrentUser(JSON.parse(u)); } catch {}
    }
  }, [router]);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/users');
      setUsers(data.users ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleDeactivate = async (userId, isActive) => {
    const action = isActive ? 'desactivar' : 'activar';
    if (!confirm(`¿${action} este usuario?`)) return;
    try {
      if (isActive) {
        await apiFetch(`/users/${userId}`, { method: 'DELETE' });
      } else {
        await apiFetch(`/users/${userId}`, { method: 'PUT', body: JSON.stringify({ is_active: true }) });
      }
      loadUsers();
    } catch (e) { alert(e.message); }
  };

  const handleSave = () => {
    setShowForm(false);
    setEditing(null);
    loadUsers();
  };

  const filtered = users.filter(u => {
    const name = `${u.first_name} ${u.last_name} ${u.username} ${u.email}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase());
    const matchRole   = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a' }}>
      {/* Header */}
      <header style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button onClick={() => router.push('/dashboard')} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
              ← Dashboard
            </button>
            <div style={{ width: '1px', height: '20px', background: '#334155' }} />
            <div>
              <h1 style={{ color: '#fff', fontWeight: 'bold', margin: 0 }}>Gestión de Usuarios</h1>
              <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>Instructores, evaluadores y personal del sistema</p>
            </div>
          </div>
          {!showForm && (
            <button onClick={() => { setEditing(null); setShowForm(true); }}
              style={{ padding: '8px 18px', background: '#ca8a04', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
              + Nuevo Usuario
            </button>
          )}
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Formulario */}
        {showForm && (
          <div style={{ marginBottom: '24px' }}>
            <UserForm
              user={editing}
              currentUserRole={currentUser?.role || 'admin'}
              onSave={handleSave}
              onCancel={() => { setShowForm(false); setEditing(null); }}
            />
          </div>
        )}

        {/* Filtros */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, usuario o email..."
            style={{
              flex: 1, minWidth: '250px', background: '#1e293b', border: '1px solid #334155',
              borderRadius: '8px', color: '#f1f5f9', fontSize: '14px', padding: '8px 14px', outline: 'none',
            }}
          />
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9', fontSize: '14px', padding: '8px 14px', outline: 'none' }}>
            <option value="">Todos los roles</option>
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>

        {/* Tabla */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Cargando usuarios...</div>
        ) : (
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden' }}>
            {/* Cabecera tabla */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 2fr 1fr 1fr', padding: '10px 16px', background: '#0f172a', borderBottom: '1px solid #334155' }}>
              {['Nombre', 'Email / Usuario', 'Rol', 'Evaluaciones', 'Estado', 'Acciones'].map(h => (
                <div key={h} style={{ color: '#64748b', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No hay usuarios que coincidan.</div>
            ) : (
              filtered.map((u, i) => (
                <div key={u.id} style={{
                  display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 2fr 1fr 1fr',
                  padding: '12px 16px', alignItems: 'center',
                  background: i % 2 === 0 ? '#1e293b' : '#1a2332',
                  borderBottom: '1px solid #1e3a5f22',
                }}>
                  {/* Nombre */}
                  <div>
                    <div style={{ color: '#f1f5f9', fontWeight: '600', fontSize: '14px' }}>
                      {u.first_name} {u.last_name}
                    </div>
                    {u.especialidad && <div style={{ color: '#64748b', fontSize: '11px' }}>{u.especialidad}</div>}
                    {u.cedula && <div style={{ color: '#475569', fontSize: '11px', fontFamily: 'monospace' }}>CI: {u.cedula}</div>}
                  </div>
                  {/* Email */}
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: '13px' }}>{u.email}</div>
                    <div style={{ color: '#475569', fontSize: '11px', fontFamily: 'monospace' }}>@{u.username}</div>
                  </div>
                  {/* Rol */}
                  <div><RoleBadge role={u.role} /></div>
                  {/* Evaluaciones asignadas */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {(u.assigned_eval_types || []).length > 0
                      ? u.assigned_eval_types.map(et => {
                          const t = EVAL_TYPES.find(x => x.value === et);
                          return (
                            <span key={et} style={{ background: '#1d4ed822', color: '#60a5fa', border: '1px solid #1d4ed855', borderRadius: '4px', padding: '1px 6px', fontSize: '11px' }}>
                              {t?.label || et}
                            </span>
                          );
                        })
                      : <span style={{ color: '#374151', fontSize: '12px' }}>—</span>
                    }
                  </div>
                  {/* Estado */}
                  <div>
                    <span style={{
                      background: u.is_active ? '#14532d33' : '#7f1d1d33',
                      color: u.is_active ? '#4ade80' : '#f87171',
                      border: `1px solid ${u.is_active ? '#166534' : '#991b1b'}`,
                      borderRadius: '999px', padding: '2px 8px', fontSize: '11px', fontWeight: '700',
                    }}>
                      {u.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  {/* Acciones */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => { setEditing(u); setShowForm(true); }}
                      style={{ padding: '4px 10px', background: '#1d4ed822', color: '#60a5fa', border: '1px solid #1d4ed855', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>
                      Editar
                    </button>
                    <button onClick={() => handleDeactivate(u.id, u.is_active)}
                      style={{ padding: '4px 10px', background: u.is_active ? '#7f1d1d22' : '#14532d22', color: u.is_active ? '#f87171' : '#4ade80', border: `1px solid ${u.is_active ? '#991b1b55' : '#16653455'}`, borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>
                      {u.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Resumen de roles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginTop: '24px' }}>
          {ROLES.map(r => {
            const count = users.filter(u => u.role === r.value && u.is_active).length;
            return (
              <div key={r.value} style={{ background: '#1e293b', border: `1px solid ${r.color}33`, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: r.color }}>{count}</div>
                <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '600' }}>{r.label}</div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
