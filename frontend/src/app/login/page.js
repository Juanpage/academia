'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [form,  setForm]  = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authApi.login(form);
      localStorage.setItem('access_token', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      const payload = JSON.parse(atob(data.accessToken.split('.')[1]));
      if (payload.role === 'aspirante') {
        // Buscar el aspirante por cedula para obtener su id
        const cedula = payload.username.replace('asp_', '');
        router.push('/mi-expediente?cedula=' + cedula);
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-military-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: 'repeating-linear-gradient(45deg, #3d7035 0, #3d7035 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' }} />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full
                          border-2 border-gold-500 bg-military-800 mb-4">
            <span className="text-3xl">🎖️</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-gold-400 tracking-widest">
            ACADEMIA MILITAR
          </h1>
          <p className="text-military-300 text-sm mt-1 tracking-wider">SISTEMA DIGITAL</p>
        </div>

        <div className="card border-military-600">
          <h2 className="text-military-100 font-semibold mb-6 text-center">
            Acceso al Sistema
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-military-300 text-sm mb-1">Usuario</label>
              <input
                type="text"
                className="input-field"
                placeholder="usuario"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-military-300 text-sm mb-1">Contraseña</label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            {error && (
              <div className="bg-red-900/50 border border-red-700 text-red-300
                              text-sm px-3 py-2 rounded">
                {error}
              </div>
            )}

            <a href="/forgot-password" className="block text-right text-military-400 hover:text-gold-400 text-xs mb-3 transition-colors">Olvide mi contrasena</a>
            <button
              type="submit"
              disabled={loading}
              className="btn-gold w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verificando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <p className="text-center text-military-500 text-xs mt-6">
          Sistema restringido — Solo personal autorizado
        </p>
      </div>
    </div>
  );
}
