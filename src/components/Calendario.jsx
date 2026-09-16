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
  const [restricciones, setRestricciones] = useState([]);
  const [jornadaChair, setJornadaChair] = useState({ inicio: '08:30', fin: '22:30' });
  
  const [vistaActual, setVistaActual] = useState('month');
  const [fechaActualCalendario, setFechaActualCalendario] = useState(new Date());

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
      const { data: configData } = await supabase
        .from('agd_configuracion_chair')
        .select('jornada_inicio, jornada_fin')
        .eq('usuario_id', usuarioId)
        .maybeSingle();

      if (configData) {
        setJornadaChair({
          inicio: configData.jornada_inicio ? configData.jornada_inicio.substring(0, 5) : '08:30',
          fin: configData.jornada_fin ? configData.jornada_fin.substring(0, 5) : '22:30'
        });
      }

      const { data: dataEmp } = await supabase
        .from('usuarios')
        .select('id, nombre_completo, telefono, email, rol');
      if (dataEmp) setEmpresarios(dataEmp);

      const { data: dataCitas } = await supabase
        .from('agd_citas')
        .select('*')
        .eq('chair_id', usuarioId);
      if (dataCitas) setCitas(dataCitas);

      const { data: dataRest } = await supabase
        .from('agd_restricciones_disponibilidad')
        .select('*')
        .eq('usuario_id', usuarioId);
      if (dataRest) setRestricciones(dataRest);

    } catch (err) {
      console.error('Error cargando datos del calendario:', err);
    }
  };

  const eventosCalendario = useMemo(() => {
    return citas
      .filter(c => c.estado !== 'cancelado')
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

  const esHorarioRestringido = (fechaStr, hInicio, hFin) => {
    const aMinutos = (hStr) => {
      const [h, m] = hStr.split(':').map(Number);
      return h * 60 + m;
    };

    const iniMin = aMinutos(hInicio);
    const finMin = aMinutos(hFin);
    const jornadaIniMin = aMinutos(jornadaChair.inicio);
    const jornadaFinMin = aMinutos(jornadaChair.fin);

    if (iniMin < jornadaIniMin || finMin > jornadaFinMin) {
      return 'Fuera de la jornada laboral configurada.';
    }

    const restDia = restricciones.find(r => r.fecha_especifica?.substring(0, 10) === fechaStr);
    if (!restDia) return null;

    if (restDia.bloqueado_todo_el_dia) {
      return 'Este día se encuentra totalmente bloqueado por restricciones.';
    }

    const tramos = [
      { i: restDia.tramo_1_inicio, f: restDia.tramo_1_fin },
      { i: restDia.tramo_2_inicio, f: restDia.tramo_2_fin },
      { i: restDia.tramo_3_inicio, f: restDia.tramo_3_fin },
      { i: restDia.tramo_4_inicio, f: restDia.tramo_4_fin },
    ];

    for (let t of tramos) {
      if (t.i && t.f) {
        const tIniMin = aMinutos(t.i.substring(0, 5));
        const tFinMin = aMinutos(t.f.substring(0, 5));

        if (iniMin < tFinMin && finMin > tIniMin) {
          return `El horario interfiere con un tramo restringido (${t.i.substring(0, 5)} - ${t.f.substring(0, 5)}).`;
        }
      }
    }

    return null;
  };

  const alSeleccionarSlot = ({ start, end, action }) => {
    if (vistaActual === 'month' && action === 'click') {
      setFechaActualCalendario(start);
      setVistaActual('day');
      return;
    }

    const anio = start.getFullYear();
    const mes = String(start.getMonth() + 1).padStart(2, '0');
    const dia = String(start.getDate()).padStart(2, '0');
    const fechaFormateada = `${anio}-${mes}-${dia}`;

    const horaIniStr = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
    const horaFinStr = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;

    const motivoRestriccion = esHorarioRestringido(fechaFormateada, horaIniStr, horaFinStr);
    if (motivoRestriccion) {
      alert(`⚠️ No es posible agendar en este horario:\n${motivoRestriccion}`);
      return;
    }

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

  const guardarCita = async (e) => {
    e.preventDefault();
    setMensaje('');

    const motivoRestriccion = esHorarioRestringido(fechaSeleccionadaStr, horaInicio, horaFin);
    if (motivoRestriccion) {
      setMensaje(`⚠️ Bloqueado: ${motivoRestriccion}`);
      return;
    }

    const aMinutos = (hStr) => {
      const [h, m] = hStr.split(':').map(Number);
      return h * 60 + m;
    };

    const nuevoIniMin = aMinutos(horaInicio);
    const nuevoFinMin = aMinutos(horaFin);

    const haySolape = citas.some(c => {
      if (c.estado === 'cancelado' || c.fecha_cita !== fechaSeleccionadaStr) return false;
      if (citaExistenteId && c.id === citaExistenteId) return false;

      const cIniMin = aMinutos(c.hora_inicio);
      const cFinMin = aMinutos(c.hora_fin);

      return nuevoIniMin < cFinMin && nuevoFinMin > cIniMin;
    });

    if (haySolape) {
      setMensaje('⚠️ Error: Ya existe otra cita agendada en este mismo horario.');
      return;
    }

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
        const { error } = await supabase.from('agd_citas').update(payload).eq('id', citaExistenteId);
        if (error) throw error;
        setMensaje('¡Cita actualizada correctamente!');
      } else {
        const { error } = await supabase.from('agd_citas').insert([payload]);
        if (error) throw error;
        setMensaje('¡Cita creada correctamente!');
      }

      await cargarDatosSupabase();
      setTimeout(() => setModalAbierto(false), 1000);
    } catch (err) {
      setMensaje('Error al guardar: ' + err.message);
    }
  };

  const eventPropGetter = (event) => {
    const esGrupal = event.resource.tipo_sesion === 'Grupal';
    return {
      style: {
        backgroundColor: esGrupal ? '#00796B' : '#0288D1',
        color: '#FFF',
        borderRadius: '6px',
        border: 'none',
        fontWeight: 'bold',
        fontSize: '0.78rem',
        padding: '3px 8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
      }
    };
  };

  const slotPropGetter = (date) => {
    const horaStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    const anio = date.getFullYear();
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const dia = String(date.getDate()).padStart(2, '0');
    const fechaStr = `${anio}-${mes}-${dia}`;

    const restDia = restricciones.find(r => r.fecha_especifica?.substring(0, 10) === fechaStr);
    const bloqueadoDia = restDia?.bloqueado_todo_el_dia;

    if (bloqueadoDia || horaStr < jornadaChair.inicio || horaStr >= jornadaChair.fin) {
      return {
        style: {
          backgroundColor: '#F8F9FA',
          backgroundImage: 'repeating-linear-gradient(45deg, #E9ECEF, #E9ECEF 10px, #F8F9FA 10px, #F8F9FA 20px)',
          opacity: 0.85
        }
      };
    }
    return {};
  };

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
      {/* Tarjeta de Encabezado / Leyenda Colorida */}
      <div style={estilos.tarjetaHeader}>
        <div style={estilos.tituloSeccion}>📅 Cronograma de Sesiones y Mentorías</div>
        <div style={estilos.leyenda}>
          <span style={estilos.badgeLeyendaGrupal}><b style={{color: '#004D40'}}>■</b> Cita Grupal</span>
          <span style={estilos.badgeLeyendaIndividual}><b style={{color: '#01579B'}}>■</b> Cita Individual</span>
          <span style={estilos.badgeLeyendaRestriccion}><b style={{color: '#6C757D'}}>■</b> Horario Restringido</span>
        </div>
        <div style={estilos.instruccion}>💡 <i>Haz clic en cualquier día del mes para gestionarlo en la vista detallada por Hora/Día.</i></div>
      </div>

      {/* Contenedor Principal del Calendario */}
      <div style={estilos.calendarioWrapper}>
        <Calendar
          localizer={localizer}
          events={eventosCalendario}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          selectable
          view={vistaActual}
          onView={(nuevaVista) => setVistaActual(nuevaVista)}
          date={fechaActualCalendario}
          onNavigate={(nuevaFecha) => setFechaActualCalendario(nuevaFecha)}
          onSelectSlot={alSeleccionarSlot}
          onSelectEvent={alSeleccionarEvento}
          eventPropGetter={eventPropGetter}
          slotPropGetter={slotPropGetter}
          min={new Date(1970, 0, 1, 0, 0, 0)}
          max={new Date(1970, 0, 1, 23, 59, 59)}
          messages={{
            next: 'Siguiente ❯',
            previous: '❮ Anterior',
            today: 'Hoy',
            month: 'Mes',
            week: 'Semana',
            day: 'Día',
            agenda: 'Agenda',
            date: 'Fecha',
            time: 'Hora',
            event: 'Evento',
            noEventsInRange: 'No hay citas registradas en este periodo.'
          }}
        />
      </div>

      {/* Modal Estilizado */}
      {modalAbierto && (
        <div style={estilos.modalOverlay}>
          <div style={estilos.modalContenido}>
            <div style={estilos.modalHeaderDecorado}>
              <h3 style={estilos.modalTitulo}>✨ Gestionar Cita</h3>
              <span style={estilos.modalSubFecha}>{fechaSeleccionadaStr}</span>
            </div>
            
            <form onSubmit={guardarCita} style={estilos.formularioModal}>
              <div style={estilos.grupoInput}>
                <label style={estilos.label}>Estado de la Sesión</label>
                <select 
                  value={estadoCita} 
                  onChange={(e) => setEstadoCita(e.target.value)}
                  style={{...estilos.input, fontWeight: 'bold', color: estadoCita === 'cancelado' ? '#D32F2F' : '#00796B'}}
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
                  <option value="Individual">Individual (Azul Profesional)</option>
                  <option value="Grupal">Grupal (Verde Petróleo)</option>
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
  contenedor: { padding: '15px', maxWidth: '100%', width: '100%', boxSizing: 'border-box', fontFamily: 'sans-serif', backgroundColor: '#F4F6F8' },
  
  tarjetaHeader: { backgroundColor: '#FFFFFF', padding: '15px 20px', borderRadius: '12px', boxShadow: '0 3px 10px rgba(0,0,0,0.04)', marginBottom: '15px', borderLeft: '5px solid #00A89F' },
  tituloSeccion: { fontSize: '1.1rem', fontWeight: 'bold', color: '#2C3E50', marginBottom: '8px' },
  leyenda: { display: 'flex', gap: '12px', fontSize: '0.8rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '6px' },
  badgeLeyendaGrupal: { backgroundColor: '#E0F2F1', padding: '4px 8px', borderRadius: '6px', color: '#004D40', fontWeight: 'bold' },
  badgeLeyendaIndividual: { backgroundColor: '#E1F5FE', padding: '4px 8px', borderRadius: '6px', color: '#01579B', fontWeight: 'bold' },
  badgeLeyendaRestriccion: { backgroundColor: '#F1F3F5', padding: '4px 8px', borderRadius: '6px', color: '#495057', fontWeight: 'bold' },
  instruccion: { fontSize: '0.75rem', color: '#6C757D' },

  calendarioWrapper: { height: 700, backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '14px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)', border: '1px solid #E4E7EB' },
  
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' },
  modalContenido: { backgroundColor: '#FFF', padding: '25px', borderRadius: '14px', width: '100%', maxWidth: '440px', boxSizing: 'border-box', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' },
  modalHeaderDecorado: { borderBottom: '2px solid #E0F2F1', paddingBottom: '10px', marginBottom: '15px', textAlign: 'center' },
  modalTitulo: { fontSize: '1.05rem', color: '#00796B', fontWeight: 'bold', margin: '0 0 4px 0' },
  modalSubFecha: { fontSize: '0.8rem', color: '#555', fontWeight: 'bold' },

  formularioModal: { display: 'flex', flexDirection: 'column', gap: '10px' },
  grupoInput: { display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' },
  label: { fontSize: '0.75rem', fontWeight: 'bold', color: '#34495E' },
  input: { padding: '9px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box', backgroundColor: '#FAFAFA' },
  filaHorarios: { display: 'flex', gap: '10px' },
  mensajeFeedback: { fontSize: '0.78rem', color: '#C62828', backgroundColor: '#FFEBEE', padding: '8px', borderRadius: '6px', textAlign: 'center', margin: '4px 0', fontWeight: 'bold', border: '1px solid #FFCDD2' },
  
  contenedorBotonesAccion: { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' },
  botonGuardarPrincipal: { width: '100%', padding: '11px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #00A89F 0%, #00796B 100%)', color: '#FFF', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 3px 6px rgba(0,168,159,0.3)' },
  filaAccionesSecundarias: { display: 'flex', gap: '8px' },
  botonWs: { flex: 1, padding: '9px', borderRadius: '8px', border: 'none', background: '#25D366', color: '#FFF', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 5px rgba(37,211,102,0.3)' },
  botonCorreo: { flex: 1, padding: '9px', borderRadius: '8px', border: 'none', background: '#0288D1', color: '#FFF', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 5px rgba(2,136,209,0.3)' },
  botonCerrarModal: { width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CFD8DC', background: '#FFFFFF', color: '#607D8B', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '4px' }
};
