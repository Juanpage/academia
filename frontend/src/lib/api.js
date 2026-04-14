import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

// Adjuntar token a todas las peticiones
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Manejar expiración de token
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  login:  (data)  => api.post('/auth/login', data),
  logout: ()      => api.post('/auth/logout'),
  me:     ()      => api.get('/auth/me'),
};

export const aspirantsApi = {
  list:       (params) => api.get('/aspirants', { params }),
  get:        (id)     => api.get(`/aspirants/${id}`),
  create:     (data)   => api.post('/aspirants', data),
  setStatus:  (id, s)  => api.patch(`/aspirants/${id}/status`, { status: s }),
};

export const moodleApi = {
  ping:       ()       => api.get('/moodle/ping'),
  courses:    ()       => api.get('/moodle/courses'),
  syncGrades: ()       => api.post('/moodle/sync/grades'),
};

export const dashboardApi = {
  summary: () => api.get('/dashboard'),
};

export default api;

export const evaluationsApi = {
  // ── Resumen global ──────────────────────────────────────────
  summary:            (id)   => api.get(`/evaluations/summary/${id}`),

  // ── Físico ──────────────────────────────────────────────────
  getPhysical:        (id)   => api.get('/physical-evaluations/aspirant/' + id),
  addPhysical:        (data) => api.post('/evaluations/physical', data),
  deletePhysical:     (id)   => api.delete('/physical-evaluations/' + id),

  // ── Psicológico ─────────────────────────────────────────────
  getPsychological:   (id)   => api.get('/psychological-evaluations/aspirant/' + id),
  addPsychological:   (data) => api.post('/evaluations/psychological', data),
  deletePsychological:(id)   => api.delete('/psychological-evaluations/' + id),

  // ── Médico ──────────────────────────────────────────────────
  getMedical:         (id)   => api.get('/medical-evaluations/aspirant/' + id),
  addMedical:         (data) => api.post('/evaluations/medical', data),
  deleteMedical:      (id)   => api.delete('/medical-evaluations/' + id),

  // ── Académico ───────────────────────────────────────────────
  getAcademic:        (id)   => api.get('/academic-evaluations/aspirant/' + id),
  addAcademic:        (data) => api.post('/academic-evaluations', data),
  deleteAcademic:     (id)   => api.delete('/academic-evaluations/' + id),
};

export const reportsApi = {
  ranking:     () => api.get('/reports/ranking'),
  evaluations: () => api.get('/reports/evaluations'),
  payments:    () => api.get('/reports/payments'),
  exportRankingXlsx:   () => api.get('/reports/export/ranking/excel',   { responseType: 'blob' }),
  exportPaymentsXlsx:  () => api.get('/reports/export/payments/excel',  { responseType: 'blob' }),
};
