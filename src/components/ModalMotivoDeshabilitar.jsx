// src/components/ModalMotivoDeshabilitar.jsx
import React from 'react';
import { Modal, Radio } from 'antd';

const ModalMotivoDeshabilitar = ({ visible, onCancel, onOk, unidadNombre, motivo, setMotivo }) => {
  return (
    <Modal
      title={`Deshabilitar Unidad: ${unidadNombre}`}
      open={visible}
      onOk={onOk}
      onCancel={onCancel}
      okText="Confirmar"
      cancelText="Cancelar"
      okButtonProps={{ danger: true }}
      getPopupContainer={() => document.body}
    >
      <div style={{ padding: '20px 0' }}>
        <p style={{ marginBottom: '10px', fontWeight: 'bold' }}>Selecciona el motivo del resguardo:</p>
        <Radio.Group onChange={(e) => setMotivo(e.target.value)} value={motivo}>
          <Radio value="Taller" style={{ display: 'block', marginBottom: '8px' }}>Taller</Radio>
          <Radio value="Incidente" style={{ display: 'block', marginBottom: '8px' }}>Incidente</Radio>
          <Radio value="Corralon" style={{ display: 'block', marginBottom: '8px' }}>Corralon</Radio>
          <Radio value="Baja Temporal" style={{ display: 'block', marginBottom: '8px' }}>Baja Temporal</Radio>
        </Radio.Group>
      </div>
    </Modal>
  );
};

export default ModalMotivoDeshabilitar;