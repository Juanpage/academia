/**
 * ARCHIVO ELIMINADO — CÓDIGO MUERTO
 *
 * Este controller fue reemplazado completamente por:
 *   - POST /api/fisico/evaluacion     → src/routes/fisico.routes.js
 *   - GET  /api/fisico/aspirante/:id  → src/routes/fisico.routes.js
 *   - GET  /api/fisico/ranking/:id    → src/routes/fisico.routes.js
 *   - GET  /api/fisico/baremos        → src/routes/fisico.routes.js
 *   - PUT  /api/fisico/evaluacion/:id → src/routes/fisico.routes.js
 *
 * Diferencias detectadas con el esquema actual de BD:
 *   - Usaba tabla "pruebas_fisicas"  → BD real usa "pruebas_fisicas" (coincide con fisico.routes.js)
 *   - Usaba tabla "scores_globales"  → fisico.routes.js usa "scores_globales" también (correcto)
 *   - Usaba tabla "usuarios"         → fisico.routes.js usa "usuarios" también (correcto)
 *   - No incluía PUT para edición    → fisico.routes.js sí lo tiene
 *   - getBaremos solo devolvía texto → fisico.routes.js devuelve los valores reales de scoresFisicos.js
 *
 * NO importar este archivo. Puede eliminarse del repositorio.
 */
throw new Error('fisicoController está obsoleto. Ver src/routes/fisico.routes.js');
