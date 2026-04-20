// src/services/excelService.js
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';

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

    // Tiempos extraídos
    const fechaI = viajeActivoRastreo.fechaInicioExacta ? new Date(viajeActivoRastreo.fechaInicioExacta).toLocaleDateString('es-MX') : '';
    const horaI = viajeActivoRastreo.fechaInicioExacta ? new Date(viajeActivoRastreo.fechaInicioExacta).toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'}) : '';
    const fechaF = viajeActivoRastreo.fechaFinExacta ? new Date(viajeActivoRastreo.fechaFinExacta).toLocaleDateString('es-MX') : '';
    const horaF = viajeActivoRastreo.fechaFinExacta ? new Date(viajeActivoRastreo.fechaFinExacta).toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'}) : 'En tránsito';

    // Estilos reutilizables
    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F497D' } };
    const subHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    const borderStyle = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };

    // 2. Encabezado principal
    worksheet.mergeCells('A1:F2');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'RASTREO ESPECIAL DE VIAJE FORÁNEO';
    titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = headerFill;
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.addRow([]); // Espacio

    // 3. Información general del viaje
    const row4 = worksheet.addRow(['Camión:', viajeActivoRastreo.unidad, '', 'Chofer:', viajeActivoRastreo.chofer, '']);
    const row5 = worksheet.addRow(['Caja:', viajeActivoRastreo.caja, '', 'Origen:', viajeActivoRastreo.origen, '']);
    const row6 = worksheet.addRow(['Cliente:', viajeActivoRastreo.cliente, '', 'Destino:', viajeActivoRastreo.destino, '']);
    const row7 = worksheet.addRow(['Carta Porte:', viajeActivoRastreo.cp, '', '', '', '']);
    
    const movText = viajeActivoRastreo.movimiento ? viajeActivoRastreo.movimiento.toUpperCase() : 'SALIDA';
    const expText = viajeActivoRastreo.esExportacion ? 'EXPORTACIÓN EE.UU.' : 'NACIONAL';
    const row8 = worksheet.addRow(['Movimiento:', movText, '', 'Servicio:', expText, '']);
    
    [row4, row5, row6, row7, row8].forEach(row => {
      row.getCell(1).font = { bold: true };
      row.getCell(4).font = { bold: true };
      row.getCell(2).alignment = { horizontal: 'left', wrapText: true };
      row.getCell(5).alignment = { horizontal: 'left', wrapText: true };
    });

    // 4. Bloque Salida
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

    // 5. Los 17 Puntos
    worksheet.addRow([]);
    const inspRow = worksheet.addRow(['Confirmar con el chofer inspección de 17 puntos', '', '', '', 'Sí [  ]', 'No [  ]']);
    inspRow.font = { bold: true };
    inspRow.fill = subHeaderFill;
    worksheet.mergeCells(`A${inspRow.number}:D${inspRow.number}`);
    inspRow.eachCell(cell => cell.border = borderStyle);

    // 6. Encabezado de la bitácora
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

    // 7. LLENADO DINÁMICO
    const puntosAProcesar = puntosRevision.map(p => ({
      ...p,
      timeObj: dayjs(`${p.fecha} ${p.hora}`),
      esReal: true
    }));

    const horasCubiertas = new Set(puntosAProcesar.map(p => p.timeObj.format('YYYY-MM-DD HH')));

    let pivoteInicio = viajeActivoRastreo.fechaInicioExacta ? dayjs(viajeActivoRastreo.fechaInicioExacta) : null;
    let pivoteFin = viajeActivoRastreo.fechaFinExacta ? dayjs(viajeActivoRastreo.fechaFinExacta) : dayjs();

    if (!pivoteInicio && puntosAProcesar.length > 0) {
      pivoteInicio = puntosAProcesar[0].timeObj;
    } else if (!pivoteInicio) {
      pivoteInicio = dayjs();
    }

    puntosAProcesar.push({
      fecha: pivoteInicio.format('YYYY-MM-DD'),
      hora: pivoteInicio.format('HH:mm'),
      ubicacion: '🚀 --- INICIO DE VIAJE ---',
      lugar: '-', estatus: '-', velocidad: '-', observaciones: '-', link: '-',
      timeObj: pivoteInicio.clone().subtract(1, 'millisecond'),
      esMarcador: true
    });

    let iteradorHora = pivoteInicio.clone().startOf('hour');
    const finHoraRango = pivoteFin.clone().startOf('hour');

    while (iteradorHora.isBefore(finHoraRango) || iteradorHora.isSame(finHoraRango, 'hour')) {
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
      const fechaHora = `${p.fecha || ''} ${p.hora || ''}`;
      
      let ubiLugar = '';
      if (p.esMarcador) {
          ubiLugar = p.ubicacion;
      } else if (p.esReal) {
          ubiLugar = `${p.ubicacion || ''} ${p.lugar && p.lugar !== '-' ? '- ' + p.lugar : ''}`;
      } else {
          ubiLugar = p.ubicacion;
      }
      
      const dataRow = worksheet.addRow([fechaHora, ubiLugar, p.estatus, p.velocidad, p.observaciones, '']);
      
      dataRow.eachCell((cell, colNumber) => {
        cell.border = borderStyle;
        cell.alignment = { 
            vertical: 'middle', 
            horizontal: colNumber === 1 || colNumber === 3 || colNumber === 4 ? 'center' : 'left',
            wrapText: true 
        };

        if (p.esMarcador) {
            cell.font = { bold: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
        } else if (!p.esReal && !p.esMarcador) {
            cell.font = { color: { argb: 'FF888888' }, italic: true };
        }
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

    // 8. Bloque Llegada Destino
    worksheet.addRow([]);
    const arrHeader = worksheet.addRow(['INFORMACIÓN DE LLEGADA A DESTINO', 'Fecha', 'Hora', 'Lugar', '', 'No. de Sello']);
    arrHeader.eachCell(cell => {
       cell.font = { bold: true };
       cell.fill = subHeaderFill;
       cell.border = borderStyle;
       cell.alignment = { horizontal: 'center' };
    });

    const arrData = worksheet.addRow(['', fechaF, horaF, viajeActivoRastreo.destino, '', viajeActivoRastreo.sello || '']);
    arrData.eachCell(cell => {
        cell.border = borderStyle;
        cell.alignment = { horizontal: 'center', wrapText: true };
    });

    // 9. Generar y descargar
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `SEG-T03_RASTREO_${viajeActivoRastreo.unidad}_CP_${viajeActivoRastreo.cp}.xlsx`);
    
  } catch (error) {
    console.error("Error generando Excel:", error);
    if(message) message.error("Hubo un error al generar el archivo Excel");
  }
};