import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Reprogramaciones({ usuarioId }) {
  const [canceladas, setCanceladas] = useState([]);
  const [enCurso, setEnCurso] = useState([]);
  const [citaSeleccionada, setCitaSeleccionada] = useState(null);
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

      // 1. Obtener citas canceladas de este Chair
      const { data: dataCanceladas, error: errC } = await supabase
        .from('agd_citas')
        .select('*')
        .eq('chair_id', chairIdNum)
        .ilike('estado', 'cancelado');

      if (errC) {
        console.error('Error al cargar canceladas:', errC);
      } else if (dataCanceladas) {
        // Enriquecer con datos del empresario/invitado de la tabla usuarios
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
      console.error('Error general cargando listas de reprogramación:', err);
    }
  };

  const seleccionarParaReprogramar = async (cita) => {
    setCitaSeleccionada(cita);
    setMensaje('');
    setHorarioSeleccionado(null);
    setLinkSesion('');

    try {
      const { data, error } = await supabase
        .from('agd_disponibilidad')
        .select('*')
        .eq('chair_id', Number(usuarioId))
        .eq('disponible', true)
        .order('fecha', { ascending: true });

      if (error) throw error;
      if (data) setHorariosLibres(data);
    } catch (err) {
      console.error('Error cargando disponibilidad:', err);
    }
  };

  const enviarPropuestaReprogramacion = async (e) => {
    e.preventDefault();
    if (!horarioSeleccionado) {
      setMensaje('Debes seleccionar un horario de la agenda.');
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
          fecha_propuesta_nueva: horarioSeleccionado,
          link_zoom: tieneLink ? linkSesion.trim() : null,
          estado: nuevoEstado
        })
        .eq('id', citaSeleccionada.id);

      if (error) throw error;

      setMensaje(
        tieneLink 
          ? '¡Propuesta y enlace enviados con éxito! La cita ha sido confirmada.' 
          : 'Propuesta enviada. La cita se movió a "Reprogramaciones en curso".'
      );

      setCitaSeleccionada(null);
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
                    <p style={estilos.textoItemDetalle}>Propuesta: {e.fecha_propuesta_nueva ? new Date(e.fecha_propuesta_nueva).toLocaleString() : 'Pendiente'}</p>
                  </div>
                  <span style={estilos.badgeEspera}>Esperando Link / Confirmación</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Columna 2: Panel de Selección de Horarios Libres */}
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

                <div style={estilos.grupoInput}>
                  <label style={estilos.label}>Horarios Libres en tu Agenda:</label>
                  {horariosLibres.length === 0 ? (
                    <p style={estilos.textoVacio}>No tienes horarios libres configurados actualmente.</p>
                  ) : (
                    <div style={estilos.listaHorarios}>
                      {horariosLibres.map((h, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => setHorarioSeleccionado(h.fecha || h.horario)}
                          style={{
                            ...estilos.itemHorario,
                            borderColor: horarioSeleccionado === (h.fecha || h.horario) ? '#00A89F' : '#E0E0E0',
                            backgroundColor: horarioSeleccionado === (h.fecha || h.horario) ? '#E0F2F1' : '#FAFAFA'
                          }}
                        >
                          {h.fecha ? new Date(h.fecha).toLocaleString() : JSON.stringify(h)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={estilos.grupoInput}>
                  <label style={estilos.label}>Enlace de Sesión (Opcional en este momento)</label>
                  <input 
                    type="url" 
                    value={linkSesion}
                    onChange={(e) => setLinkSesion(e.target.value)}
                    placeholder="https://zoom.us/j/..."
                    style={estilos.input}
                  />
                  <span style={estilos.ayudaInput}>Si no lo colocas, la cita pasará a "Reprogramaciones en curso".</span>
                </div>

                <button type="submit" disabled={cargando || !horarioSeleccionado} style={estilos.botonPrimario}>
                  {cargando ? 'Enviando...' : 'Enviar Propuesta de Reprogramación'}
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
  formulario: { display: 'flex', flexDirection: 'column', gap: '10px' },
  infoSeleccion: { fontSize: '0.8rem', color: '#00796B', margin: '0 0 5px 0', backgroundColor: '#E0F2F1', padding: '6px', borderRadius: '4px' },
  grupoInput: { display: 'flex', flexDirection: 'column', gap: '3px', textAlign: 'left' },
  label: { fontSize: '0.7rem', fontWeight: 'bold', color: '#444' },
  input: { padding: '7px', borderRadius: '6px', border: '1px solid #CCC', fontSize: '0.8rem', width: '100%', boxSizing: 'border-box' },
  ayudaInput: { fontSize: '0.65rem', color: '#666', marginTop: '2px' },
  listaHorarios: { maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' },
  itemHorario: { padding: '7px', borderRadius: '6px', border: '1px solid #E0E0E0', fontSize: '0.75rem', cursor: 'pointer' },
  botonPrimario: { padding: '9px', borderRadius: '6px', border: 'none', background: 'linear-gradient(90deg, #00A89F 0%, #88D84D 100%)', color: '#FFF', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '4px' }
};
