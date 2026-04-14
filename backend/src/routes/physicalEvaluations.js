// src/routes/physicalEvaluations.js
const express = require('express');
const router  = express.Router();
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// ── Estandares ESMIL 18-22 anos ──────────────────────────────────────────
const STD = {
  abd:      { reqs: { M: 50, F: 40 }, max_pts: 1.5 },
  flex:     { reqs: { M: 45, F: 33 }, max_pts: 1.5 },
  trote:    { M: { mejor: 777,  limite: 1017 }, F: { mejor: 892,  limite: 1132 }, max_pts: 8 },
  natacion: { M: { mejor: 290,  limite: 410  }, F: { mejor: 310,  limite: 430  }, max_pts: 8 },
  salto:    { min: 5.0 },
  barras:   { reqs: { M: 10, F: 0 }, max_pts: 0.5 },
  velocidad:{ M: { mejor: 12, limite: 15 }, F: { mejor: 14, limite: 17 }, max_pts: 0.5 },
};

function parseTime(str) {
  // Acepta "MM:SS" y retorna segundos
  if (!str) return null;
  const parts = str.toString().split(':');
  if (parts.length === 2) return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  return parseFloat(str);
}

function calcPhysical(data, genero) {
  const G = genero === 'F' ? 'F' : 'M';
  let total = 0;
  let descalificado = false;
  const result = {};

  // 1. Abdominales (reps, proporcional al minimo)
  const abdReps = parseInt(data.abd_reps) || 0;
  const abdReq  = STD.abd.reqs[G];
  const abdScore = parseFloat(Math.min(abdReps / abdReq, 1) * STD.abd.max_pts).toFixed(2);
  result.abd_reps     = abdReps;
  result.abd_score    = parseFloat(abdScore);
  result.abd_aprobado = abdReps >= abdReq;
  total += parseFloat(abdScore);

  // 2. Flexion de codo
  const flexReps = parseInt(data.flex_reps) || 0;
  const flexReq  = STD.flex.reqs[G];
  const flexScore = parseFloat(Math.min(flexReps / flexReq, 1) * STD.flex.max_pts).toFixed(2);
  result.flex_reps     = flexReps;
  result.flex_score    = parseFloat(flexScore);
  result.flex_aprobado = flexReps >= flexReq;
  total += parseFloat(flexScore);

  // 3. Trote 2 millas (regla de 3: mejor/real * max_pts)
  const troteSeg = parseTime(data.trote_tiempo_str);
  const troteStd = STD.trote[G];
  let troteScore = 0;
  let troteAprobado = false;
  if (troteSeg) {
    troteScore = parseFloat(Math.min(troteStd.mejor / troteSeg, 1) * STD.trote.max_pts).toFixed(2);
    troteAprobado = troteSeg <= troteStd.limite;
  }
  result.trote_tiempo_str = data.trote_tiempo_str || null;
  result.trote_seg        = troteSeg;
  result.trote_score      = parseFloat(troteScore);
  result.trote_aprobado   = troteAprobado;
  total += parseFloat(troteScore);

  // 4. Natacion 200m (regla de 3)
  const natSeg = parseTime(data.nat_tiempo_str);
  const natStd = STD.natacion[G];
  let natScore = 0;
  let natAprobado = false;
  if (natSeg) {
    if (natSeg <= natStd.limite) {
      natScore = parseFloat(Math.min(natStd.mejor / natSeg, 1) * STD.natacion.max_pts).toFixed(2);
      natAprobado = true;
    }
  }
  result.nat_tiempo_str = data.nat_tiempo_str || null;
  result.nat_seg        = natSeg;
  result.nat_score      = parseFloat(natScore);
  result.nat_aprobado   = natAprobado;
  total += parseFloat(natScore);

  // 5. Salto de decision (EXCLUYENTE)
  const saltoMetros = parseFloat(data.salto_metros) || 0;
  const saltoAprobado = saltoMetros >= STD.salto.min;
  if (!saltoAprobado) descalificado = true;
  result.salto_metros  = saltoMetros;
  result.salto_aprobado = saltoAprobado;

  // 6. Flexiones en barra
  const barrasReps = parseInt(data.barras_flex_reps) || 0;
  const barrasReq  = STD.barras.reqs[G];
  let barrasScore = 0;
  if (G === 'F') {
    barrasScore = STD.barras.max_pts; // Femenino: automatico
  } else {
    barrasScore = parseFloat(Math.min(barrasReps / barrasReq, 1) * STD.barras.max_pts).toFixed(2);
  }
  result.barras_flex_reps     = barrasReps;
  result.barras_flex_score    = parseFloat(barrasScore);
  result.barras_flex_aprobado = G === 'F' ? true : barrasReps >= barrasReq;
  total += parseFloat(barrasScore);

  // 7. Velocidad 100m
  const velSeg = parseFloat(data.vel_seg) || 0;
  const velStd = STD.velocidad[G];
  const velScore = (velSeg > 0 && velSeg <= velStd.limite) ? STD.velocidad.max_pts : 0;
  result.vel_seg      = velSeg;
  result.vel_score    = velScore;
  result.vel_aprobado = velSeg > 0 && velSeg <= velStd.limite;
  total += velScore;

  // Contraccion isometrica (legacy, no cuenta)
  result.cont_iso_seg      = null;
  result.cont_iso_score    = 0;
  result.cont_iso_aprobado = false;

  result.total_score_20  = parseFloat(total.toFixed(2));
  result.total_score_100 = parseFloat((total * 5).toFixed(2));
  result.es_descalificado = descalificado;

  return result;
}

