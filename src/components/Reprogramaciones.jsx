import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { supabase } from '../supabaseClient';

export default function Reprogramaciones({ usuarioId }) {
  const [canceladas, setCanceladas] = useState([]);
  const [enCurso, setEnCurso] = useState([]);
  const [citaSeleccionada, setCitaSeleccionada] = useState(null);
  
  // Estados para la generación dinámica de horarios
  const [rangoDias, setRangoDias] = useState(7); // 7 o 30 días
  const [horariosLibres, setHorariosLibres] = useState([]);
  const [horarioSeleccionado, setHorarioSeleccionado] = useState(null);
  
  const [linkSesion, setLinkSesion] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (usuarioId) {
      cargarListadosReprogramacion();
    }
  }, [usuarioId]);

  const cargarListadosReprogramacion = async () => {
    try {
      const chairIdNum = Number(usuarioId);

      // 1. Obtener citas canceladas
      const { data: dataCanceladas, error: errC } = await supabase
        .from('agd_citas')
        .select('*')
        .eq('chair_id', chairIdNum)
        .ilike('estado', 'cancelado');

      if (!errC && dataCanceladas) {
        const conUsuarios = await Promise.all(dataCanceladas.map(async (cita) => {
          if (cita.empresario_id) {
            const { data: userDat } = await supabase
              .from('usuarios')
              .select('nombre_completo, email, telefono')
              .eq('id', cita.empresario_id)
              .maybeSingle();
            return { ...cita, usuarios: userDat };
          }
          return { ...cita, usuarios: null };
        }));
        setCanceladas(conUsuarios);
      }

      // 2. Obtener reprogramaciones en curso
      const { data: dataEnCurso, error: errEC } = await supabase
        .from('agd_citas')
        .select('*')
        .eq('chair_id', chairIdNum)
        .ilike('estado', 'Propuesta_Reprogramacion');

      if (!errEC && dataEnCurso) {
        const conUsuariosEC = await Promise.all(dataEnCurso.map(async (cita) => {
          if (cita.empresario_id) {
            const { data: userDat } = await supabase
              .from('usuarios')
              .select('nombre_completo, email, telefono')
              .eq('id', cita.empresario_id)
              .maybeSingle();
            return { ...cita, usuarios: userDat };
          }
          return { ...cita, usuarios: null };
        }));
        setEnCurso(conUsuariosEC);
      }

    } catch (err) {
      console.error('Error cargando listas de reprogramación:', err);
    }
  };

  // Generar espacios libres analizando el cronograma real del Chair
  const calcularEspaciosLibres = async (diasRango, citaObj) => {
    try {
      setCargando(true);
      const chairIdNum = Number(usuarioId);

      // 1. Obtener configuración de jornada
      const { data: configData } = await supabase
        .from('agd_configuracion_chair')
        .select('jornada_inicio, jornada_fin')
        .eq('usuario_id', chairIdNum)
        .maybeSingle();

      const jornadaInicio = configData?.jornada_inicio ? configData.jornada_inicio.substring(0, 5) : '08:30';
      const jornadaFin = configData?.jornada_fin ? configData.jornada_fin.substring(0, 5) : '22:30';

      // 2. Obtener restricciones del Chair
      const { data: restData } = await supabase
        .from('agd_restricciones_disponibilidad')
        .select('*')
        .eq('usuario_id', chairIdNum);

      // 3. Obtener citas activas (no canceladas) para evitar solapes
      const { data: citasActivas } = await supabase
        .from('agd_citas')
        .select('*')
        .eq('chair_id', chairIdNum)
        .not('estado', 'ilike', 'cancelado');

      // Calcular duración de la cita original o usar 45 mins por defecto
      let duracionMinutos = 45;
      if (citaObj && citaObj.hora_inicio && citaObj.hora_fin) {
        const [h1, m1] = citaObj.hora_inicio.split(':').map(Number);
        const [h2, m2] = citaObj.hora_fin.split(':').map(Number);
        duracionMinutos = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (duracionMinutos <= 0) duracionMinutos = 45;
      }

      // Algoritmo de generación de huecos libres
      const slotsDisponibles = [];
      const hoy = dayjs();

      for (let i = 0; i < diasRango; i++) {
        const fechaActual = hoy.add(i, 'day');
        const fechaStr = fechaActual.format('YYYY-MM-DD');

        // Verificar si el día entero está bloqueado
        const restDia = restData?.find(r => r.fecha_especifica?.substring(0, 10) === fechaStr);
        if (restDia && restDia.bloqueado_todo_el_dia) continue;

        const [hInicioJ, mInicioJ] = jornadaInicio.split(':').map(Number);
        const [hFinJ, mFinJ] = jornadaFin.split(':').map(Number);

        let cursor = fechaActual.hour(hInicioJ).minute(mInicioJ).second(0);
        const limiteJornada = fechaActual.hour(hFinJ).minute(mFinJ).second(0);
        const citasDelDia = (citasActivas || []).filter(c => c.fecha_cita === fechaStr);

        while (cursor.add(duracionMinutos, 'minute').isBefore(limiteJornada) || cursor.add(duracionMinutos, 'minute').isSame(limiteJornada)) {
          const slotIniStr = cursor.format('HH:mm');
          const slotFinCursor = cursor.add(duracionMinutos, 'minute');
          const slotFinStr = slotFinCursor.format('HH:mm');

          // Validar tramos restringidos parciales
          let restringido = false;
          if (restDia) {
            const tramos = [
              { i: restDia.tramo_1_inicio, f: restDia.tramo_1_fin },
              { i: restDia.tramo_2_inicio, f: restDia.tramo_2_fin },
              { i: restDia.tramo_3_inicio, f: restDia.tramo_3_fin },
              { i: restDia.tramo_4_inicio, f: restDia.tramo_4_fin },
            ];
            const aMin = (h) => { const [hh, mm] = h.split(':').map(Number); return hh * 60 + mm; };
            const sIniM = aMin(slotIniStr);
            const sFinM = aMin(slotFinStr);

            for (let t of tramos) {
              if (t.i && t.f) {
                const tIniM = aMin(t.i.substring(0, 5));
                const tFinM = aMin(t.f.substring(0, 5));
                if (sIniM < tFinM && sFinM > tIniM) {
                  restringido = true;
                  break;
                }
              }
            }
          }

          // Validar solape con citas activas
          if (!restringido) {
            const aMin = (h) => { const [hh, mm] = h.split(':').map(Number); return hh * 60 + mm; };
            const sIniM = aMin(slotIniStr);
            const sFinM = aMin(slotFinStr);

            const solapaCita = citasDelDia.some(c => {
              const cIniM = aMin(c.hora_inicio.substring(0, 5));
              const cFinM = aMin(c.hora_fin.substring(0, 5));
              return sIniM < cFinM && sFinM > cIniM;
            });

            if (!solapaCita) {
              slotsDisponibles.push({
                fecha: fechaStr,
                horaInicio: slotIniStr,
                horaFin: slotFinStr,
                label: `📅 ${fechaStr} | ⏰ ${slotIniStr} - ${slotFinStr}`
              });
            }
          }

          cursor = cursor.add(30, 'minute'); // Salto de 30 minutos entre slots
        }
      }

      setHorariosLibres(slotsDisponibles);
    } catch (err) {
      console.error('Error calculando espacios libres:', err);
    } finally {
      setCargando(false);
    }
  };

  const seleccionarParaReprogramar = async (cita, dias = rangoDias) => {
    setCitaSeleccionada(cita);
    setMensaje('');
    setHorarioSeleccionado(null);
    setLinkSesion('');
    await calcularEspaciosLibres(dias, cita);
  };

  const cambiarRangoDias = async (dias) => {
    setRangoDias(dias);
    if (citaSeleccionada) {
      await calcularEspaciosLibres(dias, citaSeleccionada);
    }
  };

  const enviarPropuestaReprogramacion = async (e) => {
    e.preventDefault();
    if (!horarioSeleccionado) {
      setMensaje('Debes seleccionar un horario de la lista.');
      return;
    }

    setCargando(true);
    setMensaje('');

    try {
      const tieneLink = linkSesion && linkSesion.trim() !== '';
      const nuevoEstado = tieneLink ? 'confirmado' : 'Propuesta_Reprogramacion';

      const { error } = await supabase
        .from('agd_citas')
        .update({
          fecha_cita: horarioSeleccionado.fecha,
          hora_inicio: horarioSeleccionado.horaInicio,
          hora_fin: horarioSeleccionado.horaFin,
          link_zoom: tieneLink ? linkSesion.trim() : null,
          estado: nuevoEstado
        })
        .eq('id', citaSeleccionada.id);

      if (error) throw error;

      setMensaje(
        tieneLink 
          ? '¡Cita reprogramada y confirmada con éxito!' 
          : 'Propuesta enviada. La cita se movió a "Reprogramaciones en curso".'
      );

      setCitaSeleccionada(null);
      setHorariosLibres([]);
      cargarListadosReprogramacion();
    } catch (err) {
      setMensaje('Error al procesar la reprogramación: ' + err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={estilos.contenedor}>
      {mensaje && <p style={estilos.mensajeGeneral}>{mensaje}</p>}

      <div style={estilos.gridContenedor}>
        {/* Columna 1: Canceladas y Reprogramaciones en Curso */}
        <div style={estilos.columna}>
          <div style={estilos.cardSeccion}>
            <h3 style={estilos.subSubTitulo}>Bandeja de Canceladas ({canceladas.length})</h3>
            {canceladas.length === 0 ? (
              <p style={estilos.textoVacio}>No hay citas canceladas pendientes.</p>
            ) : (
              canceladas.map(c => (
                <div key={c.id} style={estilos.itemLista}>
                  <div>
                    <p style={estilos.textoItem}><b>Invitado:</b> {c.usuarios?.nombre_completo || 'Invitado ID: ' + c.empresario_id}</p>
                    <p style={estilos.textoItemDetalle}>Fecha original: {c.fecha_cita} ({c.hora_inicio?.substring(0,5)})</p>
                  </div>
                  <button onClick={() => seleccionarParaReprogramar(c)} style={estilos.botonAccion}>
                    Reprogramar
                  </button>
                </div>
              ))
            )}
          </div>

          <div style={{ ...estilos.cardSeccion, marginTop: '15px' }}>
            <h3 style={estilos.subSubTitulo}>Reprogramaciones en Curso ({enCurso.length})</h3>
            {enCurso.length === 0 ? (
              <p style={estilos.textoVacio}>No hay propuestas pendientes de enlace o confirmación.</p>
            ) : (
              enCurso.map(e => (
                <div key={e.id} style={estilos.itemListaEnCurso}>
                  <div>
                    <p style={estilos.textoItem}><b>Invitado:</b> {e.usuarios?.nombre_completo || 'Invitado ID: ' + e.empresario_id}</p>
                    <p style={estilos.textoItemDetalle}>Propuesta: {e.fecha_cita} ({e.hora_inicio?.substring(0,5)})</p>
                  </div>
                  <span style={estilos.badgeEspera}>En Curso</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Columna 2: Selección de Nuevo Horario con Opciones 7 y 30 días */}
        <div style={estilos.columna}>
          <div style={estilos.cardSeccion}>
            <h3 style={estilos.subSubTitulo}>Selección de Nuevo Horario</h3>
            {!citaSeleccionada ? (
              <p style={estilos.textoVacio}>Selecciona una cita cancelada de la izquierda para ver tus horarios libres.</p>
            ) : (
              <form onSubmit={enviarPropuestaReprogramacion} style={estilos.formulario}>
                <p style={estilos.infoSeleccion}>
                  Reprogramando cita para: <b>{citaSeleccionada.usuarios?.nombre_completo || 'Invitado'}</b>
                </p>

                {/* Botones de Rango (7 y 30 días) */}
                <div style={estilos.filaBotonesRango}>
                  <button 
                    type="button" 
                    onClick={() => cambiarRangoDias(7)}
                    style={rangoDias === 7 ? estilos.btnRangoActivo : estilos.btnRangoInactivo}
                  >
                    Próximos 7 Días
                  </button>
                  <button 
                    type="button" 
                    onClick={() => cambiarRangoDias(30)}
                    style={rangoDias === 30 ? estilos.btnRangoActivo : estilos.btnRangoInactivo}
                  >
                    Próximos 30 Días
                  </button>
                </div>

                <div style={estilos.grupoInput}>
                  <label style={estilos.label}>Espacios Libres Disponibles:</label>
                  {cargando ? (
                    <p style={estilos.textoVacio}>Calculando espacios libres...</p>
                  ) : horariosLibres.length === 0 ? (
                    <p style={estilos.textoVacio}>No hay espacios libres en este rango.</p>
                  ) : (
                    <div style={estilos.listaHorarios}>
                      {horariosLibres.map((h, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => setHorarioSeleccionado(h)}
                          style={{
                            ...estilos.itemHorario,
                            borderColor: horarioSeleccionado?.fecha === h.fecha && horarioSeleccionado?.horaInicio === h.horaInicio ? '#00A89F' : '#E0E0E0',
                            backgroundColor: horarioSeleccionado?.fecha === h.fecha && horarioSeleccionado?.horaInicio === h.horaInicio ? '#E0F2F1' : '#FAFAFA'
                          }}
                        >
                          {h.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={estilos.grupoInput}>
                  <label style={estilos.label}>Enlace de Sesión (Opcional)</label>
                  <input 
                    type="url" 
                    value={linkSesion}
                    onChange={(e) => setLinkSesion(e.target.value)}
                    placeholder="https://zoom.us/j/..."
                    style={estilos.input}
                  />
                </div>

                <button type="submit" disabled={cargando || !horarioSeleccionado} style={estilos.botonPrimario}>
                  {cargando ? 'Procesando...' : 'Confirmar Nueva Cita'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const estilos = {
  contenedor: { padding: '10px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif', backgroundColor: '#F8F9FA' },
  mensajeGeneral: { fontSize: '0.85rem', color: '#00A89F', textAlign: 'center', fontWeight: 'bold', margin: '6px 0' },
  gridContenedor: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', alignItems: 'start' },
  columna: { display: 'flex', flexDirection: 'column' },
  cardSeccion: { backgroundColor: '#FFF', padding: '15px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: '1px solid #EAEAEA' },
  subSubTitulo: { fontSize: '0.95rem', color: '#333', marginBottom: '10px', borderBottom: '2px solid #00A89F', paddingBottom: '4px' },
  textoVacio: { fontSize: '0.75rem', color: '#777', textAlign: 'center', padding: '15px' },
  itemLista: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderRadius: '6px', border: '1px solid #EEE', backgroundColor: '#FAFAFA', marginBottom: '8px' },
  itemListaEnCurso: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderRadius: '6px', border: '1px solid #FFE0B2', backgroundColor: '#FFF8E1', marginBottom: '8px' },
  textoItem: { fontSize: '0.8rem', color: '#333', margin: '0 0 2px 0' },
  textoItemDetalle: { fontSize: '0.7rem', color: '#666', margin: 0 },
  badgeEspera: { fontSize: '0.65rem', backgroundColor: '#FF8F00', color: '#FFF', padding: '3px 6px', borderRadius: '4px', fontWeight: 'bold' },
  botonAccion: { padding: '5px 8px', borderRadius: '4px', border: 'none', background: '#00A89F', color: '#FFF', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer' },
  
  filaBotonesRango: { display: 'flex', gap: '8px', marginBottom: '10px' },
  btnRangoActivo: { flex: 1, padding: '7px', borderRadius: '6px', border: 'none', background: '#00796B', color: '#FFF', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' },
  btnRangoInactivo: { flex: 1, padding: '7px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFF', color: '#64748B', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' },

  formulario: { display: 'flex', flexDirection: 'column', gap: '10px' },
  infoSeleccion: { fontSize: '0.8rem', color: '#00796B', margin: '0 0 5px 0', backgroundColor: '#E0F2F1', padding: '6px', borderRadius: '4px' },
  grupoInput: { display: 'flex', flexDirection: 'column', gap: '3px', textAlign: 'left' },
  label: { fontSize: '0.7rem', fontWeight: 'bold', color: '#444' },
  input: { padding: '7px', borderRadius: '6px', border: '1px solid #CCC', fontSize: '0.8rem', width: '100%', boxSizing: 'border-box' },
  listaHorarios: { maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' },
  itemHorario: { padding: '8px', borderRadius: '6px', border: '1px solid #E0E0E0', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '500' },
  botonPrimario: { padding: '9px', borderRadius: '6px', border: 'none', background: 'linear-gradient(90deg, #00A89F 0%, #88D84D 100%)', color: '#FFF', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '4px' }
};
