// src/components/ModalNuevoViaje.jsx
import React, { useState } from 'react';
import { DatePicker, TimePicker, Select, Button, Input, Radio, Checkbox, Switch, message } from 'antd';
import { X } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { enviarConBrevo } from '../services/brevoService';
import { generarTablaNuevoViajeHTML } from '../services/emailTemplates';
import SelectInteligente from './SelectInteligente';

const { Option } = Select;

const ModalNuevoViaje = ({ 
  visible, 
  onCancel, 
  unidades, 
  choferes, 
  clientes, 
  viajes, 
  sugerencias, 
  guardarSugerenciaAutomatica, 
  eliminarSugerencia 
}) => {
  const [cargandoViaje, setCargandoViaje] = useState(false);
  const [datosNuevoViaje, setDatosNuevoViaje] = useState({
    fecha: null, cp: '', hora: null, unidad: undefined,
    chofer: undefined, caja: '', cliente: undefined,
    origen: '', destino: '', correoEnvio: '', enviarACliente: true, sello: '',
    movimiento: 'Salida', esExportacion: false
  });

  const handleCrearViaje = async () => {
    if (!datosNuevoViaje.unidad || !datosNuevoViaje.chofer) {
      return message.warning("Por favor completa Unidad y Chofer");
    }

    if (datosNuevoViaje.cp && datosNuevoViaje.cp.trim() !== '') {
      const existeCP = viajes.some(v => v.cp === datosNuevoViaje.cp && v.estatus === 'viajes');
      if (existeCP) {
        return message.error("Este número de Carta Porte ya está registrado en un viaje activo.");
      }
    }

    if (datosNuevoViaje.enviarACliente && datosNuevoViaje.correoEnvio && !/\S+@\S+\.\S+/.test(datosNuevoViaje.correoEnvio)) {
      return message.error("El formato del correo electrónico no es válido");
    }

    setCargandoViaje(true);

    try {
      const registroEnEspera = viajes.find(v => v.unidad === datosNuevoViaje.unidad && v.estatus === 'espera');
      if (registroEnEspera) {
        await deleteDoc(doc(db, "viajes", registroEnEspera.id));
      }

      await guardarSugerenciaAutomatica('caja', datosNuevoViaje.caja);
      await guardarSugerenciaAutomatica('origen', datosNuevoViaje.origen);
      await guardarSugerenciaAutomatica('destino', datosNuevoViaje.destino);

      const nuevoRegistro = {
        ...datosNuevoViaje,
        cp: datosNuevoViaje.cp || 'Pendiente', 
        fecha: datosNuevoViaje.fecha ? datosNuevoViaje.fecha.format('YYYY-MM-DD') : '',
        hora: datosNuevoViaje.hora ? datosNuevoViaje.hora.format('HH:mm') : '',
        timestampFiltro: datosNuevoViaje.fecha ? datosNuevoViaje.fecha.valueOf() : new Date().getTime(),
        estatus: 'viajes',
        sello: datosNuevoViaje.sello ? datosNuevoViaje.sello : 'Pendiente',
        fechaCreacion: new Date().toISOString(),
        fechaInicioExacta: new Date().toISOString(),
        movimiento: datosNuevoViaje.movimiento || 'Salida',
        esExportacion: datosNuevoViaje.esExportacion || false
      };

      const docRef = await addDoc(collection(db, "viajes"), nuevoRegistro);

      const correosInternos = [
        "t.foraneo@transportesvargas.com",
        "manuel.ochoa@transportesvargas.com",
        "monitoreo@transportesvargas.com",
        "seguridadtransportesvargas@gmail.com",
        "control@transportesvargas.com",
        "logistica@transportesvargas.com",
        "trafico@transportesvargas.com",
        "seguridad@transportesvargas.com",
        "seguridad2@transportesvargas.com",
        "traficovargasdiaz@gmail.com",
        "silvia@vargasinterlogistics.com"
      ];

      let listaFinalDestinatarios = [...correosInternos];
      if (datosNuevoViaje.enviarACliente && datosNuevoViaje.correoEnvio) {
        listaFinalDestinatarios.push(datosNuevoViaje.correoEnvio);
      }

      const destinatariosString = listaFinalDestinatarios.join(", ");
      const tablaNuevoViajeHTML = generarTablaNuevoViajeHTML(nuevoRegistro, datosNuevoViaje);

      try {
        const avisoEnvio = message.loading("Procesando creación de viaje...", 0);

        await enviarConBrevo(
          destinatariosString,
          `NUEVO VIAJE - UNIDAD ${datosNuevoViaje.unidad} - CARTA PORTE ${nuevoRegistro.cp} - ${nuevoRegistro.hora}`,
          tablaNuevoViajeHTML
        );
        
        avisoEnvio();

        await addDoc(collection(db, "logs_envios"), {
          viajeId: docRef.id,
          destinatarios: destinatariosString,
          unidad: datosNuevoViaje.unidad,
          fechaEnvio: new Date().toISOString(),
          tipo: 'Creación de Viaje (Brevo)'
        });

        message.success(datosNuevoViaje.enviarACliente 
          ? "Viaje creado y notificado al cliente" 
          : "Viaje creado y notificado internamente");
          
      } catch (mailError) {
        message.destroy();
        console.error("Error al enviar notificación Brevo:", mailError);
        message.error(`Viaje guardado, pero el correo falló: ${mailError.message}`);
      }

      setDatosNuevoViaje({
        fecha: null, cp: '', hora: null, unidad: undefined, 
        chofer: undefined, caja: '', cliente: undefined, 
        origen: '', destino: '', correoEnvio: '', enviarACliente: true, sello: '',
        movimiento: 'Salida', esExportacion: false
      });
      
      onCancel(); // Cerramos el modal
      
    } catch (e) {
      console.error("Error general en handleCrearViaje:", e);
      message.error("Hubo un problema al procesar el viaje");
    } finally {
      setCargandoViaje(false);
    }
  };

  if (!visible) return null;

  return (
    <div id="area-modal-nuevo-viaje" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
      <div style={{ width: '500px', backgroundColor: '#1a1a1a', borderRadius: '8px', border: '1px solid #333', padding: '30px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px', alignItems: 'center' }}>
          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>Nuevo viaje</span>
          <X onClick={onCancel} style={{ cursor: 'pointer', color: '#888' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}><label style={{ width: '120px' }}>Fecha :</label>
            <DatePicker 
              status={!datosNuevoViaje.fecha && "error"}
              value={datosNuevoViaje.fecha} 
              onChange={(val) => setDatosNuevoViaje({...datosNuevoViaje, fecha: val})} 
              style={{ flex: 1 }} 
              getPopupContainer={(trigger) => trigger.parentNode}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}><label style={{ width: '120px' }}>No. Carta Porte :</label>
            <Input 
              status={!datosNuevoViaje.cp && "error"}
              value={datosNuevoViaje.cp} 
              onChange={(e) => setDatosNuevoViaje({...datosNuevoViaje, cp: e.target.value})} 
              style={{ flex: 1, background: '#262626', border: '1px solid #444' }} 
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center' }}><label style={{ width: '120px' }}>Sello :</label>
            <Input 
              value={datosNuevoViaje.sello} 
              onChange={(e) => setDatosNuevoViaje({...datosNuevoViaje, sello: e.target.value})} 
              style={{ flex: 1, background: '#262626', border: '1px solid #444' }} 
              placeholder="Opcional"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}><label style={{ width: '120px' }}>Hora de salida :</label>
            <TimePicker 
              status={!datosNuevoViaje.hora && "error"}
              value={datosNuevoViaje.hora} 
              onChange={(val) => setDatosNuevoViaje({...datosNuevoViaje, hora: val})} 
              format="HH:mm" 
              style={{ flex: 1 }} 
              getPopupContainer={(trigger) => trigger.parentNode}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}><label style={{ width: '120px' }}>Movimiento :</label>
            <Radio.Group 
              value={datosNuevoViaje.movimiento} 
              onChange={(e) => setDatosNuevoViaje({...datosNuevoViaje, movimiento: e.target.value})}
              style={{ flex: 1 }}
            >
              <Radio.Button value="Salida">Salida</Radio.Button>
              <Radio.Button value="Regreso">Regreso</Radio.Button>
            </Radio.Group>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '6px' }}>
            <label style={{ width: '120px' }}>Servicio :</label>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Switch 
                checked={datosNuevoViaje.esExportacion} 
                onChange={(checked) => setDatosNuevoViaje({...datosNuevoViaje, esExportacion: checked})} 
                checkedChildren="Exportación 🇺🇸" 
                unCheckedChildren="Nacional 🇲🇽"
              />
              <span style={{ fontSize: '13px', color: datosNuevoViaje.esExportacion ? '#fbbf24' : '#4ade80', fontWeight: 'bold' }}>
                {datosNuevoViaje.esExportacion ? 'Exportación EE.UU.' : 'Nacional'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}><label style={{ width: '120px' }}>Unidad :</label>
            <Select 
              status={!datosNuevoViaje.unidad && "error"}
              showSearch 
              style={{ flex: 1 }} 
              placeholder="Selecciona unidad" 
              value={datosNuevoViaje.unidad} 
              onChange={(val) => setDatosNuevoViaje({...datosNuevoViaje, unidad: val})} 
              getPopupContainer={(trigger) => trigger.parentNode}
            >
              {unidades.map(u => <Option key={u.id} value={u.nombre}>{u.nombre}</Option>)}
            </Select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}><label style={{ width: '120px' }}>Chofer :</label>
            <Select 
              status={!datosNuevoViaje.chofer && "error"}
              showSearch 
              style={{ flex: 1 }} 
              placeholder="Selecciona chofer" 
              value={datosNuevoViaje.chofer} 
              onChange={(val) => setDatosNuevoViaje({...datosNuevoViaje, chofer: val})} 
              getPopupContainer={(trigger) => trigger.parentNode}
            >
              {choferes.map(ch => <Option key={ch.id} value={ch.nombre}>{ch.nombre}</Option>)}
            </Select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}><label style={{ width: '120px' }}>Caja :</label>
            <SelectInteligente 
              categoria="caja" 
              value={datosNuevoViaje.caja} 
              onChange={(val) => setDatosNuevoViaje({...datosNuevoViaje, caja: val})} 
              placeholder="Escribe o selecciona caja"
              sugerencias={sugerencias}
              eliminarSugerencia={eliminarSugerencia}
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center' }}><label style={{ width: '120px' }}>Cliente :</label>
            <Select showSearch style={{ flex: 1 }} placeholder="Selecciona cliente" value={datosNuevoViaje.cliente} 
              onChange={(val) => {
                const clienteEncontrado = clientes.find(c => c.nombre === val);
                setDatosNuevoViaje({
                  ...datosNuevoViaje, 
                  cliente: val, 
                  correoEnvio: clienteEncontrado?.correo || '' 
                });
              }} 
              getPopupContainer={(trigger) => trigger.parentNode} >
              {clientes.map(cl => <Option key={cl.id} value={cl.nombre}>{cl.nombre}</Option>)}
            </Select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center' }}><label style={{ width: '120px' }}>Origen :</label>
            <SelectInteligente 
              categoria="origen" 
              value={datosNuevoViaje.origen} 
              onChange={(val) => setDatosNuevoViaje({...datosNuevoViaje, origen: val})} 
              placeholder="Escribe o selecciona origen"
              sugerencias={sugerencias}
              eliminarSugerencia={eliminarSugerencia}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}><label style={{ width: '120px' }}>Destino :</label>
            <SelectInteligente 
              categoria="destino" 
              value={datosNuevoViaje.destino} 
              onChange={(val) => setDatosNuevoViaje({...datosNuevoViaje, destino: val})} 
              placeholder="Escribe o selecciona destino"
              sugerencias={sugerencias}
              eliminarSugerencia={eliminarSugerencia}
            />
          </div>

          <div style={{ marginTop: '10px', padding: '15px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '6px', border: '1px solid #3b82f6' }}>
            <div style={{ marginBottom: '10px' }}>
              <Checkbox 
                checked={datosNuevoViaje.enviarACliente} 
                onChange={(e) => setDatosNuevoViaje({...datosNuevoViaje, enviarACliente: e.target.checked})}
                style={{ color: '#fff', fontWeight: 'bold' }}
              >
                Notificar creación de viaje al cliente
              </Checkbox>
            </div>
            {datosNuevoViaje.enviarACliente && (
              <>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#3b82f6', fontWeight: 'bold' }}>Correo del cliente:</label>
                <Input 
                  placeholder="Correo del destinatario (opcional)" 
                  value={datosNuevoViaje.correoEnvio} 
                  onChange={(e) => setDatosNuevoViaje({...datosNuevoViaje, correoEnvio: e.target.value})}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #3b82f6' }} 
                />
              </>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
            <Button onClick={onCancel} disabled={cargandoViaje} style={{ background: '#262626', color: '#fff' }}>Cancelar</Button>
            <Button type="primary" onClick={handleCrearViaje} loading={cargandoViaje}>Crear viaje</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalNuevoViaje;