const bcrypt      = require('bcrypt');
const jwt         = require('jsonwebtoken');
const { query }   = require('../config/database');
const { blacklistToken } = require('../config/redis');

const JWT_SECRET          = process.env.JWT_SECRET          || 'fallback_secret';
const JWT_EXPIRES_IN      = process.env.JWT_EXPIRES_IN      || '8h';
const JWT_REFRESH_SECRET  = process.env.JWT_REFRESH_SECRET  || 'fallback_refresh';
const JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

const generateTokens = (payload) => ({
  accessToken: jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN }),
  refreshToken: jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES }),
});

const login = async (username, password) => {
  const res = await query(
    'SELECT * FROM users WHERE username=$1 AND is_active=true',
    [username]
  );
  const user = res.rows[0];
  if (!user) throw new Error('Credenciales inválidas');

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new Error('Credenciales inválidas');

  const payload = { sub: user.id, username: user.username, role: user.role };
  const tokens  = generateTokens(payload);

  return {
    user: {
      id:         user.id,
      username:   user.username,
      email:      user.email,
      role:       user.role,
      first_name: user.first_name,
      last_name:  user.last_name,
    },
    ...tokens,
  };
};

const logout = async (token) => {
  try {
    const decoded = jwt.decode(token);
    const ttl = decoded?.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 3600;
    if (ttl > 0) await blacklistToken(token, ttl);
  } catch {}
};

const verifyToken = (token) => jwt.verify(token, JWT_SECRET);

module.exports = { login, logout, verifyToken, generateTokens };
