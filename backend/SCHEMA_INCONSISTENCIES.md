# Reporte de Inconsistencias de Esquema — Academia Militar Digital
Generado: 2026-04-10 | Actualizado: 2026-04-10  
Método: Análisis estático + confirmación manual del esquema real de BD

---

## ESQUEMA REAL CONFIRMADO (2026-04-10)

Las tablas que **existen y tienen datos** en `academia_db`:

| Tabla                    | Estado   | Usada por                                          |
|--------------------------|----------|----------------------------------------------------|
| `aspirants`              | ✅ activa | `aspirants.js`, `dashboard.js`, `reports.js`       |
| `users`                  | ✅ activa | `auth.js`, `users.js`                              |
| `payments`               | ✅ activa | `payments.js`, `reports.js`                        |
| `payment_concepts`       | ✅ activa | `payments.js`                                      |
| `global_scores`          | ✅ activa | `evaluations.js`, `aspirants.js`                   |
| `academic_evaluations`   | ✅ activa | `academicEvaluations.js`, `reports.js`             |
| `physical_evaluations`   | ✅ activa | `physicalEvaluations.js`, `reports.js`             |
| `psychological_evaluations` | ✅ activa | `psychologicalEvaluations.js`, `reports.js`     |
| `medical_evaluations`    | ✅ activa | `medicalEvaluations.js`, `reports.js`              |
| `moodle_courses`         | ✅ activa | `moodle.js`                                        |
| `moodle_sync_logs`       | ✅ activa | `moodle.js`                                        |

Tablas que **NO existen con datos** (no usar hasta crearlas con migración):

| Tabla                      | Referenciada en            |
|----------------------------|----------------------------|
| `physical_records`         | `evaluations.js`           |
| `academic_records`         | `evaluations.js`           |
| `psychological_records`    | `evaluations.js`           |
| `medical_records`          | `evaluations.js`           |
| `audit_log`                | _(referencia interna)_     |
| `instructor_assignments`   | `users.js`                 |
| `aspirantes`               | rutas `.routes.js`         |
| `usuarios`                 | rutas `.routes.js`         |
| `scores_globales`          | rutas `.routes.js`         |
| `pruebas_fisicas`          | rutas `.routes.js`         |
| `evaluaciones_psicologicas`| rutas `.routes.js`         |
| `evaluaciones_medicas`     | rutas `.routes.js`         |
| `pagos`                    | rutas `.routes.js`         |
| `planes_pago`              | rutas `.routes.js`         |
| `cohortes`                 | rutas `.routes.js`         |
| `sedes`                    | rutas `.routes.js`         |
| `gastos`                   | rutas `.routes.js`         |

---

## ESTADO DE CORRECCIONES

### ✅ RESUELTO — INC-004: Rutas .routes.js desmontadas (2026-04-10)
Las 7 rutas que apuntaban al esquema español incorrecto fueron comentadas en `server.js`:
```
// app.use('/api/aspirantes', require('./src/routes/aspirantes.routes'));
// app.use('/api/financiero',  require('./src/routes/financiero.routes'));
// app.use('/api/admin',       require('./src/routes/admin.routes'));
// app.use('/api/academico',   require('./src/routes/academico.routes'));
// app.use('/api/fisico',      require('./src/routes/fisico.routes'));
// app.use('/api/psicologico', require('./src/routes/psicologico.routes'));
// app.use('/api/cohortes',    require('./src/routes/cohorte.routes'));
```

### ✅ RESUELTO — INC-006: req.user.sub corregido a req.user.id (2026-04-10)
Las 3 ocurrencias de `req.user.sub` en `evaluations.js` fueron reemplazadas por `req.user.id`.

### ✅ RESUELTO — INC-005: admin.routes.js desmontada
El archivo `admin.routes.js` usaba `scores_globales` (tabla inexistente). Fue desmontado.

---

## RUTAS ACTIVAS EN server.js (estado final)

