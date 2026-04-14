const { pool } = require('../config/database');

/**
 * Recalcula y actualiza el score_global del aspirante
 * basado en los últimos valores de cada componente
 */
async function actualizarScoreGlobal(aspiranteId) {
  // Score físico: promedio de últimas 3 pruebas
  const { rows: [fisico] } = await pool.query(`
    SELECT AVG(score_fisico)::NUMERIC(5,2) AS score
    FROM (
      SELECT score_fisico FROM pruebas_fisicas
      WHERE aspirante_id = $1 ORDER BY fecha DESC LIMIT 3
    ) sub
  `, [aspiranteId]);

  // Score psicológico: última evaluación
  const { rows: [psico] } = await pool.query(`
    SELECT score_psico AS score FROM evaluaciones_psicologicas
    WHERE aspirante_id = $1 ORDER BY fecha DESC LIMIT 1
  `, [aspiranteId]);

  // Score médico: última evaluación
  const { rows: [medico] } = await pool.query(`
    SELECT score_medico AS score FROM evaluaciones_medicas
    WHERE aspirante_id = $1 ORDER BY fecha DESC LIMIT 1
  `, [aspiranteId]);

  // Score académico: promedio de academic_scores
  const { rows: [academico] } = await pool.query(`
    SELECT AVG(nota)::NUMERIC(5,2) AS score FROM academic_scores
    WHERE aspirante_id = $1
  `, [aspiranteId]);

  await pool.query(`
    INSERT INTO scores_globales
      (aspirante_id, score_fisico, score_psicologico, score_medico, score_academico, updated_at)
    VALUES ($1,$2,$3,$4,$5,NOW())
    ON CONFLICT (aspirante_id) DO UPDATE SET
      score_fisico       = EXCLUDED.score_fisico,
      score_psicologico  = EXCLUDED.score_psicologico,
      score_medico       = EXCLUDED.score_medico,
      score_academico    = EXCLUDED.score_academico,
      updated_at         = NOW()
  `, [
    aspiranteId,
    fisico?.score    ?? 0,
    psico?.score     ?? 0,
    medico?.score    ?? 0,
    academico?.score ?? 0,
  ]);
}

module.exports = { actualizarScoreGlobal };
