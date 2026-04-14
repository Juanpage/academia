const Redis = require('ioredis');

const redis = new Redis({
  host:        process.env.REDIS_HOST     || 'localhost',
  port:        parseInt(process.env.REDIS_PORT || '6379'),
  password:    process.env.REDIS_PASSWORD || 'redislocal',
  retryStrategy: (times) => Math.min(times * 100, 3000),
  lazyConnect: false,
});

redis.on('connect',  () => console.log('[Redis] Conectado'));
redis.on('error',    (e) => console.error('[Redis] Error:', e.message));
redis.on('reconnecting', () => console.log('[Redis] Reconectando...'));

/**
 * Blacklist de tokens JWT (logout)
 * @param {string} token
 * @param {number} expiresInSeconds
 */
const blacklistToken = (token, expiresInSeconds) =>
  redis.set(`blacklist:${token}`, '1', 'EX', expiresInSeconds);

const isTokenBlacklisted = async (token) =>
  (await redis.get(`blacklist:${token}`)) === '1';

module.exports = { redis, blacklistToken, isTokenBlacklisted };
