const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { query, transaction } = require('../config/database');

// ─── Recalcular puntaje global de un aspirante ───────────────────────────────
const recalcScore = async (aspirantId) => {
  // Académico: promedio de notas Moodle
  await query(`
    UPDATE global_scores SET
      academic_score = COALESCE((
        SELECT ROUND(AVG(grade), 2) FROM academic_records WHERE aspirant_id = $1
      ), 0),
      updated_at = NOW()
    WHERE aspirant_id = $1
  `, [aspirantId]);

  // Físico: promedio de evaluaciones físicas
  await query(`
    UPDATE global_scores SET
      physical_score = COALESCE((
        SELECT ROUND(AVG(score), 2) FROM physical_records WHERE aspirant_id = $1
      ), 0),
      updated_at = NOW()
    WHERE aspirant_id = $1
  `, [aspirantId]);

  // Psicológico: promedio de evaluaciones psicológicas
  await query(`
    UPDATE global_scores SET
      psych_score = COALESCE((
        SELECT ROUND(AVG(score), 2) FROM psychological_records WHERE aspirant_id = $1
      ), 0),
      updated_at = NOW()
    WHERE aspirant_id = $1
  `, [aspirantId]);

  // Médico: basado en el resultado del último examen
  await query(`
    UPDATE global_scores SET
      medical_score = COALESCE((
        SELECT CASE result
          WHEN 'APTO'      THEN 100
          WHEN 'OBSERVADO' THEN 60
          WHEN 'NO_APTO'   THEN 0
          ELSE 0
        END
        FROM medical_records
        WHERE aspirant_id = $1
        ORDER BY evaluated_at DESC
        LIMIT 1
      ), 0),
      updated_at = NOW()
    WHERE aspirant_id = $1
  `, [aspirantId]);

  // Actualizar ranking
  await query(`
    WITH ranked AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY total_score DESC NULLS LAST) AS rn
      FROM global_scores
    )
    UPDATE global_scores gs
    SET rank_position = ranked.rn
    FROM ranked WHERE gs.id = ranked.id
  `);
};

// ════════════════════════════════════════════════════════════════════════════════
// EVALUACIONES FÍSICAS
// ════════════════════════════════════════════════════════════════════════════════

