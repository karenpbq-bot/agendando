import React, { useState, useEffect } from 'react';

export default function Login() {
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [intentos, setIntentos] = useState(0);
  const [bloqueoHasta, setBloqueoHasta] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [tiempoRestante, setTiempoRestante] = useState(0);

  useEffect(() => {
    let intervalo;
    if (bloqueoHasta) {
      intervalo = setInterval(() => {
        const ahora = Date.now();
        if (ahora >= bloqueoHasta) {
          setBloqueoHasta(null);
          setIntentos(0);
          setMensaje('');
          setTiempoRestante(0);
        } else {
          setTiempoRestante(Math.ceil((bloqueoHasta - ahora) / 1000));
        }
      }, 1000);
    }
    return () => clearInterval(intervalo);
  }, [bloqueoHasta]);

  const manejarIngreso = (e) => {
    e.preventDefault();
    if (bloqueoHasta) return;

    // Simulación de error para probar el bloqueo
    const esValido = false; 

    if (esValido) {
      setMensaje('Ingreso exitoso');
      setIntentos(0);
    } else {
      const nuevosIntentos = intentos + 1;
      setIntentos(nuevosIntentos);

      if (nuevosIntentos >= 5) {
        setBloqueoHasta(Date.now() + 10 * 60 * 1000);
        setMensaje('Demasiados intentos. Acceso bloqueado.');
      } else {
        setMensaje(`Contraseña incorrecta. Te quedan ${5 - nuevosIntentos} intentos.`);
      }
    }
  };

  const formatoTiempo = (segundos) => {
    const min = Math.floor(segundos / 60);
    const seg = segundos % 60;
    return `${min}:${seg < 10 ? '0' : ''}${seg}`;
  };

  return (
    <div style={estilos.contenedor}>
      <div style={estilos.tarjeta}>
        <h2 style={estilos.subtitulo}>¿Listo para gestionar tus agendas?</h2>
        <h1 style={estilos.tituloLogo}>Agendando</h1>
        
        <form onSubmit={manejarIngreso} style={estilos.formulario}>
          <div style={estilos.grupoInput}>
            <label style={estilos.etiqueta}>Usuario</label>
            <input 
              type="text" 
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              disabled={!!bloqueoHasta}
              style={estilos.input}
              required
            />
          </div>

          <div style={estilos.grupoInput}>
            <label style={estilos.etiqueta}>Contraseña</label>
            <input 
              type="password" 
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              disabled={!!bloqueoHasta}
              style={estilos.input}
              required
            />
          </div>

          {mensaje && (
            <p style={{ ...estilos.mensaje, color: bloqueoHasta ? '#D32F2F' : '#F57C00' }}>
              {mensaje} {bloqueoHasta && `(${formatoTiempo(tiempoRestante)})`}
            </p>
          )}

          <button 
            type="submit" 
            disabled={!!bloqueoHasta} 
            style={{...estilos.boton, opacity: bloqueoHasta ? 0.6 : 1}}
          >
            {bloqueoHasta ? 'Bloqueado' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Estilos actualizados para un entorno claro y limpio
const estilos = {
  contenedor: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#EBF5F7', // Celeste muy tenue
    fontFamily: 'sans-serif',
  },
  tarjeta: {
    backgroundColor: '#FFFFFF', // Tarjeta blanca para generar contraste
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 8px 24px rgba(0, 168, 159, 0.08)', // Sombra sutil con un tono del logo
    width: '100%',
    maxWidth: '400px',
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: '1rem',
    color: '#666666', // Gris medio para lectura cómoda
    fontWeight: 'normal',
    marginBottom: '5px',
  },
  tituloLogo: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    margin: '0 0 30px 0',
    background: 'linear-gradient(90deg, #00A89F 0%, #88D84D 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  formulario: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  grupoInput: {
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left',
  },
  etiqueta: {
    fontSize: '0.9rem',
    marginBottom: '8px',
    color: '#444444', // Gris oscuro
    fontWeight: '500',
  },
  input: {
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #CCCCCC',
    backgroundColor: '#FAFAFA',
    color: '#333333',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.3s',
  },
  boton: {
    padding: '14px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(90deg, #00A89F 0%, #88D84D 100%)',
    color: '#FFFFFF', // Letra blanca para resaltar sobre el fondo de color
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '10px',
    boxShadow: '0 4px 12px rgba(0, 168, 159, 0.2)',
  },
  mensaje: {
    fontSize: '0.9rem',
    margin: '0',
    fontWeight: '500',
  }
};
