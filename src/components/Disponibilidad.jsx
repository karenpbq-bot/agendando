import React, { useState } from 'react';

export default function Disponibilidad({ usuarioId }) {
  const [diaSemana, setDiaSemana] = useState('Lunes');
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFin, setHoraFin] = useState('13:00');
  const [tipoProyeccion, setTipoProyeccion] = useState('semanal');
  const [excepcionFecha, setExcepcionFecha] = useState('');
  const [mensaje, setMensaje] = useState('');

  const guardarDisponibilidad = (e) => {
    e.preventDefault();
    // Aquí conectaremos posteriormente con la tabla de Supabase para guardar la disponibilidad
    setMensaje('¡Disponibilidad guardada y proyectada correctamente!');
    setTimeout(() => setMensaje(''), 4000);
  };

  return (
    <div style={estilos.contenedor}>
      <h3 style={estilos.titulo}>Configuración de Horarios de Atención</h3>
      <p style={estilos.descripcion}>
        Define tus bloques disponibles. Estos horarios se reflejarán automáticamente en el calendario con un fondo amarillo translúcido.
      </p>

      <form onSubmit={guardarDisponibilidad} style={estilos.formulario}>
        <div style={estilos.fila}>
          <div style={estilos.grupo}>
            <label style={estilos.etiqueta}>Día de la Semana</label>
            <select 
              value={diaSemana} 
              onChange={(e) => setDiaSemana(e.target.value)}
              style={estilos.input}
            >
              {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div style={estilos.grupo}>
            <label style={estilos.etiqueta}>Tipo de Proyección</label>
            <select 
              value={tipoProyeccion} 
              onChange={(e) => setTipoProyeccion(e.target.value)}
              style={estilos.input}
            >
              <option value="semanal">Repetir Semanalmente</option>
              <option value="mensual">Repetir Mensualmente</option>
            </select>
          </div>
        </div>

        <div style={estilos.fila}>
          <div style={estilos.grupo}>
            <label style={estilos.etiqueta}>Hora de Inicio</label>
            <input 
              type="time" 
              value={horaInicio} 
              onChange={(e) => setHoraInicio(e.target.value)}
              style={estilos.input}
              required 
            />
          </div>

          <div style={estilos.grupo}>
            <label style={estilos.etiqueta}>Hora de Fin</label>
            <input 
              type="time" 
              value={horaFin} 
              onChange={(e) => setHoraFin(e.target.value)}
              style={estilos.input}
              required 
            />
          </div>
        </div>

        <div style={estilos.grupoExcepcion}>
          <label style={estilos.etiqueta}>Bloqueo o Excepción Puntual (Opcional)</label>
          <input 
            type="date" 
            value={excepcionFecha} 
            onChange={(e) => setExcepcionFecha(e.target.value)}
            style={estilos.input}
          />
          <span style={estilos.ayuda}>Selecciona una fecha específica si deseas bloquear la atención en este rango.</span>
        </div>

        {mensaje && <p style={estilos.alerta}>{mensaje}</p>}

        <button type="submit" style={estilos.boton}>
          Guardar y Proyectar Horario
        </button>
      </form>
    </div>
  );
}

const estilos = {
  contenedor: { padding: '10px', fontFamily: 'sans-serif' },
  titulo: { fontSize: '1.1rem', color: '#333333', marginBottom: '8px' },
  descripcion: { fontSize: '0.85rem', color: '#666666', marginBottom: '20px' },
  formulario: { display: 'flex', flexDirection: 'column', gap: '15px' },
  fila: { display: 'flex', gap: '15px', flexWrap: 'wrap' },
  grupo: { flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column' },
  grupoExcepcion: { display: 'flex', flexDirection: 'column' },
  etiqueta: { fontSize: '0.85rem', fontWeight: '500', color: '#444444', marginBottom: '6px' },
  input: { padding: '10px', borderRadius: '6px', border: '1px solid #CCCCCC', fontSize: '0.95rem', backgroundColor: '#FFFFFF', outline: 'none' },
  ayuda: { fontSize: '0.75rem', color: '#888888', marginTop: '4px' },
  alerta: { fontSize: '0.9rem', color: '#00A89F', fontWeight: 'bold', margin: 0 },
  boton: { padding: '12px', borderRadius: '6px', border: 'none', background: 'linear-gradient(90deg, #00A89F 0%, #88D84D 100%)', color: '#FFFFFF', fontSize: '0.95rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '5px' }
};