// GET /api/evaluations/physical/:aspirantId
router.get('/physical/:aspirantId', authenticate, async (req, res) => {
  try {
    const r = await query(
      `SELECT pr.*, u.first_name || ' ' || u.last_name AS evaluator_name
       FROM physical_records pr
       LEFT JOIN users u ON pr.evaluated_by = u.id
       WHERE pr.aspirant_id = $1
       ORDER BY pr.evaluated_at DESC`,
      [req.params.aspirantId]
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/evaluations/physical
router.post('/physical', authenticate, authorize('admin', 'staff', 'instructor'), async (req, res) => {
  try {
    const { aspirant_id, test_type, raw_value, score, notes } = req.body;

    if (!aspirant_id || !test_type || raw_value === undefined) {
      return res.status(400).json({ error: 'aspirant_id, test_type y raw_value son requeridos' });
    }

    const valid_tests = ['run_1000m', 'run_2000m', 'pushups', 'situps', 'pullups', 'swim_50m'];
    if (!valid_tests.includes(test_type)) {
      return res.status(400).json({ error: `test_type inválido. Válidos: ${valid_tests.join(', ')}` });
    }

    const r = await query(
      `INSERT INTO physical_records
         (aspirant_id, test_type, raw_value, score, evaluated_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [aspirant_id, test_type, raw_value, score || null, req.user.id, notes || null]
    );

    await recalcScore(aspirant_id);
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// EVALUACIONES PSICOLÓGICAS
// ════════════════════════════════════════════════════════════════════════════════

// GET /api/evaluations/psychological/:aspirantId
router.get('/psychological/:aspirantId', authenticate, async (req, res) => {
  try {
    const r = await query(
      `SELECT pr.*, u.first_name || ' ' || u.last_name AS evaluator_name
       FROM psychological_records pr
       LEFT JOIN users u ON pr.evaluated_by = u.id
       WHERE pr.aspirant_id = $1
       ORDER BY pr.evaluated_at DESC`,
      [req.params.aspirantId]
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/evaluations/psychological
router.post('/psychological', authenticate, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { aspirant_id, test_name, score, result, notes } = req.body;

    if (!aspirant_id || !test_name) {
      return res.status(400).json({ error: 'aspirant_id y test_name son requeridos' });
    }

    const valid_results = ['APTO', 'NO_APTO', 'CONDICIONAL'];
    if (result && !valid_results.includes(result)) {
      return res.status(400).json({ error: `result inválido. Válidos: ${valid_results.join(', ')}` });
    }

    const r = await query(
      `INSERT INTO psychological_records
         (aspirant_id, test_name, score, result, evaluated_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [aspirant_id, test_name, score || null, result || null, req.user.id, notes || null]
    );

    await recalcScore(aspirant_id);
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// EVALUACIONES MÉDICAS
// ════════════════════════════════════════════════════════════════════════════════

// GET /api/evaluations/medical/:aspirantId
router.get('/medical/:aspirantId', authenticate, async (req, res) => {
  try {
    const r = await query(
      `SELECT mr.*, u.first_name || ' ' || u.last_name AS evaluator_name
       FROM medical_records mr
       LEFT JOIN users u ON mr.evaluated_by = u.id
       WHERE mr.aspirant_id = $1
       ORDER BY mr.evaluated_at DESC`,
      [req.params.aspirantId]
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/evaluations/medical
router.post('/medical', authenticate, authorize('admin', 'staff', 'medic'), async (req, res) => {
  try {
    const { aspirant_id, height_cm, weight_kg, blood_type, result, notes } = req.body;

    if (!aspirant_id || !result) {
      return res.status(400).json({ error: 'aspirant_id y result son requeridos' });
    }

    const valid_results = ['APTO', 'NO_APTO', 'OBSERVADO'];
    if (!valid_results.includes(result)) {
      return res.status(400).json({ error: `result inválido. Válidos: ${valid_results.join(', ')}` });
    }

    // Calcular IMC si hay altura y peso
    let bmi = null;
    if (height_cm && weight_kg) {
      const heightM = height_cm / 100;
      bmi = parseFloat((weight_kg / (heightM * heightM)).toFixed(2));
    }

    const r = await query(
      `INSERT INTO medical_records
         (aspirant_id, height_cm, weight_kg, bmi, blood_type, result, evaluated_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [aspirant_id, height_cm || null, weight_kg || null, bmi,
       blood_type || null, result, req.user.id, notes || null]
    );

    await recalcScore(aspirant_id);
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// RESUMEN DE EVALUACIONES DE UN ASPIRANTE
// ════════════════════════════════════════════════════════════════════════════════

// GET /api/evaluations/summary/:aspirantId
router.get('/summary/:aspirantId', authenticate, async (req, res) => {
  try {
    const id = req.params.aspirantId;
    const [physical, psychological, medical, scores] = await Promise.all([
      query(`SELECT * FROM physical_records WHERE aspirant_id = $1 ORDER BY evaluated_at DESC LIMIT 10`, [id]),
      query(`SELECT * FROM psychological_records WHERE aspirant_id = $1 ORDER BY evaluated_at DESC LIMIT 10`, [id]),
      query(`SELECT * FROM medical_records WHERE aspirant_id = $1 ORDER BY evaluated_at DESC LIMIT 5`, [id]),
      query(`SELECT * FROM global_scores WHERE aspirant_id = $1`, [id]),
    ]);

    res.json({
      physical:      physical.rows,
      psychological: psychological.rows,
      medical:       medical.rows,
      scores:        scores.rows[0] || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
