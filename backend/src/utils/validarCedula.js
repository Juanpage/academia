// validarCedula.js — Algoritmo módulo 10, cédulas ecuatorianas

function validarCedula(cedula) {
  if (!cedula || cedula.length !== 10 || !/^\d{10}$/.test(cedula)) return false;
  const provincia = parseInt(cedula.substring(0, 2));
  if (provincia < 1 || provincia > 24) return false;

  const digitos = cedula.split('').map(Number);
  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;

  for (let i = 0; i < 9; i++) {
    let val = digitos[i] * coeficientes[i];
    if (val >= 10) val -= 9;
    suma += val;
  }

  const verificador = suma % 10 === 0 ? 0 : 10 - (suma % 10);
  return verificador === digitos[9];
}

module.exports = { validarCedula };
