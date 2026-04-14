// src/routes/psychologicalEvaluations.js
const express = require('express');
const router  = express.Router();
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');
router.use(authenticate);

const PRUEBAS = ['test_16pf', 'test_raven', 'entrevista', 'test_liderazgo'];

function calcTotal(data) {
  const vals = PRUEBAS.map(p => data[p]).filter(v => v != null && v !== '');
  if (!vals.length) return 0;
  return parseFloat(vals.reduce((a, b) => a + parseFloat(b), 0).toFixed(2));
}

// GET /api/psychological-evaluations/aspirant/:id
router.get('/aspirant/:aspirantId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pe.*, u.username AS evaluador
       FROM psychological_evaluations pe
       LEFT JOIN users u ON u.id = pe.evaluated_by
       WHERE pe.aspirant_id = $1
       ORDER BY pe.created_at DESC`,
      [req.params.aspirantId]
    );
    res.json({ evaluations: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/psychological-evaluations
router.post('/', async (req, res) => {
  const { aspirant_id, resultado, periodo, notes, ...rest } = req.body;
  if (!aspirant_id) return res.status(400).json({ error: 'aspirant_id requerido' });
  if (!resultado || !['APTO','NO_APTO'].includes(resultado))
    return res.status(400).json({ error: 'resultado debe ser APTO o NO_APTO' });
  for (const p of PRUEBAS) {
    if (rest[p] != null && rest[p] !== '') {
      const n = parseFloat(rest[p]);
      if (isNaN(n) || n < 0 || n > 5)
        return res.status(400).json({ error: p + ': valor fuera de rango (0-5)' });
    }
  }
  const toNum = v => (v != null && v !== '') ? parseFloat(v) : null;
  const total_score = calcTotal(rest);
  try {
    const result = await pool.query(
      `INSERT INTO psychological_evaluations
        (aspirant_id, test_16pf, test_raven, entrevista, test_liderazgo,
         total_score, resultado, periodo, notes, evaluated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        aspirant_id,
        toNum(rest.test_16pf), toNum(rest.test_raven),
        toNum(rest.entrevista), toNum(rest.test_liderazgo),
        total_score, resultado, periodo || null, notes || null, req.user.id
      ]
    );
    await pool.query(
      `UPDATE aspirants SET psych_score = COALESCE(
         (SELECT MAX(total_score) FROM psychological_evaluations WHERE aspirant_id=$1), 0)
       WHERE id=$1`,
      [aspirant_id]
    );
    res.status(201).json({ evaluation: result.rows[0] });
  } catch (err) {
    console.error('POST psychological-evaluations:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/psychological-evaluations/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT aspirant_id FROM psychological_evaluations WHERE id=$1', [req.params.id]
    );
    await pool.query('DELETE FROM psychological_evaluations WHERE id=$1', [req.params.id]);
    if (rows[0]) {
      await pool.query(
        `UPDATE aspirants SET psych_score = COALESCE(
           (SELECT MAX(total_score) FROM psychological_evaluations WHERE aspirant_id=$1), 0)
         WHERE id=$1`,
        [rows[0].aspirant_id]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
