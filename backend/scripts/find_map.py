import pathlib
p = pathlib.Path(r'D:\academia-militar-digital\academia\frontend\src\app\payments\page.js')
lines = p.read_text(encoding='utf-8').splitlines(keepends=True)
start = None
for i, line in enumerate(lines):
    if 'filtered.map((p,i)=>' in line:
        start = i
        break
print('Start:', start+1 if start else 'NO ENCONTRADO')
if start:
    for i in range(start, min(start+3, len(lines))):
        print(i+1, repr(lines[i][:60]))
