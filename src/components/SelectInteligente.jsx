import React from 'react';
import { AutoComplete, Input } from 'antd';
import { Trash2 } from 'lucide-react';

const SelectInteligente = ({ categoria, value, onChange, placeholder, sugerencias, eliminarSugerencia }) => {
  
  // Transformamos las sugerencias al formato de opciones de AutoComplete
  const opciones = sugerencias[categoria]?.map(s => ({
    value: s.valor,
    label: (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{s.valor}</span>
        <Trash2 
          size={14} 
          color="#ff4d4f" 
          onClick={(e) => {
            e.stopPropagation(); // IMPORTANTE: Evita que se seleccione la opción al querer borrarla
            eliminarSugerencia(e, s.id);
          }} 
          style={{ cursor: 'pointer' }}
        />
      </div>
    ),
  })) || [];

  return (
    <AutoComplete
      style={{ width: '100%' }}
      options={opciones}
      value={value}
      onChange={onChange}
      onSelect={(val) => onChange(val)} // Asegura que al hacer clic se guarde el valor
      filterOption={(inputValue, option) =>
        option.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
      }
      getPopupContainer={(trigger) => trigger.parentNode}
    >
      <Input 
        placeholder={placeholder} 
        style={{ 
          background: '#262626', 
          border: '1px solid #444', 
          color: '#fff' 
        }} 
      />
    </AutoComplete>
  );
};

export default SelectInteligente;