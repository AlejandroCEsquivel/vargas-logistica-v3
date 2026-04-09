const fs = require('fs');
const csv = require('csv-parser');
const admin = require('firebase-admin');

// Asegúrate de que el archivo descargado de Firebase se llame llave.json
const serviceAccount = require("./llave.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

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
        // --- INICIO DE CAMBIOS PARA DISPONIBILIDAD ---
        const objetoNuevo = {
          nombre: valor.trim()
        };

        // Si estamos cargando vehículos, les asignamos el estado inicial
        if (coleccionDestino === 'vehiculos') {
          objetoNuevo.estado = 'Disponible';
        }
        // --- FIN DE CAMBIOS ---

        await db.collection(coleccionDestino).add(objetoNuevo);
        console.log(`✅ Subido a ${coleccionDestino}: ${valor}`);
      }
    })
    .on('end', () => {
      console.log(`--- Fin de carga de ${archivoNombre} ---`);
    });
}

// EJECUCIÓN
// Primero borra la colección "vehiculos" en tu consola de Firebase antes de correr esto
subirDatos('unidades.csv', 'vehiculos');
subirDatos('empleados.csv', 'choferes');