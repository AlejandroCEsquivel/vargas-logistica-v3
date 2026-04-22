import React, { useState, useEffect } from 'react';
import { Home, History, FileText, Settings, Truck, Clock, Warehouse, Search, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { DatePicker, Select, Button, ConfigProvider, theme, Table, Input, Collapse, Empty, message, Popconfirm } from 'antd'; 
import { db } from './firebase';
import { collection, deleteDoc, doc, updateDoc, query, orderBy, limit, onSnapshot, addDoc, getDocs } from 'firebase/firestore';
import dayjs from 'dayjs';
import 'antd/dist/reset.css';

// IMPORTACIÓN DE COMPONENTES Y SERVICIOS MODULARES
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
  
  // ESTADOS DE DATOS
  const [unidades, setUnidades] = useState([]);
  const [choferes, setChoferes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [viajes, setViajes] = useState([]);
  const [reportes, setReportes] = useState([]); 
  const [sugerencias, setSugerencias] = useState({ estatus: [], ubicacion: [], velocidad: [], lugar: [], caja: [], origen: [], destino: [] });

  // ESTADOS DE MODALES Y HERENCIA
  const [mostrarModalNuevoViaje, setMostrarModalNuevoViaje] = useState(false);
  const [datosHeredados, setDatosHeredados] = useState(null); // <-- Nuevo estado para guardar la herencia
  const [mostrarModalBitacora, setMostrarModalBitacora] = useState(false);
  const [mostrarModalRastreo, setMostrarModalRastreo] = useState(false);
  const [mostrarModalMotivo, setMostrarModalMotivo] = useState(false);
  const [modalTerminarVisible, setModalTerminarVisible] = useState(false);

  // ESTADOS DE SELECCIÓN Y EDICIÓN
  const [viajeActivoRastreo, setViajeActivoRastreo] = useState(null);
  const [puntosRevision, setPuntosRevision] = useState([]);
  const [unidadAfectada, setUnidadAfectada] = useState(null);
  const [viajeATerminar, setViajeATerminar] = useState(null);
  const [selloActual, setSelloActual] = useState('');
  const [motivoSeleccionado, setMotivoSeleccionado] = useState('Taller');
  
  // ESTADOS CONFIGURACION
  const [editandoId, setEditandoId] = useState(null);
  const [tipoEdicion, setTipoEdicion] = useState(null);
  const [nuevoVehiculo, setNuevoVehiculo] = useState('');
  const [nuevoChofer, setNuevoChofer] = useState('');
  const [nuevoCliente, setNuevoCliente] = useState('');
  const [correoNuevo, setCorreoNuevo] = useState('');

  // ESTADOS REPORTES
  const [textoBusqueda, setTextoBusqueda] = useState('');
  const [rangoFechas, setRangoFechas] = useState(null);
  const [filtroMovimiento, setFiltroMovimiento] = useState('Todos');
  const [filtroServicio, setFiltroServicio] = useState('Todos');

  // FUNCIONES DE CARGA Y FIREBASE
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
    } catch (e) {
      console.error("Error cargando sugerencias:", e);
    }
  };

  useEffect(() => {
    cargarSugerencias();
    const unsubVehiculos = onSnapshot(collection(db, "vehiculos"), (snap) => setUnidades(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubChoferes = onSnapshot(collection(db, "choferes"), (snap) => setChoferes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubClientes = onSnapshot(collection(db, "clientes"), (snap) => setClientes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubViajes = onSnapshot(query(collection(db, "viajes"), orderBy("fechaCreacion", "desc"), limit(50)), (snap) => setViajes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubReportes = onSnapshot(query(collection(db, "reportes"), orderBy("fechaEnvio", "desc"), limit(100)), (snap) => setReportes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubVehiculos(); unsubChoferes(); unsubClientes(); unsubViajes(); unsubReportes(); };
  }, []);

  useEffect(() => {
    if (!viajeActivoRastreo?.id) return;
    const qPuntos = query(collection(db, "viajes", viajeActivoRastreo.id, "puntos_revision"));
    const unsubscribe = onSnapshot(qPuntos, (snap) => {
      const docsOrdenados = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => dayjs(`${a.fecha} ${a.hora}`).valueOf() - dayjs(`${b.fecha} ${b.hora}`).valueOf());
      setPuntosRevision(docsOrdenados);
    });
    return () => unsubscribe();
  }, [viajeActivoRastreo]);

  // FUNCIONES DE LÓGICA Y EVENTOS
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

  const guardarSugerenciaAutomatica = async (categoria, valor) => {
    if (!valor || valor.trim() === '') return;
    const existe = sugerencias[categoria]?.some(s => s.valor.toLowerCase() === valor.toLowerCase());
    if (!existe) {
      try {
        await addDoc(collection(db, "sugerencias_menu"), { categoria, valor: valor.trim() });
        cargarSugerencias();
      } catch (e) { console.error("Error guardando sugerencia"); }
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

  const handleMoverAEspera = async (viajeId) => {
    try {
      await updateDoc(doc(db, "viajes", viajeId), { estatus: 'espera', fechaFinalizacion: new Date().toISOString() });
      message.success("Viaje enviado a espera de carga");
    } catch (e) { message.error("No se pudo actualizar el viaje"); }
  };

  const handleEliminarEspera = async (id) => {
    try {
      await deleteDoc(doc(db, "viajes", id));
      message.success("Unidad removida de espera correctamente");
    } catch (e) { message.error("No se pudo remover la unidad"); }
  };

  // <-- NUEVA FUNCIÓN PARA INICIAR NUEVO TRAMO -->
  const handleIniciarNuevoTramo = (viajeEnEspera) => {
    setDatosHeredados(viajeEnEspera);
    setMostrarModalNuevoViaje(true);
  };

  const confirmarTerminarViaje = async (fechaIso) => {
    try {
      await updateDoc(doc(db, "viajes", viajeATerminar.id), { estatus: 'finalizado', fechaFinalizacion: fechaIso, fechaFinExacta: fechaIso });
      const registroEnEspera = viajes.find(v => v.unidad === viajeATerminar.unidad && v.estatus === 'espera' && v.id !== viajeATerminar.id);
      if (registroEnEspera) await deleteDoc(doc(db, "viajes", registroEnEspera.id));
      setModalTerminarVisible(false);
      message.success("Viaje finalizado correctamente");
    } catch (e) { message.error("No se pudo finalizar el viaje"); }
  };

  const handleAccionDisponibilidad = async (record) => {
    if (record.estado === 'Listo' || !record.estado) {
      setUnidadAfectada(record);
      setMostrarModalMotivo(true);
    } else {
      try {
        await updateDoc(doc(db, "vehiculos", record.id), { estado: 'Listo' });
        message.success(`Unidad ${record.nombre} habilitada correctamente`);
      } catch (e) { message.error("Error al habilitar unidad"); }
    }
  };

  const confirmarDeshabilitar = async () => {
    try {
      await updateDoc(doc(db, "vehiculos", unidadAfectada.id), { estado: motivoSeleccionado });
      message.warning(`Unidad ${unidadAfectada.nombre} enviada a: ${motivoSeleccionado}`);
      setMostrarModalMotivo(false);
    } catch (e) { message.error("Error al actualizar estado"); }
  };

  // FUNCIONES DE CONFIGURACIÓN
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
      message.success("Registro guardado");
    } catch (e) { message.error("Error al procesar la solicitud"); }
  };

  const handleEliminar = async (coleccion, id) => {
    if (window.confirm("¿Deseas eliminar este registro?")) await deleteDoc(doc(db, coleccion, id));
  };

  const obtenerDatosTabla = () => {
    if (pestañaActiva === 'yarda') return unidades; 
    return viajes.filter(v => v.estatus === pestañaActiva);
  };

  // ETIQUETAS VISUALES
  const renderTagsViaje = (viaje, isEditable = false) => {
    if (!viaje) return null;
    return (
      <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
        <span onClick={() => isEditable && toggleMovimiento(viaje)} title={isEditable ? "Clic para cambiar" : ""} style={{ cursor: isEditable ? 'pointer' : 'default', fontSize: '10px', background: viaje.movimiento === 'Regreso' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(59, 130, 246, 0.2)', color: viaje.movimiento === 'Regreso' ? '#c084fc' : '#60a5fa', padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '2px' }}>
          {viaje.movimiento === 'Regreso' ? <><ArrowUp size={10} /> REGRESO</> : <><ArrowDown size={10} /> SALIDA</>}
        </span>
        <span onClick={() => isEditable && toggleServicio(viaje)} title={isEditable ? "Clic para cambiar" : ""} style={{ cursor: isEditable ? 'pointer' : 'default', fontSize: '10px', background: viaje.esExportacion ? 'rgba(245, 158, 11, 0.2)' : 'rgba(34, 197, 94, 0.2)', color: viaje.esExportacion ? '#fbbf24' : '#4ade80', padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '2px' }}>
          {viaje.esExportacion ? "🇺🇸 EXPORTACIÓN" : "🇲🇽 NACIONAL"}
        </span>
      </div>
    );
  };

  // LÓGICA DE REPORTES
  const viajesFiltradosReportes = viajes.filter(v => {
    const termino = textoBusqueda.toLowerCase();
    const coincideTexto = !termino || ((v.unidad?.toLowerCase().includes(termino)) || (v.chofer?.toLowerCase().includes(termino)) || (v.cliente?.toLowerCase().includes(termino)) || (v.cp?.toLowerCase().includes(termino)) || (v.origen?.toLowerCase().includes(termino)) || (v.destino?.toLowerCase().includes(termino)));
    let coincideFecha = true;
    if (rangoFechas && rangoFechas[0] && rangoFechas[1] && v.fecha) {
      const fechaViaje = dayjs(v.fecha);
      coincideFecha = fechaViaje.isAfter(rangoFechas[0].startOf('day')) && fechaViaje.isBefore(rangoFechas[1].endOf('day'));
    }
    const coincideMovimiento = filtroMovimiento === 'Todos' || v.movimiento === filtroMovimiento;
    const coincideServicio = filtroServicio === 'Todos' || (filtroServicio === 'Exportacion' && v.esExportacion) || (filtroServicio === 'Nacional' && !v.esExportacion);
    return coincideTexto && coincideFecha && coincideMovimiento && coincideServicio;
  });

  // FUNCIÓN PARA EXPORTAR REPORTE GENERAL
  const handleDescargarReporteMasivo = async () => {
    if (viajesFiltradosReportes.length === 0) {
      return message.warning("No hay viajes en la tabla para exportar.");
    }
    
    message.loading({ content: 'Construyendo Excel...', key: 'excelGen' });
    try {
      await generarExcelGeneral(viajesFiltradosReportes);
      message.success({ content: 'Reporte General exportado con éxito', key: 'excelGen' });
    } catch (error) {
      message.error({ content: 'Hubo un error al crear el archivo Excel', key: 'excelGen' });
    }
  };

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#000', color: '#fff', fontFamily: 'sans-serif' }}>
        
        {/* NAVEGACIÓN LATERAL */}
        <div style={{ width: '240px', backgroundColor: '#0a0a0a', borderRight: '1px solid #1a1a1a', padding: '20px 15px' }}>
          <div style={{ color: '#666', fontSize: '13px', fontWeight: 'bold', marginBottom: '40px', paddingLeft: '10px' }}>Bitacora de foraneo</div>
          <nav>
            <div onClick={() => setVistaActual('inicio')} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 15px', cursor: 'pointer', borderRadius: '8px', backgroundColor: vistaActual === 'inicio' ? '#1a1a1a' : 'transparent', fontSize: '18px', marginBottom: '8px' }}><Home size={22} /> Inicio</div>
            <div onClick={() => setVistaActual('historial')} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 15px', cursor: 'pointer', borderRadius: '8px', backgroundColor: vistaActual === 'historial' ? '#1a1a1a' : 'transparent', fontSize: '18px', marginBottom: '8px' }}><History size={22} /> Historial</div>
            <div onClick={() => setVistaActual('reportes')} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 15px', cursor: 'pointer', borderRadius: '8px', backgroundColor: vistaActual === 'reportes' ? '#1a1a1a' : 'transparent', fontSize: '18px', marginBottom: '8px' }}><FileText size={22} /> Reportes</div>
            <div onClick={() => setVistaActual('configuracion')} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 15px', cursor: 'pointer', borderRadius: '8px', backgroundColor: vistaActual === 'configuracion' ? '#1a1a1a' : 'transparent', fontSize: '18px' }}><Settings size={22} /> Configuracion</div>
          </nav>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
          
          {vistaActual === 'inicio' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h1 style={{ fontSize: '75px', margin: '0' }}>{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})}</h1>
                <p style={{ color: '#fff', fontSize: '24px' }}>Registros encontrados</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '25px' }}>
                  <Button type="primary" onClick={() => setMostrarModalBitacora(true)} style={{ backgroundColor: '#007bff', height: '45px', padding: '0 30px', fontWeight: 'bold' }}>Capturar bitacora</Button>
                  <Button type="primary" danger onClick={() => setMostrarModalNuevoViaje(true)} style={{ backgroundColor: '#dc3545', height: '45px', padding: '0 30px', fontWeight: 'bold' }}>Nuevo viaje</Button>
                </div>
              </div>

              <div style={{ display: 'flex', borderBottom: '1px solid #333', marginBottom: '20px', gap: '30px' }}>
                {[{ id: 'viajes', label: 'Viajes activos', icon: <Truck size={16} /> }, { id: 'espera', label: 'Espera de carga', icon: <Clock size={16} /> }, { id: 'yarda', label: 'En yarda', icon: <Warehouse size={16} /> }].map(t => (
                  <span key={t.id} onClick={() => setPestañaActiva(t.id)} style={{ paddingBottom: '10px', cursor: 'pointer', borderBottom: pestañaActiva === t.id ? '2px solid #3b82f6' : 'none', color: pestañaActiva === t.id ? '#3b82f6' : '#666', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {t.icon} {t.label}
                  </span>
                ))}
              </div>

              <div style={{ marginTop: '30px' }}>
                {pestañaActiva === 'viajes' && (
                  <Table dataSource={obtenerDatosTabla()} rowKey="id" size="small" pagination={false} expandable={{ expandedRowRender: (record) => <HistorialViaje viaje={record} /> }} locale={{ emptyText: <Empty description="No hay viajes activos en este momento" /> }}
                    columns={[
                      { title: 'Acciones', width: 170, render: (_, record) => (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <Popconfirm title="¿Enviar a espera?" onConfirm={() => handleMoverAEspera(record.id)} okText="Confirmar" cancelText="Cancelar"><Button size="small" style={{ backgroundColor: '#1677ff', color: 'white', border: 'none' }}>En espera</Button></Popconfirm>
                            <Button danger size="small" onClick={() => { setViajeATerminar(record); setModalTerminarVisible(true); }}>Terminar</Button>
                          </div>
                        )
                      },
                      { title: 'Fecha', dataIndex: 'fecha' }, { title: 'Carta porte', dataIndex: 'cp' }, { title: 'Hora salida', dataIndex: 'hora' },
                      { title: 'Unidad', dataIndex: 'unidad', render: (text, record) => (<div style={{display:'flex', flexDirection:'column', alignItems:'flex-start'}}><span style={{fontWeight:'bold'}}>{text}</span>{renderTagsViaje(record)}</div>) },
                      { title: 'Chofer', dataIndex: 'chofer' }, { title: 'Caja', dataIndex: 'caja' }, { title: 'Origen', dataIndex: 'origen' }, { title: 'Destino', dataIndex: 'destino' }, { title: 'Cliente', dataIndex: 'cliente' }
                    ]}
                  />
                )}
                {pestañaActiva === 'espera' && (
                  <div style={{ marginTop: '30px' }}>
                    <h2 style={{ textAlign: 'center', fontSize: '32px', marginBottom: '30px' }}>Espera de carga</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                      {obtenerDatosTabla().length === 0 ? <div style={{ gridColumn: '1 / -1', textAlign: 'center' }}><Empty description="No hay unidades en espera" /></div> : obtenerDatosTabla().map(v => (
                        <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '15px', background: '#141414', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1 }}>
                            <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{v.unidad}</span>
                            <span style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>Chofer: {v.chofer}</span>
                            <span style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>Destino Ant: {v.destino || 'N/A'}</span>
                            {renderTagsViaje(v)}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <Button type="primary" onClick={() => handleIniciarNuevoTramo(v)} style={{ backgroundColor: '#10b981', borderColor: '#10b981', fontWeight: 'bold' }}>
                              Iniciar nuevo tramo
                            </Button>
                            <Popconfirm title="¿Borrar de espera?" onConfirm={() => handleEliminarEspera(v.id)} okText="Sí, borrar" cancelText="Cancelar" okButtonProps={{ danger: true }}>
                              <Button danger icon={<Trash2 size={16} />} style={{ width: '100%' }}>Remover unidad</Button>
                            </Popconfirm>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {pestañaActiva === 'yarda' && (
                  <div style={{ marginTop: '20px' }}>
                    <h2 style={{ textAlign: 'center', fontSize: '32px', marginBottom: '40px' }}>En Yarda</h2>
                    <Table dataSource={obtenerDatosTabla()} rowKey="id" pagination={false} locale={{ emptyText: <Empty description="No hay unidades registradas en yarda" /> }}
                      columns={[
                        { title: 'Unidad', dataIndex: 'nombre' },
                        { title: 'Estado', dataIndex: 'estado', render: (est) => (<span style={{ color: (est === 'Listo' || !est) ? '#52c41a' : '#f5222d', fontWeight: 'bold' }}>{est || 'Listo'}</span>) },
                        { title: 'Accion', render: (_, record) => (<Button danger={record.estado === 'Listo' || !record.estado} style={{ backgroundColor: (record.estado === 'Listo' || !record.estado) ? '#8b1a1a' : '#1677ff', border: 'none', color: 'white', width: '120px' }} onClick={() => handleAccionDisponibilidad(record)}> {(record.estado === 'Listo' || !record.estado) ? 'Deshabilitar' : 'Habilitar'} </Button>) }
                      ]}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {vistaActual === 'historial' && (
            <div>
              <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Historial de Viajes</h2>
              <Table dataSource={viajes.filter(v => v.estatus === 'finalizado')} rowKey="id" size="small" pagination={{ pageSize: 15 }} expandable={{ expandedRowRender: (record) => <HistorialViaje viaje={record} /> }} locale={{ emptyText: <Empty description="No hay viajes finalizados aún" /> }}
                columns={[
                  { title: 'Fecha', dataIndex: 'fecha' }, { title: 'Carta porte', dataIndex: 'cp' }, { title: 'Hora salida', dataIndex: 'hora' },
                  { title: 'Unidad', dataIndex: 'unidad', render: (text, record) => (<div style={{display:'flex', flexDirection:'column', alignItems:'flex-start'}}><span style={{fontWeight:'bold'}}>{text}</span>{renderTagsViaje(record)}</div>) },
                  { title: 'Chofer', dataIndex: 'chofer' }, { title: 'Caja', dataIndex: 'caja' }, { title: 'Origen', dataIndex: 'origen' }, { title: 'Destino', dataIndex: 'destino' }, { title: 'Cliente', dataIndex: 'cliente' }
                ]}
              />
            </div>
          )}

          {vistaActual === 'reportes' && (
            <div>
              <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Reportes</h2>
              <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', background: '#141414', padding: '15px', borderRadius: '8px', border: '1px solid #333', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}><span style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#bbb' }}>Búsqueda General</span><Input prefix={<Search size={16} color="#666" />} placeholder="Buscar..." value={textoBusqueda} onChange={(e) => setTextoBusqueda(e.target.value)} style={{ background: '#262626', border: '1px solid #444', color: '#fff' }} allowClear /></div>
                <div style={{ width: '250px' }}><span style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#bbb' }}>Rango de Fechas</span><RangePicker style={{ width: '100%' }} value={rangoFechas} onChange={setRangoFechas} getPopupContainer={t => t.parentNode} /></div>
                <div style={{ width: '150px' }}><span style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#bbb' }}>Movimiento</span><Select value={filtroMovimiento} onChange={setFiltroMovimiento} style={{ width: '100%' }} getPopupContainer={t => t.parentNode}><Option value="Todos">Todos</Option><Option value="Salida">Salida</Option><Option value="Regreso">Regreso</Option></Select></div>
                <div style={{ width: '180px' }}><span style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#bbb' }}>Servicio</span><Select value={filtroServicio} onChange={setFiltroServicio} style={{ width: '100%' }} getPopupContainer={t => t.parentNode}><Option value="Todos">Todos</Option><Option value="Nacional">Nacional 🇲🇽</Option><Option value="Exportacion">Exportación 🇺🇸</Option></Select></div>
                
                {/* BOTÓN DE EXPORTAR AL LADO DE LOS FILTROS */}
                <div style={{ display: 'flex', alignItems: 'flex-end', marginLeft: 'auto' }}>
                  <Button 
                    type="primary" 
                    icon={<FileText size={16} />} 
                    onClick={handleDescargarReporteMasivo} 
                    style={{ backgroundColor: '#107c41', borderColor: '#107c41', fontWeight: 'bold', height: '32px' }}
                  >
                    Exportar Reporte General
                  </Button>
                </div>
              </div>
              <Table dataSource={viajesFiltradosReportes} size="small" rowKey="id" pagination={{ pageSize: 15 }} expandable={{ expandedRowRender: (record) => <HistorialViaje viaje={record} /> }} locale={{ emptyText: <Empty description="No se encontraron reportes con esos filtros" /> }}
                columns={[
                  { title: 'Unidad', render: (_, r) => (<div style={{display:'flex', flexDirection:'column', alignItems:'flex-start'}}><span style={{fontWeight:'bold'}}>{r.unidad}</span>{renderTagsViaje(r)}</div>) },
                  { title: 'Salida', dataIndex: 'salida' }, { title: 'Chofer', dataIndex: 'chofer' }, { title: 'Caja', dataIndex: 'caja' }, { title: 'Origen', dataIndex: 'origen' }, { title: 'Destino', dataIndex: 'destino' }, { title: 'Llegada', dataIndex: 'llegada' },
                  { title: 'Acciones', render: (_, record) => (<Button danger size="small" onClick={() => { setViajeActivoRastreo(record); setSelloActual(record.sello || 'Pendiente'); setMostrarModalRastreo(true); }} style={{ fontSize: '11px', backgroundColor: 'rgba(255,0,0,0.1)', border: '1px solid #ff4d4f' }}>Rastreo especial de viaje</Button>) }
                ]}
              />
            </div>
          )}

          {vistaActual === 'configuracion' && (
            <div>
              <h2 style={{ textAlign: 'center', marginBottom: '40px' }}>Configuracion</h2>
              <Collapse ghost expandIconPosition="end">
                <Panel header="Vehiculos" key="1" style={{ borderBottom: '1px solid #222' }}>
                  <div style={{ display: 'flex', gap: '50px', padding: '20px' }}>
                    <div style={{ width: '250px', textAlign: 'center' }}><p>Nombre del vehiculo</p><Input value={nuevoVehiculo} onChange={e => setNuevoVehiculo(e.target.value)} style={{ marginBottom: '15px' }} /><div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}><Button type="primary" onClick={() => handleAgregar('vehiculos')}>{editandoId && tipoEdicion === 'vehiculos' ? 'Guardar Cambios' : 'Agregar'}</Button><Button onClick={cancelarEdicion}>Cancelar</Button></div></div>
                    <div style={{ flex: 1 }}><Table dataSource={unidades} columns={[{ title: 'Vehiculo', dataIndex: 'nombre' }, { title: 'Acciones', render: (_, r) => <div style={{ display: 'flex', gap: '8px' }}><Button style={{ borderColor: '#ffa940', color: '#ffa940' }} size="small" onClick={() => prepararEdicion('vehiculos', r)}>Editar</Button><Button danger size="small" onClick={() => handleEliminar('vehiculos', r.id)}>Eliminar</Button></div> }]} size="small" rowKey="id" /></div>
                  </div>
                </Panel>
                <Panel header="Choferes" key="2" style={{ borderBottom: '1px solid #222' }}>
                  <div style={{ display: 'flex', gap: '50px', padding: '20px' }}>
                    <div style={{ width: '250px', textAlign: 'center' }}><p>Nombre del chofer</p><Input value={nuevoChofer} onChange={e => setNuevoChofer(e.target.value)} style={{ marginBottom: '15px' }} /><div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}><Button type="primary" onClick={() => handleAgregar('choferes')}>{editandoId && tipoEdicion === 'choferes' ? 'Guardar Cambios' : 'Agregar'}</Button><Button onClick={cancelarEdicion}>Cancelar</Button></div></div>
                    <div style={{ flex: 1 }}><Table dataSource={choferes} columns={[{ title: 'Nombre', dataIndex: 'nombre' }, { title: 'Acciones', render: (_, r) => <div style={{ display: 'flex', gap: '8px' }}><Button style={{ borderColor: '#ffa940', color: '#ffa940' }} size="small" onClick={() => prepararEdicion('choferes', r)}>Editar</Button><Button danger size="small" onClick={() => handleEliminar('choferes', r.id)}>Eliminar</Button></div> }]} size="small" rowKey="id" /></div>
                  </div>
                </Panel>
                <Panel header="Clientes" key="3" style={{ borderBottom: '1px solid #222' }}>
                  <div style={{ display: 'flex', gap: '50px', padding: '20px' }}>
                    <div style={{ width: '250px', textAlign: 'center' }}><p>Nombre del Cliente</p><Input value={nuevoCliente} onChange={e => setNuevoCliente(e.target.value)} style={{ marginBottom: '10px' }} /><p>Correo</p><Input value={correoNuevo} onChange={e => setCorreoNuevo(e.target.value)} style={{ marginBottom: '15px' }} /><div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}><Button type="primary" onClick={() => handleAgregar('clientes')}>{editandoId && tipoEdicion === 'clientes' ? 'Guardar Cambios' : 'Agregar'}</Button><Button onClick={cancelarEdicion}>Cancelar</Button></div></div>
                    <div style={{ flex: 1 }}><Table dataSource={clientes} columns={[{ title: 'Nombre', dataIndex: 'nombre' }, { title: 'Correo', dataIndex: 'correo' }, { title: 'Acciones', render: (_, r) => <div style={{ display: 'flex', gap: '8px' }}><Button style={{ borderColor: '#ffa940', color: '#ffa940' }} size="small" onClick={() => prepararEdicion('clientes', r)}>Editar</Button><Button danger size="small" onClick={() => handleEliminar('clientes', r.id)}>Eliminar</Button></div> }]} size="small" rowKey="id" /></div>
                  </div>
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
            setDatosHeredados(null); // <-- Limpiamos la herencia al cerrar
          }} 
          datosHeredados={datosHeredados} // <-- Pasamos los datos al modal
          unidades={unidades} choferes={choferes} clientes={clientes} viajes={viajes} 
          sugerencias={sugerencias} guardarSugerenciaAutomatica={guardarSugerenciaAutomatica} 
          eliminarSugerencia={eliminarSugerencia} 
        />
        <ModalBitacora visible={mostrarModalBitacora} onCancel={() => setMostrarModalBitacora(false)} unidades={unidades} viajes={viajes} clientes={clientes} sugerencias={sugerencias} guardarSugerenciaAutomatica={guardarSugerenciaAutomatica} eliminarSugerencia={eliminarSugerencia} renderTagsViaje={renderTagsViaje} />
        <ModalTerminarViaje visible={modalTerminarVisible} onCancel={() => setModalTerminarVisible(false)} onConfirm={confirmarTerminarViaje} />
        <ModalMotivoDeshabilitar visible={mostrarModalMotivo} onCancel={() => setMostrarModalMotivo(false)} onOk={confirmarDeshabilitar} unidadNombre={unidadAfectada?.nombre} motivo={motivoSeleccionado} setMotivo={setMotivoSeleccionado} />
        <ModalRastreoEspecial visible={mostrarModalRastreo} onCancel={() => setMostrarModalRastreo(false)} viaje={viajeActivoRastreo} puntos={puntosRevision} sugerencias={sugerencias} guardarSugerenciaAutomatica={guardarSugerenciaAutomatica} eliminarSugerencia={eliminarSugerencia} selloActual={selloActual} setSelloActual={setSelloActual} />

      </div>
    </ConfigProvider>
  );
}
  
export default App;