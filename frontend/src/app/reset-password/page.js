'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '../../lib/api';

export default function ResetPasswordPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const token        = searchParams.get('token');

  const [newPassword,    setNewPassword]    = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!token) setError('Token invalido. Solicita un nuevo enlace de recuperacion.');
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (newPassword !== confirmPassword)
      return setError('Las contrasenas no coinciden');
    if (newPassword.length < 8)
      return setError('La contrasena debe tener al menos 8 caracteres');
    setLoading(true); setError(''); setSuccess('');
    try {
      await api.post('/auth/reset-password', { token, new_password: newPassword });
      setSuccess('Contrasena restablecida correctamente. Redirigiendo al login...');
      setTimeout(() => router.push('/login'), 3000);
    } catch(e) {
      setError(e.response?.data?.error || 'Error al restablecer la contrasena');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-military-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-4xl">🎖️</span>
          <h1 className="text-gold-400 font-display font-bold text-xl tracking-widest mt-2">ACADEMIA MILITAR DIGITAL</h1>
          <p className="text-military-400 text-sm mt-1">Restablecer Contrasena</p>
        </div>
        <div className="bg-military-800 border border-military-700 rounded-lg p-6">
          {error   && <p className="text-red-400 text-sm mb-4 bg-red-900/20 px-3 py-2 rounded">{error}</p>}
          {success && <p className="text-green-400 text-sm mb-4 bg-green-900/20 px-3 py-2 rounded">{success}</p>}
          {!success && token && (
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="text-military-400 text-xs block mb-1">Nueva Contrasena</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder="Minimo 8 caracteres" required
                  className="w-full bg-military-700 border border-military-600 rounded px-3 py-2 text-military-100 text-sm focus:outline-none focus:border-gold-500" />
              </div>
              <div className="mb-5">
                <label className="text-military-400 text-xs block mb-1">Confirmar Contrasena</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contrasena" required
                  className="w-full bg-military-700 border border-military-600 rounded px-3 py-2 text-military-100 text-sm focus:outline-none focus:border-gold-500" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-military-900 font-bold py-2.5 rounded-lg text-sm transition-colors">
                {loading ? 'Restableciendo...' : 'Restablecer Contrasena'}
              </button>
            </form>
          )}
          <button onClick={() => router.push('/login')}
            className="w-full mt-3 text-military-400 hover:text-military-200 text-sm text-center transition-colors">
            Volver al login
          </button>
        </div>
      </div>
    </div>
  );
}
