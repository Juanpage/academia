const PDFDocument = require('pdfkit');

function generarComprobanteStream(comprobante) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  // Header
  doc.fontSize(18).fillColor('#1B4332').text('ACADEMIA MILITAR DIGITAL', { align: 'center' });
  doc.fontSize(10).fillColor('#555').text('RUC: ' + (process.env.SRI_RUC || '0000000000001'), { align: 'center' });
  doc.text(process.env.SRI_DIRECCION || 'Ecuador', { align: 'center' });
  doc.moveDown();

  // Título comprobante
  doc.fontSize(14).fillColor('#000').text('RECIBO DE PAGO', { align: 'center' });
  doc.fontSize(12).text(`N° ${comprobante.numero}`, { align: 'center' });
  doc.moveDown();

  // Línea divisoria
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#1B4332');
  doc.moveDown(0.5);

  // Datos del receptor
  doc.fontSize(10).fillColor('#333');
  doc.text(`Fecha: ${new Date(comprobante.fecha_emision).toLocaleDateString('es-EC')}`, { align: 'right' });
  doc.moveDown(0.5);
  doc.text(`Señor(a): ${comprobante.nombre_receptor}`);
  doc.text(`Cédula/RUC: ${comprobante.cedula_ruc}`);
  doc.moveDown();

  // Tabla de detalle
  const tableTop = doc.y;
  doc.fillColor('#1B4332').rect(50, tableTop, 495, 20).fill();
  doc.fillColor('#fff').fontSize(10);
  doc.text('CONCEPTO', 60, tableTop + 5);
  doc.text('MONTO', 450, tableTop + 5, { align: 'right', width: 85 });

  const rowY = tableTop + 25;
  doc.fillColor('#000');
  doc.rect(50, rowY, 495, 20).stroke('#ccc');
  doc.text(comprobante.concepto || 'Pago Academia Militar', 60, rowY + 5);
  doc.text(`$${parseFloat(comprobante.total).toFixed(2)}`, 450, rowY + 5, { align: 'right', width: 85 });

  // Totales
  const totalesY = rowY + 35;
  doc.moveTo(50, totalesY).lineTo(545, totalesY).stroke('#1B4332');
  doc.fontSize(11).text(`TOTAL: $${parseFloat(comprobante.total).toFixed(2)}`, { align: 'right' });
  doc.moveDown(2);

  // Pie
  doc.fontSize(9).fillColor('#888');
  doc.text('Este comprobante es válido como constancia de pago.', { align: 'center' });
  doc.text('Academia Militar Digital - Ecuador', { align: 'center' });

  return doc;
}

module.exports = { generarComprobanteStream };
