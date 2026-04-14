const cron = require('node-cron');
const { pool } = require('../config/database');
const { getGrades } = require('../services/moodleService');
const { actualizarScoreGlobal } = require('../utils/actualizarScores');
const logger = require('../config/logger');

/**
 * Sincroniza notas de Moodle → PostgreSQL cada hora
 * Ejecuta también la actualización del score global por aspirante
 */
cron.schedule('0 * * * *', async () => {
  logger.info('[CRON] Iniciando sync de notas Moodle...');

  const { rows: aspirantes } = await pool.query(`
    SELECT a.id, a.moodle_user_id, a.cohorte_id,
           ARRAY_AGG(DISTINCT cc.moodle_course_id) AS course_ids
    FROM aspirantes a
    JOIN cohorte_cursos cc ON cc.cohorte_id = a.cohorte_id
    WHERE a.activo = true AND a.moodle_user_id IS NOT NULL
    GROUP BY a.id
  `);

  let sincronizados = 0;
  let errores = 0;

  for (const asp of aspirantes) {
    for (const courseId of (asp.course_ids || [])) {
      if (!courseId) continue;
      try {
        const grades = await getGrades(asp.moodle_user_id, courseId);
        const notaRaw = grades?.items?.[0]?.grades?.[0]?.percentageformatted;
        const nota = notaRaw ? parseFloat(notaRaw) : null;
        const courseName = grades?.items?.[0]?.itemname || `Course ${courseId}`;

        await pool.query(`
          INSERT INTO academic_scores (aspirante_id, course_id, course_name, nota, synced_at)
          VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT (aspirante_id, course_id)
          DO UPDATE SET nota = $4, course_name = $3, synced_at = NOW()
        `, [asp.id, courseId, courseName, nota]);

        sincronizados++;
      } catch (e) {
        errores++;
        await pool.query(
          'INSERT INTO sync_errors (aspirante_id, course_id, error, created_at) VALUES ($1,$2,$3,NOW())',
          [asp.id, courseId, e.message]
        ).catch(() => {});
      }
    }

    // Actualizar score global del aspirante después de sync
    try {
      await actualizarScoreGlobal(asp.id);
    } catch (e) {
      logger.warn(`[CRON] Score global falló para aspirante ${asp.id}: ${e.message}`);
    }
  }

  logger.info(`[CRON] Sync completo — sincronizados: ${sincronizados}, errores: ${errores}`);
}, {
  scheduled: true,
  timezone: 'America/Guayaquil',
});
