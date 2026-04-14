const router    = require('express').Router();
const { body, validationResult } = require('express-validator');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const { pool }  = require('../config/database');
const { blacklistToken } = require('../config/redis');
const { authenticate }    = require('../middleware/auth');
const { createMoodleUser, suspendMoodleUser } = require('../services/moodleService');
const { validarCedula }  = require('../utils/cedula');
const { enviarBienvenida } = require('../services/emailService');
const logger    = require('../config/logger');

// POST /api/auth/register
router.post('/register', [
  body('cedula').isLength({ min: 10, max: 10 }).withMessage('Cédula debe tener 10 dígitos'),
  body('email').isEmail().normalizeEmail(),
  body('nombre').trim().isLength({ min: 2 }),
  body('apellido').trim().isLength({ min: 2 }),
  body('password').isLength({ min: 8 }).withMessage('Contraseña mínimo 8 caracteres'),
  body('carrera_objetivo').isIn(['ESMIL', 'ESFORSE', 'FAE', 'POLICIA']),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { cedula, email, nombre, apellido, password,
            telefono, fecha_nacimiento, ciudad,
            carrera_objetivo, cohorte_id } = req.body;

    if (!validarCedula(cedula)) {
      return res.status(400).json({ error: 'Cédula ecuatoriana inválida' });
    }

    const client = await pool.connect();
    let moodleUserId = null;

    try {
      await client.query('BEGIN');
      const passwordHash = await bcrypt.hash(password, 12);

      const { rows } = await client.query(`
        INSERT INTO aspirantes
          (cedula, email, nombre, apellido, telefono, fecha_nacimiento,
           ciudad, carrera_objetivo, cohorte_id, password_hash, rol)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'ASPIRANTE')
        RETURNING id, cedula, email, nombre, apellido
      `, [cedula, email, nombre, apellido,
          telefono || null, fecha_nacimiento || null,
          ciudad || null, carrera_objetivo,
          cohorte_id || null, passwordHash]);

      const aspirante = rows[0];

      // Moodle es opcional - no bloquea el registro si no está disponible
      try {
        moodleUserId = await createMoodleUser({ cedula, email, nombre, apellido, password });
        await client.query(
          'UPDATE aspirantes SET moodle_user_id = $1 WHERE id = $2',
          [moodleUserId, aspirante.id]
        );
      } catch (moodleErr) {
        logger.warn('[MOODLE] Usuario no creado en Moodle: ' + moodleErr.message);
      }

      await client.query('INSERT INTO scores_globales (aspirante_id) VALUES ($1)', [aspirante.id]);
      await client.query('COMMIT');

      enviarBienvenida({ email, nombre, cedula, password }).catch(e =>
        logger.warn('[EMAIL] ' + e.message)
      );

      const token = jwt.sign(
        { id: aspirante.id, aspiranteId: aspirante.id, rol: 'ASPIRANTE', email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
      );

      res.status(201).json({
        message: 'Registro exitoso',
        token,
        aspirante: { id: aspirante.id, nombre, apellido, email, cedula, carrera_objetivo },
      });

    } catch (err) {
      await client.query('ROLLBACK');
      if (moodleUserId) suspendMoodleUser(moodleUserId).catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  } catch (err) { next(err); }
});

// POST /api/auth/login
router.post('/login', [
  body('cedula').notEmpty(),
  body('password').notEmpty(),
], async (req, res, next) => {
  try {
    const { cedula, password } = req.body;
    let user = null;
    let tabla = null;

    // Buscar en aspirantes primero
    const aspRes = await pool.query(
      `SELECT id, cedula, email, nombre, apellido, rol,
              password_hash, moodle_user_id, activo, id AS aspirante_id
       FROM aspirantes WHERE cedula = $1`, [cedula]
    );
    if (aspRes.rows[0]) { user = aspRes.rows[0]; tabla = 'aspirantes'; }
    else {
      const usrRes = await pool.query(
        `SELECT id, cedula, email, nombre, apellido, rol,
                password_hash, moodle_user_id, activo, NULL AS aspirante_id
         FROM usuarios WHERE cedula = $1`, [cedula]
      );
      if (usrRes.rows[0]) { user = usrRes.rows[0]; tabla = 'usuarios'; }
    }

    if (!user || !user.activo) return res.status(401).json({ error: 'Credenciales inválidas' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });

    const payload = { id: user.id, cedula: user.cedula, email: user.email, rol: user.rol, nombre: user.nombre };
    if (user.rol === 'ASPIRANTE') payload.aspiranteId = user.id;

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    });

    pool.query(`UPDATE ${tabla} SET ultimo_acceso = NOW() WHERE id = $1`, [user.id]).catch(() => {});

    res.json({
      token,
      user: {
        id: user.id, nombre: user.nombre, apellido: user.apellido,
        email: user.email, rol: user.rol,
        aspiranteId: user.rol === 'ASPIRANTE' ? user.id : undefined,
        moodle_user_id: user.moodle_user_id,
      },
    });
  } catch (err) { next(err); }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) await blacklistToken(token).catch(() => {});
  res.json({ message: 'Sesión cerrada' });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    if (req.user.rol === 'ASPIRANTE') {
      const { rows } = await pool.query(
        'SELECT id, cedula, email, nombre, apellido, rol, moodle_user_id, carrera_objetivo FROM aspirantes WHERE id = $1',
        [req.user.id]
      );
      if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });
      return res.json(rows[0]);
    }
    const { rows } = await pool.query(
      'SELECT id, cedula, email, nombre, apellido, rol, moodle_user_id FROM usuarios WHERE id = $1',
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;

