const cron   = require('node-cron');
const { syncGrades } = require('../services/moodleService');
const { query }      = require('../config/database');

// ─── Sincronización de notas Moodle → PostgreSQL (cada hora) ───────────────
const startGradeSync = () => {
  cron.schedule('0 * * * *', async () => {
    console.log('[Cron] Iniciando sincronización de notas Moodle...');
    try {
      const result = await syncGrades();
      console.log(`[Cron] Sync completado: ${result.synced} notas, ${result.errors} errores`);
    } catch (err) {
      console.error('[Cron] Error en sync de notas:', err.message);
    }
  });
};

// ─── Alertas de pagos vencidos (8AM diario) ────────────────────────────────
const startPaymentCheck = () => {
  cron.schedule('0 8 * * *', async () => {
    console.log('[Cron] Verificando pagos vencidos...');
    try {
      // Marcar como overdue los pagos que ya vencieron
      const res = await query(`
        UPDATE payments
        SET status = 'overdue', updated_at = NOW()
        WHERE status = 'pending'
          AND due_date < CURRENT_DATE
        RETURNING id, aspirant_id, amount, due_date
      `);
      console.log(`[Cron] ${res.rowCount} pagos marcados como vencidos`);

      // Detectar aspirantes en riesgo de deserción (2+ pagos vencidos)
      const riesgo = await query(`
        SELECT
          a.cedula,
          a.first_name || ' ' || a.last_name AS nombre,
          COUNT(*) AS pagos_vencidos,
          SUM(p.amount) AS monto_total
        FROM aspirants a
        JOIN payments p ON p.aspirant_id = a.id
        WHERE p.status = 'overdue'
        GROUP BY a.id, a.cedula, a.first_name, a.last_name
        HAVING COUNT(*) >= 2
        ORDER BY pagos_vencidos DESC
      `);

      if (riesgo.rows.length > 0) {
        console.warn(`[Cron] ⚠️  ${riesgo.rows.length} aspirantes en riesgo de deserción:`);
        riesgo.rows.forEach((r) =>
          console.warn(`  - ${r.nombre} (${r.cedula}): ${r.pagos_vencidos} pagos, $${r.monto_total}`)
        );
      }
    } catch (err) {
      console.error('[Cron] Error en verificación de pagos:', err.message);
    }
  });
};

// ─── Recalcular puntajes globales (6:30AM diario) ─────────────────────────
const startScoreRecalc = () => {
  cron.schedule('30 6 * * *', async () => {
    console.log('[Cron] Recalculando puntajes globales...');
    try {
      // Actualizar academic_score promediando notas de Moodle
      await query(`
        UPDATE global_scores gs
        SET
          academic_score = COALESCE((
            SELECT ROUND(AVG(ar.grade), 2)
            FROM academic_records ar
            WHERE ar.aspirant_id = gs.aspirant_id
          ), 0),
          updated_at = NOW()
      `);

      // Actualizar physical_score
      await query(`
        UPDATE global_scores gs
        SET
          physical_score = COALESCE((
            SELECT ROUND(AVG(pr.score), 2)
            FROM physical_records pr
            WHERE pr.aspirant_id = gs.aspirant_id
          ), 0),
          updated_at = NOW()
      `);

      // Actualizar psych_score
      await query(`
        UPDATE global_scores gs
        SET
          psych_score = COALESCE((
            SELECT ROUND(AVG(psr.score), 2)
            FROM psychological_records psr
            WHERE psr.aspirant_id = gs.aspirant_id
          ), 0),
          updated_at = NOW()
      `);

      // Actualizar medical_score
      await query(`
        UPDATE global_scores gs
        SET
          medical_score = COALESCE((
            SELECT CASE mr.result
              WHEN 'APTO'        THEN 100
              WHEN 'OBSERVADO'   THEN 60
              WHEN 'NO_APTO'     THEN 0
              ELSE 0
            END
            FROM medical_records mr
            WHERE mr.aspirant_id = gs.aspirant_id
            ORDER BY mr.evaluated_at DESC
            LIMIT 1
          ), 0),
          updated_at = NOW()
      `);

      // Actualizar ranking
      await query(`
        WITH ranked AS (
          SELECT id, ROW_NUMBER() OVER (ORDER BY total_score DESC NULLS LAST) AS rn
          FROM global_scores
        )
        UPDATE global_scores gs
        SET rank_position = ranked.rn
        FROM ranked
        WHERE gs.id = ranked.id
      `);

      console.log('[Cron] Puntajes recalculados y ranking actualizado.');
    } catch (err) {
      console.error('[Cron] Error recalculando puntajes:', err.message);
    }
  });
};

const startAll = () => {
  startGradeSync();
  startPaymentCheck();
  startScoreRecalc();
  console.log('[Cron] Todas las tareas programadas iniciadas.');
};

module.exports = { startAll };
