import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Calendario({ usuarioId }) {
  const fechaActual = new Date();
  const mesActualStr = `${fechaActual.getFullYear()}-${String(fechaActual.getMonth() + 1).padStart(2, '0')}`;
  
  const [mesSeleccionado, setMesSeleccionado] = useState(mesActualStr);
  const [diasSemanaMes, setDiasSemanaMes] = useState([]);
  const [empresarios, setEmpresarios] = useState([]);
  const [citas, setCitas] = useState([]);
  const [restricciones, setRestricciones] = useState([]);
  
  // Estados del Modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);
  const [citaExistenteId, setCitaExistenteId] = useState(null);
  
  // Campos del Formulario de Cita
  const [tipoSession, setTipoSession] = useState('Individual');
  const [empresarioId, setEmpresarioId] = useState('');
  const [nombreGrupo, setNombreGrupo] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [linkZoom, setLinkZoom] = useState('');
  const [estadoCita, setEstadoCita] = useState('confirmado');
  const [replicarMes, setReplicarMes] = useState(false);
  
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    if (usuarioId && mesSeleccionado) {
      generarDiasDelMesYCargar(mesSeleccionado);
    }
  }, [usuarioId, mesSeleccionado]);

  const generarDiasDelMesYCargar = async (mesStr) => {
    const partes = mesStr.split('-');
    const anio = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10);
    
    const ultimoDia = new Date(anio, mes, 0).getDate();
    const listaDias = [];
    
    for (let d = 1; d <= ultimoDia; d++) {
      const fechaObj = new Date(anio, mes - 1, d);
      const fechaFormateada = `${anio}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const nombreDia = fechaObj.toLocaleDateString('es-ES', { weekday: 'long' });
      
      listaDias.push({
        fecha: fechaFormateada,
        diaNumero: String(d).padStart(2, '0'),
        nombreDia: nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1)
      });
    }
    setDiasSemanaMes(listaDias);

    // 1. Cargar Empresarios
    const { data: dataEmpresarios } = await supabase
      .from('usuarios')
      .select('id, nombre_completo, telefono, email, rol')
      .eq('rol', 'Empresario');
    if (dataEmpresarios) setEmpresarios(dataEmpresarios);

    // 2. Cargar Restricciones del Mes desde Supabase
    const { data: dataRest } = await supabase
      .from('agd_restricciones_disponibilidad')
      .select('*')
      .eq('usuario_id', usuarioId)
      .eq('mes_periodo', mesStr);
    
    if (dataRest) setRestricciones(dataRest);

    // 3. Cargar Citas Agendadas
    const { data: dataCitas } = await supabase
      .from('agd_citas')
      .select('*, usuarios(nombre_completo, telefono, email)')
      .eq('chair_id', usuarioId);
    if (dataCitas) setCitas(dataCitas);
  };

  const abrirModalParaCelda = (dia, hora, citaEncontrada = null) => {
    setDiaSeleccionado(dia);
    
    if (citaEncontrada) {
      setCitaExistenteId(citaEncontrada.id);
      setTipoSession(citaEncontrada.tipo_sesion || 'Individual');
      setEmpresarioId(citaEncontrada.empresario_id || '');
      setNombreGrupo(citaEncontrada.nombre_grupo || '');
      setHoraInicio(citaEncontrada.hora_inicio || hora);
      setHoraFin(citaEncontrada.hora_fin || '');
      setLinkZoom(citaEncontrada.link_zoom || '');
      setEstadoCita(citaEncontrada.estado || 'confirmado');
    } else {
      setCitaExistenteId(null);
      setHoraInicio(hora);
      const [h] = hora.split(':');
      setHoraFin(`${String(parseInt(h) + 1).padStart(2, '0')}:00`);
      setTipoSession('Individual');
      setEmpresarioId('');
      setNombreGrupo('');
      setLinkZoom('');
      setEstadoCita('confirmado');
      setReplicarMes(false);
    }
    setModalAbierto(true);
  };

  const guardarCita = async (e) => {
    e.preventDefault();
    setMensaje('');

    try {
      const empresObj = empresarios.find(e => e.id == empresarioId);
      const telefonoDestino = empresObj ? empresObj.telefono : '';

      if (citaExistenteId) {
        const { error } = await supabase.from('agd_citas')
          .update({
            empresario_id: empresarioId || null,
            hora_inicio: horaInicio,
            hora_fin: horaFin,
            tipo_sesion: tipoSession,
            nombre_grupo: tipoSession === 'Grupal' ? nombreGrupo : null,
            link_zoom: linkZoom,
            estado: estadoCita
          })
          .eq('id', citaExistenteId);

        if (error) throw error;
        setMensaje('¡Cita actualizada correctamente!');
      } else {
        const fechasAGuardar = [diaSeleccionado.fecha];
        
        if (replicarMes) {
          const nombreDiaObjetivo = diaSeleccionado.nombreDia;
          diasSemanaMes.forEach(d => {
            if (d.nombreDia === nombreDiaObjetivo && d.fecha !== diaSeleccionado.fecha) {
              fechasAGuardar.push(d.fecha);
            }
          });
        }

        const payloads = fechasAGuardar.map(fecha => ({
          chair_id: usuarioId,
          empresario_id: empresarioId || null,
          fecha_cita: fecha,
          hora_inicio: horaInicio,
          hora_fin: horaFin,
          tipo_sesion: tipoSession,
          nombre_grupo: tipoSession === 'Grupal' ? nombreGrupo : null,
          link_zoom: linkZoom,
          estado: estadoCita
        }));

        const { error } = await supabase.from('agd_citas').insert(payloads);
        if (error) throw error;
        setMensaje('¡Sesión(es) agendada(s) correctamente!');
      }

      setModalAbierto(false);
      generarDiasDelMesYCargar(mesSeleccionado);
      
      if (telefonoDestino && estadoCita !== 'cancelado') {
        const textoWs = encodeURIComponent(`Hola ${empresObj.nombre_completo}, tu sesión ha quedado en estado *${estadoCita.toUpperCase()}*. Link de Zoom: ${linkZoom}. Por favor, confírmanos tu asistencia.`);
        window.open(`https://wa.me/${telefonoDestino}?text=${textoWs}`, '_blank');
      }

    } catch (err) {
      setMensaje('Error en el proceso: ' + err.message);
    }
  };

  const horasDelDia = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];

  const esDisponible = (fecha, nombreDia, hora) => {
    const restriccionFecha = restricciones.find(r => r.fecha_especifica === fecha);
    let restAConsultar = restriccionFecha;

    if (!restAConsultar) {
      restAConsultar = restricciones.find(r => r.dia_semana === nombreDia && (!r.fecha_especifica || r.fecha_especifica === ''));
    }

    if (restAConsultar && restAConsultar.bloqueado_todo_el_dia) {
      return false;
    }

    if (restAConsultar) {
      const enRestriccion = [
        { i: restAConsultar.tramo_1_inicio, f: restAConsultar.tramo_1_fin },
        { i: restAConsultar.tramo_2_inicio, f: restAConsultar.tramo_2_fin },
        { i: restAConsultar.tramo_3_inicio, f: restAConsultar.tramo_3_fin },
        { i: restAConsultar.tramo_4_inicio, f: restAConsultar.tramo_4_fin },
      ].some(t => t.i && t.f && hora >= t.i && hora < t.f);

      if (enRestriccion) return false;
    }

    return true;
  };

  return (
    <div style={estilos.contenedor}>
      <h2 style={estilos.titulo}>Calendario de Sesiones</h2>
      
      <div style={estilos.seccionMes}>
        <input 
          type="month" 
          value={mesSeleccionado}
          onChange={(e) => setMesSeleccionado(e.target.value)}
          style={estilos.inputMes}
        />
      </div>

      {mensaje && <p style={estilos.mensajeGeneral}>{mensaje}</p>}

      <div style={estilos.leyenda}>
        <span><b style={{color: '#B8860B'}}>■</b> Disponible</span>
        <span><b style={{color: '#E65100'}}>■</b> Reservado</span>
        <span><b style={{color: '#00796B'}}>■</b> Confirmado</span>
        <span><b style={{color: '#D32F2F'}}>■</b> Cancelado</span>
      </div>

      <div style={estilos.tablaContainer}>
        <table style={estilos.tabla}>
          <thead>
            <tr>
              <th style={estilos.thHora}>Hora</th>
              {diasSemanaMes.map(d => (
                <th key={d.fecha} style={estilos.thDia}>
                  {d.nombreDia.slice(0, 3)} <br/><span style={estilos.numDia}>{d.diaNumero}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {horasDelDia.map(hora => (
              <tr key={hora}>
                <td style={estilos.tdHora}>{hora}</td>
                {diasSemanaMes.map(d => {
                  const disponible = esDisponible(d.fecha, d.nombreDia, hora);
                  const citaEncontrada = citas.find(c => c.fecha_cita === d.fecha && hora >= c.hora_inicio && hora < c.hora_fin);

                  let estiloCelda = { ...estilos.tdCelda };
                  if (citaEncontrada) {
                    if (citaEncontrada.estado === 'reservado') estiloCelda.backgroundColor = '#FFE0B2';
                    else if (citaEncontrada.estado === 'confirmado') estiloCelda.backgroundColor = '#D1F0EE';
                    else if (citaEncontrada.estado === 'cancelado') estiloCelda.backgroundColor = '#FFCDD2';
                  } else if (disponible) {
                    estiloCelda.backgroundColor = 'rgba(255, 235, 59, 0.3)';
                  }

                  return (
                    <td 
                      key={d.fecha} 
                      style={estiloCelda}
                      onClick={() => abrirModalParaCelda(d, hora, citaEncontrada)}
                    >
                      {citaEncontrada ? (
                        <span style={estilos.textoCita}>
                          {citaEncontrada.estado.toUpperCase().substring(0, 3)}: {citaEncontrada.tipo_sesion === 'Grupal' ? citaEncontrada.nombre_grupo : 'Ind.'}
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

      {/* MODAL */}
      {modalAbierto && (
        <div style={estilos.modalOverlay}>
          <div style={estilos.modalContenido}>
            <h3 style={estilos.modalTitulo}>Gestionar Cita: {diaSeleccionado?.nombreDia} {diaSeleccionado?.fecha}</h3>
            
            <form onSubmit={guardarCita} style={estilos.formularioModal}>
              
              <div style={estilos.grupoInput}>
                <label style={estilos.label}>Estado de la Sesión</label>
                <select 
                  value={estadoCita} 
                  onChange={(e) => setEstadoCita(e.target.value)}
                  style={{...estilos.input, fontWeight: 'bold'}}
                >
                  <option value="reservado">Reservado</option>
                  <option value="confirmado">Confirmado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

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

              {!citaExistenteId && (
                <div style={estilos.grupoCheckbox}>
                  <input 
                    type="checkbox" 
                    checked={replicarMes} 
                    onChange={(e) => setReplicarMes(e.target.checked)} 
                    id="rep"
                  />
                  <label htmlFor="rep" style={estilos.labelCheck}>Replicar sesión a los siguientes {diaSeleccionado?.nombreDia}s del mes</label>
                </div>
              )}

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
  leyenda: { display: 'flex', justifyContent: 'center', gap: '8px', fontSize: '0.65rem', marginBottom: '10px', alignItems: 'center', flexWrap: 'wrap' },
  tablaContainer: { overflowX: 'auto', backgroundColor: '#FFF', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  tabla: { width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem' },
  thHora: { padding: '6px 2px', backgroundColor: '#00A89F', color: '#FFF', textAlign: 'center', width: '40px' },
  thDia: { padding: '6px 2px', backgroundColor: '#00A89F', color: '#FFF', textAlign: 'center', minWidth: '45px' },
  numDia: { fontSize: '0.8rem', fontWeight: 'bold' },
  tdHora: { padding: '6px 2px', textAlign: 'center', borderBottom: '1px solid #EEE', fontWeight: 'bold', color: '#555', backgroundColor: '#FAFAFA' },
  tdCelda: { padding: '4px', textAlign: 'center', borderBottom: '1px solid #EEE', borderRight: '1px solid #EEE', cursor: 'pointer', height: '32px' },
  textoDisponible: { fontSize: '0.6rem', color: '#B8860B', fontWeight: 'bold' },
  textoCita: { fontSize: '0.55rem', color: '#333', fontWeight: 'bold' },
  textoBloqueado: { color: '#CCC', fontSize: '0.6rem' },
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
