#!/bin/bash
set -e

MOODLE_DIR="/var/www/moodle"
MOODLE_DATA="/var/moodledata"
CONFIG_FILE="$MOODLE_DIR/config.php"
INSTALLED_FLAG="$MOODLE_DATA/.installed"

echo "[entrypoint] Esperando PostgreSQL en $MOODLE_DATABASE_HOST..."
until php -r "
  \$conn = pg_connect('host=${MOODLE_DATABASE_HOST} dbname=${MOODLE_DATABASE_NAME} user=${MOODLE_DATABASE_USER} password=${MOODLE_DATABASE_PASSWORD}');
  if (!\$conn) exit(1);
  pg_close(\$conn);
  exit(0);
" 2>/dev/null; do
  echo "[entrypoint] PostgreSQL no disponible aún, reintentando..."
  sleep 3
done
echo "[entrypoint] PostgreSQL disponible."

if [ ! -f "$INSTALLED_FLAG" ]; then
  echo "[entrypoint] Primera instalación de Moodle..."

  cat > "$CONFIG_FILE" <<PHPEOF
<?php
unset(\$CFG);
global \$CFG;
\$CFG = new stdClass();
\$CFG->dbtype    = 'pgsql';
\$CFG->dblibrary = 'native';
\$CFG->dbhost    = '${MOODLE_DATABASE_HOST}';
\$CFG->dbname    = '${MOODLE_DATABASE_NAME}';
\$CFG->dbuser    = '${MOODLE_DATABASE_USER}';
\$CFG->dbpass    = '${MOODLE_DATABASE_PASSWORD}';
\$CFG->prefix    = 'mdl_';
\$CFG->dboptions = array(
    'dbpersist' => 0,
    'dbport'    => 5432,
    'dbsocket'  => '',
    'dbcollation' => 'utf8_unicode_ci',
);
\$CFG->wwwroot   = '${MOODLE_WWWROOT}';
\$CFG->dataroot  = '${MOODLE_DATA}';
\$CFG->admin     = 'admin';
\$CFG->directorypermissions = 0777;
require_once(__DIR__ . '/lib/setup.php');
PHPEOF

  chown www-data:www-data "$CONFIG_FILE"

  echo "[entrypoint] Ejecutando instalación CLI de Moodle..."
  php "$MOODLE_DIR/admin/cli/install_database.php" \
    --lang=en \
    --adminuser="${MOODLE_ADMIN_USER}" \
    --adminpass="${MOODLE_ADMIN_PASSWORD}" \
    --adminemail="${MOODLE_ADMIN_EMAIL}" \
    --fullname="${MOODLE_SITE_NAME}" \
    --shortname="AMD" \
    --agree-license \
    2>&1 | tail -5

  echo "[entrypoint] Instalación CLI completada."

  echo "[entrypoint] Configurando WebServices..."
  # || true para que Apache arranque aunque el setup falle
  php /usr/local/bin/setup-webservice.php \
    "${MOODLE_WS_USER}" \
    "${MOODLE_WS_PASSWORD}" \
    "${MOODLE_WS_TOKEN}" || echo "[entrypoint] WARN: setup-webservice.php tuvo errores (no crítico)"

  touch "$INSTALLED_FLAG"
  echo "[entrypoint] Setup completo."
else
  echo "[entrypoint] Moodle ya instalado, ejecutando setup WebService por si acaso..."
  php /usr/local/bin/setup-webservice.php \
    "${MOODLE_WS_USER}" \
    "${MOODLE_WS_PASSWORD}" \
    "${MOODLE_WS_TOKEN}" || echo "[entrypoint] WARN: setup-webservice.php tuvo errores (no crítico)"
fi

echo "[entrypoint] Iniciando Apache..."
exec apache2-foreground