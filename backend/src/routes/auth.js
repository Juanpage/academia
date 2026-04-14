const router = require('express').Router();
const { login, logout } = require('../services/authService');
const { authenticate } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username y password requeridos' });
    }
    const result = await login(username, password);
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res) => {
  await logout(req.token);
  res.json({ message: 'Sesión cerrada' });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});


// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password)
    return res.status(400).json({ error: 'Campos requeridos' });
  if (new_password.length < 8)
    return res.status(400).json({ error: 'La contrasena debe tener al menos 8 caracteres' });
  try {
    const { query } = require('../config/database');
    const bcrypt = require('bcrypt');
    const { rows } = await query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
    const valid = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!valid) return res.status(400).json({ error: 'Contrasena actual incorrecta' });
    const hash = await bcrypt.hash(new_password, 12);
    await query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, req.user.id]);
    res.json({ message: 'Contrasena actualizada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requerido' });
  try {
    const { query } = require('../config/database');
    const crypto = require('crypto');
    const { sendPasswordReset } = require('../services/emailService');
    const { rows } = await query('SELECT * FROM users WHERE email=$1 AND is_active=true', [email]);
    if (!rows[0]) return res.json({ message: 'Si el email existe, recibira un correo' });
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hora
    await query('UPDATE users SET reset_token=$1, reset_token_expires=$2 WHERE id=$3',
      [token, expires, rows[0].id]);
    await sendPasswordReset({
      nombre: rows[0].first_name + ' ' + rows[0].last_name,
      email: rows[0].email,
      resetToken: token,
      sistemaUrl: process.env.SISTEMA_URL || 'http://localhost:3001',
    });
    res.json({ message: 'Si el email existe, recibira un correo con instrucciones' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, new_password } = req.body;
  if (!token || !new_password)
    return res.status(400).json({ error: 'Campos requeridos' });
  if (new_password.length < 8)
    return res.status(400).json({ error: 'La contrasena debe tener al menos 8 caracteres' });
  try {
    const { query } = require('../config/database');
    const bcrypt = require('bcrypt');
    const { rows } = await query(
      'SELECT * FROM users WHERE reset_token=$1 AND reset_token_expires > NOW()',
      [token]
    );
    if (!rows[0]) return res.status(400).json({ error: 'Token invalido o expirado' });
    const hash = await bcrypt.hash(new_password, 12);
    await query(
      'UPDATE users SET password_hash=$1, reset_token=NULL, reset_token_expires=NULL WHERE id=$2',
      [hash, rows[0].id]
    );
    res.json({ message: 'Contrasena restablecida correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
