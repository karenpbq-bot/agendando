import React, { useState } from 'react';

export default function Dashboard({ usuarioData, onCerrarSesion }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', backgroundColor: '#F4F7F6', minHeight: '100vh' }}>
      <h1>Panel de Control - Modo de Prueba</h1>
      <p>Usuario: <b>{usuarioData?.nombre_completo}</b> | Rol: <b>{usuarioData?.rol}</b></p>
      
      <button onClick={() => setAbierto(!abierto)} style={{ padding: '15px', backgroundColor: '#00A89F', color: '#FFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', marginTop: '20px' }}>
        {abierto ? 'Ocultar Calendario ▼' : 'Mostrar Calendario ▶'}
      </button>

      {abierto && (
        <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#FFF', border: '2px solid #00A89F', borderRadius: '8px' }}>
          <h3>¡El bloque desplegable está funcionando correctamente!</h3>
          <p>Aquí es exactamente donde aparecerá la parrilla del planificador de citas y la disponibilidad horaria.</p>
        </div>
      )}

      <div style={{ marginTop: '40px' }}>
        <button onClick={onCerrarSesion} style={{ padding: '10px 20px', backgroundColor: '#666', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
