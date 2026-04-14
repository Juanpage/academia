// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'academia_secret_2024';

// ── Jerarquía de roles ────────────────────────────────────────
const ROLE_HIERARCHY = {
  super_admin:  6,
  admin:        5,
  instructor:   4,
  evaluador:    3,
  psicologo:    2,
  medico:       1,
};

// Permisos por rol
const ROLE_PERMISSIONS = {
  super_admin:  ['*'],  // todo
  admin:        ['aspirants.*','evaluations.*','users.*','dashboard.*','reports.*'],
  instructor:   ['aspirants.read','evaluations.physical','evaluations.academic','dashboard.read'],
  evaluador:    ['aspirants.read','evaluations.physical','evaluations.academic'],
  psicologo:    ['aspirants.read','evaluations.psychological'],
  medico:       ['aspirants.read','evaluations.medical'],
};

// ── Middleware principal de autenticación ─────────────────────
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verificar que el usuario sigue activo en la BD
    const result = await query(
      `SELECT id, username, email, role, first_name, last_name, is_active
       FROM users WHERE id = $1`,
      [decoded.sub || decoded.id || decoded.userId]
    );

    if (!result.rows.length || !result.rows[0].is_active) {
      return res.status(401).json({ error: 'Usuario inactivo o no encontrado' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// ── Middleware de autorización por rol ───────────────────────
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const userRole = req.user.role;

    // super_admin siempre pasa
    if (userRole === 'super_admin') return next();

    // Verificar si el rol está en los permitidos
    if (allowedRoles.includes(userRole)) return next();

    return res.status(403).json({
      error: 'Acceso denegado',
      required_roles: allowedRoles,
      your_role: userRole,
    });
  };
}

// ── Verificar permiso específico ──────────────────────────────
function hasPermission(userRole, permission) {
  const perms = ROLE_PERMISSIONS[userRole] || [];
  if (perms.includes('*')) return true;
  if (perms.includes(permission)) return true;

  // Verificar wildcard de módulo (ej: 'evaluations.*')
  const [module] = permission.split('.');
  return perms.includes(`${module}.*`);
}

// ── Middleware: solo admins pueden gestionar usuarios ─────────
const adminOnly = authorize('super_admin', 'admin');

// ── Middleware: puede ingresar evaluaciones físicas ───────────
const canEvalPhysical = authorize('super_admin','admin','instructor','evaluador');

// ── Middleware: puede ingresar evaluaciones académicas ────────
const canEvalAcademic = authorize('super_admin','admin','instructor','evaluador');

// ── Middleware: puede ingresar evaluaciones psicológicas ──────
const canEvalPsych = authorize('super_admin','admin','psicologo');

// ── Middleware: puede ingresar evaluaciones médicas ───────────
const canEvalMedical = authorize('super_admin','admin','medico');

module.exports = {
  authenticate,
  authorize,
  hasPermission,
  adminOnly,
  canEvalPhysical,
  canEvalAcademic,
  canEvalPsych,
  canEvalMedical,
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS,
};

