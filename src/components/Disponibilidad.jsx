import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function Disponibilidad({ usuarioId }) {
  const [restricciones, setRestricciones] = useState({});
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    if (usuarioId) {
      cargarRestricciones();
    }
  }, [usuarioId]);

  const cargarRestricciones = async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from('agd_restricciones_disponibilidad')
      .select('*')
      .eq('usuario_id', usuarioId);

    if (!error && data) {
      const mapa = {};
      DIAS_SEMANA.forEach(dia => {
        const existente = data.find(r => r.dia_semana === dia);
        mapa[dia] = existente || {
          dia_semana: dia,
          bloqueado_todo_el_dia: dia === 'Sábado' || dia === 'Domingo',
          tramo_1_inicio: '', tramo_1_fin: '',
          tramo_2_inicio: '', tramo_2_fin: '',
          tramo_3_inicio: '', tramo_3_fin: '',
          tramo_4_inicio: '', tramo_4_fin: ''
        };
      });
      setRestricciones(mapa);
    }
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

  const guardarConfiguracion = async (e) => {
    e.preventDefault();
    setCargando(true);
    setMensaje('');

    try {
      await supabase.from('agd_restricciones_disponibilidad').delete().eq('usuario_id', usuarioId);

      const payload = DIAS_SEMANA.map(dia => ({
        usuario_id: usuarioId,
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
        setMensaje('¡Configuración de disponibilidad guardada con éxito!');
        setTimeout(() => setMensaje(''), 4000);
      }
    } catch (err) {
      setMensaje('Error de conexión con la base de datos.');
    } finally {
      setCargando(false);
    }
  };

  if (cargando && Object.keys(restricciones).length === 0) {
    return <p style={{ padding: '20px', textAlign: 'center' }}>Cargando disponibilidad...</p>;
  }

  return (
    <div style={estilos.contenedor}>
      <h2 style={estilos.titulo}>Disponibilidad y Horarios</h2>
      <p style={estilos.subtitulo}>
        Indica los tramos horarios en los que <b>no estarás disponible</b> o bloquea el día completo.
      </p>

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
          {cargando ? 'Guardando...' : 'Guardar Configuración'}
        </button>
      </form>
    </div>
  );
}

const estilos = {
  contenedor: { padding: '15px', maxWidth: '100%', width: '100%', boxSizing: 'border-box', fontFamily: 'sans-serif', backgroundColor: '#F8F9FA' },
  titulo: { fontSize: '1.3rem', color: '#333333', marginBottom: '5px', textAlign: 'center' },
  subtitulo: { fontSize: '0.85rem', color: '#666666', marginBottom: '20px', textAlign: 'center', lineHeight: '1.4' },
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
