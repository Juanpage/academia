const logger = require('../config/logger');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    user: req.user?.id,
  });

  // Errores de validación Joi
  if (err.isJoi) {
    return res.status(400).json({
      error: 'Datos inválidos',
      detalles: err.details.map(d => d.message),
    });
  }

  // Errores de PostgreSQL
  if (err.code === '23505') {
    const field = err.detail?.match(/\((.+?)\)/)?.[1] || 'campo';
    return res.status(409).json({ error: `El ${field} ya está registrado` });
  }

  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referencia inválida (registro no encontrado)' });
  }

  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : 'Error interno del servidor';

  res.status(status).json({ error: message });
};

module.exports = errorHandler;
