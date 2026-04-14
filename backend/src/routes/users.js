// src/routes/users.js
const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const { query } = require('../config/database');
const { authenticate, adminOnly } = require('../middleware/auth');

router.use(authenticate);

// ── GET /api/users — listar usuarios ─────────────────────────
router.get('/', adminOnly, async (req, res) => {
  try {
    const result = await query(`
      SELECT u.id, u.username, u.email, u.first_name, u.last_name,
             u.role, u.is_active, u.cedula, u.phone, u.especialidad,
             u.last_login, u.created_at,
             ARRAY[]::TEXT[] AS assigned_eval_types
      FROM users u
      ORDER BY u.created_at DESC
    `);
    res.json({ users: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/users/me/profile — perfil propio (DEBE ir antes de /:id) ────────
router.get('/me/profile', async (req, res) => {
  try {
    const result = await query(`
      SELECT u.id, u.username, u.email, u.first_name, u.last_name,
             u.role, u.cedula, u.phone, u.especialidad, u.last_login,
             ARRAY[]::TEXT[] AS assigned_eval_types
      FROM users u
      WHERE u.id = $1
    `, [req.user.id]);
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/users/:id ────────────────────────────────────────
router.get('/:id', adminOnly, async (req, res) => {
  try {
    const result = await query(`
      SELECT u.id, u.username, u.email, u.first_name, u.last_name,
             u.role, u.is_active, u.cedula, u.phone, u.especialidad,
             u.last_login, u.created_at,
             ARRAY[]::TEXT[] AS assigned_eval_types
      FROM users u
      WHERE u.id = $1
    `, [req.params.id]);

    if (!result.rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/users — crear usuario ──────────────────────────
router.post('/', adminOnly, async (req, res) => {
  const {
    username, email, password, role,
    first_name, last_name, cedula, phone, especialidad,
    eval_types = [],
  } = req.body;

  if (!username || !email || !password || !role) {
    return res.status(400).json({ error: 'username, email, password y role son requeridos' });
  }

  const validRoles = ['super_admin','admin','instructor','evaluador','psicologo','medico'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: `Rol inválido. Válidos: ${validRoles.join(', ')}` });
  }

  // Solo super_admin puede crear super_admin
  if (role === 'super_admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Solo super_admin puede crear otro super_admin' });
  }

  try {
    const hash = await bcrypt.hash(password, 12);

    const result = await query(`
      INSERT INTO users (username, email, password_hash, role, first_name, last_name, cedula, phone, especialidad)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING id, username, email, role, first_name, last_name, is_active, created_at
    `, [username, email, hash, role, first_name||null, last_name||null, cedula||null, phone||null, especialidad||null]);

    const newUser = result.rows[0];

    // Asignar tipos de evaluación si se especificaron
    // NOTA: instructor_assignments no existe aún en BD — se crea cuando se implemente el módulo de instructores
    if (eval_types.length > 0) {
      const validTypes = ['physical','academic','psychological','medical'];
      for (const et of eval_types) {
        if (validTypes.includes(et)) {
          await query(
            `INSERT INTO instructor_assignments (user_id, eval_type) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
            [newUser.id, et]
          ).catch(e => console.warn('[instructor_assignments] tabla no disponible:', e.message));
        }
      }
    }

    res.status(201).json({ user: newUser, message: 'Usuario creado exitosamente' });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username o email ya existe' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/users/:id — actualizar usuario ───────────────────
router.put('/:id', adminOnly, async (req, res) => {
  const {
    email, role, first_name, last_name,
    cedula, phone, especialidad, is_active,
    eval_types,
  } = req.body;

  // No puede cambiar su propio rol
  if (req.params.id === req.user.id && role && role !== req.user.role) {
    return res.status(403).json({ error: 'No puedes cambiar tu propio rol' });
  }

  try {
    const fields = [];
    const vals   = [];
    let idx = 1;

    if (email       !== undefined) { fields.push(`email=$${idx++}`);        vals.push(email); }
    if (role        !== undefined) { fields.push(`role=$${idx++}`);         vals.push(role); }
    if (first_name  !== undefined) { fields.push(`first_name=$${idx++}`);   vals.push(first_name); }
    if (last_name   !== undefined) { fields.push(`last_name=$${idx++}`);    vals.push(last_name); }
    if (cedula      !== undefined) { fields.push(`cedula=$${idx++}`);       vals.push(cedula); }
    if (phone       !== undefined) { fields.push(`phone=$${idx++}`);        vals.push(phone); }
    if (especialidad!== undefined) { fields.push(`especialidad=$${idx++}`); vals.push(especialidad); }
    if (is_active   !== undefined) { fields.push(`is_active=$${idx++}`);    vals.push(is_active); }

    if (fields.length > 0) {
      fields.push(`updated_at=NOW()`);
      vals.push(req.params.id);
      await query(
        `UPDATE users SET ${fields.join(',')} WHERE id=$${idx}`,
        vals
      );
    }

    // Actualizar asignaciones de evaluación
    // NOTA: instructor_assignments no existe aún — operaciones son no-op hasta crear la tabla
    if (eval_types !== undefined) {
      await query('DELETE FROM instructor_assignments WHERE user_id=$1', [req.params.id])
        .catch(e => console.warn('[instructor_assignments] tabla no disponible:', e.message));
      const validTypes = ['physical','academic','psychological','medical'];
      for (const et of eval_types) {
        if (validTypes.includes(et)) {
          await query(
            `INSERT INTO instructor_assignments (user_id, eval_type) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
            [req.params.id, et]
          ).catch(e => console.warn('[instructor_assignments] tabla no disponible:', e.message));
        }
      }
    }

    // Devolver usuario actualizado
    const updated = await query(`
      SELECT u.id, u.username, u.email, u.first_name, u.last_name,
             u.role, u.is_active, u.cedula, u.phone, u.especialidad,
             ARRAY[]::TEXT[] AS assigned_eval_types
      FROM users u
      WHERE u.id = $1
    `, [req.params.id]);

    res.json({ user: updated.rows[0], message: 'Usuario actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/users/:id/password — cambiar contraseña ───────
router.patch('/:id/password', adminOnly, async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }
  try {
    const hash = await bcrypt.hash(password, 12);
    await query('UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2', [hash, req.params.id]);
    res.json({ message: 'Contraseña actualizada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/users/:id — desactivar usuario ────────────────
router.delete('/:id', adminOnly, async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(403).json({ error: 'No puedes desactivarte a ti mismo' });
  }
  try {
    await query('UPDATE users SET is_active=false, updated_at=NOW() WHERE id=$1', [req.params.id]);
    res.json({ message: 'Usuario desactivado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
