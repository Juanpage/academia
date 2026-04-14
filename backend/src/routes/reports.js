// src/routes/reports.js
const express  = require('express');
const router   = express.Router();
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const ExcelJS  = require('exceljs');

router.use(authenticate);

// ── GET /api/reports/ranking ─────────────────────────────────────────────
router.get('/ranking', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        a.id, a.cedula, a.first_name, a.last_name, a.email,
        a.gender, a.status, a.city,
        COALESCE(gs.academic_score, 0)  AS academic_score,
        COALESCE(gs.physical_score, 0)  AS physical_score,
        COALESCE(gs.psych_score,    0)  AS psych_score,
        COALESCE(gs.medical_score,  0)  AS medical_score,
        COALESCE(gs.total_score,
          ROUND(
            COALESCE(gs.academic_score, 0) * 0.40 +
            COALESCE(gs.physical_score, 0) * 0.35 +
            COALESCE(gs.psych_score,    0) * 0.15 +
            COALESCE(gs.medical_score,  0) * 0.10
          , 2)
        ) AS total_score,
        a.created_at
      FROM aspirants a
      LEFT JOIN global_scores gs ON gs.aspirant_id = a.id
      ORDER BY total_score DESC NULLS LAST, a.last_name ASC
    `);
    res.json({ ranking: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/reports/evaluations ─────────────────────────────────────────
router.get('/evaluations', async (req, res) => {
  try {
    const [academic, physical, psico, medical] = await Promise.all([
      pool.query(`
        SELECT
          t.*,
          a.id AS aspirant_id,
          a.first_name || ' ' || a.last_name AS aspirante,
          a.cedula,
          COALESCE(t.created_at, a.created_at) AS created_at
        FROM aspirants a
        LEFT JOIN (
          SELECT *
          FROM (
            SELECT
              ae.*,
              ROW_NUMBER() OVER (PARTITION BY ae.aspirant_id ORDER BY ae.created_at DESC) AS rn
            FROM academic_evaluations ae
          ) x
          WHERE x.rn = 1
        ) t ON t.aspirant_id = a.id
        ORDER BY COALESCE(t.created_at, a.created_at) DESC, a.last_name ASC
      `),
      pool.query(`
        SELECT
          t.*,
          a.id AS aspirant_id,
          a.first_name || ' ' || a.last_name AS aspirante,
          a.cedula,
          COALESCE(t.created_at, a.created_at) AS created_at
        FROM aspirants a
        LEFT JOIN (
          SELECT *
          FROM (
            SELECT
              pe.*,
              ROW_NUMBER() OVER (PARTITION BY pe.aspirant_id ORDER BY pe.created_at DESC) AS rn
            FROM physical_evaluations pe
          ) x
          WHERE x.rn = 1
        ) t ON t.aspirant_id = a.id
        ORDER BY COALESCE(t.created_at, a.created_at) DESC, a.last_name ASC
      `),
      pool.query(`
        SELECT
          t.*,
          a.id AS aspirant_id,
          a.first_name || ' ' || a.last_name AS aspirante,
          a.cedula,
          COALESCE(t.created_at, a.created_at) AS created_at
        FROM aspirants a
        LEFT JOIN (
          SELECT *
          FROM (
            SELECT
              pse.*,
              ROW_NUMBER() OVER (PARTITION BY pse.aspirant_id ORDER BY pse.created_at DESC) AS rn
            FROM psychological_evaluations pse
          ) x
          WHERE x.rn = 1
        ) t ON t.aspirant_id = a.id
        ORDER BY COALESCE(t.created_at, a.created_at) DESC, a.last_name ASC
      `),
      pool.query(`
        SELECT
          t.*,
          a.id AS aspirant_id,
          a.first_name || ' ' || a.last_name AS aspirante,
          a.cedula,
          COALESCE(t.created_at, a.created_at) AS created_at
        FROM aspirants a
        LEFT JOIN (
          SELECT *
          FROM (
            SELECT
              me.*,
              ROW_NUMBER() OVER (PARTITION BY me.aspirant_id ORDER BY me.created_at DESC) AS rn
            FROM medical_evaluations me
          ) x
          WHERE x.rn = 1
        ) t ON t.aspirant_id = a.id
        ORDER BY COALESCE(t.created_at, a.created_at) DESC, a.last_name ASC
      `),
    ]);
    res.json({
      academic:  academic.rows,
      physical:  physical.rows,
      psico:     psico.rows,
      medical:   medical.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/reports/payments ─────────────────────────────────────────────
router.get('/payments', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        p.id, p.amount, p.currency, p.status, p.payment_type,
        p.due_date, p.paid_at, p.period, p.notes,
        a.first_name || ' ' || a.last_name AS aspirante,
        a.cedula,
        pc.name AS concepto, pc.code AS concepto_code
      FROM payments p
      JOIN aspirants a ON a.id = p.aspirant_id
      LEFT JOIN payment_concepts pc ON pc.id = p.concept_id
      ORDER BY p.created_at DESC
    `);

    // Resumen financiero
    const summary = await pool.query(`
      SELECT
        COUNT(*) AS total_pagos,
        COUNT(*) FILTER (WHERE status='paid')    AS pagados,
        COUNT(*) FILTER (WHERE status='pending') AS pendientes,
        COUNT(*) FILTER (WHERE status='overdue') AS vencidos,
        COALESCE(SUM(amount) FILTER (WHERE status='paid'),    0) AS total_recaudado,
        COALESCE(SUM(amount) FILTER (WHERE status='pending'), 0) AS total_pendiente,
        COALESCE(SUM(amount) FILTER (WHERE status='overdue'), 0) AS total_vencido
      FROM payments
    `);

    res.json({ payments: rows, summary: summary.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/reports/export/ranking/excel ────────────────────────────────
router.get('/export/ranking/excel', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        a.cedula, a.first_name, a.last_name, a.email, a.gender, a.status, a.city,
        COALESCE(gs.academic_score, 0) AS academic_score,
        COALESCE(gs.physical_score, 0) AS physical_score,
        COALESCE(gs.psych_score,    0) AS psych_score,
        COALESCE(gs.medical_score,  0) AS medical_score,
        COALESCE(gs.total_score,
          ROUND(
            COALESCE(gs.academic_score, 0) * 0.40 +
            COALESCE(gs.physical_score, 0) * 0.35 +
            COALESCE(gs.psych_score,    0) * 0.15 +
            COALESCE(gs.medical_score,  0) * 0.10
          , 2)
        ) AS total_score
      FROM aspirants a
      LEFT JOIN global_scores gs ON gs.aspirant_id = a.id
      ORDER BY total_score DESC NULLS LAST
    `);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Academia Militar Digital';
    const ws = wb.addWorksheet('Ranking Aspirantes');

    ws.columns = [
      { header: '#',          key: 'rank',     width: 5  },
      { header: 'Cedula',     key: 'cedula',   width: 14 },
      { header: 'Nombres',    key: 'nombres',  width: 30 },
      { header: 'Email',      key: 'email',    width: 28 },
      { header: 'Genero',     key: 'genero',   width: 10 },
      { header: 'Ciudad',     key: 'city',     width: 14 },
      { header: 'Estado',     key: 'status',   width: 12 },
      { header: 'Academico',  key: 'acad',     width: 12 },
      { header: 'Fisico',     key: 'fis',      width: 12 },
      { header: 'Psicologico',key: 'psico',    width: 14 },
      { header: 'Medico',     key: 'med',      width: 12 },
      { header: 'Total',      key: 'total',    width: 12 },
    ];

    // Header style
    ws.getRow(1).eachCell(cell => {
      cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FF1A2E1A' } };
      cell.font = { bold:true, color:{ argb:'FFC9A227' }, size: 11 };
      cell.alignment = { horizontal:'center' };
    });

    rows.forEach((r, i) => {
      const row = ws.addRow({
        rank:    i + 1,
        cedula:  r.cedula,
        nombres: r.first_name + ' ' + r.last_name,
        email:   r.email,
        genero:  r.gender === 'F' ? 'Femenino' : 'Masculino',
        city:    r.city,
        status:  r.status,
        acad:    parseFloat(r.academic_score),
        fis:     parseFloat(r.physical_score),
        psico:   parseFloat(r.psych_score),
        med:     parseFloat(r.medical_score),
        total:   parseFloat(r.total_score),
      });
      if (i % 2 === 0) {
        row.eachCell(cell => {
          cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFF2F2F2' } };
        });
      }
      // Colorear total
      const totalCell = row.getCell('total');
      totalCell.font = { bold: true };
      if (parseFloat(r.total_score) >= 15) totalCell.font = { bold:true, color:{ argb:'FF00AA00' } };
      else if (parseFloat(r.total_score) >= 10) totalCell.font = { bold:true, color:{ argb:'FFCC8800' } };
      else totalCell.font = { bold:true, color:{ argb:'FFCC0000' } };
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=ranking_aspirantes.xlsx');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/reports/export/payments/excel ───────────────────────────────
router.get('/export/payments/excel', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*, a.first_name || ' ' || a.last_name AS aspirante, a.cedula,
        pc.name AS concepto
      FROM payments p
      JOIN aspirants a ON a.id = p.aspirant_id
      LEFT JOIN payment_concepts pc ON pc.id = p.concept_id
      ORDER BY p.created_at DESC
    `);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Pagos');

    ws.columns = [
      { header: 'Aspirante',   key: 'aspirante', width: 30 },
      { header: 'Cedula',      key: 'cedula',    width: 14 },
      { header: 'Concepto',    key: 'concepto',  width: 20 },
      { header: 'Monto',       key: 'amount',    width: 12 },
      { header: 'Estado',      key: 'status',    width: 12 },
      { header: 'Tipo',        key: 'tipo',      width: 14 },
      { header: 'Vencimiento', key: 'due_date',  width: 14 },
      { header: 'Pagado el',   key: 'paid_at',   width: 14 },
    ];

    ws.getRow(1).eachCell(cell => {
      cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FF1A2E1A' } };
      cell.font = { bold:true, color:{ argb:'FFC9A227' }, size: 11 };
      cell.alignment = { horizontal:'center' };
    });

    rows.forEach((r, i) => {
      const row = ws.addRow({
        aspirante: r.aspirante,
        cedula:    r.cedula,
        concepto:  r.concepto || r.concept || '',
        amount:    parseFloat(r.amount),
        status:    r.status,
        tipo:      r.payment_type,
        due_date:  r.due_date ? new Date(r.due_date).toLocaleDateString('es-EC') : '',
        paid_at:   r.paid_at  ? new Date(r.paid_at).toLocaleDateString('es-EC')  : '',
      });
      if (i % 2 === 0) {
        row.eachCell(cell => {
          cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFF2F2F2' } };
        });
      }
      const statusCell = row.getCell('status');
      if (r.status === 'paid')    statusCell.font = { color:{ argb:'FF00AA00' } };
      if (r.status === 'overdue') statusCell.font = { color:{ argb:'FFCC0000' } };
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte_pagos.xlsx');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
