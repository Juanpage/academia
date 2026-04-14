require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const rateLimit   = require('express-rate-limit');
const { pool }    = require('./src/config/database');
const { redis }   = require('./src/config/redis');
const { startAll } = require('./src/jobs/cronJobs');
const { setupMoodleCourses } = require('./src/services/moodleService');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Middlewares globales ─────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3001', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting general
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 300,
  message: { error: 'Demasiadas peticiones, intenta más tarde' },
}));

// Rate limiting estricto para auth
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de login' },
}));

// ─── Rutas ───────────────────────────────────────────────────
// Esquema real de BD (tablas en inglés):
//   aspirants, users, payments, payment_concepts, global_scores,
//   academic_evaluations, physical_evaluations,
//   psychological_evaluations, medical_evaluations,
//   moodle_courses, moodle_sync_logs

// Auth
app.use('/api/auth',      require('./src/routes/auth'));

// Aspirantes
app.use('/api/aspirants', require('./src/routes/aspirants'));

// Moodle / Dashboard
app.use('/api/moodle',    require('./src/routes/moodle'));
app.use('/api/dashboard', require('./src/routes/dashboard'));

// Evaluaciones individuales
app.use('/api/physical-evaluations',      require('./src/routes/physicalEvaluations'));
app.use('/api/academic-evaluations',      require('./src/routes/academicEvaluations'));
app.use('/api/psychological-evaluations', require('./src/routes/psychologicalEvaluations'));
app.use('/api/medical-evaluations',       require('./src/routes/medicalEvaluations'));

// Pagos
app.use('/api/payments', require('./src/routes/payments'));

// Usuarios
app.use('/api/users', require('./src/routes/users'));

// Reportes
app.use('/api/reports', require('./src/routes/reports'));

// ── Rutas deshabilitadas (esquema español ≠ BD real) ─────────
// Las siguientes rutas apuntan a tablas que NO existen en la BD
// (aspirantes, usuarios, pagos, scores_globales, pruebas_fisicas, etc.)
// Deben ser reescritas para usar el esquema inglés antes de reactivarse.
//
// app.use('/api/aspirantes', require('./src/routes/aspirantes.routes'));
// app.use('/api/financiero',  require('./src/routes/financiero.routes'));
// app.use('/api/admin',       require('./src/routes/admin.routes'));
// app.use('/api/academico',   require('./src/routes/academico.routes'));
// app.use('/api/fisico',      require('./src/routes/fisico.routes'));
// app.use('/api/psicologico', require('./src/routes/psicologico.routes'));
// app.use('/api/cohortes',    require('./src/routes/cohorte.routes'));

// Health check
app.get('/health', async (req, res) => {
  const dbOk    = await pool.query('SELECT 1').then(() => true).catch(() => false);
  const redisOk = await redis.ping().then(r => r === 'PONG').catch(() => false);
  res.json({
    status:   dbOk && redisOk ? 'ok' : 'degraded',
    postgres: dbOk,
    redis:    redisOk,
    uptime:   process.uptime(),
    ts:       new Date().toISOString(),
  });
});

// 404
app.use((req, res) => res.status(404).json({ error: `Ruta no encontrada: ${req.path}` }));

// Error handler global
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ─── Inicio ───────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`\n🎖️  Academia Militar Digital — Backend`);
  console.log(`   Puerto   : ${PORT}`);
  console.log(`   Moodle   : ${process.env.MOODLE_URL}`);
  console.log(`   Entorno  : ${process.env.NODE_ENV}\n`);

  // Verificar conexiones
  try {
    await pool.query('SELECT 1');
    console.log('✅ PostgreSQL conectado');
  } catch (e) {
    console.error('❌ PostgreSQL error:', e.message);
  }

  try {
    await redis.ping();
    console.log('✅ Redis conectado');
  } catch (e) {
    console.error('❌ Redis error:', e.message);
  }

  // Iniciar cron jobs
  startAll();
  // Configurar cursos Moodle al arrancar
  setupMoodleCourses().catch(err => console.error('[Moodle Setup]', err.message));
});

module.exports = app;



