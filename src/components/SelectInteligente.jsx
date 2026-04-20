// src/components/SelectInteligente.jsx
import React from 'react';
import { Select } from 'antd';
import { Trash2 } from 'lucide-react';

const { Option } = Select;

const SelectInteligente = ({ categoria, value, onChange, placeholder, sugerencias, eliminarSugerencia }) => (
  <Select
    mode="tags"
    style={{ width: '100%' }}
    placeholder={placeholder}
    value={value ? [value] : []}
    onChange={(vals) => onChange(vals[vals.length - 1] || '')}
    getPopupContainer={(trigger) => trigger.parentNode}
  >
    {sugerencias[categoria]?.map(s => (
      <Option key={s.id} value={s.valor}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {s.valor}
          <Trash2 
            size={14} 
            color="#ff4d4f" 
            onClick={(e) => eliminarSugerencia(e, s.id)} 
            style={{ cursor: 'pointer' }}
          />
        </div>
      </Option>
    ))}
  </Select>
);

export default SelectInteligente;