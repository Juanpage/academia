// Roles disponibles:
// ASPIRANTE | INSTRUCTOR_FISICO | PSICOLOGO | MEDICO
// ADMIN_FINANCIERO | ADMIN_ACADEMICO | SUPER_ADMIN

const ROLES = {
  ASPIRANTE: 'ASPIRANTE',
  INSTRUCTOR_FISICO: 'INSTRUCTOR_FISICO',
  PSICOLOGO: 'PSICOLOGO',
  MEDICO: 'MEDICO',
  ADMIN_FINANCIERO: 'ADMIN_FINANCIERO',
  ADMIN_ACADEMICO: 'ADMIN_ACADEMICO',
  SUPER_ADMIN: 'SUPER_ADMIN',
};

// Jerarquía: SUPER_ADMIN siempre tiene acceso
const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  if (req.user.rol === ROLES.SUPER_ADMIN || allowedRoles.includes(req.user.rol)) {
    return next();
  }
  return res.status(403).json({ error: 'Sin permisos para esta acción' });
};

// Permite acceso si es el propio aspirante o admin
const requireSelfOrAdmin = (req, res, next) => {
  const { rol, aspiranteId } = req.user;
  const targetId = parseInt(req.params.id || req.params.aspiranteId);
  const isAdmin = [ROLES.SUPER_ADMIN, ROLES.ADMIN_ACADEMICO, ROLES.ADMIN_FINANCIERO].includes(rol);
  const isSelf = rol === ROLES.ASPIRANTE && aspiranteId === targetId;

  if (isAdmin || isSelf) return next();
  return res.status(403).json({ error: 'Sin permisos' });
};

module.exports = { requireRole, requireSelfOrAdmin, ROLES };
