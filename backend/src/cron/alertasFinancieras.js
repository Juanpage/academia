const cron = require('node-cron');
const { pool } = require('../config/database');
const { enviarAlertaPago } = require('../services/emailService');
const logger = require('../config/logger');

/**
 * Diariamente a las 8:00 AM (hora Ecuador):
 * 1. Marca pagos PENDIENTE como VENCIDO si pasaron la fecha
 * 2. Envía alertas por email a aspirantes con mora
 * 3. Detecta riesgo de deserción (mora > 30 días)
 */
cron.schedule('0 8 * * *', async () => {
  logger.info('[CRON] Procesando alertas financieras...');

  // 1. Marcar vencidos
  const { rowCount: marcados } = await pool.query(`
    UPDATE pagos
    SET estado = 'VENCIDO'
    WHERE estado = 'PENDIENTE'
    AND fecha_vencimiento < CURRENT_DATE
  `);
  logger.info(`[CRON] ${marcados} pagos marcados como VENCIDO`);

  // 2. Obtener aspirantes con pagos vencidos para alertar
  const { rows: conMora } = await pool.query(`
    SELECT
      a.id, a.nombre, a.apellido, a.email,
      p.monto, p.periodo, p.fecha_vencimiento,
      CURRENT_DATE - p.fecha_vencimiento AS dias_vencido
    FROM pagos p
    JOIN aspirantes a ON p.aspirante_id = a.id
    WHERE p.estado = 'VENCIDO'
    AND p.fecha_vencimiento >= CURRENT_DATE - INTERVAL '7 days'
    AND a.activo = true
  `);

  for (const asp of conMora) {
    try {
      await enviarAlertaPago({
        email: asp.email,
        nombre: `${asp.nombre} ${asp.apellido}`,
        monto: asp.monto,
        periodo: asp.periodo,
        diasVencido: asp.dias_vencido,
      });
    } catch (e) {
      logger.warn(`[CRON] Email alerta pago falló para ${asp.email}: ${e.message}`);
    }
  }

  // 3. Identificar riesgo de deserción (2+ pagos vencidos, mora > 30 días)
  const { rows: enRiesgo } = await pool.query(`
    SELECT
      a.id, a.nombre, a.apellido, a.email, a.telefono,
      COUNT(p.id) AS pagos_vencidos,
      SUM(p.monto)::NUMERIC(10,2) AS deuda_total,
      MAX(CURRENT_DATE - p.fecha_vencimiento) AS max_dias_mora
    FROM pagos p
    JOIN aspirantes a ON p.aspirante_id = a.id
    WHERE p.estado = 'VENCIDO'
    AND p.fecha_vencimiento < CURRENT_DATE - INTERVAL '30 days'
    AND a.activo = true
    GROUP BY a.id, a.nombre, a.apellido, a.email, a.telefono
    HAVING COUNT(p.id) >= 2
  `);

  if (enRiesgo.length > 0) {
    // Guardar en tabla de alertas para que el admin las vea en dashboard
    for (const asp of enRiesgo) {
      await pool.query(`
        INSERT INTO alertas_desercion
          (aspirante_id, pagos_vencidos, deuda_total, max_dias_mora, fecha_alerta)
        VALUES ($1,$2,$3,$4,NOW())
        ON CONFLICT (aspirante_id) DO UPDATE SET
          pagos_vencidos = EXCLUDED.pagos_vencidos,
          deuda_total    = EXCLUDED.deuda_total,
          max_dias_mora  = EXCLUDED.max_dias_mora,
          fecha_alerta   = NOW()
      `, [asp.id, asp.pagos_vencidos, asp.deuda_total, asp.max_dias_mora])
        .catch(() => {});
    }
    logger.warn(`[CRON] ${enRiesgo.length} aspirantes en riesgo de deserción por mora`);
  }

  logger.info(`[CRON] Alertas enviadas: ${conMora.length} | En riesgo: ${enRiesgo.length}`);
}, {
  scheduled: true,
  timezone: 'America/Guayaquil',
});
