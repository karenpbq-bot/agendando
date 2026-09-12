import React, { useState } from 'react';

export default function Calendario({ rolUsuario }) {
  const [vista, setVista] = useState('semanal');
  const [semanaActual, setSemanaActual] = useState('Del 14 al 20 de Septiembre, 2026');

  const horasDelDia = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  // Estado para las citas agendadas (clave: "Día-Hora")
  const [citas, setCitas] = useState({
    'Lunes-09:00': { tipo: 'disponible', texto: 'Disponible', estado: 'disponible', empresario: '' },
    'Lunes-10:00': { tipo: 'individual', texto: 'Sesión Ind: Juan Pérez', estado: 'confirmado', empresario: 'Juan Pérez' },
    'Martes-11:00': { tipo: 'grupal', texto: 'Sesión Grupal: Directorio A', estado: 'reservado', empresario: 'Directorio A' }
  });

  // Estado para el modal o panel de agendamiento/gestión al hacer clic en una celda
  const [celdaSeleccionada, setCeldaSeleccionada] = useState(null); // { dia, hora }
  const [tipoSesion, setTipoSesion] = useState('individual'); // 'disponible', 'individual', 'grupal'
  const [nombreEmpresario, setNombreEmpresario] = useState('');
  const [estadoSesion, setEstadoSesion] = useState('reservado'); // 'reservado', 'confirmado', 'cancelado'
  const [mensaje, setMensaje] = useState('');

  const esChair = rolUsuario === 'Chair' || rolUsuario === 'Administrador' || rolUsuario === 'Súper Administrador';

  const manejarClicCelda = (dia, hora) => {
    const clave = `${dia}-${hora}`;
    const citaActual = citas[clave];

    setCeldaSeleccionada({ dia, hora });
    if (citaActual) {
      setTipoSesion(citaActual.tipo || 'disponible');
      setNombreEmpresario(citaActual.empresario || '');
      setEstadoSesion(citaActual.estado || 'reservado');
    } else {
      setTipoSesion('disponible');
      setNombreEmpresario('');
      setEstadoSesion('reservado');
    }
    setMensaje('');
  };

  const guardarCambioCita = (e) => {
    e.preventDefault();
    if (!celdaSeleccionada) return;

    const clave = `${celdaSeleccionada.dia}-${celdaSeleccionada.hora}`;
    
    let textoMostrar = 'Disponible';
    if (tipoSesion === 'individual') textoMostrar = `Sesión Ind: ${nombreEmpresario || 'Empresario'}`;
    if (tipoSesion === 'grupal') textoMostrar = `Sesión Grupal: ${nombreEmpresario || 'Grupo'}`;
    if (tipoSesion === 'disponible') textoMostrar = 'Disponible';

    setCitas({
      ...citas,
      [clave]: {
        tipo: tipoSesion,
        texto: textoMostrar,
        estado: estadoSesion,
        empresario: nombreEmpresario
      }
    });

    setCeldaSeleccionada(null);
    setMensaje('¡Agenda actualizada correctamente!');
    setTimeout(() => setMensaje(''), 3000);
  };

  return (
    <div style={estilos.contenedor}>
      
      {/* Controles y Leyenda */}
      <div style={estilos.barraControl}>
        <div style={estilos.selectorVista}>
          <button 
            onClick={() => setVista('semanal')} 
            style={{ ...estilos.botonVista, backgroundColor: vista === 'semanal' ? '#00A89F' : '#E0E0E0', color: vista === 'semanal' ? '#FFF' : '#333' }}
          >
            Vista Semanal
          </button>
          <button 
            onClick={() => setVista('mensual')} 
            style={{ ...estilos.botonVista, backgroundColor: vista === 'mensual' ? '#00A89F' : '#E0E0E0', color: vista === 'mensual' ? '#FFF' : '#333' }}
          >
            Vista Mensual
          </button>
        </div>

        <div style={estilos.navegacionFecha}>
          <span style={estilos.textoFecha}>{semanaActual}</span>
        </div>
      </div>

      <div style={estilos.leyenda}>
        <div style={estilos.itemLeyenda}><span style={{...estilos.puntoColor, backgroundColor: 'rgba(255, 235, 59, 0.4)', border: '1px solid #FBC02D'}}></span> Disponible</div>
        <div style={estilos.itemLeyenda}><span style={{...estilos.puntoColor, backgroundColor: '#FFF3E0', border: '1px solid #FB8C00'}}></span> Reservado</div>
        <div style={estilos.itemLeyenda}><span style={{...estilos.puntoColor, backgroundColor: '#E0F7FA', border: '1px solid #00ACC1'}}></span> Confirmado (Ind.)</div>
        <div style={estilos.itemLeyenda}><span style={{...estilos.puntoColor, backgroundColor: '#E8F5E9', border: '1px solid #43A047'}}></span> Confirmado (Grupal)</div>
        <div style={estilos.itemLeyenda}><span style={{...estilos.puntoColor, backgroundColor: '#FFEBEE', border: '1px solid #E57373'}}></span> Cancelado</div>
      </div>

      {mensaje && <p style={estilos.alertaGlobal}>{mensaje}</p>}

      {/* Parrilla del Calendario */}
      <div style={estilos.gridCalendario}>
        <div style={estilos.columnaHoras}>
          <div style={estilos.cabeceraHora}>Hora</div>
          {horasDelDia.map(h => (
            <div key={h} style={estilos.celdaHora}>{h}</div>
          ))}
        </div>

        {diasSemana.map(dia => (
          <div key={dia} style={estilos.columnaDia}>
            <div style={estilos.cabeceraDia}>{dia}</div>
            {horasDelDia.map(hora => {
              const clave = `${dia}-${hora}`;
              const cita = citas[clave];

              let estiloCelda = estilos.celdaVacia;
              if (cita) {
                if (cita.tipo === 'disponible') estiloCelda = estilos.celdaDisponible;
                else if (cita.estado === 'reservado') estiloCelda = estilos.celdaReservado;
                else if (cita.estado === 'cancelado') estiloCelda = estilos.celdaCancelado;
                else if (cita.tipo === 'individual') estiloCelda = estilos.celdaIndividual;
                else if (cita.tipo === 'grupal') estiloCelda = estilos.celdaGrupal;
              }

              return (
                <div 
                  key={hora} 
                  style={estiloCelda} 
                  onClick={() => manejarClicCelda(dia, hora)}
                  title="Haz clic para gestionar este horario"
                >
                  <span style={estilos.textoEvento}>
                    {cita ? cita.texto : '--'}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Panel / Modal de Edición de Cita */}
      {celdaSeleccionada && (
        <div style={estilos.modalOverlay}>
          <div style={estilos.modalContenido}>
            <h3 style={estilos.modalTitulo}>
              Gestionar Cita: {celdaSeleccionada.dia} a las {celdaSeleccionada.hora}
            </h3>
            
            <form onSubmit={guardarCambioCita} style={estilos.formularioModal}>
              
              <div style={estilos.grupoInput}>
                <label style={estilos.etiqueta}>Tipo de Espacio / Sesión</label>
                <select 
                  value={tipoSesion} 
                  onChange={(e) => setTipoSesion(e.target.value)}
                  style={estilos.input}
                >
                  <option value="disponible">Marcar como Disponible (Libre)</option>
                  <option value="individual">Sesión Individual</option>
                  <option value="grupal">Sesión Grupal</option>
                </select>
              </div>

              {tipoSesion !== 'disponible' && (
                <>
                  <div style={estilos.grupoInput}>
                    <label style={estilos.etiqueta}>
                      {esChair ? 'Asignar a Empresario / Grupo' : 'Mi Nombre / Empresa'}
                    </label>
                    <input 
                      type="text" 
                      value={nombreEmpresario} 
                      onChange={(e) => setNombreEmpresario(e.target.value)}
                      placeholder="Ej. Juan Pérez / Empresa ABC"
                      style={estilos.input}
                      required
                    />
                  </div>

                  <div style={estilos.grupoInput}>
                    <label style={estilos.etiqueta}>Estado de la Sesión</label>
                    <select 
                      value={estadoSesion} 
                      onChange={(e) => setEstadoSesion(e.target.value)}
                      style={estilos.input}
                    >
                      <option value="reservado">Reservado (Pendiente)</option>
                      <option value="confirmado">Confirmado</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </div>
                </>
              )}

              <div style={estilos.botonesModal}>
                <button type="button" onClick={() => setCeldaSeleccionada(null)} style={estilos.botonCancelar}>
                  Cerrar
                </button>
                <button type="submit" style={estilos.botonGuardar}>
                  Guardar Cambios
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

const estilos = {
  contenedor: { padding: '10px', fontFamily: 'sans-serif', position: 'relative' },
  barraControl: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' },
  selectorVista: { display: 'flex', gap: '8px' },
  botonVista: { padding: '8px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' },
  navegacionFecha: { fontSize: '0.95rem', fontWeight: '600', color: '#444' },
  leyenda: { display: 'flex', gap: '12px', marginBottom: '15px', flexWrap: 'wrap', fontSize: '0.75rem', color: '#555' },
  itemLeyenda: { display: 'flex', alignItems: 'center', gap: '5px' },
  puntoColor: { width: '12px', height: '12px', borderRadius: '3px', display: 'inline-block' },
  alertaGlobal: { fontSize: '0.85rem', color: '#00A89F', fontWeight: 'bold', marginBottom: '10px' },
  
  gridCalendario: { display: 'flex', overflowX: 'auto', border: '1px solid #DDDDDD', borderRadius: '8px', backgroundColor: '#FFFFFF' },
  columnaHoras: { minWidth: '70px', borderRight: '1px solid #EEEEEE', backgroundColor: '#FAFAFA' },
  cabeceraHora: { padding: '12px 8px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.8rem', borderBottom: '1px solid #EEEEEE', color: '#666' },
  celdaHora: { height: '55px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#777', borderBottom: '1px solid #F0F0F0' },
  columnaDia: { flex: 1, minWidth: '130px', borderRight: '1px solid #EEEEEE' },
  cabeceraDia: { padding: '12px 8px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.85rem', backgroundColor: '#00A89F', color: '#FFF', borderBottom: '1px solid #EEEEEE' },
  
  celdaVacia: { height: '55px', borderBottom: '1px solid #F0F0F0', borderRight: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: '#CCC', cursor: 'pointer', padding: '0 2px', textAlign: 'center' },
  celdaDisponible: { height: '55px', borderBottom: '1px solid #F0F0F0', borderRight: '1px solid #F0F0F0', backgroundColor: 'rgba(255, 235, 59, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 2px', cursor: 'pointer', textAlign: 'center' },
  celdaReservado: { height: '55px', borderBottom: '1px solid #F0F0F0', borderRight: '1px solid #F0F0F0', backgroundColor: '#FFF3E0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 2px', cursor: 'pointer', textAlign: 'center' },
  celdaIndividual: { height: '55px', borderBottom: '1px solid #F0F0F0', borderRight: '1px solid #F0F0F0', backgroundColor: '#E0F7FA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 2px', cursor: 'pointer', textAlign: 'center' },
  celdaGrupal: { height: '55px', borderBottom: '1px solid #F0F0F0', borderRight: '1px solid #F0F0F0', backgroundColor: '#E8F5E9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 2px', cursor: 'pointer', textAlign: 'center' },
  celdaCancelado: { height: '55px', borderBottom: '1px solid #F0F0F0', borderRight: '1px solid #F0F0F0', backgroundColor: '#FFEBEE', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 2px', cursor: 'pointer', textAlign: 'center' },
  
  textoEvento: { fontSize: '0.65rem', fontWeight: '600', color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' },

  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContenido: { backgroundColor: '#FFFFFF', padding: '30px', borderRadius: '10px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' },
  modalTitulo: { fontSize: '1.1rem', color: '#333', marginBottom: '20px', marginTop: 0 },
  formularioModal: { display: 'flex', flexDirection: 'column', gap: '15px' },
  grupoInput: { display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' },
  etiqueta: { fontSize: '0.85rem', fontWeight: '500', color: '#444' },
  input: { padding: '10px', borderRadius: '6px', border: '1px solid #CCC', fontSize: '0.9rem', outline: 'none' },
  botonesModal: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' },
  botonCancelar: { padding: '8px 14px', backgroundColor: '#E0E0E0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#555' },
  botonGuardar: { padding: '8px 14px', backgroundColor: '#00A89F', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#FFF' }
};
