// src/routes/payments.js
const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const { query } = require('../config/database');
const { authenticate, adminOnly } = require('../middleware/auth');

// ── GET /api/payments/voucher/:filename — público, sin token ──
router.get('/voucher/:filename', (req, res) => {
  const file = path.join(uploadDir, path.basename(req.params.filename));
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Archivo no encontrado' });
  res.sendFile(file);
});

router.use(authenticate);

// ── Multer ────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '../../uploads/vouchers');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = `voucher_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf','.jpg','.jpeg','.png','.webp'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Solo PDF, JPG, PNG o WEBP'));
  },
});

// ── GET /api/payments/concepts ────────────────────────────────
router.get('/concepts', async (req, res) => {
  try {
    const r = await query(`
      SELECT *, 
             COALESCE(tipo,'unique') AS tipo,
             COALESCE(max_installments,1) AS max_installments,
             COALESCE(discount_min_pct,0) AS discount_min_pct,
             COALESCE(discount_max_pct,0) AS discount_max_pct
      FROM payment_concepts WHERE is_active=true ORDER BY name
    `);
    res.json({ concepts: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PUT /api/payments/concepts/:id ───────────────────────────
router.put('/concepts/:id', adminOnly, async (req, res) => {
  const { amount, name, description, is_active, tipo, max_installments, discount_min_pct, discount_max_pct } = req.body;
  try {
    const r = await query(
      `UPDATE payment_concepts SET
        amount=COALESCE($1,amount),
        name=COALESCE($2,name),
        description=COALESCE($3,description),
        is_active=COALESCE($4,is_active),
        tipo=COALESCE($5,tipo),
        max_installments=COALESCE($6,max_installments),
        discount_min_pct=COALESCE($7,discount_min_pct),
        discount_max_pct=COALESCE($8,discount_max_pct),
        updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [
        amount||null, name||null, description||null, is_active??null,
        tipo||null, max_installments||null,
        discount_min_pct!=null ? parseFloat(discount_min_pct) : null,
        discount_max_pct!=null ? parseFloat(discount_max_pct) : null,
        req.params.id
      ]
    );
    res.json({ concept: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/payments/summary ─────────────────────────────────
router.get('/summary', async (req, res) => {
  try {
    const [s, bc, rec] = await Promise.all([
      query(`SELECT
        COUNT(*) FILTER (WHERE status='pending') AS pending,
        COUNT(*) FILTER (WHERE status='overdue') AS overdue,
        COUNT(*) FILTER (WHERE status='paid')    AS paid,
        COALESCE(SUM(amount) FILTER (WHERE status='paid'),0) AS total_collected,
        COALESCE(SUM(amount) FILTER (WHERE status IN ('pending','overdue')),0) AS total_pending
        FROM payments`),
      query(`SELECT pc.name,pc.code,pc.amount,pc.tipo,
        COALESCE(pc.discount_min_pct,0) AS discount_min_pct,
        COALESCE(pc.discount_max_pct,0) AS discount_max_pct,
        COUNT(p.id) AS total_emitidos,
        COUNT(p.id) FILTER (WHERE p.status='paid') AS total_pagados,
        COALESCE(SUM(p.amount) FILTER (WHERE p.status='paid'),0) AS recaudado
        FROM payment_concepts pc LEFT JOIN payments p ON p.concept_id=pc.id
        WHERE pc.is_active=true GROUP BY pc.id ORDER BY recaudado DESC`),
      query(`SELECT p.*,a.first_name||' '||a.last_name AS aspirant_name,pc.name AS concept_name
        FROM payments p JOIN aspirants a ON a.id=p.aspirant_id
        LEFT JOIN payment_concepts pc ON pc.id=p.concept_id
        WHERE p.status='paid' ORDER BY p.paid_at DESC LIMIT 5`),
    ]);
    res.json({ stats: s.rows[0], by_concept: bc.rows, recent_paid: rec.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// ── GET /api/payments/aspirant/:id ───────────────────────────
router.get('/aspirant/:aspirantId', async (req, res) => {
  try {
    const r = await query(
      `SELECT p.*,pc.name AS concept_name,pc.code AS concept_code,
              pc.tipo, pc.max_installments,
              u.first_name||' '||u.last_name AS registered_by_name
       FROM payments p
       LEFT JOIN payment_concepts pc ON pc.id=p.concept_id
       LEFT JOIN users u ON u.id=p.registered_by
       WHERE p.aspirant_id=$1 ORDER BY p.created_at DESC`,
      [req.params.aspirantId]
    );
    res.json({ payments: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/payments ─────────────────────────────────────────
router.get('/', async (req, res) => {
  const { aspirant_id, status, concept_id, from, to, page=1, limit=50 } = req.query;
  const offset = (parseInt(page)-1)*parseInt(limit);
  const where = ['1=1']; const params = []; let i = 1;
  if (aspirant_id) { where.push(`p.aspirant_id=$${i++}`); params.push(aspirant_id); }
  if (status)      { where.push(`p.status=$${i++}`);       params.push(status); }
  if (concept_id)  { where.push(`p.concept_id=$${i++}`);   params.push(concept_id); }
  if (from)        { where.push(`p.created_at>=$${i++}`);  params.push(from); }
  if (to)          { where.push(`p.created_at<=$${i++}`);  params.push(to); }
  try {
    const [d, c] = await Promise.all([
      query(
        `SELECT p.*,a.first_name||' '||a.last_name AS aspirant_name,a.cedula AS aspirant_cedula,
                a.email AS aspirant_email,
                pc.name AS concept_name,pc.code AS concept_code,
                u.first_name||' '||u.last_name AS registered_by_name
         FROM payments p JOIN aspirants a ON a.id=p.aspirant_id
         LEFT JOIN payment_concepts pc ON pc.id=p.concept_id
         LEFT JOIN users u ON u.id=p.registered_by
         WHERE ${where.join(' AND ')} ORDER BY p.created_at DESC LIMIT $${i++} OFFSET $${i++}`,
        [...params, parseInt(limit), offset]
      ),
      query(`SELECT COUNT(*) FROM payments p WHERE ${where.join(' AND ')}`, params),
    ]);
    res.json({ payments: d.rows, total: parseInt(c.rows[0].count), page: parseInt(page) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/payments — crear pago con voucher opcional ──────
router.post('/', upload.single('voucher'), async (req, res) => {
  const {
    aspirant_id, concept_id, amount, currency='USD',
    payment_type='direct', due_date, period, notes,
    mark_as_paid, discount_pct,
    transfer_bank, transfer_ref, transfer_date,
    sri_autorizacion, sri_claveacceso, sri_numero,
    sri_fecha_emision, sri_ruc_emisor, sri_razon_social,
    comprobante_number, installment_number, total_installments,
  } = req.body;

  if (!aspirant_id || !concept_id || !amount)
    return res.status(400).json({ error: 'aspirant_id, concept_id y amount son requeridos' });

  const isPaid  = mark_as_paid === 'true' || mark_as_paid === true;
  const status  = isPaid ? 'paid' : 'pending';
  const voucher = req.file ? req.file.filename : null;

  // Aplicar descuento si se especifica
  const finalAmount = discount_pct
    ? parseFloat(amount) * (1 - parseFloat(discount_pct) / 100)
    : parseFloat(amount);

  try {
    const r = await query(
      `INSERT INTO payments (
        aspirant_id,concept_id,concept,amount,currency,status,paid_at,
        payment_type,due_date,period,notes,registered_by,
        transfer_bank,transfer_ref,transfer_date,
        sri_autorizacion,sri_claveacceso,sri_numero,
        sri_fecha_emision,sri_ruc_emisor,sri_razon_social,
        comprobante_number,comprobante_data
      ) VALUES (
        $1,$2,'',$3,$4,$5,${isPaid?'NOW()':'NULL'},
        $6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21
      ) RETURNING *`,
      [
        aspirant_id, concept_id, finalAmount.toFixed(2), currency, status,
        payment_type, due_date||null, period||null, notes||null, req.user.id,
        transfer_bank||null, transfer_ref||null, transfer_date||null,
        sri_autorizacion||null, sri_claveacceso||null, sri_numero||null,
        sri_fecha_emision||null, sri_ruc_emisor||null, sri_razon_social||null,
        comprobante_number||null,
        voucher ? JSON.stringify({ filename: voucher, installment: installment_number, of: total_installments }) : null,
      ]
    );
    res.status(201).json({ payment: r.rows[0], voucher });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PATCH /api/payments/:id/pay ───────────────────────────────
router.patch('/:id/pay', upload.single('voucher'), async (req, res) => {
  const {
    payment_type='direct',
    transfer_bank, transfer_ref, transfer_date,
    sri_autorizacion, sri_claveacceso, sri_numero,
    sri_fecha_emision, sri_ruc_emisor, sri_razon_social,
    comprobante_number, notes,
  } = req.body;

  const voucher = req.file ? req.file.filename : null;

  try {
    const r = await query(
      `UPDATE payments SET status='paid',paid_at=NOW(),payment_type=$1,
        transfer_bank=$2,transfer_ref=$3,transfer_date=$4,
        sri_autorizacion=$5,sri_claveacceso=$6,sri_numero=$7,
        sri_fecha_emision=$8,sri_ruc_emisor=$9,sri_razon_social=$10,
        comprobante_number=$11,notes=COALESCE($12,notes),
        comprobante_data=CASE WHEN $13::text IS NOT NULL THEN $13::jsonb ELSE comprobante_data END,
        registered_by=$14,updated_at=NOW()
       WHERE id=$15 RETURNING *`,
      [
        payment_type,
        transfer_bank||null, transfer_ref||null, transfer_date||null,
        sri_autorizacion||null, sri_claveacceso||null, sri_numero||null,
        sri_fecha_emision||null, sri_ruc_emisor||null, sri_razon_social||null,
        comprobante_number||null, notes||null,
        voucher ? JSON.stringify({ filename: voucher }) : null,
        req.user.id, req.params.id,
      ]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Pago no encontrado' });
    res.json({ payment: r.rows[0], voucher });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PATCH /api/payments/:id/overdue ──────────────────────────
router.patch('/:id/overdue', adminOnly, async (req, res) => {
  try {
    const r = await query(
      `UPDATE payments SET status='overdue',updated_at=NOW() WHERE id=$1 AND status='pending' RETURNING *`,
      [req.params.id]
    );
    res.json({ payment: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DELETE /api/payments/:id ──────────────────────────────────
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const p = await query('SELECT comprobante_data FROM payments WHERE id=$1', [req.params.id]);
    const cd = p.rows[0]?.comprobante_data;
    if (cd?.filename) {
      const f = path.join(uploadDir, cd.filename);
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
    await query('DELETE FROM payments WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// -- GET /api/payments/transactions/:aspirantId
router.get('/transactions/:aspirantId', async (req, res) => {
  try {
    const r = await query(
      `SELECT
        COALESCE(p.transaction_id::text, p.id::text) AS transaction_id,
        MIN(p.created_at) AS fecha,
        MIN(p.paid_at)    AS paid_at,
        p.status, p.payment_type,
        SUM(p.amount)     AS total,
        p.currency,
        json_agg(json_build_object(
          'id', p.id,
          'concept_name', COALESCE(pc.name, p.concept, ''),
          'amount', p.amount,
          'status', p.status,
          'period', p.period
        ) ORDER BY p.created_at) AS conceptos,
        MIN(p.sri_autorizacion)   AS sri_autorizacion,
        MIN(p.sri_claveacceso)    AS sri_claveacceso,
        MIN(p.sri_numero)         AS sri_numero,
        MIN(p.sri_ruc_emisor)     AS sri_ruc_emisor,
        MIN(p.sri_razon_social)   AS sri_razon_social,
        MIN(p.comprobante_number) AS comprobante_number,
        MIN(p.transfer_bank)      AS transfer_bank,
        MIN(p.transfer_ref)       AS transfer_ref
       FROM payments p
       LEFT JOIN payment_concepts pc ON pc.id = p.concept_id
       WHERE p.aspirant_id = $1
       GROUP BY COALESCE(p.transaction_id::text, p.id::text), p.status, p.payment_type, p.currency
       ORDER BY fecha DESC`,
      [req.params.aspirantId]
    );
    res.json({ transactions: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// -- POST /api/payments/:id/abono
router.post('/:id/abono', upload.single('voucher'), async (req, res) => {
  try {
    console.log('[Abono] body:', req.body);
    const { rows } = await query('SELECT * FROM payments WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Pago no encontrado' });
    const pago = rows[0];
    const monto_abono = parseFloat(req.body.monto_abono || 0);
    if (monto_abono <= 0) return res.status(400).json({ error: 'monto_abono debe ser mayor a 0' });
    const saldoActual = parseFloat(pago.saldo_pendiente != null && parseFloat(pago.saldo_pendiente) <= parseFloat(pago.amount) ? pago.saldo_pendiente : parseFloat(pago.amount) - parseFloat(pago.monto_pagado || 0));
    if (monto_abono > saldoActual + 0.01)
      return res.status(400).json({ error: 'El abono supera el saldo pendiente' });
    const nuevoSaldo  = Math.max(0, parseFloat((saldoActual - monto_abono).toFixed(2)));
    const nuevoPagado = parseFloat((parseFloat(pago.monto_pagado || 0) + monto_abono).toFixed(2));
    const nuevoStatus = nuevoSaldo <= 0 ? 'paid' : 'pending';
    const voucher = req.file ? req.file.filename : null;
    const crypto = require('crypto');
    const txId = crypto.randomUUID();

    // UPDATE usando valores directos sin CASE en el mismo parametro
    if (nuevoStatus === 'paid') {
      await query(
        'UPDATE payments SET monto_pagado=$1, saldo_pendiente=$2, status=$3, paid_at=NOW(), updated_at=NOW() WHERE id=$4',
        [nuevoPagado, nuevoSaldo, 'paid', req.params.id]
      );
    } else {
      await query(
        'UPDATE payments SET monto_pagado=$1, saldo_pendiente=$2, status=$3, updated_at=NOW() WHERE id=$4',
        [nuevoPagado, nuevoSaldo, 'pending', req.params.id]
      );
    }

    // INSERT abono hijo
    const concepto = 'Abono: ' + (pago.concept || '');
    const abonoRow = await query(
      `INSERT INTO payments
        (aspirant_id, concept_id, concept, amount, currency, status, paid_at,
         payment_type, notes, registered_by,
         transfer_bank, transfer_ref, transfer_date,
         es_abono, parent_payment_id,
         monto_total, monto_pagado, saldo_pendiente,
         transaction_id, comprobante_data)
       VALUES
        ($1, $2, $3, $4, 'USD', 'paid', NOW(),
         $5, $6, $7,
         $8, $9, $10,
         true, $11,
         $12, $13, $14,
         $15, $16)
       RETURNING *`,
      [
        pago.aspirant_id,
        pago.concept_id,
        concepto,
        monto_abono,
        req.body.payment_type || 'direct',
        req.body.notes || null,
        req.user.id,
        req.body.transfer_bank || null,
        req.body.transfer_ref  || null,
        req.body.transfer_date || null,
        req.params.id,
        monto_abono,
        monto_abono,
        0,
        txId,
        voucher ? JSON.stringify({ filename: voucher }) : null,
      ]
    );
    res.status(201).json({ abono: abonoRow.rows[0], saldo_pendiente: nuevoSaldo, monto_pagado: nuevoPagado, status: nuevoStatus });
  } catch (e) {
    console.error('POST abono:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// -- GET /api/payments/estado-cuenta/:aspirantId
router.get('/estado-cuenta/:aspirantId', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT p.*,
        pc.name AS concept_name, pc.code AS concept_code, pc.tipo,
        COALESCE(p.monto_total, p.amount) AS total_concepto,
        COALESCE(p.monto_pagado, CASE WHEN p.status='paid' THEN p.amount ELSE 0 END) AS pagado,
        COALESCE(p.saldo_pendiente, CASE WHEN p.status='paid' THEN 0 ELSE p.amount END) AS saldo,
        (SELECT json_agg(json_build_object(
          'id', ab.id, 'amount', ab.amount, 'paid_at', ab.paid_at,
          'payment_type', ab.payment_type, 'notes', ab.notes
        ) ORDER BY ab.paid_at DESC)
         FROM payments ab WHERE ab.parent_payment_id = p.id
        ) AS abonos
       FROM payments p
       LEFT JOIN payment_concepts pc ON pc.id = p.concept_id
       WHERE p.aspirant_id = $1 AND p.es_abono = false
       ORDER BY p.created_at ASC`,
      [req.params.aspirantId]
    );

    const total    = rows.reduce((s,r) => s + parseFloat(r.total_concepto||0), 0);
    const pagado   = rows.reduce((s,r) => s + parseFloat(r.pagado||0), 0);
    const saldo    = rows.reduce((s,r) => s + parseFloat(r.saldo||0), 0);

    res.json({
      conceptos: rows,
      resumen: {
        total:  parseFloat(total.toFixed(2)),
        pagado: parseFloat(pagado.toFixed(2)),
        saldo:  parseFloat(saldo.toFixed(2)),
      }
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
