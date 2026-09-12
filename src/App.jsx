import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

export default function App() {
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // Verificamos si hay una sesión activa guardada en el navegador
    const sesionGuardada = localStorage.getItem('tamtara_sesion_activa');
    if (sesionGuardada) {
      try {
        setUsuarioActual(JSON.parse(sesionGuardada));
      } catch (e) {
        localStorage.removeItem('tamtara_sesion_activa');
      }
    }
    setCargando(false);
  }, []);

  const manejarLoginExitoso = (datosUsuario) => {
    setUsuarioActual(datosUsuario);
    localStorage.setItem('tamtara_sesion_activa', JSON.stringify(datosUsuario));
  };

  const manejarCerrarSesion = () => {
    setUsuarioActual(null);
    localStorage.removeItem('tamtara_sesion_activa');
    localStorage.removeItem('tamtara_usuario');
  };

  if (cargando) return null;

  return (
    <div>
      {usuarioActual ? (
        <Dashboard usuarioData={usuarioActual} onCerrarSesion={manejarCerrarSesion} />
      ) : (
        <Login onLoginExitoso={manejarLoginExitoso} />
      )}
    </div>
  );
}
