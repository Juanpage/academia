const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { query } = require('../config/database');

router.get('/', authenticate, async (req, res) => {
  try {
    const [totals, byStatus, topAsp, paymentStats] = await Promise.all([

      // Totales generales — scores leídos de global_scores (tabla canónica)
      query(`
        SELECT
          COUNT(*)                                      AS total_aspirants,
          COUNT(*) FILTER (WHERE a.status = 'active')  AS active,
          COUNT(*) FILTER (WHERE a.status = 'graduated') AS graduated,
          COUNT(*) FILTER (WHERE a.status = 'expelled') AS expelled,
          ROUND(AVG(
            COALESCE(gs.physical_score,  0) * 0.35 +
            COALESCE(gs.academic_score,  0) * 0.40 +
            COALESCE(gs.psych_score,     0) * 0.15 +
            COALESCE(gs.medical_score,   0) * 0.10
          ), 2) AS avg_score
        FROM aspirants a
        LEFT JOIN global_scores gs ON gs.aspirant_id = a.id
      `),

      // Distribución por estado
      query(`
        SELECT status, COUNT(*) AS count
        FROM aspirants
        GROUP BY status
        ORDER BY count DESC
      `),

      // Top 10 aspirantes — scores de global_scores
      query(`
        SELECT
          a.id,
          a.cedula,
          a.first_name || ' ' || a.last_name          AS full_name,
          COALESCE(gs.academic_score,  0)              AS academic_score,
          COALESCE(gs.physical_score,  0)              AS physical_score,
          COALESCE(gs.psych_score,     0)              AS psych_score,
          COALESCE(gs.medical_score,   0)              AS medical_score,
          COALESCE(gs.total_score,
            ROUND(
              COALESCE(gs.physical_score,  0) * 0.35 +
              COALESCE(gs.academic_score,  0) * 0.40 +
              COALESCE(gs.psych_score,     0) * 0.15 +
              COALESCE(gs.medical_score,   0) * 0.10
            , 2)
          )                                            AS total_score
        FROM aspirants a
        LEFT JOIN global_scores gs ON gs.aspirant_id = a.id
        ORDER BY total_score DESC NULLS LAST
        LIMIT 10
      `),

      // Estadísticas de pagos
      query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'pending') AS pending,
          COUNT(*) FILTER (WHERE status = 'overdue') AS overdue,
          COUNT(*) FILTER (WHERE status = 'paid')    AS paid,
          COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) AS total_collected
        FROM payments
      `),
    ]);

    res.json({
      totals:          totals.rows[0],
      by_status:       byStatus.rows,
      top_aspirants:   topAsp.rows,
      recent_payments: [],
      payment_stats:   paymentStats.rows[0],
    });
  } catch (err) {
    console.error('Dashboard error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
