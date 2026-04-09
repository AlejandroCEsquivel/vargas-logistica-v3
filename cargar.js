const fs = require('fs');
const csv = require('csv-parser');
const admin = require('firebase-admin');

// Asegúrate de que el archivo descargado de Firebase se llame llave.json
const serviceAccount = require("./llave.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

// Esta función lee el archivo y lo sube
async function subirDatos(archivoNombre, coleccionDestino) {
  console.log(`Leyendo archivo: ${archivoNombre}...`);
  
  fs.createReadStream(archivoNombre)
    .pipe(csv())
    .on('data', async (row) => {
      // Tomamos la primera columna del CSV sea cual sea su nombre
      const primeraColumna = Object.keys(row)[0];
      const valor = row[primeraColumna];

      if (valor) {
        const objetoNuevo = {
          nombre: valor.trim()
        };

        // Si estamos cargando vehículos, les asignamos el estado inicial
        if (coleccionDestino === 'vehiculos') {
          objetoNuevo.estado = 'Disponible'; // Esto hará que aparezcan en azul como querías
        }

        await db.collection(coleccionDestino).add(objetoNuevo);
        console.log(`✅ Subido a ${coleccionDestino}: ${valor}`);
      }
    })
    .on('end', () => {
      console.log(`--- Fin de carga de ${archivoNombre} ---`);
    });
}

// --- EJECUCIÓN CON TUS NUEVOS ARCHIVOS ---
// RECUERDA: Borra manualmente las colecciones en Firebase Console antes de correr esto 
// para que no se dupliquen con los viejos.

subirDatos('unidadesforaneos.csv', 'vehiculos');
subirDatos('empleadosforaneos.csv', 'choferes');