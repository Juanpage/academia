import axios from 'axios';
import Cookies from 'js-cookie';

// Nota: baseURL incluye /api para que todas las rutas sean relativas a /api/*
const api = axios.create({
  baseURL: (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000') + '/api',
  timeout: 15000,
});

// Attach JWT token on every request
// Usa 'access_token' para mantener coherencia con api.js
api.interceptors.request.use((config) => {
  const token =
    Cookies.get('access_token') ||
    (typeof window !== 'undefined' ? localStorage.getItem('access_token') : null);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      Cookies.remove('access_token');
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authAPI = {
  login:    (data)  => api.post('/auth/login', data),
  register: (data)  => api.post('/auth/register', data),
  logout:   ()      => api.post('/auth/logout'),
  me:       ()      => api.get('/auth/me'),
};

// ─── Aspirantes ──────────────────────────────────────────────────────────────
export const aspirantesAPI = {
  getAll:     (params) => api.get('/aspirantes', { params }),
  getById:    (id)     => api.get(`/aspirantes/${id}`),
  getDashboard: (id)   => api.get(`/aspirantes/${id}/dashboard`),
  update:     (id, data) => api.put(`/aspirantes/${id}`, data),
};

// ─── Financiero ──────────────────────────────────────────────────────────────
export const financieroAPI = {
  getDashboard:     (params) => api.get('/financiero/dashboard', { params }),
  getPagosAspirante: (id)    => api.get(`/financiero/pagos/aspirante/${id}`),
  getPagosVencidos:  ()      => api.get('/financiero/pagos/vencidos'),
  registrarPago:    (data)   => api.post('/financiero/pagos', data),
  confirmarPago:    (id, data) => api.put(`/financiero/pagos/${id}/confirmar`, data),
  registrarGasto:   (data)   => api.post('/financiero/gastos', data),
  getGastos:        (params) => api.get('/financiero/gastos', { params }),
  getFlujoCaja:     (params) => api.get('/financiero/flujo-caja', { params }),
  getReporteIngresos: (params) => api.get('/financiero/reporte/ingresos', { params }),
  getComprobantePdf:  (id)   => api.get(`/financiero/comprobante/${id}/pdf`, { responseType: 'blob' }),
};

// ─── Admin ───────────────────────────────────────────────────────────────────
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
};

// ─── Físico ──────────────────────────────────────────────────────────────────
export const fisicoAPI = {
  registrarEvaluacion: (data) => api.post('/fisico/evaluacion', data),
  getHistorial:        (id)   => api.get(`/fisico/aspirante/${id}`),
  getRanking:          (id)   => api.get(`/fisico/ranking/${id}`),
};

// ─── Académico ───────────────────────────────────────────────────────────────
export const academicoAPI = {
  getReporte:  (id)  => api.get(`/academico/reporte/${id}`),
  getSsoUrl:   (id)  => api.get(`/academico/sso-url/${id}`),
  getRanking:  (id)  => api.get(`/academico/ranking/${id}`),
};

// ─── Cohortes ────────────────────────────────────────────────────────────────
export const cohortesAPI = {
  getAll:  ()     => api.get('/cohortes'),
  create:  (data) => api.post('/cohortes', data),
};
