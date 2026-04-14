const Joi = require('joi');

// Valida req.body contra un schema Joi
function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const details = error.details.map(d => ({ field: d.path.join('.'), message: d.message }));
      return res.status(422).json({ error: 'Datos inválidos', details });
    }
    req.body = value;
    next();
  };
}

// Schemas reutilizables
const schemas = {
  register: Joi.object({
    cedula:          Joi.string().length(10).pattern(/^\d+$/).required(),
    email:           Joi.string().email().required(),
    nombre:          Joi.string().min(2).max(100).required(),
    apellido:        Joi.string().min(2).max(100).required(),
    password:        Joi.string().min(8).required(),
    telefono:        Joi.string().pattern(/^\d{10}$/).optional(),
    fecha_nacimiento: Joi.date().max('now').optional(),
    ciudad:          Joi.string().max(100).optional(),
    carrera_objetivo: Joi.string().valid('ESMIL','ESFORSE','FAE','POLICIA').required(),
  }),

  login: Joi.object({
    cedula:   Joi.string().length(10).required(),
    password: Joi.string().required(),
  }),

  pago: Joi.object({
    aspirante_id:     Joi.number().integer().required(),
    plan_id:          Joi.number().integer().required(),
    monto:            Joi.number().positive().precision(2).required(),
    metodo_pago:      Joi.string().valid('EFECTIVO','TRANSFERENCIA','PAYPHONE','STRIPE','CHEQUE').required(),
    referencia:       Joi.string().max(100).optional(),
    periodo:          Joi.string().pattern(/^\d{4}-(0[1-9]|1[0-2])$/).required(), // YYYY-MM
    cedula_ruc:       Joi.string().min(10).max(13).required(),
    nombre_receptor:  Joi.string().min(3).max(200).required(),
    observaciones:    Joi.string().max(500).optional(),
  }),

  evaluacionFisica: Joi.object({
    aspirante_id:  Joi.number().integer().required(),
    fecha:         Joi.date().max('now').required(),
    flexiones:     Joi.number().integer().min(0).max(200).optional(),
    abdominales:   Joi.number().integer().min(0).max(300).optional(),
    sentadillas:   Joi.number().integer().min(0).max(300).optional(),
    carrera_1000m: Joi.number().positive().optional(), // segundos
    carrera_2000m: Joi.number().positive().optional(),
    natacion_50m:  Joi.number().positive().optional(),
    pull_ups:      Joi.number().integer().min(0).max(100).optional(),
    observaciones: Joi.string().max(1000).optional(),
  }),

  evaluacionPsico: Joi.object({
    aspirante_id:  Joi.number().integer().required(),
    fecha:         Joi.date().max('now').required(),
    test_aplicado: Joi.string().valid('16PF','MMPI','HTP','BENDER','OTRO').required(),
    liderazgo:     Joi.number().integer().min(1).max(10).required(),
    estabilidad_em: Joi.number().integer().min(1).max(10).required(),
    disciplina:    Joi.number().integer().min(1).max(10).required(),
    trabajo_equipo: Joi.number().integer().min(1).max(10).required(),
    apto:          Joi.boolean().required(),
    observaciones: Joi.string().max(2000).optional(),
  }),

  gasto: Joi.object({
    categoria:   Joi.string().valid('SUELDOS','INFRAESTRUCTURA','MARKETING','SERVICIOS','OTROS').required(),
    descripcion: Joi.string().min(5).max(255).required(),
    monto:       Joi.number().positive().precision(2).required(),
    fecha:       Joi.date().required(),
    proveedor:   Joi.string().max(100).optional(),
    comprobante: Joi.string().max(100).optional(),
  }),
};

module.exports = { validateBody, schemas };
