'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../lib/api';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error,   setError]   = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSuccess('Si el email esta registrado, recibiras un correo con instrucciones para restablecer tu contrasena.');
    } catch(e) {
      setError(e.response?.data?.error || 'Error al procesar la solicitud');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-military-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-4xl">🎖️</span>
          <h1 className="text-gold-400 font-display font-bold text-xl tracking-widest mt-2">ACADEMIA MILITAR DIGITAL</h1>
          <p className="text-military-400 text-sm mt-1">Recuperacion de Contrasena</p>
        </div>
        <div className="bg-military-800 border border-military-700 rounded-lg p-6">
          <h2 className="text-military-200 font-semibold mb-4">Olvidaste tu contrasena?</h2>
          <p className="text-military-400 text-sm mb-5">Ingresa tu email registrado y te enviaremos las instrucciones.</p>
          {error   && <p className="text-red-400 text-sm mb-4 bg-red-900/20 px-3 py-2 rounded">{error}</p>}
          {success && <p className="text-green-400 text-sm mb-4 bg-green-900/20 px-3 py-2 rounded">{success}</p>}
          {!success && (
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="text-military-400 text-xs block mb-1">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com" required
                  className="w-full bg-military-700 border border-military-600 rounded px-3 py-2 text-military-100 text-sm focus:outline-none focus:border-gold-500" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-military-900 font-bold py-2.5 rounded-lg text-sm transition-colors">
                {loading ? 'Enviando...' : 'Enviar instrucciones'}
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
