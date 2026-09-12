import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function Disponibilidad({ usuarioId }) {
  const fechaActual = new Date();
  const mesActualStr = `${fechaActual.getFullYear()}-${String(fechaActual.getMonth() + 1).padStart(2, '0')}`;
  
  const [mesSeleccionado, setMesSeleccionado] = useState(mesActualStr);
  const [restricciones, setRestricciones] = useState({});
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    if (usuarioId) {
      cargarRestricciones(mesSeleccionado);
    }
  }, [usuarioId, mesSeleccionado]);

  const cargarRestricciones = async (mes) => {
    setCargando(true);
    const { data, error } = await supabase
      .from('agd_restricciones_disponibilidad')
      .select('*')
      .eq('usuario_id', usuarioId)
      .eq('mes_periodo', mes);

    const mapa = {};
    DIAS_SEMANA.forEach(dia => {
      const existente = data?.find(r => r.dia_semana === dia);
      mapa[dia] = existente || {
        dia_semana: dia,
        bloqueado_todo_el_dia: dia === 'Sábado' || dia === 'Domingo',
        tramo_1_inicio: '00:00', tramo_1_fin: '08:00', // Predeterminado madrugada
        tramo_2_inicio: '22:00', tramo_2_fin: '23:59', // Predeterminado noche
        tramo_3_inicio: '', tramo_3_fin: '',
        tramo_4_inicio: '', tramo_4_fin: ''
      };
    });
    setRestricciones(mapa);
    setCargando(false);
  };

  const manejarCambioDia = (dia, campo, valor) => {
    setRestricciones(prev => ({
      ...prev,
      [dia]: {
        ...prev[dia],
        [campo]: valor
      }
    }));
  };

  const copiarLunesATodos = () => {
    const patronLunes = restricciones['Lunes'];
    const nuevoMapa = {};
    DIAS_SEMANA.forEach(dia => {
      nuevoMapa[dia] = { ...patronLunes, dia_semana: dia };
    });
    setRestricciones(nuevoMapa);
    setMensaje('Se aplicaron los horarios del Lunes a todos los días.');
    setTimeout(() => setMensaje(''), 3000);
  };

  const copiarMesAnterior = async () => {
    // Calcular mes anterior
    const [anio, mes] = mesSeleccionado.split('-').map(Number);
    const fechaAnt = new Date(anio, mes - 2, 1);
    const mesAntStr = `${fechaAnt.getFullYear()}-${String(fechaAnt.getMonth() + 1).padStart(2, '0')}`;

    setCargando(true);
    const { data, error } = await supabase
      .from('agd_restricciones_disponibilidad')
      .select('*')
      .eq('usuario_id', usuarioId)
      .eq('mes_periodo', mesAntStr);

    if (error || !data || data.length === 0) {
      setMensaje('No se encontraron registros en el mes anterior.');
      setCargando(false);
      return;
    }

    const mapa = {};
    DIAS_SEMANA.forEach(dia => {
      const existente = data.find(r => r.dia_semana === dia);
      mapa[dia] = existente ? { ...existente, id: undefined, mes_periodo: mesSeleccionado } : {
        dia_semana: dia,
        bloqueado_todo_el_dia: false,
        tramo_1_inicio: '', tramo_1_fin: '', tramo_2_inicio: '', tramo_2_fin: '',
        tramo_3_inicio: '', tramo_3_fin: '', tramo_4_inicio: '', tramo_4_fin: ''
      };
    });
    setRestricciones(mapa);
    setMensaje(`Se cargaron las restricciones de ${mesAntStr} como base.`);
    setCargando(false);
    setTimeout(() => setMensaje(''), 4000);
  };

  const guardarConfiguracion = async (e) => {
    e.preventDefault();
    setCargando(true);
    setMensaje('');

    try {
      // Borramos las del mes actual para reinsertar limpias
      await supabase.from('agd_restricciones_disponibilidad')
        .delete()
        .eq('usuario_id', usuarioId)
        .eq('mes_periodo', mesSeleccionado);

      const payload = DIAS_SEMANA.map(dia => ({
        usuario_id: usuarioId,
        mes_periodo: mesSeleccionado,
        dia_semana: dia,
        bloqueado_todo_el_dia: restricciones[dia].bloqueado_todo_el_dia,
        tramo_1_inicio: restricciones[dia].tramo_1_inicio || null,
        tramo_1_fin: restricciones[dia].tramo_1_fin || null,
        tramo_2_inicio: restricciones[dia].tramo_2_inicio || null,
        tramo_2_fin: restricciones[dia].tramo_2_fin || null,
        tramo_3_inicio: restricciones[dia].tramo_3_inicio || null,
        tramo_3_fin: restricciones[dia].tramo_3_fin || null,
        tramo_4_inicio: restricciones[dia].tramo_4_inicio || null,
        tramo_4_fin: restricciones[dia].tramo_4_fin || null,
      }));

      const { error } = await supabase.from('agd_restricciones_disponibilidad').insert(payload);

      if (error) {
        setMensaje('Error al guardar: ' + error.message);
      } else {
        setMensaje('¡Restricciones del mes guardadas con éxito!');
        setTimeout(() => setMensaje(''), 4000);
      }
    } catch (err) {
      setMensaje('Error de conexión con la base de datos.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={estilos.contenedor}>
      <h2 style={estilos.titulo}>Disponibilidad y Horarios</h2>
      <p style={estilos.subtitulo}>
        Configura las franjas de no disponibilidad para el período seleccionado.
      </p>

      {/* Selector de Mes */}
      <div style={estilos.seccionMes}>
        <label style={estilos.labelMes}>Mes a Declarar:</label>
        <input 
          type="month" 
          value={mesSeleccionado}
          onChange={(e) => setMesSeleccionado(e.target.value)}
          style={estilos.inputMes}
        />
      </div>

      {/* Botones de Acciones Rápidas */}
      <div style={estilos.accionesRapidas}>
        <button type="button" onClick={copiarLunesATodos} style={estilos.botonSecundario}>
          Copiar Lunes a Todos
        </button>
        <button type="button" onClick={copiarMesAnterior} style={estilos.botonSecundario}>
          Copiar Mes Anterior
        </button>
      </div>

      <form onSubmit={guardarConfiguracion}>
        {DIAS_SEMANA.map(dia => {
          const item = restricciones[dia] || {};
          return (
            <div key={dia} style={estilos.tarjetaDia}>
              <div style={estilos.cabeceraDia}>
                <h3 style={estilos.nombreDia}>{dia}</h3>
                <label style={estilos.labelCheckbox}>
                  <input 
                    type="checkbox"
                    checked={item.bloqueado_todo_el_dia || false}
                    onChange={(e) => manejarCambioDia(dia, 'bloqueado_todo_el_dia', e.target.checked)}
                    style={estilos.checkbox}
                  />
                  Bloquear día
                </label>
              </div>

              {!item.bloqueado_todo_el_dia && (
                <div style={estilos.tramosContainer}>
                  {[1, 2, 3, 4].map(num => (
                    <div key={num} style={estilos.tramoRow}>
                      <span style={estilos.tramoLabel}>Tramo {num}</span>
                      <div style={estilos.inputsTimeWrapper}>
                        <input 
                          type="time" 
                          value={item[`tramo_${num}_inicio`] || ''}
                          onChange={(e) => manejarCambioDia(dia, `tramo_${num}_inicio`, e.target.value)}
                          style={estilos.inputTime}
                        />
                        <span style={estilos.separadorHora}>a</span>
                        <input 
                          type="time" 
                          value={item[`tramo_${num}_fin`] || ''}
                          onChange={(e) => manejarCambioDia(dia, `tramo_${num}_fin`, e.target.value)}
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

        {mensaje && <p style={estilos.mensaje}>{mensaje}</p>}

        <button type="submit" disabled={cargando} style={estilos.botonGuardar}>
          {cargando ? 'Guardando...' : 'Guardar Disponibilidad del Mes'}
        </button>
      </form>
    </div>
  );
}

const estilos = {
  contenedor: { padding: '15px', maxWidth: '100%', width: '100%', boxSizing: 'border-box', fontFamily: 'sans-serif', backgroundColor: '#F8F9FA' },
  titulo: { fontSize: '1.3rem', color: '#333333', marginBottom: '5px', textAlign: 'center' },
  subtitulo: { fontSize: '0.85rem', color: '#666666', marginBottom: '15px', textAlign: 'center', lineHeight: '1.4' },
  seccionMes: { display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '15px', backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '8px', border: '1px solid #EAEAEA' },
  labelMes: { fontSize: '0.85rem', fontWeight: 'bold', color: '#444' },
  inputMes: { padding: '8px', borderRadius: '6px', border: '1px solid #CCCCCC', fontSize: '0.9rem', backgroundColor: '#FAFAFA' },
  accionesRapidas: { display: 'flex', gap: '8px', marginBottom: '15px' },
  botonSecundario: { flex: 1, padding: '10px 5px', borderRadius: '6px', border: '1px solid #00A89F', backgroundColor: '#FFFFFF', color: '#00A89F', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center' },
  tarjetaDia: { backgroundColor: '#FFFFFF', padding: '14px', borderRadius: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)', marginBottom: '12px', border: '1px solid #EAEAEA' },
  cabeceraDia: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #F0F0F0', paddingBottom: '8px' },
  nombreDia: { fontSize: '1rem', color: '#00A89F', margin: '0', fontWeight: 'bold' },
  labelCheckbox: { fontSize: '0.8rem', color: '#D9534F', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' },
  checkbox: { width: '18px', height: '18px', cursor: 'pointer' },
  tramosContainer: { display: 'flex', flexDirection: 'column', gap: '8px' },
  tramoRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#555555' },
  tramoLabel: { fontWeight: '500', color: '#666', minWidth: '55px' },
  inputsTimeWrapper: { display: 'flex', alignItems: 'center', gap: '6px' },
  inputTime: { padding: '8px 6px', borderRadius: '6px', border: '1px solid #CCCCCC', fontSize: '0.85rem', backgroundColor: '#FAFAFA', width: '110px', textAlign: 'center' },
  separadorHora: { color: '#888', fontSize: '0.8rem' },
  mensaje: { fontSize: '0.85rem', color: '#00A89F', fontWeight: 'bold', textAlign: 'center', margin: '15px 0' },
  botonGuardar: { width: '100%', padding: '14px', borderRadius: '8px', border: 'none', background: 'linear-gradient(90deg, #00A89F 0%, #88D84D 100%)', color: '#FFFFFF', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0, 168, 159, 0.2)', marginTop: '10px' }
};
