import React, { useState } from 'react';
import Disponibilidad from '../components/Disponibilidad';
import Calendario from '../components/Calendario';
import GestionGrupos from '../components/GestionGrupos';
import Reprogramaciones from '../components/Reprogramaciones'; // <-- 1. Importación añadida

// Subcomponente modular: Bloque tipo acordeón (Desplegable)
const BloqueDesplegable = ({ titulo, isOpen, onClick, children }) => {
  return (
    <div style={estilos.bloque}>
      <button style={estilos.cabeceraBloque} onClick={onClick}>
        <h3 style={estilos.tituloBloque}>{titulo}</h3>
        <span style={{ 
          transform: isOpen ? 'rotate(180deg)' : 'none', 
          transition: 'transform 0.3s ease',
          color: '#00A89F',
          fontWeight: 'bold'
        }}>
          ▼
        </span>
      </button>
      {isOpen && (
        <div style={estilos.contenidoBloque}>
          {children}
        </div>
      )}
    </div>
  );
};

export default function Dashboard({ usuarioData, onCerrarSesion }) {
  const [bloqueAbierto, setBloqueAbierto] = useState(null);

  const rol = usuarioData?.rol || 'Empresario';

  const esAdmin = rol === 'Administrador' || rol === 'Súper Administrador';
  const esChair = rol === 'Chair' || esAdmin;
  const esEmpresario = true;

  const alternarBloque = (id) => {
    setBloqueAbierto(bloqueAbierto === id ? null : id);
  };

  return (
    <div style={estilos.contenedor}>
      
      {/* Barra de Navegación Superior */}
      <header style={estilos.header}>
        <div style={estilos.logoContenedor}>
          <h1 style={estilos.logo}>Agendando</h1>
        </div>
        <div style={estilos.infoUsuario}>
          <div style={estilos.datosUsuario}>
            <span style={estilos.nombre}>{usuarioData?.nombre_completo?.split(' ')[0]}</span>
            <span style={estilos.rolTag}>{rol}</span>
          </div>
          <button onClick={onCerrarSesion} style={estilos.botonSalir}>Salir</button>
        </div>
      </header>

      {/* Contenedor Principal */}
      <main style={estilos.main}>
        <h2 style={estilos.tituloPrincipal}>Panel de Control</h2>
        <p style={estilos.subtitulo}>Selecciona un módulo para comenzar</p>

        <div style={estilos.contenedorBloques}>
          
          {/* Bloque 1: Disponibilidad Horaria (Solo Chairs y Admins) */}
          {esChair && (
            <BloqueDesplegable 
              titulo="Configuración de Disponibilidad" 
              isOpen={bloqueAbierto === 1} 
              onClick={() => alternarBloque(1)}
            >
              <Disponibilidad usuarioId={usuarioData?.id} />
            </BloqueDesplegable>
          )}

          {/* Bloque 2: Calendario de Sesiones */}
          {esEmpresario && (
            <BloqueDesplegable 
              titulo="Calendario de Sesiones" 
              isOpen={bloqueAbierto === 2} 
              onClick={() => alternarBloque(2)}
            >
              <Calendario usuarioId={usuarioData?.id} />
            </BloqueDesplegable>
          )}

          {/* Bloque 3: Gestión de Grupos */}
          {esChair && (
            <BloqueDesplegable 
              titulo="Gestión de Grupos" 
              isOpen={bloqueAbierto === 3} 
              onClick={() => alternarBloque(3)}
            >
              <GestionGrupos usuarioId={usuarioData?.id} />
            </BloqueDesplegable>
          )}

          {/* Bloque 5: Gestión de Reprogramaciones (Nuevo) */}
          {esChair && (
            <BloqueDesplegable 
              titulo="Gestión de Reprogramaciones" 
              isOpen={bloqueAbierto === 5} 
              onClick={() => alternarBloque(5)}
            >
              <Reprogramaciones usuarioId={usuarioData?.id} />
            </BloqueDesplegable>
          )}

          {/* Bloque 4: Administración y Suscripciones */}
          {esAdmin && (
            <BloqueDesplegable 
              titulo="Administración y Suscripciones" 
              isOpen={bloqueAbierto === 4} 
              onClick={() => alternarBloque(4)}
            >
              <div style={estilos.placeholderMascara}>
                <p>Módulo <b>AdminUsuarios.jsx</b> se insertará aquí.</p>
              </div>
            </BloqueDesplegable>
          )}

        </div>
      </main>
    </div>
  );
}

const estilos = {
  contenedor: { minHeight: '100vh', backgroundColor: '#F4F7F6', fontFamily: 'sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', padding: '15px 30px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  logoContenedor: { display: 'flex', alignItems: 'center' },
  logo: { margin: 0, fontSize: '1.5rem', fontWeight: 'bold', background: 'linear-gradient(90deg, #00A89F 0%, #88D84D 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  infoUsuario: { display: 'flex', alignItems: 'center', gap: '20px' },
  datosUsuario: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' },
  nombre: { fontSize: '0.95rem', fontWeight: '600', color: '#333333' },
  rolTag: { fontSize: '0.7rem', backgroundColor: '#EBF5F7', color: '#00A89F', padding: '2px 8px', borderRadius: '12px', marginTop: '4px', fontWeight: 'bold', textTransform: 'uppercase' },
  botonSalir: { backgroundColor: 'transparent', border: '1px solid #DDDDDD', padding: '8px 16px', borderRadius: '6px', color: '#666666', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500' },
  main: { maxWidth: '900px', margin: '40px auto', padding: '0 20px' },
  tituloPrincipal: { fontSize: '1.8rem', color: '#333333', marginBottom: '5px' },
  subtitulo: { fontSize: '1rem', color: '#777777', marginBottom: '30px' },
  contenedorBloques: { display: 'flex', flexDirection: 'column', gap: '15px' },
  bloque: { backgroundColor: '#FFFFFF', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0, 168, 159, 0.08)', border: '1px solid #EEEEEE' },
  cabeceraBloque: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', backgroundColor: '#FFFFFF', border: 'none', cursor: 'pointer', outline: 'none' },
  tituloBloque: { margin: 0, fontSize: '1.1rem', color: '#444444', fontWeight: '600' },
  contenidoBloque: { padding: '20px', backgroundColor: '#FAFAFA', borderTop: '1px solid #EEEEEE' },
  placeholderMascara: { padding: '30px', textAlign: 'center', border: '2px dashed #CCCCCC', borderRadius: '8px', color: '#666666', fontSize: '0.9rem' }
};
