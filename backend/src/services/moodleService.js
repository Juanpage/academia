// src/services/moodleService.js
const axios = require('axios');
const { query, transaction } = require('../config/database');
const { sendCredentials } = require('./emailService');
const bcrypt = require('bcrypt');

const MOODLE_URL   = process.env.MOODLE_URL      || 'http://moodle.local:8080';
const MOODLE_TOKEN = process.env.MOODLE_WS_TOKEN || '30c111a89c22696e96d0e5c810861304';
const WS_ENDPOINT  = `${MOODLE_URL}/webservice/rest/server.php`;

// Las 6 materias del sistema
const MATERIAS = [
  { shortname: 'AMD_INGLES',    fullname: 'Ingles',                    materia_key: 'ingles' },
  { shortname: 'AMD_MATE',      fullname: 'Matematicas',               materia_key: 'matematicas' },
  { shortname: 'AMD_HISTORIA',  fullname: 'Historia y Realidad Nac.', materia_key: 'historia_realidad' },
  { shortname: 'AMD_LENGUAJE',  fullname: 'Lenguaje y Comunicacion',  materia_key: 'lenguaje_comunicacion' },
  { shortname: 'AMD_FISICA',    fullname: 'Fisica',                    materia_key: 'fisica' },
  { shortname: 'AMD_TRIGO',     fullname: 'Trigonometria',             materia_key: 'trigonometria' },
];

