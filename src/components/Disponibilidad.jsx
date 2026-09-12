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

  // Estado temporal para manejar qué día se quiere copiar en cada tarjeta
  const [diaOrigenSeleccionado, setDiaOrigenSeleccionado] = useState({});

  useEffect(() => {
    if (usuarioId && mesSeleccionado) {
      generarDiasYCargar(mesSeleccionado);
    }
  }, [usuarioId, mesSeleccionado]);

  const generarDiasYCargar = async (mesStr) => {
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

    const { data } = await supabase
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
        tramo_1_inicio: '00:00', tramo_1_fin: '08:00',
        tramo_2_inicio: '22:00', tramo_2_fin: '23:59',
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

  // Copiar la configuración de una fecha específica a otra fecha destino concreta
  const aplicarCopia = (fechaDestino) => {
    const fechaOrigen = diaOrigenSeleccionado[fechaDestino];
    if (!fechaOrigen) {
      setMensaje('Selecciona primero un día de origen para copiar.');
      setTimeout(() => setMensaje(''), 3000);
      return;
    }

    const datosOrigen = restricciones[fechaOrigen];
    if (!datosOrigen) return;

    setRestricciones(prev => ({
      ...prev,
      [fechaDestino]: {
        ...datosOrigen,
        fecha: fechaDestino // Mantiene la fecha destino pero copia los tramos y bloqueos
      }
    }));

    const origenItem = diasDelMes.find(d => d.fecha === fechaOrigen);
    const destinoItem = diasDelMes.find(d => d.fecha === fechaDestino);
    setMensaje(`Se copió la configuración del ${origenItem?.nombreDia} (${origenItem?.diaNumero}) al ${destinoItem?.nombreDia} (${destinoItem?.diaNumero}).`);
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
      setMensaje('Error de conexión.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={estilos.contenedor}>
      <h2 style={estilos.titulo}>Disponibilidad por Fechas</h2>
      <p style={estilos.subtitulo}>
        Configura tus tramos o copia los horarios de cualquier otro día del mes (ej. replicar el Lunes al Martes o Jueves al Miércoles).
      </p>

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

          return (
            <div key={d.fecha} style={estilos.tarjetaDia}>
              <div style={estilos.cabeceraDia}>
                <div style={estilos.infoDia}>
                  <span style={estilos.badgeFecha}>{d.diaNumero}</span>
                  <span style={estilos.nombreDia}>{d.nombreDia}</span>
                </div>

                <div style={estilos.accionesDerecha}>
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

              {/* Barra de Copia Flexible por Día */}
              <div style={estilos.barraCopia}>
                <select 
                  value={diaOrigenSeleccionado[d.fecha] || ''}
                  onChange={(e) => setDiaOrigenSeleccionado(prev => ({ ...prev, [d.fecha]: e.target.value }))}
                  style={estilos.selectCopia}
                >
                  <option value="">Copiar desde...</option>
                  {diasDelMes.map(orig => (
                    orig.fecha !== d.fecha && (
                      <option key={orig.fecha} value={orig.fecha}>
                        {orig.nombreDia} {orig.diaNumero}
                      </option>
                    )
                  ))}
                </select>
                <button 
                  type="button" 
                  onClick={() => aplicarCopia(d.fecha)}
                  style={estilos.botonAplicarCopia}
                >
                  Aplicar
                </button>
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
          {cargando ? 'Guardando...' : 'Guardar Todo el Mes'}
        </button>
      </form>
    </div>
  );
}

const estilos = {
  contenedor: { padding: '10px', maxWidth: '100%', width: '100%', boxSizing: 'border-box', fontFamily: 'sans-serif', backgroundColor: '#F8F9FA' },
  titulo: { fontSize: '1.2rem', color: '#333333', marginBottom: '4px', textAlign: 'center' },
  subtitulo: { fontSize: '0.8rem', color: '#666666', marginBottom: '12px', textAlign: 'center', lineHeight: '1.3' },
  seccionMes: { display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px', backgroundColor: '#FFFFFF', padding: '10px', borderRadius: '8px', border: '1px solid #EAEAEA', boxSizing: 'border-box' },
  labelMes: { fontSize: '0.8rem', fontWeight: 'bold', color: '#444' },
  inputMes: { padding: '8px', borderRadius: '6px', border: '1px solid #CCCCCC', fontSize: '0.85rem', backgroundColor: '#FAFAFA', width: '100%', boxSizing: 'border-box' },
  tarjetaDia: { backgroundColor: '#FFFFFF', padding: '10px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: '10px', border: '1px solid #EAEAEA', boxSizing: 'border-box', width: '100%' },
  cabeceraDia: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', borderBottom: '1px solid #F0F0F0', paddingBottom: '4px' },
  infoDia: { display: 'flex', alignItems: 'center', overflow: 'hidden' },
  badgeFecha: { backgroundColor: '#EBF5F7', color: '#00A89F', padding: '2px 5px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.75rem', marginRight: '5px', flexShrink: '0' },
  nombreDia: { fontSize: '0.85rem', color: '#333', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  accionesDerecha: { display: 'flex', alignItems: 'center', gap: '6px', flexShrink: '0' },
  labelCheckbox: { fontSize: '0.7rem', color: '#D9534F', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer', whiteSpace: 'nowrap' },
  checkbox: { width: '14px', height: '14px', cursor: 'pointer' },
  barraCopia: { display: 'flex', gap: '6px', marginBottom: '8px', backgroundColor: '#F4FBFB', padding: '6px', borderRadius: '6px', border: '1px solid #D1F0EE' },
  selectCopia: { flex: 1, padding: '4px', borderRadius: '4px', border: '1px solid #00A89F', fontSize: '0.75rem', backgroundColor: '#FFF', color: '#333' },
  botonAplicarCopia: { background: '#00A89F', border: 'none', color: '#FFF', fontSize: '0.7rem', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', flexShrink: '0' },
  tramosContainer: { display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', boxSizing: 'border-box' },
  tramoRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#555555', width: '100%' },
  tramoLabel: { fontWeight: '500', color: '#666', width: '25px', flexShrink: '0' },
  inputsTimeWrapper: { display: 'flex', alignItems: 'center', gap: '4px', flex: '1', justifyContent: 'flex-end', boxSizing: 'border-box' },
  inputTime: { padding: '5px 2px', borderRadius: '4px', border: '1px solid #CCCCCC', fontSize: '0.75rem', backgroundColor: '#FAFAFA', width: '42%', maxWidth: '95px', textAlign: 'center', boxSizing: 'border-box' },
  separadorHora: { color: '#888', fontSize: '0.75rem', flexShrink: '0' },
  mensaje: { fontSize: '0.8rem', color: '#00A89F', fontWeight: 'bold', textAlign: 'center', margin: '10px 0' },
  botonGuardar: { width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: 'linear-gradient(90deg, #00A89F 0%, #88D84D 100%)', color: '#FFFFFF', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0, 168, 159, 0.2)', marginTop: '10px', boxSizing: 'border-box' }
};
