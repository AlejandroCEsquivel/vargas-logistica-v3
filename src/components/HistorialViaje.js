// src/components/HistorialViaje.js
import React, { useState, useEffect } from 'react';
import { Check, X, Edit3 } from 'lucide-react';
import { Table, Empty, Button, Space, DatePicker, message } from 'antd';
import { db } from '../firebase'; // Asegúrate de que la ruta a tu firebase.js sea correcta según dónde pongas este archivo
import { collection, doc, updateDoc, query, onSnapshot } from 'firebase/firestore';
import dayjs from 'dayjs';

const HistorialViaje = ({ viaje }) => {
  const [puntos, setPuntos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editandoTiempo, setEditandoTiempo] = useState(null); // 'inicio' o 'fin'
  const [nuevoValor, setNuevoValor] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "viajes", viaje.id, "puntos_revision"));
    const unsub = onSnapshot(q, (snap) => {
      const docsOrdenados = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => {
        return dayjs(`${a.fecha} ${a.hora}`).valueOf() - dayjs(`${b.fecha} ${b.hora}`).valueOf();
      });
      setPuntos(docsOrdenados);
      setLoading(false);
    });
    return () => unsub();
  }, [viaje.id]);

  const guardarCambioTiempo = async () => {
    if (!nuevoValor) return setEditandoTiempo(null);
    try {
      const campo = editandoTiempo === 'inicio' ? 'fechaInicioExacta' : 'fechaFinExacta';
      await updateDoc(doc(db, "viajes", viaje.id), {
        [campo]: nuevoValor.toISOString()
      });
      message.success("Tiempo actualizado correctamente");
      setEditandoTiempo(null);
    } catch (e) {
      message.error("No se pudo actualizar el tiempo");
    }
  };

  return (
    <div style={{ padding: '20px 30px', background: '#141414', border: '1px solid #333', borderRadius: '8px', margin: '10px 0' }}>
      
      {/* SECCIÓN DE INICIO DE VIAJE */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(74, 222, 128, 0.1)', padding: '10px', borderRadius: '6px' }}>
        <div style={{ fontSize: '15px', color: '#4ade80' }}>
          🚀 <b>Inicio de viaje:</b> {viaje.fechaInicioExacta ? new Date(viaje.fechaInicioExacta).toLocaleString('es-MX') : 'No registrada'}
        </div>
        <div>
          {editandoTiempo === 'inicio' ? (
            <Space>
              <DatePicker showTime value={nuevoValor} onChange={(v) => setNuevoValor(v)} size="small" placeholder="Selecciona fecha y hora" style={{ width: '200px' }}/>
              <Button type="primary" size="small" icon={<Check size={14}/>} onClick={guardarCambioTiempo}>Guardar</Button>
              <Button size="small" icon={<X size={14}/>} onClick={() => setEditandoTiempo(null)} />
            </Space>
          ) : (
            <Button size="small" type="default" icon={<Edit3 size={14}/>} onClick={() => { setEditandoTiempo('inicio'); setNuevoValor(viaje.fechaInicioExacta ? dayjs(viaje.fechaInicioExacta) : null); }}>
              Editar Inicio
            </Button>
          )}
        </div>
      </div>

      <Table
        dataSource={puntos}
        rowKey="id"
        size="small"
        pagination={false}
        loading={loading}
        columns={[
          { title: 'Fecha', dataIndex: 'fecha', width: 90 },
          { title: 'Hora', dataIndex: 'hora', width: 70 },
          { title: 'Ubicación', dataIndex: 'ubicacion' },
          { title: 'Estatus', dataIndex: 'estatus' },
          { title: 'Velocidad', dataIndex: 'velocidad' },
          { title: 'Lugar', dataIndex: 'lugar' },
          { title: 'Observaciones', dataIndex: 'observaciones' },
          { title: 'GPS', render: (_, r) => r.link ? <a href={r.link} target="_blank" rel="noreferrer" style={{color: '#3b82f6'}}>Mapa</a> : '-' }
        ]}
        locale={{ emptyText: <Empty description="Sin movimientos en bitácora" /> }}
      />

      {/* SECCIÓN DE FIN DE VIAJE */}
      {(viaje.estatus === 'finalizado' || viaje.fechaFinExacta) && (
        <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(248, 113, 113, 0.1)', padding: '10px', borderRadius: '6px' }}>
          <div style={{ fontSize: '15px', color: '#f87171' }}>
            🏁 <b>Viaje finalizado:</b> {viaje.fechaFinExacta ? new Date(viaje.fechaFinExacta).toLocaleString('es-MX') : 'Pendiente de cierre'}
          </div>
          <div>
            {editandoTiempo === 'fin' ? (
              <Space>
                <DatePicker showTime value={nuevoValor} onChange={(v) => setNuevoValor(v)} size="small" style={{ width: '200px' }}/>
                <Button type="primary" size="small" icon={<Check size={14}/>} onClick={guardarCambioTiempo}>Guardar</Button>
                <Button size="small" icon={<X size={14}/>} onClick={() => setEditandoTiempo(null)} />
              </Space>
            ) : (
              <Button size="small" type="default" danger icon={<Edit3 size={14}/>} onClick={() => { setEditandoTiempo('fin'); setNuevoValor(viaje.fechaFinExacta ? dayjs(viaje.fechaFinExacta) : null); }}>
                Editar Fin
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HistorialViaje;