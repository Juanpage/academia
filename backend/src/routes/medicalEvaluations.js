// src/routes/medicalEvaluations.js
const express = require('express');
const router  = express.Router();
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');
router.use(authenticate);

router.get('/aspirant/:aspirantId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT me.*, u.username AS evaluador
       FROM medical_evaluations me
       LEFT JOIN users u ON u.id = me.evaluated_by
       WHERE me.aspirant_id = $1
       ORDER BY me.created_at DESC`,
      [req.params.aspirantId]
    );
    res.json({ evaluations: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { aspirant_id, talla_cm, peso_kg, tipo_sangre, institucion_emisora, fecha_certificado, notes } = req.body;
  if (!aspirant_id) return res.status(400).json({ error: 'aspirant_id requerido' });
  const toNum = v => (v != null && v !== '') ? parseFloat(v) : null;
  const t = toNum(talla_cm);
  const p = toNum(peso_kg);
  let imc = null;
  if (t && p) imc = parseFloat((p / Math.pow(t / 100, 2)).toFixed(2));
  try {
    const result = await pool.query(
      `INSERT INTO medical_evaluations
        (aspirant_id, talla_cm, peso_kg, imc, tipo_sangre,
         institucion_emisora, fecha_certificado, notes, evaluated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [aspirant_id, t, p, imc, tipo_sangre || null,
       institucion_emisora || null, fecha_certificado || null,
       notes || null, req.user.id]
    );
    res.status(201).json({ evaluation: result.rows[0] });
  } catch (err) {
    console.error('POST medical-evaluations:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM medical_evaluations WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
