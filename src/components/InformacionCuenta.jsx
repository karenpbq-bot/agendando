import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function InformacionCuenta({ usuarioId }) {
  const [datosUsuario, setDatosUsuario] = useState(null);
  const [gruposInscritos, setGruposInscritos] = useState([]);
  const [citasPendientes, setCitasPendientes] = useState([]);
  const [citasCanceladas, setCitasCanceladas] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (usuarioId) {
      cargarInformacionCuenta();
    }
  }, [usuarioId]);

  const cargarInformacionCuenta = async () => {
    try {
      setCargando(true);

      // 1. Obtener datos generales del usuario
      const { data: userDat, error: errUser } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', usuarioId)
        .single();

      if (errUser) throw errUser;
      setDatosUsuario(userDat);

      const esChair = userDat.rol === 'Chair';

      // 2. Obtener grupos a los que pertenece (si es Invitado via agd_grupo_miembros, si es Chair los suyos o creados)
      if (esChair) {
        const { data: gruposChair } = await supabase
          .from('agd_grupos')
          .select('nombre_grupo, codigo_invitacion, created_at')
          .eq('chair_id', usuarioId);
        setGruposInscritos(gruposChair || []);
      } else {
        const { data: gruposMiembro } = await supabase
          .from('agd_grupo_miembros')
          .select('agd_grupos(nombre_grupo, codigo_invitacion)')
          .eq('usuario_id', usuarioId);
        
        const formateados = gruposMiembro?.map(m => m.agd_grupos).filter(Boolean) || [];
        setGruposInscritos(formateados);
      }

      // 3. Obtener Citas Pendientes (Registradas, Confirmadas o Propuestas)
      const { data: pendData } = await supabase
        .from('agd_citas')
        .select('*')
        .or(`chair_id.eq.${usuarioId},invitado_id.eq.${usuarioId}`) // Ajusta según tu esquema de citas
        .in('estado', ['Registrada', 'Confirmada', 'Propuesta_Reprogramacion']);
      
      setCitasPendientes(pendData || []);

      // 4. Obtener Citas Canceladas
      const { data: cancData } = await supabase
        .from('agd_citas')
        .select('*')
        .or(`chair_id.eq.${usuarioId},invitado_id.eq.${usuarioId}`)
        .eq('estado', 'Cancelada');

      setCitasCanceladas(cancData || []);

    } catch (err) {
      console.error('Error cargando la información de la cuenta:', err);
    } finally {
      setCargando(false);
    }
  };

  if (cargando) {
    return <p style={estilos.textoVacio}>Cargando información de la cuenta...</p>;
  }

  const esChair = datosUsuario?.rol === 'Chair';

  return (
    <div style={estilos.contenedor}>
      
      {/* Sección 1: Datos Generales y Suscripción */}
      <div style={estilos.gridPerfil}>
        <div style={estilos.cardInfo}>
          <h3 style={estilos.subSubTitulo}>Tipo de Usuario</h3>
          <p style={estilos.valorDestacado}>
            {esChair ? '👑 Anfitrión' : '🤝 Invitado'}
          </p>
          <p style={estilos.textoDetalle}><b>Nombre:</b> {datosUsuario?.nombre_completo}</p>
          <p style={estilos.textoDetalle}><b>Correo:</b> {datosUsuario?.email || datosUsuario?.correo}</p>
        </div>

        {/* Vigencia de suscripción (SOLO PARA ANFITRIONES) */}
        {esChair && (
          <div style={estilos.cardInfo}>
            <h3 style={estilos.subSubTitulo}>Vigencia de Suscripción</h3>
            <p style={estilos.valorDestacado}>
              Plan: <span style={{textTransform: 'uppercase', color: '#00A89F'}}>{datosUsuario?.plan || 'Prueba'}</span>
            </p>
            <p style={estilos.textoDetalle}>
              <b>Estado de Pago:</b> {datosUsuario?.pago_al_dia ? '✅ Al día / Activo' : '⚠️ Pago Pendiente'}
            </p>
          </div>
        )}
      </div>

      {/* Sección 2: Grupos a los que pertenece */}
      <div style={estilos.cardSeccionCompleta}>
        <h3 style={estilos.subSubTitulo}>Grupos a los que Pertenece ({gruposInscritos.length})</h3>
        {gruposInscritos.length === 0 ? (
          <p style={estilos.textoVacio}>No estás asociado a ningún grupo actualmente.</p>
        ) : (
          <div style={estilos.listaGrid}>
            {gruposInscritos.map((g, idx) => (
              <div key={idx} style={estilos.itemCard}>
                <h4 style={estilos.tituloItem}>{g.nombre_grupo}</h4>
                <p style={estilos.subItem}>Código: <b style={{color: '#00A89F'}}>{g.codigo_invitacion}</b></p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sección 3: Citas Pendientes y Canceladas */}
      <div style={estilos.gridCitas}>
        <div style={estilos.cardSeccion}>
          <h3 style={estilos.subSubTitulo}>Citas Pendientes ({citasPendientes.length})</h3>
          {citasPendientes.length === 0 ? (
            <p style={estilos.textoVacio}>No tienes citas pendientes o confirmadas.</p>
          ) : (
            citasPendientes.map(c => (
              <div key={c.id} style={estilos.itemCita}>
                <p style={estilos.textoCita}>Estado: <b>{c.estado}</b></p>
                <p style={estilos.textoCitaDetalle}>Fecha: {c.fecha_propuesta_nueva ? new Date(c.fecha_propuesta_nueva).toLocaleString() : 'Programada'}</p>
              </div>
            ))
          )}
        </div>

        <div style={estilos.cardSeccion}>
          <h3 style={estilos.subSubTitulo}>Citas Canceladas ({citasCanceladas.length})</h3>
          {citasCanceladas.length === 0 ? (
            <p style={estilos.textoVacio}>No hay registros de citas canceladas.</p>
          ) : (
            citasCanceladas.map(c => (
              <div key={c.id} style={{...estilos.itemCita, backgroundColor: '#FFEBEE', borderColor: '#FFCDD2'}}>
                <p style={estilos.textoCita}>Estado: <b style={{color: '#D32F2F'}}>Cancelada</b></p>
                <p style={estilos.textoCitaDetalle}>ID Cita: {c.id.substring(0,8)}...</p>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}

const estilos = {
  contenedor: { padding: '10px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif', backgroundColor: '#F8F9FA' },
  gridPerfil: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px', marginBottom: '15px' },
  gridCitas: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' },
  cardInfo: { backgroundColor: '#FFF', padding: '15px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: '1px solid #EAEAEA' },
  cardSeccionCompleta: { backgroundColor: '#FFF', padding: '15px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: '1px solid #EAEAEA', marginBottom: '15px' },
  cardSeccion: { backgroundColor: '#FFF', padding: '15px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: '1px solid #EAEAEA' },
  subSubTitulo: { fontSize: '0.95rem', color: '#333', marginBottom: '10px', borderBottom: '2px solid #00A89F', paddingBottom: '4px' },
  valorDestacado: { fontSize: '1.1rem', fontWeight: 'bold', color: '#00796B', margin: '5px 0' },
  textoDetalle: { fontSize: '0.8rem', color: '#555', margin: '4px 0' },
  textoVacio: { fontSize: '0.75rem', color: '#777', textAlign: 'center', padding: '15px' },
  listaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' },
  itemCard: { backgroundColor: '#FAFAFA', padding: '10px', borderRadius: '6px', border: '1px solid #EEE' },
  tituloItem: { fontSize: '0.85rem', color: '#333', margin: '0 0 4px 0' },
  subItem: { fontSize: '0.75rem', color: '#666', margin: 0 },
  itemCita: { backgroundColor: '#FAFAFA', padding: '8px', borderRadius: '6px', border: '1px solid #EEE', marginBottom: '6px' },
  textoCita: { fontSize: '0.8rem', color: '#333', margin: '0 0 2px 0' },
  textoCitaDetalle: { fontSize: '0.7rem', color: '#666', margin: 0 }
};
