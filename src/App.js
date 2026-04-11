import React, { useState, useEffect } from 'react';
import { Home, History, FileText, Settings, X, Truck, Clock, Warehouse, Trash2 } from 'lucide-react';
import { DatePicker, TimePicker, Select, Button, ConfigProvider, theme, Table, Input, Collapse, Empty, message, Popconfirm, Modal, Radio, Alert } from 'antd'; 
import { db } from './firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import 'antd/dist/reset.css';

const { Option } = Select;
const { Panel } = Collapse;

// FUNCIÓN HELPER PARA BREVO (REEMPLAZA A EMAILJS)
const enviarConBrevo = async (destinatarios, asunto, contenidoHtml) => {
  const listaDestinatarios = destinatarios.split(',').map(email => ({ email: email.trim() }));
  
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': process.env.REACT_APP_BREVO_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { 
        name: process.env.REACT_APP_BREVO_SENDER_NAME, 
        email: process.env.REACT_APP_BREVO_SENDER_EMAIL 
      },
      to: listaDestinatarios,
      subject: asunto,
      htmlContent: contenidoHtml
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Error en el envío con Brevo');
  }
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
    correoEnvio: '' 
  });

  const [unidadesSeleccionadasBitacora, setUnidadesSeleccionadasBitacora] = useState([]);
  const [datosBitacora, setDatosBitacora] = useState({}); 

  const [nuevoVehiculo, setNuevoVehiculo] = useState('');
  const [nuevoChofer, setNuevoChofer] = useState('');
  const [nuevoCliente, setNuevoCliente] = useState('');
  const [correoNuevo, setCorreoNuevo] = useState('');

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

  // FUNCIÓN PARA PREPARAR LA EDICIÓN
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
        fechaFinalizacion: new Date().toISOString() 
      });

      // --- INICIO: LIMPIEZA DEFENSIVA (EL ASPIRADOR) ---
      // Si la unidad tenía un registro zombi en 'espera' por errores del pasado, lo borramos aquí.
      const viajeTerminado = viajes.find(v => v.id === viajeId);
      if (viajeTerminado) {
        const registroEnEspera = viajes.find(v => v.unidad === viajeTerminado.unidad && v.estatus === 'espera');
        if (registroEnEspera) {
          await deleteDoc(doc(db, "viajes", registroEnEspera.id));
        }
      }
      // --- FIN: LIMPIEZA DEFENSIVA ---

      message.success("Viaje finalizado correctamente");
    } catch (e) {
      console.error("Error al terminar viaje:", e);
      message.error("No se pudo finalizar el viaje");
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

      // --- INICIO: OPCIÓN 1 (LA ASPIRADORA) ---
      // Buscamos si la unidad ya tiene un registro previo en estado 'espera' y lo eliminamos
      const registroEnEspera = viajes.find(v => v.unidad === datosNuevoViaje.unidad && v.estatus === 'espera');
      if (registroEnEspera) {
        await deleteDoc(doc(db, "viajes", registroEnEspera.id));
      }
      // --- FIN: OPCIÓN 1 ---

      await guardarSugerenciaAutomatica('caja', datosNuevoViaje.caja);
      await guardarSugerenciaAutomatica('origen', datosNuevoViaje.origen);
      await guardarSugerenciaAutomatica('destino', datosNuevoViaje.destino);

      const nuevoRegistro = {
        ...datosNuevoViaje,
        fecha: datosNuevoViaje.fecha ? datosNuevoViaje.fecha.format('YYYY-MM-DD') : '',
        hora: datosNuevoViaje.hora ? datosNuevoViaje.hora.format('HH:mm') : '',
        timestampFiltro: datosNuevoViaje.fecha ? datosNuevoViaje.fecha.valueOf() : new Date().getTime(),
        estatus: 'viajes',
        fechaCreacion: new Date().toISOString()
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
      if (datosNuevoViaje.correoEnvio) {
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
                <td style="border: 1px solid #000; padding: 5px;">${datosNuevoViaje.cp || ''}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #000; padding: 5px;">Sello:</td>
                <td style="border: 1px solid #000; padding: 5px;">Pendiente</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;

      try {
        const avisoEnvio = message.loading("Enviando notificación de viaje vía Brevo...", 0);

        await enviarConBrevo(
          destinatariosString,
          `NUEVO VIAJE - UNIDAD ${datosNuevoViaje.unidad} - CARTA PORTE ${datosNuevoViaje.cp}`,
          tablaNuevoViajeHTML
        );
        
        avisoEnvio();

        await addDoc(collection(db, "logs_envios"), {
          viajeId: docRef.id,
          destinatarios: destinatariosString,
          unidad: datosNuevoViaje.unidad,
          fechaEnvio: new Date().toISOString(),
          tipo: 'Creación de Viaje (Notificación Automática Interna via Brevo)'
        });

        message.success("Viaje creado y notificación enviada correctamente");
      } catch (mailError) {
        message.destroy();
        console.error("Error al enviar notificación Brevo:", mailError);
        message.error(`Viaje guardado, pero el correo falló: ${mailError.message}`);
      }

      setMostrarModalNuevoViaje(false);
      
      setDatosNuevoViaje({
        fecha: null, cp: '', hora: null, unidad: undefined, 
        chofer: undefined, caja: '', cliente: undefined, 
        origen: '', destino: '', correoEnvio: ''
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
    
    if (!info?.correoEnvio) {
      return message.warning("Por favor ingresa un correo de destino");
    }

    try {
      message.loading({ content: `Enviando reporte de ${unidadNombre}...`, key: 'envioInd' });

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

      const contenidoHtmlIndividual = `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2 style="color: #164e63;">Estatus Unidad: ${unidadNombre}</h2>
          <p><b>Estatus:</b> ${info.estatus || 'N/A'}</p>
          <p><b>Ubicación:</b> ${info.ubicacion || 'N/A'}</p>
          <p><b>Velocidad:</b> ${info.velocidad || 'N/A'}</p>
          <p><b>Lugar:</b> ${info.lugar || 'N/A'}</p>
          <p><b>Link:</b> <a href="${info.link || '#'}">Ver rastreo</a></p>
        </div>
      `;

      await enviarConBrevo(
        info.correoEnvio,
        `ESTATUS UNIDAD ${unidadNombre} - ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`,
        contenidoHtmlIndividual
      );
      
      await addDoc(collection(db, "logs_envios"), {
        unidad: unidadNombre,
        destinatario: info.correoEnvio,
        fechaEnvio: new Date().toISOString(),
        tipo: 'Reporte de Bitácora (Brevo)'
      });

      message.success({ content: `¡Reporte de ${unidadNombre} enviado!`, key: 'envioInd' });
      setBannerBitacora({ visible: true, mensaje: `Envío exitoso: El reporte de la unidad ${unidadNombre} fue entregado a Brevo.`, tipo: 'success' });
    } catch (e) {
      console.error("Error al enviar con Brevo:", e);
      message.error({ content: `Fallo el envío de ${unidadNombre}`, key: 'envioInd' });
      setBannerBitacora({ visible: true, mensaje: `Error en el envío (${unidadNombre}): ${e.message}`, tipo: 'error' });
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

        const viajeActivo = viajes.find(v => v.unidad === nombreUnidad && v.estatus === 'viajes');
        const chofer = viajeActivo?.chofer || "";
        const remolque = viajeActivo?.caja || "";

        filasViajesHTML += `
          <tr>
            <td style="border: 1px solid #000; padding: 5px;">${nombreUnidad}</td>
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

        await addDoc(collection(db, "reportes_bitacora"), {
          unidad: nombreUnidad,
          ...info,
          fechaEnvio: new Date().toISOString(),
          tipoEnvio: "Consolidado Interno (Brevo)"
        });
      }

      const unidadesActivasNombres = viajes.filter(v => v.estatus === 'viajes').map(v => v.unidad);
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

      message.success({ content: "¡Reporte consolidado enviado exitosamente!", key: "envioMasivo" });
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
    const unidadesEnViaje = viajes.filter(v => v.estatus === 'viajes');
    const nuevasBitacoras = {};

    unidadesEnViaje.forEach(v => {
      // BUSCAR CORREO DEL CLIENTE AUTOMÁTICAMENTE
      const clienteInfo = clientes.find(c => c.nombre === v.cliente);
      nuevasBitacoras[v.unidad] = {
        cliente: v.cliente,
        correoEnvio: clienteInfo?.correo || '' // JALAR CORREO SI EXISTE
      };
    });

    setDatosBitacora(nuevasBitacoras);
    setUnidadesSeleccionadasBitacora(unidadesEnViaje.map(v => v.unidad));
    setMostrarModalBitacora(true);
  };

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
                    columns={[
                      { 
                        title: 'Acciones', 
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
                                // ACTUALIZAR CORREO SI CAMBIA CLIENTE EN BITACORA
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
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#ddd' }}>Enviar reporte a:</label>
                            <Input placeholder="Correo del destinatario" value={datosBitacora[nombreUnidad]?.correoEnvio || ''} onChange={e => handleInputBitacora(nombreUnidad, 'correoEnvio', e.target.value)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid #3b82f6' }} />
                        </div>
                        <Button type="primary" block style={{ height: '40px', fontWeight: 'bold' }} onClick={() => handleEnviarBitacora(nombreUnidad)}>Enviar correo a cliente</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ position: 'sticky', bottom: '-40px', left: '-40px', right: '-40px', background: '#000', padding: '20px 40px', borderTop: '1px solid #333', display: 'flex', justifyContent: 'flex-end', gap: '15px', zIndex: 10 }}>
                <Button onClick={() => { setMostrarModalBitacora(false); setUnidadesSeleccionadasBitacora([]); setDatosBitacora({}); setBannerBitacora({ visible: false, mensaje: '', tipo: 'success' }); }} style={{ background: '#262626', color: '#fff', border: 'none' }}>Cancelar</Button>
                <Button type="primary" onClick={handleEnviarBitacoraMasiva} style={{ height: '32px', padding: '0 25px' }}>Enviar</Button>
              </div>
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