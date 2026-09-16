import React, { useState, useEffect } from 'react';
import Disponibilidad from '../components/Disponibilidad';
import Calendario from '../components/Calendario';
import GestionGrupos from '../components/GestionGrupos';
import Reprogramaciones from '../components/Reprogramaciones';
import InformacionCuenta from '../components/InformacionCuenta';
import { supabase } from '../supabaseClient';

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
  
  // Estado para las métricas principales del Panel de Control
  const [metricas, setMetricas] = useState({
    confirmadas: 0,
    reservadas: 0,
    canceladas: 0
  });

  const rol = usuarioData?.rol || 'Empresario';

  const esAdmin = rol === 'Administrador' || rol === 'Súper Administrador';
  const esChair = rol === 'Chair' || esAdmin;
  const esEmpresario = true;

  // Cargar métricas iniciales al montar el Dashboard
  useEffect(() => {
    if (usuarioData?.id) {
      cargarMetricasIniciales();
    }
  }, [usuarioData]);

  const cargarMetricasIniciales = async () => {
    try {
      const { data: dataCitas, error } = await supabase
        .from('agd_citas')
        .select('estado')
        .eq('chair_id', usuarioData.id);

      if (error) throw error;

      if (dataCitas) {
        calcularYActualizarMetricas(dataCitas);
      }
    } catch (err) {
      console.error('Error cargando métricas iniciales:', err);
    }
  };

  const calcularYActualizarMetricas = (listaCitas) => {
    const confirmadas = listaCitas.filter(c => c.estado === 'confirmado' || c.estado === 'Confirmada').length;
    const reservadas = listaCitas.filter(c => c.estado === 'reservado' || c.estado === 'Reservada').length;
    const canceladas = listaCitas.filter(c => c.estado === 'cancelado' || c.estado === 'Cancelada').length;
    
    setMetricas({ confirmadas, reservadas, canceladas });
  };

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
        <div style={estilos.headerPanel}>
          <h2 style={estilos.tituloPrincipal}>Panel de Control</h2>
          
          {/* Tarjetas de Métricas Principales (Visibles inmediatamente al iniciar sesión) */}
          <div style={estilos.contenedorMetricas}>
            <div style={estilos.cardMetrica}>
              <span style={estilos.labelMetrica}>Citas Confirmadas</span>
              <span style={{ ...estilos.valorMetrica, color: '#00796B' }}>{metricas.confirmadas}</span>
            </div>
            <div style={estilos.cardMetrica}>
              <span style={estilos.labelMetrica}>Reservas Pendientes</span>
              <span style={{ ...estilos.valorMetrica, color: '#D97706' }}>{metricas.reservadas}</span>
            </div>
            <div style={estilos.cardMetrica}>
              <span style={estilos.labelMetrica}>Citas Canceladas</span>
              <span style={{ ...estilos.valorMetrica, color: '#DC2626' }}>{metricas.canceladas}</span>
            </div>
          </div>
        </div>

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
              <Calendario usuarioId={usuarioData?.id} onActualizarMetricas={calcularYActualizarMetricas} />
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

          {/* Bloque 5: Gestión de Reprogramaciones */}
          {esChair && (
            <BloqueDesplegable 
              titulo="Gestión de Reprogramaciones" 
              isOpen={bloqueAbierto === 5} 
              onClick={() => alternarBloque(5)}
            >
              <Reprogramaciones usuarioId={usuarioData?.id} />
            </BloqueDesplegable>
          )}

          {/* Bloque 6: Información de la Cuenta (Visible para todos) */}
          <BloqueDesplegable 
            titulo="Información de la Cuenta" 
            isOpen={bloqueAbierto === 6} 
            onClick={() => alternarBloque(6)}
          >
            <InformacionCuenta usuarioId={usuarioData?.id} />
          </BloqueDesplegable>

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
  headerPanel: { marginBottom: '30px', borderBottom: '2px solid #E2E8F0', paddingBottom: '20px' },
  tituloPrincipal: { fontSize: '1.8rem', color: '#333333', marginBottom: '15px' },
  contenedorMetricas: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', width: '100%' },
  cardMetrica: { backgroundColor: '#FFFFFF', padding: '12px 15px', borderRadius: '10px', border: '1px solid #CBD5E1', boxShadow: '0 2px 6px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' },
  labelMetrica: { fontSize: '0.7rem', color: '#64748B', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' },
  valorMetrica: { fontSize: '1.4rem', fontWeight: 'bold' },
  contenedorBloques: { display: 'flex', flexDirection: 'column', gap: '15px' },
  bloque: { backgroundColor: '#FFFFFF', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0, 168, 159, 0.08)', border: '1px solid #EEEEEE' },
  cabeceraBloque: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', backgroundColor: '#FFFFFF', border: 'none', cursor: 'pointer', outline: 'none' },
  tituloBloque: { margin: 0, fontSize: '1.1rem', color: '#444444', fontWeight: '600' },
  contenidoBloque: { padding: '20px', backgroundColor: '#FAFAFA', borderTop: '1px solid #EEEEEE' },
  placeholderMascara: { padding: '30px', textAlign: 'center', border: '2px dashed #CCCCCC', borderRadius: '8px', color: '#666666', fontSize: '0.9rem' }
};
