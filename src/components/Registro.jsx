import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Registro({ onVolverLogin, onRegistroExitoso }) {
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [dni, setDni] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [rol, setRol] = useState('Empresario'); // 'Chair' o 'Empresario'
  const [plan, setPlan] = useState('prueba'); // 'prueba', 'mensual', 'semestral', 'anual'
  const [aceptoTerminos, setAceptoTerminos] = useState(false);
  
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const manejarRegistro = async (e) => {
    e.preventDefault();
    if (!aceptoTerminos) {
      setMensaje('Debes aceptar las condiciones del servicio y la tarifa.');
      return;
    }

    setCargando(true);
    setMensaje('');

    try {
      // Validamos si el nombre de usuario ya existe
      const { data: usuarioExistente } = await supabase
        .from('usuarios')
        .select('nombre_usuario')
        .eq('nombre_usuario', nombreUsuario)
        .single();

      if (usuarioExistente) {
        setMensaje('El nombre de usuario ya está en uso. Elige otro.');
        setCargando(false);
        return;
      }

      // Insertamos el nuevo usuario en Supabase con los campos requeridos
      const { data, error } = await supabase
        .from('usuarios')
        .insert([
          {
            nombre_completo: nombreCompleto,
            nombre_usuario: nombreUsuario,
            password_hash: password,
            dni: dni,
            telefono: telefono,
            correo: correo,
            rol: rol,
            plan: plan,
            pago_al_dia: plan === 'prueba', // Si es prueba, entra activo de inmediato
            activo: true
          }
        ])
        .select()
        .single();

      if (error) {
        setMensaje('Error al registrar usuario: ' + error.message);
      } else {
        setMensaje('¡Registro exitoso! Iniciando sesión...');
        setTimeout(() => {
          onRegistroExitoso(data);
        }, 1500);
      }
    } catch (err) {
      setMensaje('Error de conexión con la base de datos.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={estilos.contenedor}>
      <div style={estilos.tarjeta}>
        <h2 style={estilos.subtitulo}>Crea tu cuenta en</h2>
        <h1 style={estilos.tituloLogo}>Agendando</h1>

        <form onSubmit={manejarRegistro} style={estilos.formulario}>
          
          <div style={estilos.grupoInput}>
            <label style={estilos.etiqueta}>Nombre Completo</label>
            <input 
              type="text" 
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
              style={estilos.input}
              required 
            />
          </div>

          <div style={estilos.fila}>
            <div style={estilos.grupoInput}>
              <label style={estilos.etiqueta}>Nombre de Usuario</label>
              <input 
                type="text" 
                value={nombreUsuario}
                onChange={(e) => setNombreUsuario(e.target.value)}
                style={estilos.input}
                required 
              />
            </div>
            <div style={estilos.grupoInput}>
              <label style={estilos.etiqueta}>Contraseña</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={estilos.input}
                required 
              />
            </div>
          </div>

          <div style={estilos.fila}>
            <div style={estilos.grupoInput}>
              <label style={estilos.etiqueta}>DNI</label>
              <input 
                type="text" 
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                style={estilos.input}
                required 
              />
            </div>
            <div style={estilos.grupoInput}>
              <label style={estilos.etiqueta}>Nro. de Teléfono</label>
              <input 
                type="text" 
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                style={estilos.input}
                required 
              />
            </div>
          </div>

          <div style={estilos.grupoInput}>
            <label style={estilos.etiqueta}>Correo Electrónico</label>
            <input 
              type="email" 
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              style={estilos.input}
              required 
            />
          </div>

          <div style={estilos.fila}>
            <div style={estilos.grupoInput}>
              <label style={estilos.etiqueta}>Tipo de Usuario</label>
              <select 
                value={rol} 
                onChange={(e) => setRol(e.target.value)}
                style={estilos.input}
              >
                <option value="Empresario">Empresario</option>
                <option value="Chair">Chair</option>
              </select>
            </div>

            <div style={estilos.grupoInput}>
              <label style={estilos.etiqueta}>Tipo de Plan</label>
              <select 
                value={plan} 
                onChange={(e) => setPlan(e.target.value)}
                style={estilos.input}
              >
                <option value="prueba">Prueba Gratuita (1 Semana)</option>
                <option value="mensual">Mensual</option>
                <option value="semestral">Semestral</option>
                <option value="anual">Anual</option>
              </select>
            </div>
          </div>

          <div style={estilos.grupoCheckbox}>
            <input 
              type="checkbox" 
              id="terminos" 
              checked={aceptoTerminos}
              onChange={(e) => setAceptoTerminos(e.target.checked)}
              style={estilos.checkbox}
            />
            <label htmlFor="terminos" style={estilos.etiquetaCheckbox}>
              Acepto las condiciones del servicio y las tarifas vigentes.
            </label>
          </div>

          {mensaje && <p style={estilos.mensaje}>{mensaje}</p>}

          <button type="submit" disabled={cargando} style={estilos.boton}>
            {cargando ? 'Registrando...' : 'Completar Registro'}
          </button>

          <button type="button" onClick={onVolverLogin} style={estilos.botonSecundario}>
            ← Volver al inicio de sesión
          </button>

        </form>
      </div>
    </div>
  );
}

const estilos = {
  contenedor: { display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#EBF5F7', fontFamily: 'sans-serif', padding: '20px' },
  tarjeta: { backgroundColor: '#FFFFFF', padding: '30px 40px', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0, 168, 159, 0.08)', width: '100%', maxWidth: '480px', textAlign: 'center' },
  subtitulo: { fontSize: '0.95rem', color: '#666666', fontWeight: 'normal', marginBottom: '2px' },
  tituloLogo: { fontSize: '2.2rem', fontWeight: 'bold', margin: '0 0 20px 0', background: 'linear-gradient(90deg, #00A89F 0%, #88D84D 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  formulario: { display: 'flex', flexDirection: 'column', gap: '15px' },
  fila: { display: 'flex', gap: '12px' },
  grupoInput: { flex: 1, display: 'flex', flexDirection: 'column', textAlign: 'left' },
  etiqueta: { fontSize: '0.85rem', marginBottom: '5px', color: '#444444', fontWeight: '500' },
  input: { padding: '10px', borderRadius: '6px', border: '1px solid #CCCCCC', backgroundColor: '#FAFAFA', color: '#333333', fontSize: '0.9rem', outline: 'none' },
  grupoCheckbox: { display: 'flex', alignItems: 'flex-start', gap: '8px', textAlign: 'left', marginTop: '5px' },
  checkbox: { cursor: 'pointer', width: '16px', height: '16px', marginTop: '2px' },
  etiquetaCheckbox: { fontSize: '0.8rem', color: '#666666', cursor: 'pointer', lineHeight: '1.2' },
  mensaje: { fontSize: '0.85rem', color: '#00A89F', fontWeight: '500', margin: '0' },
  boton: { padding: '12px', borderRadius: '6px', border: 'none', background: 'linear-gradient(90deg, #00A89F 0%, #88D84D 100%)', color: '#FFFFFF', fontSize: '0.95rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '5px' },
  botonSecundario: { background: 'none', border: 'none', color: '#00A89F', fontSize: '0.85rem', cursor: 'pointer', marginTop: '10px', textDecoration: 'underline' }
};
