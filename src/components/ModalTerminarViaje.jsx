// src/components/ModalTerminarViaje.jsx
import React, { useState } from 'react';
import { Modal, Radio, DatePicker, TimePicker, Space } from 'antd';
import dayjs from 'dayjs';

const ModalTerminarViaje = ({ visible, onCancel, onConfirm }) => {
  const [modo, setModo] = useState('ahora');
  const [fecha, setFecha] = useState(dayjs());
  const [hora, setHora] = useState(dayjs());

  const handleOk = () => {
    let fechaIso;
    if (modo === 'ahora') {
      fechaIso = new Date().toISOString();
    } else {
      const fechaStr = fecha.format('YYYY-MM-DD');
      const horaStr = hora.format('HH:mm');
      fechaIso = dayjs(`${fechaStr} ${horaStr}`, 'YYYY-MM-DD HH:mm').toISOString();
    }
    onConfirm(fechaIso);
  };

  return (
    <Modal title="Finalizar Viaje" open={visible} onCancel={onCancel} onOk={handleOk} okText="Finalizar Viaje" cancelText="Cancelar" okButtonProps={{ danger: true }} getPopupContainer={() => document.body}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '10px 0' }}>
        <p style={{ margin: 0 }}>Selecciona cuándo concluyó este viaje:</p>
        <Radio.Group value={modo} onChange={e => setModo(e.target.value)}>
          <Space direction="vertical">
            <Radio value="ahora">Terminó en este preciso momento</Radio>
            <Radio value="personalizado">Ingresar una fecha y hora exacta pasada</Radio>
          </Space>
        </Radio.Group>
        
        {modo === 'personalizado' && (
          <div style={{ display: 'flex', gap: '10px', marginTop: '5px', background: 'rgba(0,0,0,0.05)', padding: '15px', borderRadius: '8px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#888' }}>Fecha de llegada</label>
              <DatePicker value={fecha} onChange={setFecha} style={{ width: '100%' }} getPopupContainer={t => t.parentNode} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#888' }}>Hora de llegada</label>
              <TimePicker format="HH:mm" value={hora} onChange={setHora} style={{ width: '100%' }} getPopupContainer={t => t.parentNode} />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ModalTerminarViaje;