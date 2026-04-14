/**
 * Validación de cédula ecuatoriana — Algoritmo Módulo 10
 */
const validateCedula = (cedula) => {
  if (!cedula || typeof cedula !== 'string') return false;
  if (!/^\d{10}$/.test(cedula)) return false;

  const provincia = parseInt(cedula.substring(0, 2));
  if (provincia < 1 || provincia > 24) return false;

  const tercerDigito = parseInt(cedula[2]);
  if (tercerDigito >= 6) return false; // personas naturales: 0-5

  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;

  for (let i = 0; i < 9; i++) {
    let val = parseInt(cedula[i]) * coeficientes[i];
    if (val >= 10) val -= 9;
    suma += val;
  }

  const digitoVerificador = parseInt(cedula[9]);
  const residuo = suma % 10;
  const calculado = residuo === 0 ? 0 : 10 - residuo;

  return calculado === digitoVerificador;
};

module.exports = { validateCedula };
