import React, { useState, useEffect } from 'react';

// Iconos SVG modernos y minimalistas integrados directamente
const IconoSesiones = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00A89F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const IconoPuntos = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#88D84D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <circle cx="12" cy="12" r="6"></circle>
    <circle cx="12" cy="12" r="2"></circle>
  </svg>
);

export default function Login() {
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [intentos, setIntentos] = useState(0);
  const [bloqueoHasta, setBloqueoHasta] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [tiempoRestante, setTiempoRestante] = useState(0);

  // Valores simulados
  const resumenHoy = {
    sesiones: { confirmadas: 2, programadas: 1, canceladas: 0 },
    puntosPendientes: 4
  };
  const totalSesiones = resumenHoy.sesiones.confirmadas + resumenHoy.sesiones.programadas + resumenHoy.sesiones.canceladas;

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

        {/* Panel de métricas integrado bajo el botón */}
        <div style={estilos.panelMetricas}>
          <div style={estilos.itemMetrica}>
            <div style={estilos.contenedorIcono}>
              <IconoSesiones />
            </div>
            <div>
              <div style={estilos.tituloMetrica}>Sesiones para hoy: <span style={estilos.numeroResaltado}>{totalSesiones}</span></div>
              <div style={estilos.detalleMetrica}>
                {resumenHoy.sesiones.confirmadas} Confirmadas | {resumenHoy.sesiones.programadas} Programadas | {resumenHoy.sesiones.canceladas} Canceladas
              </div>
            </div>
          </div>
          
          <div style={estilos.itemMetrica}>
            <div style={estilos.contenedorIcono}>
              <IconoPuntos />
            </div>
            <div>
              <div style={estilos.tituloMetrica}>Puntos pendientes: <span style={estilos.numeroResaltadoVerde}>{resumenHoy.puntosPendientes}</span></div>
              <div style={estilos.detalleMetrica}>Acuerdos sin cambio de estado</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

const estilos = {
  contenedor: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#EBF5F7', 
    fontFamily: 'sans-serif',
    padding: '20px',
  },
  tarjeta: {
    backgroundColor: '#FFFFFF', 
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 8px 24px rgba(0, 168, 159, 0.08)', 
    width: '100%',
    maxWidth: '420px',
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: '1rem',
    color: '#666666', 
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
    color: '#444444', 
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
    color: '#FFFFFF', 
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '5px',
    boxShadow: '0 4px 12px rgba(0, 168, 159, 0.2)',
  },
  mensaje: {
    fontSize: '0.9rem',
    margin: '0',
    fontWeight: '500',
  },
  panelMetricas: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginTop: '30px',
    paddingTop: '25px',
    borderTop: '1px solid #EEEEEE',
  },
  itemMetrica: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    textAlign: 'left',
  },
  contenedorIcono: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '40px',
    height: '40px',
    backgroundColor: '#FAFAFA',
    borderRadius: '8px',
    border: '1px solid #F0F0F0',
  },
  tituloMetrica: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#333333',
  },
  numeroResaltado: {
    color: '#00A89F',
    fontSize: '1.05rem',
  },
  numeroResaltadoVerde: {
    color: '#88D84D',
    fontSize: '1.05rem',
  },
  detalleMetrica: {
    fontSize: '0.75rem',
    color: '#888888',
    marginTop: '4px',
  }
};
