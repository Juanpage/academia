import pathlib, re
p = pathlib.Path(r'D:\academia-militar-digital\academia\frontend\src\app\payments\page.js')
c = p.read_text(encoding='utf-8')

# Buscar el patron exacto con regex
idx = c.find("color:'#475569', fontSize:'11px', fontFamily:'monospace' }}>CI: {p.aspirant_cedula}</div>")
if idx == -1:
    print("No encontrado, buscando alternativa...")
    idx = c.find("aspirant_cedula}</div>")
    print("Encontrado en:", idx)
    print(repr(c[idx-200:idx+50]))
else:
    print("Encontrado en:", idx)