```
POST   /api/auth/login              → auth.js
POST   /api/auth/logout             → auth.js
GET    /api/auth/me                 → auth.js
POST   /api/auth/change-password    → auth.js
POST   /api/auth/forgot-password    → auth.js
POST   /api/auth/reset-password     → auth.js

GET    /api/aspirants               → aspirants.js
GET    /api/aspirants/:id           → aspirants.js
POST   /api/aspirants               → aspirants.js
PATCH  /api/aspirants/:id/status    → aspirants.js

GET    /api/dashboard               → dashboard.js

GET    /api/moodle/ping             → moodle.js
GET    /api/moodle/courses          → moodle.js
POST   /api/moodle/enrol            → moodle.js
POST   /api/moodle/sync/grades      → moodle.js

GET    /api/physical-evaluations/aspirant/:id   → physicalEvaluations.js
POST   /api/physical-evaluations                → physicalEvaluations.js
DELETE /api/physical-evaluations/:id            → physicalEvaluations.js

GET    /api/academic-evaluations/aspirant/:id   → academicEvaluations.js
POST   /api/academic-evaluations                → academicEvaluations.js
DELETE /api/academic-evaluations/:id            → academicEvaluations.js

GET    /api/psychological-evaluations/aspirant/:id → psychologicalEvaluations.js
POST   /api/psychological-evaluations              → psychologicalEvaluations.js
DELETE /api/psychological-evaluations/:id          → psychologicalEvaluations.js

GET    /api/medical-evaluations/aspirant/:id    → medicalEvaluations.js
POST   /api/medical-evaluations                 → medicalEvaluations.js
DELETE /api/medical-evaluations/:id             → medicalEvaluations.js

GET    /api/evaluations/physical/:aspirantId    → evaluations.js  ⚠️ ver INC-001
POST   /api/evaluations/physical               → evaluations.js  ⚠️
GET    /api/evaluations/psychological/:id       → evaluations.js  ⚠️
POST   /api/evaluations/psychological          → evaluations.js  ⚠️
GET    /api/evaluations/medical/:id             → evaluations.js  ⚠️
POST   /api/evaluations/medical                → evaluations.js  ⚠️
GET    /api/evaluations/summary/:id             → evaluations.js  ⚠️

GET    /api/payments                → payments.js
POST   /api/payments                → payments.js
PATCH  /api/payments/:id/pay        → payments.js
DELETE /api/payments/:id            → payments.js
GET    /api/payments/concepts       → payments.js
GET    /api/payments/transactions/:aspirantId → payments.js

GET    /api/users                   → users.js
GET    /api/users/me/profile        → users.js
GET    /api/users/:id               → users.js
POST   /api/users                   → users.js
PUT    /api/users/:id               → users.js
DELETE /api/users/:id               → users.js

GET    /api/reports/ranking         → reports.js
GET    /api/reports/evaluations     → reports.js
GET    /api/reports/payments        → reports.js
GET    /api/reports/export/ranking/excel  → reports.js
GET    /api/reports/export/payments/excel → reports.js

GET    /health                      → server.js (health check)
```

---

## INCONSISTENCIAS PENDIENTES

### INC-001 — evaluations.js usa tablas sin datos ⚠️
**Archivo:** `src/routes/evaluations.js`  
**Estado:** Montado pero operacionalmente inactivo (tablas vacías o inexistentes).  
**Tablas afectadas:** `physical_records`, `academic_records`, `psychological_records`, `medical_records`  
**Estructura que espera:**
```sql
physical_records     (aspirant_id, test_type, raw_value, score, evaluated_by, notes)
academic_records     (aspirant_id, grade)
psychological_records(aspirant_id, test_name, score, result)
medical_records      (aspirant_id, blood_type, result ['APTO'|'OBSERVADO'|'NO_APTO'])
global_scores        (aspirant_id, academic_score, physical_score, psych_score,
                      medical_score, total_score, rank_position)
```

**Opciones:**
- **Opción A** — Crear las tablas con una migración y usar `/api/evaluations` como endpoint unificado,
  eliminando las rutas individuales por tipo.
- **Opción B** — Desmontar `/api/evaluations` y consolidar toda la lógica en las rutas individuales
  (`physicalEvaluations.js`, etc.) que ya funcionan con tablas reales.

---

### INC-002 — dashboard.js lee scores de aspirants en lugar de global_scores ⚠️
**Archivo:** `src/routes/dashboard.js`  
**Problema:** Usa `a.physical_score`, `a.academic_score`, `a.psych_score`, `a.medical_score`
directamente de la tabla `aspirants`. Si esas columnas no existen en `aspirants` (y los scores
están solo en `global_scores`), el cálculo del promedio retornará siempre 0.

