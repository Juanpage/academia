import pathlib
p = pathlib.Path(r'D:\academia-militar-digital\academia\frontend\src\app\payments\page.js')
c = p.read_text(encoding='utf-8')

# Revertir todo al estado original de la tabla
old = """              ):(() => {
                const grupos = {};
                filtered.filter(x=>!x.es_abono).forEach(pay => {
                  if (!grupos[pay.aspirant_cedula]) grupos[pay.aspirant_cedula] = {name:pay.aspirant_name, cedula:pay.aspirant_cedula, pagos:[]};
                  grupos[pay.aspirant_cedula].pagos.push(pay);
                });
                return Object.values(grupos).flatMap((grupo,gi) => [
                  <div key={'h'+grupo.cedula} style={{background:'#0f172a',padding:'6px 16px',display:'flex',justifyContent:'space-between',borderBottom:'1px solid #1e3a5f'}}>
                    <span style={{color:'#f1f5f9',fontWeight:'700',fontSize:'13px'}}>{grupo.name} <span style={{color:'#475569',fontSize:'11px',fontFamily:'monospace'}}>CI: {grupo.cedula}</span></span>
                    <span style={{fontSize:'11px',display:'flex',gap:'12px'}}>
                      <span style={{color:'#4ade80'}}>Pagado: ${grupo.pagos.reduce((s,x)=>s+parseFloat(x.monto_pagado||0),0).toFixed(2)}</span>
                      <span style={{color:'#facc15'}}>Saldo: ${grupo.pagos.reduce((s,x)=>s+parseFloat(x.saldo_pendiente||x.amount||0),0).toFixed(2)}</span>
                    </span>
                  </div>,
                  ...grupo.pagos.map((p,i)=>(
"""
new = "              ):filtered.map((p,i)=>(\n"

old_close = "              ))\n                  ])\n                ))()\n            </div>"
new_close = "              ))}\n            </div>"

result = c.replace(old, new, 1)
result = result.replace(old_close, new_close, 1)
p.write_text(result, encoding='utf-8')
print('OK revertido' if 'filtered.map((p,i)' in result else 'ERROR')
