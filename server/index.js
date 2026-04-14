const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json()); // Para poder leer el cuerpo (body) de las peticiones JSON

// Configuración del "Cartero" (Nodemailer) usando tu .env
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true, // true para puerto 465, false para otros
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// Verificar que la conexión con Gmail sea correcta al iniciar
transporter.verify((error, success) => {
    if (error) {
        console.log("❌ Error en la configuración de correo:", error);
    } else {
        console.log("✅ Servidor listo para enviar correos");
    }
});

// Ruta principal para recibir los datos del viaje desde React
app.post('/api/send-email', async (req, res) => {
    const { to, subject, html } = req.body;

    const mailOptions = {
        from: `"Transportes Vargas" <${process.env.SMTP_USER}>`,
        to: to,
        subject: subject,
        html: html, // Aquí llegará todo el diseño que ya tienes en React
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Correo enviado con éxito' });
    } catch (error) {
        console.error("Error al enviar correo:", error);
        res.status(500).json({ error: 'No se pudo enviar el correo' });
    }
});

// Iniciar el servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor backend corriendo en el puerto ${PORT}`);
});