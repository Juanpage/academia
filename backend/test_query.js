const {query} = require('./src/config/database');
const {pool} = require('./src/config/database');

async function test() {
  try {
    const r = await query(
      'UPDATE payments SET monto_pagado=$1, saldo_pendiente=$2, status=$3, updated_at=NOW() WHERE id=$4',
      [25.00, 25.00, 'pending', '00000000-0000-0000-0000-000000000000']
    );
    console.log('UPDATE OK');
  } catch(e) {
    console.log('UPDATE error:', e.message);
  }
  pool.end();
}
test();
