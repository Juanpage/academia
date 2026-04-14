// src/services/emailService.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const sendCredentials = async ({ nombre, email, cedula, username, password, moodleUrl, sistemaUrl }) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center" style="padding:30px 0;">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;">
            <!-- Header -->
            <tr><td style="background:#1a2e1a;padding:30px;text-align:center;">
              <h1 style="color:#c9a227;margin:0;font-size:24px;">ACADEMIA MILITAR DIGITAL</h1>
              <p style="color:#8a9a8a;margin:8px 0 0;">Sistema de Gestion de Aspirantes</p>
            </td></tr>
            <!-- Body -->
            <tr><td style="padding:30px;">
              <p style="color:#333;font-size:16px;">Estimado/a <strong>${nombre}</strong>,</p>
              <p style="color:#555;">Su registro ha sido completado exitosamente. A continuacion sus credenciales de acceso:</p>
              <!-- Credenciales Sistema -->
              <div style="background:#f8f9fa;border-left:4px solid #c9a227;padding:20px;margin:20px 0;border-radius:4px;">
                <h3 style="color:#1a2e1a;margin:0 0 15px;">Acceso al Sistema Web</h3>
                <table cellpadding="6">
                  <tr><td style="color:#666;width:140px;">URL:</td><td><a href="${sistemaUrl}" style="color:#c9a227;">${sistemaUrl}</a></td></tr>
                  <tr><td style="color:#666;">Usuario:</td><td><strong>${username}</strong></td></tr>
                  <tr><td style="color:#666;">Contrasena:</td><td><strong>${password}</strong></td></tr>
                  <tr><td style="color:#666;">Cedula:</td><td>${cedula}</td></tr>
                </table>
              </div>
              <!-- Credenciales Moodle -->
              <div style="background:#f8f9fa;border-left:4px solid #2d5a2d;padding:20px;margin:20px 0;border-radius:4px;">
                <h3 style="color:#1a2e1a;margin:0 0 15px;">Acceso a Plataforma Moodle (Cursos)</h3>
                <table cellpadding="6">
                  <tr><td style="color:#666;width:140px;">URL:</td><td><a href="${moodleUrl}" style="color:#2d5a2d;">${moodleUrl}</a></td></tr>
                  <tr><td style="color:#666;">Usuario:</td><td><strong>asp_${cedula}</strong></td></tr>
                  <tr><td style="color:#666;">Contrasena:</td><td><strong>${password}</strong></td></tr>
                </table>
              </div>
              <div style="background:#fff3cd;border:1px solid #ffc107;padding:15px;border-radius:4px;margin:20px 0;">
                <p style="margin:0;color:#856404;font-size:14px;">
                  <strong>Importante:</strong> Por seguridad, le recomendamos cambiar su contrasena en el primer inicio de sesion.
                </p>
              </div>
              <p style="color:#555;">Si tiene alguna duda, contacte a la administracion de la Academia.</p>
            </td></tr>
            <!-- Footer -->
            <tr><td style="background:#1a2e1a;padding:20px;text-align:center;">
              <p style="color:#8a9a8a;margin:0;font-size:12px;">Academia Militar Digital &mdash; Confidencial</p>
              <p style="color:#8a9a8a;margin:5px 0 0;font-size:12px;">Este correo fue generado automaticamente, no responda a este mensaje.</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Credenciales de Acceso - Academia Militar Digital',
    html,
  });

  console.log(`[Email] Credenciales enviadas a ${email}`);
};

const sendPasswordReset = async ({ nombre, email, resetToken, sistemaUrl }) => {
  const resetUrl = `${sistemaUrl}/reset-password?token=${resetToken}`;
  await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Restablecimiento de Contrasena - Academia Militar Digital',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#1a2e1a;padding:20px;text-align:center;">
          <h2 style="color:#c9a227;margin:0;">Academia Militar Digital</h2>
        </div>
        <div style="padding:30px;">
          <p>Estimado/a <strong>${nombre}</strong>,</p>
          <p>Se ha solicitado el restablecimiento de su contrasena. Haga clic en el siguiente enlace:</p>
          <div style="text-align:center;margin:30px 0;">
            <a href="${resetUrl}" style="background:#c9a227;color:#1a2e1a;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:bold;">
              Restablecer Contrasena
            </a>
          </div>
          <p style="color:#666;font-size:14px;">Este enlace expira en 1 hora. Si no solicitó este cambio, ignore este mensaje.</p>
        </div>
      </div>
    `,
  });
  console.log(`[Email] Reset de contrasena enviado a ${email}`);
};

module.exports = { sendCredentials, sendPasswordReset };
