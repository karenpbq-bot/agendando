import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Calendario({ usuarioId }) {
  const fechaActual = new Date();
  const mesActualStr = `${fechaActual.getFullYear()}-${String(fechaActual.getMonth() + 1).padStart(2, '0')}`;
  
  const [mesSeleccionado, setMesSeleccionado] = useState(mesActualStr);
  const [empresarios, setEmpresarios] = useState([]);
  const [citas, setCitas] = useState([]);
  const [restricciones, setRestricciones] = useState([]);
  
  // Estados del Modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);
  const [horaSeleccionada, setHoraSeleccionada] = useState('');
  
  // Campos del Formulario de Cita
  const [tipoSession, setTipoSession] = useState('Individual'); // 'Individual' o 'Grupal'
  const [empresarioId, setEmpresarioId] = useState('');
  const [nombreGrupo, setNombreGrupo] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [linkZoom, setLinkZoom] = useState('');
  const [replicarMes, setReplicarMes] = useState(false);
  
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    if (usuarioId) {
      cargarDatosIniciales();
    }
  }, [usuarioId, mesSeleccionado]);

  const cargarDatosIniciales = async () => {
    // 1. Cargar Empresarios / Usuarios
    const { data: dataEmpresarios } = await supabase
      .from('usuarios')
      .select('id, nombre_completo, telefono, email, rol')
      .eq('rol', 'Empresario');
    
    if (dataEmpresarios) setEmpresarios(dataEmpresarios);

    // 2. Cargar Restricciones del Mes (para calcular disponibilidad en amarillo translúcido)
    const { data: dataRest } = await supabase
      .from('agd_restricciones_disponibilidad')
      .select('*')
      .eq('usuario_id', usuarioId)
      .eq('mes_periodo', mesSeleccionado);
    
    if (dataRest) setRestricciones(dataRest);

    // 3. Cargar Citas ya agendadas
    const { data: dataCitas } = await supabase
      .from('agd_citas')
      .select('*, usuarios(nombre_completo, telefono, email)')
      .eq('chair_id', usuarioId);

    if (dataCitas) setCitas(dataCitas);
  };

  const abrirModalParaCelda = (dia, hora) => {
    setDiaSeleccionado(dia);
    setHoraSeleccionada(hora);
    setHoraInicio(hora);
    // Calcular una hora fin por defecto (ej. 1 hora después)
    const [h] = hora.split(':');
    const horaFinSugerida = `${String(parseInt(h) + 1).padStart(2, '0')}:00`;
    setHoraFin(horaFinSugerida);
    setEmpresarioId('');
    setNombreGrupo('');
    setLinkZoom('');
    setReplicarMes(false);
    setModalAbierto(true);
  };

  const guardarCita = async (e) => {
    e.preventDefault();
    setMensaje('');

    try {
      const empresObj = empresarios.find(e => e.id == empresarioId);
      const telefonoDestino = empresObj ? empresObj.telefono : '';

      // Determinar fechas a registrar (si se marca replicar, calculamos los días iguales del mes)
      const fechasAGuardar = [diaSeleccionado.fecha];
      
      if (replicarMes) {
        const nombreDiaObjetivo = diaSeleccionado.nombreDia;
        // Buscamos todas las fechas del mes que coincidan con el mismo día de la semana
        const [anio, mes] = mesSeleccionado.split('-').map(Number);
        const ultimoDia = new Date(anio, mes, 0).getDate();
        
        for (let d = 1; d <= ultimoDia; d++) {
          const fObj = new Date(anio, mes - 1, d);
          const fStr = `${anio}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const nDia = fObj.toLocaleDateString('es-ES', { weekday: 'long' });
          const nDiaCapitalizado = nDia.charAt(0).toUpperCase() + nDia.slice(1);

          if (nDiaCapitalizado === nombreDiaObjetivo && fStr !== diaSeleccionado.fecha) {
            fechasAGuardar.push(fStr);
          }
        }
      }

      // Preparar payloads
      const payloads = fechasAGuardar.map(fecha => ({
        chair_id: usuarioId,
        empresario_id: empresarioId || null,
        fecha_cita: fecha,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        tipo_sesion: tipoSession,
        nombre_grupo: tipoSession === 'Grupal' ? nombreGrupo : null,
        link_zoom: linkZoom,
        estado: 'Confirmado'
      }));

      const { error } = await supabase.from('agd_citas').insert(payloads);

      if (error) {
        setMensaje('Error al guardar cita: ' + error.message);
      } else {
        setMensaje('¡Sesión(es) agendada(s) correctamente!');
        setModalAbierto(false);
        cargarDatosIniciales();
        
        // Si hay teléfono, preparar enlace automático de WhatsApp web
        if (telefonoDestino) {
          const textoWs = encodeURIComponent(`Hola ${empresObj.nombre_completo}, te ha sido asignada una sesión de mentoría (${tipoSession}). Link de Zoom: ${linkZoom}. Por favor, confírmanos tu asistencia.`);
          window.open(`https://wa.me/${telefonoDestino}?text=${textoWs}`, '_blank');
        }
      }
    } catch (err) {
      setMensaje('Error en el proceso.');
    }
  };

  // Generar lista de días de la semana actual o del mes
  const obtenerDiasSemanaActual = () => {
    // Ejemplo simplificado de simulación de semana
    return [
      { fecha: '2026-09-14', nombreDia: 'Lunes', numero: '14' },
      { fecha: '2026-09-15', nombreDia: 'Martes', numero: '15' },
      { fecha: '2026-09-16', nombreDia: 'Miércoles', numero: '16' },
      { fecha: '2026-09-17', nombreDia: 'Jueves', numero: '17' },
      { fecha: '2026-09-18', nombreDia: 'Viernes', numero: '18' },
    ];
  };

  const horasDelDia = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];
  const diasSemana = obtenerDiasSemanaActual();

  // Comprobar si un bloque horario está en la disponibilidad del Chair (amarillo translúcido)
  const esDisponible = (nombreDia, hora) => {
    const rest = restricciones.find(r => r.dia_semana === nombreDia);
    if (!rest || rest.bloqueado_todo_el_dia) return false;

    // Verificar si la hora cae dentro de los tramos permitidos (no restringidos)
    // O viceversa, si está marcado como libre. Asumimos disponible si NO está en tramo de restricción:
    const enRestriccion = [
      { i: rest.tramo_1_inicio, f: rest.tramo_1_fin },
      { i: rest.tramo_2_inicio, f: rest.tramo_2_fin },
      { i: rest.tramo_3_inicio, f: rest.tramo_3_fin },
      { i: rest.tramo_4_inicio, f: rest.tramo_4_fin },
    ].some(t => t.i && t.f && hora >= t.i && hora < t.f);

    return !enRestriccion;
  };

  return (
    <div style={estilos.contenedor}>
      <h2 style={estilos.titulo}>Calendario de Sesiones</h2>
      
      {/* Selector de Mes */}
      <div style={estilos.seccionMes}>
        <input 
          type="month" 
          value={mesSeleccionado}
          onChange={(e) => setMesSeleccionado(e.target.value)}
          style={estilos.inputMes}
        />
      </div>

      {mensaje && <p style={estilos.mensajeGeneral}>{mensaje}</p>}

      {/* Leyenda */}
      <div style={estilos.leyenda}>
        <span style={{...estilos.bolaLeyenda, backgroundColor: '#FFF9C4'}}></span> Disponible
        <span style={{...estilos.bolaLeyenda, backgroundColor: '#D1F0EE'}}></span> Reservado
      </div>

      {/* Tabla del Calendario */}
      <div style={estilos.tablaContainer}>
        <table style={estilos.tabla}>
          <thead>
            <tr>
              <th style={estilos.thHora}>Hora</th>
              {diasSemana.map(d => (
                <th key={d.fecha} style={estilos.thDia}>{d.nombreDia} <br/><span style={estilos.numDia}>{d.numero}</span></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {horasDelDia.map(hora => (
              <tr key={hora}>
                <td style={estilos.tdHora}>{hora}</td>
                {diasSemana.map(d => {
                  const disponible = esDisponible(d.nombreDia, hora);
                  const citaEncontrada = citas.find(c => c.fecha_cita === d.fecha && hora >= c.hora_inicio && hora < c.hora_fin);

                  let estiloCelda = { ...estilos.tdCelda };
                  if (citaEncontrada) {
                    estiloCelda.backgroundColor = '#D1F0EE'; // Reservado
                  } else if (disponible) {
                    estiloCelda.backgroundColor = 'rgba(255, 235, 59, 0.3)'; // Amarillo translúcido disponible
                  }

                  return (
                    <td 
                      key={d.fecha} 
                      style={estiloCelda}
                      onClick={() => abrirModalParaCelda(d, hora)}
                    >
                      {citaEncontrada ? (
                        <span style={estilos.textoCita}>
                          {citaEncontrada.tipo_sesion === 'Grupal' ? `Grupal: ${citaEncontrada.nombre_grupo}` : 'Reservado'}
                        </span>
                      ) : disponible ? (
                        <span style={estilos.textoDisponible}>Libre</span>
                      ) : (
                        <span style={estilos.textoBloqueado}>--</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* VENTANA EMERGENTE (MODAL) DE GESTIÓN DE CITA */}
      {modalAbierto && (
        <div style={estilos.modalOverlay}>
          <div style={estilos.modalContenido}>
            <h3 style={estilos.modalTitulo}>Gestionar Sesión: {diaSeleccionado?.nombreDia} {diaSeleccionado?.fecha}</h3>
            
            <form onSubmit={guardarCita} style={estilos.formularioModal}>
              
              <div style={estilos.grupoInput}>
                <label style={estilos.label}>Tipo de Sesión</label>
                <select 
                  value={tipoSession} 
                  onChange={(e) => setTipoSession(e.target.value)}
                  style={estilos.input}
                >
                  <option value="Individual">Individual</option>
                  <option value="Grupal">Grupal</option>
                </select>
              </div>

              {tipoSession === 'Individual' ? (
                <div style={estilos.grupoInput}>
                  <label style={estilos.label}>Seleccionar Empresario</label>
                  <select 
                    value={empresarioId} 
                    onChange={(e) => setEmpresarioId(e.target.value)}
                    style={estilos.input}
                    required
                  >
                    <option value="">Seleccione...</option>
                    {empresarios.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.nombre_completo}</option>
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
                <label style={estilos.label}>Link de Reunión (Zoom)</label>
                <input 
                  type="url" 
                  value={linkZoom} 
                  onChange={(e) => setLinkZoom(e.target.value)} 
                  placeholder="https://zoom.us/j/..."
                  style={estilos.input}
                  required
                />
              </div>

              <div style={estilos.grupoCheckbox}>
                <input 
                  type="checkbox" 
                  checked={replicarMes} 
                  onChange={(e) => setReplicarMes(e.target.checked)} 
                  id="rep"
                />
                <label htmlFor="rep" style={estilos.labelCheck}>Replicar esta sesión para los siguientes {diaSeleccionado?.nombreDia}s del mes</label>
              </div>

              <div style={estilos.modalBotones}>
                <button type="button" onClick={() => setModalAbierto(false)} style={estilos.botonCerrar}>Cancelar</button>
                <button type="submit" style={estilos.botonGuardar}>Guardar y Enviar WhatsApp</button>
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
  titulo: { fontSize: '1.2rem', color: '#333333', marginBottom: '8px', textAlign: 'center' },
  seccionMes: { marginBottom: '10px', textAlign: 'center' },
  inputMes: { padding: '6px', borderRadius: '6px', border: '1px solid #CCC', fontSize: '0.85rem' },
  mensajeGeneral: { fontSize: '0.8rem', color: '#00A89F', textAlign: 'center', fontWeight: 'bold', margin: '5px 0' },
  leyenda: { display: 'flex', justifyContent: 'center', gap: '15px', fontSize: '0.75rem', marginBottom: '10px', alignItems: 'center' },
  bolaLeyenda: { width: '10px', height: '10px', borderRadius: '50%', display: 'inline-block', marginRight: '3px' },
  tablaContainer: { overflowX: 'auto', backgroundColor: '#FFF', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  tabla: { width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' },
  thHora: { padding: '8px 4px', backgroundColor: '#00A89F', color: '#FFF', textAlign: 'center', width: '45px' },
  thDia: { padding: '8px 4px', backgroundColor: '#00A89F', color: '#FFF', textAlign: 'center' },
  numDia: { fontSize: '0.9rem', fontWeight: 'bold' },
  tdHora: { padding: '8px 4px', textAlign: 'center', borderBottom: '1px solid #EEE', fontWeight: 'bold', color: '#555', backgroundColor: '#FAFAFA' },
  tdCelda: { padding: '6px', textAlign: 'center', borderBottom: '1px solid #EEE', borderRight: '1px solid #EEE', cursor: 'pointer', height: '35px' },
  textoDisponible: { fontSize: '0.65rem', color: '#B8860B', fontWeight: 'bold' },
  textoCita: { fontSize: '0.65rem', color: '#00796B', fontWeight: 'bold' },
  textoBloqueado: { color: '#CCC' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' },
  modalContenido: { backgroundColor: '#FFF', padding: '20px', borderRadius: '10px', width: '100%', maxWidth: '400px', boxSizing: 'border-box' },
  modalTitulo: { fontSize: '1rem', color: '#333', marginBottom: '15px', textAlign: 'center' },
  formularioModal: { display: 'flex', flexDirection: 'column', gap: '10px' },
  grupoInput: { display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' },
  label: { fontSize: '0.75rem', fontWeight: 'bold', color: '#444' },
  input: { padding: '8px', borderRadius: '6px', border: '1px solid #CCC', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' },
  filaHorarios: { display: 'flex', gap: '8px' },
  grupoCheckbox: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '5px' },
  labelCheck: { fontSize: '0.75rem', color: '#333', cursor: 'pointer' },
  modalBotones: { display: 'flex', gap: '10px', marginTop: '15px' },
  botonCerrar: { flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #CCC', background: '#FFF', color: '#666', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' },
  botonGuardar: { flex: 2, padding: '10px', borderRadius: '6px', border: 'none', background: 'linear-gradient(90deg, #00A89F 0%, #88D84D 100%)', color: '#FFF', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }
};
