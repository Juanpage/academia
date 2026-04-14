const bcrypt = require('bcrypt');
const {pool} = require('./src/config/database');
bcrypt.hash('Aspirante1234!', 12).then(hash => {
  pool.query('UPDATE users SET password_hash=$1 WHERE role=$2', [hash, 'aspirante']).then(r => {
    console.log('Actualizado:', r.rowCount, 'usuarios');
    pool.end();
  });
});
