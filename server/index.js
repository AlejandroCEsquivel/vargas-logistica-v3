const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Configuración optimizada para Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail', // Al usar 'gmail', Nodemailer ya sabe los puertos y hosts correctos
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// Verificar conexión
transporter.verify((error, success) => {
    if (error) {
        console.log("❌ Error en la configuración de correo:", error);
    } else {
        console.log("✅ Servidor listo para enviar correos");
    }
});

// Ruta para enviar el correo
app.post('/api/send-email', async (req, res) => {
    const { to, subject, html } = req.body;

    const mailOptions = {
        from: `"Transportes Vargas" <${process.env.SMTP_USER}>`,
        to: to,
        subject: subject,
        html: html,
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Correo enviado con éxito' });
    } catch (error) {
        console.error("Error al enviar correo:", error);
        res.status(500).json({ error: 'No se pudo enviar el correo', details: error.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor backend corriendo en el puerto ${PORT}`);
});