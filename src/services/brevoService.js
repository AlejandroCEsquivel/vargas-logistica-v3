// src/services/brevoService.js

export const enviarConBrevo = async (destinatarios, asunto, contenidoHtml) => {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: destinatarios,
        subject: asunto,
        html: contenidoHtml
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error en el envío con el servidor');
    }
  } catch (error) {
    console.error("Error conectando al servidor:", error);
    throw error;
  }
};