import React, { useState, useEffect } from 'react';
import { Home, History, FileText, Settings, X, Truck, Clock, Warehouse, Trash2 } from 'lucide-react';
import { DatePicker, TimePicker, Select, Button, ConfigProvider, theme, Table, Input, Collapse, Empty, message, Popconfirm, Modal, Radio } from 'antd'; 
import { db } from './firebase';
// SE ACTUALIZARON LAS IMPORTACIONES: Se agregaron query, orderBy y limit
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, orderBy, limit } from 'firebase/firestore';
import emailjs from '@emailjs/browser'; 
import 'antd/dist/reset.css';

const { Option } = Select;
const { Panel } = Collapse;

function App() {
  const [vistaActual, setVistaActual] = useState('inicio');
  const [pestañaActiva, setPestañaActiva] = useState('viajes');
  const [mostrarModalNuevoViaje, setMostrarModalNuevoViaje] = useState(false);
  const [mostrarModalBitacora, setMostrarModalBitacora] = useState(false);
  const [cargandoViaje, setCargandoViaje] = useState(false); 

  const [unidades, setUnidades] = useState([]);
  const [choferes, setChoferes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [viajes, setViajes] = useState([]); 
  const [reportes, setReportes] = useState([]); 

  // --- ESTADOS PARA SUGERENCIAS (REGLA DE ORO: INTEGRIDAD) ---
  const [sugerencias, setSugerencias] = useState({
    estatus: [],
    ubicacion: [],
    velocidad: [],
    lugar: [],
    caja: [],
    origen: [],
    destino: []
  });

  // --- ESTADOS PARA DISPONIBILIDAD (YARDA) ---
  const [mostrarModalMotivo, setMostrarModalMotivo] = useState(false);
  const [unidadAfectada, setUnidadAfectada] = useState(null);
  const [motivoSeleccionado, setMotivoSeleccionado] = useState('Taller');

  const [datosNuevoViaje, setDatosNuevoViaje] = useState({
    fecha: null,
    cp: '',
    hora: null,
    unidad: undefined,
    chofer: undefined,
    caja: '',
    cliente: undefined,
    origen: '',
    destino: '',
    correoEnvio: '' 
  });

  const [unidadesSeleccionadasBitacora, setUnidadesSeleccionadasBitacora] = useState([]);
  const [datosBitacora, setDatosBitacora] = useState({}); 

  // --- ESTADOS INDEPENDIENTES PARA CONFIGURACIÓN ---
  const [nuevoVehiculo, setNuevoVehiculo] = useState('');
  const [nuevoChofer, setNuevoChofer] = useState('');
  const [nuevoCliente, setNuevoCliente] = useState('');
  const [correoNuevo, setCorreoNuevo] = useState('');

  // --- FUNCIÓN PARA CARGAR SUGERENCIAS DESDE FIREBASE ---
  const cargarSugerencias = async () => {
    try {
      const snap = await getDocs(collection(db, "sugerencias_menu"));
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const organizadas = {
        estatus: docs.filter(d => d.categoria === 'estatus'),
        ubicacion: docs.filter(d => d.categoria === 'ubicacion'),
        velocidad: docs.filter(d => d.categoria === 'velocidad'),
        lugar: docs.filter(d => d.categoria === 'lugar'),
        caja: docs.filter(d => d.categoria === 'caja'),
        origen: docs.filter(d => d.categoria === 'origen'),
        destino: docs.filter(d => d.categoria === 'destino')
      };
      setSugerencias(organizadas);
    } catch (e) {
      console.error("Error cargando sugerencias:", e);
    }
  };

  // --- FUNCIÓN PARA GUARDAR NUEVAS PALABRAS AUTOMÁTICAMENTE ---
  const guardarSugerenciaAutomatica = async (categoria, valor) => {
    if (!valor || valor.trim() === '') return;
    const existe = sugerencias[categoria].some(s => s.valor.toLowerCase() === valor.toLowerCase());
    if (!existe) {
      try {
        await addDoc(collection(db, "sugerencias_menu"), {
          categoria,
          valor: valor.trim()
        });
        cargarSugerencias();
      } catch (e) {
        console.error("Error al guardar sugerencia:", e);
      }
    }
  };

  // --- FUNCIÓN PARA ELIMINAR SUGERENCIAS MAL ESCRITAS ---
  const eliminarSugerencia = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, "sugerencias_menu", id));
      cargarSugerencias();
      message.success("Sugerencia eliminada");
    } catch (e) {
      message.error("Error al eliminar");
    }
  };

  // --- FUNCIÓN CARGAR DATOS ---
  const cargarDatos = async () => {
    try {
      const snapU = await getDocs(collection(db, "vehiculos"));
      const listaUnidades = snapU.docs.map(d => ({ id: d.id, ...d.data() }));
      setUnidades(listaUnidades);
      
      const snapCh = await getDocs(collection(db, "choferes"));
      setChoferes(snapCh.docs.map(d => ({ id: d.id, ...d.data() })));
      
      const snapCl = await getDocs(collection(db, "clientes"));
      setClientes(snapCl.docs.map(d => ({ id: d.id, ...d.data() })));

      const qViajes = query(
        collection(db, "viajes"),
        orderBy("fechaCreacion", "desc"), 
        limit(50) 
      );
      const snapV = await getDocs(qViajes);
      setViajes(snapV.docs.map(d => ({ id: d.id, ...d.data() })));

      const qReportes = query(
        collection(db, "reportes"),
        orderBy("fechaEnvio", "desc"),
        limit(100)
      );
      const snapR = await getDocs(qReportes);
      setReportes(snapR.docs.map(d => ({ id: d.id, ...d.data() })));
      
      cargarSugerencias();
    } catch (e) { 
        console.error("Error al cargar datos:", e); 
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  const handleAgregar = async (coleccion) => {
    let objetoNuevo = {};
    
    if (coleccion === 'vehiculos') {
      if (!nuevoVehiculo) return;
      objetoNuevo = { nombre: nuevoVehiculo, estado: 'Listo' };
      await addDoc(collection(db, "vehiculos"), objetoNuevo);
      setNuevoVehiculo('');
    } 
    else if (coleccion === 'choferes') {
      if (!nuevoChofer) return;
      objetoNuevo = { nombre: nuevoChofer };
      await addDoc(collection(db, "choferes"), objetoNuevo);
      setNuevoChofer('');
    } 
    else if (coleccion === 'clientes') {
      if (!nuevoCliente) return;
      objetoNuevo = { nombre: nuevoCliente, correo: correoNuevo };
      await addDoc(collection(db, "clientes"), objetoNuevo);
      setNuevoCliente('');
      setCorreoNuevo('');
    }

    message.success("Registro agregado correctamente");
    cargarDatos();
  };

  const handleEliminar = async (coleccion, id) => {
    if (window.confirm("¿Deseas eliminar este registro?")) {
      await deleteDoc(doc(db, coleccion, id));
      cargarDatos();
    }
  };

  const handleTerminarViaje = async (viajeId) => {
    try {
      const viajeRef = doc(db, "viajes", viajeId);
      await updateDoc(viajeRef, { 
        estatus: 'finalizado',
        fechaFinalizacion: new Date().toISOString() 
      });
      message.success("Viaje finalizado correctamente");
      cargarDatos();
    } catch (e) {
      console.error("Error al terminar viaje:", e);
      message.error("No se pudo finalizar el viaje");
    }
  };

  const handleAccionDisponibilidad = async (record) => {
    if (record.estado === 'Listo' || !record.estado) {
      setUnidadAfectada(record);
      setMostrarModalMotivo(true);
    } else {
      try {
        await updateDoc(doc(db, "vehiculos", record.id), { estado: 'Listo' });
        message.success(`Unidad ${record.nombre} habilitada correctamente`);
        cargarDatos();
      } catch (e) {
        message.error("Error al habilitar unidad");
      }
    }
  };

  const confirmarDeshabilitar = async () => {
    try {
      await updateDoc(doc(db, "vehiculos", unidadAfectada.id), { estado: motivoSeleccionado });
      message.warning(`Unidad ${unidadAfectada.nombre} enviada a: ${motivoSeleccionado}`);
      setMostrarModalMotivo(false);
      cargarDatos();
    } catch (e) {
      message.error("Error al actualizar estado");
    }
  };

  const handleCrearViaje = async () => {
    if (!datosNuevoViaje.unidad || !datosNuevoViaje.chofer || !datosNuevoViaje.cp) {
      return message.warning("Por favor completa los campos obligatorios resaltados");
    }

    const existeCP = viajes.some(v => v.cp === datosNuevoViaje.cp && v.estatus === 'viajes');
    if (existeCP) {
      return message.error("Este número de Carta Porte ya está registrado en un viaje activo.");
    }

    if (datosNuevoViaje.correoEnvio && !/\S+@\S+\.\S+/.test(datosNuevoViaje.correoEnvio)) {
      return message.error("El formato del correo electrónico no es válido");
    }

    setCargandoViaje(true);

    try {
      // AUTOGUARDADO DE MENÚS INTELIGENTES EN NUEVO VIAJE
      await guardarSugerenciaAutomatica('caja', datosNuevoViaje.caja);
      await guardarSugerenciaAutomatica('origen', datosNuevoViaje.origen);
      await guardarSugerenciaAutomatica('destino', datosNuevoViaje.destino);

      const nuevoRegistro = {
        ...datosNuevoViaje,
        fecha: datosNuevoViaje.fecha ? datosNuevoViaje.fecha.format('YYYY-MM-DD') : '',
        hora: datosNuevoViaje.hora ? datosNuevoViaje.hora.format('HH:mm') : '',
        estatus: 'viajes',
        fechaCreacion: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, "viajes"), nuevoRegistro);

      if (datosNuevoViaje.correoEnvio) {
        const templateParams = {
          para_correo: datosNuevoViaje.correoEnvio, 
          unidad: datosNuevoViaje.unidad,
          cp: datosNuevoViaje.cp,
          chofer: datosNuevoViaje.chofer,
          origen: datosNuevoViaje.origen,
          destino: datosNuevoViaje.destino,
          cliente: datosNuevoViaje.cliente,
          fecha_salida: nuevoRegistro.fecha,
          hora_salida: nuevoRegistro.hora
        };

        await emailjs.send(
          process.env.REACT_APP_EMAILJS_SERVICE_ID, 
          process.env.REACT_APP_EMAILJS_TEMPLATE_ID, 
          templateParams, 
          process.env.REACT_APP_EMAILJS_PUBLIC_KEY
        );
        
        await addDoc(collection(db, "logs_envios"), {
          viajeId: docRef.id,
          destinatario: datosNuevoViaje.correoEnvio,
          unidad: datosNuevoViaje.unidad,
          fechaEnvio: new Date().toISOString(),
          tipo: 'Creación de Viaje'
        });

        message.info("Correo de notificación enviado y registrado");
      }

      message.success("Viaje creado con éxito");
      setMostrarModalNuevoViaje(false);
      
      setDatosNuevoViaje({
        fecha: null, cp: '', hora: null, unidad: undefined, 
        chofer: undefined, caja: '', cliente: undefined, 
        origen: '', destino: '', correoEnvio: ''
      });
      
      cargarDatos();
    } catch (e) {
      console.error("Error general:", e);
      message.error("Hubo un problema al procesar el viaje");
    } finally {
      setCargandoViaje(false);
    }
  };

  const handleEnviarBitacora = async (unidadNombre) => {
    const info = datosBitacora[unidadNombre];
    
    if (!info?.correoEnvio) {
      return message.warning("Por favor ingresa un correo de destino");
    }

    try {
      // AUTOGUARDADO DE MENÚS INTELIGENTES EN BITÁCORA
      await guardarSugerenciaAutomatica('estatus', info.estatus);
      await guardarSugerenciaAutomatica('ubicacion', info.ubicacion);
      await guardarSugerenciaAutomatica('velocidad', info.velocidad);
      await guardarSugerenciaAutomatica('lugar', info.lugar);

      const reporteParaFirebase = {
        unidad: unidadNombre,
        ...info,
        link: info.link || 'No proporcionado',
        fechaEnvio: new Date().toISOString(),
      };
      
      await addDoc(collection(db, "reportes_bitacora"), reporteParaFirebase);

      const templateParams = {
        para_correo: info.correoEnvio,
        unidad: unidadNombre,
        estatus: info.estatus || 'N/A',
        ubicacion: info.ubicacion || 'N/A',
        velocidad: info.velocidad || 'N/A',
        cliente: info.cliente || 'N/A',
        lugar: info.lugar || 'N/A',
        link: info.link || 'Sin enlace'
      };

      await emailjs.send(
        process.env.REACT_APP_EMAILJS_SERVICE_ID,
        process.env.REACT_APP_EMAILJS_TEMPLATE_ID,
        templateParams,
        process.env.REACT_APP_EMAILJS_PUBLIC_KEY
      );
      
      await addDoc(collection(db, "logs_envios"), {
        unidad: unidadNombre,
        destinatario: info.correoEnvio,
        fechaEnvio: new Date().toISOString(),
        tipo: 'Reporte de Bitácora'
      });

      message.success(`Reporte de ${unidadNombre} enviado y guardado con éxito`);
    } catch (e) {
      console.error("Error detallado al procesar el envío:", e);
      message.error("Error al procesar el envío.");
    }
  };

  const obtenerDatosTabla = () => {
    if (pestañaActiva === 'yarda') {
        return unidades; 
    }
    return viajes.filter(v => v.estatus === pestañaActiva);
  };

  const handleInputBitacora = (unidadId, campo, valor) => {
    setDatosBitacora(prev => ({
      ...prev,
      [unidadId]: {
        ...prev[unidadId],
        [campo]: valor
      }
    }));
  };

  // --- COMPONENTE DE SELECT INTELIGENTE (REUTILIZABLE) ---
  const SelectInteligente = ({ categoria, value, onChange, placeholder }) => (
    <Select
      mode="tags"
      style={{ flex: 1 }}
      placeholder={placeholder}
      value={value ? [value] : []}
      onChange={(vals) => onChange(vals[vals.length - 1] || '')}
      getPopupContainer={(trigger) => trigger.parentNode}
    >
      {sugerencias[categoria].map(s => (
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

  const columnasReportes = [
    { title: 'Unidad', dataIndex: 'unidad', key: 'unidad' },
    { title: 'Salida', dataIndex: 'salida', key: 'salida' },
    { title: 'Chofer', dataIndex: 'chofer', key: 'chofer' },
    { title: 'Caja', dataIndex: 'caja', key: 'caja' },
    { title: 'Origen', dataIndex: 'origen', key: 'origen' },
    { title: 'Destino', dataIndex: 'destino', key: 'destino' },
    { title: 'Llegada', dataIndex: 'llegada', key: 'llegada' },
    { 
      title: 'Acciones', 
      key: 'acciones',
      render: () => (
        <Button danger size="small" style={{ fontSize: '11px', backgroundColor: 'rgba(255,0,0,0.1)', border: '1px solid #ff4d4f' }}>
          Rastreo especial de viaje
        </Button>
      ) 
    },
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#000', color: '#fff', fontFamily: 'sans-serif' }}>
        
        <div style={{ width: '240px', backgroundColor: '#0a0a0a', borderRight: '1px solid #1a1a1a', padding: '20px 15px' }}>
          <div style={{ color: '#666', fontSize: '13px', fontWeight: 'bold', marginBottom: '40px', paddingLeft: '10px' }}>Bitacora de foraneo</div>
          <nav>
            <div onClick={() => setVistaActual('inicio')} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 15px', cursor: 'pointer', borderRadius: '8px', backgroundColor: vistaActual === 'inicio' ? '#1a1a1a' : 'transparent', fontSize: '18px', marginBottom: '8px' }}><Home size={22} /> Inicio</div>
            <div onClick={() => setVistaActual('historial')} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 15px', cursor: 'pointer', borderRadius: '8px', backgroundColor: vistaActual === 'historial' ? '#1a1a1a' : 'transparent', fontSize: '18px', marginBottom: '8px' }}><History size={22} /> Historial</div>
            <div onClick={() => setVistaActual('reportes')} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 15px', cursor: 'pointer', borderRadius: '8px', backgroundColor: vistaActual === 'reportes' ? '#1a1a1a' : 'transparent', fontSize: '18px', marginBottom: '8px' }}><FileText size={22} /> Reportes</div>
            <div onClick={() => setVistaActual('configuracion')} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 15px', cursor: 'pointer', borderRadius: '8px', backgroundColor: vistaActual === 'configuracion' ? '#1a1a1a' : 'transparent', fontSize: '18px' }}><Settings size={22} /> Configuracion</div>
          </nav>
        </div>

        <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
          
          {vistaActual === 'inicio' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h1 style={{ fontSize: '75px', margin: '0' }}>{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})}</h1>
                <p style={{ color: '#fff', fontSize: '24px' }}>
                    {obtenerDatosTabla().length === 0 
                    ? `Ningun registro capturado entre las ${new Date().getHours()}:00 y las ${new Date().getHours()}:59` 
                    : 'Registros encontrados'}
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '25px' }}>
                  <Button type="primary" onClick={() => setMostrarModalBitacora(true)} style={{ backgroundColor: '#007bff', height: '45px', padding: '0 30px', fontWeight: 'bold' }}>Capturar bitacora</Button>
                  <Button type="primary" danger onClick={() => setMostrarModalNuevoViaje(true)} style={{ backgroundColor: '#dc3545', height: '45px', padding: '0 30px', fontWeight: 'bold' }}>Nuevo viaje</Button>
                </div>
              </div>

              <div style={{ display: 'flex', borderBottom: '1px solid #333', marginBottom: '20px', gap: '30px' }}>
                {[
                  { id: 'viajes', label: 'Viajes activos', icon: <Truck size={16} /> },
                  { id: 'espera', label: 'Espera de carga', icon: <Clock size={16} /> },
                  { id: 'yarda', label: 'En yarda', icon: <Warehouse size={16} /> }
                ].map(t => (
                  <span key={t.id} onClick={() => setPestañaActiva(t.id)} style={{ paddingBottom: '10px', cursor: 'pointer', borderBottom: pestañaActiva === t.id ? '2px solid #3b82f6' : 'none', color: pestañaActiva === t.id ? '#3b82f6' : '#666', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {t.icon} {t.label}
                  </span>
                ))}
              </div>

              <div style={{ marginTop: '30px' }}>
                {pestañaActiva === 'viajes' && (
                  <Table 
                    dataSource={obtenerDatosTabla()} 
                    columns={[
                      { 
                        title: 'Acciones', 
                        render: (_, record) => (
                          <Popconfirm
                            title="¿Finalizar viaje?"
                            description="¿Estás seguro de que este viaje ha terminado?"
                            onConfirm={() => handleTerminarViaje(record.id)}
                            okText="Sí, terminar"
                            cancelText="No"
                            okButtonProps={{ danger: true }}
                          >
                            <Button danger size="small">
                              Terminar
                            </Button>
                          </Popconfirm>
                        ) 
                      },
                      { title: 'Fecha', dataIndex: 'fecha' }, 
                      { title: 'Carta porte', dataIndex: 'cp' }, 
                      { title: 'Hora salida', dataIndex: 'hora' },
                      { title: 'Unidad', dataIndex: 'unidad' }, 
                      { title: 'Chofer', dataIndex: 'chofer' }, 
                      { title: 'Caja', dataIndex: 'caja' },
                      { title: 'Origen', dataIndex: 'origen' }, 
                      { title: 'Destino', dataIndex: 'destino' }, 
                      { title: 'Cliente', dataIndex: 'cliente' }
                    ]}
                    size="small" 
                    pagination={false}
                    locale={{ emptyText: <Empty description="No hay viajes activos en este momento" /> }}
                  />
                )}

                {pestañaActiva === 'espera' && (
                  <div style={{ textAlign: 'center', marginTop: '50px' }}>
                    <h2 style={{ fontSize: '32px', marginBottom: '30px' }}>Espera de carga</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', fontSize: '28px', fontWeight: 'bold' }}>
                      {obtenerDatosTabla().length === 0 ? (
                         <Empty description="No hay unidades en espera" />
                      ) : (
                        obtenerDatosTabla().map(v => <div key={v.id}>{v.unidad}</div>)
                      )}
                    </div>
                  </div>
                )}

                {pestañaActiva === 'yarda' && (
                  <div style={{ marginTop: '20px' }}>
                    <h2 style={{ textAlign: 'center', fontSize: '32px', marginBottom: '40px' }}>En Yarda</h2>
                    <Table 
                      dataSource={obtenerDatosTabla()} 
                      rowKey="id"
                      columns={[
                        { title: 'Unidad', dataIndex: 'nombre', key: 'nombre' }, 
                        { 
                          title: 'Estado', 
                          dataIndex: 'estado', 
                          key: 'estado',
                          render: (est) => (
                            <span style={{ color: (est === 'Listo' || !est) ? '#52c41a' : '#f5222d', fontWeight: 'bold' }}>
                              {est || 'Listo'}
                            </span>
                          )
                        },
                        { 
                          title: 'Accion', 
                          render: (_, record) => (
                            <Button 
                              danger={record.estado === 'Listo' || !record.estado}
                              style={{
                                backgroundColor: (record.estado === 'Listo' || !record.estado) ? '#8b1a1a' : '#1677ff', 
                                border: 'none',
                                color: 'white',
                                width: '120px'
                              }}
                              onClick={() => handleAccionDisponibilidad(record)}
                            >
                              {(record.estado === 'Listo' || !record.estado) ? 'Deshabilitar' : 'Habilitar'}
                            </Button>
                          ) 
                        }
                      ]}
                      pagination={false}
                      locale={{ emptyText: <Empty description="No hay unidades registradas en yarda" /> }}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* ----- PASO 1: APLICACIÓN DE LA VISTA HISTORIAL ----- */}
          {vistaActual === 'historial' && (
            <div>
              <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Historial de Viajes</h2>
              <Table 
                dataSource={viajes.filter(v => v.estatus === 'finalizado')} 
                rowKey="id"
                columns={[
                  { title: 'Fecha', dataIndex: 'fecha' }, 
                  { title: 'Carta porte', dataIndex: 'cp' }, 
                  { title: 'Hora salida', dataIndex: 'hora' },
                  { title: 'Unidad', dataIndex: 'unidad' }, 
                  { title: 'Chofer', dataIndex: 'chofer' }, 
                  { title: 'Caja', dataIndex: 'caja' },
                  { title: 'Origen', dataIndex: 'origen' }, 
                  { title: 'Destino', dataIndex: 'destino' }, 
                  { title: 'Cliente', dataIndex: 'cliente' }
                ]}
                size="small"
                pagination={{ pageSize: 15 }}
                locale={{ emptyText: <Empty description="No hay viajes finalizados aún" /> }}
              />
            </div>
          )}
          {/* ---------------------------------------------------- */}

          {vistaActual === 'reportes' && (
            <div>
              <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Reportes</h2>
              <Table 
                dataSource={reportes} 
                columns={columnasReportes} 
                size="small"
                rowKey="id"
                pagination={{ pageSize: 10 }}
                locale={{ emptyText: <Empty description="No hay datos de reportes disponibles" /> }}
              />
            </div>
          )}

          {vistaActual === 'configuracion' && (
            <div>
              <h2 style={{ textAlign: 'center', marginBottom: '40px' }}>Configuracion</h2>
              <Collapse ghost expandIconPosition="end">
                <Panel header="Vehiculos" key="1" style={{ borderBottom: '1px solid #222' }}>
                  <div style={{ display: 'flex', gap: '50px', padding: '20px' }}>
                    <div style={{ width: '250px', textAlign: 'center' }}>
                      <p>Nombre del vehiculo</p>
                      <Input value={nuevoVehiculo} onChange={e => setNuevoVehiculo(e.target.value)} style={{ marginBottom: '15px' }} />
                      <Button type="primary" onClick={() => handleAgregar('vehiculos')}>Agregar</Button>
                    </div>
                    <div style={{ flex: 1 }}><Table dataSource={unidades} columns={[{ title: 'Vehiculo', dataIndex: 'nombre' }, { title: 'Acciones', render: (_, r) => <Button danger size="small" onClick={() => handleEliminar('vehiculos', r.id)}>Eliminar</Button> }]} size="small" rowKey="id" /></div>
                  </div>
                </Panel>
                <Panel header="Choferes" key="2" style={{ borderBottom: '1px solid #222' }}>
                  <div style={{ display: 'flex', gap: '50px', padding: '20px' }}>
                    <div style={{ width: '250px', textAlign: 'center' }}>
                      <p>Nombre del chofer</p>
                      <Input value={nuevoChofer} onChange={e => setNuevoChofer(e.target.value)} style={{ marginBottom: '15px' }} />
                      <Button type="primary" onClick={() => handleAgregar('choferes')}>Agregar</Button>
                    </div>
                    <div style={{ flex: 1 }}><Table dataSource={choferes} columns={[{ title: 'Nombre', dataIndex: 'nombre' }, { title: 'Acciones', render: (_, r) => <Button danger size="small" onClick={() => handleEliminar('choferes', r.id)}>Eliminar</Button> }]} size="small" rowKey="id" /></div>
                  </div>
                </Panel>
                <Panel header="Clientes" key="3" style={{ borderBottom: '1px solid #222' }}>
                  <div style={{ display: 'flex', gap: '50px', padding: '20px' }}>
                    <div style={{ width: '250px', textAlign: 'center' }}>
                      <p>Nombre del Cliente</p>
                      <Input value={nuevoCliente} onChange={e => setNuevoCliente(e.target.value)} style={{ marginBottom: '10px' }} />
                      <p>Correo</p>
                      <Input value={correoNuevo} onChange={e => setCorreoNuevo(e.target.value)} style={{ marginBottom: '15px' }} />
                      <Button type="primary" onClick={() => handleAgregar('clientes')}>Agregar</Button>
                    </div>
                    <div style={{ flex: 1 }}><Table dataSource={clientes} columns={[{ title: 'Nombre', dataIndex: 'nombre' }, { title: 'Correo', dataIndex: 'correo' }, { title: 'Acciones', render: (_, r) => <Button danger size="small" onClick={() => handleEliminar('clientes', r.id)}>Eliminar</Button> }]} size="small" rowKey="id" /></div>
                  </div>
                </Panel>
              </Collapse>
            </div>
          )}

          {mostrarModalNuevoViaje && (
            <div id="area-modal-nuevo-viaje" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
              <div style={{ width: '500px', backgroundColor: '#1a1a1a', borderRadius: '8px', border: '1px solid #333', padding: '30px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px', alignItems: 'center' }}>
                  <span style={{ fontSize: '18px', fontWeight: 'bold' }}>Nuevo viaje</span>
                  <X onClick={() => setMostrarModalNuevoViaje(false)} style={{ cursor: 'pointer', color: '#888' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}><label style={{ width: '120px' }}>Fecha :</label>
                    <DatePicker 
                      status={!datosNuevoViaje.fecha && "error"}
                      value={datosNuevoViaje.fecha} 
                      onChange={(val) => setDatosNuevoViaje({...datosNuevoViaje, fecha: val})} 
                      style={{ flex: 1 }} 
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
                  <div style={{ display: 'flex', alignItems: 'center' }}><label style={{ width: '120px' }}>Hora de salida :</label>
                    <TimePicker 
                      status={!datosNuevoViaje.hora && "error"}
                      value={datosNuevoViaje.hora} 
                      onChange={(val) => setDatosNuevoViaje({...datosNuevoViaje, hora: val})} 
                      format="HH:mm" 
                      style={{ flex: 1 }} 
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}><label style={{ width: '120px' }}>Unidad :</label>
                    <Select 
                      status={!datosNuevoViaje.unidad && "error"}
                      showSearch 
                      style={{ flex: 1 }} 
                      placeholder="Selecciona unidad" 
                      value={datosNuevoViaje.unidad} 
                      onChange={(val) => setDatosNuevoViaje({...datosNuevoViaje, unidad: val})} 
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
                    >
                      {choferes.map(ch => <Option key={ch.id} value={ch.nombre}>{ch.nombre}</Option>)}
                    </Select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}><label style={{ width: '120px' }}>Caja :</label>
                    <SelectInteligente categoria="caja" value={datosNuevoViaje.caja} onChange={(val) => setDatosNuevoViaje({...datosNuevoViaje, caja: val})} placeholder="Escribe o selecciona caja" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}><label style={{ width: '120px' }}>Cliente :</label>
                    <Select showSearch style={{ flex: 1 }} placeholder="Selecciona cliente" value={datosNuevoViaje.cliente} onChange={(val) => setDatosNuevoViaje({...datosNuevoViaje, cliente: val})} >
                      {clientes.map(cl => <Option key={cl.id} value={cl.nombre}>{cl.nombre}</Option>)}
                    </Select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}><label style={{ width: '120px' }}>Origen :</label>
                    <SelectInteligente categoria="origen" value={datosNuevoViaje.origen} onChange={(val) => setDatosNuevoViaje({...datosNuevoViaje, origen: val})} placeholder="Escribe o selecciona origen" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}><label style={{ width: '120px' }}>Destino :</label>
                    <SelectInteligente categoria="destino" value={datosNuevoViaje.destino} onChange={(val) => setDatosNuevoViaje({...datosNuevoViaje, destino: val})} placeholder="Escribe o selecciona destino" />
                  </div>

                  <div style={{ marginTop: '10px', padding: '15px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '6px', border: '1px solid #3b82f6' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#3b82f6', fontWeight: 'bold' }}>Enviar reporte a:</label>
                    <Input 
                      placeholder="Correo del destinatario (opcional)" 
                      value={datosNuevoViaje.correoEnvio} 
                      onChange={(e) => setDatosNuevoViaje({...datosNuevoViaje, correoEnvio: e.target.value})}
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #3b82f6' }} 
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                    <Button onClick={() => setMostrarModalNuevoViaje(false)} disabled={cargandoViaje} style={{ background: '#262626', color: '#fff' }}>Cancelar</Button>
                    <Button type="primary" onClick={handleCrearViaje} loading={cargandoViaje}>Crear viaje</Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {mostrarModalBitacora && (
            <div id="area-modal-bitacora" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 2000, padding: '40px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
                  <h2 style={{ margin: 0 }}>Capturar Bitacora</h2>
                  <Select 
                    mode="multiple" 
                    placeholder="Busca y selecciona las unidades..." 
                    style={{ width: '500px' }} 
                    value={unidadesSeleccionadasBitacora}
                    onChange={(values) => setUnidadesSeleccionadasBitacora(values)} 
                    allowClear 
                    showSearch
                  >
                    {unidades.map(u => <Option key={u.id} value={u.nombre}>{u.nombre}</Option>)}
                  </Select>
                </div>
                <X onClick={() => { setMostrarModalBitacora(false); setUnidadesSeleccionadasBitacora([]); setDatosBitacora({}); }} style={{ cursor: 'pointer' }} />
              </div>
              {unidadesSeleccionadasBitacora.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 450px))', gap: '25px' }}>
                  {unidadesSeleccionadasBitacora.map(nombreUnidad => (
                    <div key={nombreUnidad} style={{ background: '#1a1a1a', borderRadius: '4px', border: '1px solid #333' }}>
                      <div style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #333', fontWeight: 'bold', color: '#3b82f6' }}>{nombreUnidad}</div>
                      <div style={{ padding: '25px', background: '#164e63', margin: '15px', borderRadius: '4px' }}>
                        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center' }}><label style={{ width: '100px' }}>Estatus :</label>
                          <SelectInteligente categoria="estatus" value={datosBitacora[nombreUnidad]?.estatus} onChange={val => handleInputBitacora(nombreUnidad, 'estatus', val)} placeholder="Estatus" />
                        </div>
                        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center' }}><label style={{ width: '100px' }}>Ubicacion :</label>
                          <SelectInteligente categoria="ubicacion" value={datosBitacora[nombreUnidad]?.ubicacion} onChange={val => handleInputBitacora(nombreUnidad, 'ubicacion', val)} placeholder="Ubicación" />
                        </div>
                        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center' }}><label style={{ width: '100px' }}>Velocidad :</label>
                          <SelectInteligente categoria="velocidad" value={datosBitacora[nombreUnidad]?.velocidad} onChange={val => handleInputBitacora(nombreUnidad, 'velocidad', val)} placeholder="Velocidad" />
                        </div>
                        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center' }}><label style={{ width: '100px' }}>Cliente :</label>
                          <Select placeholder="Seleccionar" style={{ flex: 1 }} value={datosBitacora[nombreUnidad]?.cliente} onChange={val => handleInputBitacora(nombreUnidad, 'cliente', val)} >
                              {clientes.map(cl => <Option key={cl.id} value={cl.nombre}>{cl.nombre}</Option>)}
                          </Select>
                        </div>
                        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center' }}><label style={{ width: '100px' }}>Lugar :</label>
                          <SelectInteligente categoria="lugar" value={datosBitacora[nombreUnidad]?.lugar} onChange={val => handleInputBitacora(nombreUnidad, 'lugar', val)} placeholder="Lugar" />
                        </div>
                        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center' }}><label style={{ width: '100px' }}>Link :</label><Input value={datosBitacora[nombreUnidad]?.link || ''} onChange={e => handleInputBitacora(nombreUnidad, 'link', e.target.value)} style={{ flex: 1, background: 'rgba(0,0,0,0.2)' }} /></div>
                        <div style={{ marginBottom: '15px', padding: '10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#ddd' }}>Enviar reporte a:</label>
                            <Input placeholder="Correo del destinatario" value={datosBitacora[nombreUnidad]?.correoEnvio || ''} onChange={e => handleInputBitacora(nombreUnidad, 'correoEnvio', e.target.value)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid #3b82f6' }} />
                        </div>
                        <Button type="primary" block style={{ height: '40px', fontWeight: 'bold' }} onClick={() => handleEnviarBitacora(nombreUnidad)}>Enviar y Guardar reporte</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <Modal
            title={`Deshabilitar Unidad: ${unidadAfectada?.nombre}`}
            open={mostrarModalMotivo}
            onOk={confirmarDeshabilitar}
            onCancel={() => setMostrarModalMotivo(false)}
            okText="Confirmar"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
            getPopupContainer={() => document.body}
          >
            <div style={{ padding: '20px 0' }}>
              <p style={{ marginBottom: '10px', fontWeight: 'bold' }}>Selecciona el motivo del resguardo:</p>
              <Radio.Group onChange={(e) => setMotivoSeleccionado(e.target.value)} value={motivoSeleccionado}>
                <Radio value="Taller" style={{ display: 'block', marginBottom: '8px' }}>Taller</Radio>
                <Radio value="Incidente" style={{ display: 'block', marginBottom: '8px' }}>Incidente</Radio>
                <Radio value="Corralon" style={{ display: 'block', marginBottom: '8px' }}>Corralon</Radio>
                <Radio value="Baja Temporal" style={{ display: 'block', marginBottom: '8px' }}>Baja Temporal</Radio>
              </Radio.Group>
            </div>
          </Modal>

        </div>
      </div>
    </ConfigProvider>
  );
}

export default App;