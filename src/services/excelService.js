// src/services/excelService.js
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';

// --- FUNCIÓN 1: REPORTE DETALLADO ---
export const generarExcelRastreo = async (viajeActivoRastreo, puntosRevision, message) => {
  if (!viajeActivoRastreo) return;

  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Rastreo');

    // 1. Configurar anchos de columna
    worksheet.columns = [
      { width: 38 }, // A: Fecha y Hora
      { width: 45 }, // B: Ubicacion / Lugar / Chofer
      { width: 18 }, // C: Estatus / Origen
      { width: 22 }, // D: Velocidad / Destino
      { width: 55 }, // E: Observaciones
      { width: 20 }  // F: Link GPS / Sello
    ];

    const fechaI = viajeActivoRastreo.fechaInicioExacta ? new Date(viajeActivoRastreo.fechaInicioExacta).toLocaleDateString('es-MX') : '';
    const horaI = viajeActivoRastreo.fechaInicioExacta ? new Date(viajeActivoRastreo.fechaInicioExacta).toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'}) : '';
    const fechaF = viajeActivoRastreo.fechaFinExacta ? new Date(viajeActivoRastreo.fechaFinExacta).toLocaleDateString('es-MX') : '';
    const horaF = viajeActivoRastreo.fechaFinExacta ? new Date(viajeActivoRastreo.fechaFinExacta).toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'}) : 'En tránsito';

    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F497D' } };
    const subHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    const borderStyle = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };

    // Encabezado
    worksheet.mergeCells('A1:F2');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'RASTREO ESPECIAL DE VIAJE FORÁNEO';
    titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = headerFill;
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.addRow([]); 

    // Info General (NUEVO: Se añade el Folio/Clave en la fila 7)
    const row4 = worksheet.addRow(['Camión:', viajeActivoRastreo.unidad, '', 'Chofer:', viajeActivoRastreo.chofer, '']);
    const row5 = worksheet.addRow(['Caja:', viajeActivoRastreo.caja, '', 'Origen:', viajeActivoRastreo.origen, '']);
    const row6 = worksheet.addRow(['Cliente:', viajeActivoRastreo.cliente, '', 'Destino:', viajeActivoRastreo.destino, '']);
    const row7 = worksheet.addRow(['Carta Porte:', viajeActivoRastreo.cp, '', 'Folio Interno:', viajeActivoRastreo.clave || 'S/F', '']);
    
    const movText = viajeActivoRastreo.movimiento ? viajeActivoRastreo.movimiento.toUpperCase() : 'SALIDA';
    const expText = viajeActivoRastreo.esExportacion ? 'EXPORTACIÓN EE.UU.' : 'NACIONAL';
    const row8 = worksheet.addRow(['Movimiento:', movText, '', 'Servicio:', expText, '']);
    
    [row4, row5, row6, row7, row8].forEach(row => {
      row.getCell(1).font = { bold: true };
      row.getCell(4).font = { bold: true };
      row.getCell(2).alignment = { horizontal: 'left', wrapText: true };
      row.getCell(5).alignment = { horizontal: 'left', wrapText: true };
    });

    worksheet.addRow([]); 
    const depHeader = worksheet.addRow(['INFORMACIÓN DE SALIDA DE ORIGEN', 'Fecha', 'Hora', 'Lugar', '', 'No. de Sello']);
    depHeader.eachCell(cell => {
       cell.font = { bold: true };
       cell.fill = subHeaderFill;
       cell.border = borderStyle;
       cell.alignment = { horizontal: 'center' };
    });
    
    const depData = worksheet.addRow(['', fechaI, horaI, viajeActivoRastreo.origen, '', viajeActivoRastreo.sello || viajeActivoRastreo.cp]);
    depData.eachCell(cell => {
        cell.border = borderStyle;
        cell.alignment = { horizontal: 'center', wrapText: true };
    });
    worksheet.mergeCells(`D${depData.number}:E${depData.number}`);

    worksheet.addRow([]);
    const inspRow = worksheet.addRow(['Confirmar con el chofer inspección de 17 puntos', '', '', '', 'Sí [  ]', 'No [  ]']);
    inspRow.font = { bold: true };
    inspRow.fill = subHeaderFill;
    worksheet.mergeCells(`A${inspRow.number}:D${inspRow.number}`);
    inspRow.eachCell(cell => cell.border = borderStyle);

    worksheet.addRow([]);
    const trackTitle = worksheet.addRow(['RASTREO: LOCALIZACIÓN CADA HORA']);
    trackTitle.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    trackTitle.fill = headerFill;
    worksheet.mergeCells(`A${trackTitle.number}:F${trackTitle.number}`);
    trackTitle.alignment = { horizontal: 'center' };

    const headerRow = worksheet.addRow(['FECHA Y HORA', 'UBICACIÓN / LUGAR', 'ESTATUS', 'VELOCIDAD', 'OBSERVACIONES', 'LINK GPS']);
    headerRow.eachCell(cell => {
       cell.font = { bold: true };
       cell.fill = subHeaderFill;
       cell.border = borderStyle;
       cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Llenado dinámico
    const puntosAProcesar = puntosRevision.map(p => ({
      ...p,
      timeObj: dayjs(`${p.fecha} ${p.hora}`),
      esReal: true
    }));

    const horasCubiertas = new Set(puntosAProcesar.map(p => p.timeObj.format('YYYY-MM-DD HH')));
    let pivoteInicio = viajeActivoRastreo.fechaInicioExacta ? dayjs(viajeActivoRastreo.fechaInicioExacta) : (puntosAProcesar.length > 0 ? puntosAProcesar[0].timeObj : dayjs());
    let pivoteFin = viajeActivoRastreo.fechaFinExacta ? dayjs(viajeActivoRastreo.fechaFinExacta) : dayjs();

    puntosAProcesar.push({
      fecha: pivoteInicio.format('YYYY-MM-DD'),
      hora: pivoteInicio.format('HH:mm'),
      ubicacion: '🚀 --- INICIO DE VIAJE ---',
      lugar: '-', estatus: '-', velocidad: '-', observaciones: '-', link: '-',
      timeObj: pivoteInicio.clone().subtract(1, 'millisecond'),
      esMarcador: true
    });

    let iteradorHora = pivoteInicio.clone().startOf('hour');
    while (iteradorHora.isBefore(pivoteFin.clone().startOf('hour')) || iteradorHora.isSame(pivoteFin.clone().startOf('hour'), 'hour')) {
      const keyHora = iteradorHora.format('YYYY-MM-DD HH');
      if (!horasCubiertas.has(keyHora) && iteradorHora.isBefore(pivoteFin)) {
        puntosAProcesar.push({
          fecha: iteradorHora.format('YYYY-MM-DD'),
          hora: iteradorHora.format('HH:00'),
          ubicacion: 'SIN REPORTE',
          lugar: '-', estatus: '-', velocidad: '-',
          observaciones: 'Hora sin captura en bitácora', link: '-',
          timeObj: iteradorHora.clone(),
          esReal: false
        });
      }
      iteradorHora = iteradorHora.add(1, 'hour');
    }

    if (viajeActivoRastreo.estatus === 'finalizado' || viajeActivoRastreo.fechaFinExacta) {
      puntosAProcesar.push({
        fecha: pivoteFin.format('YYYY-MM-DD'),
        hora: pivoteFin.format('HH:mm'),
        ubicacion: '🏁 --- FIN DE VIAJE ---',
        lugar: '-', estatus: '-', velocidad: '-', observaciones: '-', link: '-',
        timeObj: pivoteFin.clone().add(1, 'millisecond'),
        esMarcador: true
      });
    }

    puntosAProcesar.sort((a, b) => a.timeObj.valueOf() - b.timeObj.valueOf());

    puntosAProcesar.forEach(p => {
      const ubiLugar = p.esMarcador ? p.ubicacion : (p.esReal ? `${p.ubicacion || ''} ${p.lugar && p.lugar !== '-' ? '- ' + p.lugar : ''}` : p.ubicacion);
      const dataRow = worksheet.addRow([`${p.fecha || ''} ${p.hora || ''}`, ubiLugar, p.estatus, p.velocidad, p.observaciones, '']);
      
      dataRow.eachCell((cell, colNumber) => {
        cell.border = borderStyle;
        cell.alignment = { vertical: 'middle', horizontal: [1,3,4].includes(colNumber) ? 'center' : 'left', wrapText: true };
        if (p.esMarcador) { cell.font = { bold: true }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } }; }
        else if (!p.esReal) { cell.font = { color: { argb: 'FF888888' }, italic: true }; }
      });

      const linkCell = dataRow.getCell(6);
      if (p.link && p.link !== '-' && p.link !== '') {
         linkCell.value = { text: 'Ver Mapa', hyperlink: p.link };
         linkCell.font = { color: { argb: 'FF0563C1' }, underline: true }; 
         linkCell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
         linkCell.value = '-';
         linkCell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });

    // Bloque Final
    worksheet.addRow([]);
    const arrHeader = worksheet.addRow(['INFORMACIÓN DE LLEGADA A DESTINO', 'Fecha', 'Hora', 'Lugar', '', 'No. de Sello']);
    arrHeader.eachCell(cell => { cell.font = { bold: true }; cell.fill = subHeaderFill; cell.border = borderStyle; cell.alignment = { horizontal: 'center' }; });

    const arrData = worksheet.addRow(['', fechaF, horaF, viajeActivoRastreo.destino, '', viajeActivoRastreo.sello || '']);
    arrData.eachCell(cell => { cell.border = borderStyle; cell.alignment = { horizontal: 'center', wrapText: true }; });
    worksheet.mergeCells(`D${arrData.number}:E${arrData.number}`);

    const buffer = await workbook.xlsx.writeBuffer();
    // NUEVO: Nombre del archivo incluye el folio
    const folioStr = viajeActivoRastreo.clave ? `${viajeActivoRastreo.clave}_` : '';
    saveAs(new Blob([buffer]), `SEG-T03_RASTREO_${folioStr}${viajeActivoRastreo.unidad}_CP_${viajeActivoRastreo.cp}.xlsx`);
    
  } catch (error) {
    console.error("Error detallado:", error);
    if(message) message.error("Error al generar el archivo Excel");
  }
};


