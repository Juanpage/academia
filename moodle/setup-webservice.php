#!/usr/bin/env php
<?php
/**
 * Script de configuración de WebServices para Academia Militar Digital
 * Ejecutar: php setup-webservice.php <wsuser> <wspassword> <token>
 *
 * Este script:
 *  1. Habilita WebServices globalmente
 *  2. Habilita el protocolo REST
 *  3. Crea el usuario wsuser con auth=webservice
 *  4. Asigna rol Manager en contexto sistema
 *  5. Agrega capability webservice/rest:use al rol Manager
 *  6. Crea el servicio "Academia API" con todas las funciones necesarias
 *  7. Crea el token fijo para el backend
 */

define('CLI_SCRIPT', true);
define('MOODLE_INTERNAL', true);

$wsUsername = $argv[1] ?? 'wsuser';
$wsPassword = $argv[2] ?? 'Wsuser1234!';
$wsToken    = $argv[3] ?? '30c111a89c22696e96d0e5c810861304';

require_once('/var/www/moodle/config.php');
require_once($CFG->libdir . '/clilib.php');
require_once($CFG->libdir . '/accesslib.php');
require_once($CFG->libdir . '/moodlelib.php');

// ─── 1. Habilitar WebServices ─────────────────────────────────────────────
echo "[ws-setup] Habilitando WebServices...\n";
set_config('enablewebservices', 1);
set_config('webserviceprotocols', 'rest');
set_config('enablewebservicelogging', 0);
echo "[ws-setup] enablewebservices=1, webserviceprotocols=rest\n";

// ─── 2. Crear o actualizar wsuser ─────────────────────────────────────────
echo "[ws-setup] Creando usuario $wsUsername...\n";
$user = $DB->get_record('user', ['username' => $wsUsername, 'deleted' => 0]);
if (!$user) {
    $user = new stdClass();
    $user->username     = $wsUsername;
    $user->password     = hash_internal_user_password($wsPassword);
    $user->firstname    = 'Web';
    $user->lastname     = 'Service';
    $user->email        = $wsUsername . '@academia.local';
    $user->auth         = 'webservice';
    $user->confirmed    = 1;
    $user->suspended    = 0;
    $user->deleted      = 0;
    $user->mnethostid   = $CFG->mnet_localhost_id;
    $user->lang         = 'en';
    $user->timezone     = '99';
    $user->timecreated  = time();
    $user->timemodified = time();
    $user->id = $DB->insert_record('user', $user);
    echo "[ws-setup] Usuario creado con id={$user->id}\n";
} else {
    // Asegurar que auth=webservice y no está suspendido
    $DB->update_record('user', [
        'id'        => $user->id,
        'auth'      => 'webservice',
        'suspended' => 0,
        'deleted'   => 0,
    ]);
    echo "[ws-setup] Usuario existente id={$user->id}, actualizado.\n";
}

// ─── 3. Asignar rol Manager en contexto sistema ───────────────────────────
echo "[ws-setup] Asignando rol Manager a $wsUsername...\n";
$systemContext = context_system::instance();
$managerRole   = $DB->get_record('role', ['shortname' => 'manager'], '*', MUST_EXIST);

// Verificar si ya tiene el rol
$existing = $DB->get_record('role_assignments', [
    'roleid'    => $managerRole->id,
    'contextid' => $systemContext->id,
    'userid'    => $user->id,
]);
if (!$existing) {
    role_assign($managerRole->id, $user->id, $systemContext->id, '', 0, time());
    echo "[ws-setup] Rol Manager asignado.\n";
} else {
    echo "[ws-setup] Rol Manager ya existía.\n";
}

// ─── 4. Capability webservice/rest:use para rol Manager ───────────────────
echo "[ws-setup] Asignando capability webservice/rest:use...\n";
assign_capability('webservice/rest:use', CAP_ALLOW, $managerRole->id, $systemContext->id, true);

// También asegurar moodle/webservice:createtoken
assign_capability('moodle/webservice:createtoken', CAP_ALLOW, $managerRole->id, $systemContext->id, true);