// --- Llamada base al WebService de Moodle ---
const callMoodle = async (wsfunction, params = {}) => {
  try {
    const response = await axios.post(WS_ENDPOINT, null, {
      params: { wstoken: MOODLE_TOKEN, wsfunction, moodlewsrestformat: 'json', ...params },
      timeout: 15000,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const data = response.data;
    if (data && data.exception) throw new Error(`Moodle error [${data.errorcode}]: ${data.message}`);
    return data;
  } catch (err) {
    if (err.response) throw new Error(`Moodle HTTP ${err.response.status}: ${err.response.statusText}`);
    throw err;
  }
};

// --- Ping ---
const ping = async () => {
  const info = await callMoodle('core_webservice_get_site_info');
  return { site: info.sitename, version: info.release, user: info.username };
};

// --- Setup inicial: crear los 6 cursos si no existen ---
const setupMoodleCourses = async () => {
  console.log('[Moodle] Verificando cursos del sistema...');
  let created = 0;
  for (const materia of MATERIAS) {
    // Verificar si ya existe en nuestra BD
    const existing = await query(
      'SELECT id FROM moodle_courses WHERE shortname=$1', [materia.shortname]
    );
    if (existing.rows.length > 0) continue;

    try {
      // Verificar si existe en Moodle
      const courses = await callMoodle('core_course_get_courses_by_field', {
        field: 'shortname', value: materia.shortname,
      });
      let courseId;
      if (courses.courses && courses.courses.length > 0) {
        courseId = courses.courses[0].id;
        console.log(`[Moodle] Curso existente: ${materia.fullname} (id=${courseId})`);
      } else {
        // Crear en Moodle
        const result = await callMoodle('core_course_create_courses', {
          'courses[0][fullname]':   materia.fullname,
          'courses[0][shortname]':  materia.shortname,
          'courses[0][categoryid]': 1,
          'courses[0][summary]':    `Curso de ${materia.fullname} - Academia Militar Digital`,
          'courses[0][format]':     'topics',
        });
        courseId = result[0]?.id;
        console.log(`[Moodle] Curso creado: ${materia.fullname} (id=${courseId})`);
        created++;
      }

      // Guardar mapeo en BD
      await query(
        `INSERT INTO moodle_courses (course_id, shortname, fullname, materia_key)
         VALUES ($1,$2,$3,$4) ON CONFLICT (shortname) DO UPDATE SET course_id=$1`,
        [courseId, materia.shortname, materia.fullname, materia.materia_key]
      );
    } catch (err) {
      console.error(`[Moodle] Error configurando curso ${materia.fullname}:`, err.message);
    }
  }
  console.log(`[Moodle] Setup completado. ${created} cursos nuevos creados.`);
};

// --- Crear usuario en Moodle + registrar en DB local ---
const createMoodleUser = async (aspirantData) => {
  const {
    cedula, first_name, last_name, email, phone, birth_date,
    gender, genero, address, city, password = 'Aspirante1234!',
  } = aspirantData;
  const username = `asp_${cedula}`;

  // 1. Insertar aspirante en PostgreSQL
  const aspirant = await transaction(async (client) => {
    const res = await client.query(
      `INSERT INTO aspirants
         (cedula, first_name, last_name, email, phone, birth_date, gender, genero, address, city, moodle_username)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [cedula, first_name, last_name, email, phone||null, birth_date||null,
       gender||null, genero||gender||'M', address||null, city||'Quito', username]
    );
    return res.rows[0];
  });

  // 2. Crear en Moodle
  let moodleUserId = null;
  try {
    const result = await callMoodle('core_user_create_users', {
      'users[0][username]':  username,
      'users[0][password]':  password,
      'users[0][firstname]': first_name,
      'users[0][lastname]':  last_name,
      'users[0][email]':     email,
      'users[0][auth]':      'manual',
    });
    moodleUserId = result[0]?.id;
  } catch (moodleErr) {
    await query('DELETE FROM aspirants WHERE id=$1', [aspirant.id]);
    throw new Error(`Rollback: Moodle fallo al crear usuario - ${moodleErr.message}`);
  }

  // 3. Guardar moodle_user_id
  await query('UPDATE aspirants SET moodle_user_id=$1 WHERE id=$2', [moodleUserId, aspirant.id]);

  // 4. Crear cuenta en users con rol aspirante
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    await query(
      `INSERT INTO users (username, email, password_hash, role, first_name, last_name, cedula, is_active)
       VALUES ($1,$2,$3,'aspirante',$4,$5,$6,true)
       ON CONFLICT (username) DO NOTHING`,
      [username, email, passwordHash, first_name, last_name, cedula]
    );
    console.log('[Sistema] Cuenta de aspirante creada:', username);
  } catch (err) {
    console.error('[Sistema] Error creando cuenta aspirante:', err.message);
  }

  // 4. Matricular en los 6 cursos
  try {
    await enrollInAllCourses(moodleUserId);
  } catch (err) {
    console.error('[Moodle] Error matriculando en cursos:', err.message);
  }

  // 5. Enviar credenciales por email
  try {
    await sendCredentials({
      nombre: `${first_name} ${last_name}`,
      email,
      cedula,
      username,
      password,
      moodleUrl: process.env.MOODLE_URL || 'http://localhost:8080',
      sistemaUrl: process.env.SISTEMA_URL || 'http://localhost:3001',
    });
  } catch (emailErr) {
    console.error('[Email] Error enviando credenciales:', emailErr.message);
  }

  // 6. Crear conceptos de pago automaticamente
  try {
    const { rows: conceptos } = await query('SELECT * FROM payment_concepts WHERE is_active=true');
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    const dueDateStr = dueDate.toISOString().split('T')[0];
    for (const concepto of conceptos) {
      await query(
        `INSERT INTO payments
          (aspirant_id, concept_id, concept, amount, currency, status,
           due_date, registered_by, monto_total, monto_pagado, saldo_pendiente)
         VALUES ($1,$2,$3,$4,'USD','pending',$5,$6,$4,$7,$4)`,
        [
          aspirant.id, concepto.id, concepto.name,
          parseFloat(concepto.amount), dueDateStr,
          null, 0
        ]
      );
    }
    console.log('[Pagos] ' + conceptos.length + ' conceptos creados para aspirante ' + cedula);
  } catch (err) {
    console.error('[Pagos] Error creando conceptos:', err.message);
  }

  return { ...aspirant, moodle_user_id: moodleUserId };
};

// --- Matricular aspirante en los 6 cursos ---
const enrollInAllCourses = async (moodleUserId) => {
  const courses = await query('SELECT course_id, fullname FROM moodle_courses');
  if (courses.rows.length === 0) {
    console.warn('[Moodle] No hay cursos configurados aun para matricular');
    return;
  }
  const params = {};
  courses.rows.forEach((c, i) => {
    params[`enrolments[${i}][roleid]`]   = 5; // student
    params[`enrolments[${i}][userid]`]   = moodleUserId;
    params[`enrolments[${i}][courseid]`] = c.course_id;
  });
  await callMoodle('enrol_manual_enrol_users', params);
  console.log(`[Moodle] Usuario ${moodleUserId} matriculado en ${courses.rows.length} cursos`);
};

// --- Obtener usuario Moodle ---
const getMoodleUser = async (field, value) => {
  const result = await callMoodle('core_user_get_users_by_field', {
    field, 'values[0]': value,
  });
  return result?.[0] || null;
};

// --- Listar cursos ---
const getCourses = async () => callMoodle('core_course_get_courses');

const createCourse = async ({ fullname, shortname, categoryid = 1, summary = '' }) => {
  const result = await callMoodle('core_course_create_courses', {
    'courses[0][fullname]':   fullname,
    'courses[0][shortname]':  shortname,
    'courses[0][categoryid]': categoryid,
    'courses[0][summary]':    summary,
    'courses[0][format]':     'topics',
  });
  return result?.[0];
};

// --- Matricular en un curso ---
const enrollUser = async (moodleUserId, courseId, roleId = 5) => {
  return callMoodle('enrol_manual_enrol_users', {
    'enrolments[0][roleid]':   roleId,
    'enrolments[0][userid]':   moodleUserId,
    'enrolments[0][courseid]': courseId,
  });
};

const getEnrolledUsers = async (courseId) => {
  return callMoodle('core_enrol_get_enrolled_users', { courseid: courseId });
};

// --- Obtener notas de un curso ---
const getGrades = async (courseId, userIds = []) => {
  const params = { courseid: courseId };
  if (userIds.length > 0) params['userid'] = userIds[0];
  return callMoodle('gradereport_user_get_grade_items', params);
};

// --- Sincronizar notas Moodle -> academic_evaluations ---
const syncGrades = async () => {
  const log = { synced: 0, errors: 0, courses: 0 };
  try {
    // Obtener cursos configurados en el sistema
    const { rows: materias } = await query('SELECT * FROM moodle_courses');
    if (materias.length === 0) {
      console.log('[Moodle Sync] No hay cursos configurados');
      return log;
    }
    log.courses = materias.length;

    // Para cada aspirante con cuenta Moodle, obtener sus notas
    const { rows: aspirants } = await query(
      'SELECT id, moodle_user_id FROM aspirants WHERE moodle_user_id IS NOT NULL'
    );

    for (const aspirant of aspirants) {
      const gradeData = {};
      let hasGrades = false;

      for (const materia of materias) {
        try {
          const report = await getGrades(materia.course_id, [aspirant.moodle_user_id]);
          const userGrades = report?.usergrades?.[0];
          if (!userGrades) continue;

          const finalItem = userGrades.gradeitems?.find(g => g.itemtype === 'course');
          if (!finalItem || finalItem.graderaw == null) continue;

          // Convertir escala Moodle (0-100) a escala sistema (0-20)
          const gradeRaw = parseFloat(finalItem.graderaw) || 0;
          const gradeMax = parseFloat(finalItem.grademax) || 100;
          const grade20  = parseFloat(((gradeRaw / gradeMax) * 20).toFixed(2));

          gradeData[materia.materia_key] = grade20;
          hasGrades = true;
        } catch (err) {
          log.errors++;
          console.error(`[Moodle Sync] Error en curso ${materia.fullname}:`, err.message);
        }
      }

      if (!hasGrades) continue;

      // Insertar en academic_evaluations con las notas sincronizadas
      try {
        await query(
          `INSERT INTO academic_evaluations (
             aspirant_id, periodo,
             ingles, matematicas, historia_realidad,
             lenguaje_comunicacion, fisica, trigonometria,
             promedio_10, promedio_100,
             notes, evaluated_by
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            aspirant.id,
            'MOODLE_SYNC',
            gradeData.ingles || null,
            gradeData.matematicas || null,
            gradeData.historia_realidad || null,
            gradeData.lenguaje_comunicacion || null,
            gradeData.fisica || null,
            gradeData.trigonometria || null,
            null, // promedio_10 calculado abajo
            null,
            'Sincronizado desde Moodle',
            null,
          ]
        );

        // Calcular promedio y actualizar
        const vals = Object.values(gradeData).filter(v => v != null);
        if (vals.length > 0) {
          const avg = parseFloat((vals.reduce((a,b) => a+b, 0) / vals.length).toFixed(2));
          await query(
            `UPDATE academic_evaluations
             SET promedio_10=$1, promedio_100=$2, updated_at=NOW()
             WHERE aspirant_id=$3 AND periodo='MOODLE_SYNC'
             ORDER BY created_at DESC LIMIT 1`,
            [avg, avg, aspirant.id]
          );
          // Actualizar score en aspirants
          await query(
            `UPDATE aspirants SET academic_score=$1 WHERE id=$2`,
            [avg, aspirant.id]
          );
        }
        log.synced++;
      } catch (err) {
        log.errors++;
        console.error(`[Moodle Sync] Error guardando notas aspirante ${aspirant.id}:`, err.message);
      }
    }

    await query(
      `INSERT INTO moodle_sync_logs (operation, status, details) VALUES ('sync_grades','success',$1)`,
      [JSON.stringify(log)]
    );
  } catch (err) {
    await query(
      `INSERT INTO moodle_sync_logs (operation, status, details) VALUES ('sync_grades','error',$1)`,
      [JSON.stringify({ error: err.message })]
    );
    throw err;
  }
  return log;
};

module.exports = {
  ping, callMoodle, createMoodleUser, getMoodleUser,
  getCourses, createCourse, enrollUser, getEnrolledUsers,
  getGrades, syncGrades, setupMoodleCourses, enrollInAllCourses,
};
