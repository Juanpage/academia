const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { query }          = require('../config/database');
const { createMoodleUser } = require('../services/moodleService');
const { validateCedula } = require('../utils/cedula');

// GET /api/aspirants â€” listar con paginaciÃ³n y filtros
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const offset = (page - 1) * limit;

    let where = 'WHERE 1=1';
    const params = [];

    if (status) {
      params.push(status);
      where += ` AND a.status = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      where += ` AND (a.first_name ILIKE $${params.length} OR a.last_name ILIKE $${params.length} OR a.cedula ILIKE $${params.length})`;
    }

    params.push(limit, offset);

    const [dataRes, countRes] = await Promise.all([
      query(
        `SELECT a.*,
                gs.total_score,
                gs.rank_position
         FROM aspirants a
         LEFT JOIN global_scores gs ON gs.aspirant_id = a.id
         ${where}
         ORDER BY gs.total_score DESC NULLS LAST, a.created_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      ),
      query(`SELECT COUNT(*) FROM aspirants a ${where}`, params.slice(0, -2)),
    ]);

    res.json({
      data:  dataRes.rows,
      total: parseInt(countRes.rows[0].count),
      page:  parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/aspirants/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const res1 = await query(
      `SELECT a.*,
              a.academic_score, a.physical_score,
              a.psych_score, a.medical_score, a.final_score AS total_score,
              gs.rank_position
       FROM aspirants a
       LEFT JOIN global_scores gs ON gs.aspirant_id = a.id
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (!res1.rows[0]) return res.status(404).json({ error: 'No encontrado' });
    res.json(res1.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/aspirants â€” crear aspirante + usuario Moodle
router.post('/', authenticate, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { cedula, first_name, last_name, email, phone, birth_date, gender, genero, address, city } = req.body;

    if (!validateCedula(cedula)) {
      return res.status(400).json({ error: 'CÃ©dula ecuatoriana invÃ¡lida' });
    }
    if (!first_name || !last_name || !email) {
      return res.status(400).json({ error: 'Nombre, apellido y email son requeridos' });
    }

    // Crear en PostgreSQL + Moodle (atÃ³mico con rollback)
    const aspirant = await createMoodleUser({
      cedula, first_name, last_name, email,
      password: `Asp${cedula}!`,
    });

    // Crear registro de puntaje inicial
    await query(
      `INSERT INTO global_scores (aspirant_id) VALUES ($1)
       ON CONFLICT DO NOTHING`,
      [aspirant.id]
    );

    res.status(201).json(aspirant);
  } catch (err) {
    if (err.message.includes('duplicate') || err.message.includes('unique')) {
      return res.status(409).json({ error: 'CÃ©dula o email ya registrado' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/aspirants/:id/status
router.patch('/:id/status', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['registered','active','inactive','graduated','expelled'];
    if (!valid.includes(status)) {
      return res.status(400).json({ error: `Estado invÃ¡lido. VÃ¡lidos: ${valid.join(', ')}` });
    }
    const r = await query(
      'UPDATE aspirants SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
      [status, req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'No encontrado' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;


