'use client';
import { useState, FormEvent } from 'react';
import { authAPI } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

export default function RegistroPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    cedula: '', email: '', nombre: '', apellido: '', telefono: '',
    fecha_nacimiento: '', ciudad: '', carrera_objetivo: '', password: '', confirm: '',
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError('Las contraseñas no coinciden'); return; }
    setLoading(true); setError('');
    try {
      const res = await authAPI.register(form);
      Cookies.set('token', res.data.token, { expires: 1, secure: true });
      localStorage.setItem('token', res.data.token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Error al registrar');
    } finally { setLoading(false); }
  };

  const inp = (label: string, key: string, type = 'text', extra: any = {}) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={(form as any)[key]} onChange={set(key)} className="input" {...extra} />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1B4332] to-[#0A2619] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🎖️</div>
          <h1 className="text-2xl font-bold text-white">Registro de Aspirante</h1>
          <p className="text-green-300 text-sm mt-1">ESMIL · ESFORSE · FAE · Policía Nacional</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Progreso */}
          <div className="flex items-center mb-6">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step >= s ? 'bg-[#1B4332] text-white' : 'bg-gray-100 text-gray-400'
                }`}>{s}</div>
                <div className={`text-xs ml-2 ${step >= s ? 'text-[#1B4332]' : 'text-gray-400'}`}>
                  {s === 1 ? 'Datos Personales' : 'Cuenta'}
                </div>
                {s < 2 && <div className={`flex-1 h-0.5 mx-3 ${step > s ? 'bg-[#1B4332]' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {inp('Nombre *', 'nombre', 'text', { required: true, minLength: 2 })}
                  {inp('Apellido *', 'apellido', 'text', { required: true, minLength: 2 })}
                </div>
                {inp('Cédula de Identidad *', 'cedula', 'text', { required: true, maxLength: 10, pattern: '[0-9]{10}', placeholder: '0000000000' })}
                {inp('Email *', 'email', 'email', { required: true })}
                <div className="grid grid-cols-2 gap-3">
                  {inp('Teléfono', 'telefono', 'tel')}
                  {inp('Fecha de Nacimiento', 'fecha_nacimiento', 'date')}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {inp('Ciudad', 'ciudad')}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Carrera Objetivo *</label>
                    <select className="input" required value={form.carrera_objetivo} onChange={set('carrera_objetivo')}>
                      <option value="">— Seleccionar —</option>
                      <option value="ESMIL">ESMIL — Ejército</option>
                      <option value="ESFORSE">ESFORSE — Fuerzas Especiales</option>
                      <option value="FAE">FAE — Fuerza Aérea</option>
                      <option value="POLICIA">Policía Nacional</option>
                    </select>
                  </div>
                </div>
                <button type="button" onClick={() => setStep(2)} className="btn-primary w-full mt-2">
                  Continuar →
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                  Tu cédula <strong>{form.cedula}</strong> será tu usuario de acceso al sistema y a Moodle.
                </p>
                {inp('Contraseña *', 'password', 'password', { required: true, minLength: 8, placeholder: 'Mínimo 8 caracteres' })}
                {inp('Confirmar contraseña *', 'confirm', 'password', { required: true, placeholder: 'Repite la contraseña' })}
                <p className="text-xs text-gray-400">
                  La misma contraseña se usará para acceder a tus cursos en Moodle.
                </p>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(1)} className="btn-outline flex-1">← Atrás</button>
                  <button type="submit" disabled={loading} className="btn-primary flex-1">
                    {loading ? 'Creando cuenta...' : '🎖️ Registrarme'}
                  </button>
                </div>
              </div>
            )}
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              ¿Ya tienes cuenta?{' '}
              <a href="/login" className="text-[#1B4332] font-semibold hover:underline">Ingresar</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
