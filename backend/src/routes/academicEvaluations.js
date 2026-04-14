// src/routes/academicEvaluations.js
const express = require('express');
const router  = express.Router();
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

const MATERIAS = [
  'ingles', 'matematicas', 'historia_realidad',
  'lenguaje_comunicacion', 'fisica', 'trigonometria',
];

function calcAcademic(data) {
  const vals   = MATERIAS.map(m => data[m]).filter(v => v != null && v !== '');
  const count  = vals.length;
  if (count === 0) return { promedio_10: 0, promedio_100: 0 };
  const sum    = vals.reduce((a, b) => a + parseFloat(b), 0);
  const avg10  = parseFloat((sum / count).toFixed(2));
  const avg100 = parseFloat(avg10.toFixed(2));
  return { promedio_10: avg10, promedio_100: avg100 };
}

// GET /api/academic-evaluations/aspirant/:id
router.get('/aspirant/:aspirantId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ae.*, u.username AS evaluador
       FROM academic_evaluations ae
       LEFT JOIN users u ON u.id = ae.evaluated_by
       WHERE ae.aspirant_id = $1
       ORDER BY ae.created_at DESC`,
      [req.params.aspirantId]
    );
    res.json({ evaluations: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/academic-evaluations
router.post('/', async (req, res) => {
  const { aspirant_id, periodo, notes, ...rest } = req.body;
  if (!aspirant_id) return res.status(400).json({ error: 'aspirant_id requerido' });

  // Validar rango 0-10
  for (const m of MATERIAS) {
    if (rest[m] != null && rest[m] !== '') {
      const n = parseFloat(rest[m]);
      if (isNaN(n) || n < 0 || n > 20)
        return res.status(400).json({ error: `${m}: valor fuera de rango (0-20)` });
    }
  }

  const toNum = v => (v != null && v !== '') ? parseFloat(v) : null;
  const { promedio_10, promedio_100 } = calcAcademic(rest);

  try {
    const result = await pool.query(
      `INSERT INTO academic_evaluations (
        aspirant_id, periodo,
        ingles, matematicas, historia_realidad,
        lenguaje_comunicacion, fisica, trigonometria,
        promedio_10, promedio_100,
        notes, evaluated_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *`,
      [
        aspirant_id, periodo || null,
        toNum(rest.ingles), toNum(rest.matematicas), toNum(rest.historia_realidad),
        toNum(rest.lenguaje_comunicacion), toNum(rest.fisica), toNum(rest.trigonometria),
        promedio_10, promedio_100,
        notes || null, req.user.id,
      ]
    );

    // Actualizar academic_score en aspirants
    await pool.query(
      `UPDATE aspirants SET academic_score = COALESCE(
         (SELECT MAX(promedio_100) FROM academic_evaluations WHERE aspirant_id=$1), 0)
       WHERE id=$1`,
      [aspirant_id]
    );

    res.status(201).json({ evaluation: result.rows[0], promedio_10, promedio_100 });
  } catch (err) {
    console.error('POST academic-evaluations:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/academic-evaluations/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT aspirant_id FROM academic_evaluations WHERE id=$1', [req.params.id]
    );
    await pool.query('DELETE FROM academic_evaluations WHERE id=$1', [req.params.id]);
    if (rows[0]) {
      await pool.query(
        `UPDATE aspirants SET academic_score = COALESCE(
           (SELECT MAX(promedio_100) FROM academic_evaluations WHERE aspirant_id=$1), 0)
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
