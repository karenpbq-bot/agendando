import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function GestionGrupos({ usuarioId }) {
  const [grupos, setGrupos] = useState([]);
  const [nombreGrupo, setNombreGrupo] = useState('');
  const [codigoCliente, setCodigoCliente] = useState('TAM01');
  const [limiteInvitados, setLimiteInvitados] = useState(20);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState(null);
  const [miembrosGrupo, setMiembrosGrupo] = useState([]);
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (usuarioId) {
      cargarGruposChair();
    }
  }, [usuarioId]);

  // Generador de código aleatorio exacto de 7 caracteres (letras y números)
  const generarCodigoInvitacion = () => {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let codigo = '';
    for (let i = 0; i < 7; i++) {
      codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return codigo;
  };

  const cargarGruposChair = async () => {
    try {
      const { data, error } = await supabase
        .from('agd_grupos')
        .select('*')
        .eq('chair_id', usuarioId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setGrupos(data);
    } catch (err) {
      console.error('Error cargando grupos:', err);
    }
  };

  const crearGrupo = async (e) => {
    e.preventDefault();
    setMensaje('');
    setCargando(true);

    try {
      const codigoUnico = generarCodigoInvitacion();

      const { error } = await supabase.from('agd_grupos').insert([
        {
          chair_id: usuarioId,
          nombre_grupo: nombreGrupo,
          codigo_cliente: codigoCliente || 'TAM01',
          codigo_invitacion: codigoUnico,
          limite_invitados: parseInt(limiteInvitados, 10) || 20,
          activo: true
        }
      ]);

      if (error) throw error;

      setMensaje(`¡Grupo creado con éxito! Código de invitación: ${codigoUnico}`);
      setNombreGrupo('');
      cargarGruposChair();
    } catch (err) {
      setMensaje('Error al crear el grupo: ' + err.message);
    } finally {
      setCargando(false);
    }
  };

  const verMiembros = async (grupo) => {
    setGrupoSeleccionado(grupo);
    try {
      const { data, error } = await supabase
        .from('agd_grupo_miembros')
        .select('*, usuarios(nombre_completo, email, telefono, rol)')
        .eq('grupo_id', grupo.id);

      if (error) throw error;
      if (data) setMiembrosGrupo(data);
    } catch (err) {
      console.error('Error cargando miembros:', err);
    }
  };

  const compartirWhatsApp = (grupo) => {
    const texto = encodeURIComponent(
      `¡Hola! Te invito a unirte a mi grupo "${grupo.nombre_grupo}". Ingresa a la plataforma y utiliza tu código de invitación obligatorio: *${grupo.codigo_invitacion}*`
    );
    window.open(`https://wa.me/?text=${texto}`, '_blank');
  };

  return (
    <div style={estilos.contenedor}>
      <h2 style={estilos.titulo}>Gestión de Grupos y Códigos de Invitación</h2>

      {mensaje && <p style={estilos.mensajeGeneral}>{mensaje}</p>}

      <div style={estilos.seccionGrid}>
        {/* Formulario de Creación de Grupo */}
        <div style={estilos.cardFormulario}>
          <h3 style={estilos.subSubTitulo}>Crear Nuevo Grupo</h3>
          <form onSubmit={crearGrupo} style={estilos.formulario}>
            <div style={estilos.grupoInput}>
              <label style={estilos.label}>Nombre del Grupo</label>
              <input 
                type="text" 
                value={nombreGrupo} 
                onChange={(e) => setNombreGrupo(e.target.value)}
                placeholder="Ej. Directorio Empresarial Q3"
                style={estilos.input}
                required 
              />
            </div>

            <div style={estilos.grupoInput}>
              <label style={estilos.label}>Código de Cliente / Organización</label>
              <input 
                type="text" 
                value={codigoCliente} 
                onChange={(e) => setCodigoCliente(e.target.value)}
                placeholder="Ej. TAM01"
                style={estilos.input}
                required 
              />
            </div>

            <div style={estilos.grupoInput}>
              <label style={estilos.label}>Límite de Invitados</label>
              <input 
                type="number" 
                value={limiteInvitados} 
                onChange={(e) => setLimiteInvitados(e.target.value)}
                style={estilos.input}
                min="1"
                max="100"
                required 
              />
            </div>

            <button type="submit" disabled={cargando} style={estilos.botonPrimario}>
              {cargando ? 'Generando...' : 'Generar Grupo y Código (7 Caracteres)'}
            </button>
          </form>
        </div>

        {/* Listado de Grupos Creados */}
        <div style={estilos.cardLista}>
          <h3 style={estilos.subSubTitulo}>Tus Grupos Activos</h3>
          {grupos.length === 0 ? (
            <p style={estilos.textoVacio}>Aún no has creado ningún grupo.</p>
          ) : (
            <div style={estilos.listaGrupos}>
              {grupos.map(g => (
                <div key={g.id} style={estilos.itemGrupo}>
                  <div>
                    <h4 style={estilos.nombreGrupoItem}>{g.nombre_grupo}</h4>
                    <p style={estilos.detallesItem}>Cliente: <b>{g.codigo_cliente}</b> | Código: <b style={{color: '#00A89F'}}>{g.codigo_invitacion}</b></p>
                    <p style={estilos.detallesItem}>Cupo máx: {g.limite_invitados} invitados</p>
                  </div>
                  <div style={estilos.botonesGrupo}>
                    <button onClick={() => verMiembros(g)} style={estilos.botonSecundario}>Ver Miembros</button>
                    <button onClick={() => compartirWhatsApp(g)} style={estilos.botonWs}>Compartir WA</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal o Panel de Miembros del Grupo Seleccionado */}
      {grupoSeleccionado && (
        <div style={estilos.modalOverlay}>
          <div style={estilos.modalContenido}>
            <div style={estilos.modalHeader}>
              <h3 style={estilos.modalTitulo}>Miembros de: {grupoSeleccionado.nombre_grupo}</h3>
              <button onClick={() => setGrupoSeleccionado(null)} style={estilos.btnCerrarModal}>✕</button>
            </div>
            <p style={estilos.infoCodigoModal}>Código de invitación del grupo: <b>{grupoSeleccionado.codigo_invitacion}</b></p>
            
            <div style={estilos.tablaMiembrosContainer}>
              {miembrosGrupo.length === 0 ? (
                <p style={estilos.textoVacio}>Aún no hay invitados ni miembros registrados con este código.</p>
              ) : (
                <table style={estilos.tablaMiembros}>
                  <thead>
                    <tr>
                      <th style={estilos.thMiembro}>Nombre</th>
                      <th style={estilos.thMiembro}>Email</th>
                      <th style={estilos.thMiembro}>Rol</th>
                    </tr>
                  </thead>
                  <tbody>
                    {miembrosGrupo.map(m => (
                      <tr key={m.id}>
                        <td style={estilos.tdMiembro}>{m.usuarios?.nombre_completo || 'N/D'}</td>
                        <td style={estilos.tdMiembro}>{m.usuarios?.email || 'N/D'}</td>
                        <td style={estilos.tdMiembro}>
                          <span style={{...estilos.badgeRol, backgroundColor: m.rol_en_grupo === 'Chair' ? '#00796B' : '#B8860B'}}>
                            {m.rol_en_grupo}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const estilos = {
  contenedor: { padding: '15px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif', backgroundColor: '#F8F9FA' },
  titulo: { fontSize: '1.3rem', color: '#333', marginBottom: '15px', textAlign: 'center' },
  mensajeGeneral: { fontSize: '0.85rem', color: '#00A89F', textAlign: 'center', fontWeight: 'bold', margin: '8px 0' },
  seccionGrid: { display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '20px', alignItems: 'start' },
  cardFormulario: { backgroundColor: '#FFF', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: '1px solid #EAEAEA' },
  cardLista: { backgroundColor: '#FFF', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: '1px solid #EAEAEA' },
  subSubTitulo: { fontSize: '1rem', color: '#333', marginBottom: '12px', borderBottom: '2px solid #00A89F', paddingBottom: '6px' },
  formulario: { display: 'flex', flexDirection: 'column', gap: '12px' },
  grupoInput: { display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' },
  label: { fontSize: '0.75rem', fontWeight: 'bold', color: '#444' },
  input: { padding: '8px', borderRadius: '6px', border: '1px solid #CCC', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' },
  botonPrimario: { padding: '10px', borderRadius: '6px', border: 'none', background: 'linear-gradient(90deg, #00A89F 0%, #88D84D 100%)', color: '#FFF', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '5px' },
  textoVacio: { fontSize: '0.8rem', color: '#777', textAlign: 'center', padding: '15px' },
  listaGrupos: { display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '450px', overflowY: 'auto' },
  itemGrupo: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderRadius: '8px', border: '1px solid #EEE', backgroundColor: '#FAFAFA' },
  nombreGrupoItem: { fontSize: '0.9rem', color: '#333', margin: '0 0 4px 0' },
  detallesItem: { fontSize: '0.75rem', color: '#666', margin: '2px 0' },
  botonesGrupo: { display: 'flex', flexDirection: 'column', gap: '6px' },
  botonSecundario: { padding: '6px 10px', borderRadius: '5px', border: '1px solid #00A89F', background: '#FFF', color: '#00A89F', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' },
  botonWs: { padding: '6px 10px', borderRadius: '5px', border: 'none', background: '#25D366', color: '#FFF', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' },
  modalContenido: { backgroundColor: '#FFF', padding: '20px', borderRadius: '10px', width: '100%', maxWidth: '550px', boxSizing: 'border-box' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  modalTitulo: { fontSize: '1rem', color: '#333', margin: 0 },
  btnCerrarModal: { background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#666' },
  infoCodigoModal: { fontSize: '0.8rem', color: '#555', marginBottom: '12px' },
  tablaMiembrosContainer: { maxHeight: '300px', overflowY: 'auto' },
  tablaMiembros: { width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' },
  thMiembro: { padding: '8px', backgroundColor: '#00A89F', color: '#FFF', textAlign: 'left' },
  tdMiembro: { padding: '8px', borderBottom: '1px solid #EEE' },
  badgeRol: { padding: '3px 8px', borderRadius: '10px', color: '#FFF', fontSize: '0.7rem', fontWeight: 'bold' }
};
