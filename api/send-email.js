const nodemailer = require('nodemailer');

export default async function handler(req, res) {
  // Solo permitimos peticiones POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { to, subject, html } = req.body;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: `"Transportes Vargas" <${process.env.SMTP_USER}>`,
      to: to,
      subject: subject,
      html: html,
    });
    res.status(200).json({ message: 'Correo enviado con éxito' });
  } catch (error) {
    console.error("Error enviando correo:", error);
    res.status(500).json({ error: 'No se pudo enviar el correo', details: error.message });
  }
}