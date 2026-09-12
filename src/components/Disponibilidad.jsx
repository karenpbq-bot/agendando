import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Disponibilidad({ usuarioId }) {
  const fechaActual = new Date();
  const mesActualStr = `${fechaActual.getFullYear()}-${String(fechaActual.getMonth() + 1).padStart(2, '0')}`;
  
  const [mesSeleccionado, setMesSeleccionado] = useState(mesActualStr);
  const [diasDelMes, setDiasDelMes] = useState([]);
  const [restricciones, setRestricciones] = useState({});
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');

  // Generar los días del mes seleccionado y cargar datos
  useEffect(() => {
    if (usuarioId && mesSeleccionado) {
      generarDiasYCargar(mesSeleccionado);
    }
  }, [usuarioId, mesSeleccionado]);

  const generarDiasYCargar = async (mesStr) => {
    setCargando(true);
    const [anio, mes] = mesStr.split('-').map(Number);
    
    // Obtener cantidad de días del mes
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

    // Cargar restricciones guardadas de Supabase para este mes
    const { data, error } = await supabase
      .from('agd_restricciones_disponibilidad')
      .select('*')
      .eq('usuario_id', usuarioId)
      .eq('mes_periodo', mesStr);

    const mapa = {};
    listaDias.forEach(item => {
      const existente = data?.find(r => r.fecha_especifica === item.fecha);
      mapa[item.fecha] = existente || {
        fecha: item.fecha,
        bloqueado_todo_el_dia: item.nombreDia === 'Sábado' || item.nombreDia === 'Domingo',
        tramo_1_inicio: '00:00', tramo_1_fin: '08:00', // Predeterminado madrugada
        tramo_2_inicio: '22:00', tramo_2_fin: '23:59', // Predeterminado noche
        tramo_3_inicio: '', tramo_3_fin: '',
        tramo_4_inicio: '', tramo_4_fin: ''
      };
    });

    setRestricciones(mapa);
    setCargando(false);
  };

  const manejarCambio = (fecha, campo, valor) => {
    setRestricciones(prev => ({
      ...prev,
      [fecha]: {
        ...prev[fecha],
        [campo]: valor
      }
    }));
  };

  // Replicar configuración de una fecha específica a todos los días con el mismo nombre (ej. todos los lunes)
  const replicarPorNombreDia = (fechaModelo) => {
    const modelo = restricciones[fechaModelo];
    const fechaObjModelo = new Date(fechaModelo);
    const nombreModelo = fechaObjModelo.toLocaleDateString('es-ES', { weekday: 'long' });

    setRestricciones(prev => {
      const actualizado = { ...prev };
      diasDelMes.forEach(d => {
        const obj = new Date(d.fecha);
        const nombreD = obj.toLocaleDateString('es-ES', { weekday: 'long' });
        if (nombreD === nombreModelo) {
          actualizado[d.fecha] = {
            ...modelo,
            fecha: d.fecha
          };
        }
      });
      return actualizado;
    });

    setMensaje(`Se replicaron los horarios de este día a todos los ${nombreModelo.toUpperCase()} del mes.`);
    setTimeout(() => setMensaje(''), 4000);
  };

  const guardarConfiguracion = async (e) => {
    e.preventDefault();
    setCargando(true);
    setMensaje('');

    try {
      await supabase.from('agd_restricciones_disponibilidad')
        .delete()
        .eq('usuario_id', usuarioId)
        .eq('mes_periodo', mesSeleccionado);

      const payload = diasDelMes.map(d => {
        const item = restricciones[d.fecha];
        return {
          usuario_id: usuarioId,
          mes_periodo: mesSeleccionado,
          dia_semana: d.nombreDia,
          fecha_especifica: d.fecha,
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

      const { error } = await supabase.from('agd_restricciones_disponibilidad').insert(payload);

      if (error) {
        setMensaje('Error al guardar: ' + error.message);
      } else {
        setMensaje('¡Restricciones mensuales guardadas con éxito!');
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
      <h2 style={estilos.titulo}>Disponibilidad por Fechas</h2>
      <p style={estilos.subtitulo}>
        Gestiona restricciones por día específico o replica patrones (ej. replicar un Lunes a todo el mes).
      </p>

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

      <form onSubmit={guardarConfiguracion}>
        {diasDelMes.map(d => {
          const item = restricciones[d.fecha] || {};
          const esLunesUotro = d.nombreDia === 'Lunes'; // Destacar visualmente los lunes o cualquier día clave

          return (
            <div key={d.fecha} style={{
              ...estilos.tarjetaDia, 
              borderColor: esLunesUotro ? '#00A89F' : '#EAEAEA'
            }}>
              <div style={estilos.cabeceraDia}>
                <div>
                  <span style={estilos.badgeFecha}>{d.diaNumero}</span>
                  <span style={estilos.nombreDia}>{d.nombreDia}</span>
                </div>

                <div style={estilos.accionesDerecha}>
                  <button 
                    type="button" 
                    onClick={() => replicarPorNombreDia(d.fecha)}
                    style={estilos.botonReplicar}
                    title={`Aplicar este horario a todos los ${d.nombreDia}s del mes`}
                  >
                    Replicar {d.nombreDia}s
                  </button>
                  <label style={estilos.labelCheckbox}>
                    <input 
                      type="checkbox"
                      checked={item.bloqueado_todo_el_dia || false}
                      onChange={(e) => manejarCambio(d.fecha, 'bloqueado_todo_el_dia', e.target.checked)}
                      style={estilos.checkbox}
                    />
                    Bloquear
                  </label>
                </div>
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
                          onChange={(e) => manejarCambio(d.fecha, `tramo_${num}_inicio`, e.target.value)}
                          style={estilos.inputTime}
                        />
                        <span style={estilos.separadorHora}>a</span>
                        <input 
                          type="time" 
                          value={item[`tramo_${num}_fin`] || ''}
                          onChange={(e) => manejarCambio(d.fecha, `tramo_${num}_fin`, e.target.value)}
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
          {cargando ? 'Guardando...' : 'Guardar Todas las Restricciones del Mes'}
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
  tarjetaDia: { backgroundColor: '#FFFFFF', padding: '12px 14px', borderRadius: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)', marginBottom: '10px', border: '1px solid' },
  cabeceraDia: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #F0F0F0', paddingBottom: '6px' },
  badgeFecha: { backgroundColor: '#EBF5F7', color: '#00A89F', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.85rem', marginRight: '6px' },
  nombreDia: { fontSize: '0.95rem', color: '#333', fontWeight: 'bold' },
  accionesDerecha: { display: 'flex', alignItems: 'center', gap: '10px' },
  botonReplicar: { background: '#EBF5F7', border: '1px solid #00A89F', color: '#00A89F', fontSize: '0.7rem', padding: '3px 6px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  labelCheckbox: { fontSize: '0.75rem', color: '#D9534F', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' },
  checkbox: { width: '16px', height: '16px', cursor: 'pointer' },
  tramosContainer: { display: 'flex', flexDirection: 'column', gap: '6px' },
  tramoRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#555555' },
  tramoLabel: { fontWeight: '500', color: '#666', minWidth: '55px' },
  inputsTimeWrapper: { display: 'flex', alignItems: 'center', gap: '6px' },
  inputTime: { padding: '6px 4px', borderRadius: '6px', border: '1px solid #CCCCCC', fontSize: '0.8rem', backgroundColor: '#FAFAFA', width: '100px', textAlign: 'center' },
  separadorHora: { color: '#888', fontSize: '0.8rem' },
  mensaje: { fontSize: '0.85rem', color: '#00A89F', fontWeight: 'bold', textAlign: 'center', margin: '15px 0' },
  botonGuardar: { width: '100%', padding: '14px', borderRadius: '8px', border: 'none', background: 'linear-gradient(90deg, #00A89F 0%, #88D84D 100%)', color: '#FFFFFF', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0, 168, 159, 0.2)', marginTop: '10px' }
};
