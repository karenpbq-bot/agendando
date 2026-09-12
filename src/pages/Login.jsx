import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Registro from '../components/Registro';

export default function Login({ onLoginExitoso }) {
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [recordarSesion, setRecordarSesion] = useState(false);
  const [pantallaRegistro, setPantallaRegistro] = useState(false);
  
  const [intentos, setIntentos] = useState(0);
  const [bloqueoHasta, setBloqueoHasta] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [tiempoRestante, setTiempoRestante] = useState(0);
  const [cargando, setCargando] = useState(false);

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

  const manejarIngreso = async (e) => {
    e.preventDefault();
    if (bloqueoHasta) return;
    
    setCargando(true);
    setMensaje('');

    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('nombre_usuario', usuario)
        .single();

      if (error || !data || data.password_hash !== contrasena) {
        const nuevosIntentos = intentos + 1;
        setIntentos(nuevosIntentos);

        if (nuevosIntentos >= 5) {
          setBloqueoHasta(Date.now() + 10 * 60 * 1000);
          setMensaje('Demasiados intentos. Acceso bloqueado.');
        } else {
          setMensaje(`Usuario o contraseña incorrecta. Te quedan ${5 - nuevosIntentos} intentos.`);
        }
      } else {
        if (data.activo === false) {
          setMensaje('Tu cuenta se encuentra suspendida. Contacta al administrador.');
          setCargando(false);
          return;
        }

        setIntentos(0);
        if (recordarSesion) {
          localStorage.setItem('tamtara_usuario', usuario);
        }

        onLoginExitoso(data);
      }
    } catch (err) {
      setMensaje('Error de conexión. Intenta nuevamente.');
    } finally {
      setCargando(false);
    }
  };

  const formatoTiempo = (segundos) => {
    const min = Math.floor(segundos / 60);
    const seg = segundos % 60;
    return `${min}:${seg < 10 ? '0' : ''}${seg}`;
  };

  if (pantallaRegistro) {
    return (
      <Registro 
        onVolverLogin={() => setPantallaRegistro(false)} 
        onRegistroExitoso={(datosUsuario) => onLoginExitoso(datosUsuario)}
      />
    );
  }

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
              disabled={!!bloqueoHasta || cargando}
              style={estilos.input}
              required
            />
          </div>

          <div style={estilos.grupoInput}>
            <label style={estilos.etiqueta}>Contraseña para acceder</label>
            <input 
              type="password" 
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              disabled={!!bloqueoHasta || cargando}
              style={estilos.input}
              required
            />
          </div>

          <div style={estilos.grupoCheckbox}>
            <input 
              type="checkbox" 
              id="recordar" 
              checked={recordarSesion}
              onChange={(e) => setRecordarSesion(e.target.checked)}
              style={estilos.checkbox}
            />
            <label htmlFor="recordar" style={estilos.etiquetaCheckbox}>Mantener sesión abierta</label>
          </div>

          {mensaje && (
            <p style={{ ...estilos.mensaje, color: bloqueoHasta ? '#D32F2F' : '#F57C00' }}>
              {mensaje} {bloqueoHasta && `(${formatoTiempo(tiempoRestante)})`}
            </p>
          )}

          <button 
            type="submit" 
            disabled={!!bloqueoHasta || cargando} 
            style={{...estilos.boton, opacity: (bloqueoHasta || cargando) ? 0.6 : 1}}
          >
            {cargando ? 'Verificando...' : (bloqueoHasta ? 'Bloqueado' : 'Ingresar')}
          </button>
        </form>

        <div style={estilos.divisorRegistro}>
          <span style={estilos.textoO}>¿Nuevo en la plataforma?</span>
          <button 
            type="button" 
            onClick={() => setPantallaRegistro(true)}
            style={estilos.botonRegistro}
          >
            Registrarse ahora
          </button>
        </div>

      </div>
    </div>
  );
}

const estilos = {
  contenedor: { display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#EBF5F7', fontFamily: 'sans-serif', padding: '20px' },
  tarjeta: { backgroundColor: '#FFFFFF', padding: '40px', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0, 168, 159, 0.08)', width: '100%', maxWidth: '420px', textAlign: 'center' },
  subtitulo: { fontSize: '1rem', color: '#666666', fontWeight: 'normal', marginBottom: '5px' },
  tituloLogo: { fontSize: '2.5rem', fontWeight: 'bold', margin: '0 0 30px 0', background: 'linear-gradient(90deg, #00A89F 0%, #88D84D 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  formulario: { display: 'flex', flexDirection: 'column', gap: '20px' },
  grupoInput: { display: 'flex', flexDirection: 'column', textAlign: 'left' },
  etiqueta: { fontSize: '0.9rem', marginBottom: '8px', color: '#444444', fontWeight: '500' },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid #CCCCCC', backgroundColor: '#FAFAFA', color: '#333333', fontSize: '1rem', outline: 'none' },
  grupoCheckbox: { display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left', marginTop: '-10px' },
  checkbox: { cursor: 'pointer', width: '16px', height: '16px' },
  etiquetaCheckbox: { fontSize: '0.85rem', color: '#666666', cursor: 'pointer' },
  boton: { padding: '14px', borderRadius: '8px', border: 'none', background: 'linear-gradient(90deg, #00A89F 0%, #88D84D 100%)', color: '#FFFFFF', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' },
  mensaje: { fontSize: '0.9rem', margin: '0', fontWeight: '500' },
  divisorRegistro: { marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #EEEEEE', display: 'flex', flexDirection: 'column', gap: '8px' },
  textoO: { fontSize: '0.85rem', color: '#666666' },
  botonRegistro: { background: 'none', border: 'none', color: '#00A89F', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }
};
