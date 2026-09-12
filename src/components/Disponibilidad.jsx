import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const DIAS_SEMANA_GENERICOS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function Disponibilidad({ usuarioId }) {
  const fechaActual = new Date();
  const mesActualStr = `${fechaActual.getFullYear()}-${String(fechaActual.getMonth() + 1).padStart(2, '0')}`;
  
  const [mesSeleccionado, setMesSeleccionado] = useState(mesActualStr);
  const [modo, setModo] = useState('base'); // 'base' para plantilla semanal, 'fechas' para excepciones puntuales
  
  // Plantilla por día de la semana
  const [plantillaSemanal, setPlantillaSemanal] = useState({});
  // Excepciones por fecha específica (YYYY-MM-DD)
  const [excepcionesFechas, setExcepcionesFechas] = useState({});
  const [diasDelMes, setDiasDelMes] = useState([]);
  
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    if (usuarioId && mesSeleccionado) {
      cargarDatos(mesSeleccionado);
    }
  }, [usuarioId, mesSeleccionado]);

  const cargarDatos = async (mesStr) => {
    setCargando(true);
    const [anio, mes] = mesStr.split('-').map(Number);
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
    setDiasDelMes(listaDias);

    // Consultar Supabase
    const { data } = await supabase
      .from('agd_restricciones_disponibilidad')
      .select('*')
      .eq('usuario_id', usuarioId)
      .eq('mes_periodo', mesStr);

    // 1. Inicializar Plantilla Semanal
    const mapaBase = {};
    DIAS_SEMANA_GENERICOS.forEach(dia => {
      const existente = data?.find(r => r.dia_semana === dia && !r.fecha_especifica);
      mapaBase[dia] = existente || {
        dia_semana: dia,
        bloqueado_todo_el_dia: dia === 'Sábado' || dia === 'Domingo',
        tramo_1_inicio: '00:00', tramo_1_fin: '08:00',
        tramo_2_inicio: '22:00', tramo_2_fin: '23:59',
        tramo_3_inicio: '', tramo_3_fin: '',
        tramo_4_inicio: '', tramo_4_fin: ''
      };
    });
    setPlantillaSemanal(mapaBase);

    // 2. Inicializar Excepciones por Fecha
    const mapaExcepciones = {};
    listaDias.forEach(item => {
      const existente = data?.find(r => r.fecha_especifica === item.fecha);
      if (existente) {
        mapaExcepciones[item.fecha] = existente;
      }
    });
    setExcepcionesFechas(mapaExcepciones);

    setCargando(false);
  };

  const manejarCambioPlantilla = (dia, campo, valor) => {
    setPlantillaSemanal(prev => ({
      ...prev,
      [dia]: { ...prev[dia], [campo]: valor }
    }));
  };

  const manejarCambioExcepcion = (fecha, campo, valor) => {
    setExcepcionesFechas(prev => ({
      ...prev,
      [fecha]: {
        ...(prev[fecha] || plantillaSemanal[diasDelMes.find(d => d.fecha === fecha)?.nombreDia]),
        [campo]: valor,
        fecha_especifica: fecha
      }
    }));
  };

  const replicarLunesATodos = () => {
    const patronLunes = plantillaSemanal['Lunes'];
    const nuevoMapa = {};
    DIAS_SEMANA_GENERICOS.forEach(dia => {
      nuevoMapa[dia] = { ...patronLunes, dia_semana: dia };
    });
    setPlantillaSemanal(nuevoMapa);
    setMensaje('Se aplicaron los horarios del Lunes a toda la semana base.');
    setTimeout(() => setMensaje(''), 4000);
  };

  const guardarConfiguracion = async (e) => {
    e.preventDefault();
    setCargando(true);
    setMensaje('');

    try {
      // Limpiar registros previos del mes
      await supabase.from('agd_restricciones_disponibilidad')
        .delete()
        .eq('usuario_id', usuarioId)
        .eq('mes_periodo', mesSeleccionado);

      // Guardar plantilla base semanal
      const payloadBase = DIAS_SEMANA_GENERICOS.map(dia => {
        const item = plantillaSemanal[dia];
        return {
          usuario_id: usuarioId,
          mes_periodo: mesSeleccionado,
          dia_semana: dia,
          fecha_especifica: null,
          bloqueado_todo_el_dia: item.bloqueado_todo_el_dia,
          tramo_1_inicio: item.tramo_1_inicio || null,
          tramo_1_fin: item.tramo_1_fin || null,
          tramo_2_inicio: item.tramo_2_inicio || null,
          tramo_2_fin: item.tramo_2_fin || null,
          tramo_3_inicio: item.tramo_3_inicio || null,
          tramo_3_fin: item.tramo_3_fin || null,
          tramo_4_inicio: item.tramo_4_inicio || null,
          tramo_4_fin: item.tramo_4_fin || null,
        };
      });

      // Guardar excepciones puntuales de fechas
      const payloadExcepciones = Object.keys(excepcionesFechas).map(fecha => {
        const item = excepcionesFechas[fecha];
        const diaInfo = diasDelMes.find(d => d.fecha === fecha);
        return {
          usuario_id: usuarioId,
          mes_periodo: mesSeleccionado,
          dia_semana: diaInfo?.nombreDia || 'Lunes',
          fecha_especifica: fecha,
          bloqueado_todo_el_dia: item.bloqueado_todo_el_dia,
          tramo_1_inicio: item.tramo_1_inicio || null,
          tramo_1_fin: item.tramo_1_fin || null,
          tramo_2_inicio: item.tramo_2_inicio || null,
          tramo_2_fin: item.tramo_2_fin || null,
          tramo_3_inicio: item.tramo_3_inicio || null,
          tramo_3_fin: item.tramo_3_fin || null,
          tramo_4_inicio: item.tramo_4_inicio || null,
          tramo_4_fin: item.tramo_4_fin || null,
        };
      });

      const { error } = await supabase.from('agd_restricciones_disponibilidad')
        .insert([...payloadBase, ...payloadExcepciones]);

      if (error) {
        setMensaje('Error al guardar: ' + error.message);
      } else {
        setMensaje('¡Configuración guardada correctamente!');
        setTimeout(() => setMensaje(''), 4000);
      }
    } catch (err) {
      setMensaje('Error de conexión.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={estilos.contenedor}>
      <h2 style={estilos.titulo}>Disponibilidad y Horarios</h2>
      <p style={estilos.subtitulo}>Configura tu base semanal y ajusta fechas puntuales si lo requieres.</p>

      {/* Selector de Mes */}
      <div style={estilos.seccionMes}>
        <label style={estilos.labelMes}>Seleccionar Mes:</label>
        <input 
          type="month" 
          value={mesSeleccionado}
          onChange={(e) => setMesSeleccionado(e.target.value)}
          style={estilos.inputMes}
        />
      </div>

      {/* Selector de Modo (Pestañas móviles) */}
      <div style={estilos.pestanasContainer}>
        <button 
          type="button" 
          onClick={() => setModo('base')}
          style={{ ...estilos.pestana, backgroundColor: modo === 'base' ? '#00A89F' : '#E0E0E0', color: modo === 'base' ? '#FFF' : '#333' }}
        >
          1. Plantilla Base Semanal
        </button>
        <button 
          type="button" 
          onClick={() => setModo('fechas')}
          style={{ ...estilos.pestana, backgroundColor: modo === 'fechas' ? '#00A89F' : '#E0E0E0', color: modo === 'fechas' ? '#FFF' : '#333' }}
        >
          2. Ajustes por Fecha Especifica
        </button>
      </div>

      <form onSubmit={guardarConfiguracion}>
        
        {/* MODO 1: PLANTILLA SEMANAL */}
        {modo === 'base' && (
          <div>
            <div style={estilos.barraAcciones}>
              <button type="button" onClick={replicarLunesATodos} style={estilos.botonAccion}>
                Replicar Lunes a Toda la Semana
              </button>
            </div>

            {DIAS_SEMANA_GENERICOS.map(dia => {
              const item = plantillaSemanal[dia] || {};
              return (
                <div key={dia} style={estilos.tarjetaDia}>
                  <div style={estilos.cabeceraDia}>
                    <span style={estilos.nombreDia}>{dia}</span>
                    <label style={estilos.labelCheckbox}>
                      <input 
                        type="checkbox"
                        checked={item.bloqueado_todo_el_dia || false}
                        onChange={(e) => manejarCambioPlantilla(dia, 'bloqueado_todo_el_dia', e.target.checked)}
                        style={estilos.checkbox}
                      />
                      Bloquear día
                    </label>
                  </div>

                  {!item.bloqueado_todo_el_dia && (
                    <div style={estilos.tramosContainer}>
                      {[1, 2, 3, 4].map(num => (
                        <div key={num} style={estilos.tramoRow}>
                          <span style={estilos.tramoLabel}>T{num}</span>
                          <div style={estilos.inputsTimeWrapper}>
                            <input 
                              type="time" 
                              value={item[`tramo_${num}_inicio`] || ''}
                              onChange={(e) => manejarCambioPlantilla(dia, `tramo_${num}_inicio`, e.target.value)}
                              style={estilos.inputTime}
                            />
                            <span style={estilos.separadorHora}>a</span>
                            <input 
                              type="time" 
                              value={item[`tramo_${num}_fin`] || ''}
                              onChange={(e) => manejarCambioPlantilla(dia, `tramo_${num}_fin`, e.target.value)}
                              style={estilos.inputTime}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* MODO 2: AJUSTES POR FECHA ESPECÍFICA */}
        {modo === 'fechas' && (
          <div>
            <p style={estilos.avisoFechas}>Aquí solo muestra y edita las fechas que requieran un cambio especial (ej. feriados, viajes o cumpleaños).</p>
            {diasDelMes.map(d => {
              const item = excepcionesFechas[d.fecha] || plantillaSemanal[d.nombreDia] || {};
              const tieneExcepcion = !!excepcionesFechas[d.fecha];

              return (
                <div key={d.fecha} style={{ ...estilos.tarjetaDia, borderColor: tieneExcepcion ? '#00A89F' : '#EAEAEA' }}>
                  <div style={estilos.cabeceraDia}>
                    <div style={estilos.infoDia}>
                      <span style={estilos.badgeFecha}>{d.diaNumero}</span>
                      <span style={estilos.nombreDia}>{d.nombreDia} ({d.fecha})</span>
                    </div>
                    <label style={estilos.labelCheckbox}>
                      <input 
                        type="checkbox"
                        checked={item.bloqueado_todo_el_dia || false}
                        onChange={(e) => manejarCambioExcepcion(d.fecha, 'bloqueado_todo_el_dia', e.target.checked)}
                        style={estilos.checkbox}
                      />
                      Bloquear
                    </label>
                  </div>

                  {!item.bloqueado_todo_el_dia && (
                    <div style={estilos.tramosContainer}>
                      {[1, 2, 3, 4].map(num => (
                        <div key={num} style={estilos.tramoRow}>
                          <span style={estilos.tramoLabel}>T{num}</span>
                          <div style={estilos.inputsTimeWrapper}>
                            <input 
                              type="time" 
                              value={item[`tramo_${num}_inicio`] !== undefined ? item[`tramo_${num}_inicio`] : (plantillaSemanal[d.nombreDia]?.[`tramo_${num}_inicio`] || '')}
                              onChange={(e) => manejarCambioExcepcion(d.fecha, `tramo_${num}_inicio`, e.target.value)}
                              style={estilos.inputTime}
                            />
                            <span style={estilos.separadorHora}>a</span>
                            <input 
                              type="time" 
                              value={item[`tramo_${num}_fin`] !== undefined ? item[`tramo_${num}_fin`] : (plantillaSemanal[d.nombreDia]?.[`tramo_${num}_fin`] || '')}
                              onChange={(e) => manejarCambioExcepcion(d.fecha, `tramo_${num}_fin`, e.target.value)}
                              style={estilos.inputTime}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {mensaje && <p style={estilos.mensaje}>{mensaje}</p>}

        <button type="submit" disabled={cargando} style={estilos.botonGuardar}>
          {cargando ? 'Guardando...' : 'Guardar Toda la Configuración'}
        </button>
      </form>
    </div>
  );
}

const estilos = {
  contenedor: { padding: '10px', maxWidth: '100%', width: '100%', boxSizing: 'border-box', fontFamily: 'sans-serif', backgroundColor: '#F8F9FA' },
  titulo: { fontSize: '1.2rem', color: '#333333', marginBottom: '4px', textAlign: 'center' },
  subtitulo: { fontSize: '0.8rem', color: '#666666', marginBottom: '12px', textAlign: 'center', lineHeight: '1.3' },
  seccionMes: { display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px', backgroundColor: '#FFFFFF', padding: '10px', borderRadius: '8px', border: '1px solid #EAEAEA', boxSizing: 'border-box' },
  labelMes: { fontSize: '0.8rem', fontWeight: 'bold', color: '#444' },
  inputMes: { padding: '8px', borderRadius: '6px', border: '1px solid #CCCCCC', fontSize: '0.85rem', backgroundColor: '#FAFAFA', width: '100%', boxSizing: 'border-box' },
  pestanasContainer: { display: 'flex', gap: '5px', marginBottom: '12px' },
  pestana: { flex: 1, padding: '8px 4px', borderRadius: '6px', border: 'none', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center' },
  barraAcciones: { marginBottom: '10px' },
  botonAccion: { width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #00A89F', backgroundColor: '#EBF5F7', color: '#00A89F', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' },
  avisoFechas: { fontSize: '0.75rem', color: '#666', marginBottom: '10px', textAlign: 'center', fontStyle: 'italic' },
  tarjetaDia: { backgroundColor: '#FFFFFF', padding: '10px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: '10px', border: '1px solid #EAEAEA', boxSizing: 'border-box', width: '100%' },
  cabeceraDia: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #F0F0F0', paddingBottom: '6px' },
  infoDia: { display: 'flex', alignItems: 'center', overflow: 'hidden' },
  badgeFecha: { backgroundColor: '#EBF5F7', color: '#00A89F', padding: '2px 5px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.75rem', marginRight: '5px', flexShrink: '0' },
  nombreDia: { fontSize: '0.85rem', color: '#333', fontWeight: 'bold' },
  labelCheckbox: { fontSize: '0.7rem', color: '#D9534F', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer', whiteSpace: 'nowrap' },
  checkbox: { width: '14px', height: '14px', cursor: 'pointer' },
  tramosContainer: { display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', boxSizing: 'border-box' },
  tramoRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#555555', width: '100%' },
  tramoLabel: { fontWeight: '500', color: '#666', width: '25px', flexShrink: '0' },
  inputsTimeWrapper: { display: 'flex', alignItems: 'center', gap: '4px', flex: '1', justifyContent: 'flex-end', boxSizing: 'border-box' },
  inputTime: { padding: '5px 2px', borderRadius: '4px', border: '1px solid #CCCCCC', fontSize: '0.75rem', backgroundColor: '#FAFAFA', width: '42%', maxWidth: '95px', textAlign: 'center', boxSizing: 'border-box' },
  separadorHora: { color: '#888', fontSize: '0.75rem', flexShrink: '0' },
  mensaje: { fontSize: '0.8rem', color: '#00A89F', fontWeight: 'bold', textAlign: 'center', margin: '10px 0' },
  botonGuardar: { width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: 'linear-gradient(90deg, #00A89F 0%, #88D84D 100%)', color: '#FFFFFF', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0, 168, 159, 0.2)', marginTop: '10px', boxSizing: 'border-box' }
};
