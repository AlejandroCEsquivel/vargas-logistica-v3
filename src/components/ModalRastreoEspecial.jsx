// src/components/ModalRastreoEspecial.jsx
import React from 'react';
import { Input, Button, Table, Empty, DatePicker, TimePicker, Radio, Switch, message } from 'antd';
import { X, Download } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import dayjs from 'dayjs';
import { generarExcelRastreo } from '../services/excelService';
import SelectInteligente from './SelectInteligente';

const ModalRastreoEspecial = ({ 
  visible, 
  onCancel, 
  viaje, 
  puntos, 
  sugerencias, 
  guardarSugerenciaAutomatica, 
  eliminarSugerencia,
  selloActual,
  setSelloActual
}) => {
  const [datosNuevoPunto, setDatosNuevoPunto] = React.useState({ 
    fecha: null, hora: null, ubicacion: '', estatus: '', velocidad: '', lugar: '', link: '', observaciones: '' 
  });

  const handleActualizarSello = async () => {
    try {
      await updateDoc(doc(db, "viajes", viaje.id), { sello: selloActual });
      message.success("Sello actualizado correctamente");
    } catch (e) {
      message.error("Error al actualizar el sello");
    }
  };

  const handleAgregarPunto = async () => {
    if (!datosNuevoPunto.fecha || !datosNuevoPunto.hora || !datosNuevoPunto.ubicacion || !datosNuevoPunto.estatus) {
      return message.warning("Por favor llena Fecha, Hora, Ubicación y Estatus");
    }

    try {
      const fechaAgregado = datosNuevoPunto.fecha.format('YYYY-MM-DD');
      const horaAgregado = datosNuevoPunto.hora.format('HH:mm');
      const timestampAjustado = dayjs(`${fechaAgregado} ${horaAgregado}`).valueOf();

      await addDoc(collection(db, "viajes", viaje.id, "puntos_revision"), {
        ...datosNuevoPunto,
        fecha: fechaAgregado,
        hora: horaAgregado,
        timestamp: timestampAjustado
      });

      await guardarSugerenciaAutomatica('ubicacion', datosNuevoPunto.ubicacion);
      await guardarSugerenciaAutomatica('estatus', datosNuevoPunto.estatus);

      message.success("Punto de revisión agregado");
      setDatosNuevoPunto({ fecha: null, hora: null, ubicacion: '', estatus: '', velocidad: '', lugar: '', link: '', observaciones: '' });
    } catch (e) {
      message.error("No se pudo agregar el punto");
    }
  };

  if (!visible || !viaje) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, padding: '20px' }}>
      <div style={{ width: '1100px', backgroundColor: '#1a1a1a', borderRadius: '8px', border: '1px solid #333', padding: '25px', maxHeight: '95vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
          <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6' }}>Rastreo Especial de Viaje</span>
          <X onClick={onCancel} style={{ cursor: 'pointer', color: '#888' }} size={24} />
        </div>

        <div style={{ background: '#262626', padding: '15px', borderRadius: '6px', marginBottom: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', fontSize: '13px' }}>
            <div><span style={{ color: '#888' }}>Tractor:</span> <br/><b>{viaje.unidad}</b></div>
            <div><span style={{ color: '#888' }}>Remolque:</span> <br/><b>{viaje.caja || 'N/A'}</b></div>
            <div><span style={{ color: '#888' }}>Chofer:</span> <br/><b>{viaje.chofer}</b></div>
            <div><span style={{ color: '#888' }}>Cliente:</span> <br/><b>{viaje.cliente}</b></div>
            <div><span style={{ color: '#888' }}>Carta Porte:</span> <br/><b>{viaje.cp}</b></div>
            <div>
              <span style={{ color: '#888' }}>Sello:</span> <br/>
              <div style={{ display: 'flex', gap: '5px', marginTop: '2px' }}>
                <Input size="small" value={selloActual} onChange={e => setSelloActual(e.target.value)} style={{ width: '100px', background: '#000', color: '#fff', border: '1px solid #444' }} />
                <Button size="small" type="primary" onClick={handleActualizarSello}>Guardar</Button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid rgba(59, 130, 246, 0.3)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3 style={{ margin: 0, fontSize: '14px', color: '#3b82f6', fontWeight: 'bold' }}>AGREGAR PUNTO DE REVISIÓN</h3>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#bbb' }}>Fecha</span>
              <DatePicker style={{ width: '100%' }} value={datosNuevoPunto.fecha} onChange={v => setDatosNuevoPunto({...datosNuevoPunto, fecha: v})} getPopupContainer={t => t.parentNode} />
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#bbb' }}>Hora</span>
              <TimePicker style={{ width: '100%' }} format="HH:mm" value={datosNuevoPunto.hora} onChange={v => setDatosNuevoPunto({...datosNuevoPunto, hora: v})} getPopupContainer={t => t.parentNode} />
            </div>
            <div style={{ flex: 2 }}>
              <span style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#bbb' }}>Ubicación</span>
              <SelectInteligente categoria="ubicacion" value={datosNuevoPunto.ubicacion} onChange={v => setDatosNuevoPunto({...datosNuevoPunto, ubicacion: v})} placeholder="Ciudad..." sugerencias={sugerencias} eliminarSugerencia={eliminarSugerencia} />
            </div>
            <div style={{ flex: 1 }}>
               <Button type="primary" onClick={handleAgregarPunto} style={{ fontWeight: 'bold', width: '100%' }}>Agregar</Button>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Table dataSource={puntos} rowKey="id" size="small" pagination={false}
            columns={[
              { title: 'Fecha', dataIndex: 'fecha', width: 90 },
              { title: 'Hora', dataIndex: 'hora', width: 70 },
              { title: 'Ubicación', dataIndex: 'ubicacion' },
              { title: 'Estatus', dataIndex: 'estatus' },
              { title: 'GPS', render: (_, r) => r.link ? <a href={r.link} target="_blank" rel="noreferrer" style={{color: '#3b82f6'}}>Mapa</a> : '-' }
            ]}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', gap: '15px', borderTop: '1px solid #333', paddingTop: '15px' }}>
          <Button icon={<Download size={16} />} style={{ backgroundColor: '#107c41', color: 'white', border: 'none' }} onClick={() => generarExcelRastreo(viaje, puntos, message)}>
            Descargar Excel (.xlsx)
          </Button>
          <Button onClick={onCancel} style={{ background: '#262626', color: '#fff', border: 'none' }}>Cerrar</Button>
        </div>
      </div>
    </div>
  );
};

export default ModalRastreoEspecial;