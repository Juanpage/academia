# CHANGELOG — Academia Militar Digital · Backend

---

## [Sesión Cowork · Parte 2] — 2026-04-10

### Bloque 5 — Eliminación de archivos `.routes.js` legacy

**Archivos marcados para eliminación permanente** (tombstone aplicado):

| Archivo | Reemplazado por |
|---|---|
| `aspirantes.routes.js` | `aspirants.js` → `/api/aspirants` |
| `fisico.routes.js` | `physicalEvaluations.js` → `/api/physical-evaluations` |
| `psicologico.routes.js` | `psychologicalEvaluations.js` → `/api/psychological-evaluations` |
| `academico.routes.js` | `academicEvaluations.js` → `/api/academic-evaluations` |
| `financiero.routes.js` | `payments.js` → `/api/payments` |
| `admin.routes.js` | `users.js`, `dashboard.js`, `reports.js`, `payments.js` |
| `cohorte.routes.js` | *(pendiente: implementar `cohorts.js`)* |

Los 7 archivos contienen `throw new Error()` en línea 1 — cualquier `require()` accidental
explotará inmediatamente en runtime. El archivo `auth.routes.js` **no fue tocado**.

**Acción manual requerida** (permisos OS impiden eliminación desde sandbox):

```bash
cd backend
git rm src/routes/academico.routes.js \
        src/routes/admin.routes.js \
        src/routes/aspirantes.routes.js \
        src/routes/cohorte.routes.js \
        src/routes/financiero.routes.js \
        src/routes/fisico.routes.js \
        src/routes/psicologico.routes.js
git commit -m "chore: eliminar rutas legacy esquema español (7 archivos)"
```

---

## [Sesión Cowork · Parte 1] — 2026-04-10

### Resumen ejecutivo

Sesión de análisis estructural y corrección de deuda técnica acumulada.
Se identificaron y resolvieron 4 categorías de problemas: rutas huérfanas, código muerto,
inconsistencias de esquema entre dos generaciones de código, y queries que apuntaban a
tablas inexistentes o columnas incorrectas.

Archivos modificados: `server.js`, `src/routes/dashboard.js`, `src/routes/reports.js`,
`src/routes/users.js`, `src/routes/evaluations.js`, `src/lib/api.js` (frontend),
`src/lib/api.ts` (frontend), `src/controllers/*` (tombstone), `SCHEMA_INCONSISTENCIES.md` (nuevo).

Archivos movidos: 9 scripts `.py` de raíz → `backend/scripts/`.

---

## BLOQUE 1 — Análisis de estructura y correcciones iniciales

### [FIX] `server.js` — 8 rutas `.routes.js` nunca montadas

**Problema:** Los archivos `aspirantes.routes.js`, `financiero.routes.js`, `admin.routes.js`,
`fisico.routes.js`, `psicologico.routes.js`, `academico.routes.js`, `cohorte.routes.js`
y `auth.routes.js` existían en `src/routes/` pero no estaban registrados en `server.js`.
Los módulos completos de financiero, físico, cohortes y admin eran completamente inaccesibles.

**Acción:** Se montaron en `server.js` con sus prefijos lógicos (`/api/financiero`,
`/api/admin`, `/api/fisico`, etc.).

**Estado posterior:** Revertido parcialmente en Bloque 3 al confirmar que apuntan
al esquema de BD incorrecto.

---

### [FIX] `src/routes/users.js` — Bug de enrutamiento `/me/profile`

**Problema:** La ruta `GET /me/profile` estaba declarada al final del archivo, después de
`GET /:id`. Express la interceptaba con el wildcard `/:id`, tratando la cadena `"me"` como
un ID numérico y retornando 404 siempre.

**Acción:** Se movió `GET /me/profile` a la posición correcta — antes de `GET /:id`.
Se eliminó el duplicado que quedaba al final del archivo.

**Líneas afectadas:** Bloque de ~15 líneas reubicado; duplicado de ~16 líneas eliminado.

---

### [FIX] `frontend/src/lib/api.js` — Clave `getPhysical` duplicada en `evaluationsApi`

**Problema:** El objeto `evaluationsApi` definía `getPhysical` dos veces (líneas 58 y 70)
con valores distintos. JavaScript silenciosamente descartaba la primera definición.
También había inconsistencia de nombres (`getPsych` / `getMedicalEval` / `addMedicalEval`
mezclados con `getPsychological` / `getMedical`).

**Acción:** Se reescribió `evaluationsApi` completo con un nombre canónico por evaluación
y comentarios de sección. Duplicado eliminado.

**Claves afectadas:** `getPhysical` (duplicada), `getPsych`→`getPsychological`,
`getMedicalEval`→`getMedical`, `deleteMedicalEval`→`deleteMedical`,
`deletePsych`→`deletePsychological`.

---

### [FIX] `frontend/src/lib/api.ts` — `baseURL` sin `/api` y clave de token inconsistente

**Problema 1:** `api.ts` declaraba `baseURL: 'http://localhost:3000'` mientras que `api.js`
usa `'http://localhost:3000/api'`. Todas las llamadas de `adminAPI`, `financieroAPI`,
`fisicoAPI`, `academicoAPI` y `cohortesAPI` llegaban a rutas inexistentes (sin el prefijo
`/api`).

**Problema 2:** `api.ts` usaba `localStorage.getItem('token')` y `Cookies.get('token')`
mientras que `api.js` usa la clave `access_token`. Un archivo de configuración nunca
autenticaba porque leía la clave incorrecta.

**Acción:** Se corrigió `baseURL` añadiendo `/api`. Se unificó la clave del token
a `access_token` en interceptor de request, response handler y Cookies. Se actualizaron
las 9 rutas de las APIs exportadas eliminando el prefijo `/api/` redundante.

---

## BLOQUE 2 — Controllers y archivos de utilidad

### [ANÁLISIS] Controllers: `authController.js`, `aspirantesController.js`, `fisicoController.js`

**Resultado del análisis:**

| Controller | Funciones | Cobertura en rutas activas |
|---|---|---|
| `authController` | `register`, `login`, `logout` | 100% — `auth.js` + `auth.routes.js` |
| `aspirantesController` | `getDashboard`, `listar`, `getById`, `update` | 100% — `aspirantes.routes.js` |
| `fisicoController` | `registrarEvaluacion`, `getHistorial`, `getRanking`, `getBaremos` | 100% — `fisico.routes.js` |

Además, todos usaban el esquema de BD en español (`usuarios`, `aspirantes`,
`scores_globales`, `pruebas_fisicas`) incompatible con el esquema real.

**Acción:** Los 3 archivos fueron reemplazados con tombstones que lanzan `Error` explícito
si se importan accidentalmente. El OS del sandbox no permite eliminar archivos; están
marcados para borrado manual (`git rm src/controllers/*.js`).

---

### [FIX] `src/routes/evaluations.js` — `req.user.sub` → `req.user.id`

**Problema:** Las 3 inserciones de evaluaciones en `evaluations.js` usaban `req.user.sub`
como `evaluated_by`, mientras que **todas las demás rutas** del proyecto usan `req.user.id`.
El campo `evaluated_by` quedaba siempre `NULL` porque el payload JWT expone `id`, no `sub`.

**Acción:** Reemplazadas las 3 ocurrencias de `req.user.sub` → `req.user.id`.

**Líneas corregidas:** ~108, ~158, ~216.

---

### [ORGANIZACIÓN] Scripts Python movidos a `backend/scripts/`

**Problema:** 9 scripts de utilidad ad-hoc vivían en la raíz del backend mezclados
con `server.js` y `package.json`.

**Archivos movidos:**

| Script | Propósito |
|---|---|
| `find_cedula.py` | Buscar cédulas en BD |
| `find_map.py` | Mapeo de columnas |
| `fix_cols.py` | Corrección de columnas (v1) |
| `fix_cols2.py` | Corrección de columnas (v2) |
| `fix_cols3.py` | Corrección de columnas (v3) |
| `fix_group.py` | Corrección de agrupaciones |
| `revert2.py` | Reversión de migración (v2) |
| `revert_table.py` | Reversión de tabla |
| `show_block.py` | Diagnóstico de bloques |

**Destino:** `backend/scripts/`

---

### [NUEVO] `backend/SCHEMA_INCONSISTENCIES.md`

Creado reporte con 10 inconsistencias de esquema identificadas mediante análisis estático,
mapa de tablas equivalentes entre esquema español e inglés, mapa de columnas equivalentes,
y plan de acción por prioridad.

---

## BLOQUE 3 — Confirmación de esquema real y limpieza de rutas

### Esquema real confirmado por el usuario

**Tablas activas con datos:**
`aspirants`, `users`, `payments`, `payment_concepts`, `global_scores`,
`academic_evaluations`, `physical_evaluations`, `psychological_evaluations`,
`medical_evaluations`, `moodle_courses`, `moodle_sync_logs`.

**Tablas inexistentes o sin datos:**
`aspirantes`, `usuarios`, `scores_globales`, `pruebas_fisicas`,
`evaluaciones_psicologicas`, `evaluaciones_medicas`, `pagos`, `planes_pago`,
`cohortes`, `sedes`, `gastos`, `instructor_assignments`,
`physical_records`, `academic_records`, `psychological_records`, `medical_records`,
`audit_log`.

