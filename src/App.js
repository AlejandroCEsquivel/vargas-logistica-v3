import React, { useState, useEffect } from 'react';
import { Home, History, FileText, Settings, Truck, Clock, Warehouse, Search, ArrowUp, ArrowDown, Trash2, LogOut } from 'lucide-react';
import { DatePicker, Select, Button, ConfigProvider, theme, Table, Input, Collapse, Empty, message, Popconfirm, Spin } from 'antd'; 
import { db, auth } from './firebase';
import { collection, deleteDoc, doc, updateDoc, query, orderBy, limit, onSnapshot, addDoc, getDocs } from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import dayjs from 'dayjs';
import 'antd/dist/reset.css';

import HistorialViaje from './components/HistorialViaje';
import ModalNuevoViaje from './components/ModalNuevoViaje';
import ModalBitacora from './components/ModalBitacora';
import ModalRastreoEspecial from './components/ModalRastreoEspecial';
import ModalMotivoDeshabilitar from './components/ModalMotivoDeshabilitar';
import ModalTerminarViaje from './components/ModalTerminarViaje';
import { generarExcelGeneral } from './services/excelService';

const { Option } = Select;
const { Panel } = Collapse;
const { RangePicker } = DatePicker;

function App() {
  const [vistaActual, setVistaActual] = useState('inicio');
  const [pestañaActiva, setPestañaActiva] = useState('viajes');
  
  // ESTADOS DE AUTENTICACIÓN
  const [usuario, setUsuario] = useState(null);
  const [cargandoUsuario, setCargandoUsuario] = useState(true);
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [errorIngreso, setErrorIngreso] = useState('');

  // ESTADOS DE DATOS
  const [unidades, setUnidades] = useState([]);
  const [choferes, setChoferes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [viajes, setViajes] = useState([]);
  const [reportes, setReportes] = useState([]);
  const [sugerencias, setSugerencias] = useState({ estatus: [], ubicacion: [], velocidad: [], lugar: [], caja: [], origen: [], destino: [] });
  
  const [mostrarModalNuevoViaje, setMostrarModalNuevoViaje] = useState(false);
  const [datosHeredados, setDatosHeredados] = useState(null); 
  const [mostrarModalBitacora, setMostrarModalBitacora] = useState(false);
  const [mostrarModalRastreo, setMostrarModalRastreo] = useState(false);
  const [mostrarModalMotivo, setMostrarModalMotivo] = useState(false);
  const [modalTerminarVisible, setModalTerminarVisible] = useState(false);
  const [viajeActivoRastreo, setViajeActivoRastreo] = useState(null);
  const [puntosRevision, setPuntosRevision] = useState([]);
  const [unidadAfectada, setUnidadAfectada] = useState(null);
  const [viajeATerminar, setViajeATerminar] = useState(null);
  const [selloActual, setSelloActual] = useState('');
  const [motivoSeleccionado, setMotivoSeleccionado] = useState('Taller');
  const [editandoId, setEditandoId] = useState(null);
  const [tipoEdicion, setTipoEdicion] = useState(null);
  const [nuevoVehiculo, setNuevoVehiculo] = useState('');
  const [nuevoChofer, setNuevoChofer] = useState('');
  const [nuevoCliente, setNuevoCliente] = useState('');
  const [correoNuevo, setCorreoNuevo] = useState('');
  const [textoBusqueda, setTextoBusqueda] = useState('');
  const [rangoFechas, setRangoFechas] = useState(null);
  const [filtroMovimiento, setFiltroMovimiento] = useState('Todos');
  const [filtroServicio, setFiltroServicio] = useState('Todos');

  // --- LOGICA DE AUTENTICACIÓN ---
  useEffect(() => {
    const desuscribir = onAuthStateChanged(auth, (usuarioDetectado) => {
      setUsuario(usuarioDetectado);
      setCargandoUsuario(false);
    });
    return () => desuscribir();
  }, []);

  const manejarIngreso = async (e) => {
    if (e) e.preventDefault();
    if (!correo || !contrasena) {
      message.warning("Por favor completa los campos");
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, correo.trim(), contrasena);
      setErrorIngreso('');
      message.success("Bienvenido al sistema");
    } catch (error) {
      console.error("Error de login:", error.code);
      setErrorIngreso("Correo o contraseña incorrectos");
    }
  };

  const manejarSalida = async () => {
    await signOut(auth);
    message.info("Sesión cerrada");
  };

  // --- CARGA DE DATOS ---
  const cargarSugerencias = async () => {
    try {
      const snap = await getDocs(collection(db, "sugerencias_menu"));
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSugerencias({
        estatus: docs.filter(d => d.categoria === 'estatus'),
        ubicacion: docs.filter(d => d.categoria === 'ubicacion'),
        velocidad: docs.filter(d => d.categoria === 'velocidad'),
        lugar: docs.filter(d => d.categoria === 'lugar'),
        caja: docs.filter(d => d.categoria === 'caja'),
        origen: docs.filter(d => d.categoria === 'origen'),
        destino: docs.filter(d => d.categoria === 'destino')
      });
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (!usuario) return;
    cargarSugerencias();
    const unsubVehiculos = onSnapshot(collection(db, "vehiculos"), (snap) => setUnidades(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubChoferes = onSnapshot(collection(db, "choferes"), (snap) => setChoferes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubClientes = onSnapshot(collection(db, "clientes"), (snap) => setClientes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubViajes = onSnapshot(query(collection(db, "viajes"), orderBy("fechaCreacion", "desc"), limit(50)), (snap) => setViajes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubReportes = onSnapshot(query(collection(db, "reportes"), orderBy("fechaEnvio", "desc"), limit(100)), (snap) => setReportes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubVehiculos(); unsubChoferes(); unsubClientes(); unsubViajes(); unsubReportes(); };
  }, [usuario]);

  // --- LOGICA DE VIAJES Y YARDA (MANTENIDA ÍNTEGRA) ---
  const toggleMovimiento = async (viaje) => {
    try {
      const nuevoMov = viaje.movimiento === 'Salida' ? 'Regreso' : 'Salida';
      await updateDoc(doc(db, "viajes", viaje.id), { movimiento: nuevoMov });
      message.success(`Cambiado a ${nuevoMov}`);
    } catch (error) { message.error("Error al cambiar movimiento"); }
  };

  const toggleServicio = async (viaje) => {
    try {
      const nuevoServ = !viaje.esExportacion;
      await updateDoc(doc(db, "viajes", viaje.id), { esExportacion: nuevoServ });
      message.success(`Cambiado a ${nuevoServ ? 'Exportación' : 'Nacional'}`);
    } catch (error) { message.error("Error al cambiar servicio"); }
  };

  const handleMoverAEspera = async (viajeId) => {
    try {
      await updateDoc(doc(db, "viajes", viajeId), { estatus: 'espera', fechaFinalizacion: new Date().toISOString() });
      message.success("Unidad enviada a espera");
    } catch (e) { message.error("Error al mover a espera"); }
  };

  const handleEliminarEspera = async (id) => {
    try {
      await deleteDoc(doc(db, "viajes", id));
      message.success("Unidad removida de espera");
    } catch (e) { message.error("Error al eliminar de espera"); }
  };

  const handleIniciarNuevoTramo = (viajeEnEspera) => {
    setDatosHeredados(viajeEnEspera);
    setMostrarModalNuevoViaje(true);
  };

  const confirmarTerminarViaje = async (fechaIso) => {
    try {
      await updateDoc(doc(db, "viajes", viajeATerminar.id), { 
        estatus: 'finalizado', 
        fechaFinalizacion: fechaIso,
        fechaFinExacta: fechaIso
      });
      const registroEnEspera = viajes.find(v => v.unidad === viajeATerminar.unidad && v.estatus === 'espera' && v.id !== viajeATerminar.id);
      if (registroEnEspera) {
        await deleteDoc(doc(db, "viajes", registroEnEspera.id));
      }
      setModalTerminarVisible(false);
      message.success("Viaje finalizado con éxito");
    } catch (e) { message.error("Error al finalizar viaje"); }
  };

  const handleAccionDisponibilidad = async (record) => {
    if (record.estado === 'Listo' || !record.estado) {
      setUnidadAfectada(record);
      setMostrarModalMotivo(true);
    } else {
      try {
        await updateDoc(doc(db, "vehiculos", record.id), { estado: 'Listo' });
        message.success(`Unidad ${record.nombre} habilitada`);
      } catch (e) { message.error("Error al habilitar unidad"); }
    }
  };

  const confirmarDeshabilitar = async () => {
    try {
      await updateDoc(doc(db, "vehiculos", unidadAfectada.id), { estado: motivoSeleccionado });
      message.warning(`Unidad ${unidadAfectada.nombre} enviada a: ${motivoSeleccionado}`);
      setMostrarModalMotivo(false);
    } catch (e) { message.error("Error al deshabilitar unidad"); }
  };

  const guardarSugerenciaAutomatica = async (categoria, valor) => {
    if (!valor || valor.trim() === '') return;
    const existe = sugerencias[categoria]?.some(s => s.valor.toLowerCase() === valor.toLowerCase());
    if (!existe) {
      try {
        await addDoc(collection(db, "sugerencias_menu"), { categoria, valor: valor.trim() });
        cargarSugerencias();
      } catch (e) { message.error("Error al guardar sugerencia"); }
    }
  };

  const eliminarSugerencia = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, "sugerencias_menu", id));
      cargarSugerencias();
      message.success("Sugerencia eliminada");
    } catch (e) { message.error("Error al eliminar"); }
  };

  const prepararEdicion = (coleccion, record) => {
    setEditandoId(record.id);
    setTipoEdicion(coleccion);
    if (coleccion === 'vehiculos') setNuevoVehiculo(record.nombre);
    if (coleccion === 'choferes') setNuevoChofer(record.nombre);
    if (coleccion === 'clientes') { setNuevoCliente(record.nombre); setCorreoNuevo(record.correo || ''); }
  };

  const cancelarEdicion = () => {
    setEditandoId(null); setTipoEdicion(null); setNuevoVehiculo(''); setNuevoChofer(''); setNuevoCliente(''); setCorreoNuevo('');
  };

  const handleAgregar = async (coleccion) => {
    let objetoNuevo = {};
    try {
      if (coleccion === 'vehiculos') {
        if (!nuevoVehiculo) return;
        objetoNuevo = { nombre: nuevoVehiculo };
        if (editandoId && tipoEdicion === 'vehiculos') await updateDoc(doc(db, "vehiculos", editandoId), objetoNuevo);
        else await addDoc(collection(db, "vehiculos"), { ...objetoNuevo, estado: 'Listo' });
        setNuevoVehiculo('');
      } else if (coleccion === 'choferes') {
        if (!nuevoChofer) return;
        objetoNuevo = { nombre: nuevoChofer };
        if (editandoId && tipoEdicion === 'choferes') await updateDoc(doc(db, "choferes", editandoId), objetoNuevo);
        else await addDoc(collection(db, "choferes"), objetoNuevo);
        setNuevoChofer('');
      } else if (coleccion === 'clientes') {
        if (!nuevoCliente) return;
        objetoNuevo = { nombre: nuevoCliente, correo: correoNuevo };
        if (editandoId && tipoEdicion === 'clientes') await updateDoc(doc(db, "clientes", editandoId), objetoNuevo);
        else await addDoc(collection(db, "clientes"), objetoNuevo);
        setNuevoCliente(''); setCorreoNuevo('');
      }
      setEditandoId(null); setTipoEdicion(null);
      message.success("Registro guardado con éxito");
    } catch (e) { message.error("Error al guardar registro"); }
  };

  const handleEliminar = async (coleccion, id) => {
    if (window.confirm("¿Estás seguro de eliminar este registro?")) {
      try {
        await deleteDoc(doc(db, coleccion, id));
        message.success("Registro eliminado");
      } catch (e) { message.error("Error al eliminar"); }
    }
  };

  const renderTagsViaje = (viaje, isEditable = false) => {
    if (!viaje) return null;
    return (
      <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
        <span 
          onClick={() => isEditable && toggleMovimiento(viaje)}
          title={isEditable ? "Clic para cambiar" : ""}
          style={{ 
            cursor: isEditable ? 'pointer' : 'default',
            fontSize: '10px', 
            background: viaje.movimiento === 'Regreso' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(59, 130, 246, 0.2)', 
            color: viaje.movimiento === 'Regreso' ? '#c084fc' : '#60a5fa', 
            padding: '2px 6px', 
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '2px'
          }}
        >
          {viaje.movimiento === 'Regreso' ? <><ArrowUp size={10} /> REGRESO</> : <><ArrowDown size={10} /> SALIDA</>}
        </span>
        <span 
          onClick={() => isEditable && toggleServicio(viaje)}
          title={isEditable ? "Clic para cambiar" : ""}
          style={{ 
            cursor: isEditable ? 'pointer' : 'default',
            fontSize: '10px', 
            background: viaje.esExportacion ? 'rgba(245, 158, 11, 0.2)' : 'rgba(34, 197, 94, 0.2)', 
            color: viaje.esExportacion ? '#fbbf24' : '#4ade80', 
            padding: '2px 6px', 
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '2px'
          }}
        >
          {viaje.esExportacion ? "🇺🇸 EXPORTACIÓN" : "🇲🇽 NACIONAL"}
        </span>
      </div>
    );
  };

  const obtenerDatosTabla = () => {
    if (pestañaActiva === 'yarda') return unidades;
    return viajes.filter(v => v.estatus === pestañaActiva);
  };

  // --- RENDERS DE PANTALLA ---
  if (cargandoUsuario) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <Spin size="large" tip="Cargando sistema..." />
      </div>
    );
  }

  if (!usuario) {
    return (
      <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
        <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
          <form onSubmit={manejarIngreso} style={{ width: '350px', padding: '40px', background: '#141414', borderRadius: '8px', border: '1px solid #333' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '30px', fontWeight: '300' }}>Transportes Vargas</h2>
            <Input 
              placeholder="Correo electrónico" 
              value={correo} 
              onChange={(e) => setCorreo(e.target.value)}
              style={{ marginBottom: '15px', height: '40px' }} 
            />
            <Input.Password 
              placeholder="Contraseña" 
              value={contrasena} 
              onChange={(e) => setContrasena(e.target.value)}
              style={{ marginBottom: '20px', height: '40px' }} 
            />
            {errorIngreso && <p style={{ color: '#ff4d4f', textAlign: 'center', marginBottom: '15px' }}>{errorIngreso}</p>}
            <Button type="primary" htmlType="submit" block style={{ height: '45px', fontWeight: 'bold' }}>
              Ingresar
            </Button>
          </form>
        </div>
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#000', color: '#fff' }}>
        {/* BARRA LATERAL */}
        <div style={{ width: '240px', backgroundColor: '#0a0a0a', borderRight: '1px solid #1a1a1a', padding: '20px 15px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ color: '#666', fontSize: '12px', fontWeight: 'bold', marginBottom: '40px', letterSpacing: '1px' }}>BITÁCORA FORÁNEO</div>
          
          <nav style={{ flex: 1 }}>
            <div onClick={() => setVistaActual('inicio')} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 15px', cursor: 'pointer', borderRadius: '8px', backgroundColor: vistaActual === 'inicio' ? '#1a1a1a' : 'transparent', marginBottom: '8px', transition: 'all 0.3s' }}>
              <Home size={20} color={vistaActual === 'inicio' ? '#3b82f6' : '#666'} /> Inicio
            </div>
            <div onClick={() => setVistaActual('historial')} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 15px', cursor: 'pointer', borderRadius: '8px', backgroundColor: vistaActual === 'historial' ? '#1a1a1a' : 'transparent', marginBottom: '8px', transition: 'all 0.3s' }}>
              <History size={20} color={vistaActual === 'historial' ? '#3b82f6' : '#666'} /> Historial
            </div>
            <div onClick={() => setVistaActual('reportes')} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 15px', cursor: 'pointer', borderRadius: '8px', backgroundColor: vistaActual === 'reportes' ? '#1a1a1a' : 'transparent', marginBottom: '8px', transition: 'all 0.3s' }}>
              <FileText size={20} color={vistaActual === 'reportes' ? '#3b82f6' : '#666'} /> Reportes
            </div>
            <div onClick={() => setVistaActual('configuracion')} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 15px', cursor: 'pointer', borderRadius: '8px', backgroundColor: vistaActual === 'configuracion' ? '#1a1a1a' : 'transparent', transition: 'all 0.3s' }}>
              <Settings size={20} color={vistaActual === 'configuracion' ? '#3b82f6' : '#666'} /> Configuración
            </div>
          </nav>

          <div style={{ padding: '15px', borderTop: '1px solid #1a1a1a' }}>
             <Button type="text" danger icon={<LogOut size={18} />} onClick={manejarSalida} block style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               Cerrar Sesión
             </Button>
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
          {vistaActual === 'inicio' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h1 style={{ fontSize: '75px', margin: '0', fontWeight: '300', letterSpacing: '-2px' }}>{dayjs().format('HH:mm')}</h1>
                <p style={{ color: '#fff', fontSize: '24px', margin: '0', fontWeight: '300' }}>Registros encontrados</p>
                
                <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '25px' }}>
                  <Button type="primary" onClick={() => setMostrarModalBitacora(true)} style={{ height: '45px', padding: '0 30px', fontWeight: 'bold', borderRadius: '6px' }}>Capturar bitácora</Button>
                  <Button type="primary" danger onClick={() => setMostrarModalNuevoViaje(true)} style={{ height: '45px', padding: '0 30px', fontWeight: 'bold', borderRadius: '6px' }}>Nuevo viaje</Button>
                </div>
              </div>

              <div style={{ display: 'flex', borderBottom: '1px solid #1a1a1a', marginBottom: '25px', gap: '30px' }}>
                {['viajes', 'espera', 'yarda'].map((tab) => (
                  <span 
                    key={tab}
                    onClick={() => setPestañaActiva(tab)}
                    style={{ 
                      paddingBottom: '12px', 
                      cursor: 'pointer', 
                      fontSize: '16px',
                      color: pestañaActiva === tab ? '#3b82f6' : '#666',
                      borderBottom: pestañaActiva === tab ? '2px solid #3b82f6' : 'none',
                      textTransform: 'capitalize',
                      transition: 'all 0.3s'
                    }}
                  >
                    {tab}
                  </span>
                ))}
              </div>

              <Table 
                dataSource={obtenerDatosTabla()} 
                rowKey="id" 
                pagination={false}
                size="middle"
                columns={pestañaActiva === 'viajes' ? [
                  {
                    title: 'Acciones',
                    key: 'acciones',
                    width: 180,
                    render: (_, record) => (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button size="small" onClick={() => handleMoverAEspera(record.id)}>Espera</Button>
                        <Button 
                          danger 
                          size="small" 
                          onClick={() => { setViajeATerminar(record); setModalTerminarVisible(true); }}
                        >
                          Terminar
                        </Button>
                      </div>
                    )
                  },
                  { title: 'Folio', dataIndex: 'clave', key: 'folio' },
                  { 
                    title: 'Unidad', 
                    dataIndex: 'unidad', 
                    key: 'unidad',
                    render: (text, record) => (
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{text}</div>
                        {renderTagsViaje(record, true)}
                      </div>
                    )
                  },
                  { title: 'Chofer', dataIndex: 'chofer', key: 'chofer' },
                  { title: 'Cliente', dataIndex: 'cliente', key: 'cliente' },
                  { title: 'Destino', dataIndex: 'destino', key: 'destino' }
                ] : pestañaActiva === 'espera' ? [
                  {
                    title: 'Acción',
                    key: 'accion',
                    width: 150,
                    render: (_, record) => (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button type="primary" size="small" onClick={() => handleIniciarNuevoTramo(record)}>Iniciar tramo</Button>
                        <Popconfirm title="¿Eliminar de espera?" onConfirm={() => handleEliminarEspera(record.id)} okText="Sí" cancelText="No">
                          <Button danger size="small" icon={<Trash2 size={14} />} />
                        </Popconfirm>
                      </div>
                    )
                  },
                  { title: 'Unidad', dataIndex: 'unidad', key: 'unidad' },
                  { title: 'Chofer', dataIndex: 'chofer', key: 'chofer' },
                  { title: 'Cliente', dataIndex: 'cliente', key: 'cliente' },
                  { title: 'Finalizó', dataIndex: 'fechaFinalizacion', render: (f) => dayjs(f).format('DD/MM HH:mm') }
                ] : [
                  {
                    title: 'Estado',
                    key: 'estado',
                    width: 150,
                    render: (_, record) => (
                      <Button 
                        onClick={() => handleAccionDisponibilidad(record)}
                        style={{ 
                          width: '100%',
                          backgroundColor: (record.estado === 'Listo' || !record.estado) ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: (record.estado === 'Listo' || !record.estado) ? '#4ade80' : '#f87171',
                          borderColor: (record.estado === 'Listo' || !record.estado) ? '#059669' : '#b91c1c'
                        }}
                      >
                        {record.estado || 'Listo'}
                      </Button>
                    )
                  },
                  { title: 'Unidad', dataIndex: 'nombre', key: 'nombre', render: (t) => <b>{t}</b> }
                ]}
                locale={{ emptyText: <Empty description="No hay datos para mostrar" /> }}
              />
            </>
          )}

          {vistaActual === 'historial' && (
            <HistorialViaje 
              viajes={viajes} 
              reportes={reportes} 
              unidades={unidades} 
              choferes={choferes} 
              clientes={clientes}
              renderTagsViaje={renderTagsViaje}
            />
          )}

          {vistaActual === 'reportes' && (
            <div style={{ background: '#141414', padding: '30px', borderRadius: '12px', border: '1px solid #1a1a1a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{ margin: 0 }}>Panel de Reportes</h2>
                <Button 
                  type="primary" 
                  icon={<FileText size={18} />} 
                  onClick={() => generarExcelGeneral(reportes, viajes)}
                  disabled={reportes.length === 0}
                >
                  Exportar a Excel
                </Button>
              </div>

              <div style={{ display: 'flex', gap: '15px', marginBottom: '25px', flexWrap: 'wrap' }}>
                <RangePicker style={{ width: '300px' }} onChange={(vals) => setRangoFechas(vals)} />
                <Select placeholder="Movimiento" style={{ width: '150px' }} onChange={setFiltroMovimiento} defaultValue="Todos">
                  <Option value="Todos">Todos</Option>
                  <Option value="Salida">Salidas</Option>
                  <Option value="Regreso">Regresos</Option>
                </Select>
                <Select placeholder="Servicio" style={{ width: '150px' }} onChange={setFiltroServicio} defaultValue="Todos">
                  <Option value="Todos">Todos</Option>
                  <Option value="Exportacion">Exportación</Option>
                  <Option value="Nacional">Nacional</Option>
                </Select>
                <Input 
                  placeholder="Buscar folio, unidad o chofer..." 
                  prefix={<Search size={16} />} 
                  style={{ width: '300px' }} 
                  onChange={(e) => setTextoBusqueda(e.target.value)}
                />
              </div>

              <Table 
                dataSource={reportes}
                size="small"
                columns={[
                  { title: 'Folio', dataIndex: 'claveViaje' },
                  { title: 'Fecha', dataIndex: 'fechaEnvio', render: (f) => dayjs(f).format('DD/MM/YY HH:mm') },
                  { title: 'Estatus', dataIndex: 'estatus' },
                  { title: 'Ubicación', dataIndex: 'ubicacion' },
                  { title: 'Próxima Revisión', dataIndex: 'proximaRevision', render: (f) => f ? dayjs(f).format('HH:mm') : '-' }
                ]}
              />
            </div>
          )}

          {vistaActual === 'configuracion' && (
            <div style={{ maxWidth: '900px' }}>
              <h2 style={{ marginBottom: '30px' }}>Configuración del Sistema</h2>
              
              <Collapse ghost accordion expandIconPosition="end" style={{ background: '#141414', borderRadius: '12px' }}>
                <Panel header={<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Truck size={18} /> Gestión de Unidades</div>} key="1">
                   <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                     <Input 
                       placeholder="Nueva unidad (Ej: V-102)" 
                       value={nuevoVehiculo} 
                       onChange={(e) => setNuevoVehiculo(e.target.value)} 
                       onPressEnter={() => handleAgregar('vehiculos')}
                     />
                     <Button type="primary" onClick={() => handleAgregar('vehiculos')}>
                       {editandoId && tipoEdicion === 'vehiculos' ? 'Actualizar' : 'Agregar'}
                     </Button>
                     {editandoId && <Button onClick={cancelarEdicion}>Cancelar</Button>}
                   </div>
                   <Table 
                     dataSource={unidades} 
                     rowKey="id" 
                     size="small" 
                     pagination={{ pageSize: 5 }}
                     columns={[
                       { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
                       { title: 'Estado Actual', dataIndex: 'estado', render: (e) => e || 'Listo' },
                       { 
                         title: 'Acciones', 
                         render: (_, record) => (
                           <div style={{ display: 'flex', gap: '10px' }}>
                             <Button size="small" onClick={() => prepararEdicion('vehiculos', record)}>Editar</Button>
                             <Popconfirm title="¿Eliminar unidad?" onConfirm={() => handleEliminar('vehiculos', record.id)}>
                               <Button danger size="small" icon={<Trash2 size={14} />} />
                             </Popconfirm>
                           </div>
                         )
                       }
                     ]} 
                   />
                </Panel>

                <Panel header={<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Clock size={18} /> Gestión de Choferes</div>} key="2">
                   <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                     <Input placeholder="Nombre del chofer" value={nuevoChofer} onChange={(e) => setNuevoChofer(e.target.value)} />
                     <Button type="primary" onClick={() => handleAgregar('choferes')}>
                       {editandoId && tipoEdicion === 'choferes' ? 'Actualizar' : 'Agregar'}
                     </Button>
                   </div>
                   <Table dataSource={choferes} rowKey="id" size="small" columns={[{ title: 'Nombre', dataIndex: 'nombre' }, { title: 'Acciones', render: (_, r) => <Button danger size="small" onClick={() => handleEliminar('choferes', r.id)}>Eliminar</Button> }]} />
                </Panel>

                <Panel header={<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Warehouse size={18} /> Gestión de Clientes</div>} key="3">
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                     <Input placeholder="Nombre del cliente" value={nuevoCliente} onChange={(e) => setNuevoCliente(e.target.value)} />
                     <Input placeholder="Correos (separados por coma)" value={correoNuevo} onChange={(e) => setCorreoNuevo(e.target.value)} />
                     <Button type="primary" onClick={() => handleAgregar('clientes')}>
                       {editandoId && tipoEdicion === 'clientes' ? 'Actualizar' : 'Agregar Cliente'}
                     </Button>
                   </div>
                   <Table dataSource={clientes} rowKey="id" size="small" columns={[{ title: 'Cliente', dataIndex: 'nombre' }, { title: 'Correos', dataIndex: 'correo' }, { title: 'Acciones', render: (_, r) => <Button danger size="small" onClick={() => handleEliminar('clientes', r.id)}>Eliminar</Button> }]} />
                </Panel>
              </Collapse>
            </div>
          )}
        </div>

        {/* MODALES EXTERNOS */}
        <ModalNuevoViaje 
          visible={mostrarModalNuevoViaje} 
          onCancel={() => { 
            setMostrarModalNuevoViaje(false); 
            setDatosHeredados(null); 
          }} 
          datosHeredados={datosHeredados}
          unidades={unidades} 
          choferes={choferes} 
          clientes={clientes} 
          viajes={viajes} 
          sugerencias={sugerencias} 
          guardarSugerenciaAutomatica={guardarSugerenciaAutomatica} 
          eliminarSugerencia={eliminarSugerencia} 
        />
        <ModalBitacora 
          visible={mostrarModalBitacora} 
          onCancel={() => setMostrarModalBitacora(false)} 
          unidades={unidades} 
          viajes={viajes} 
          clientes={clientes} 
          sugerencias={sugerencias} 
          guardarSugerenciaAutomatica={guardarSugerenciaAutomatica} 
          eliminarSugerencia={eliminarSugerencia} 
          renderTagsViaje={renderTagsViaje} 
        />
        <ModalTerminarViaje 
          visible={modalTerminarVisible} 
          onCancel={() => setModalTerminarVisible(false)} 
          onConfirm={confirmarTerminarViaje} 
        />
        <ModalMotivoDeshabilitar 
          visible={mostrarModalMotivo} 
          onCancel={() => setMostrarModalMotivo(false)} 
          onOk={confirmarDeshabilitar} 
          unidadNombre={unidadAfectada?.nombre} 
          motivo={motivoSeleccionado} 
          setMotivo={setMotivoSeleccionado} 
        />
        <ModalRastreoEspecial 
          visible={mostrarModalRastreo} 
          onCancel={() => setMostrarModalRastreo(false)} 
          viaje={viajeActivoRastreo} 
          puntos={puntosRevision} 
          sugerencias={sugerencias} 
          guardarSugerenciaAutomatica={guardarSugerenciaAutomatica} 
          eliminarSugerencia={eliminarSugerencia} 
          selloActual={selloActual} 
          setSelloActual={setSelloActual} 
        />
      </div>
    </ConfigProvider>
  );
}

export default App;