**Fix recomendado:**
```sql
-- Reemplazar en dashboard.js el SELECT de top_aspirants por:
SELECT a.id, a.cedula, a.first_name || ' ' || a.last_name AS full_name,
       COALESCE(gs.academic_score, 0) AS academic_score,
       COALESCE(gs.physical_score,  0) AS physical_score,
       COALESCE(gs.psych_score,     0) AS psych_score,
       COALESCE(gs.medical_score,   0) AS medical_score,
       COALESCE(gs.total_score,     0) AS total_score
FROM aspirants a
LEFT JOIN global_scores gs ON gs.aspirant_id = a.id
ORDER BY total_score DESC LIMIT 10
```

---

### INC-003 — reports.js lee scores de aspirants en lugar de global_scores ⚠️
**Archivo:** `src/routes/reports.js`  
**Problema:** Idéntico a INC-002. El ranking siempre mostrará 0 si las columnas
`academic_score`, `physical_score`, `psych_score`, `medical_score` no existen en `aspirants`.

**Fix recomendado:** Mismo patrón que INC-002: añadir `LEFT JOIN global_scores gs ON gs.aspirant_id = a.id`
y leer los scores de `gs.*` en lugar de `a.*`.

---

### INC-007 — DELETE en rutas de evaluación sin verificación de rol ⚠️
**Archivos:** `physicalEvaluations.js`, `academicEvaluations.js`,
`psychologicalEvaluations.js`, `medicalEvaluations.js`  
**Problema:** Cualquier usuario autenticado puede borrar evaluaciones. Falta `authorize('admin', 'staff')`.

---

### INC-008 — evaluations.js importa transaction que puede no estar exportada
```js
const { query, transaction } = require('../config/database');
```
Verificar que `src/config/database.js` exporta `transaction`. Si no, el módulo cargará
sin error (JS no falla en destructuring de undefined) pero crasheará al primer uso.

---

### INC-009 — Duplicación de endpoint de evaluación física
Coexisten 2 endpoints activos para registrar evaluaciones físicas:
- `POST /api/physical-evaluations` → escribe en `physical_evaluations`
- `POST /api/evaluations/physical` → escribe en `physical_records` (sin datos)

El frontend debe usar exclusivamente `/api/physical-evaluations` hasta resolver INC-001.

---

### INC-010 — instructor_assignments referenciada en users.js pero tabla no existe con datos
**Archivo:** `src/routes/users.js`  
**Problema:** `GET /api/users/:id` y `GET /api/users/me/profile` hacen LEFT JOIN con
`instructor_assignments`. Como es LEFT JOIN, no romperá si la tabla existe vacía,
pero fallará con "relation does not exist" si la tabla no existe en absoluto.

```sql
LEFT JOIN instructor_assignments ia ON ia.user_id = u.id
```

**Fix:** Verificar con `\d instructor_assignments` en psql. Si no existe, eliminar el JOIN
o crear la tabla con: `CREATE TABLE instructor_assignments (id SERIAL, user_id INT, eval_type TEXT);`

---

## RUTAS DESHABILITADAS (requieren migración antes de reactivar)

Los siguientes archivos existen en `src/routes/` pero están comentados en `server.js`
porque apuntan a tablas que no existen en la BD real. Para reactivarlos es necesario:
1. Crear las tablas equivalentes en inglés (o adaptar las queries al esquema real), o
2. Ejecutar una migración que renombre las tablas del esquema español al inglés.

| Ruta comentada           | Archivo                     | Tablas que necesita (no existen)                        |
|--------------------------|-----------------------------|---------------------------------------------------------|
| `/api/aspirantes`        | `aspirantes.routes.js`      | `aspirantes`, `cohortes`, `scores_globales`             |
| `/api/financiero`        | `financiero.routes.js`      | `pagos`, `planes_pago`, `aspirantes`, `comprobantes`    |
| `/api/admin`             | `admin.routes.js`           | `aspirantes`, `scores_globales`, `cohortes`             |
| `/api/academico`         | `academico.routes.js`       | `aspirantes`, `cohortes`, `academic_scores`             |
| `/api/fisico`            | `fisico.routes.js`          | `pruebas_fisicas`, `scores_globales`, `usuarios`        |
| `/api/psicologico`       | `psicologico.routes.js`     | `evaluaciones_psicologicas`, `scores_globales`          |
| `/api/cohortes`          | `cohorte.routes.js`         | `cohortes`, `sedes`                                     |
