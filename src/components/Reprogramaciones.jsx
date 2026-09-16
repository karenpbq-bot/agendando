import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { supabase } from '../supabaseClient';

export default function Reprogramaciones({ usuarioId }) {
  const [canceladas, setCanceladas] = useState([]);
  const [enCurso, setEnCurso] = useState([]);
  const [empresarios, setEmpresarios] = useState([]);
  const [citaSeleccionada, setCitaSeleccionada] = useState(null);
  
  const [rangoDias, setRangoDias] = useState(7);
  const [horariosAgrupadosPorDia, setHorariosAgrupadosPorDia] = useState({});
  const [diasAbiertos, setDiasAbiertos] = useState({});

  // Estados para el Modal y el Switch de reutilización de link
  const [modalAbierto, setModalAbierto] = useState(false);
  const [slotElegido, setSlotElegido] = useState(null);
  const [linkZoom, setLinkZoom] = useState('');
  const [mantenerLinkAnterior, setMantenerLinkAnterior] = useState(false);
  
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
      if (dataEmp) setEmpresarios(dataEmp);

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

      const agrupado = {};
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

        const slotsDelDia = [];

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
              return sIniM < cFinM && sFinM > cFinM;
            });

            if (!solapaCita) {
              slotsDelDia.push({
                fecha: fechaStr,
                horaInicio: slotIniStr,
                horaFin: slotFinStr,
                label: `${slotIniStr} - ${slotFinStr}`
              });
            }
          }

          cursor = cursor.add(30, 'minute');
        }

        if (slotsDelDia.length > 0) {
          agrupado[fechaStr] = slotsDelDia;
        }
      }

      setHorariosAgrupadosPorDia(agrupado);
    } catch (err) {
      console.error('Error calculando espacios libres:', err);
    } finally {
      setCargando(false);
    }
  };

  const seleccionarParaReprogramar = async (cita, dias = rangoDias) => {
    setCitaSeleccionada(cita);
    setMensaje('');
    await calcularEspaciosLibres(dias, cita);
  };

  const cambiarRangoDias = async (dias) => {
    setRangoDias(dias);
    if (citaSeleccionada) {
      await calcularEspaciosLibres(dias, citaSeleccionada);
    }
  };

  const toggleDiaAbierto = (fechaStr) => {
    setDiasAbiertos(prev => ({
      ...prev,
      [fechaStr]: !prev[fechaStr]
    }));
  };

  // Al hacer clic en un slot libre, abre INMEDIATAMENTE el modal
  const abrirModalSlot = (slot) => {
    setSlotElegido(slot);
    setMantenerLinkAnterior(false); // Switch apagado por defecto
    setLinkZoom(''); // Limpio para exigir el nuevo link salvo que prendan el switch
    setModalAbierto(true);
  };

  const handleSwitchChange = (e) => {
    const activo = e.target.checked;
    setMantenerLinkAnterior(activo);
    if (activo) {
      setLinkZoom(citaSeleccionada?.link_zoom || '');
    } else {
      setLinkZoom('');
    }
  };

  const confirmarReprogramacionFinal = async (e) => {
    e.preventDefault();
    if (!slotElegido || !citaSeleccionada) return;

    if (!linkZoom || linkZoom.trim() === '') {
      alert('Debes ingresar el enlace de la reunión (Zoom / Meet).');
      return;
    }

    setCargando(true);
    setMensaje('');

    try {
      const { error } = await supabase
        .from('agd_citas')
        .update({
          fecha_cita: slotElegido.fecha,
          hora_inicio: slotElegido.horaInicio,
          hora_fin: slotElegido.horaFin,
          link_zoom: linkZoom.trim(),
          estado: 'reservado'
        })
        .eq('id', citaSeleccionada.id);

      if (error) throw error;

      setMensaje('¡Cita reprogramada con éxito (Reservado)!');
      setModalAbierto(false);
      setCitaSeleccionada(null);
      setHorariosAgrupadosPorDia({});
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
        <div style={estilos.cardSeccionAmpliada}>
          <div style={estilos.headerPantallaReprogramacion}>
            <button onClick={() => setCitaSeleccionada(null)} style={estilos.botonVolver}>
              ❮ Volver a la Bandeja
            </button>
            <h3 style={{...estilos.subSubTitulo, margin: 0, border: 'none'}}>Seleccionar Nuevo Horario</h3>
          </div>

          <p style={estilos.infoSeleccion}>
            Reprogramando cita para: <b>{citaSeleccionada.usuarios?.nombre_completo || 'Invitado'}</b>. Haz clic directamente en un horario disponible para abrir el formulario de confirmación.
          </p>

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
            <label style={estilos.label}>Disponibilidad y Horarios Libres:</label>
            {cargando ? (
              <p style={estilos.textoVacio}>Buscando espacios libres...</p>
            ) : Object.keys(horariosAgrupadosPorDia).length === 0 ? (
              <p style={estilos.textoVacio}>No hay espacios libres en este rango.</p>
            ) : (
              <div style={estilos.contenedorTarjetasDias}>
                {Object.entries(horariosAgrupadosPorDia).map(([fecha, slots]) => {
                  const estaAbierto = diasAbiertos[fecha];
                  return (
                    <div key={fecha} style={estilos.tarjetaDia}>
                      <div 
                        onClick={() => toggleDiaAbierto(fecha)}
                        style={estilos.tarjetaDiaHeader}
                      >
                        <span style={estilos.tarjetaDiaTitulo}>{fecha}</span>
                        <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                          <span style={estilos.tarjetaDiaBadge}>{slots.length} espacios libres</span>
                          <span style={{fontSize: '0.75rem', color: '#00796B', fontWeight: 'bold'}}>{estaAbierto ? '▲' : '▼'}</span>
                        </div>
                      </div>

                      {estaAbierto && (
                        <div style={estilos.tarjetaDiaBody}>
                          <div style={estilos.gridSlots}>
                            {slots.map((h, idx) => (
                              <div 
                                key={idx} 
                                onClick={() => abrirModalSlot(h)}
                                style={estilos.itemSlotHora}
                                title="Haz clic para abrir la ventana de confirmación"
                              >
                                {h.label}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ventana Emergente (Modal) Directa */}
      {modalAbierto && slotElegido && (
        <div style={estilos.modalOverlay}>
          <div style={estilos.modalContenido}>
            <div style={estilos.modalHeaderDecorado}>
              <h3 style={estilos.modalTitulo}>✨ Confirmar Reprogramación</h3>
              <span style={estilos.modalSubFecha}>{slotElegido.fecha} | {slotElegido.label}</span>
            </div>

            <form onSubmit={confirmarReprogramacionFinal} style={estilos.formularioModal}>
              <div style={estilos.grupoInputModal}>
                <label style={estilos.labelModal}>Invitado:</label>
                <p style={estilos.textoInvitadoModal}><b>{citaSeleccionada?.usuarios?.nombre_completo || 'Invitado'}</b></p>
              </div>

              {/* Switch de Reutilización de Link */}
              <div style={estilos.contenedorSwitch}>
                <label style={estilos.labelSwitch}>
                  <span>¿Mantener el link de reunión anterior?</span>
                  <input 
                    type="checkbox" 
                    checked={mantenerLinkAnterior}
                    onChange={handleSwitchChange}
                    style={estilos.checkboxSwitch}
                  />
                </label>
                {citaSeleccionada?.link_zoom && (
                  <span style={estilos.textoAnteriorLink}>Link anterior: {citaSeleccionada.link_zoom}</span>
                )}
              </div>

              <div style={estilos.grupoInputModal}>
                <label style={estilos.labelModal}>
                  Link de Reunión (Zoom / Meet): <span style={{color: '#DC2626'}}>*</span>
                </label>
                <input 
                  type="url" 
                  value={linkZoom}
                  onChange={(e) => setLinkZoom(e.target.value)}
                  placeholder="https://zoom.us/j/..."
                  style={{
                    ...estilos.inputModal, 
                    backgroundColor: mantenerLinkAnterior ? '#E2E8F0' : '#FAFAFA'
                  }}
                  disabled={mantenerLinkAnterior}
                  required
                />
                {!mantenerLinkAnterior && (
                  <span style={estilos.ayudaInput}>Introduce el nuevo enlace o activa el switch superior para reutilizar el anterior.</span>
                )}
              </div>

              <div style={estilos.contenedorBotonesAccion}>
                <button type="submit" disabled={cargando} style={estilos.botonGuardarPrincipal}>
                  {cargando ? 'Procesando...' : '💾 Confirmar Reprogramación'}
                </button>
                <button type="button" onClick={() => setModalAbierto(false)} style={estilos.botonCerrarModal}>
                  Desistir / Cambiar Fecha
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
  mensajeGeneral: { fontSize: '0.85rem', color: '#00A89F', textAlign: 'center', fontWeight: 'bold', margin: '6px 0' },
  stackContenedor: { display: 'flex', flexDirection: 'column', gap: '15px' },
  cardSeccion: { backgroundColor: '#FFF', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #EAEAEA', boxSizing: 'border-box', width: '100%' },
  cardSeccionAmpliada: { backgroundColor: '#FFF', padding: '20px', borderRadius: '12px', boxShadow: '0 3px 12px rgba(0,0,0,0.06)', border: '1px solid #EAEAEA', boxSizing: 'border-box', width: '100%' },
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

  infoSeleccion: { fontSize: '0.85rem', color: '#00A89F', margin: '0 0 10px 0', backgroundColor: '#E0F2F1', padding: '10px', borderRadius: '8px' },
  grupoInput: { display: 'flex', flexDirection: 'column', gap: '5px', textAlign: 'left' },
  label: { fontSize: '0.8rem', fontWeight: 'bold', color: '#334155' },
  ayudaInput: { fontSize: '0.7rem', color: '#64748B', marginTop: '3px' },
  
  contenedorTarjetasDias: { display: 'flex', flexDirection: 'column', gap: '12px' },
  tarjetaDia: { border: '1px solid #00A89F', borderRadius: '8px', backgroundColor: '#FFF', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  tarjetaDiaHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: '#E0F2F1', borderBottom: '1px solid #00A89F', cursor: 'pointer', userSelect: 'none' },
  tarjetaDiaTitulo: { fontSize: '0.85rem', fontWeight: 'bold', color: '#004D40' },
  tarjetaDiaBadge: { fontSize: '0.7rem', color: '#00796B', fontWeight: 'bold', backgroundColor: '#FFF', padding: '2px 6px', borderRadius: '4px', border: '1px solid #B2DFDB' },
  tarjetaDiaBody: { padding: '12px', backgroundColor: '#FFF' },
  
  gridSlots: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '8px' },
  itemSlotHora: { padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem', cursor: 'pointer', textAlign: 'center', backgroundColor: '#FFF', transition: 'all 0.15s ease' },

  // Estilos del Modal y Switch
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' },
  modalContenido: { backgroundColor: '#FFF', padding: '25px', borderRadius: '14px', width: '100%', maxWidth: '440px', boxSizing: 'border-box', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' },
  modalHeaderDecorado: { borderBottom: '2px solid #E0F2F1', paddingBottom: '10px', marginBottom: '15px', textAlign: 'center' },
  modalTitulo: { fontSize: '1.05rem', color: '#00796B', fontWeight: 'bold', margin: '0 0 4px 0' },
  modalSubFecha: { fontSize: '0.8rem', color: '#555', fontWeight: 'bold' },
  formularioModal: { display: 'flex', flexDirection: 'column', gap: '12px' },
  grupoInputModal: { display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' },
  labelModal: { fontSize: '0.75rem', fontWeight: 'bold', color: '#34495E' },
  textoInvitadoModal: { fontSize: '0.85rem', color: '#1E293B', margin: '0' },
  
  contenedorSwitch: { backgroundColor: '#F1F5F9', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', textAlign: 'left' },
  labelSwitch: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', fontWeight: 'bold', color: '#334155', cursor: 'pointer' },
  checkboxSwitch: { width: '18px', height: '18px', cursor: 'pointer', accentColor: '#00A89F' },
  textoAnteriorLink: { display: 'block', fontSize: '0.7rem', color: '#64748B', marginTop: '4px', wordBreak: 'break-all' },

  inputModal: { padding: '9px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' },
  contenedorBotonesAccion: { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' },
  botonGuardarPrincipal: { width: '100%', padding: '11px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #00A89F 0%, #00796B 100%)', color: '#FFF', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 3px 6px rgba(0,168,159,0.3)' },
  botonCerrarModal: { width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #CFD8DC', background: '#FFFFFF', color: '#607D8B', fontSize: '0.80rem', fontWeight: 'bold', cursor: 'pointer' }
};
