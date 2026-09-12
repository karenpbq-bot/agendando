import React, { useState } from 'react';

export default function Calendario({ rolUsuario }) {
  const [vista, setVista] = useState('semanal'); // 'semanal' o 'mensual'
  const [semanaActual, setSemanaActual] = useState('Del 14 al 20 de Septiembre, 2026');

  // Horarios base para la parrilla visual
  const horasDelDia = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  // Simulación de datos (posteriormente se conectará a Supabase)
  // Tipos: 'disponible' (amarillo translúcido), 'individual' (ej. azul), 'grupal' (ej. verde), 'reservado' (ej. gris/naranja)
  const eventosEjemplo = {
    'Lunes-09:00': { tipo: 'disponible', texto: 'Disponible' },
    'Lunes-10:00': { tipo: 'individual', texto: 'Sesión Ind: Juan Pérez (Confirmado)' },
    'Martes-11:00': { tipo: 'grupal', texto: 'Sesión Grupal: Directorio A (Reservado)' },
    'Miércoles-15:00': { tipo: 'disponible', texto: 'Disponible' },
    'Jueves-12:00': { tipo: 'grupal', texto: 'Sesión Grupal: Alpha (Confirmado)' },
    'Viernes-10:00': { tipo: 'individual', texto: 'Sesión Ind: María López (Reservado)' }
  };

  return (
    <div style={estilos.contenedor}>
      
      {/* Barra de Controles Superior */}
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

      {/* Leyenda de Colores */}
      <div style={estilos.leyenda}>
        <div style={estilos.itemLeyenda}><span style={{...estilos.puntoColor, backgroundColor: 'rgba(255, 235, 59, 0.4)', border: '1px solid #FBC02D'}}></span> Disponibilidad</div>
        <div style={estilos.itemLeyenda}><span style={{...estilos.puntoColor, backgroundColor: '#E0F7FA', border: '1px solid #00ACC1'}}></span> Sesión Individual</div>
        <div style={estilos.itemLeyenda}><span style={{...estilos.puntoColor, backgroundColor: '#E8F5E9', border: '1px solid #43A047'}}></span> Sesión Grupal</div>
        <div style={estilos.itemLeyenda}><span style={{...estilos.puntoColor, backgroundColor: '#FFF3E0', border: '1px solid #FB8C00'}}></span> Reservado (Pendiente)</div>
      </div>

      {/* Parrilla de Calendario Estilo Planificador */}
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
              const evento = eventosEjemplo[clave];

              let estiloCelda = estilos.celdaVacia;
              if (evento?.tipo === 'disponible') estiloCelda = estilos.celdaDisponible;
              if (evento?.tipo === 'individual') estiloCelda = estilos.celdaIndividual;
              if (evento?.tipo === 'grupal') estiloCelda = estilos.celdaGrupal;

              return (
                <div key={hora} style={estiloCelda} title={evento ? evento.texto : 'Sin programar'}>
                  {evento ? (
                    <span style={estilos.textoEvento}>{evento.texto}</span>
                  ) : (
                    <span style={estilos.vacioTexto}>--</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

    </div>
  );
}

const estilos = {
  contenedor: { padding: '10px', fontFamily: 'sans-serif' },
  barraControl: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' },
  selectorVista: { display: 'flex', gap: '8px' },
  botonVista: { padding: '8px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' },
  navegacionFecha: { fontSize: '0.95rem', fontWeight: '600', color: '#444' },
  leyenda: { display: 'flex', gap: '15px', marginBottom: '15px', flexWrap: 'wrap', fontSize: '0.75rem', color: '#555' },
  itemLeyenda: { display: 'flex', alignItems: 'center', gap: '6px' },
  puntoColor: { width: '14px', height: '14px', borderRadius: '4px', display: 'inline-block' },
  gridCalendario: { display: 'flex', overflowX: 'auto', border: '1px solid #DDDDDD', borderRadius: '8px', backgroundColor: '#FFFFFF' },
  columnaHoras: { minWidth: '70px', borderRight: '1px solid #EEEEEE', backgroundColor: '#FAFAFA' },
  cabeceraHora: { padding: '12px 8px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.8rem', borderBottom: '1px solid #EEEEEE', color: '#666' },
  celdaHora: { height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#777', borderBottom: '1px solid #F0F0F0' },
  columnaDia: { flex: 1, minWidth: '130px', borderRight: '1px solid #EEEEEE' },
  cabeceraDia: { padding: '12px 8px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.85rem', backgroundColor: '#00A89F', color: '#FFF', borderBottom: '1px solid #EEEEEE' },
  celdaVacia: { height: '50px', borderBottom: '1px solid #F0F0F0', borderRight: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#CCC', cursor: 'pointer' },
  celdaDisponible: { height: '50px', borderBottom: '1px solid #F0F0F0', borderRight: '1px solid #F0F0F0', backgroundColor: 'rgba(255, 235, 59, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', cursor: 'pointer' },
  celdaIndividual: { height: '50px', borderBottom: '1px solid #F0F0F0', borderRight: '1px solid #F0F0F0', backgroundColor: '#E0F7FA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', cursor: 'pointer' },
  celdaGrupal: { height: '50px', borderBottom: '1px solid #F0F0F0', borderRight: '1px solid #F0F0F0', backgroundColor: '#E8F5E9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', cursor: 'pointer' },
  textoEvento: { fontSize: '0.65rem', fontWeight: '600', color: '#333', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  vacioTexto: { color: 'transparent' }
};
