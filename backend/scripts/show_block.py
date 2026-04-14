import pathlib
p = pathlib.Path(r'D:\academia-militar-digital\academia\frontend\src\app\payments\page.js')
c = p.read_text(encoding='utf-8')

idx = c.find("aspirant_cedula}</div>")
# Buscar el inicio del bloque <div> que contiene aspirant_name
start = c.rfind("<div>", 0, idx)
# Buscar el fin del bloque de due_date
end_marker = "fontFamily:'monospace' }}>CI: {p.aspirant_cedula}</div>"
end = c.find(end_marker) + len(end_marker)

print("Start:", start)
print("End:", end)
print("Bloque actual:")
print(repr(c[start:end]))
