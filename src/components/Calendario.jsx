import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Calendario({ usuarioId }) {
  const fechaActual = new Date();
  const mesActualStr = `${fechaActual.getFullYear()}-${String(fechaActual.getMonth() + 1).padStart(2, '0')}`;
  
  const [mesSeleccionado, setMesSeleccionado] = useState(mesActualStr);
  const [vistaEscala, setVistaEscala] = useState('mes'); // 'mes', 'semana', 'trimestre'
  
  const [diasSemanaMes, setDiasSemanaMes] = useState([]);
  const [empresarios, setEmpresarios] = useState([]);
  const [citas, setCitas] = useState([]);
  const [restricciones, setRestricciones] = useState([]);
  
  const [jornadaChair, setJornadaChair] = useState({ 
    inicio: '08:30', 
    fin: '22:30',
    duracionSesion: 45,
    buffer: 15
  });

  const horasDelDia = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
  const subBloquesCincoMin = Array.from({ length: 12 }, (_, i) => i * 5);

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

  // Generador de días según la vista seleccionada
  useEffect(() => {
    const [anio, mes] = mesSeleccionado.split('-').map(Number);
    let listaDiasTotal = [];

    if (vistaEscala === 'semana') {
      const primerDiaMes = new Date(anio, mes - 1, 1);
      let diaInicioSemana = new Date(primerDiaMes);
      
      for (let i = 0; i < 7; i++) {
        const dObj = new Date(diaInicioSemana);
        dObj.setDate(diaInicioSemana.getDate() + i);
        
        const y = dObj.getFullYear();
        const m = dObj.getMonth() + 1;
        const d = dObj.getDate();
        const fechaFormateada = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const nombreDia = dObj.toLocaleDateString('es-ES', { weekday: 'long' });

        listaDiasTotal.push({
          fecha: fechaFormateada,
          mesPeriodo: `${y}-${String(m).padStart(2, '0')}`,
          diaNumero: String(d).padStart(2, '0'),
          nombreDia: nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1)
        });
      }
    } else {
      let mesesAProcesar = [mesSeleccionado];

      if (vistaEscala === 'trimestre') {
        const fechaAnterior = new Date(anio, mes - 2, 1);
        const fechaProxima = new Date(anio, mes, 1);
        
        const mesAntStr = `${fechaAnterior.getFullYear()}-${String(fechaAnterior.getMonth() + 1).padStart(2, '0')}`;
        const mesProxStr = `${fechaProxima.getFullYear()}-${String(fechaProxima.getMonth() + 1).padStart(2, '0')}`;
        
        mesesAProcesar = [mesAntStr, mesSeleccionado, mesProxStr];
      }

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
    }

    setDiasSemanaMes(listaDiasTotal);
  }, [mesSeleccionado, vistaEscala]);

  useEffect(() => {
    if (usuarioId && diasSemanaMes.length > 0) {
      cargarDatosSupabase();
    }
  }, [usuarioId, mesSeleccionado, vistaEscala, diasSemanaMes]);

  const cargarDatosSupabase = async () => {
    try {
      const { data: configData } = await supabase
        .from('agd_configuracion_chair')
        .select('jornada_inicio, jornada_fin, duracion_sesion_minutos, tiempo_buffer_minutos')
        .eq('usuario_id', usuarioId)
        .maybeSingle();

      if (configData) {
        setJornadaChair({
          inicio: configData.jornada_inicio ? configData.jornada_inicio.substring(0, 5) : '08:30',
          fin: configData.jornada_fin ? configData.jornada_fin.substring(0, 5) : '22:30',
          duracionSesion: configData.duracion_sesion_minutos || 45,
          buffer: configData.tiempo_buffer_minutos || 15
        });
      }

      const { data: dataEmpresarios } = await supabase
        .from('usuarios')
        .select('id, nombre_completo, telefono, email, rol');
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

      const { data: dataRest } = await supabase
        .from('agd_restricciones_disponibilidad')
        .select('*')
        .eq('usuario_id', usuarioId)
        .in('mes_periodo', mesesFiltro);

      if (dataRest) setRestricciones(dataRest);

      // Cargar citas del Chair (compatible con IDs numéricos)
      const { data: dataCitas, error: errCitas } = await supabase
        .from('agd_citas')
        .select('*, usuarios!agd_citas_empresario_id_fkey(nombre_completo, telefono, email)');

      if (errCitas) {
        // Fallback si la relación foreign key tiene otro nombre
        const { data: dataCitasSimple } = await supabase
          .from('agd_citas')
          .select('*')
          .eq('chair_id', usuarioId);
        
        if (dataCitasSimple) setCitas(dataCitasSimple);
      } else if (dataCitas) {
        // Filtramos por el chair_id actual de manera estricta
        const citasFiltradas = dataCitas.filter(c => Number(c.chair_id) === Number(usuarioId));
        setCitas(citasFiltradas);
      }
    } catch (err) {
      console.error('Error general cargando datos de Supabase:', err);
    }
  };

  const esDisponibleCincoMin = (fecha, minInicioSeg, minFinSeg) => {
    const aMinutos = (strHora) => {
      if (!strHora) return null;
      const partes = strHora.split(':');
      return parseInt(partes[0] || 0, 10) * 60 + parseInt(partes[1] || 0, 10);
    };

    const minJornadaIni = aMinutos(jornadaChair.inicio);
    const minJornadaFin = aMinutos(jornadaChair.fin);

    if (minFinSeg <= minJornadaIni || minInicioSeg >= minJornadaFin) {
      return false; 
    }

    // Revisar cita activa en este segmento
    const citaActivaEnEsteMinuto = citas.some(c => {
      if (c.fecha_cita !== fecha || c.estado === 'cancelado') return false;
      const [hIniC, mIniC] = c.hora_inicio.split(':').map(Number);
      const minIniC = hIniC * 60 + (mIniC || 0);
      const [hFinC, mFinC] = c.hora_fin.split(':').map(Number);
      const minFinC = hFinC * 60 + (mFinC || 0);
      return minInicioSeg < minFinC && minFinSeg > minIniC;
    });

    if (citaActivaEnEsteMinuto) return false;

    const restriccionDia = restricciones.find(r => {
      if (!r.fecha_especifica) return false;
      return r.fecha_especifica.substring(0, 10) === fecha;
    });

    if (restriccionDia && restriccionDia.bloqueado_todo_el_dia === true) {
      return false;
    }

    if (!restriccionDia) return true;

    const tramosRestringidos = [
      { i: restriccionDia.tramo_1_inicio, f: restriccionDia.tramo_1_fin },
      { i: restriccionDia.tramo_2_inicio, f: restriccionDia.tramo_2_fin },
      { i: restriccionDia.tramo_3_inicio, f: restriccionDia.tramo_3_fin },
      { i: restriccionDia.tramo_4_inicio, f: restriccionDia.tramo_4_fin },
    ];

    for (let t of tramosRestringidos) {
      const minInicioTramo = aMinutos(t.i);
      const minFinTramo = aMinutos(t.f);

      if (minInicioTramo !== null && minFinTramo !== null) {
        if (minInicioSeg < minFinTramo && minFinSeg > minInicioTramo) {
          return false; 
        }
      }
    }

    return true;
  };

  const abrirModalParaMinuto = (dia, horaStr, citaEncontrada = null) => {
    setDiaSeleccionado(dia);
    setMensaje('');
    
    if (citaEncontrada) {
      setCitaExistenteId(citaEncontrada.id);
      setTipoSession(citaEncontrada.tipo_sesion || 'Individual');
      setEmpresarioId(citaEncontrada.empresario_id || '');
      setNombreGrupo(citaEncontrada.nombre_grupo || '');
      setHoraInicio(citaEncontrada.hora_inicio || horaStr);
      setHoraFin(citaEncontrada.hora_fin || '');
      setLinkZoom(citaEncontrada.link_zoom || '');
      setEstadoCita(citaEncontrada.estado || 'confirmado');
    } else {
      setCitaExistenteId(null);
      setHoraInicio(horaStr);
      
      const [h, m] = horaStr.split(':').map(Number);
      const totalMinFin = h * 60 + m + Number(jornadaChair.duracionSesion);
      const hFinCalc = Math.floor(totalMinFin / 60);
      const mFinCalc = totalMinFin % 60;
      setHoraFin(`${String(hFinCalc).padStart(2, '0')}:${String(mFinCalc).padStart(2, '0')}`);

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
      if (citaExistenteId) {
        const { error } = await supabase.from('agd_citas')
          .update({
            chair_id: Number(usuarioId),
            empresario_id: empresarioId ? Number(empresarioId) : null,
            hora_inicio: horaInicio,
            hora_fin: horaFin,
            tipo_sesion: tipoSession,
            nombre_grupo: tipoSession === 'Grupal' ? nombreGrupo : null,
            link_zoom: linkZoom,
            estado: estadoCita
          })
          .eq('id', citaExistenteId);

        if (error) throw error;
        setMensaje('¡Cita actualizada correctamente en el cronograma!');
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
          chair_id: Number(usuarioId),
          empresario_id: empresarioId ? Number(empresarioId) : null,
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
        setMensaje('¡Sesión(es) guardada(s) y reflejadas en el cronograma!');
      }

      await cargarDatosSupabase();
      setTimeout(() => setModalAbierto(false), 1200);

    } catch (err) {
      setMensaje('Error al guardar: ' + err.message);
    }
  };

  const enviarPorWhatsApp = () => {
    const empresObj = empresarios.find(e => e.id == empresarioId);
    if (!empresObj || !empresObj.telefono) {
      setMensaje('El invitado seleccionado no cuenta con un número de teléfono registrado.');
      return;
    }
    const textoWs = encodeURIComponent(`Hola ${empresObj.nombre_completo}, tu sesión ha quedado programada para el ${diaSeleccionado?.fecha} de ${horaInicio} a ${horaFin}. Estado: *${estadoCita.toUpperCase()}*. Link de Zoom: ${linkZoom || 'Pendiente'}`);
    window.open(`https://wa.me/${empresObj.telefono.replace(/\+/g, '')}?text=${textoWs}`, '_blank');
  };

  const enviarPorCorreo = () => {
    const empresObj = empresarios.find(e => e.id == empresarioId);
    if (!empresObj || !empresObj.email) {
      setMensaje('El invitado seleccionado no cuenta con un correo electrónico registrado.');
      return;
    }
    const asunto = encodeURIComponent('Convocatoria a Sesión / Cita en Agendando');
    const cuerpo = encodeURIComponent(`Hola ${empresObj.nombre_completo},\n\nTe informamos que tu sesión ha sido agendada para el día ${diaSeleccionado?.fecha} en el horario de ${horaInicio} a ${horaFin}.\nEstado: ${estadoCita.toUpperCase()}\nLink de acceso: ${linkZoom || 'Pendiente'}\n\nAtentamente,\nPlataforma Agendando`);
    window.open(`mailto:${empresObj.email}?subject=${asunto}&body=${cuerpo}`);
  };

  const estilosEscala = {
    minWidth: vistaEscala === 'semana' ? '130px' : (vistaEscala === 'trimestre' ? '30px' : '75px'),
  };

  return (
    <div style={estilos.contenedor}>
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
            onClick={() => setVistaEscala('semana')}
            style={{ ...estilos.btnZoom, backgroundColor: vistaEscala === 'semana' ? '#00A89F' : '#E0E0E0', color: vistaEscala === 'semana' ? '#FFF' : '#333' }}
          >
            Semana
          </button>
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
        <span><b style={{color: '#00796B'}}>■</b> Cita Grupal (Verde)</span>
        <span><b style={{color: '#0288D1'}}>■</b> Cita Individual (Celeste)</span>
        <span><b style={{color: '#D32F2F'}}>■</b> Cancelado / Bloqueado</span>
      </div>

      {/* Contenedor del Cronograma con Scroll Sincronizado y Cabeceras Fijas */}
      <div style={estilos.gridCalendarioContainer}>
        <div style={estilos.gridBodyScroll}>
          
          {/* Fila de Encabezados de Días (Sticky Top) */}
          <div style={{ ...estilos.gridHeaderRow, gridTemplateColumns: `70px repeat(${diasSemanaMes.length}, ${estilosEscala.minWidth})` }}>
            <div style={estilos.headerEsquina}>Hora</div>
            {diasSemanaMes.map(d => (
              <div key={d.fecha} style={estilos.headerDia}>
                {d.nombreDia.slice(0, 3)} <br/><span style={estilos.numDia}>{d.diaNumero}</span>
              </div>
            ))}
          </div>

          {/* Filas de Horas */}
          {horasDelDia.map((horaBase, indexH) => {
            const minBase = indexH * 60;

            return (
              <div key={horaBase} style={{ ...estilos.gridRow, gridTemplateColumns: `70px repeat(${diasSemanaMes.length}, ${estilosEscala.minWidth})` }}>
                <div style={estilos.colHoraFija}>{horaBase}</div>

                {diasSemanaMes.map(d => {
                  return (
                    <div key={d.fecha} style={estilos.celdaContenedorPlana}>
                      {subBloquesCincoMin.map(mOffset => {
                        const minInicioSeg = minBase + mOffset;
                        const minFinSeg = minInicioSeg + 5;
                        const hStr = String(indexH).padStart(2, '0');
                        const mStr = String(mOffset).padStart(2, '0');
                        const horaMinutoStr = `${hStr}:${mStr}`;

                        // Buscar cita existente en este segmento de 5 minutos
                        const citaEncontrada = citas.find(c => {
                          if (c.fecha_cita !== d.fecha || c.estado === 'cancelado') return false;
                          const [hIniC, mIniC] = c.hora_inicio.split(':').map(Number);
                          const minIniC = hIniC * 60 + (mIniC || 0);
                          const [hFinC, mFinC] = c.hora_fin.split(':').map(Number);
                          const minFinC = hFinC * 60 + (mFinC || 0);
                          return minInicioSeg < minFinC && minFinSeg > minIniC;
                        });

                        const disponible = esDisponibleCincoMin(d.fecha, minInicioSeg, minFinSeg);

                        let estiloSubSegmento = { ...estilos.subSegmentoPlano };
                        let etiquetaTexto = '';

                        if (citaEncontrada) {
                          if (citaEncontrada.tipo_sesion === 'Grupal') {
                            estiloSubSegmento.backgroundColor = '#C8E6C9';
                            if (mOffset === 0) etiquetaTexto = `👥 ${citaEncontrada.nombre_grupo || 'Grupal'}`;
                          } else {
                            estiloSubSegmento.backgroundColor = '#B3E5FC';
                            if (mOffset === 0) {
                              const empAsociado = empresarios.find(e => e.id === citaAsociado(citaEncontrada));
                              const nombreEmp = empAsociado?.nombre_completo?.split(' ')[0] || 'Individual';
                              etiquetaTexto = `👤 ${nombreEmp}`;
                            }
                          }
                          estiloSubSegmento.cursor = 'pointer';
                        } else if (disponible) {
                          estiloSubSegmento.backgroundColor = 'rgba(255, 235, 59, 0.25)';
                          estiloSubSegmento.cursor = 'pointer';
                        } else {
                          estiloSubSegmento.backgroundColor = '#EAEAEA';
                          estiloSubSegmento.cursor = 'not-allowed';
                        }

                        return (
                          <div 
                            key={mOffset}
                            style={estiloSubSegmento}
                            onClick={() => abrirModalParaMinuto(d, horaMinutoStr, citaEncontrada)}
                            title={`${horaMinutoStr} ${etiquetaTexto}`}
                          >
                            {etiquetaTexto && (
                              <span style={estilos.textoCita}>
                                {etiquetaTexto}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
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
                    onChange={(e) => seleccionarEmpresario(e.target.value)}
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

// Función auxiliar para leer el ID del invitado independientemente de la propiedad
function citaAsociado(c) {
  return c.empresario_id || c.invitado_id || null;
}

const estilos = {
  contenedor: { padding: '10px', maxWidth: '100%', width: '100%', boxSizing: 'border-box', fontFamily: 'sans-serif', backgroundColor: '#F8F9FA' },
  controlesSuperiores: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px', flexWrap: 'wrap', backgroundColor: '#FFF', padding: '6px 8px', borderRadius: '8px', border: '1px solid #EAEAEA' },
  grupoMes: { display: 'flex', alignItems: 'center', gap: '6px' },
  labelControl: { fontSize: '0.75rem', fontWeight: 'bold', color: '#444' },
  inputMes: { padding: '5px', borderRadius: '6px', border: '1px solid #CCC', fontSize: '0.8rem' },
  zoomContainer: { display: 'flex', gap: '4px' },
  btnZoom: { padding: '5px 8px', borderRadius: '6px', border: 'none', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' },
  mensajeGeneral: { fontSize: '0.8rem', color: '#00A89F', textAlign: 'center', fontWeight: 'bold', margin: '5px 0' },
  mensajeFeedback: { fontSize: '0.75rem', color: '#00796B', backgroundColor: '#E0F2F1', padding: '6px', borderRadius: '4px', textAlign: 'center', margin: '4px 0', fontWeight: 'bold' },
  leyenda: { display: 'flex', justifyContent: 'center', gap: '10px', fontSize: '0.65rem', marginBottom: '8px', alignItems: 'center', flexWrap: 'wrap' },
  
  // Contenedor y Scroll con Sticky Sincronizado
  gridCalendarioContainer: { backgroundColor: '#FFF', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: '1px solid #EAEAEA', overflow: 'hidden' },
  gridBodyScroll: { maxHeight: '620px', overflowY: 'auto', overflowX: 'auto', position: 'relative' },
  
  gridHeaderRow: { display: 'grid', backgroundColor: '#00A89F', color: '#FFF', position: 'sticky', top: 0, zIndex: 10 },
  headerEsquina: { padding: '8px 4px', textAlign: 'center', fontWeight: 'bold', position: 'sticky', left: 0, backgroundColor: '#00A89F', zIndex: 15, borderRight: '1px solid rgba(255,255,255,0.2)' },
  headerDia: { padding: '8px 4px', textAlign: 'center', fontSize: '0.7rem' },
  numDia: { fontWeight: 'bold' },
  
  gridRow: { display: 'grid', borderBottom: '1px solid #EEE' },
  colHoraFija: { padding: '4px', textAlign: 'center', fontWeight: 'bold', color: '#555', backgroundColor: '#FAFAFA', fontSize: '0.75rem', position: 'sticky', left: 0, zIndex: 8, borderRight: '1px solid #DDD', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  
  celdaContenedorPlana: { height: '48px', borderRight: '1px solid #EEE', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' },
  subSegmentoPlano: { flex: 1, width: '100%', boxSizing: 'border-box', borderBottom: '0.5px solid rgba(0,0,0,0.02)', position: 'relative', overflow: 'hidden' },

  textoCita: { color: '#004D40', fontWeight: 'bold', fontSize: '0.55rem', paddingLeft: '2px', position: 'absolute', top: '2px', left: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '95%' },

  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' },
  modalContenido: { backgroundColor: '#FFF', padding: '20px', borderRadius: '10px', width: '100%', maxWidth: '420px', boxSizing: 'border-box' },
  modalTitulo: { fontSize: '0.95rem', color: '#333', marginBottom: '12px', textAlign: 'center' },
  formularioModal: { display: 'flex', flexDirection: 'column', gap: '8px' },
  grupoInput: { display: 'flex', flexDirection: 'column', gap: '3px', textAlign: 'left' },
  label: { fontSize: '0.7rem', fontWeight: 'bold', color: '#444' },
  input: { padding: '7px', borderRadius: '6px', border: '1px solid #CCC', fontSize: '0.8rem', width: '100%', boxSizing: 'border-box' },
  filaHorarios: { display: 'flex', gap: '8px' },
  grupoCheckbox: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' },
  labelCheck: { fontSize: '0.7rem', color: '#333', cursor: 'pointer' },
  
  contenedorBotonesAccion: { display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' },
  botonGuardarPrincipal: { width: '100%', padding: '10px', borderRadius: '6px', border: 'none', background: 'linear-gradient(90deg, #00A89F 0%, #88D84D 100%)', color: '#FFF', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' },
  filaAccionesSecundarias: { display: 'flex', gap: '6px' },
  botonWs: { flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: '#25D366', color: '#FFF', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' },
  botonCorreo: { flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: '#0288D1', color: '#FFF', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' },
  botonCerrarModal: { width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #CCC', background: '#FFF', color: '#666', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '2px' }
};
