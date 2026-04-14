// Baremos basados en tablas oficiales FFAA Ecuador
// Los valores representan el puntaje obtenido segun rendimiento

const BAREMOS_HOMBRE = {
  flexiones: [
    { min: 65, score: 100 }, { min: 55, score: 90 }, { min: 45, score: 80 },
    { min: 35, score: 70 }, { min: 25, score: 60 }, { min: 0, score: 40 },
  ],
  abdominales: [
    { min: 75, score: 100 }, { min: 65, score: 90 }, { min: 55, score: 80 },
    { min: 45, score: 70 }, { min: 35, score: 60 }, { min: 0, score: 40 },
  ],
  sentadillas: [
    { min: 80, score: 100 }, { min: 70, score: 90 }, { min: 60, score: 80 },
    { min: 50, score: 70 }, { min: 0, score: 50 },
  ],
  pull_ups: [
    { min: 15, score: 100 }, { min: 12, score: 90 }, { min: 9, score: 80 },
    { min: 6, score: 70 }, { min: 3, score: 60 }, { min: 0, score: 40 },
  ],
  // Carreras: menor tiempo = mejor puntaje (max = limite)
  carrera_1000m: [
    { max: 200, score: 100 }, { max: 220, score: 90 }, { max: 240, score: 80 },
    { max: 270, score: 70 }, { max: 300, score: 60 }, { max: 9999, score: 40 },
  ],
  carrera_2000m: [
    { max: 450, score: 100 }, { max: 480, score: 90 }, { max: 510, score: 80 },
    { max: 540, score: 70 }, { max: 600, score: 60 }, { max: 9999, score: 40 },
  ],
};

const BAREMOS_MUJER = {
  flexiones: [
    { min: 45, score: 100 }, { min: 35, score: 90 }, { min: 25, score: 80 },
    { min: 15, score: 70 }, { min: 0, score: 50 },
  ],
  abdominales: [
    { min: 55, score: 100 }, { min: 45, score: 90 }, { min: 35, score: 80 },
    { min: 25, score: 70 }, { min: 0, score: 50 },
  ],
  sentadillas: [
    { min: 70, score: 100 }, { min: 60, score: 90 }, { min: 50, score: 80 },
    { min: 40, score: 70 }, { min: 0, score: 50 },
  ],
  pull_ups: [
    { min: 5, score: 100 }, { min: 3, score: 80 }, { min: 1, score: 60 }, { min: 0, score: 40 },
  ],
  carrera_1000m: [
    { max: 240, score: 100 }, { max: 270, score: 90 }, { max: 300, score: 80 },
    { max: 330, score: 70 }, { max: 360, score: 60 }, { max: 9999, score: 40 },
  ],
  carrera_2000m: [
    { max: 540, score: 100 }, { max: 570, score: 90 }, { max: 600, score: 80 },
    { max: 660, score: 70 }, { max: 720, score: 60 }, { max: 9999, score: 40 },
  ],
};

const PESOS_PRUEBAS = {
  flexiones:    0.18,
  abdominales:  0.18,
  sentadillas:  0.14,
  pull_ups:     0.14,
  carrera_1000m: 0.26,
  carrera_2000m: 0.10,
};

function obtenerPuntaje(baremo, prueba, valor) {
  if (valor === null || valor === undefined) return null;
  const tabla = baremo[prueba];
  if (!tabla) return null;
  // Carrera: buscar por max (menor = mejor)
  if (prueba.includes('carrera') || prueba.includes('natacion')) {
    const entry = tabla.find(b => valor <= b.max);
    return entry ? entry.score : 40;
  }
  // Resto: buscar por min
  const entry = tabla.find(b => valor >= b.min);
  return entry ? entry.score : 40;
}

function calcularScoreFisico(datos, genero = 'M') {
  const baremo = genero === 'F' ? BAREMOS_MUJER : BAREMOS_HOMBRE;
  let sumaScore = 0;
  let sumaPesos = 0;
  const detalle = {};

  for (const [prueba, peso] of Object.entries(PESOS_PRUEBAS)) {
    if (datos[prueba] !== null && datos[prueba] !== undefined) {
      const puntaje = obtenerPuntaje(baremo, prueba, datos[prueba]);
      if (puntaje !== null) {
        sumaScore += puntaje * peso;
        sumaPesos += peso;
        detalle[prueba] = { valor: datos[prueba], puntaje };
      }
    }
  }

  const score = sumaPesos > 0 ? (sumaScore / sumaPesos) : 0;
  return { score: Math.round(score * 100) / 100, detalle };
}

module.exports = { calcularScoreFisico };