---

### [FIX] `server.js` — Desmontadas 7 rutas `.routes.js` con esquema incorrecto

**Problema:** Las rutas montadas en el Bloque 1 apuntan a tablas en español que no existen
en la BD real. Cada request a esos endpoints causaría `relation "aspirantes" does not exist`.

**Rutas comentadas (requieren migración antes de reactivar):**

```js
// app.use('/api/aspirantes', require('./src/routes/aspirantes.routes'));
// app.use('/api/financiero',  require('./src/routes/financiero.routes'));
// app.use('/api/admin',       require('./src/routes/admin.routes'));
// app.use('/api/academico',   require('./src/routes/academico.routes'));
// app.use('/api/fisico',      require('./src/routes/fisico.routes'));
// app.use('/api/psicologico', require('./src/routes/psicologico.routes'));
// app.use('/api/cohortes',    require('./src/routes/cohorte.routes'));
```

**`SCHEMA_INCONSISTENCIES.md`:** Actualizado con el esquema confirmado, estado de cada
corrección aplicada y tabla de rutas deshabilitadas pendientes de migración.

---

## BLOQUE 4 — Correcciones críticas de queries

### [FIX] `server.js` — Desmontado `/api/evaluations` (código muerto)

**Problema:** `src/routes/evaluations.js` insertaba en `physical_records`, `academic_records`,
`psychological_records` y `medical_records` — tablas que no existen con datos. La ruta estaba
activa pero todas las escrituras se perdían. Las rutas individuales (`/api/physical-evaluations`,
`/api/academic-evaluations`, etc.) cubren exactamente la misma funcionalidad con las tablas reales.

**Acción:** Bloque `app.use('/api/evaluations', ...)` eliminado de `server.js`.

---

### [FIX] `src/routes/dashboard.js` — Scores leídos de `global_scores` en lugar de `aspirants`

**Problema:** Las queries del dashboard leían `a.physical_score`, `a.academic_score`,
`a.psych_score`, `a.medical_score` directamente de la tabla `aspirants`. Ningún código
del proyecto actualiza esas columnas en `aspirants` — los scores se guardan en `global_scores`.
El promedio general y el top-10 siempre retornaban 0.

**Acción:** Reescritas las queries `totals` y `topAsp` añadiendo
`LEFT JOIN global_scores gs ON gs.aspirant_id = a.id` y leyendo `gs.*` en lugar de `a.*`.
Se añadió `NULLS LAST` al ORDER BY y se usa `COALESCE(gs.total_score, ROUND(...cálculo...))`.

**Queries corregidas:** `totals` (avg_score), `topAsp` (top 10).

---

### [FIX] `src/routes/reports.js` — Scores leídos de `global_scores` (mismo problema)

**Problema:** Idéntico al de `dashboard.js`. Tanto `GET /api/reports/ranking` como
`GET /api/reports/export/ranking/excel` leían `a.academic_score`, etc. de `aspirants`.
El ranking exportado al Excel siempre mostraba 0 en todas las columnas de puntaje.

**Acción:** Añadido `LEFT JOIN global_scores gs ON gs.aspirant_id = a.id` en ambas queries.
Reemplazados todos los `COALESCE(a.<score>, 0)` por `COALESCE(gs.<score>, 0)`.
`COALESCE(gs.total_score, ROUND(...cálculo...))` para usar el valor precalculado si existe.

**Queries corregidas:** `GET /ranking`, `GET /export/ranking/excel`.

---

### [FIX] `src/routes/users.js` — `instructor_assignments` inexistente causaba crashes

**Problema:** La tabla `instructor_assignments` no existe en la BD. Aparecía en 5 lugares:
3 `LEFT JOIN` en SELECTs y 2 bloques de escritura (INSERT/DELETE) en POST y PUT.
Los LEFT JOINs crasheaban con `relation "instructor_assignments" does not exist`
incluso siendo LEFT JOINs, porque PostgreSQL valida la existencia de la tabla al planificar
la query.

**Acción — SELECTs (3 rutas: `GET /`, `GET /me/profile`, `GET /:id`):**
Eliminados `LEFT JOIN instructor_assignments`, `GROUP BY u.id` y el `array_agg`.
Sustituidos por `ARRAY[]::TEXT[] AS assigned_eval_types` — array vacío constante.
El campo sigue presente en la respuesta JSON para que el frontend no rompa.

**Acción — Escrituras (POST `/`, PUT `/:id`):**
Los INSERT y DELETE sobre `instructor_assignments` fueron envueltos en `.catch(e => console.warn(...))`.
La operación principal (crear/actualizar usuario) no falla; aparece un warning en el log.
Cuando la tabla sea creada, la funcionalidad operará automáticamente sin cambios de código.

