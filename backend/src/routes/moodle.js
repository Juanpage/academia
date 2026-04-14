const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const moodle = require('../services/moodleService');

// GET /api/moodle/ping — verificar conectividad
router.get('/ping', authenticate, async (req, res) => {
  try {
    const info = await moodle.ping();
    res.json({ status: 'ok', moodle: info });
  } catch (err) {
    res.status(502).json({ status: 'error', error: err.message });
  }
});

// GET /api/moodle/courses
router.get('/courses', authenticate, async (req, res) => {
  try {
    const courses = await moodle.getCourses();
    res.json(courses);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// POST /api/moodle/courses
router.post('/courses', authenticate, authorize('admin'), async (req, res) => {
  try {
    const course = await moodle.createCourse(req.body);
    res.status(201).json(course);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// POST /api/moodle/enrol
router.post('/enrol', authenticate, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { moodle_user_id, course_id, role_id } = req.body;
    await moodle.enrollUser(moodle_user_id, course_id, role_id);
    res.json({ message: 'Matrícula exitosa' });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// POST /api/moodle/sync/grades — sincronización manual
router.post('/sync/grades', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await moodle.syncGrades();
    res.json({ message: 'Sincronización completada', result });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// POST /api/moodle/enrol-all - matricular aspirante en los 6 cursos
router.post('/enrol-all', authenticate, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const { moodle_user_id } = req.body;
    if (!moodle_user_id) return res.status(400).json({ error: 'moodle_user_id requerido' });
    await moodle.enrollInAllCourses(moodle_user_id);
    res.json({ message: 'Matriculado en todos los cursos correctamente' });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// POST /api/moodle/setup-courses - crear/verificar los 6 cursos
router.post('/setup-courses', authenticate, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    await moodle.setupMoodleCourses();
    res.json({ message: 'Cursos configurados correctamente' });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

module.exports = router;
