const {query} = require('./src/config/database');
const {pool} = require('./src/config/database');
const crypto = require('crypto');

async function test() {
  try {
    const r = await query(
      `INSERT INTO payments (
        aspirant_id, concept_id, concept, amount, currency, status, paid_at,
        payment_type, notes, registered_by,
        es_abono, monto_total, monto_pagado, saldo_pendiente, transaction_id
      ) VALUES (
        $1,$2,$3::text,$4::numeric,'USD','paid',NOW(),
        $5,$6,$7,
        true,$8::numeric,$9::numeric,$10::numeric,$11
      ) RETURNING id`,
      [
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000002',
        'Abono test',
        25.00, 'direct', null, null,
        25.00, 25.00, 0,
        crypto.randomUUID()
      ]
    );
    console.log('INSERT OK:', r.rows[0]);
  } catch(e) {
    console.log('INSERT error:', e.message);
  }
  pool.end();
}
test();