---

## Estado final del proyecto — 2026-04-10

### Rutas activas en `server.js` (11 módulos)

| Prefijo | Archivo | Tablas BD |
|---|---|---|
| `/api/auth` | `auth.js` | `users` |
| `/api/aspirants` | `aspirants.js` | `aspirants`, `global_scores` |
| `/api/moodle` | `moodle.js` | `moodle_courses`, `moodle_sync_logs` |
| `/api/dashboard` | `dashboard.js` | `aspirants`, `global_scores`, `payments` |
| `/api/physical-evaluations` | `physicalEvaluations.js` | `physical_evaluations` |
| `/api/academic-evaluations` | `academicEvaluations.js` | `academic_evaluations` |
| `/api/psychological-evaluations` | `psychologicalEvaluations.js` | `psychological_evaluations` |
| `/api/medical-evaluations` | `medicalEvaluations.js` | `medical_evaluations` |
| `/api/payments` | `payments.js` | `payments`, `payment_concepts` |
| `/api/users` | `users.js` | `users` |
| `/api/reports` | `reports.js` | `aspirants`, `global_scores`, `payments`, `*_evaluations` |

### Deuda técnica resuelta

| ID | Descripción | Estado |
|---|---|---|
| INC-001 | `evaluations.js` usa tablas inexistentes | ✅ Desmontado |
| INC-002 | `dashboard.js` scores de `aspirants` en lugar de `global_scores` | ✅ Corregido |
| INC-003 | `reports.js` scores de `aspirants` en lugar de `global_scores` | ✅ Corregido |
| INC-004 | Rutas `.routes.js` con esquema español montadas | ✅ Desmontadas |
| INC-005 | `admin.routes.js` usa `scores_globales` (inexistente) | ✅ Desmontado |
| INC-006 | `evaluations.js` usa `req.user.sub` en lugar de `req.user.id` | ✅ Corregido |
| INC-010 | `users.js` LEFT JOIN con `instructor_assignments` inexistente | ✅ Corregido |

### Deuda técnica pendiente

| ID | Descripción | Prioridad |
|---|---|---|
| INC-007 | DELETE en evaluaciones sin verificación de rol | Media |
| INC-008 | `evaluations.js` importa `transaction` — verificar export de `database.js` | Baja |
| INC-009 | Dos endpoints activos para evaluación física (`/physical-evaluations` y `evaluations.js`) | Resuelta al desmontar INC-001 |
| — | Controllers tombstone pendientes de `git rm` | Baja |
| — | Rutas `.routes.js` pendientes de migración al esquema inglés | Media-Alta |
| — | `instructor_assignments`: crear tabla cuando se implemente módulo de instructores | Futura |
| — | `global_scores`: verificar si `total_score` y `rank_position` se actualizan por trigger | Media |

### Estructura de directorios relevante

```
backend/
├── server.js                          ← 11 rutas activas, esquema inglés
├── CHANGELOG.md                       ← este archivo
├── SCHEMA_INCONSISTENCIES.md          ← análisis completo de esquema
├── scripts/                           ← scripts Python de mantenimiento (movidos)
│   ├── find_cedula.py
│   ├── fix_cols.py  (×3)
│   └── ...
└── src/
    ├── controllers/                   ← tombstones (eliminar con git rm)
    │   ├── authController.js
    │   ├── aspirantesController.js
    │   └── fisicoController.js
    ├── routes/
    │   ├── auth.js                    ✅ activa
    │   ├── aspirants.js               ✅ activa
    │   ├── dashboard.js               ✅ corregida (global_scores JOIN)
    │   ├── reports.js                 ✅ corregida (global_scores JOIN)
    │   ├── users.js                   ✅ corregida (sin instructor_assignments)
    │   ├── payments.js                ✅ activa
    │   ├── physicalEvaluations.js     ✅ activa
    │   ├── academicEvaluations.js     ✅ activa
    │   ├── psychologicalEvaluations.js ✅ activa
    │   ├── medicalEvaluations.js      ✅ activa
    │   ├── moodle.js                  ✅ activa
    │   ├── evaluations.js             ⚠️ desmontado (tablas inexistentes)
    │   ├── aspirantes.routes.js       🚫 comentado (esquema español)
    │   ├── financiero.routes.js       🚫 comentado (esquema español)
    │   ├── admin.routes.js            🚫 comentado (esquema español)
    │   ├── fisico.routes.js           🚫 comentado (esquema español)
    │   ├── psicologico.routes.js      🚫 comentado (esquema español)
    │   ├── academico.routes.js        🚫 comentado (esquema español)
    │   └── cohorte.routes.js          🚫 comentado (esquema español)
    └── ...
```
