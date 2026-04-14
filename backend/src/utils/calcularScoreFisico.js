// Baremos FFAA Ecuador — tablas de calificación por prueba física

const BAREMOS = {
  flexiones: [
    { min: 65, score: 100 }, { min: 55, score: 90 }, { min: 45, score: 80 },
    { min: 35, score: 70 },  { min: 25, score: 60 }, { min: 15, score: 50 },
    { min: 0,  score: 30 },
  ],
  abdominales: [
    { min: 75, score: 100 }, { min: 65, score: 90 }, { min: 55, score: 80 },
    { min: 45, score: 70 },  { min: 35, score: 60 }, { min: 0,  score: 40 },
  ],
  sentadillas: [
    { min: 60, score: 100 }, { min: 50, score: 90 }, { min: 40, score: 80 },
    { min: 30, score: 70 },  { min: 0,  score: 50 },
  ],
  pull_ups: [
    { min: 20, score: 100 }, { min: 15, score: 90 }, { min: 10, score: 80 },
    { min: 7,  score: 70 },  { min: 4,  score: 60 }, { min: 0,  score: 40 },
  ],
  // Tiempo en segundos — menor es mejor
  carrera_1000m: [
    { max: 200, score: 100 }, { max: 220, score: 90 }, { max: 240, score: 80 },
    { max: 260, score: 70 },  { max: 280, score: 60 }, { max: 999, score: 40 },
  ],
  carrera_2000m: [
    { max: 480, score: 100 }, { max: 510, score: 90 }, { max: 540, score: 80 },
    { max: 570, score: 70 },  { max: 600, score: 60 }, { max: 9999, score: 40 },
  ],
};

// Pesos por prueba (suman 1.0)
const PESOS = {
  flexiones:    0.20,
  abdominales:  0.20,
  sentadillas:  0.10,
  pull_ups:     0.10,
  carrera_1000m: 0.25,
  carrera_2000m: 0.15,
};

function calcularPuntuacion(prueba, valor) {
  if (valor === null || valor === undefined) return null;
  const baremo = BAREMOS[prueba];
  if (!baremo) return 0;

  const esCarrera = prueba.startsWith('carrera_');
  if (esCarrera) {
    const entry = baremo.find(b => valor <= b.max);
    return entry?.score ?? 0;
  }
  const entry = baremo.find(b => valor >= b.min);
  return entry?.score ?? 0;
}

function calcularScoreFisico(datos) {
  let totalPeso = 0;
  let totalScore = 0;

  for (const [prueba, peso] of Object.entries(PESOS)) {
    if (datos[prueba] !== null && datos[prueba] !== undefined) {
      const puntos = calcularPuntuacion(prueba, datos[prueba]);
      if (puntos !== null) {
        totalScore += puntos * peso;
        totalPeso += peso;
      }
    }
  }

  if (totalPeso === 0) return 0;
  // Normalizar al peso total disponible
  return Math.round((totalScore / totalPeso) * totalPeso * 100) / 100;
}

module.exports = { calcularScoreFisico, calcularPuntuacion, BAREMOS, PESOS };
