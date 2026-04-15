import React, { useState, useEffect } from 'react';
import { Home, History, FileText, Settings, X, Truck, Clock, Warehouse, Trash2, Download, Search, Edit3, Check } from 'lucide-react';
import { DatePicker, TimePicker, Select, Button, ConfigProvider, theme, Table, Input, Collapse, Empty, message, Popconfirm, Modal, Radio, Alert, Checkbox, Space } from 'antd'; 
import { db } from './firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import dayjs from 'dayjs'; // Importante para la edición de fechas
import 'antd/dist/reset.css';

const { Option } = Select;
const { Panel } = Collapse;

// FUNCIÓN ACTUALIZADA: ENVÍA LOS DATOS DIRECTO A LA API DE VERCEL
const enviarConBrevo = async (destinatarios, asunto, contenidoHtml) => {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: destinatarios, // Nodemailer acepta directamente el string separado por comas
        subject: asunto,
        html: contenidoHtml
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error en el envío con el servidor');
    }
  } catch (error) {
    console.error("Error conectando al servidor:", error);
    throw error;
  }
};

// NUEVO COMPONENTE: LÍNEA DE TIEMPO EXPANDIBLE CON EDICIÓN (VISUALIDAD CORREGIDA)
const HistorialViaje = ({ viaje }) => {
  const [puntos, setPuntos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editandoTiempo, setEditandoTiempo] = useState(null); // 'inicio' o 'fin'
  const [nuevoValor, setNuevoValor] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "viajes", viaje.id, "puntos_revision"), orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setPuntos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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

  const [bannerBitacora, setBannerBitacora] = useState({ visible: false, mensaje: '', tipo: 'success' });

  // ESTADOS PARA MODO EDICIÓN
  const [editandoId, setEditandoId] = useState(null);
  const [tipoEdicion, setTipoEdicion] = useState(null);

  const [sugerencias, setSugerencias] = useState({
    estatus: [],
    ubicacion: [],
    velocidad: [],
    lugar: [],
    caja: [],
    origen: [],
    destino: []
  });

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
    correoEnvio: '',
    enviarACliente: true,
    sello: ''
  });

  const [unidadesSeleccionadasBitacora, setUnidadesSeleccionadasBitacora] = useState([]);
  const [datosBitacora, setDatosBitacora] = useState({}); 

  const [nuevoVehiculo, setNuevoVehiculo] = useState('');
  const [nuevoChofer, setNuevoChofer] = useState('');
  const [nuevoCliente, setNuevoCliente] = useState('');
  const [correoNuevo, setCorreoNuevo] = useState('');

  // ESTADOS PARA RASTREO ESPECIAL
  const [mostrarModalRastreo, setMostrarModalRastreo] = useState(false);
  const [viajeActivoRastreo, setViajeActivoRastreo] = useState(null);
  const [puntosRevision, setPuntosRevision] = useState([]);
  const [selloActual, setSelloActual] = useState('');
  const [datosNuevoPunto, setDatosNuevoPunto] = useState({
    fecha: null,
    hora: null,
    ubicacion: '',
    estatus: '',
    observaciones: ''
  });

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

  useEffect(() => {
    cargarSugerencias();

    const unsubVehiculos = onSnapshot(collection(db, "vehiculos"), (snap) => {
      setUnidades(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => console.error("Error unidades en tiempo real:", error));

    const unsubChoferes = onSnapshot(collection(db, "choferes"), (snap) => {
      setChoferes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => console.error("Error choferes en tiempo real:", error));

    const unsubClientes = onSnapshot(collection(db, "clientes"), (snap) => {
      setClientes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => console.error("Error clientes en tiempo real:", error));

    const qViajes = query(collection(db, "viajes"), orderBy("fechaCreacion", "desc"), limit(50));
    const unsubViajes = onSnapshot(qViajes, (snap) => {
      setViajes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => console.error("Error viajes en tiempo real:", error));

    const qReportes = query(collection(db, "reportes"), orderBy("fechaEnvio", "desc"), limit(100));
    const unsubReportes = onSnapshot(qReportes, (snap) => {
      setReportes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => console.error("Error reportes en tiempo real:", error));

    return () => {
      unsubVehiculos();
      unsubChoferes();
      unsubClientes();
      unsubViajes();
      unsubReportes();
    };
  }, []); 

  // EFFECT PARA CARGAR LOS PUNTOS DE RASTREO EN TIEMPO REAL
  useEffect(() => {
    if (!viajeActivoRastreo || !viajeActivoRastreo.id) return;
    const qPuntos = query(collection(db, "viajes", viajeActivoRastreo.id, "puntos_revision"), orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(qPuntos, (snap) => {
      setPuntosRevision(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [viajeActivoRastreo]);

  const prepararEdicion = (coleccion, record) => {
    setEditandoId(record.id);
    setTipoEdicion(coleccion);
    if (coleccion === 'vehiculos') setNuevoVehiculo(record.nombre);
    if (coleccion === 'choferes') setNuevoChofer(record.nombre);
    if (coleccion === 'clientes') {
      setNuevoCliente(record.nombre);
      setCorreoNuevo(record.correo || '');
    }
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setTipoEdicion(null);
    setNuevoVehiculo('');
    setNuevoChofer('');
    setNuevoCliente('');
    setCorreoNuevo('');
  };

  const handleAgregar = async (coleccion) => {
    let objetoNuevo = {};
    
    try {
      if (coleccion === 'vehiculos') {
        if (!nuevoVehiculo) return;
        objetoNuevo = { nombre: nuevoVehiculo };
        if (editandoId && tipoEdicion === 'vehiculos') {
          await updateDoc(doc(db, "vehiculos", editandoId), objetoNuevo);
          message.success("Vehículo actualizado");
        } else {
          await addDoc(collection(db, "vehiculos"), { ...objetoNuevo, estado: 'Listo' });
          message.success("Vehículo agregado");
        }
        setNuevoVehiculo('');
      } 
      else if (coleccion === 'choferes') {
        if (!nuevoChofer) return;
        objetoNuevo = { nombre: nuevoChofer };
        if (editandoId && tipoEdicion === 'choferes') {
          await updateDoc(doc(db, "choferes", editandoId), objetoNuevo);
          message.success("Chofer actualizado");
        } else {
          await addDoc(collection(db, "choferes"), objetoNuevo);
          message.success("Chofer agregado");
        }
        setNuevoChofer('');
      } 
      else if (coleccion === 'clientes') {
        if (!nuevoCliente) return;
        objetoNuevo = { nombre: nuevoCliente, correo: correoNuevo };
        if (editandoId && tipoEdicion === 'clientes') {
          await updateDoc(doc(db, "clientes", editandoId), objetoNuevo);
          message.success("Cliente actualizado");
        } else {
          await addDoc(collection(db, "clientes"), objetoNuevo);
          message.success("Cliente agregado");
        }
        setNuevoCliente('');
        setCorreoNuevo('');
      }
      setEditandoId(null);
      setTipoEdicion(null);
    } catch (e) {
      console.error("Error en handleAgregar/Editar:", e);
      message.error("Error al procesar la solicitud");
    }
  };

  const handleEliminar = async (coleccion, id) => {
    if (window.confirm("¿Deseas eliminar este registro?")) {
      await deleteDoc(doc(db, coleccion, id));
    }
  };

  const handleTerminarViaje = async (viajeId) => {
    try {
      const viajeRef = doc(db, "viajes", viajeId);
      await updateDoc(viajeRef, { 
        estatus: 'finalizado',
        fechaFinalizacion: new Date().toISOString(),
        fechaFinExacta: new Date().toISOString() // NUEVO: MARCA DE FIN
      });

      const viajeTerminado = viajes.find(v => v.id === viajeId);
      if (viajeTerminado) {
        const registroEnEspera = viajes.find(v => v.unidad === viajeTerminado.unidad && v.estatus === 'espera');
        if (registroEnEspera) {
          await deleteDoc(doc(db, "viajes", registroEnEspera.id));
        }
      }

      message.success("Viaje finalizado correctamente");
    } catch (e) {
      console.error("Error al terminar viaje:", e);
      message.error("No se pudo finalizar el viaje");
    }
  };

  const handleEliminarEspera = async (id) => {
    try {
      await deleteDoc(doc(db, "viajes", id));
      message.success("Unidad removida de espera correctamente");
    } catch (e) {
      console.error("Error al eliminar de espera:", e);
      message.error("No se pudo remover la unidad");
    }
  };

  const handleMoverAEspera = async (viajeId) => {
    try {
      const viajeRef = doc(db, "viajes", viajeId);
      await updateDoc(viajeRef, { 
        estatus: 'espera',
        fechaFinalizacion: new Date().toISOString() 
      });
      message.success("Viaje enviado a espera de carga");
    } catch (e) {
      console.error("Error al enviar viaje a espera:", e);
      message.error("No se pudo actualizar el viaje");
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
    } catch (e) {
      message.error("Error al actualizar estado");
    }
  };

  const handleCrearViaje = async () => {
    // MODIFICADO: Ya no exige el número de Carta Porte (cp) para avanzar
    if (!datosNuevoViaje.unidad || !datosNuevoViaje.chofer) {
      return message.warning("Por favor completa Unidad y Chofer");
    }

    // Si el usuario capturó una CP, verificamos que no esté duplicada en viajes activos.
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
        // Si la CP está vacía, guardamos "Pendiente" o lo dejamos en blanco
        cp: datosNuevoViaje.cp || 'Pendiente', 
        fecha: datosNuevoViaje.fecha ? datosNuevoViaje.fecha.format('YYYY-MM-DD') : '',
        hora: datosNuevoViaje.hora ? datosNuevoViaje.hora.format('HH:mm') : '',
        timestampFiltro: datosNuevoViaje.fecha ? datosNuevoViaje.fecha.valueOf() : new Date().getTime(),
        estatus: 'viajes',
        sello: datosNuevoViaje.sello ? datosNuevoViaje.sello : 'Pendiente',
        fechaCreacion: new Date().toISOString(),
        fechaInicioExacta: new Date().toISOString() // NUEVO: MARCA DE INICIO
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

      const tablaNuevoViajeHTML = `
        <div style="font-family: 'Times New Roman', serif, Arial; color: #000; font-size: 13px;">
          <p style="text-align: center; font-weight: bold; background-color: #fff2cc; padding: 5px; margin-bottom: 0; width: fit-content; margin-left: auto; margin-right: auto;">Nuevo viaje foraneo</p>
          <table style="width: 100%; max-width: 800px; border-collapse: collapse; border: 1px solid #000; font-size: 12px; margin-top: 5px;">
            <tbody>
              <tr>
                <td style="border: 1px solid #000; padding: 5px; width: 30%;">Fecha y hora de salida:</td>
                <td style="border: 1px solid #000; padding: 5px;">${nuevoRegistro.fecha} ${nuevoRegistro.hora}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #000; padding: 5px;">Tractor:</td>
                <td style="border: 1px solid #000; padding: 5px;">${datosNuevoViaje.unidad || ''}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #000; padding: 5px;">Remolque:</td>
                <td style="border: 1px solid #000; padding: 5px;">${datosNuevoViaje.caja || ''}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #000; padding: 5px;">Chofer:</td>
                <td style="border: 1px solid #000; padding: 5px;">${datosNuevoViaje.chofer || ''}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #000; padding: 5px;">Cliente:</td>
                <td style="border: 1px solid #000; padding: 5px;">${datosNuevoViaje.cliente || ''}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #000; padding: 5px;">Origen:</td>
                <td style="border: 1px solid #000; padding: 5px;">${datosNuevoViaje.origen || ''}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #000; padding: 5px;">Destino:</td>
                <td style="border: 1px solid #000; padding: 5px;">${datosNuevoViaje.destino || ''}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #000; padding: 5px;"># Carta Porte:</td>
                <td style="border: 1px solid #000; padding: 5px;">${nuevoRegistro.cp}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #000; padding: 5px;">Sello:</td>
                <td style="border: 1px solid #000; padding: 5px;">${nuevoRegistro.sello}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;

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

      setMostrarModalNuevoViaje(false);
      
      setDatosNuevoViaje({
        fecha: null, cp: '', hora: null, unidad: undefined, 
        chofer: undefined, caja: '', cliente: undefined, 
        origen: '', destino: '', correoEnvio: '', enviarACliente: true, sello: ''
      });
      
    } catch (e) {
      console.error("Error general en handleCrearViaje:", e);
      message.error("Hubo un problema al procesar el viaje");
    } finally {
      setCargandoViaje(false);
    }
  };

  const handleEnviarBitacora = async (unidadNombre) => {
    const info = datosBitacora[unidadNombre];
    
    if (info?.enviarACliente && !info?.correoEnvio) {
      return message.warning("Por favor ingresa un correo para notificar al cliente");
    }

    try {
      message.loading({ content: `Procesando estatus de ${unidadNombre}...`, key: 'envioInd' });

      await guardarSugerenciaAutomatica('estatus', info.estatus);
      await guardarSugerenciaAutomatica('ubicacion', info.ubicacion);
      await guardarSugerenciaAutomatica('velocidad', info.velocidad);
      await guardarSugerenciaAutomatica('lugar', info.lugar);

      // BUSCAMOS INFO DEL VIAJE PARA RELLENAR CHOFER Y REMOLQUE EN LA TABLA DEL CLIENTE
      const viajeActivo = viajes.find(v => v.unidad === unidadNombre && (v.estatus === 'viajes' || v.estatus === 'espera'));
      const chofer = viajeActivo?.chofer || "N/A";
      const remolque = viajeActivo?.caja || "N/A";

      const fechaObj = info.fechaReporte ? info.fechaReporte.toDate() : new Date();
      const fechaTexto = fechaObj.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
      const fechaFormateada = fechaTexto.charAt(0).toUpperCase() + fechaTexto.slice(1);
      const horaString = info.horaReporte ? info.horaReporte.format('HH:mm') : new Date().toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit', hour12: false});
      const estatusDelDia = `${fechaFormateada} a las ${horaString}`;

      // NUEVO: INYECCIÓN AUTOMÁTICA A LA CAJA NEGRA (PUNTOS DE REVISIÓN)
      if (viajeActivo) {
        await addDoc(collection(db, "viajes", viajeActivo.id, "puntos_revision"), {
          fecha: info.fechaReporte ? info.fechaReporte.format('YYYY-MM-DD') : new Date().toISOString().split('T')[0],
          hora: horaString,
          ubicacion: info.ubicacion || '',
          estatus: info.estatus || '',
          velocidad: info.velocidad || '',
          cliente: info.cliente || '',
          lugar: info.lugar || '',
          link: info.link || '',
          observaciones: 'Reporte automático de bitácora',
          timestamp: new Date().getTime()
        });
      }

      const reporteParaFirebase = {
        unidad: unidadNombre,
        ...info,
        fechaReporte: info.fechaReporte ? info.fechaReporte.format('YYYY-MM-DD') : new Date().toISOString().split('T')[0],
        horaString: horaString,
        link: info.link || 'No proporcionado',
        fechaEnvio: new Date().toISOString(),
      };
      await addDoc(collection(db, "reportes_bitacora"), reporteParaFirebase);

      if (info?.enviarACliente && info?.correoEnvio) {
        // NUEVO FORMATO DE TABLA PARA EL CLIENTE
        const contenidoHtmlIndividual = `
          <div style="font-family: 'Times New Roman', serif; color: #000; font-size: 13px;">
            <p><b>Reporte de Estatus Individual - Transporte Vargas</b></p>
            <table border="1" style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 11px;">
              <thead>
                <tr style="background-color: #f2f2f2;">
                  <th style="border: 1px solid #000; padding: 5px;">Vehiculo</th>
                  <th style="border: 1px solid #000; padding: 5px;">Hora Rep.</th>
                  <th style="border: 1px solid #000; padding: 5px;">Chofer</th>
                  <th style="border: 1px solid #000; padding: 5px;">Remolque</th>
                  <th style="border: 1px solid #000; padding: 5px;">Estatus</th>
                  <th style="border: 1px solid #000; padding: 5px;">Ubicacion</th>
                  <th style="border: 1px solid #000; padding: 5px;">Vel/Motivo</th>
                  <th style="border: 1px solid #000; padding: 5px;">Lugar</th>
                  <th style="border: 1px solid #000; padding: 5px;">Link</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="border: 1px solid #000; padding: 5px; text-align: center;">${unidadNombre}</td>
                  <td style="border: 1px solid #000; padding: 5px; text-align: center;">${horaString}</td>
                  <td style="border: 1px solid #000; padding: 5px;">${chofer}</td>
                  <td style="border: 1px solid #000; padding: 5px;">${remolque}</td>
                  <td style="border: 1px solid #000; padding: 5px;">${info.estatus || ''}</td>
                  <td style="border: 1px solid #000; padding: 5px;">${info.ubicacion || ''}</td>
                  <td style="border: 1px solid #000; padding: 5px;">${info.velocidad || ''}</td>
                  <td style="border: 1px solid #000; padding: 5px;">${info.lugar || ''}</td>
                  <td style="border: 1px solid #000; padding: 5px; text-align: center;"><a href="${info.link || '#'}">Ver GPS</a></td>
                </tr>
              </tbody>
            </table>
            <p style="font-size: 10px; color: #666; margin-top: 15px;">Este es un reporte automático generado por el sistema de monitoreo de Transporte Vargas.</p>
          </div>
        `;

        await enviarConBrevo(
          info.correoEnvio,
          `ESTATUS UNIDAD ${unidadNombre} - ${horaString}`,
          contenidoHtmlIndividual
        );
        
        await addDoc(collection(db, "logs_envios"), {
          unidad: unidadNombre,
          destinatario: info.correoEnvio,
          fechaEnvio: new Date().toISOString(),
          tipo: 'Reporte de Bitácora (Cliente)'
        });

        message.success({ content: `¡Estatus enviado al cliente en formato formal!`, key: 'envioInd' });
      } else {
        message.success({ content: `¡Estatus guardado internamente!`, key: 'envioInd' });
      }
      
    } catch (e) {
      console.error("Error al procesar:", e);
      message.error({ content: `Fallo el proceso de ${unidadNombre}`, key: 'envioInd' });
    }
  };

  const handleEnviarBitacoraMasiva = async () => {
    if (unidadesSeleccionadasBitacora.length === 0) {
      return message.warning("No hay unidades seleccionadas para enviar.");
    }

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
    ].join(", ");

    message.loading({ content: "Generando y enviando reporte consolidado a Tráfico...", key: "envioMasivo" });

    try {
      let filasViajesHTML = "";
      
      for (const nombreUnidad of unidadesSeleccionadasBitacora) {
        const info = datosBitacora[nombreUnidad] || {};
        
        await guardarSugerenciaAutomatica('estatus', info.estatus);
        await guardarSugerenciaAutomatica('ubicacion', info.ubicacion);
        await guardarSugerenciaAutomatica('velocidad', info.velocidad);
        await guardarSugerenciaAutomatica('lugar', info.lugar);

        const viajeActivo = viajes.find(v => v.unidad === nombreUnidad && (v.estatus === 'viajes' || v.estatus === 'espera'));
        const chofer = viajeActivo?.chofer || "";
        const remolque = viajeActivo?.caja || "";

        const fechaCorta = info.fechaReporte ? info.fechaReporte.format('DD/MM/YYYY') : new Date().toLocaleDateString('es-MX');
        const horaString = info.horaReporte ? info.horaReporte.format('HH:mm') : new Date().toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit', hour12: false});

        // NUEVO: INYECCIÓN AUTOMÁTICA MASIVA A LA CAJA NEGRA
        if (viajeActivo) {
          await addDoc(collection(db, "viajes", viajeActivo.id, "puntos_revision"), {
            fecha: info.fechaReporte ? info.fechaReporte.format('YYYY-MM-DD') : new Date().toISOString().split('T')[0],
            hora: horaString,
            ubicacion: info.ubicacion || '',
            estatus: info.estatus || '',
            velocidad: info.velocidad || '',
            cliente: info.cliente || '',
            lugar: info.lugar || '',
            link: info.link || '',
            observaciones: 'Reporte consolidado automático',
            timestamp: new Date().getTime()
          });
        }

        filasViajesHTML += `
          <tr>
            <td style="border: 1px solid #000; padding: 5px;">${nombreUnidad}</td>
            <td style="border: 1px solid #000; padding: 5px;">${fechaCorta} ${horaString}</td>
            <td style="border: 1px solid #000; padding: 5px;">${chofer}</td>
            <td style="border: 1px solid #000; padding: 5px;">${remolque}</td>
            <td style="border: 1px solid #000; padding: 5px;">${info.estatus || ''}</td>
            <td style="border: 1px solid #000; padding: 5px;">${info.ubicacion || ''}</td>
            <td style="border: 1px solid #000; padding: 5px;">${info.velocidad || ''}</td>
            <td style="border: 1px solid #000; padding: 5px;">${info.cliente || ''}</td>
            <td style="border: 1px solid #000; padding: 5px;">${info.lugar || ''}</td>
            <td style="border: 1px solid #000; padding: 5px;">${info.link || ''}</td>
          </tr>
        `;
      }

      const unidadesActivasNombres = viajes.filter(v => v.estatus === 'viajes' || v.estatus === 'espera').map(v => v.unidad);
      const unidadesEnYarda = unidades.filter(u => !unidadesActivasNombres.includes(u.nombre));
      
      let filasYardaHTML = "";
      unidadesEnYarda.forEach(u => {
        const estatusMostrar = (u.estado && u.estado !== 'Listo') ? u.estado : 'Sin viaje';
        filasYardaHTML += `
          <tr>
            <td style="border: 1px solid #000; padding: 5px;">${u.nombre}</td>
            <td style="border: 1px solid #000; padding: 5px;">${estatusMostrar}</td>
          </tr>
        `;
      });

      const tablaConsolidadaHTML = `
        <div style="font-family: 'Times New Roman', serif; color: #000; font-size: 13px;">
          <p>Unidades foraneas de viaje o espera de carga:</p>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 11px; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #f2f2f2;">
                <th style="border: 1px solid #000; padding: 5px;">Vehiculo</th>
                <th style="border: 1px solid #000; padding: 5px;">Fecha/Hora</th>
                <th style="border: 1px solid #000; padding: 5px;">Chofer</th>
                <th style="border: 1px solid #000; padding: 5px;">Remolque</th>
                <th style="border: 1px solid #000; padding: 5px;">Estatus</th>
                <th style="border: 1px solid #000; padding: 5px;">Ubicacion</th>
                <th style="border: 1px solid #000; padding: 5px;">Vel/Motivo</th>
                <th style="border: 1px solid #000; padding: 5px;">Cliente</th>
                <th style="border: 1px solid #000; padding: 5px;">Lugar</th>
                <th style="border: 1px solid #000; padding: 5px;">Link</th>
              </tr>
            </thead>
            <tbody>${filasViajesHTML}</tbody>
          </table>
          <p>Unidades en yarda:</p>
          <table style="width: 250px; border-collapse: collapse; border: 1px solid #000; font-size: 11px;">
            <thead><tr style="background-color: #f2f2f2;"><th style="border: 1px solid #000; padding: 5px;">Vehiculo</th><th style="border: 1px solid #000; padding: 5px;">Estatus</th></tr></thead>
            <tbody>${filasYardaHTML}</tbody>
          </table>
        </div>
      `;

      await enviarConBrevo(
        correosInternos,
        `ESTATUS UNIDADES FORANEAS - ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`,
        tablaConsolidadaHTML
      );

      message.success({ content: "¡Reporte consolidado enviado exitosamente a internos!", key: "envioMasivo" });
      setBannerBitacora({ visible: true, mensaje: "Envío Consolidado Exitoso vía Brevo. El equipo de Tráfico ya recibió la información.", tipo: 'success' });
    } catch (error) {
      console.error("Error en envío masivo Brevo:", error);
      message.error({ content: "Error crítico al realizar el envío consolidado", key: "envioMasivo" });
      setBannerBitacora({ visible: true, mensaje: `ERROR CRÍTICO: El reporte consolidado no se envió. ${error.message}`, tipo: 'error' });
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

  const handleAbrirBitacoraInteligente = () => {
    const unidadesEnViaje = viajes.filter(v => v.estatus === 'viajes' || v.estatus === 'espera');
    const nuevasBitacoras = {};

    unidadesEnViaje.forEach(v => {
      const clienteInfo = clientes.find(c => c.nombre === v.cliente);
      nuevasBitacoras[v.unidad] = {
        cliente: v.cliente,
        correoEnvio: clienteInfo?.correo || '',
        enviarACliente: true
      };
    });

    setDatosBitacora(nuevasBitacoras);
    setUnidadesSeleccionadasBitacora(unidadesEnViaje.map(v => v.unidad));
    setMostrarModalBitacora(true);
  };

  const SelectInteligente = ({ categoria, value, onChange, placeholder }) => (
    <Select
      mode="tags"
      style={{ width: '100%' }}
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

  // --- FUNCIONES PARA RASTREO ESPECIAL ---
  const abrirRastreoEspecial = (viajeRecord) => {
    setViajeActivoRastreo(viajeRecord);
    setSelloActual(viajeRecord.sello || 'Pendiente');
    setMostrarModalRastreo(true);
  };

  const cerrarRastreoEspecial = () => {
    setMostrarModalRastreo(false);
    setViajeActivoRastreo(null);
    setPuntosRevision([]);
    setDatosNuevoPunto({ fecha: null, hora: null, ubicacion: '', estatus: '', observaciones: '' });
  };

  const handleActualizarSello = async () => {
    if (!viajeActivoRastreo) return;
    try {
      await updateDoc(doc(db, "viajes", viajeActivoRastreo.id), { sello: selloActual });
      message.success("Sello actualizado correctamente");
      setViajeActivoRastreo({ ...viajeActivoRastreo, sello: selloActual });
    } catch (e) {
      message.error("Error al actualizar el sello");
    }
  };

  const handleAgregarPunto = async () => {
    if (!datosNuevoPunto.fecha || !datosNuevoPunto.hora || !datosNuevoPunto.ubicacion || !datosNuevoPunto.estatus) {
      return message.warning("Por favor llena Fecha, Hora, Ubicación y Estatus");
    }

    try {
      await addDoc(collection(db, "viajes", viajeActivoRastreo.id, "puntos_revision"), {
        fecha: datosNuevoPunto.fecha.format('YYYY-MM-DD'),
        hora: datosNuevoPunto.hora.format('HH:mm'),
        ubicacion: datosNuevoPunto.ubicacion,
        estatus: datosNuevoPunto.estatus,
        velocidad: '', // Compatibilidad con inyección auto
        lugar: '',     // Compatibilidad con inyección auto
        link: '',      // Compatibilidad con inyección auto
        observaciones: datosNuevoPunto.observaciones,
        timestamp: new Date().getTime()
      });

      await guardarSugerenciaAutomatica('ubicacion', datosNuevoPunto.ubicacion);
      await guardarSugerenciaAutomatica('estatus', datosNuevoPunto.estatus);

      message.success("Punto de revisión agregado exitosamente");
      setDatosNuevoPunto({ fecha: null, hora: null, ubicacion: '', estatus: '', observaciones: '' });
    } catch (e) {
      console.error("Error agregando punto:", e);
      message.error("No se pudo agregar el punto de revisión");
    }
  };

  // NUEVO: DESCARGA DE EXCEL ACTUALIZADA CON HISTORIAL COMPLETO Y FECHAS
  const handleDescargarCSV = () => {
    if (puntosRevision.length === 0) {
      return message.warning("No hay puntos registrados para descargar.");
    }

    let csvContent = `Viaje Unidad: ${viajeActivoRastreo.unidad} | Carta Porte: ${viajeActivoRastreo.cp}\n`;
    csvContent += `Inicio: ${viajeActivoRastreo.fechaInicioExacta ? new Date(viajeActivoRastreo.fechaInicioExacta).toLocaleString('es-MX') : 'No registrada'}\n`;
    csvContent += `Fin: ${viajeActivoRastreo.fechaFinExacta ? new Date(viajeActivoRastreo.fechaFinExacta).toLocaleString('es-MX') : 'Aun en transito'}\n\n`;
    csvContent += "Fecha,Hora,Ubicacion,Estatus,Velocidad,Lugar,Link,Observaciones\n";
    
    puntosRevision.forEach(p => {
      const obsLimpia = p.observaciones ? p.observaciones.replace(/,/g, " ") : "";
      const vel = p.velocidad ? p.velocidad.replace(/,/g, " ") : "";
      const lug = p.lugar ? p.lugar.replace(/,/g, " ") : "";
      const lnk = p.link ? p.link.replace(/,/g, " ") : "";
      csvContent += `${p.fecha},${p.hora},${p.ubicacion},${p.estatus},${vel},${lug},${lnk},${obsLimpia}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Historial_${viajeActivoRastreo.unidad}_CP_${viajeActivoRastreo.cp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
      render: (_, record) => (
        <Button 
          danger 
          size="small" 
          onClick={() => abrirRastreoEspecial(record)}
          style={{ fontSize: '11px', backgroundColor: 'rgba(255,0,0,0.1)', border: '1px solid #ff4d4f' }}
        >
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
                  <Button type="primary" onClick={handleAbrirBitacoraInteligente} style={{ backgroundColor: '#007bff', height: '45px', padding: '0 30px', fontWeight: 'bold' }}>Capturar bitacora</Button>
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
                    rowKey="id"
                    expandable={{ expandedRowRender: (record) => <HistorialViaje viaje={record} /> }} // NUEVO: FILA EXPANDIBLE
                    columns={[
                      { 
                        title: 'Acciones', 
                        width: 170,
                        render: (_, record) => (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <Popconfirm
                              title="¿Enviar a espera?"
                              description="La unidad pasará a la lista de espera de carga."
                              onConfirm={() => handleMoverAEspera(record.id)}
                              okText="Confirmar"
                              cancelText="Cancelar"
                            >
                              <Button size="small" style={{ backgroundColor: '#1677ff', color: 'white', border: 'none' }}>
                                En espera
                              </Button>
                            </Popconfirm>

                            <Popconfirm
                              title="¿Finalizar viaje?"
                              description="¿Estás seguro de que este viaje ha terminado? Pasará al historial."
                              onConfirm={() => handleTerminarViaje(record.id)}
                              okText="Sí, terminar"
                              cancelText="No"
                              okButtonProps={{ danger: true }}
                            >
                              <Button danger size="small">
                                Terminar
                              </Button>
                            </Popconfirm>
                          </div>
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
                        obtenerDatosTabla().map(v => (
                          <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                            {v.unidad}
                            <Popconfirm
                              title="¿Borrar de espera?"
                              description="¿Eliminar esta unidad de la lista de espera?"
                              onConfirm={() => handleEliminarEspera(v.id)}
                              okText="Sí, borrar"
                              cancelText="Cancelar"
                              okButtonProps={{ danger: true }}
                            >
                              <Trash2 size={22} color="#ff4d4f" style={{ cursor: 'pointer' }} />
                            </Popconfirm>
                          </div>
                        ))
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

          {vistaActual === 'historial' && (
            <div>
              <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Historial de Viajes</h2>
              <Table 
                dataSource={viajes.filter(v => v.estatus === 'finalizado')} 
                rowKey="id"
                expandable={{ expandedRowRender: (record) => <HistorialViaje viaje={record} /> }} // NUEVO: FILA EXPANDIBLE
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

          {vistaActual === 'reportes' && (
            <div>
              <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Reportes</h2>
              <Table 
                dataSource={viajes}
                columns={columnasReportes} 
                expandable={{ expandedRowRender: (record) => <HistorialViaje viaje={record} /> }} // NUEVO: FILA EXPANDIBLE
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
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <Button type="primary" onClick={() => handleAgregar('vehiculos')}>{editandoId && tipoEdicion === 'vehiculos' ? 'Guardar Cambios' : 'Agregar'}</Button>
                        {editandoId && tipoEdicion === 'vehiculos' && <Button onClick={cancelarEdicion}>Cancelar</Button>}
                      </div>
                    </div>
                    <div style={{ flex: 1 }}><Table dataSource={unidades} columns={[{ title: 'Vehiculo', dataIndex: 'nombre' }, { title: 'Acciones', render: (_, r) => <div style={{ display: 'flex', gap: '8px' }}><Button style={{ borderColor: '#ffa940', color: '#ffa940' }} size="small" onClick={() => prepararEdicion('vehiculos', r)}>Editar</Button><Button danger size="small" onClick={() => handleEliminar('vehiculos', r.id)}>Eliminar</Button></div> }]} size="small" rowKey="id" /></div>
                  </div>
                </Panel>
                <Panel header="Choferes" key="2" style={{ borderBottom: '1px solid #222' }}>
                  <div style={{ display: 'flex', gap: '50px', padding: '20px' }}>
                    <div style={{ width: '250px', textAlign: 'center' }}>
                      <p>Nombre del chofer</p>
                      <Input value={nuevoChofer} onChange={e => setNuevoChofer(e.target.value)} style={{ marginBottom: '15px' }} />
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <Button type="primary" onClick={() => handleAgregar('choferes')}>{editandoId && tipoEdicion === 'choferes' ? 'Guardar Cambios' : 'Agregar'}</Button>
                        {editandoId && tipoEdicion === 'choferes' && <Button onClick={cancelarEdicion}>Cancelar</Button>}
                      </div>
                    </div>
                    <div style={{ flex: 1 }}><Table dataSource={choferes} columns={[{ title: 'Nombre', dataIndex: 'nombre' }, { title: 'Acciones', render: (_, r) => <div style={{ display: 'flex', gap: '8px' }}><Button style={{ borderColor: '#ffa940', color: '#ffa940' }} size="small" onClick={() => prepararEdicion('choferes', r)}>Editar</Button><Button danger size="small" onClick={() => handleEliminar('choferes', r.id)}>Eliminar</Button></div> }]} size="small" rowKey="id" /></div>
                  </div>
                </Panel>
                <Panel header="Clientes" key="3" style={{ borderBottom: '1px solid #222' }}>
                  <div style={{ display: 'flex', gap: '50px', padding: '20px' }}>
                    <div style={{ width: '250px', textAlign: 'center' }}>
                      <p>Nombre del Cliente</p>
                      <Input value={nuevoCliente} onChange={e => setNuevoCliente(e.target.value)} style={{ marginBottom: '10px' }} />
                      <p>Correo</p>
                      <Input value={correoNuevo} onChange={e => setCorreoNuevo(e.target.value)} style={{ marginBottom: '15px' }} />
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <Button type="primary" onClick={() => handleAgregar('clientes')}>{editandoId && tipoEdicion === 'clientes' ? 'Guardar Cambios' : 'Agregar'}</Button>
                        {editandoId && tipoEdicion === 'clientes' && <Button onClick={cancelarEdicion}>Cancelar</Button>}
                      </div>
                    </div>
                    <div style={{ flex: 1 }}><Table dataSource={clientes} columns={[{ title: 'Nombre', dataIndex: 'nombre' }, { title: 'Correo', dataIndex: 'correo' }, { title: 'Acciones', render: (_, r) => <div style={{ display: 'flex', gap: '8px' }}><Button style={{ borderColor: '#ffa940', color: '#ffa940' }} size="small" onClick={() => prepararEdicion('clientes', r)}>Editar</Button><Button danger size="small" onClick={() => handleEliminar('clientes', r.id)}>Eliminar</Button></div> }]} size="small" rowKey="id" /></div>
                  </div>
                </Panel>
              </Collapse>
            </div>
          )}

          {/* MODAL NUEVO VIAJE */}
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
                    <SelectInteligente categoria="caja" value={datosNuevoViaje.caja} onChange={(val) => setDatosNuevoViaje({...datosNuevoViaje, caja: val})} placeholder="Escribe o selecciona caja" />
                  </div>
                  
                  {/* AUTO-COMPLETAR CORREO AL SELECCIONAR CLIENTE */}
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
                    <SelectInteligente categoria="origen" value={datosNuevoViaje.origen} onChange={(val) => setDatosNuevoViaje({...datosNuevoViaje, origen: val})} placeholder="Escribe o selecciona origen" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}><label style={{ width: '120px' }}>Destino :</label>
                    <SelectInteligente categoria="destino" value={datosNuevoViaje.destino} onChange={(val) => setDatosNuevoViaje({...datosNuevoViaje, destino: val})} placeholder="Escribe o selecciona destino" />
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
                    <Button onClick={() => setMostrarModalNuevoViaje(false)} disabled={cargandoViaje} style={{ background: '#262626', color: '#fff' }}>Cancelar</Button>
                    <Button type="primary" onClick={handleCrearViaje} loading={cargandoViaje}>Crear viaje</Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODAL CAPTURAR BITACORA MASIVA */}
          {mostrarModalBitacora && (
            <div id="area-modal-bitacora" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 2000, padding: '40px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
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
                    getPopupContainer={(trigger) => trigger.parentNode}
                  >
                    {unidades.map(u => <Option key={u.id} value={u.nombre}>{u.nombre}</Option>)}
                  </Select>
                </div>
                <X onClick={() => { setMostrarModalBitacora(false); setUnidadesSeleccionadasBitacora([]); setDatosBitacora({}); setBannerBitacora({ visible: false, mensaje: '', tipo: 'success' }); }} style={{ cursor: 'pointer' }} />
              </div>

              {bannerBitacora.visible && (
                <Alert
                  message={bannerBitacora.mensaje}
                  type={bannerBitacora.tipo}
                  showIcon
                  closable
                  onClose={() => setBannerBitacora({ ...bannerBitacora, visible: false })}
                  style={{ marginBottom: '20px', borderRadius: '4px' }}
                />
              )}

              {unidadesSeleccionadasBitacora.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 450px))', gap: '25px', marginBottom: '80px' }}>
                  {unidadesSeleccionadasBitacora.map(nombreUnidad => (
                    <div key={nombreUnidad} style={{ background: '#1a1a1a', borderRadius: '4px', border: '1px solid #333' }}>
                      <div style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #333', fontWeight: 'bold', color: '#3b82f6' }}>{nombreUnidad}</div>
                      <div style={{ padding: '25px', background: '#164e63', margin: '15px', borderRadius: '4px' }}>
                        
                        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
                          <label style={{ width: '100px' }}>Fecha/Hora :</label>
                          <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
                            <DatePicker 
                              style={{ flex: 1 }} 
                              value={datosBitacora[nombreUnidad]?.fechaReporte} 
                              onChange={val => handleInputBitacora(nombreUnidad, 'fechaReporte', val)} 
                              getPopupContainer={(trigger) => trigger.parentNode}
                              placeholder="Hoy"
                            />
                            <TimePicker 
                              style={{ flex: 1 }} 
                              format="HH:mm" 
                              value={datosBitacora[nombreUnidad]?.horaReporte} 
                              onChange={val => handleInputBitacora(nombreUnidad, 'horaReporte', val)} 
                              getPopupContainer={(trigger) => trigger.parentNode}
                              placeholder="Hora GPS"
                            />
                          </div>
                        </div>

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
                          <Select placeholder="Seleccionar" style={{ flex: 1 }} value={datosBitacora[nombreUnidad]?.cliente} 
                            onChange={val => {
                                handleInputBitacora(nombreUnidad, 'cliente', val);
                                const clienteInfo = clientes.find(c => c.nombre === val);
                                handleInputBitacora(nombreUnidad, 'correoEnvio', clienteInfo?.correo || '');
                            }} 
                            getPopupContainer={(trigger) => trigger.parentNode}>
                              {clientes.map(cl => <Option key={cl.id} value={cl.nombre}>{cl.nombre}</Option>)}
                          </Select>
                        </div>
                        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center' }}><label style={{ width: '100px' }}>Lugar :</label>
                          <SelectInteligente categoria="lugar" value={datosBitacora[nombreUnidad]?.lugar} onChange={val => handleInputBitacora(nombreUnidad, 'lugar', val)} placeholder="Lugar" />
                        </div>
                        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center' }}><label style={{ width: '100px' }}>Link :</label><Input value={datosBitacora[nombreUnidad]?.link || ''} onChange={e => handleInputBitacora(nombreUnidad, 'link', e.target.value)} style={{ flex: 1, background: 'rgba(0,0,0,0.2)' }} /></div>
                        
                        <div style={{ marginBottom: '15px', padding: '10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                            <Checkbox 
                              checked={datosBitacora[nombreUnidad]?.enviarACliente} 
                              onChange={(e) => handleInputBitacora(nombreUnidad, 'enviarACliente', e.target.checked)}
                              style={{ color: '#fff', marginBottom: '10px', fontWeight: 'bold' }}
                            >
                              Notificar al cliente
                            </Checkbox>

                            {datosBitacora[nombreUnidad]?.enviarACliente && (
                              <>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#ddd' }}>Correo del destinatario:</label>
                                <Input placeholder="Correo del destinatario" value={datosBitacora[nombreUnidad]?.correoEnvio || ''} onChange={e => handleInputBitacora(nombreUnidad, 'correoEnvio', e.target.value)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid #3b82f6' }} />
                              </>
                            )}
                        </div>
                        <Button type="primary" block style={{ height: '40px', fontWeight: 'bold' }} onClick={() => handleEnviarBitacora(nombreUnidad)}>
                          {datosBitacora[nombreUnidad]?.enviarACliente ? 'Guardar y Notificar a Cliente' : 'Solo Guardar Estatus'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ position: 'sticky', bottom: '-40px', left: '-40px', right: '-40px', background: '#000', padding: '20px 40px', borderTop: '1px solid #333', display: 'flex', justifyContent: 'flex-end', gap: '15px', zIndex: 10 }}>
                <Button onClick={() => { setMostrarModalBitacora(false); setUnidadesSeleccionadasBitacora([]); setDatosBitacora({}); setBannerBitacora({ visible: false, mensaje: '', tipo: 'success' }); }} style={{ background: '#262626', color: '#fff', border: 'none' }}>Cancelar</Button>
                <Button type="primary" onClick={handleEnviarBitacoraMasiva} style={{ height: '32px', padding: '0 25px' }}>Enviar Consolidado a Tráfico</Button>
              </div>
            </div>
          )}

          {/* MODAL DESHABILITAR UNIDAD */}
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

          {/* MODAL RASTREO ESPECIAL */}
          {mostrarModalRastreo && viajeActivoRastreo && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, padding: '20px' }}>
              <div style={{ width: '1000px', backgroundColor: '#1a1a1a', borderRadius: '8px', border: '1px solid #333', padding: '25px', maxHeight: '95vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6' }}>Rastreo Especial de Viaje</span>
                  <X onClick={cerrarRastreoEspecial} style={{ cursor: 'pointer', color: '#888' }} size={24} />
                </div>

                {/* DETALLES DEL VIAJE */}
                <div style={{ background: '#262626', padding: '15px', borderRadius: '6px', marginBottom: '20px' }}>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#aaa' }}>DETALLES DEL VIAJE</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', fontSize: '13px' }}>
                    <div><span style={{ color: '#888' }}>Tractor:</span> <br/><b>{viajeActivoRastreo.unidad}</b></div>
                    <div><span style={{ color: '#888' }}>Remolque:</span> <br/><b>{viajeActivoRastreo.caja || 'N/A'}</b></div>
                    <div><span style={{ color: '#888' }}>Chofer:</span> <br/><b>{viajeActivoRastreo.chofer}</b></div>
                    <div><span style={{ color: '#888' }}>Cliente:</span> <br/><b>{viajeActivoRastreo.cliente}</b></div>
                    <div><span style={{ color: '#888' }}>Origen:</span> <br/><b>{viajeActivoRastreo.origen}</b></div>
                    <div><span style={{ color: '#888' }}>Destino:</span> <br/><b>{viajeActivoRastreo.destino}</b></div>
                    <div><span style={{ color: '#888' }}>Carta Porte:</span> <br/><b>{viajeActivoRastreo.cp}</b></div>
                    <div>
                      <span style={{ color: '#888' }}>Sello:</span> <br/>
                      <div style={{ display: 'flex', gap: '5px', marginTop: '2px' }}>
                        <Input size="small" value={selloActual} onChange={e => setSelloActual(e.target.value)} style={{ width: '100px', background: '#000', color: '#fff', border: '1px solid #444' }} />
                        <Button size="small" type="primary" onClick={handleActualizarSello}>Guardar</Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AGREGAR PUNTO DE REVISIÓN - ORGANIZADO EN 2 FILAS */}
                <div style={{ 
                  background: 'rgba(59, 130, 246, 0.1)', 
                  padding: '20px', 
                  borderRadius: '8px', 
                  marginBottom: '20px', 
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '15px'
                }}>
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#3b82f6', fontWeight: 'bold' }}>
                    AGREGAR PUNTO DE REVISIÓN
                  </h3>

                  {/* FILA 1: Tiempo y Lugar */}
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#bbb' }}>Fecha</span>
                      <DatePicker style={{ width: '100%' }} value={datosNuevoPunto.fecha} onChange={v => setDatosNuevoPunto({...datosNuevoPunto, fecha: v})} getPopupContainer={t => t.parentNode} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#bbb' }}>Hora</span>
                      <TimePicker style={{ width: '100%' }} format="HH:mm" value={datosNuevoPunto.hora} onChange={v => setDatosNuevoPunto({...datosNuevoPunto, hora: v})} getPopupContainer={t => t.parentNode} />
                    </div>
                    <div style={{ flex: 3, minWidth: '0' }}>
                      <span style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#bbb' }}>Ubicación</span>
                      <SelectInteligente categoria="ubicacion" value={datosNuevoPunto.ubicacion} onChange={v => setDatosNuevoPunto({...datosNuevoPunto, ubicacion: v})} placeholder="Ciudad, Estado o Punto de control" />
                    </div>
                  </div>

                  {/* FILA 2: Estatus, Notas y Acción */}
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1.5, minWidth: '0' }}>
                      <span style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#bbb' }}>Estatus</span>
                      <SelectInteligente categoria="estatus" value={datosNuevoPunto.estatus} onChange={v => setDatosNuevoPunto({...datosNuevoPunto, estatus: v})} placeholder="Estatus del viaje" />
                    </div>
                    <div style={{ flex: 3 }}>
                      <span style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#bbb' }}>Observaciones</span>
                      <Input value={datosNuevoPunto.observaciones} onChange={e => setDatosNuevoPunto({...datosNuevoPunto, observaciones: e.target.value})} style={{ background: '#000', border: '1px solid #444', color: '#fff' }} placeholder="Notas adicionales..." />
                    </div>
                    <div style={{ flex: 0.5 }}>
                      <Button type="primary" onClick={handleAgregarPunto} style={{ fontWeight: 'bold', width: '100%' }}>
                        Agregar
                      </Button>
                    </div>
                  </div>
                </div>

                {/* TABLA DE HISTORIAL DE PUNTOS */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  <Table 
                    dataSource={puntosRevision}
                    rowKey="id"
                    size="small"
                    pagination={false}
                    locale={{ emptyText: <Empty description="Aún no hay puntos de revisión para este viaje." /> }}
                    columns={[
                      { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 100 },
                      { title: 'Hora', dataIndex: 'hora', key: 'hora', width: 80 },
                      { title: 'Ubicación', dataIndex: 'ubicacion', key: 'ubicacion' },
                      { title: 'Estatus', dataIndex: 'estatus', key: 'estatus' },
                      { title: 'Observaciones', dataIndex: 'observaciones', key: 'observaciones' }
                    ]}
                  />
                </div>

                {/* BOTONES FINALES */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', gap: '15px', borderTop: '1px solid #333', paddingTop: '15px' }}>
                  <Button icon={<Download size={16} />} style={{ backgroundColor: '#107c41', color: 'white', border: 'none' }} onClick={handleDescargarCSV}>
                    Descargar Excel (.csv)
                  </Button>
                  <Button onClick={cerrarRastreoEspecial} style={{ background: '#262626', color: '#fff', border: 'none' }}>
                    Cerrar
                  </Button>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>
    </ConfigProvider>
  );
}

export default App;