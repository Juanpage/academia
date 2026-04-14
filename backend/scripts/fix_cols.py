import pathlib
p = pathlib.Path(r'D:\academia-militar-digital\academia\frontend\src\app\payments\page.js')
c = p.read_text(encoding='utf-8')

# Agregar columnas Pagado y Saldo en header
old_h = "['Aspirante','Concepto','Monto','Vence','Estado','Acciones']"
new_h = "['Concepto','Total','Pagado','Saldo','Vence','Estado','Acciones']"
c = c.replace(old_h, new_h)

# Cambiar grid del header
old_g1 = "display:'grid', gridTemplateColumns:'2fr 1.5fr 1fr 1fr 1fr 1.5fr', padding:'10px 16px', background:'#0f172a', borderBottom:'1px solid #334155'"
new_g1 = "display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 0.8fr 0.8fr 1.2fr', padding:'10px 16px', background:'#0f172a', borderBottom:'1px solid #334155'"
c = c.replace(old_g1, new_g1)

# Cambiar grid de cada fila
old_g2 = "display:'grid', gridTemplateColumns:'2fr 1.5fr 1fr 1fr 1fr 1.5fr', padding:'12px 16px', alignItems:'center',"
new_g2 = "display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 0.8fr 0.8fr 1.2fr', padding:'12px 16px', alignItems:'center',"
c = c.replace(old_g2, new_g2)

# Cambiar columna Aspirante por Concepto + agregar Total, Pagado, Saldo
old_asp = """                  <div>
                    <div style={{ color:'#f1f5f9', fontWeight:'600', fontSize:'13px' }}>{p.aspirant_name}</div>
                    <div style={{ color:'#475569', fontSize:'11px', fontFamily:'monospace' }}>CI: {p.aspirant_cedula}</div>
                    {p.period&&<div style={{ color:'#64748b', fontSize:'11px' }}>PerÃ­odo: {p.period}</div>}
                  </div>
                  <div>
                    <div style={{ color:'#e2e8f0', fontSize:'13px' }}>{p.concept_name}</div>"""
new_asp = """                  <div>
                    <div style={{ color:'#f1f5f9', fontWeight:'600', fontSize:'13px' }}>{p.aspirant_name}</div>
                    <div style={{ color:'#94a3b8', fontSize:'12px' }}>{p.concept_name}</div>
                    <div style={{ color:'#475569', fontSize:'11px', fontFamily:'monospace' }}>CI: {p.aspirant_cedula}</div>
                  </div>
                  <div style={{ color:'#94a3b8', fontWeight:'600', fontSize:'13px' }}>${parseFloat(p.amount).toFixed(2)}</div>
                  <div style={{ color:'#4ade80', fontWeight:'600', fontSize:'13px' }}>${parseFloat(p.monto_pagado||0).toFixed(2)}</div>
                  <div style={{ color:parseFloat(p.saldo_pendiente||0)>0?'#facc15':'#4ade80', fontWeight:'700', fontSize:'13px' }}>${parseFloat(p.saldo_pendiente||0).toFixed(2)}</div>
                  <div>
                    <div style={{ color:'#e2e8f0', fontSize:'13px' }}>{p.concept_name}</div>"""
c = c.replace(old_asp, new_asp)

# Eliminar la columna de monto original (ya no necesaria)
old_monto = "                  <div style={{ color:'#facc15', fontWeight:'700', fontSize:'15px' }}>${parseFloat(p.amount).toFixed(2)}</div>"
new_monto = ""
c = c.replace(old_monto, new_monto)

p.write_text(c, encoding='utf-8')
print('OK' if 'monto_pagado' in c else 'ERROR')
