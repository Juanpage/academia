# 🎖️ Academia Militar Digital

Sistema de gestión de aspirantes para academia militar ecuatoriana.
Stack: Node.js · PostgreSQL · Redis · Moodle 4.3 · Next.js 14 · Docker

---

## Requisitos previos

- Windows 11 con Docker Desktop en ejecución
- Node.js v18+
- `127.0.0.1 moodle.local` en `C:\Windows\System32\drivers\etc\hosts`
- PostgreSQL de Windows **detenido** (conflicto de puerto)

---

## 🚀 Primer arranque (instalación limpia)

```powershell
# Como Administrador — limpia todo y reconstruye desde cero
.\reset.ps1
```

Esperar ~5 minutos. Cuando veas `✅ WebService configurado correctamente` en los logs, el sistema está listo.

---

## Arranque normal (después de la primera instalación)

```powershell
# Como Administrador
Stop-Service postgresql*
docker compose -f docker-compose.local.yml up -d postgres redis moodle

# En otra terminal (sin admin)
cd backend
node server.js

# Frontend (opcional)
cd frontend
npm run dev
```

---

## URLs

| Servicio   | URL                              | Credenciales          |
|------------|----------------------------------|-----------------------|
| Moodle     | http://moodle.local:8080         | admin / Moodle1234!   |
| Backend    | http://localhost:3000            | —                     |
| Frontend   | http://localhost:3001            | —                     |
| PostgreSQL | localhost:5432                   | academia_user / LocalPass123 |

---

## Verificar que Moodle WebService funciona

```powershell
Invoke-RestMethod "http://moodle.local:8080/webservice/rest/server.php?wstoken=30c111a89c22696e96d0e5c810861304&wsfunction=core_webservice_get_site_info&moodlewsrestformat=json"
```

Debe retornar JSON con `sitename: "Academia Militar Digital"`.

---

## Backend — instalar dependencias

```powershell
cd backend
npm install
node server.js
```

---

## Arquitectura

```
postgres:5432    ← academia_db (datos del sistema)
                 ← moodle_db   (datos de Moodle)
redis:6379       ← blacklist JWT
moodle:8080      ← LMS con WebService REST habilitado
backend:3000     ← API Node.js/Express
frontend:3001    ← Next.js 14
```

---

## Variables de entorno importantes

Ver `backend/.env` — los valores por defecto funcionan en local.

**Nunca** subir `.env` a Git en producción.

---

## Scoring de aspirantes

| Componente     | Peso |
|----------------|------|
| Académico      | 40%  |
| Físico (FFAA)  | 35%  |
| Psicológico    | 15%  |
| Médico         | 10%  |

Calculado automáticamente por PostgreSQL como columna generada.