// ─── 5. Crear servicio "Academia API" ─────────────────────────────────────
echo "[ws-setup] Creando servicio Academia API...\n";
$service = $DB->get_record('external_services', ['shortname' => 'academia_api']);
if (!$service) {
    $serviceId = $DB->insert_record('external_services', (object)[
        'name'            => 'Academia API',
        'shortname'       => 'academia_api',
        'enabled'         => 1,
        'restrictedusers' => 0,
        'downloadfiles'   => 1,
        'uploadfiles'     => 1,
        'timecreated'     => time(),
        'timemodified'    => time(),
        'component'       => null,
    ]);
    $service = $DB->get_record('external_services', ['id' => $serviceId]);
    echo "[ws-setup] Servicio creado id={$serviceId}\n";
} else {
    // Asegurar que está habilitado
    $DB->update_record('external_services', [
        'id'              => $service->id,
        'enabled'         => 1,
        'restrictedusers' => 0,
    ]);
    echo "[ws-setup] Servicio existente id={$service->id}, habilitado.\n";
}

// ─── 6. Agregar funciones al servicio ─────────────────────────────────────
echo "[ws-setup] Registrando funciones en el servicio...\n";
$functions = [
    // Usuarios
    'core_user_create_users',
    'core_user_get_users',
    'core_user_update_users',
    'core_user_delete_users',
    'core_user_get_users_by_field',
    // Cursos
    'core_course_get_courses',
    'core_course_create_courses',
    'core_course_update_courses',
    'core_course_delete_courses',
    'core_course_get_categories',
    // Matrículas
    'enrol_manual_enrol_users',
    'enrol_manual_unenrol_users',
    'core_enrol_get_enrolled_users',
    'core_enrol_get_users_courses',
    // Calificaciones
    'core_grades_get_grades',
    'gradereport_user_get_grade_items',
    // Grupos
    'core_group_create_groups',
    'core_group_get_course_groups',
    'core_group_add_group_members',
    // Info del sitio
    'core_webservice_get_site_info',
];

foreach ($functions as $fname) {
    if (!$DB->record_exists('external_services_functions', [
        'externalserviceid' => $service->id,
        'functionname'      => $fname,
    ])) {
        $DB->insert_record('external_services_functions', (object)[
            'externalserviceid' => $service->id,
            'functionname'      => $fname,
        ]);
    }
}
echo "[ws-setup] " . count($functions) . " funciones registradas.\n";

// ─── 7. Crear token fijo ───────────────────────────────────────────────────
echo "[ws-setup] Creando token...\n";
$existingToken = $DB->get_record('external_tokens', ['token' => $wsToken]);
if (!$existingToken) {
    $DB->insert_record('external_tokens', (object)[
        'token'             => $wsToken,
        'userid'            => $user->id,
        'externalserviceid' => $service->id,
        'contextid'         => $systemContext->id,
        'creatorid'         => 2,
        'timecreated'       => time(),
        'iprestriction'     => '',
        'validuntil'        => 0,
        'name'              => 'Academia Backend Token',
        'sid'               => null,
    ]);
    echo "[ws-setup] Token creado: $wsToken\n";
} else {
    // Actualizar para asegurar que apunta al usuario y servicio correctos
    $DB->update_record('external_tokens', (object)[
        'id'                => $existingToken->id,
        'userid'            => $user->id,
        'externalserviceid' => $service->id,
        'contextid'         => $systemContext->id,
        'validuntil'        => 0,
        'iprestriction'     => '',
    ]);
    echo "[ws-setup] Token existente actualizado.\n";
}

// ─── 8. Limpiar caches de Moodle ──────────────────────────────────────────
echo "[ws-setup] Limpiando caches...\n";
purge_all_caches();

echo "[ws-setup] ✅ WebService configurado correctamente.\n";
echo "[ws-setup] Token: $wsToken\n";
echo "[ws-setup] Usuario: $wsUsername\n";
echo "[ws-setup] Servicio: Academia API (academia_api)\n";
echo "[ws-setup] URL: {$CFG->wwwroot}/webservice/rest/server.php\n";
