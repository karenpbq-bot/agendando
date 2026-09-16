import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { supabase } from '../supabaseClient';

export default function Reprogramaciones({ usuarioId }) {
  const [canceladas, setCanceladas] = useState([]);
  const [enCurso, setEnCurso] = useState([]);
  const [empresarios, setEmpresarios] = useState([]);
  const [citaSeleccionada, setCitaSeleccionada] = useState(null);
  
  // Opciones de rango
  const [rangoDias, setRangoDias] = useState(7);
  const [horariosLibres, setHorariosLibres] = useState([]);
  const [horarioSeleccionado, setHorarioSeleccionado] = useState(null);

  // Campo opcional de enlace de reunión
  const [linkZoom, setLinkZoom] = useState('');

  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (usuarioId) {
      cargarDatosIniciales();
    }
  }, [usuarioId]);

  const cargarDatosIniciales = async () => {
    try {
      const chairIdNum = Number(usuarioId);

      const { data: dataEmp } = await supabase
        .from('usuarios')
        .select('id, nombre_completo, telefono, email, rol');

      const { data: dataCanceladas } = await supabase
        .from('agd_citas')
        .select('*')
        .eq('chair_id', chairIdNum)
        .ilike('estado', 'cancelado');

      if (dataCanceladas) {
        const conUsuarios = dataCanceladas.map((cita) => {
          const emp = dataEmp?.find(e => e.id === Number(cita.empresario_id));
          return { ...cita, usuarios: emp || null };
        });
        setCanceladas(conUsuarios);
      }

      const { data: dataEnCurso } = await supabase
        .from('agd_citas')
        .select('*')
        .eq('chair_id', chairIdNum)
        .ilike('estado', 'Propuesta_Reprogramacion');

      if (dataEnCurso) {
        const conUsuariosEC = dataEnCurso.map((cita) => {
          const emp = dataEmp?.find(e => e.id === Number(cita.empresario_id));
          return { ...cita, usuarios: emp || null };
        });
        setEnCurso(conUsuariosEC);
      }

    } catch (err) {
      console.error('Error cargando listas de reprogramación:', err);
    }
  };

  const calcularEspaciosLibres = async (diasRango, citaObj) => {
    try {
      setCargando(true);
      const chairIdNum = Number(usuarioId);

      const { data: configData } = await supabase
        .from('agd_configuracion_chair')
        .select('jornada_inicio, jornada_fin')
        .eq('usuario_id', chairIdNum)
        .maybeSingle();

      const jornadaInicio = configData?.jornada_inicio ? configData.jornada_inicio.substring(0, 5) : '08:30';
      const jornadaFin = configData?.jornada_fin ? configData.jornada_fin.substring(0, 5) : '22:30';

      const { data: restData } = await supabase
        .from('agd_restricciones_disponibilidad')
        .select('*')
        .eq('usuario_id', chairIdNum);

      const { data: citasActivas } = await supabase
        .from('agd_citas')
        .select('*')
        .eq('chair_id', chairIdNum)
        .not('estado', 'ilike', 'cancelado');

      let duracionMinutos = 45;
      if (citaObj && citaObj.hora_inicio && citaObj.hora_fin) {
        const [h1, m1] = citaObj.hora_inicio.split(':').map(Number);
        const [h2, m2] = citaObj.hora_fin.split(':').map(Number);
        duracionMinutos = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (duracionMinutos <= 0) duracionMinutos = 45;
      }

      const slotsDisponibles = [];
      const hoy = dayjs();

      for (let i = 0; i < diasRango; i++) {
        const fechaActual = hoy.add(i, 'day');
        const fechaStr = fechaActual.format('YYYY-MM-DD');

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
                // Sin icono y formateado en una sola línea compacta
                label: `${fechaStr}  |  ${slotIniStr} - ${slotFinStr}`
              });
            }
          }

          cursor = cursor.add(30, 'minute');
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
    setLinkZoom(cita.link_zoom || '');
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
          : 'Propuesta enviada. Solicitud de confirmación enviada al invitado.'
      );

      setCitaSeleccionada(null);
      setHorariosLibres([]);
      cargarDatosIniciales();
    } catch (err) {
      setMensaje('Error al procesar la reprogramación: ' + err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={estilos.contenedor}>
      {mensaje && <p style={estilos.mensajeGeneral}>{mensaje}</p>}

      {!citaSeleccionada ? (
        <div style={estilos.stackContenedor}>
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

          <div style={estilos.cardSeccion}>
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
      ) : (
        /* PANTALLA DEDICADA DE SELECCIÓN DE HORARIO */
        <div style={estilos.cardSeccionAmpliada}>
          <div style={estilos.headerPantallaReprogramacion}>
            <button onClick={() => setCitaSeleccionada(null)} style={estilos.botonVolver}>
              ❮ Volver a la Bandeja
            </button>
            <h3 style={{...estilos.subSubTitulo, margin: 0, border: 'none'}}>Seleccionar Nuevo Horario</h3>
          </div>

          <form onSubmit={enviarPropuestaReprogramacion} style={estilos.formulario}>
            <p style={estilos.infoSeleccion}>
              Reprogramando cita para: <b>{citaSeleccionada.usuarios?.nombre_completo || 'Invitado'}</b>
            </p>

            {/* Botones de Rango de Días */}
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
              <label style={estilos.label}>Espacios Libres Disponibles en tu Agenda:</label>
              {cargando ? (
                <p style={estilos.textoVacio}>Buscando espacios libres...</p>
              ) : horariosLibres.length === 0 ? (
                <p style={estilos.textoVacio}>No hay espacios libres en este rango.</p>
              ) : (
                <div style={estilos.listaHorariosAmplia}>
                  {horariosLibres.map((h, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setHorarioSeleccionado(h)}
                      style={{
                        ...estilos.itemHorario,
                        borderColor: horarioSeleccionado?.fecha === h.fecha && horarioSeleccionado?.horaInicio === h.horaInicio ? '#00A89F' : '#CBD5E1',
                        backgroundColor: horarioSeleccionado?.fecha === h.fecha && horarioSeleccionado?.horaInicio === h.horaInicio ? '#E0F2F1' : '#FFFFFF'
                      }}
                    >
                      {h.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={estilos.grupoInput}>
              <label style={estilos.label}>Link de Reunión (Zoom / Meet) - <i>Opcional</i></label>
              <input 
                type="url" 
                value={linkZoom}
                onChange={(e) => setLinkZoom(e.target.value)}
                placeholder="https://zoom.us/j/..."
                style={estilos.input}
              />
              <span style={estilos.ayudaInput}>Si no se llena este campo, la cita quedará en "Reprogramaciones en curso".</span>
            </div>

            <button type="submit" disabled={cargando || !horarioSeleccionado} style={estilos.botonPrimario}>
              {cargando ? 'Procesando...' : 'Solicitar Confirmación'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

const estilos = {
  contenedor: { padding: '10px', maxWidth: '100%', width: '100%', boxSizing: 'border-box', fontFamily: 'sans-serif', backgroundColor: '#F8F9FA' },
  mensajeGeneral: { fontSize: '0.85rem', color: '#00A89F', textAlign: 'center', fontWeight: 'bold', margin: '6px 0' },
  stackContenedor: { display: 'flex', flexDirection: 'column', gap: '15px' },
  cardSeccion: { backgroundColor: '#FFF', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #EAEAEA', boxSizing: 'border-box', width: '100%' },
  cardSeccionAmpliada: { backgroundColor: '#FFF', padding: '20px', borderRadius: '12px', boxShadow: '0 3px 12px rgba(0,0,0,0.06)', border: '1px solid #EAEAEA', boxSizing: 'border-box', width: '100%', minHeight: '650px' },
  subSubTitulo: { fontSize: '1rem', color: '#333', marginBottom: '12px', borderBottom: '2px solid #00A89F', paddingBottom: '6px' },
  textoVacio: { fontSize: '0.8rem', color: '#777', textAlign: 'center', padding: '15px' },
  itemLista: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderRadius: '8px', border: '1px solid #EEE', backgroundColor: '#FAFAFA', marginBottom: '8px', gap: '10px' },
  itemListaEnCurso: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderRadius: '8px', border: '1px solid #FFE0B2', backgroundColor: '#FFF8E1', marginBottom: '8px', gap: '10px' },
  textoItem: { fontSize: '0.85rem', color: '#333', margin: '0 0 2px 0' },
  textoItemDetalle: { fontSize: '0.75rem', color: '#666', margin: 0 },
  badgeEspera: { fontSize: '0.7rem', backgroundColor: '#FF8F00', color: '#FFF', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold' },
  botonAccion: { padding: '8px 12px', borderRadius: '6px', border: 'none', background: '#00A89F', color: '#FFF', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' },
  
  headerPantallaReprogramacion: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '2px solid #00A89F', paddingBottom: '8px', flexWrap: 'wrap', gap: '10px' },
  botonVolver: { padding: '8px 14px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFF', color: '#334155', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' },

  filaBotonesRango: { display: 'flex', gap: '8px', marginBottom: '12px' },
  btnRangoActivo: { flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#00796B', color: '#FFF', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' },
  btnRangoInactivo: { flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFF', color: '#64748B', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' },

  formulario: { display: 'flex', flexDirection: 'column', gap: '14px' },
  infoSeleccion: { fontSize: '0.85rem', color: '#00796B', margin: '0 0 5px 0', backgroundColor: '#E0F2F1', padding: '10px', borderRadius: '8px' },
  grupoInput: { display: 'flex', flexDirection: 'column', gap: '5px', textAlign: 'left' },
  label: { fontSize: '0.8rem', fontWeight: 'bold', color: '#334155' },
  input: { padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' },
  ayudaInput: { fontSize: '0.75rem', color: '#64748B', marginTop: '3px' },
  listaHorariosAmplia: { maxHeight: '340px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' },
  itemHorario: { padding: '12px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem', cursor: 'pointer', fontWeight: '500', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', whiteSpace: 'nowrap', overflowX: 'auto' },
  botonPrimario: { padding: '14px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #00A89F 0%, #00796B 100%)', color: '#FFF', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px', width: '100%', boxShadow: '0 4px 10px rgba(0,168,159,0.3)' }
};
