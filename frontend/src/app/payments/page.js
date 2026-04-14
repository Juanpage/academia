'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token') || localStorage.getItem('token');
}
async function apiFetch(url, opts = {}) {
  const r = await fetch(`${API}${url}`, {
    headers: { 'Content-Type':'application/json', Authorization:`Bearer ${getToken()}` },
    ...opts,
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'Error');
  return d;
}

const STATUS = {
  paid:    { label:'Pagado',    color:'#4ade80', bg:'#14532d33', border:'#166534' },
  pending: { label:'Pendiente', color:'#facc15', bg:'#78350f33', border:'#92400e' },
  overdue: { label:'Vencido',   color:'#f87171', bg:'#7f1d1d33', border:'#991b1b' },
};
const PAY_TYPES = [
  { value:'direct',   label:'💵 Pago Directo',    desc:'Efectivo en ventanilla' },
  { value:'transfer', label:'🏦 Transferencia',    desc:'Transferencia bancaria' },
  { value:'invoice',  label:'📄 Factura SRI',      desc:'Comprobante electrónico' },
];

function Badge({ status }) {
  const s = STATUS[status]||STATUS.pending;
  return <span style={{ background:s.bg, color:s.color, border:`1px solid ${s.border}`, borderRadius:'999px', padding:'2px 10px', fontSize:'11px', fontWeight:'700' }}>{s.label}</span>;
}


// ── Generador de Factura SRI — Formato oficial Ecuador ────────
function generateSRIInvoice(payment) {
  const win = window.open('', '_blank');
  const monto    = parseFloat(payment.amount || 0);
  const iva      = parseFloat((monto * 0.15).toFixed(2));
  const subtotal = parseFloat((monto - iva).toFixed(2));
  const fecha    = payment.sri_fecha_emision ||
    (payment.paid_at ? new Date(payment.paid_at).toLocaleDateString('es-EC', {day:'2-digit',month:'2-digit',year:'numeric'}) : new Date().toLocaleDateString('es-EC'));
  const num = payment.sri_numero || '001-001-000000000';
  const [estab='001', ptoe='001', secuencial='000000000'] = num.split('-');
  const razonSocial = payment.sri_razon_social || 'ACADEMIA MILITAR DIGITAL';
  const ruc         = payment.sri_ruc_emisor   || '—';
  const autorizacion= payment.sri_autorizacion || '—';
  const claveAcceso = payment.sri_claveacceso  || '';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>FACTURA ${num}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:11px;color:#000;background:#fff;padding:20px}
.page{width:760px;margin:0 auto;border:2px solid #000}
/* CABECERA */
.cabecera{display:flex;border-bottom:2px solid #000}
.emisor{flex:2;padding:10px;border-right:2px solid #000}
.emisor h1{font-size:14px;font-weight:bold;text-transform:uppercase;margin-bottom:6px}
.emisor p{font-size:10px;margin:2px 0}
.sri-box{flex:1;padding:10px;text-align:center}
.sri-box .ruc-label{font-size:10px;font-weight:bold}
.sri-box .ruc-val{font-size:12px;font-weight:bold;margin:2px 0}
.sri-box .tipo-doc{border:2px solid #000;font-size:13px;font-weight:bold;padding:4px;margin:6px auto;display:block}
.sri-box .num-doc{font-size:14px;font-weight:bold;letter-spacing:2px;margin:4px 0}
.sri-box .small{font-size:9px;margin:2px 0}
/* AUTORIZACIÓN */
.auth-bar{background:#f5f5f5;border-bottom:2px solid #000;padding:5px 10px;font-size:9px;word-break:break-all}
/* COMPRADOR */
.comprador{padding:8px 10px;border-bottom:2px solid #000}
.comprador table{width:100%;border-collapse:collapse}
.comprador td{padding:3px 5px;font-size:11px;vertical-align:top}
.comprador .lbl{font-weight:bold;width:160px;white-space:nowrap}
.comprador .val{border-bottom:1px solid #777;min-width:150px}
/* DETALLE */
.detalle{border-bottom:2px solid #000}
.detalle table{width:100%;border-collapse:collapse}
.detalle th{background:#ddd;border:1px solid #999;padding:4px 6px;font-size:10px;text-align:center;font-weight:bold}
.detalle td{border:1px solid #ccc;padding:4px 6px;font-size:11px;vertical-align:top}
.c{text-align:center}.r{text-align:right}
/* TOTALES */
.pie{display:flex;border-bottom:2px solid #000}
.info-adic{flex:1;padding:8px 10px;border-right:1px solid #000;font-size:10px}
.info-adic strong{display:block;margin-bottom:4px}
.info-adic table{border-collapse:collapse}
.info-adic td{padding:2px 6px 2px 0;font-size:10px}
.totales{width:280px;padding:6px 10px}
.totales table{width:100%;border-collapse:collapse}
.totales td{padding:2px 6px;font-size:11px}
.totales .lbl{font-weight:bold}
.totales .val{text-align:right;border-bottom:1px solid #ddd}
.totales .grand{font-weight:bold;font-size:13px;background:#eee}
/* CLAVE */
.clave{padding:5px 10px;font-size:9px;word-break:break-all;border-bottom:2px solid #000;background:#f9f9f9}
.clave strong{display:block;margin-bottom:2px}
/* FOOTER */
.footer{padding:6px 10px;font-size:9px;color:#555;text-align:center}
/* BOTONES */
.no-print{text-align:center;margin-bottom:14px}
.no-print button{padding:8px 22px;border:none;border-radius:6px;font-size:13px;cursor:pointer;margin:0 4px}
.btn-print{background:#1d4ed8;color:#fff}
.btn-close{background:#6b7280;color:#fff}
@media print{.no-print{display:none}.page{border:2px solid #000}}
</style>
</head>
<body>
<div class="no-print">
  <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
  <button class="btn-close" onclick="window.close()">✕ Cerrar</button>
</div>

<div class="page">
  <!-- CABECERA -->
  <div class="cabecera">
    <div class="emisor">
      <h1>${razonSocial}</h1>
      <p><strong>Dirección Matriz:</strong> Quito, Pichincha - Ecuador</p>
      <p><strong>Dirección Sucursal:</strong> —</p>
      <p><strong>Contribuyente Especial Nro.:</strong> —</p>
      <p><strong>Obligado a llevar contabilidad:</strong> NO</p>
      <p style="margin-top:6px;font-size:9px;color:#555">Autorizado mediante Resolución No. NAC-DNCRASC20-00000001</p>
    </div>
    <div class="sri-box">
      <div class="ruc-label">R.U.C.</div>
      <div class="ruc-val">${ruc}</div>
      <span class="tipo-doc">FACTURA</span>
      <div class="small">No.</div>
      <div class="num-doc">${estab}-${ptoe}-${secuencial}</div>
      <div class="small" style="margin-top:8px"><strong>AMBIENTE:</strong> PRODUCCIÓN</div>
      <div class="small"><strong>EMISIÓN:</strong> NORMAL</div>
      <div class="small" style="margin-top:4px"><strong>FECHA Y HORA AUTORIZACIÓN:</strong></div>
      <div class="small">${fecha} ${new Date().toLocaleTimeString('es-EC')}</div>
    </div>
  </div>

  <!-- CLAVE DE ACCESO -->
  ${claveAcceso ? `<div class="auth-bar"><strong>CLAVE DE ACCESO: </strong>${claveAcceso}</div>` : ''}

  <!-- DATOS COMPRADOR -->
  <div class="comprador">
    <table>
      <tr>
        <td class="lbl">Razón Social / Nombres y Apellidos:</td>
        <td class="val" colspan="3" style="font-weight:bold">${payment.aspirant_name || '—'}</td>
      </tr>
      <tr>
        <td class="lbl">Identificación:</td>
        <td class="val">${payment.aspirant_cedula || '—'}</td>
        <td class="lbl" style="padding-left:20px">Fecha Emisión:</td>
        <td class="val">${fecha}</td>
      </tr>
      <tr>
        <td class="lbl">Dirección:</td>
        <td class="val">—</td>
        <td class="lbl" style="padding-left:20px">Teléfono:</td>
        <td class="val">—</td>
      </tr>
      ${payment.aspirant_email ? `
      <tr>
        <td class="lbl">Email:</td>
        <td class="val" colspan="3">${payment.aspirant_email}</td>
      </tr>` : ''}
      ${payment.period ? `
      <tr>
        <td class="lbl">Período:</td>
        <td class="val" colspan="3">${payment.period}</td>
      </tr>` : ''}
    </table>
  </div>

  <!-- DETALLE DE PRODUCTOS/SERVICIOS -->
  <div class="detalle">
    <table>
      <thead>
        <tr>
          <th style="width:50px">Cant.</th>
          <th style="width:80px">Código</th>
          <th>Descripción</th>
          <th style="width:90px">P. Unitario</th>
          <th style="width:80px">Dcto.</th>
          <th style="width:90px">P. Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="c">1,00</td>
          <td class="c">${payment.concept_code || 'SERV001'}</td>
          <td>${payment.concept_name || payment.concept || 'Servicio Académico'}</td>
          <td class="r">$${subtotal.toFixed(2)}</td>
          <td class="r">$0.00</td>
          <td class="r">$${subtotal.toFixed(2)}</td>
        </tr>
        <tr><td colspan="6" style="height:20px"></td></tr>
        <tr><td colspan="6" style="height:20px"></td></tr>
      </tbody>
    </table>
  </div>

  <!-- PIE: INFO ADICIONAL + TOTALES -->
  <div class="pie">
    <div class="info-adic">
      <strong>INFORMACIÓN ADICIONAL</strong>
      <table>
        <tr>
          <td style="font-weight:bold">Forma de Pago:</td>
          <td>${payment.payment_type === 'direct' ? 'Efectivo' : payment.payment_type === 'transfer' ? 'Transferencia Bancaria' : 'Otro'}</td>
        </tr>
        ${payment.transfer_ref ? `
        <tr>
          <td style="font-weight:bold">N° Referencia:</td>
          <td>${payment.transfer_ref}</td>
        </tr>
        <tr>
          <td style="font-weight:bold">Banco:</td>
          <td>${payment.transfer_bank || '—'}</td>
        </tr>` : ''}
        ${payment.sri_autorizacion ? `
        <tr>
          <td style="font-weight:bold">N° Autorización:</td>
          <td style="word-break:break-all;font-size:9px">${autorizacion}</td>
        </tr>` : ''}
        <tr>
          <td style="font-weight:bold">Concepto:</td>
          <td>${payment.concept_name || '—'}</td>
        </tr>
      </table>
    </div>
    <div class="totales">
      <table>
        <tr><td class="lbl">SUBTOTAL 15%</td>   <td class="val">$${subtotal.toFixed(2)}</td></tr>
        <tr><td class="lbl">SUBTOTAL 0%</td>    <td class="val">$0.00</td></tr>
        <tr><td class="lbl">SUBTOTAL NO OBJETO IVA</td><td class="val">$0.00</td></tr>
        <tr><td class="lbl">SUBTOTAL EXENTO IVA</td>   <td class="val">$0.00</td></tr>
        <tr><td class="lbl">SUBTOTAL SIN IMPUESTOS</td><td class="val">$${subtotal.toFixed(2)}</td></tr>
        <tr><td class="lbl">DESCUENTO</td>      <td class="val">$0.00</td></tr>
        <tr><td class="lbl">ICE</td>            <td class="val">$0.00</td></tr>
        <tr><td class="lbl">IVA 15%</td>        <td class="val">$${iva.toFixed(2)}</td></tr>
        <tr><td class="lbl">IRBPNR</td>         <td class="val">$0.00</td></tr>
        <tr class="grand"><td class="lbl">VALOR TOTAL</td><td class="val">$${monto.toFixed(2)}</td></tr>
      </table>
    </div>
  </div>

  ${claveAcceso ? `
  <div class="clave">
    <strong>CLAVE DE ACCESO (SRI):</strong>
    ${claveAcceso}
  </div>` : ''}

  <div class="footer">
    Documento generado por Sistema de Gestión Academia Militar Digital &nbsp;·&nbsp; ${new Date().toLocaleString('es-EC')}
    <br/>Este documento es un comprobante del sistema interno. Para validar la factura electrónica ingrese la clave de acceso en sri.gob.ec
  </div>
</div>
<script>window.onload = () => window.print();</script>
</body>
</html>`;
  win.document.write(html);
  win.document.close();
}


// ── Tab Conceptos con edición inline ─────────────────────────
function ConceptsTab({ concepts, onRefresh }) {
  const [editing, setEditing] = useState(null); // id del concepto en edición
  const [f, setF]             = useState({});
  const [saving, setSaving]   = useState(false);
  const [error,  setError]    = useState('');

  const TIPOS = {
    unique:      { label: '1 Pago',      color: '#60a5fa' },
    installment: { label: 'Cuotas',      color: '#fbbf24' },
    recurring:   { label: 'Mensual',     color: '#4ade80' },
  };

  const startEdit = (c) => {
    setEditing(c.id);
    setF({
      name:             c.name,
      description:      c.description || '',
      amount:           parseFloat(c.amount),
      tipo:             c.tipo || 'unique',
      max_installments: c.max_installments || 1,
      discount_min_pct: parseFloat(c.discount_min_pct || 0),
      discount_max_pct: parseFloat(c.discount_max_pct || 0),
      is_active:        c.is_active,
    });
    setError('');
  };

  const handleSave = async (id) => {
    setSaving(true); setError('');
    try {
      const r = await fetch(`${API}/payments/concepts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${getToken()}` },
        body: JSON.stringify(f),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setEditing(null);
      onRefresh();
    } catch(e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const S = { background:'#0f172a', border:'1px solid #334155', borderRadius:'6px', color:'#f1f5f9', fontSize:'13px', padding:'4px 8px', outline:'none' };

  return (
    <div>
      {error && <div style={{ background:'#7f1d1d33', color:'#fca5a5', border:'1px solid #991b1b', borderRadius:'8px', padding:'8px 12px', marginBottom:'12px', fontSize:'13px' }}>⚠ {error}</div>}
      <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:'12px', overflow:'hidden' }}>
        {/* Header */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.5fr 0.8fr 0.8fr 0.8fr 0.8fr 0.6fr 0.8fr', padding:'10px 16px', background:'#0f172a', borderBottom:'1px solid #334155' }}>
          {['Código','Nombre / Descripción','Monto','Tipo','Cuotas','Dto. Min%','Dto. Max%',''].map(h=>(
            <div key={h} style={{ color:'#64748b', fontSize:'11px', fontWeight:'bold', textTransform:'uppercase' }}>{h}</div>
          ))}
        </div>

        {concepts.map((c,i) => {
          const isEditing = editing === c.id;
          const tipo = TIPOS[c.tipo || 'unique'];
          return (
            <div key={c.id} style={{
              display:'grid', gridTemplateColumns:'1fr 1.5fr 0.8fr 0.8fr 0.8fr 0.8fr 0.6fr 0.8fr',
              padding:'10px 16px', alignItems:'center', gap:'8px',
              background: isEditing ? '#1e3a5f22' : i%2===0 ? '#1e293b' : '#1a2332',
              borderBottom:'1px solid #1e3a5f22',
              borderLeft: isEditing ? '3px solid #ca8a04' : '3px solid transparent',
            }}>
              {/* Código */}
              <div style={{ color:'#64748b', fontFamily:'monospace', fontSize:'12px' }}>{c.code}</div>

              {/* Nombre/Descripción */}
              <div>
                {isEditing ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                    <input style={S} value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))} />
                    <input style={{...S,fontSize:'11px',color:'#94a3b8'}} value={f.description} onChange={e=>setF(p=>({...p,description:e.target.value}))} placeholder="Descripción" />
                  </div>
                ) : (
                  <div>
                    <div style={{ color:'#f1f5f9', fontWeight:'600', fontSize:'13px' }}>{c.name}</div>
                    {c.description && <div style={{ color:'#64748b', fontSize:'11px' }}>{c.description}</div>}
                  </div>
                )}
              </div>

              {/* Monto */}
              <div>
                {isEditing ? (
                  <input style={{...S, width:'90px'}} type="number" step="0.01" min="0"
                    value={f.amount} onChange={e=>setF(p=>({...p,amount:e.target.value}))} />
                ) : (
                  <span style={{ color:'#facc15', fontWeight:'700', fontSize:'14px' }}>${parseFloat(c.amount).toFixed(2)}</span>
                )}
              </div>

              {/* Tipo */}
              <div>
                {isEditing ? (
                  <select style={S} value={f.tipo} onChange={e=>setF(p=>({...p,tipo:e.target.value}))}>
                    <option value="unique">1 Pago</option>
                    <option value="installment">Cuotas</option>
                    <option value="recurring">Mensual</option>
                  </select>
                ) : (
                  <span style={{ background:tipo.color+'22', color:tipo.color, border:`1px solid ${tipo.color}55`, borderRadius:'999px', padding:'2px 8px', fontSize:'11px', fontWeight:'700' }}>
                    {tipo.label}
                  </span>
                )}
              </div>

              {/* Max cuotas */}
              <div>
                {isEditing ? (
                  <input style={{...S, width:'60px'}} type="number" min="1" max="12"
                    value={f.max_installments} onChange={e=>setF(p=>({...p,max_installments:e.target.value}))}
                    disabled={f.tipo==='unique'} />
                ) : (
                  <span style={{ color:'#94a3b8', fontSize:'13px' }}>
                    {c.max_installments === 1 ? '—' : `máx ${c.max_installments}`}
                  </span>
                )}
              </div>

              {/* Dto min */}
              <div>
                {isEditing ? (
                  <input style={{...S, width:'60px'}} type="number" min="0" max="100" step="0.5"
                    value={f.discount_min_pct} onChange={e=>setF(p=>({...p,discount_min_pct:e.target.value}))} />
                ) : (
                  <span style={{ color:'#94a3b8', fontSize:'13px' }}>
                    {parseFloat(c.discount_min_pct||0) > 0 ? `${parseFloat(c.discount_min_pct).toFixed(0)}%` : '—'}
                  </span>
                )}
              </div>

              {/* Dto max */}
              <div>
                {isEditing ? (
                  <input style={{...S, width:'60px'}} type="number" min="0" max="100" step="0.5"
                    value={f.discount_max_pct} onChange={e=>setF(p=>({...p,discount_max_pct:e.target.value}))} />
                ) : (
                  <span style={{ color:'#94a3b8', fontSize:'13px' }}>
                    {parseFloat(c.discount_max_pct||0) > 0 ? `${parseFloat(c.discount_max_pct).toFixed(0)}%` : '—'}
                  </span>
                )}
              </div>

              {/* Acciones */}
              <div style={{ display:'flex', gap:'4px' }}>
                {isEditing ? (
                  <>
                    <button onClick={()=>handleSave(c.id)} disabled={saving}
                      style={{ padding:'3px 10px', background:'#16a34a', color:'#fff', border:'none', borderRadius:'6px', fontSize:'11px', cursor:'pointer', fontWeight:'700' }}>
                      {saving ? '...' : '✓'}
                    </button>
                    <button onClick={()=>setEditing(null)}
                      style={{ padding:'3px 8px', background:'#374151', color:'#9ca3af', border:'none', borderRadius:'6px', fontSize:'11px', cursor:'pointer' }}>
                      ✕
                    </button>
                  </>
                ) : (
                  <button onClick={()=>startEdit(c)}
                    style={{ padding:'3px 10px', background:'#1d4ed822', color:'#60a5fa', border:'1px solid #1d4ed855', borderRadius:'6px', fontSize:'11px', cursor:'pointer', fontWeight:'600' }}>
                    Editar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop:'12px', padding:'12px 16px', background:'#1e293b', border:'1px solid #334155', borderRadius:'10px', fontSize:'12px', color:'#64748b' }}>
        <strong style={{ color:'#94a3b8' }}>Tipos de pago:</strong>
        &nbsp; <span style={{ color:'#60a5fa' }}>1 Pago</span> — se cobra una sola vez al inscribirse &nbsp;·&nbsp;
        <span style={{ color:'#fbbf24' }}>Cuotas</span> — se divide en varias mensualidades &nbsp;·&nbsp;
        <span style={{ color:'#4ade80' }}>Mensual</span> — se cobra cada mes durante el proceso &nbsp;·&nbsp;
        <span style={{ color:'#94a3b8' }}>Dto.</span> — descuento aplicable si el aspirante paga todo de una vez
      </div>
    </div>
  );
}

// ── Formulario completo de pago ───────────────────────────────
function PaymentForm({ aspirants, concepts, onSave, onCancel }) {
  const [aspirantId, setAspirantId] = useState('');
  const [selected, setSelected]     = useState({});
  const [markAsPaid, setMarkAsPaid] = useState(false);
  const [payType, setPayType]       = useState('direct');
  const [dueDate, setDueDate]       = useState('');
  const [notes, setNotes]           = useState('');
  const [voucher, setVoucher]       = useState(null);
  const [transfer, setTransfer]     = useState({ bank:'', ref:'', date:'' });
  const [sri, setSri]               = useState({ ruc:'', razon:'', numero:'', fecha:'', autorizacion:'', clave:'' });
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  const toggleConcept = (concept) => {
    setSelected(prev => {
      const next = {...prev};
      if (next[concept.id]) { delete next[concept.id]; }
      else { next[concept.id] = { amount: parseFloat(concept.amount), period: '', discount_pct: 0 }; }
      return next;
    });
  };

  const setConceptField = (id, field, val) => {
    setSelected(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }));
  };

  const selectedList = concepts.filter(c => selected[c.id]);
  const subtotal = selectedList.reduce((sum, c) => {
    const s = selected[c.id];
    const disc = s.discount_pct > 0 ? (1 - s.discount_pct / 100) : 1;
    return sum + (parseFloat(s.amount) || 0) * disc;
  }, 0);

  const handleSubmit = async () => {
    if (!aspirantId) { setError('Selecciona un aspirante'); return; }
    if (selectedList.length === 0) { setError('Selecciona al menos un concepto'); return; }
    setLoading(true); setError('');
    try {
      for (const concept of selectedList) {
        const s = selected[concept.id];
        const disc = s.discount_pct > 0 ? (1 - s.discount_pct / 100) : 1;
        const finalAmount = ((parseFloat(s.amount) || 0) * disc).toFixed(2);
        const fd = new FormData();
        fd.append('aspirant_id',  aspirantId);
        fd.append('concept_id',   concept.id);
        fd.append('amount',       finalAmount);
        fd.append('payment_type', payType);
        fd.append('mark_as_paid', String(markAsPaid));
        if (s.period)           fd.append('period',          s.period);
        if (dueDate)            fd.append('due_date',        dueDate);
        if (notes)              fd.append('notes',           notes);
        if (s.discount_pct > 0) fd.append('discount_pct',   s.discount_pct);
        if (transfer.bank)      fd.append('transfer_bank',   transfer.bank);
        if (transfer.ref)       fd.append('transfer_ref',    transfer.ref);
        if (transfer.date)      fd.append('transfer_date',   transfer.date);
        if (sri.ruc)            fd.append('sri_ruc_emisor',  sri.ruc);
        if (sri.razon)          fd.append('sri_razon_social',sri.razon);
        if (sri.numero)         fd.append('sri_numero',      sri.numero);
        if (sri.fecha)          fd.append('sri_fecha_emision',sri.fecha);
        if (sri.autorizacion)   fd.append('sri_autorizacion',sri.autorizacion);
        if (sri.clave)          fd.append('sri_claveacceso', sri.clave);
        if (voucher)            fd.append('voucher',         voucher);
        const r = await fetch(`${API}/payments`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${getToken()}` },
          body: fd,
        });
        const d = await r.json();
        if (!r.ok) throw new Error(`${concept.name}: ${d.error}`);
      }
      onSave();
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const S = { width:'100%', background:'#0f172a', border:'1px solid #334155', borderRadius:'8px', color:'#f1f5f9', fontSize:'14px', padding:'8px 12px', outline:'none', boxSizing:'border-box' };
  const L = { color:'#94a3b8', fontSize:'12px', marginBottom:'4px', display:'block', fontWeight:'500' };
  const TIPO_COLOR = { unique:'#60a5fa', installment:'#fbbf24', recurring:'#4ade80' };
  const TIPO_LABEL = { unique:'1 Pago', installment:'Cuotas', recurring:'Mensual' };

  return (
    <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:'12px', padding:'24px', marginBottom:'24px' }}>
      <h3 style={{ color:'#fff', fontWeight:'bold', fontSize:'16px', marginBottom:'20px' }}>➕ Registrar Pago</h3>
      {error && <div style={{ background:'#7f1d1d33', border:'1px solid #991b1b', color:'#fca5a5', borderRadius:'8px', padding:'10px', marginBottom:'16px', fontSize:'13px' }}>⚠ {error}</div>}

      {/* Aspirante */}
      <div style={{ marginBottom:'16px' }}>
        <label style={L}>Aspirante *</label>
        <select style={S} value={aspirantId} onChange={e => setAspirantId(e.target.value)}>
          <option value="">Seleccionar aspirante...</option>
          {aspirants.map(a => <option key={a.id} value={a.id}>{a.first_name} {a.last_name} — CI: {a.cedula}</option>)}
        </select>
      </div>

      {/* Selección múltiple de conceptos */}
      <div style={{ marginBottom:'16px' }}>
        <label style={L}>Selecciona los rubros a cancelar *</label>
        <div style={{ background:'#0f172a', border:'1px solid #334155', borderRadius:'10px', overflow:'hidden' }}>
          {/* Header tabla */}
          <div style={{ display:'grid', gridTemplateColumns:'2.5fr 0.8fr 1fr 1.2fr', padding:'8px 14px', background:'#111827', borderBottom:'1px solid #334155' }}>
            {['Concepto', 'Tipo', 'Monto', 'Período / Dto.%'].map(h => (
              <div key={h} style={{ color:'#64748b', fontSize:'10px', fontWeight:'bold', textTransform:'uppercase' }}>{h}</div>
            ))}
          </div>

          {concepts.map((c, i) => {
            const isSel = !!selected[c.id];
            const s = selected[c.id] || {};
            const col = TIPO_COLOR[c.tipo || 'unique'];
            return (
              <div key={c.id}
                onClick={() => toggleConcept(c)}
                style={{
                  display:'grid', gridTemplateColumns:'2.5fr 0.8fr 1fr 1.2fr',
                  padding:'10px 14px', alignItems:'center', cursor:'pointer',
                  background: isSel ? '#1d4ed815' : i % 2 === 0 ? '#0f172a' : '#111827',
                  borderBottom:'1px solid #1e293b',
                  borderLeft: isSel ? '3px solid #ca8a04' : '3px solid transparent',
                  transition:'background 0.15s',
                }}>
                {/* Checkbox + nombre */}
                <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                  <div style={{
                    width:'18px', height:'18px', borderRadius:'4px', flexShrink:0,
                    background: isSel ? '#ca8a04' : '#1e293b',
                    border: isSel ? '2px solid #ca8a04' : '2px solid #475569',
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                    {isSel && <span style={{ color:'#fff', fontSize:'12px', fontWeight:'bold' }}>✓</span>}
                  </div>
                  <div>
                    <div style={{ color: isSel ? '#fff' : '#94a3b8', fontWeight: isSel ? '700' : '400', fontSize:'13px' }}>{c.name}</div>
                    {c.max_installments > 1 && <div style={{ color:'#64748b', fontSize:'10px' }}>máx {c.max_installments} cuotas · dto {c.discount_min_pct}–{c.discount_max_pct}%</div>}
                  </div>
                </div>
                {/* Tipo */}
                <div onClick={e => e.stopPropagation()}>
                  <span style={{ background:col+'22', color:col, border:`1px solid ${col}55`, borderRadius:'999px', padding:'2px 7px', fontSize:'10px', fontWeight:'700' }}>
                    {TIPO_LABEL[c.tipo || 'unique']}
                  </span>
                </div>
                {/* Monto editable */}
                <div onClick={e => e.stopPropagation()}>
                  {isSel ? (
                    <input type="number" step="0.01" min="0" value={s.amount}
                      onChange={e => setConceptField(c.id, 'amount', e.target.value)}
                      style={{ width:'90px', background:'#1e293b', border:'1px solid #ca8a04', borderRadius:'6px', color:'#facc15', fontSize:'13px', fontWeight:'700', padding:'4px 6px', outline:'none', textAlign:'right' }}
                    />
                  ) : (
                    <span style={{ color:'#64748b', fontSize:'13px' }}>${parseFloat(c.amount).toFixed(2)}</span>
                  )}
                </div>
                {/* Período + descuento */}
                <div onClick={e => e.stopPropagation()} style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                  {isSel && c.tipo === 'recurring' && (
                    <input type="month" value={s.period || ''}
                      onChange={e => setConceptField(c.id, 'period', e.target.value)}
                      style={{ width:'130px', background:'#1e293b', border:'1px solid #334155', borderRadius:'6px', color:'#94a3b8', fontSize:'11px', padding:'3px 6px', outline:'none' }}
                    />
                  )}
                  {isSel && parseFloat(c.discount_max_pct || 0) > 0 && (
                    <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                      <input type="number" min="0" max={c.discount_max_pct} step="0.5"
                        value={s.discount_pct || 0}
                        onChange={e => setConceptField(c.id, 'discount_pct', e.target.value)}
                        style={{ width:'50px', background:'#1e293b', border:'1px solid #334155', borderRadius:'6px', color:'#4ade80', fontSize:'11px', padding:'3px 5px', outline:'none', textAlign:'center' }}
                      />
                      <span style={{ color:'#64748b', fontSize:'11px' }}>% dto</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Total */}
          {selectedList.length > 0 && (
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', background:'#0f172a', borderTop:'2px solid #374151' }}>
              <span style={{ color:'#94a3b8', fontSize:'12px' }}>{selectedList.length} concepto{selectedList.length > 1 ? 's' : ''} seleccionado{selectedList.length > 1 ? 's' : ''}</span>
              <div>
                <span style={{ color:'#facc15', fontWeight:'800', fontSize:'20px' }}>${subtotal.toFixed(2)}</span>
                <span style={{ color:'#64748b', fontSize:'12px', marginLeft:'6px' }}>USD</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fecha límite + Notas */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px', marginBottom:'16px' }}>
        <div><label style={L}>Fecha límite de pago</label><input style={S} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
        <div><label style={L}>Observaciones</label><input style={S} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opcional" /></div>
      </div>

      {/* Toggle pagado/pendiente */}
      <div style={{ background:'#0f172a', border:'1px solid #334155', borderRadius:'10px', padding:'14px', marginBottom:'16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <button onClick={() => setMarkAsPaid(!markAsPaid)}
            style={{ width:'44px', height:'24px', borderRadius:'999px', border:'none', cursor:'pointer', position:'relative', flexShrink:0, background:markAsPaid ? '#16a34a' : '#374151', transition:'background 0.2s' }}>
            <span style={{ position:'absolute', top:'2px', width:'20px', height:'20px', background:'#fff', borderRadius:'50%', transition:'left 0.2s', left:markAsPaid ? '22px' : '2px' }} />
          </button>
          <div>
            <div style={{ color:'#fff', fontWeight:'600', fontSize:'14px' }}>
              {markAsPaid ? '✅ Registrar como PAGADO' : '⏳ Registrar como PENDIENTE'}
            </div>
            <div style={{ color:'#64748b', fontSize:'12px' }}>
              {markAsPaid ? 'Quedará confirmado y podrás generar el comprobante' : 'Quedará pendiente hasta confirmar el pago'}
            </div>
          </div>
        </div>
      </div>

      {/* Método de pago */}
      <div style={{ marginBottom:'16px' }}>
        <label style={L}>Método de pago</label>
        <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
          {PAY_TYPES.map(pt => (
            <button key={pt.value} onClick={() => setPayType(pt.value)}
              style={{ padding:'8px 16px', borderRadius:'8px', fontSize:'13px', fontWeight:'600', cursor:'pointer',
                background:payType===pt.value?'#ca8a0433':'#0f172a', color:payType===pt.value?'#fbbf24':'#64748b',
                border:payType===pt.value?'2px solid #ca8a04':'2px solid #334155' }}>
              {pt.label}<div style={{ fontSize:'10px', fontWeight:'400', marginTop:'2px' }}>{pt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {payType === 'transfer' && (
        <div style={{ background:'#0f172a', border:'1px solid #1d4ed8', borderRadius:'10px', padding:'16px', marginBottom:'16px' }}>
          <div style={{ color:'#60a5fa', fontWeight:'700', fontSize:'13px', marginBottom:'12px' }}>🏦 Datos de Transferencia</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px' }}>
            <div><label style={L}>Banco</label><input style={S} value={transfer.bank} onChange={e => setTransfer(p => ({...p, bank:e.target.value}))} placeholder="Banco Pichincha" /></div>
            <div><label style={L}>N° Referencia</label><input style={S} value={transfer.ref} onChange={e => setTransfer(p => ({...p, ref:e.target.value}))} /></div>
            <div><label style={L}>Fecha</label><input style={S} type="date" value={transfer.date} onChange={e => setTransfer(p => ({...p, date:e.target.value}))} /></div>
          </div>
        </div>
      )}

      {payType === 'invoice' && (
        <div style={{ background:'#0f172a', border:'1px solid #15803d', borderRadius:'10px', padding:'16px', marginBottom:'16px' }}>
          <div style={{ color:'#4ade80', fontWeight:'700', fontSize:'13px', marginBottom:'12px' }}>📄 Datos Factura SRI</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            <div><label style={L}>RUC Emisor</label><input style={S} value={sri.ruc} onChange={e => setSri(p => ({...p, ruc:e.target.value}))} maxLength={13} /></div>
            <div><label style={L}>Razón Social</label><input style={S} value={sri.razon} onChange={e => setSri(p => ({...p, razon:e.target.value}))} /></div>
            <div><label style={L}>N° Factura</label><input style={S} value={sri.numero} onChange={e => setSri(p => ({...p, numero:e.target.value}))} placeholder="001-001-000000001" /></div>
            <div><label style={L}>Fecha Emisión</label><input style={S} type="date" value={sri.fecha} onChange={e => setSri(p => ({...p, fecha:e.target.value}))} /></div>
            <div style={{gridColumn:'span 2'}}><label style={L}>N° Autorización SRI</label><input style={S} value={sri.autorizacion} onChange={e => setSri(p => ({...p, autorizacion:e.target.value}))} /></div>
            <div style={{gridColumn:'span 2'}}><label style={L}>Clave de Acceso</label><input style={S} value={sri.clave} onChange={e => setSri(p => ({...p, clave:e.target.value}))} /></div>
          </div>
        </div>
      )}

      {/* Voucher */}
      {(markAsPaid || payType !== 'direct') && (
        <div style={{ marginBottom:'16px' }}>
          <label style={L}>📎 Comprobante / Voucher</label>
          <div style={{ border:`2px dashed ${voucher ? '#16a34a' : '#334155'}`, borderRadius:'10px', padding:'16px', textAlign:'center', cursor:'pointer', background:voucher?'#14532d15':'#0f172a' }}
            onClick={() => document.getElementById('v-inp-multi').click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) setVoucher(file); }}>
            {voucher ? (
              <div>
                <div style={{ fontSize:'24px' }}>📎</div>
                <div style={{ color:'#4ade80', fontWeight:'600', fontSize:'13px' }}>{voucher.name}</div>
                <button onClick={e => { e.stopPropagation(); setVoucher(null); }}
                  style={{ marginTop:'6px', padding:'2px 10px', background:'#7f1d1d33', color:'#f87171', border:'1px solid #991b1b', borderRadius:'6px', fontSize:'11px', cursor:'pointer' }}>
                  Quitar
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize:'28px' }}>☁️</div>
                <div style={{ color:'#94a3b8', fontSize:'13px', marginTop:'4px' }}>
                  Arrastra o <span style={{ color:'#60a5fa' }}>haz clic para seleccionar</span>
                </div>
                <div style={{ color:'#64748b', fontSize:'11px', marginTop:'2px' }}>PDF, JPG, PNG — máx 10MB</div>
              </div>
            )}
            <input id="v-inp-multi" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"
              style={{ display:'none' }} onChange={e => setVoucher(e.target.files[0] || null)} />
          </div>
        </div>
      )}

      <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
        <button onClick={handleSubmit} disabled={loading || selectedList.length === 0}
          style={{ padding:'10px 24px', borderRadius:'8px', fontWeight:'bold', fontSize:'14px',
            background: loading || selectedList.length === 0 ? '#374151' : markAsPaid ? '#16a34a' : '#ca8a04',
            color:'#fff', border:'none', cursor: loading || selectedList.length === 0 ? 'not-allowed' : 'pointer' }}>
          {loading
            ? `Guardando ${selectedList.length} pago(s)...`
            : markAsPaid
              ? `✅ Confirmar ${selectedList.length} pago(s) — $${subtotal.toFixed(2)}`
              : `💾 Registrar ${selectedList.length} cobro(s) pendiente(s) — $${subtotal.toFixed(2)}`}
        </button>
        <button onClick={onCancel}
          style={{ padding:'10px 20px', borderRadius:'8px', background:'#1e293b', color:'#94a3b8', border:'1px solid #334155', cursor:'pointer', fontSize:'14px' }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}


// ── Página principal ──────────────────────────────────────────
// ── Modal confirmar pago ──────────────────────────────────────
function PayConfirmModal({ payment, onSave, onClose }) {
  const [payType, setPayType]   = useState('direct');
  const [voucher, setVoucher]   = useState(null);
  const [notes,   setNotes]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState('');
  const [transfer, setTransfer] = useState({ bank:'', ref:'', date:'' });
  const [montoAbono, setMontoAbono] = useState(parseFloat(payment.saldo_pendiente || payment.amount || 0).toFixed(2));
  const esAbonoParcial = parseFloat(montoAbono) < parseFloat(payment.saldo_pendiente || payment.amount || 0);

  const handleConfirm = async () => {
    setLoading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('payment_type', payType);
      if (notes)          fd.append('notes',        notes);
      if (transfer.bank)  fd.append('transfer_bank', transfer.bank);
      if (transfer.ref)   fd.append('transfer_ref',  transfer.ref);
      if (transfer.date)  fd.append('transfer_date', transfer.date);
      if (voucher)        fd.append('voucher', voucher);
      const saldo = parseFloat(payment.saldo_pendiente || payment.amount || 0);
      const abono = parseFloat(montoAbono);
      const esAbono = abono < saldo;
      if (esAbono) {
        fd.append('monto_abono', montoAbono);
        var r = await fetch(`${API}/payments/${payment.id}/abono`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${getToken()}` },
          body: fd,
        });
      } else {
        var r = await fetch(`${API}/payments/${payment.id}/pay`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${getToken()}` },
          body: fd,
        });
      }
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      onSave();
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const S = { width:'100%', background:'#0f172a', border:'1px solid #334155', borderRadius:'8px', color:'#f1f5f9', fontSize:'13px', padding:'7px 10px', outline:'none', boxSizing:'border-box' };
  const L = { color:'#94a3b8', fontSize:'11px', marginBottom:'3px', display:'block' };

  return (
    <div style={{ position:'fixed', inset:0, background:'#000000bb', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:'16px', padding:'28px', width:'100%', maxWidth:'540px', maxHeight:'90vh', overflowY:'auto' }}>
        <h3 style={{ color:'#fff', fontWeight:'bold', fontSize:'16px', marginBottom:'6px' }}>Confirmar Pago</h3>
        <p style={{ color:'#94a3b8', fontSize:'13px', marginBottom:'20px' }}>
          {payment.concept_name} — <strong style={{ color:'#facc15' }}>${parseFloat(payment.amount).toFixed(2)}</strong>
          <span style={{ color:'#64748b', marginLeft:'8px' }}>{payment.aspirant_name}</span>
        </p>

        {error && <div style={{ background:'#7f1d1d33', color:'#fca5a5', borderRadius:'8px', padding:'8px 12px', marginBottom:'12px', fontSize:'12px' }}>⚠ {error}</div>}

        {/* Monto a pagar */}
        <div style={{ marginBottom:'14px', background:'#0f172a', border:'1px solid #334155', borderRadius:'10px', padding:'12px' }}>
          <label style={{ color:'#94a3b8', fontSize:'11px', display:'block', marginBottom:'4px' }}>
            Monto a pagar (Saldo pendiente: ${parseFloat(payment.saldo_pendiente||payment.amount||0).toFixed(2)})
          </label>
          <input type="number" min="0.01" step="0.01"
            max={parseFloat(payment.saldo_pendiente||payment.amount||0)}
            value={montoAbono}
            onChange={e=>setMontoAbono(e.target.value)}
            style={{ width:'100%', background:'#1e293b', border:'2px solid #ca8a04', borderRadius:'8px', color:'#fbbf24', fontSize:'18px', fontWeight:'bold', padding:'8px 12px', outline:'none', boxSizing:'border-box' }} />
          {esAbonoParcial && (
            <p style={{ color:'#f59e0b', fontSize:'11px', marginTop:'4px' }}>
              Abono parcial. Saldo restante: ${(parseFloat(payment.saldo_pendiente||payment.amount||0) - parseFloat(montoAbono||0)).toFixed(2)}
            </p>
          )}
        </div>

        {/* Método */}
        <div style={{ display:'flex', gap:'8px', marginBottom:'14px', flexWrap:'wrap' }}>
          {[{v:'direct',l:'💵 Efectivo'},{v:'transfer',l:'🏦 Transferencia'},{v:'invoice',l:'📄 Factura SRI'}].map(t=>(
            <button key={t.v} onClick={()=>setPayType(t.v)}
              style={{ padding:'6px 14px', borderRadius:'8px', fontSize:'12px', fontWeight:'600', cursor:'pointer',
                background:payType===t.v?'#ca8a0433':'#0f172a', color:payType===t.v?'#fbbf24':'#64748b',
                border:payType===t.v?'2px solid #ca8a04':'2px solid #334155' }}>
              {t.l}
            </button>
          ))}
        </div>

        {payType==='transfer' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'12px' }}>
            <div><label style={L}>Banco</label><input style={S} value={transfer.bank} onChange={e=>setTransfer(p=>({...p,bank:e.target.value}))} placeholder="Banco Pichincha" /></div>
            <div><label style={L}>N° Referencia</label><input style={S} value={transfer.ref} onChange={e=>setTransfer(p=>({...p,ref:e.target.value}))} /></div>
            <div style={{gridColumn:'span 2'}}><label style={L}>Fecha</label><input style={S} type="date" value={transfer.date} onChange={e=>setTransfer(p=>({...p,date:e.target.value}))} /></div>
          </div>
        )}

        <div style={{ marginBottom:'12px' }}>
          <label style={L}>Observaciones</label>
          <input style={S} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Opcional" />
        </div>

        {/* Voucher upload */}
        <div style={{ marginBottom:'16px' }}>
          <label style={L}>📎 Comprobante / Voucher</label>
          <div style={{ border:`2px dashed ${voucher?'#16a34a':'#334155'}`, borderRadius:'10px', padding:'14px', textAlign:'center', cursor:'pointer', background:voucher?'#14532d15':'#0f172a' }}
            onClick={()=>document.getElementById('pay-voucher').click()}
            onDragOver={e=>e.preventDefault()}
            onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)setVoucher(f);}}>
            {voucher ? (
              <div>
                <div style={{ fontSize:'22px' }}>📎</div>
                <div style={{ color:'#4ade80', fontWeight:'600', fontSize:'13px' }}>{voucher.name}</div>
                <div style={{ color:'#64748b', fontSize:'11px' }}>{(voucher.size/1024/1024).toFixed(2)} MB</div>
                <button onClick={e=>{e.stopPropagation();setVoucher(null);}}
                  style={{ marginTop:'4px', padding:'2px 10px', background:'#7f1d1d33', color:'#f87171', border:'1px solid #991b1b', borderRadius:'6px', fontSize:'11px', cursor:'pointer' }}>
                  Quitar
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize:'24px' }}>☁️</div>
                <div style={{ color:'#94a3b8', fontSize:'12px', marginTop:'4px' }}>
                  Arrastra o <span style={{ color:'#60a5fa' }}>haz clic para adjuntar</span>
                </div>
                <div style={{ color:'#64748b', fontSize:'10px', marginTop:'2px' }}>PDF, JPG, PNG — máx 10MB (opcional)</div>
              </div>
            )}
            <input id="pay-voucher" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"
              style={{ display:'none' }} onChange={e=>setVoucher(e.target.files[0]||null)} />
          </div>
        </div>

        <div style={{ display:'flex', gap:'10px' }}>
          <button onClick={handleConfirm} disabled={loading}
            style={{ padding:'10px 24px', borderRadius:'8px', fontWeight:'bold', fontSize:'14px', background:loading?'#374151':'#16a34a', color:'#fff', border:'none', cursor:loading?'not-allowed':'pointer' }}>
            {loading ? 'Procesando...' : '✅ Confirmar Pago'}
          </button>
          <button onClick={onClose}
            style={{ padding:'10px 20px', borderRadius:'8px', background:'#374151', color:'#9ca3af', border:'none', cursor:'pointer', fontSize:'14px' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function generateSRIConsolidado(pagos, aspirantName, aspirantCedula) {
  const win = window.open('', '_blank');
  const total    = pagos.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const iva      = parseFloat((total * 0.15).toFixed(2));
  const subtotal = parseFloat((total - iva).toFixed(2));
  const fecha    = new Date().toLocaleDateString('es-EC', {day:'2-digit',month:'2-digit',year:'numeric'});
  const p0       = pagos[0] || {};
  const razonSocial = p0.sri_razon_social || 'ACADEMIA MILITAR DIGITAL';
  const ruc         = p0.sri_ruc_emisor   || '-';
  const num         = p0.sri_numero       || '001-001-000000000';
  const filas = pagos.map((p, i) => '<tr><td style="text-align:center;border:1px solid #ccc;padding:4px">'+(i+1)+'</td><td style="border:1px solid #ccc;padding:4px">'+(p.concept_name||p.concept||'-')+'</td><td style="text-align:right;border:1px solid #ccc;padding:4px">$'+parseFloat(p.amount).toFixed(2)+'</td></tr>').join('');
  const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;font-size:12px;padding:20px}.page{width:700px;margin:0 auto;border:2px solid #000}h1{font-size:14px;text-transform:uppercase}table{width:100%;border-collapse:collapse}.no-print{text-align:center;margin-bottom:12px}@media print{.no-print{display:none}}</style></head><body>'
    +'<div class="no-print"><button onclick="window.print()" style="background:#1d4ed8;color:#fff;border:none;padding:8px 20px;border-radius:4px;cursor:pointer;margin-right:8px">Imprimir</button><button onclick="window.close()" style="background:#6b7280;color:#fff;border:none;padding:8px 20px;border-radius:4px;cursor:pointer">Cerrar</button></div>'
    +'<div class="page" style="padding:20px">'
    +'<div style="display:flex;justify-content:space-between;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:10px">'
    +'<div><h1>'+razonSocial+'</h1><p>RUC: '+ruc+'</p><p>Quito, Ecuador</p></div>'
    +'<div style="text-align:center"><div style="border:2px solid #000;padding:6px;font-weight:bold;font-size:13px">COMPROBANTE DE PAGO</div><div style="font-size:11px;margin-top:4px">'+num+'</div><div style="font-size:10px">Fecha: '+fecha+'</div></div></div>'
    +'<table style="margin-bottom:10px"><tr><td style="width:120px;font-weight:bold">Cliente:</td><td style="border-bottom:1px solid #777;min-width:200px">'+aspirantName+'</td><td style="width:80px;font-weight:bold">Cedula:</td><td style="border-bottom:1px solid #777">'+aspirantCedula+'</td></tr></table>'
    +'<table style="border-collapse:collapse;width:100%;margin-bottom:10px"><thead><tr style="background:#ddd"><th style="border:1px solid #999;padding:4px">#</th><th style="border:1px solid #999;padding:4px">Descripcion</th><th style="border:1px solid #999;padding:4px;text-align:right">Total</th></tr></thead><tbody>'+filas+'</tbody></table>'
    +'<table style="margin-left:auto;width:280px"><tr><td style="font-weight:bold">Subtotal 15%:</td><td style="text-align:right">$'+subtotal.toFixed(2)+'</td></tr><tr><td style="font-weight:bold">IVA 15%:</td><td style="text-align:right">$'+iva.toFixed(2)+'</td></tr><tr style="background:#eee;font-weight:bold;font-size:13px"><td>TOTAL:</td><td style="text-align:right">$'+total.toFixed(2)+'</td></tr></table>'
    +'<p style="font-size:9px;color:#555;text-align:center;margin-top:10px">Comprobante interno - Academia Militar Digital</p>'
    +'</div></body></html>';
  win.document.write(html);
  win.document.close();
}

export default function PaymentsPage() {
  const router = useRouter();
  const [payments,  setPayments]  = useState([]);
  const [concepts,  setConcepts]  = useState([]);
  const [aspirants, setAspirants] = useState([]);
  const [summary,   setSummary]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [payModal,  setPayModal]  = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search,    setSearch]    = useState('');
  const [activeTab, setActiveTab] = useState('pagos');

  useEffect(()=>{ const t=localStorage.getItem('access_token'); if(!t) router.push('/login'); },[router]);

  const loadAll = useCallback(async()=>{
    try {
      setLoading(true);
      const [p,c,a,s] = await Promise.all([
        apiFetch('/payments?limit=100'),
        apiFetch('/payments/concepts'),
        apiFetch('/aspirants?limit=200'),
        apiFetch('/payments/summary'),
      ]);
      setPayments(p.payments??[]);
      setConcepts(c.concepts??[]);
      setAspirants(a.aspirants??a.data??[]);
      setSummary(s);
    } catch(e){ console.error(e); }
    finally{ setLoading(false); }
  },[]);

  useEffect(()=>{ loadAll(); },[loadAll]);

  const handleDelete = async(id)=>{
    if(!confirm('¿Eliminar este registro de pago?')) return;
    await apiFetch(`/payments/${id}`,{method:'DELETE'});
    loadAll();
  };

  const filtered = payments.filter(p=>{
    if (p.es_abono) return false;
    const m = !search||`${p.aspirant_name} ${p.aspirant_cedula} ${p.concept_name}`.toLowerCase().includes(search.toLowerCase());
    return m&&(!statusFilter||p.status===statusFilter);
  });

  const TABS=[{key:'pagos',label:'📋 Registros'},{key:'resumen',label:'📊 Resumen'},{key:'conceptos',label:'⚙️ Conceptos'}];

  return (
    <div style={{ minHeight:'100vh', background:'#0f172a' }}>
      <header style={{ background:'#1e293b', borderBottom:'1px solid #334155', padding:'16px 24px', position:'sticky', top:0, zIndex:10 }}>
        <div style={{ maxWidth:'1200px', margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'12px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
            <button onClick={()=>router.push('/dashboard')} style={{ color:'#94a3b8', background:'none', border:'none', cursor:'pointer', fontSize:'14px' }}>← Dashboard</button>
            <div style={{ width:'1px', height:'20px', background:'#334155' }}/>
            <div>
              <h1 style={{ color:'#fff', fontWeight:'bold', margin:0 }}>Módulo de Pagos</h1>
              <p style={{ color:'#64748b', fontSize:'13px', margin:0 }}>Matrículas, pensiones y cobros · Soporte SRI Ecuador</p>
            </div>
          </div>
          {!showForm&&activeTab==='pagos'&&(
            <button onClick={()=>setShowForm(true)}
              style={{ padding:'8px 18px', background:'#ca8a04', color:'#fff', border:'none', borderRadius:'8px', fontWeight:'bold', fontSize:'13px', cursor:'pointer' }}>
              + Nuevo Registro
            </button>
          )}
        </div>
      </header>

      <main style={{ maxWidth:'1200px', margin:'0 auto', padding:'32px 24px' }}>
        {/* Métricas */}
        {summary&&(
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'24px' }}>
            {[
              {label:'Total Recaudado', val:`$${parseFloat(summary.stats?.total_collected||0).toFixed(2)}`, color:'#4ade80', border:'#166534'},
              {label:'Por Cobrar',      val:`$${parseFloat(summary.stats?.total_pending||0).toFixed(2)}`,   color:'#facc15', border:'#92400e'},
              {label:'Pendientes',      val:summary.stats?.pending||0,  color:'#facc15', border:'#92400e'},
              {label:'Vencidos',        val:summary.stats?.overdue||0,  color:'#f87171', border:'#991b1b'},
            ].map(item=>(
              <div key={item.label} style={{ background:'#1e293b', border:`1px solid ${item.border}`, borderRadius:'10px', padding:'16px', textAlign:'center' }}>
                <div style={{ fontSize:'1.6rem', fontWeight:'bold', color:item.color }}>{item.val}</div>
                <div style={{ color:'#94a3b8', fontSize:'12px', marginTop:'4px' }}>{item.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display:'flex', gap:'4px', background:'#1e293b', border:'1px solid #334155', borderRadius:'12px', padding:'4px', width:'fit-content', marginBottom:'24px' }}>
          {TABS.map(t=>(
            <button key={t.key} onClick={()=>{setActiveTab(t.key);setShowForm(false);}}
              style={{ padding:'8px 18px', borderRadius:'8px', fontSize:'13px', fontWeight:'500', border:'none', cursor:'pointer',
                background:activeTab===t.key?'#374151':'transparent', color:activeTab===t.key?'#fff':'#94a3b8' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* TAB Registros */}
        {activeTab==='pagos'&&(
          <>
            {showForm&&(
              <PaymentForm aspirants={aspirants} concepts={concepts}
                onSave={()=>{ setShowForm(false); loadAll(); }}
                onCancel={()=>setShowForm(false)} />
            )}

            <div style={{ display:'flex', gap:'10px', marginBottom:'16px', flexWrap:'wrap' }}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar aspirante, cédula o concepto..."
                style={{ flex:1, minWidth:'250px', background:'#1e293b', border:'1px solid #334155', borderRadius:'8px', color:'#f1f5f9', fontSize:'14px', padding:'8px 14px', outline:'none' }}/>
              <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
                style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:'8px', color:'#f1f5f9', fontSize:'14px', padding:'8px 14px', outline:'none' }}>
                <option value="">Todos los estados</option>
                <option value="pending">Pendientes</option>
                <option value="paid">Pagados</option>
                <option value="overdue">Vencidos</option>
              </select>
            </div>

            <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:'12px', overflow:'hidden' }}>
              {loading?(
                <div style={{ textAlign:'center', padding:'40px', color:'#64748b' }}>Cargando...</div>
              ):filtered.length===0?(
                <div style={{ textAlign:'center', padding:'40px', color:'#64748b' }}>Sin registros de pago.</div>
              ):(() => {
                // Agrupar por aspirante
                const grupos = {};
                filtered.filter(x => !x.es_abono).forEach(pay => {
                  const key = pay.aspirant_cedula;
                  if (!grupos[key]) grupos[key] = { name: pay.aspirant_name, cedula: pay.aspirant_cedula, pagos: [] };
                  grupos[key].pagos.push(pay);
                });
                return Object.values(grupos).map(grupo => (
                  <div key={grupo.cedula}>
                    {/* Encabezado del aspirante */}
                    <div style={{ background:'#0f2744', padding:'12px 20px', borderBottom:'2px solid #1e40af', borderTop:'2px solid #1e40af', display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'8px' }}>
                      <div>
                        <div style={{ color:'#fff', fontWeight:'800', fontSize:'16px', letterSpacing:'0.5px' }}>{grupo.name}</div>
                        <div style={{ color:'#64748b', fontSize:'12px', fontFamily:'monospace', marginTop:'2px' }}>CI: {grupo.cedula}</div>
                      </div>
                      <div style={{ display:'flex', gap:'24px', alignItems:'center' }}>
                        <div style={{ textAlign:'center' }}>
                          <div style={{ color:'#64748b', fontSize:'10px', textTransform:'uppercase', letterSpacing:'1px' }}>Total</div>
                          <div style={{ color:'#94a3b8', fontWeight:'700', fontSize:'18px' }}>${grupo.pagos.reduce((s,x)=>s+parseFloat(x.amount||0),0).toFixed(2)}</div>
                        </div>
                        <div style={{ width:'1px', height:'32px', background:'#1e3a5f' }} />
                        <div style={{ textAlign:'center' }}>
                          <div style={{ color:'#64748b', fontSize:'10px', textTransform:'uppercase', letterSpacing:'1px' }}>Pagado</div>
                          <div style={{ color:'#4ade80', fontWeight:'700', fontSize:'18px' }}>${grupo.pagos.reduce((s,x)=>s+parseFloat(x.monto_pagado||0),0).toFixed(2)}</div>
                        </div>
                        <div style={{ width:'1px', height:'32px', background:'#1e3a5f' }} />
                        <div style={{ textAlign:'center' }}>
                          <div style={{ color:'#64748b', fontSize:'10px', textTransform:'uppercase', letterSpacing:'1px' }}>Saldo</div>
                          <div style={{ color: grupo.pagos.reduce((s,x)=>s+parseFloat(x.saldo_pendiente||0),0)>0?'#facc15':'#4ade80', fontWeight:'700', fontSize:'18px' }}>${grupo.pagos.reduce((s,x)=>s+parseFloat(x.saldo_pendiente||0),0).toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                    {/* Subheader columnas */}
                    <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 1.5fr', padding:'6px 20px', background:'#0a1628', borderBottom:'1px solid #1e3a5f' }}>
                      {['Concepto','Total','Pagado','Saldo','Estado','Acciones'].map(h=>(
                        <div key={h} style={{ color:'#94a3b8', fontSize:'12px', fontWeight:'800', textTransform:'uppercase', letterSpacing:'1.5px' }}>{h}</div>
                      ))}
                    </div>
                    {/* Filas del aspirante */}
                    {grupo.pagos.map((p,i) => (
                      <div key={p.id} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 1.5fr', padding:'10px 16px', alignItems:'center',
                        background:i%2===0?'#1e293b':'#1a2332', borderBottom:'1px solid #1e3a5f22' }}>
                        <div>
                          <div style={{ color:'#e2e8f0', fontSize:'13px', fontWeight:'500' }}>{p.concept_name}</div>
                          {p.comprobante_data?.filename&&(
                            <a href={`${API}/payments/voucher/${p.comprobante_data.filename}`} target="_blank" rel="noopener noreferrer"
                              style={{ color:'#a78bfa', fontSize:'10px', textDecoration:'none' }}>📎 Voucher</a>
                          )}
                        </div>
                        <div style={{ color:'#94a3b8', fontWeight:'600', fontSize:'13px' }}>${parseFloat(p.amount||0).toFixed(2)}</div>
                        <div style={{ color:'#4ade80', fontWeight:'700', fontSize:'13px' }}>${parseFloat(p.monto_pagado||0).toFixed(2)}</div>
                        <div style={{ color:parseFloat(p.saldo_pendiente||0)>0?'#facc15':'#4ade80', fontWeight:'700', fontSize:'13px' }}>${parseFloat(p.saldo_pendiente||0).toFixed(2)}</div>
                        <div><Badge status={p.status}/></div>
                        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', justifyContent:'flex-end', alignItems:'center' }}>
                          {p.status !== 'paid' && (
                            <button onClick={() => setPayModal(p)}
                              style={{ padding:'3px 8px', background:'#14532d33', color:'#4ade80', border:'1px solid #16a34a', borderRadius:'6px', fontSize:'11px', cursor:'pointer', fontWeight:'700' }}>
                              Pagar
                            </button>
                          )}
                          {p.status==='paid'&&(
                            <button onClick={()=>generateSRIConsolidado(grupo.pagos.filter(x=>x.status==='paid'), grupo.name, grupo.cedula)}
                              title="Generar comprobante consolidado"
                              style={{ padding:'3px 8px', background:'#1d4ed833', color:'#60a5fa', border:'1px solid #1d4ed855', borderRadius:'6px', fontSize:'11px', cursor:'pointer', fontWeight:'600' }}>
                              🖨️ Comprobante
                            </button>
                          )}
                          <button onClick={()=>handleDelete(p.id)}
                            style={{ padding:'3px 8px', background:'#7f1d1d22', color:'#f87171', border:'1px solid #99181b55', borderRadius:'6px', fontSize:'11px', cursor:'pointer' }}>
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ));
              })()}
            </div>
          </>
        )}

        {/* TAB Resumen */}
        {activeTab==='resumen'&&summary&&(
          <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:'12px', overflow:'hidden' }}>
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr', padding:'10px 16px', background:'#0f172a', borderBottom:'1px solid #334155' }}>
              {['Concepto','Monto Unit.','Emitidos','Pagados','Recaudado'].map(h=>(
                <div key={h} style={{ color:'#64748b', fontSize:'11px', fontWeight:'bold', textTransform:'uppercase' }}>{h}</div>
              ))}
            </div>
            {(summary.by_concept||[]).map((c,i)=>(
              <div key={c.code} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr', padding:'12px 16px', alignItems:'center',
                background:i%2===0?'#1e293b':'#1a2332', borderBottom:'1px solid #1e3a5f22' }}>
                <div style={{ color:'#f1f5f9', fontWeight:'600' }}>{c.name}</div>
                <div style={{ color:'#94a3b8' }}>${parseFloat(c.amount).toFixed(2)}</div>
                <div style={{ color:'#94a3b8' }}>{c.total_emitidos}</div>
                <div style={{ color:'#4ade80' }}>{c.total_pagados}</div>
                <div style={{ color:'#facc15', fontWeight:'700' }}>${parseFloat(c.recaudado).toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}

        {/* TAB Conceptos */}
        {activeTab==='conceptos'&&<ConceptsTab concepts={concepts} onRefresh={loadAll}/>}
      </main>

      {/* Modal confirmar pago con voucher */}
      {payModal && <PayConfirmModal payment={payModal}
        onSave={() => { setPayModal(null); loadAll(); }}
        onClose={() => setPayModal(null)} />}
    </div>
  );
}