// --- FUNCIÓN 2: NUEVO REPORTE GENERAL (LA SÁBANA) ---
export const generarExcelGeneral = async (viajesFiltrados) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte General');

    // 1. Columnas ajustadas para mayor espacio (NUEVO: Se agrega FOLIO al inicio)
    worksheet.columns = [
      { header: 'FOLIO', key: 'folio', width: 14 },     // <-- COLUMNA NUEVA
      { header: 'UNIDAD', key: 'unidad', width: 12 },
      { header: 'CHOFER', key: 'chofer', width: 35 },
      { header: 'CARTA PORTE', key: 'cp', width: 18 },
      { header: 'ORIGEN', key: 'origen', width: 45 },
      { header: 'DESTINO', key: 'destino', width: 50 }, 
      { header: 'CLIENTE', key: 'cliente', width: 30 },
      { header: 'MOVIMIENTO', key: 'movimiento', width: 15 },
      { header: 'SERVICIO', key: 'servicio', width: 20 },
      { header: 'SALIDA (Despegue)', key: 'salida', width: 22 },
      { header: 'LLEGADA (Arribo)', key: 'llegada', width: 22 }
    ];

    // 2. Estilos Encabezado
    const headerRow = worksheet.getRow(1);
    const borderStyleLight = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };

    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F497D' } }; 
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = borderStyleLight;
    });
    headerRow.height = 25;

    // 3. Llenado con Diseño "Cebra" y Bordes
    viajesFiltrados.forEach((viaje, index) => {
      const fechaInicio = viaje.fechaInicioExacta 
        ? new Date(viaje.fechaInicioExacta).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
        : `${viaje.fecha || ''} ${viaje.hora || ''}`;

      let fechaLlegada = 'EN TRÁNSITO 🚚';
      if (viaje.estatus === 'finalizado' || viaje.fechaFinExacta) {
        fechaLlegada = viaje.fechaFinExacta 
          ? new Date(viaje.fechaFinExacta).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
          : 'Finalizado';
      }

      const row = worksheet.addRow({
        folio: viaje.clave || 'S/F', // <-- NUEVO DATO
        unidad: viaje.unidad || '-',
        chofer: viaje.chofer || '-',
        cp: viaje.cp || 'Pendiente',
        origen: viaje.origen || '-',
        destino: viaje.destino || '-',
        cliente: viaje.cliente || '-',
        movimiento: viaje.movimiento ? viaje.movimiento.toUpperCase() : 'SALIDA',
        servicio: viaje.esExportacion ? 'EXPORTACIÓN EE.UU.' : 'NACIONAL',
        salida: fechaInicio,
        llegada: fechaLlegada
      });

      // Lógica de "Cebra": Si el índice es par, el fondo es blanco. Si es impar, es un gris clarito.
      const isEven = index % 2 === 0;
      const rowFill = isEven 
        ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } } 
        : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9F9F9' } }; 

      // 4. Formato de las filas de datos
      row.eachCell((cell, colNumber) => {
        cell.fill = rowFill;
        cell.border = borderStyleLight;

        // Centrar columnas clave actualizadas (ahora todo se movió un número a la derecha):
        // Folio(1), Unidad(2), CP(4), Movimiento(8), Servicio(9), Salida(10), Llegada(11)
        if ([1, 2, 4, 8, 9, 10, 11].includes(colNumber)) {
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        } else {
          // Alinear a la izquierda textos largos: Chofer(3), Origen(5), Destino(6), Cliente(7)
          cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        }
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const fechaHoy = new Date().toISOString().split('T')[0];
    saveAs(new Blob([buffer]), `Reporte_General_Vargas_${fechaHoy}.xlsx`);

  } catch (error) {
    console.error("Error Excel General:", error);
    throw error;
  }
};