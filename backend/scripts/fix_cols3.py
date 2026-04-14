import pathlib
p = pathlib.Path(r'D:\academia-militar-digital\academia\frontend\src\app\payments\page.js')
c = p.read_text(encoding='utf-8')

old_block = "<div>\n                    <div style={{ color:'#f1f5f9', fontWeight:'600', fontSize:'13px' }}>{p.aspirant_name}</div>\n                    <div style={{ color:'#475569', fontSize:'11px', fontFamily:'monospace' }}>CI: {p.aspirant_cedula}</div>"

new_block = """<div>
                    <div style={{ color:'#f1f5f9', fontWeight:'600', fontSize:'13px' }}>{p.aspirant_name}</div>
                    <div style={{ color:'#94a3b8', fontSize:'12px' }}>{p.concept_name}</div>
                    <div style={{ color:'#475569', fontSize:'11px', fontFamily:'monospace' }}>CI: {p.aspirant_cedula}</div>
                  </div>
                  <div style={{ color:'#94a3b8', fontWeight:'600', fontSize:'13px' }}>${parseFloat(p.amount||0).toFixed(2)}</div>
                  <div style={{ color:'#4ade80', fontWeight:'700', fontSize:'13px' }}>${parseFloat(p.monto_pagado||0).toFixed(2)}</div>
                  <div style={{ color:parseFloat(p.saldo_pendiente||0)>0?'#facc15':'#4ade80', fontWeight:'700', fontSize:'13px' }}>${parseFloat(p.saldo_pendiente||0).toFixed(2)}</div>
                  <div style={{ display:'none'"""

result = c.replace(old_block, new_block, 1)
p.write_text(result, encoding='utf-8')
print('OK' if 'monto_pagado' in result else 'ERROR')
