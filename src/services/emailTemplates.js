// src/services/emailTemplates.js

export const generarTablaNuevoViajeHTML = (nuevoRegistro, datosNuevoViaje) => `
  <div style="font-family: 'Times New Roman', serif, Arial; color: #000; font-size: 13px;">
    <p style="text-align: center; font-weight: bold; background-color: #fff2cc; padding: 5px; margin-bottom: 0; width: fit-content; margin-left: auto; margin-right: auto;">Nuevo viaje foraneo</p>
    <table style="width: 100%; max-width: 800px; border-collapse: collapse; border: 1px solid #000; font-size: 12px; margin-top: 5px;">
      <tbody>
        <tr>
          <td style="border: 1px solid #000; padding: 5px; width: 30%;">Fecha y hora de salida:</td>
          <td style="border: 1px solid #000; padding: 5px;">${nuevoRegistro.fecha} ${nuevoRegistro.hora}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #000; padding: 5px;">Tractor:</td>
          <td style="border: 1px solid #000; padding: 5px;">${datosNuevoViaje.unidad || ''}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #000; padding: 5px;">Remolque:</td>
          <td style="border: 1px solid #000; padding: 5px;">${datosNuevoViaje.caja || ''}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #000; padding: 5px;">Chofer:</td>
          <td style="border: 1px solid #000; padding: 5px;">${datosNuevoViaje.chofer || ''}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #000; padding: 5px;">Cliente:</td>
          <td style="border: 1px solid #000; padding: 5px;">${datosNuevoViaje.cliente || ''}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #000; padding: 5px;">Origen:</td>
          <td style="border: 1px solid #000; padding: 5px;">${datosNuevoViaje.origen || ''}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #000; padding: 5px;">Destino:</td>
          <td style="border: 1px solid #000; padding: 5px;">${datosNuevoViaje.destino || ''}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #000; padding: 5px;"># Carta Porte:</td>
          <td style="border: 1px solid #000; padding: 5px;">${nuevoRegistro.cp}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #000; padding: 5px;">Sello:</td>
          <td style="border: 1px solid #000; padding: 5px;">${nuevoRegistro.sello}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #000; padding: 5px;">Movimiento:</td>
          <td style="border: 1px solid #000; padding: 5px;">${nuevoRegistro.movimiento}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #000; padding: 5px;">Servicio:</td>
          <td style="border: 1px solid #000; padding: 5px;">${nuevoRegistro.esExportacion ? 'Exportación EE.UU.' : 'Nacional'}</td>
        </tr>
      </tbody>
    </table>
  </div>
`;

export const generarContenidoHtmlIndividual = (unidadNombre, horaString, chofer, remolque, info) => `
  <div style="font-family: 'Times New Roman', serif; color: #000; font-size: 13px;">
    <p><b>Reporte de Estatus Individual - Transporte Vargas</b></p>
    <table border="1" style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 11px;">
      <thead>
        <tr style="background-color: #f2f2f2;">
          <th style="border: 1px solid #000; padding: 5px;">Vehiculo</th>
          <th style="border: 1px solid #000; padding: 5px;">Hora Rep.</th>
          <th style="border: 1px solid #000; padding: 5px;">Chofer</th>
          <th style="border: 1px solid #000; padding: 5px;">Remolque</th>
          <th style="border: 1px solid #000; padding: 5px;">Estatus</th>
          <th style="border: 1px solid #000; padding: 5px;">Ubicacion</th>
          <th style="border: 1px solid #000; padding: 5px;">Vel/Motivo</th>
          <th style="border: 1px solid #000; padding: 5px;">Lugar</th>
          <th style="border: 1px solid #000; padding: 5px;">Link</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="border: 1px solid #000; padding: 5px; text-align: center;">${unidadNombre}</td>
          <td style="border: 1px solid #000; padding: 5px; text-align: center;">${horaString}</td>
          <td style="border: 1px solid #000; padding: 5px;">${chofer}</td>
          <td style="border: 1px solid #000; padding: 5px;">${remolque}</td>
          <td style="border: 1px solid #000; padding: 5px;">${info.estatus || ''}</td>
          <td style="border: 1px solid #000; padding: 5px;">${info.ubicacion || ''}</td>
          <td style="border: 1px solid #000; padding: 5px;">${info.velocidad || ''}</td>
          <td style="border: 1px solid #000; padding: 5px;">${info.lugar || ''}</td>
          <td style="border: 1px solid #000; padding: 5px; text-align: center;"><a href="${info.link || '#'}">Ver GPS</a></td>
        </tr>
      </tbody>
    </table>
    <p style="font-size: 10px; color: #666; margin-top: 15px;">Este es un reporte automático generado por el sistema de monitoreo de Transporte Vargas.</p>
  </div>
`;

export const generarTablaConsolidadaHTML = (filasViajesHTML, filasYardaHTML) => `
  <div style="font-family: 'Times New Roman', serif; color: #000; font-size: 13px;">
    <p>Unidades foraneas de viaje o espera de carga:</p>
    <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 11px; margin-bottom: 20px;">
      <thead>
        <tr style="background-color: #f2f2f2;">
          <th style="border: 1px solid #000; padding: 5px;">Vehiculo</th>
          <th style="border: 1px solid #000; padding: 5px;">Fecha/Hora</th>
          <th style="border: 1px solid #000; padding: 5px;">Chofer</th>
          <th style="border: 1px solid #000; padding: 5px;">Remolque</th>
          <th style="border: 1px solid #000; padding: 5px;">Estatus</th>
          <th style="border: 1px solid #000; padding: 5px;">Ubicacion</th>
          <th style="border: 1px solid #000; padding: 5px;">Vel/Motivo</th>
          <th style="border: 1px solid #000; padding: 5px;">Cliente</th>
          <th style="border: 1px solid #000; padding: 5px;">Lugar</th>
          <th style="border: 1px solid #000; padding: 5px;">Link</th>
        </tr>
      </thead>
      <tbody>${filasViajesHTML}</tbody>
    </table>
    <p>Unidades en yarda:</p>
    <table style="width: 250px; border-collapse: collapse; border: 1px solid #000; font-size: 11px;">
      <thead><tr style="background-color: #f2f2f2;"><th style="border: 1px solid #000; padding: 5px;">Vehiculo</th><th style="border: 1px solid #000; padding: 5px;">Estatus</th></tr></thead>
      <tbody>${filasYardaHTML}</tbody>
    </table>
  </div>
`;