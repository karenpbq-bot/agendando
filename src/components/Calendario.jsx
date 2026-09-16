import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, dayjsLocalizer } from 'react-big-calendar';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { supabase } from '../supabaseClient';

dayjs.locale('es');
const localizer = dayjsLocalizer(dayjs);

export default function Calendario({ usuarioId }) {
  const [citas, setCitas] = useState([]);
  const [empresarios, setEmpresarios] = useState([]);
  
  const [modalAbierto, setModalAbierto] = useState(false);
  const [citaExistenteId, setCitaExistenteId] = useState(null);
  const [fechaSeleccionadaStr, setFechaSeleccionadaStr] = useState('');
  
  const [tipoSession, setTipoSession] = useState('Individual');
  const [empresarioId, setEmpresarioId] = useState('');
  const [nombreGrupo, setNombreGrupo] = useState('');
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFin, setHoraFin] = useState('09:45');
  const [linkZoom, setLinkZoom] = useState('');
  const [estadoCita, setEstadoCita] = useState('confirmado');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    if (usuarioId) {
      cargarDatosSupabase();
    }
  }, [usuarioId]);

  const cargarDatosSupabase = async () => {
    try {
      // 1. Cargar lista de invitados/empresarios
      const { data: dataEmp } = await supabase
        .from('usuarios')
        .select('id, nombre_completo, telefono, email, rol');
      if (dataEmp) setEmpresarios(dataEmp);

      // 2. Cargar citas del Chair
      const { data: dataCitas, error: errC } = await supabase
        .from('agd_citas')
        .select('*')
        .eq('chair_id', usuarioId);

      if (errC) throw errC;
      if (dataCitas) setCitas(dataCitas);
    } catch (err) {
      console.error('Error cargando calendario:', err);
    }
  };

  // Convertir citas de Supabase al formato que exige react-big-calendar
  const eventosCalendario = useMemo(() => {
    return citas
      .filter(c => c.estado !== 'cancelado') // Las canceladas no se pintan (liberan horario)
      .map(c => {
        const inicioDate = new Date(`${c.fecha_cita}T${c.hora_inicio}`);
        const finDate = new Date(`${c.fecha_cita}T${c.hora_fin}`);

        let tituloLabel = 'Cita';
        if (c.tipo_sesion === 'Grupal') {
          tituloLabel = `👥 ${c.nombre_grupo || 'Grupal'}`;
        } else {
          const emp = empresarios.find(e => e.id === Number(c.empresario_id || c.invitado_id));
          tituloLabel = `👤 ${emp?.nombre_completo?.split(' ')[0] || 'Individual'}`;
        }

        return {
          id: c.id,
          title: tituloLabel,
          start: inicioDate,
          end: finDate,
          resource: c
        };
      });
  }, [citas, empresarios]);

  // Manejar clic en un espacio vacío del calendario para crear cita
  const alSeleccionarSlot = ({ start }) => {
    const anio = start.getFullYear();
    const mes = String(start.getMonth() + 1).padStart(2, '0');
    const dia = String(start.getDate()).padStart(2, '0');
    const fechaFormateada = `${anio}-${mes}-${dia}`;

    const horaIniStr = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
    const finH = new Date(start.getTime() + 45 * 60000); // 45 min por defecto
    const horaFinStr = `${String(finH.getHours()).padStart(2, '0')}:${String(finH.getMinutes()).padStart(2, '0')}`;

    setFechaSeleccionadaStr(fechaFormateada);
    setCitaExistenteId(null);
    setHoraInicio(horaIniStr);
    setHoraFin(horaFinStr);
    setTipoSession('Individual');
    setEmpresarioId('');
    setNombreGrupo('');
    setLinkZoom('');
    setEstadoCita('confirmado');
    setMensaje('');
    setModalAbierto(true);
  };

  // Manejar clic en una cita existente para editarla/cancelarla
  const alSeleccionarEvento = (evento) => {
    const c = evento.resource;
    setCitaExistenteId(c.id);
    setFechaSeleccionadaStr(c.fecha_cita);
    setTipoSession(c.tipo_sesion || 'Individual');
    setEmpresarioId(c.empresario_id || c.invitado_id || '');
    setNombreGrupo(c.nombre_grupo || '');
    setHoraInicio(c.hora_inicio || '');
    setHoraFin(c.hora_fin || '');
    setLinkZoom(c.link_zoom || '');
    setEstadoCita(c.estado || 'confirmado');
    setMensaje('');
    setModalAbierto(true);
  };

  // Asignar colores dinámicos (Verde para grupal, Celeste para individual)
  const eventPropGetter = (event) => {
    const esGrupal = event.resource.tipo_sesion === 'Grupal';
    return {
      style: {
        backgroundColor: esGrupal ? '#C8E6C9' : '#B3E5FC',
        color: '#004D40',
        borderRadius: '6px',
        border: 'none',
        fontWeight: 'bold',
        fontSize: '0.8rem',
        padding: '2px 6px'
      }
    };
  };

  // Guardar o actualizar cita en Supabase
  const guardarCita = async (e) => {
    e.preventDefault();
    setMensaje('');

    try {
      const payload = {
        chair_id: Number(usuarioId),
        empresario_id: empresarioId ? Number(empresarioId) : null,
        fecha_cita: fechaSeleccionadaStr,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        tipo_sesion: tipoSession,
        nombre_grupo: tipoSession === 'Grupal' ? nombreGrupo : null,
        link_zoom: linkZoom,
        estado: estadoCita
      };

      if (citaExistenteId) {
        const { error } = await supabase.from('agd_citas')
          .update(payload)
          .eq('id', citaExistenteId);
        if (error) throw error;
        setMensaje('¡Cita actualizada con éxito!');
      } else {
        const { error } = await supabase.from('agd_citas').insert([payload]);
        if (error) throw error;
        setMensaje('¡Cita creada con éxito!');
      }

      await cargarDatosSupabase();
      setTimeout(() => setModalAbierto(false), 1000);
    } catch (err) {
      setMensaje('Error al guardar: ' + err.message);
    }
  };

  // Botones independientes de WhatsApp y Correo
  const enviarPorWhatsApp = () => {
    const empresObj = empresarios.find(e => e.id === Number(empresarioId));
    if (!empresObj || !empresObj.telefono) {
      setMensaje('El invitado no tiene teléfono registrado.');
      return;
    }
    const texto = encodeURIComponent(`Hola ${empresObj.nombre_completo}, tu sesión ha quedado programada para el ${fechaSeleccionadaStr} de ${horaInicio} a ${horaFin}. Zoom: ${linkZoom || 'Pendiente'}`);
    window.open(`https://wa.me/${empresObj.telefono.replace(/\+/g, '')}?text=${texto}`, '_blank');
  };

  const enviarPorCorreo = () => {
    const empresObj = empresarios.find(e => e.id === Number(empresarioId));
    if (!empresObj || !empresObj.email) {
      setMensaje('El invitado no tiene correo registrado.');
      return;
    }
    const asunto = encodeURIComponent('Convocatoria a Sesión - Agendando');
    const cuerpo = encodeURIComponent(`Hola ${empresObj.nombre_completo},\n\nTu sesión ha sido agendada para el ${fechaSeleccionadaStr} de ${horaInicio} a ${horaFin}.\nLink: ${linkZoom}\n\nAtentamente,\nAgendando`);
    window.open(`mailto:${empresObj.email}?subject=${asunto}&body=${cuerpo}`);
  };

  return (
    <div style={estilos.contenedor}>
      <div style={estilos.leyenda}>
        <span><b style={{color: '#00796B'}}>■</b> Cita Grupal (Verde)</span>
        <span><b style={{color: '#0288D1'}}>■</b> Cita Individual (Celeste)</span>
        <span>💡 <i>Haz clic en cualquier espacio libre para agendar una nueva cita.</i></span>
      </div>

      {/* Calendario Profesional */}
      <div style={{ height: 650, backgroundColor: '#FFF', padding: '15px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <Calendar
          localizer={localizer}
          events={eventosCalendario}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          selectable
          onSelectSlot={alSeleccionarSlot}
          onSelectEvent={alSeleccionarEvento}
          eventPropGetter={eventPropGetter}
          messages={{
            next: 'Siguiente',
            previous: 'Anterior',
            today: 'Hoy',
            month: 'Mes',
            week: 'Semana',
            day: 'Día',
            agenda: 'Agenda',
            date: 'Fecha',
            time: 'Hora',
            event: 'Evento',
            noEventsInRange: 'No hay citas en este rango.'
          }}
        />
      </div>

      {/* Modal de Gestión */}
      {modalAbierto && (
        <div style={estilos.modalOverlay}>
          <div style={estilos.modalContenido}>
            <h3 style={estilos.modalTitulo}>Gestionar Cita ({fechaSeleccionadaStr})</h3>
            
            <form onSubmit={guardarCita} style={estilos.formularioModal}>
              <div style={estilos.grupoInput}>
                <label style={estilos.label}>Estado de la Sesión</label>
                <select 
                  value={estadoCita} 
                  onChange={(e) => setEstadoCita(e.target.value)}
                  style={{...estilos.input, fontWeight: 'bold'}}
                >
                  <option value="confirmado">Confirmado / Activo</option>
                  <option value="reservado">Reservado</option>
                  <option value="cancelado">Cancelado (Libera Horario)</option>
                </select>
              </div>

              <div style={estilos.grupoInput}>
                <label style={estilos.label}>Tipo de Sesión</label>
                <select 
                  value={tipoSession} 
                  onChange={(e) => setTipoSession(e.target.value)}
                  style={estilos.input}
                >
                  <option value="Individual">Individual (Celeste)</option>
                  <option value="Grupal">Grupal (Verde)</option>
                </select>
              </div>

              {tipoSession === 'Individual' ? (
                <div style={estilos.grupoInput}>
                  <label style={estilos.label}>Seleccionar Invitado / Empresario</label>
                  <select 
                    value={empresarioId} 
                    onChange={(e) => setEmpresarioId(e.target.value)}
                    style={estilos.input}
                    required
                  >
                    <option value="">Seleccione...</option>
                    {empresarios.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.nombre_completo} ({emp.rol})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div style={estilos.grupoInput}>
                  <label style={estilos.label}>Nombre del Grupo / Directorio</label>
                  <input 
                    type="text"
                    value={nombreGrupo}
                    onChange={(e) => setNombreGrupo(e.target.value)}
                    placeholder="Ej. Directorio A"
                    style={estilos.input}
                    required
                  />
                </div>
              )}

              <div style={estilos.filaHorarios}>
                <div style={estilos.grupoInput}>
                  <label style={estilos.label}>Hora Inicio</label>
                  <input 
                    type="time" 
                    value={horaInicio} 
                    onChange={(e) => setHoraInicio(e.target.value)} 
                    style={estilos.input}
                    required
                  />
                </div>
                <div style={estilos.grupoInput}>
                  <label style={estilos.label}>Hora Fin</label>
                  <input 
                    type="time" 
                    value={horaFin} 
                    onChange={(e) => setHoraFin(e.target.value)} 
                    style={estilos.input}
                    required
                  />
                </div>
              </div>

              <div style={estilos.grupoInput}>
                <label style={estilos.label}>Link de Reunión (Zoom / Meet)</label>
                <input 
                  type="url" 
                  value={linkZoom} 
                  onChange={(e) => setLinkZoom(e.target.value)} 
                  placeholder="https://zoom.us/j/..."
                  style={estilos.input}
                  required
                />
              </div>

              {mensaje && <p style={estilos.mensajeFeedback}>{mensaje}</p>}

              <div style={estilos.contenedorBotonesAccion}>
                <button type="submit" style={estilos.botonGuardarPrincipal}>
                  💾 Guardar / Actualizar Cita
                </button>
                <div style={estilos.filaAccionesSecundarias}>
                  <button type="button" onClick={enviarPorWhatsApp} style={estilos.botonWs}>
                    💬 WhatsApp
                  </button>
                  <button type="button" onClick={enviarPorCorreo} style={estilos.botonCorreo}>
                    ✉️ Correo
                  </button>
                </div>
                <button type="button" onClick={() => setModalAbierto(false)} style={estilos.botonCerrarModal}>
                  Cerrar Ventana
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const estilos = {
  contenedor: { padding: '10px', maxWidth: '100%', width: '100%', boxSizing: 'border-box', fontFamily: 'sans-serif', backgroundColor: '#F8F9FA' },
  leyenda: { display: 'flex', justifyContent: 'center', gap: '15px', fontSize: '0.8rem', marginBottom: '12px', alignItems: 'center', flexWrap: 'wrap' },
  
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' },
  modalContenido: { backgroundColor: '#FFF', padding: '20px', borderRadius: '10px', width: '100%', maxWidth: '420px', boxSizing: 'border-box' },
  modalTitulo: { fontSize: '0.95rem', color: '#333', marginBottom: '12px', textAlign: 'center' },
  formularioModal: { display: 'flex', flexDirection: 'column', gap: '8px' },
  grupoInput: { display: 'flex', flexDirection: 'column', gap: '3px', textAlign: 'left' },
  label: { fontSize: '0.7rem', fontWeight: 'bold', color: '#444' },
  input: { padding: '7px', borderRadius: '6px', border: '1px solid #CCC', fontSize: '0.8rem', width: '100%', boxSizing: 'border-box' },
  filaHorarios: { display: 'flex', gap: '8px' },
  mensajeFeedback: { fontSize: '0.75rem', color: '#00796B', backgroundColor: '#E0F2F1', padding: '6px', borderRadius: '4px', textAlign: 'center', margin: '4px 0', fontWeight: 'bold' },
  
  contenedorBotonesAccion: { display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' },
  botonGuardarPrincipal: { width: '100%', padding: '10px', borderRadius: '6px', border: 'none', background: 'linear-gradient(90deg, #00A89F 0%, #88D84D 100%)', color: '#FFF', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' },
  filaAccionesSecundarias: { display: 'flex', gap: '6px' },
  botonWs: { flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: '#25D366', color: '#FFF', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' },
  botonCorreo: { flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: '#0288D1', color: '#FFF', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' },
  botonCerrarModal: { width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #CCC', background: '#FFF', color: '#666', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '2px' }
};
