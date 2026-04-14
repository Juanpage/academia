const {query, pool} = require('./src/config/database');
async function test() {
  const rows = await query('SELECT id, aspirant_id, concept_id, amount, monto_pagado, saldo_pendiente, concept FROM payments LIMIT 1');
  const pago = rows.rows[0];
  console.log('Pago:', JSON.stringify(pago));
  
  try {
    const r = await query(
      'INSERT INTO payments (aspirant_id, concept_id, concept, amount, currency, status, paid_at, payment_type, es_abono, monto_total, monto_pagado, saldo_pendiente) VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7,true,$8,$9,$10) RETURNING id',
      [pago.aspirant_id, pago.concept_id, 'test abono', 10.00, 'USD', 'paid', 'direct', 10.00, 10.00, 0.00]
    );
    console.log('INSERT OK:', r.rows[0]);
    await query('DELETE FROM payments WHERE id=$1', [r.rows[0].id]);
  } catch(e) { console.log('INSERT ERROR:', e.message); }
  
  pool.end();
}
test();
