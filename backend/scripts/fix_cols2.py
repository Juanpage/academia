import pathlib
p = pathlib.Path(r'D:\academia-militar-digital\academia\frontend\src\app\payments\page.js')
c = p.read_text(encoding='utf-8')

old = """                  <div>
                    <div style={{ color:'#f1f5f9', fontWeight:'600', fontSize:'13px' }}>{p.aspirant_name}</div>
                    <div style={{ color:'#475569', fontSize:'11px', fontFamily:'monospace' }}>CI: {p.aspirant_cedula}</div>
                    {p.period&&<div style={{ color:'#64748b', fontSize:'11px' }}>PerÃ­odo: {p.period}</div>}
                  </div>
                  <div>
                    <div style={{ color:'#e2e8f0', fontSize:'13px' }}>{p.concept_name}</div>
                    {p.payment_type==='invoice'&&p.sri_numero&&<div style={{ color:'#4ade80', fontSize:'10px' }}>ðŸ"„ {p.sri_numero}</div>}
                    {p.payment_type==='transfer'&&p.transfer_ref&&<div style={{ color:'#60a5fa', fontSize:'10px' }}>ðŸ¦ {p.transfer_ref}</div>}
                    {p.comprobante_data?.filename&&(
                      <a href={`${API}/payments/voucher/${p.comprobante_data.filename}`} target="_blank" rel="noopener noreferrer"
                        style={{ color:'#a78bfa', fontSize:'10px', textDecoration:'none' }}>ðŸ"Ž Ver voucher</a>
                    )}
                  </div>
                  <div style={{ color:'#64748b', fontSize:'12px' }}>
                    {p.due_date?new Date(p.due_date).toLocaleDateString('es-EC',{day:'2-digit',month:'short',year:'numeric'}):'â€"'}
                  </div>
                  <div><Badge status={p.status}/></div>"""

new = """                  <div>
                    <div style={{ color:'#f1f5f9', fontWeight:'600', fontSize:'13px' }}>{p.aspirant_name}</div>
                    <div style={{ color:'#94a3b8', fontSize:'12px' }}>{p.concept_name}</div>
                    <div style={{ color:'#475569', fontSize:'11px', fontFamily:'monospace' }}>CI: {p.aspirant_cedula}</div>
                  </div>
                  <div style={{ color:'#94a3b8', fontWeight:'600', fontSize:'13px' }}>${parseFloat(p.amount||0).toFixed(2)}</div>
                  <div style={{ color:'#4ade80', fontWeight:'700', fontSize:'13px' }}>${parseFloat(p.monto_pagado||0).toFixed(2)}</div>
                  <div style={{ color:parseFloat(p.saldo_pendiente||0)>0?'#facc15':'#4ade80', fontWeight:'700', fontSize:'13px' }}>${parseFloat(p.saldo_pendiente||0).toFixed(2)}</div>
                  <div style={{ color:'#64748b', fontSize:'12px' }}>
                    {p.due_date?new Date(p.due_date).toLocaleDateString('es-EC',{day:'2-digit',month:'short',year:'numeric'}):'--'}
                  </div>
                  <div><Badge status={p.status}/></div>"""

if old in c:
    result = c.replace(old, new, 1)
    p.write_text(result, encoding='utf-8')
    print('OK')
else:
    print('ERROR: texto no encontrado')
    # Mostrar contexto
    idx = c.find('aspirant_name')
    print(repr(c[idx-10:idx+100]))
