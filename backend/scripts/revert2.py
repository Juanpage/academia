import pathlib
p = pathlib.Path(r'D:\academia-militar-digital\academia\frontend\src\app\payments\page.js')
c = p.read_text(encoding='utf-8')

old = """<div>
                    <div style={{ color:'#f1f5f9', fontWeight:'600', fontSize:'13px' }}>{p.aspirant_name}</div>
                    <div style={{ color:'#94a3b8', fontSize:'12px' }}>{p.concept_name}</div>
                    <div style={{ color:'#475569', fontSize:'11px', fontFamily:'monospace' }}>CI: {p.aspirant_cedula}</div>
                  </div>
                  <div style={{ color:'#94a3b8', fontWeight:'600', fontSize:'13px' }}>${parseFloat(p.amount||0).toFixed(2)}</div>
                  <div style={{ color:'#4ade80', fontWeight:'700', fontSize:'13px' }}>${parseFloat(p.monto_pagado||0).toFixed(2)}</div>
                  <div style={{ color:parseFloat(p.saldo_pendiente||0)>0?'#facc15':'#4ade80', fontWeight:'700', fontSize:'13px' }}>${parseFloat(p.saldo_pendiente||0).toFixed(2)}</div>
                  <div style={{ display:'none'"""

new = """<div>
                    <div style={{ color:'#f1f5f9', fontWeight:'600', fontSize:'13px' }}>{p.aspirant_name}</div>
                    <div style={{ color:'#475569', fontSize:'11px', fontFamily:'monospace' }}>CI: {p.aspirant_cedula}</div>"""

result = c.replace(old, new, 1)
p.write_text(result, encoding='utf-8')
print('OK revertido' if 'display:' not in result[result.find('aspirant_cedula'):result.find('aspirant_cedula')+100] else 'Revertido parcial')
