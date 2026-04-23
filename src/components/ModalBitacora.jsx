// src/components/ModalBitacora.jsx
import React, { useState, useEffect } from 'react';
import { Select, Alert, DatePicker, TimePicker, Checkbox, Input, Button, message } from 'antd';
import { X } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import dayjs from 'dayjs';
import { enviarConBrevo } from '../services/brevoService';
import { generarContenidoHtmlIndividual, generarTablaConsolidadaHTML } from '../services/emailTemplates';
import SelectInteligente from './SelectInteligente';

const { Option } = Select;

const ModalBitacora = ({ 
  visible, 
  onCancel, 
  unidades, 
  viajes, 
  clientes, 
  sugerencias, 
  guardarSugerenciaAutomatica, 
  eliminarSugerencia,
  renderTagsViaje 
}) => {
  const [unidadesSeleccionadasBitacora, setUnidadesSeleccionadasBitacora] = useState([]);
  const [datosBitacora, setDatosBitacora] = useState({});
  const [bannerBitacora, setBannerBitacora] = useState({ visible: false, mensaje: '', tipo: 'success' });

  // 1. CORRECCIÓN DEL BUG: Memoria blindada
  useEffect(() => {
    if (visible) {
      const unidadesEnViaje = viajes.filter(v => v.estatus === 'viajes' || v.estatus === 'espera');

      // Actualizamos el estado respetando lo que el usuario ya escribió
      setDatosBitacora(prevDatos => {
        const nuevosDatos = { ...prevDatos };
        
        unidadesEnViaje.forEach(v => {
          // SOLO inicializamos la casilla si está vacía. Si el usuario ya escribió, NO lo tocamos.
          if (!nuevosDatos[v.unidad]) {
            const clienteParaMostrar = v.estatus === 'espera' ? null : v.cliente;
            const clienteInfo = clienteParaMostrar ? clientes.find(c => c.nombre === clienteParaMostrar) : null;

            nuevosDatos[v.unidad] = {
              cliente: clienteParaMostrar || undefined, 
              correoEnvio: clienteInfo?.correo || '',
              enviarACliente: v.estatus === 'espera' ? false : true 
            };
          }
        });
        return nuevosDatos;
      });

      // Solo seleccionamos todos los camiones si la lista está vacía (la primera vez que abre el modal)
      setUnidadesSeleccionadasBitacora(prevSeleccion => {
        if (prevSeleccion.length === 0) {
          return unidadesEnViaje.map(v => v.unidad);
        }
        return prevSeleccion;
      });
    }
  }, [visible, viajes, clientes]);

  // 2. LIMPIEZA AL CERRAR: Cuando se cierra el modal, reseteamos todo para la próxima vez
  useEffect(() => {
    if (!visible) {
      setDatosBitacora({});
      setUnidadesSeleccionadasBitacora([]);
      setBannerBitacora({ visible: false, mensaje: '', tipo: 'success' });
    }
  }, [visible]);

  const handleInputBitacora = (unidadId, campo, valor) => {
    setDatosBitacora(prev => ({
      ...prev,
      [unidadId]: { ...prev[unidadId], [campo]: valor }
    }));
  };

  const handleEnviarBitacora = async (unidadNombre) => {
    const info = datosBitacora[unidadNombre];
    
    if (info?.enviarACliente && !info?.correoEnvio) {
      return message.warning("Por favor ingresa un correo para notificar al cliente");
    }

    try {
      message.loading({ content: `Procesando estatus de ${unidadNombre}...`, key: 'envioInd' });

      await guardarSugerenciaAutomatica('estatus', info.estatus);
      await guardarSugerenciaAutomatica('ubicacion', info.ubicacion);
      await guardarSugerenciaAutomatica('velocidad', info.velocidad);
      await guardarSugerenciaAutomatica('lugar', info.lugar);

      const viajeActivo = viajes.find(v => v.unidad === unidadNombre && (v.estatus === 'viajes' || v.estatus === 'espera'));
      const chofer = viajeActivo?.chofer || "N/A";
      const remolque = viajeActivo?.caja || "N/A";

      if (viajeActivo && viajeActivo.estatus === 'espera' && info.cliente && info.cliente !== viajeActivo.cliente) {
         await updateDoc(doc(db, "viajes", viajeActivo.id), { cliente: info.cliente });
      }

      const fechaObj = info.fechaReporte ? info.fechaReporte.toDate() : new Date();
      const horaString = info.horaReporte ? info.horaReporte.format('HH:mm') : new Date().toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit', hour12: false});
      const fechaYYYYMMDD = info.fechaReporte ? info.fechaReporte.format('YYYY-MM-DD') : new Date().toISOString().split('T')[0];
      const timestampAjustado = dayjs(`${fechaYYYYMMDD} ${horaString}`).valueOf();

      if (viajeActivo) {
        await addDoc(collection(db, "viajes", viajeActivo.id, "puntos_revision"), {
          fecha: fechaYYYYMMDD, hora: horaString, ubicacion: info.ubicacion || '',
          estatus: info.estatus || '', velocidad: info.velocidad || '',
          cliente: info.cliente || '', lugar: info.lugar || '', link: info.link || '',
          observaciones: 'Reporte automático de bitácora', timestamp: timestampAjustado
        });
      }

      const reporteParaFirebase = {
        unidad: unidadNombre, ...info, fechaReporte: fechaYYYYMMDD,
        horaString: horaString, link: info.link || 'No proporcionado',
        fechaEnvio: new Date().toISOString(),
      };
      await addDoc(collection(db, "reportes_bitacora"), reporteParaFirebase);

      if (info?.enviarACliente && info?.correoEnvio) {
        const contenidoHtmlIndividual = generarContenidoHtmlIndividual(unidadNombre, horaString, chofer, remolque, info);
        await enviarConBrevo(info.correoEnvio, `ESTATUS UNIDAD ${unidadNombre} - ${horaString}`, contenidoHtmlIndividual);
        await addDoc(collection(db, "logs_envios"), { unidad: unidadNombre, destinatario: info.correoEnvio, fechaEnvio: new Date().toISOString(), tipo: 'Reporte de Bitácora (Cliente)' });
        message.success({ content: `¡Estatus enviado al cliente en formato formal!`, key: 'envioInd' });
      } else {
        message.success({ content: `¡Estatus guardado internamente!`, key: 'envioInd' });
      }
      
    } catch (e) {
      console.error("Error al procesar:", e);
      message.error({ content: `Fallo el proceso de ${unidadNombre}`, key: 'envioInd' });
    }
  };

  const handleEnviarBitacoraMasiva = async () => {
    if (unidadesSeleccionadasBitacora.length === 0) {
      return message.warning("No hay unidades seleccionadas para enviar.");
    }

    const correosInternos = [
      "t.foraneo@transportesvargas.com", "manuel.ochoa@transportesvargas.com", "monitoreo@transportesvargas.com",
      "seguridadtransportesvargas@gmail.com", "control@transportesvargas.com", "logistica@transportesvargas.com",
      "trafico@transportesvargas.com", "seguridad@transportesvargas.com", "seguridad2@transportesvargas.com",
      "traficovargasdiaz@gmail.com", "silvia@vargasinterlogistics.com"
    ].join(", ");

    message.loading({ content: "Generando y enviando reporte consolidado...", key: "envioMasivo" });

    try {
      let filasViajesHTML = "";
      for (const nombreUnidad of unidadesSeleccionadasBitacora) {
        const info = datosBitacora[nombreUnidad] || {};
        
        const viajeActivo = viajes.find(v => v.unidad === nombreUnidad && (v.estatus === 'viajes' || v.estatus === 'espera'));
        const chofer = viajeActivo?.chofer || "";
        const remolque = viajeActivo?.caja || "";

        const fechaCorta = info.fechaReporte ? info.fechaReporte.format('DD/MM/YYYY') : new Date().toLocaleDateString('es-MX');
        const horaString = info.horaReporte ? info.horaReporte.format('HH:mm') : new Date().toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit', hour12: false});

        filasViajesHTML += `
          <tr>
            <td style="border: 1px solid #000; padding: 5px;">${nombreUnidad}</td>
            <td style="border: 1px solid #000; padding: 5px;">${fechaCorta} ${horaString}</td>
            <td style="border: 1px solid #000; padding: 5px;">${chofer}</td>
            <td style="border: 1px solid #000; padding: 5px;">${remolque}</td>
            <td style="border: 1px solid #000; padding: 5px;">${info.estatus || ''}</td>
            <td style="border: 1px solid #000; padding: 5px;">${info.ubicacion || ''}</td>
            <td style="border: 1px solid #000; padding: 5px;">${info.velocidad || ''}</td>
            <td style="border: 1px solid #000; padding: 5px;">${info.cliente || ''}</td>
            <td style="border: 1px solid #000; padding: 5px;">${info.lugar || ''}</td>
            <td style="border: 1px solid #000; padding: 5px;">${info.link || ''}</td>
          </tr>
        `;
      }

      const unidadesActivasNombres = viajes.filter(v => v.estatus === 'viajes' || v.estatus === 'espera').map(v => v.unidad);
      const unidadesEnYarda = unidades.filter(u => !unidadesActivasNombres.includes(u.nombre));
      
      let filasYardaHTML = "";
      unidadesEnYarda.forEach(u => {
        const estatusMostrar = (u.estado && u.estado !== 'Listo') ? u.estado : 'Sin viaje';
        filasYardaHTML += `<tr><td style="border: 1px solid #000; padding: 5px;">${u.nombre}</td><td style="border: 1px solid #000; padding: 5px;">${estatusMostrar}</td></tr>`;
      });

      const tablaConsolidadaHTML = generarTablaConsolidadaHTML(filasViajesHTML, filasYardaHTML);

      await enviarConBrevo(correosInternos, `ESTATUS UNIDADES FORANEAS - ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`, tablaConsolidadaHTML);

      message.success({ content: "¡Reporte consolidado enviado exitosamente a internos!", key: "envioMasivo" });
      setBannerBitacora({ visible: true, mensaje: "Envío Consolidado Exitoso vía Brevo. El equipo de Tráfico ya recibió la información.", tipo: 'success' });
    } catch (error) {
      console.error("Error en envío masivo:", error);
      setBannerBitacora({ visible: true, mensaje: `ERROR CRÍTICO: El reporte no se envió. ${error.message}`, tipo: 'error' });
    }
  };

  if (!visible) return null;

  return (
    <div id="area-modal-bitacora" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 2000, padding: '40px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
          <h2 style={{ margin: 0 }}>Capturar Bitacora</h2>
          <Select 
            mode="multiple" placeholder="Busca y selecciona las unidades..." style={{ width: '500px' }} 
            value={unidadesSeleccionadasBitacora} onChange={setUnidadesSeleccionadasBitacora} 
            allowClear showSearch getPopupContainer={(trigger) => trigger.parentNode}
          >
            {unidades.map(u => <Option key={u.id} value={u.nombre}>{u.nombre}</Option>)}
          </Select>
        </div>
        <X onClick={onCancel} style={{ cursor: 'pointer' }} />
      </div>

      {bannerBitacora.visible && (
        <Alert message={bannerBitacora.mensaje} type={bannerBitacora.tipo} showIcon closable onClose={() => setBannerBitacora({ ...bannerBitacora, visible: false })} style={{ marginBottom: '20px', borderRadius: '4px' }} />
      )}

      {unidadesSeleccionadasBitacora.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 450px))', gap: '25px', marginBottom: '80px' }}>
          {unidadesSeleccionadasBitacora.map(nombreUnidad => (
            <div key={nombreUnidad} style={{ background: '#1a1a1a', borderRadius: '4px', border: '1px solid #333' }}>
              <div style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #333', fontWeight: 'bold', color: '#3b82f6', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '16px' }}>{nombreUnidad}</span>
                {(() => {
                   const vActivo = viajes.find(v => v.unidad === nombreUnidad && (v.estatus === 'viajes' || v.estatus === 'espera'));
                   return renderTagsViaje(vActivo, true);
                })()}
              </div>

              <div style={{ padding: '25px', background: '#164e63', margin: '15px', borderRadius: '4px' }}>
                <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
                  <label style={{ width: '100px' }}>Fecha/Hora :</label>
                  <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
                    <DatePicker style={{ flex: 1 }} value={datosBitacora[nombreUnidad]?.fechaReporte} onChange={val => handleInputBitacora(nombreUnidad, 'fechaReporte', val)} getPopupContainer={(trigger) => trigger.parentNode} placeholder="Hoy" />
                    <TimePicker style={{ flex: 1 }} format="HH:mm" value={datosBitacora[nombreUnidad]?.horaReporte} onChange={val => handleInputBitacora(nombreUnidad, 'horaReporte', val)} getPopupContainer={(trigger) => trigger.parentNode} placeholder="Hora GPS" />
                  </div>
                </div>

                <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center' }}><label style={{ width: '100px' }}>Estatus :</label>
                  <SelectInteligente categoria="estatus" value={datosBitacora[nombreUnidad]?.estatus} onChange={val => handleInputBitacora(nombreUnidad, 'estatus', val)} placeholder="Estatus" sugerencias={sugerencias} eliminarSugerencia={eliminarSugerencia} />
                </div>
                <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center' }}><label style={{ width: '100px' }}>Ubicacion :</label>
                  <SelectInteligente categoria="ubicacion" value={datosBitacora[nombreUnidad]?.ubicacion} onChange={val => handleInputBitacora(nombreUnidad, 'ubicacion', val)} placeholder="Ubicación" sugerencias={sugerencias} eliminarSugerencia={eliminarSugerencia} />
                </div>
                <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center' }}><label style={{ width: '100px' }}>Velocidad :</label>
                  <SelectInteligente categoria="velocidad" value={datosBitacora[nombreUnidad]?.velocidad} onChange={val => handleInputBitacora(nombreUnidad, 'velocidad', val)} placeholder="Velocidad" sugerencias={sugerencias} eliminarSugerencia={eliminarSugerencia} />
                </div>
                <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center' }}><label style={{ width: '100px' }}>Cliente :</label>
                  <Select placeholder="Seleccionar" style={{ flex: 1 }} value={datosBitacora[nombreUnidad]?.cliente} 
                    onChange={val => {
                        handleInputBitacora(nombreUnidad, 'cliente', val);
                        const clienteInfo = clientes.find(c => c.nombre === val);
                        handleInputBitacora(nombreUnidad, 'correoEnvio', clienteInfo?.correo || '');
                    }} getPopupContainer={(trigger) => trigger.parentNode}>
                    {clientes.map(cl => <Option key={cl.id} value={cl.nombre}>{cl.nombre}</Option>)}
                  </Select>
                </div>
                <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center' }}><label style={{ width: '100px' }}>Lugar :</label>
                  <SelectInteligente categoria="lugar" value={datosBitacora[nombreUnidad]?.lugar} onChange={val => handleInputBitacora(nombreUnidad, 'lugar', val)} placeholder="Lugar" sugerencias={sugerencias} eliminarSugerencia={eliminarSugerencia} />
                </div>
                <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center' }}><label style={{ width: '100px' }}>Link :</label><Input value={datosBitacora[nombreUnidad]?.link || ''} onChange={e => handleInputBitacora(nombreUnidad, 'link', e.target.value)} style={{ flex: 1, background: 'rgba(0,0,0,0.2)' }} /></div>
                
                <div style={{ marginBottom: '15px', padding: '10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <Checkbox checked={datosBitacora[nombreUnidad]?.enviarACliente} onChange={(e) => handleInputBitacora(nombreUnidad, 'enviarACliente', e.target.checked)} style={{ color: '#fff', marginBottom: '10px', fontWeight: 'bold' }}>
                      Notificar al cliente
                    </Checkbox>
                    {datosBitacora[nombreUnidad]?.enviarACliente && (
                      <>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#ddd' }}>Correo del destinatario:</label>
                        <Input placeholder="Correo del destinatario" value={datosBitacora[nombreUnidad]?.correoEnvio || ''} onChange={e => handleInputBitacora(nombreUnidad, 'correoEnvio', e.target.value)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid #3b82f6' }} />
                      </>
                    )}
                </div>
                <Button type="primary" block style={{ height: '40px', fontWeight: 'bold' }} onClick={() => handleEnviarBitacora(nombreUnidad)}>
                  {datosBitacora[nombreUnidad]?.enviarACliente ? 'Guardar y Notificar a Cliente' : 'Solo Guardar Estatus'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ position: 'sticky', bottom: '-40px', left: '-40px', right: '-40px', background: '#000', padding: '20px 40px', borderTop: '1px solid #333', display: 'flex', justifyContent: 'flex-end', gap: '15px', zIndex: 10 }}>
        <Button onClick={onCancel} style={{ background: '#262626', color: '#fff', border: 'none' }}>Cancelar</Button>
        <Button type="primary" onClick={handleEnviarBitacoraMasiva} style={{ height: '32px', padding: '0 25px' }}>Enviar Consolidado a Tráfico</Button>
      </div>
    </div>
  );
};

export default ModalBitacora;