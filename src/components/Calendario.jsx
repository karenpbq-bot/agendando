import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Calendario({ usuarioId }) {
  const fechaActual = new Date();
  const mesActualStr = `${fechaActual.getFullYear()}-${String(fechaActual.getMonth() + 1).padStart(2, '0')}`;
  
  const [mesSeleccionado, setMesSeleccionado] = useState(mesActualStr);
  const [vistaEscala, setVistaEscala] = useState('mes');
  
  const [diasSemanaMes, setDiasSemanaMes] = useState([]);
  const [empresarios, setEmpresarios] = useState([]);
  const [citas, setCitas] = useState([]);
  const [restricciones, setRestricciones] = useState([]);
  
  const [modalAbierto, setModalAbierto] = useState(false);
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);
  const [citaExistenteId, setCitaExistenteId] = useState(null);
  
  const [tipoSession, setTipoSession] = useState('Individual');
  const [empresarioId, setEmpresarioId] = useState('');
  const [nombreGrupo, setNombreGrupo] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [linkZoom, setLinkZoom] = useState('');
  const [estadoCita, setEstadoCita] = useState('confirmado');
  const [replicarMes, setReplicarMes] = useState(false);
  
  const [mensaje, setMensaje] = useState('');

  // Generador de días según la vista seleccionada (1 mes o trimestre)
  useEffect(() => {
    const [anio, mes] = mesSeleccionado.split('-').map(Number);
    let mesesAProcesar = [mesSeleccionado];

    if (vistaEscala === 'trimestre') {
      const fechaAnterior = new Date(anio, mes - 2, 1);
      const fechaProxima = new Date(anio, mes, 1);
      
      const mesAntStr = `${fechaAnterior.getFullYear()}-${String(fechaAnterior.getMonth() + 1).padStart(2, '0')}`;
      const mesProxStr = `${fechaProxima.getFullYear()}-${String(fechaProxima.getMonth() + 1).padStart(2, '0')}`;
      
      mesesAProcesar = [mesAntStr, mesSeleccionado, mesProxStr];
    }

    let listaDiasTotal = [];
    mesesAProcesar.forEach(mStr => {
      const [y, m] = mStr.split('-').map(Number);
      const ultimoDia = new Date(y, m, 0).getDate();
      for (let d = 1; d <= ultimoDia; d++) {
        const fechaObj = new Date(y, m - 1, d);
        const fechaFormateada = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const nombreDia = fechaObj.toLocaleDateString('es-ES', { weekday: 'long' });
        
        listaDiasTotal.push({
          fecha: fechaFormateada,
          mesPeriodo: mStr,
          diaNumero: String(d).padStart(2, '0'),
          nombreDia: nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1)
        });
      }
    });

    setDiasSemanaMes(listaDiasTotal);
  }, [mesSeleccionado, vistaEscala]);

  useEffect(() => {
    if (usuarioId && diasSemanaMes.length > 0) {
      cargarDatosSupabase();
    }
  }, [usuarioId, mesSeleccionado, vistaEscala, diasSemanaMes]);

  const cargarDatosSupabase = async () => {
    try {
      const { data: dataEmpresarios } = await supabase
        .from('usuarios')
        .select('id, nombre_completo, telefono, email, rol')
        .eq('rol', 'Empresario');
      if (dataEmpresarios) setEmpresarios(dataEmpresarios);

      const [anio, mes] = mesSeleccionado.split('-').map(Number);
      let mesesFiltro = [mesSeleccionado];
      if (vistaEscala === 'trimestre') {
        const fAnt = new Date(anio, mes - 2, 1);
        const fProx = new Date(anio, mes, 1);
        mesesFiltro.push(
          `${fAnt.getFullYear()}-${String(fAnt.getMonth() + 1).padStart(2, '0')}`,
          `${fProx.getFullYear()}-${String(fProx.getMonth() + 1).padStart(2, '0')}`
        );
      }

      // Consulta de restricciones usando mes_periodo
      const { data: dataRest, error: errorRest } = await supabase
        .from('agd_restricciones_disponibilidad')
        .select('*')
        .eq('usuario_id', usuarioId)
        .in('mes_periodo', mesesFiltro);

      if (errorRest) console.error('Error cargando restricciones:', errorRest);

      // Auditoría exacta de los datos obtenidos de Supabase
      console.log('DATOS RECIBIDOS DE SUPABASE:', { usuarioId, mesesFiltro, dataRest });

      if (dataRest) {
        setRestricciones(dataRest);
      }

      const { data: dataCitas } = await supabase
        .from('agd_citas')
        .select('*, usuarios(nombre_completo, telefono, email)')
        .eq('chair_id', usuarioId);
      if (dataCitas) setCitas(dataCitas);
    } catch (err) {
      console.error('Error cargando datos de Supabase:', err);
    }
  };

  /**
   * REGLA DE DISPONIBILIDAD CORREGIDA:
   * Por defecto, el calendario asume que el día NO está disponible (gris) 
   * a menos que la hora caiga explícitamente dentro de un tramo laboral configurado 
   * y el día no esté bloqueado por completo.
   */
  const esDisponible = (fecha, hora) => {
    const restriccionDia = restricciones.find(r => {
      if (!r.fecha_especifica) return false;
      return r.fecha_especifica.substring(0, 10) === fecha;
    });

    // 1. Si el día entero está marcado como bloqueado, no está disponible (gris)
    if (restriccionDia && restriccionDia.bloqueado_todo_el_dia === true) {
      return false;
    }

    // 2. Si no hay ningún registro de restricciones para este día, todo está libre (disponible)
    if (!restriccionDia) return true;

    // Función para convertir "HH:MM:SS" o "HH:MM" a minutos totales desde medianoche
    const aMinutos = (strHora) => {
      if (!strHora) return null;
      const partes = strHora.split(':');
      const h = parseInt(partes[0] || 0, 10);
      const m = parseInt(partes[1] || 0, 10);
      return h * 60 + m;
    };

    const minCeldaInicio = aMinutos(hora);
    if (minCeldaInicio === null) return true;
    const minCeldaFin = minCeldaInicio + 60; // Cada celda representa 1 hora

    const tramosRestringidos = [
      { i: restriccionDia.tramo_1_inicio, f: restriccionDia.tramo_1_fin },
      { i: restriccionDia.tramo_2_inicio, f: restriccionDia.tramo_2_fin },
      { i: restriccionDia.tramo_3_inicio, f: restriccionDia.tramo_3_fin },
      { i: restriccionDia.tramo_4_inicio, f: restriccionDia.tramo_4_fin },
    ];

    // 3. Verificamos si la celda se cruza con CUALQUIER tramo de restricción guardado
    for (let t of tramosRestringidos) {
      const minInicioTramo = aMinutos(t.i);
      const minFinTramo = aMinutos(t.f);

      if (minInicioTramo !== null && minFinTramo !== null) {
        if (minCeldaInicio < minFinTramo && minCeldaFin > minInicioTramo) {
          return false; // Está dentro de una restricción -> BLOQUEADO (Gris)
        }
      }
    }

    // 4. Si no cayó en ninguna restricción -> LIBRE (Amarillo)
    return true;
  };

  const abrirModalParaCelda = (dia, hora, citaEncontrada = null) => {
    const disponible = esDisponible(dia.fecha, hora);
    // Si la celda no está disponible y no hay una cita agendada ahí, prohibir abrir el modal
    if (!disponible && !citaEncontrada) return;

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

  const seleccionarEmpresario = (idEmp) => {
    setEmpresarioId(idEmp);
    if (idEmp) {
      const ultimaCitaEmpresario = citas.find(c => c.empresario_id == idEmp && c.link_zoom);
      if (ultimaCitaEmpresario) {
        setLinkZoom(ultimaCitaEmpresario.link_zoom);
      }
    }
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
            if (d.nombreDia === nombreDiaObjetivo && d.fecha !== diaSeleccionado.fecha && d.mesPeriodo === diaSeleccionado.mesPeriodo) {
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
      cargarDatosSupabase();
      
      if (telefonoDestino && estadoCita !== 'cancelado') {
        const textoWs = encodeURIComponent(`Hola ${empresObj.nombre_completo}, tu sesión ha quedado en estado *${estadoCita.toUpperCase()}*. Link de Zoom: ${linkZoom}.`);
        window.open(`https://wa.me/${telefonoDestino}?text=${textoWs}`, '_blank');
      }

    } catch (err) {
      setMensaje('Error en el proceso: ' + err.message);
    }
  };

  const horasDelDia = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];

  const estilosEscala = {
    fontSize: vistaEscala === 'trimestre' ? '0.45rem' : '0.7rem',
    minWidth: vistaEscala === 'trimestre' ? '22px' : '45px',
    height: vistaEscala === 'trimestre' ? '22px' : '32px'
  };

  return (
    <div style={estilos.contenedor}>
      <h2 style={estilos.titulo}>Calendario de Sesiones</h2>
      
      <div style={estilos.controlesSuperiores}>
        <div style={estilos.grupoMes}>
          <label style={estilos.labelControl}>Mes Base:</label>
          <input 
            type="month" 
            value={mesSeleccionado}
            onChange={(e) => setMesSeleccionado(e.target.value)}
            style={estilos.inputMes}
          />
        </div>
        <div style={estilos.zoomContainer}>
          <button 
            type="button" 
            onClick={() => setVistaEscala('mes')}
            style={{ ...estilos.btnZoom, backgroundColor: vistaEscala === 'mes' ? '#00A89F' : '#E0E0E0', color: vistaEscala === 'mes' ? '#FFF' : '#333' }}
          >
            Mes (Estándar)
          </button>
          <button 
            type="button" 
            onClick={() => setVistaEscala('trimestre')}
            style={{ ...estilos.btnZoom, backgroundColor: vistaEscala === 'trimestre' ? '#00A89F' : '#E0E0E0', color: vistaEscala === 'trimestre' ? '#FFF' : '#333' }}
          >
            Zoom 3 Meses
          </button>
        </div>
      </div>

      {mensaje && <p style={estilos.mensajeGeneral}>{mensaje}</p>}

      <div style={estilos.leyenda}>
        <span><b style={{color: '#B8860B'}}>■</b> Disponible</span>
        <span><b style={{color: '#E65100'}}>■</b> Reservado</span>
        <span><b style={{color: '#00796B'}}>■</b> Confirmado</span>
        <span><b style={{color: '#D32F2F'}}>■</b> Cancelado</span>
      </div>

      <div style={estilos.tablaContainer}>
        <table style={{ ...estilos.tabla, fontSize: estilosEscala.fontSize }}>
          <thead>
            <tr>
              <th style={estilos.thHora}>Hora</th>
              {diasSemanaMes.map(d => (
                <th key={d.fecha} style={{ ...estilos.thDia, minWidth: estilosEscala.minWidth }}>
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
                  const disponible = esDisponible(d.fecha, hora);
                  const citaEncontrada = citas.find(c => c.fecha_cita === d.fecha && hora >= c.hora_inicio && hora < c.hora_fin);

                  let estiloCelda = { ...estilos.tdCelda, height: estilosEscala.height };
                  
                  if (citaEncontrada) {
                    if (citaEncontrada.estado === 'reservado') estiloCelda.backgroundColor = '#FFE0B2';
                    else if (citaEncontrada.estado === 'confirmado') estiloCelda.backgroundColor = '#D1F0EE';
                    else if (citaEncontrada.estado === 'cancelado') estiloCelda.backgroundColor = '#FFCDD2';
                  } else if (disponible) {
                    estiloCelda.backgroundColor = 'rgba(255, 235, 59, 0.3)';
                    estiloCelda.cursor = 'pointer';
                  } else {
                    estiloCelda.backgroundColor = '#EAEAEA';
                    estiloCelda.cursor = 'not-allowed';
                  }

                  return (
                    <td 
                      key={d.fecha} 
                      style={estiloCelda}
                      onClick={() => abrirModalParaCelda(d, hora, citaEncontrada)}
                    >
                      {citaEncontrada ? (
                        <span style={{ ...estilos.textoCita, fontSize: vistaEscala === 'trimestre' ? '0.35rem' : '0.55rem' }}>
                          {citaEncontrada.estado.toUpperCase().substring(0, 3)}
                        </span>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
                    onChange={(e) => seleccionarEmpresario(e.target.value)}
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
                <label style={estilos.label}>Link de Reunión (Zoom Recurrente)</label>
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
  controlesSuperiores: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '8px', flexWrap: 'wrap', backgroundColor: '#FFF', padding: '8px', borderRadius: '8px', border: '1px solid #EAEAEA' },
  grupoMes: { display: 'flex', alignItems: 'center', gap: '6px' },
  labelControl: { fontSize: '0.75rem', fontWeight: 'bold', color: '#444' },
  inputMes: { padding: '6px', borderRadius: '6px', border: '1px solid #CCC', fontSize: '0.8rem' },
  zoomContainer: { display: 'flex', gap: '4px' },
  btnZoom: { padding: '6px 10px', borderRadius: '6px', border: 'none', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' },
  mensajeGeneral: { fontSize: '0.8rem', color: '#00A89F', textAlign: 'center', fontWeight: 'bold', margin: '5px 0' },
  leyenda: { display: 'flex', justifyContent: 'center', gap: '8px', fontSize: '0.65rem', marginBottom: '10px', alignItems: 'center', flexWrap: 'wrap' },
  tablaContainer: { overflowX: 'auto', backgroundColor: '#FFF', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  tabla: { width: '100%', borderCollapse: 'collapse' },
  thHora: { padding: '6px 2px', backgroundColor: '#00A89F', color: '#FFF', textAlign: 'center', width: '40px' },
  thDia: { padding: '6px 2px', backgroundColor: '#00A89F', color: '#FFF', textAlign: 'center' },
  numDia: { fontWeight: 'bold' },
  tdHora: { padding: '6px 2px', textAlign: 'center', borderBottom: '1px solid #EEE', fontWeight: 'bold', color: '#555', backgroundColor: '#FAFAFA' },
  tdCelda: { padding: '2px', textAlign: 'center', borderBottom: '1px solid #EEE', borderRight: '1px solid #EEE' },
  textoCita: { color: '#333', fontWeight: 'bold' },
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