// GET /api/physical-evaluations/aspirant/:id
router.get('/aspirant/:aspirantId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pe.*, u.username AS evaluador
       FROM physical_evaluations pe
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

// POST /api/physical-evaluations
router.post('/', async (req, res) => {
  const { aspirant_id, genero, notes, ...data } = req.body;
  if (!aspirant_id) return res.status(400).json({ error: 'aspirant_id requerido' });
  if (!genero || !['M','F'].includes(genero))
    return res.status(400).json({ error: 'genero debe ser M o F' });

  try {
    const calc = calcPhysical(data, genero);

    const result = await pool.query(
      `INSERT INTO physical_evaluations (
        aspirant_id, genero,
        abd_reps, abd_score, abd_aprobado,
        flex_reps, flex_score, flex_aprobado,
        trote_tiempo_str, trote_seg, trote_score, trote_aprobado,
        nat_tiempo_str, nat_seg, nat_score, nat_aprobado,
        salto_metros, salto_aprobado,
        barras_flex_reps, barras_flex_score, barras_flex_aprobado,
        cont_iso_seg, cont_iso_score, cont_iso_aprobado,
        vel_seg, vel_score, vel_aprobado,
        total_score_20, total_score_100, es_descalificado,
        notes, evaluated_by
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
        $13,$14,$15,$16,$17,$18,$19,$20,$21,
        $22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32
      ) RETURNING *`,
      [
        aspirant_id, genero,
        calc.abd_reps, calc.abd_score, calc.abd_aprobado,
        calc.flex_reps, calc.flex_score, calc.flex_aprobado,
        calc.trote_tiempo_str, calc.trote_seg, calc.trote_score, calc.trote_aprobado,
        calc.nat_tiempo_str, calc.nat_seg, calc.nat_score, calc.nat_aprobado,
        calc.salto_metros, calc.salto_aprobado,
        calc.barras_flex_reps, calc.barras_flex_score, calc.barras_flex_aprobado,
        calc.cont_iso_seg, calc.cont_iso_score, calc.cont_iso_aprobado,
        calc.vel_seg, calc.vel_score, calc.vel_aprobado,
        calc.total_score_20, calc.total_score_100, calc.es_descalificado,
        notes || null, req.user.id,
      ]
    );

    // Actualizar physical_score en aspirants
    await pool.query(
      `UPDATE aspirants SET physical_score = COALESCE(
         (SELECT MAX(total_score_20) FROM physical_evaluations WHERE aspirant_id=$1), 0)
       WHERE id=$1`,
      [aspirant_id]
    );

    res.status(201).json({ evaluation: result.rows[0], calc });
  } catch (err) {
    console.error('POST physical-evaluations:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/physical-evaluations/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT aspirant_id FROM physical_evaluations WHERE id=$1', [req.params.id]
    );
    await pool.query('DELETE FROM physical_evaluations WHERE id=$1', [req.params.id]);
    if (rows[0]) {
      await pool.query(
        `UPDATE aspirants SET physical_score = COALESCE(
           (SELECT MAX(total_score_20) FROM physical_evaluations WHERE aspirant_id=$1), 0)
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
