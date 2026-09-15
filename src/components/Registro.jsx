import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Registro({ onVolverLogin, onRegistroExitoso }) {
  // Paso 1: Selección de Perfil ('ANFITRION' o 'INVITADO')
  const [tipoSeleccionado, setTipoSeleccionado] = useState(null);

  // Campos comunes para la validación inicial
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [dni, setDni] = useState('');
  const [telefono, setTelefono] = useState('');

  // Campos restantes del formulario de registro
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [correo, setCorreo] = useState('');
  const [codigoInvitacion, setCodigoInvitacion] = useState(''); // Obligatorio solo para Invitados
  
  const [rubro, setRubro] = useState('');
  const [temasInteres, setTemasInteres] = useState('');
  const [plan, setPlan] = useState('prueba');  
  const [aceptoTerminos, setAceptoTerminos] = useState(false);
  
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  // 1. Función para validar si el usuario ya existe antes de continuar con el registro
  const verificarUsuarioExistente = async (e) => {
    e.preventDefault();
    setCargando(true);
    setMensaje('');

    try {
      // Buscamos si el DNI o el Teléfono ya están registrados en la base de datos
      const { data: usuarioExistente, error } = await supabase
        .from('usuarios')
        .select('nombre_completo, rol')
        .or(`dni.eq.${dni.trim()},telefono.eq.${telefono.trim()}`)
        .maybeSingle();

      if (error) throw error;

      if (usuarioExistente) {
        // Mapeamos el rol de la BD ('Chair' -> Anfitrión, 'Empresario' -> Invitado) para mostrarlo amigablemente
        const rolAmigable = usuarioExistente.rol === 'Chair' ? 'Anfitrión' : 'Invitado';
        
        setMensaje(
          `¡Hola ${usuarioExistente.nombre_completo}! Veo que ya tienes una cuenta como ${rolAmigable}, sólo necesitas iniciar sesión para continuar. Si no recuerdas tu contraseña, ponte en contacto con el siguiente número: +51993883173`
        );
        setCargando(false);
        return;
      }

      // Si no existe, pasamos directamente al llenado del resto del formulario o ejecutamos el registro según corresponda
      // (Si es Anfitrión, pasamos a sus campos; si es Invitado, validamos su código)
      if (tipoSeleccionado === 'INVITADO') {
        await procesarRegistroInvitado();
      } else {
        await procesarRegistroAnfitrion();
      }

    } catch (err) {
      setMensaje('Error al verificar los datos: ' + err.message);
      setCargando(false);
    }
  };

  // 2. Lógica específica para registrar un Anfitrión
  const procesarRegistroAnfitrion = async () => {
    if (!aceptoTerminos) {
      setMensaje('Debes aceptar las condiciones del servicio y la tarifa.');
      setCargando(false);
      return;
    }

    try {
      // Validar nombre de usuario único
      const { data: userCheck } = await supabase
        .from('usuarios')
        .select('nombre_usuario')
        .eq('nombre_usuario', nombreUsuario.trim())
        .maybeSingle();

      if (userCheck) {
        setMensaje('El nombre de usuario ya está en uso. Elige otro.');
        setCargando(false);
        return;
      }

      const { data: nuevoUsuario, error } = await supabase
        .from('usuarios')
        .insert([
          {
            nombre_completo: nombreCompleto,
            nombre_usuario: nombreUsuario.trim(),
            password_hash: password,
            dni: dni.trim(),
            telefono: telefono.trim(),
            email: correo.trim(),
            correo: correo.trim(),
            rubro: rubro || null,
            temas_interes: temasInteres || null,
            rol: 'Chair', // Rol interno
            plan: plan,
            pago_al_dia: plan === 'prueba',
            activo: true
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setMensaje('¡Registro exitoso como Anfitrión! Iniciando sesión...');
      setTimeout(() => {
        onRegistroExitoso(nuevoUsuario);
      }, 1500);

    } catch (err) {
      setMensaje('Error al registrar Anfitrión: ' + err.message);
      setCargando(false);
    }
  };

  // 3. Lógica específica para registrar un Invitado (Validando el código de 7 caracteres)
  const procesarRegistroInvitado = async () => {
    if (!aceptoTerminos) {
      setMensaje('Debes aceptar las condiciones del servicio y la tarifa.');
      setCargando(false);
      return;
    }

    try {
      const codigoLimpio = codigoInvitacion.trim().toUpperCase();

      // Validar que el código de invitación de 7 caracteres exista y esté activo
      const { data: grupoEncontrado, error: errorGrupo } = await supabase
        .from('agd_grupos')
        .select('id, nombre_grupo, chair_id, etiqueta_invitados')
        .eq('codigo_invitacion', codigoLimpio)
        .eq('activo', true)
        .maybeSingle();

      if (errorGrupo || !grupoEncontrado) {
        setMensaje('El código de invitación de 7 caracteres es inválido o el grupo no está activo.');
        setCargando(false);
        return;
      }

      // Validar nombre de usuario único
      const { data: userCheck } = await supabase
        .from('usuarios')
        .select('nombre_usuario')
        .eq('nombre_usuario', nombreUsuario.trim())
        .maybeSingle();

      if (userCheck) {
        setMensaje('El nombre de usuario ya está en uso. Elige otro.');
        setCargando(false);
        return;
      }

      // Crear usuario Invitado
      const { data: nuevoUsuario, error: errorUsuario } = await supabase
        .from('usuarios')
        .insert([
          {
            nombre_completo: nombreCompleto,
            nombre_usuario: nombreUsuario.trim(),
            password_hash: password,
            dni: dni.trim(),
            telefono: telefono.trim(),
            email: correo.trim(),
            correo: correo.trim(),
            rubro: rubro || null,
            temas_interes: temasInteres || null,
            rol: 'Empresario', // Rol interno
            plan: plan,
            pago_al_dia: plan === 'prueba',
            activo: true
          }
        ])
        .select()
        .single();

      if (errorUsuario) throw errorUsuario;

      // Vincular al grupo
      await supabase
        .from('agd_grupo_miembros')
        .insert([
          {
            grupo_id: grupoEncontrado.id,
            usuario_id: nuevoUsuario.id,
            rol_en_grupo: 'Invitado',
            alias_invitado: grupoEncontrado.etiqueta_invitados || null,
            codigo_usado: codigoLimpio
          }
        ]);

      setMensaje(`¡Registro exitoso en el grupo "${grupoEncontrado.nombre_grupo}"! Iniciando sesión...`);
      setTimeout(() => {
        onRegistroExitoso(nuevoUsuario);
      }, 1500);

    } catch (err) {
      setMensaje('Error al registrar Invitado: ' + err.message);
      setCargando(false);
    }
  };

  // PANTALLA 1: Selección de Tipo de Perfil (Anfitrión vs Invitado)
  if (!tipoSeleccionado) {
    return (
      <div style={estilos.contenedor}>
        <div style={estilos.tarjeta}>
          <h2 style={estilos.subtitulo}>Bienvenido a</h2>
          <h1 style={estilos.tituloLogo}>Agendando</h1>
          <p style={estilos.instruccionSeleccion}>¿Cómo deseas registrarte en la plataforma?</p>

          <div style={estilos.contenedorOpciones}>
            <div 
              style={estilos.tarjetaOpcion} 
              onClick={() => setTipoSeleccionado('ANFITRION')}
            >
              <h3 style={estilos.tituloOpcion}>👑 Anfitrión</h3>
              <p style={estilos.textoOpcion}>Crea tus propios grupos, genera códigos de invitación y programa sesiones.</p>
            </div>

            <div 
              style={estilos.tarjetaOpcion} 
              onClick={() => setTipoSeleccionado('INVITADO')}
            >
              <h3 style={estilos.tituloOpcion}>🤝 Invitado</h3>
              <p style={estilos.textoOpcion}>Tengo un código de 7 caracteres proporcionado por un anfitrión para unirme a su grupo.</p>
            </div>
          </div>

          <button type="button" onClick={onVolverLogin} style={estilos.botonSecundario}>
            ← Volver al inicio de sesión
          </button>
        </div>
      </div>
    );
  }

  // PANTALLA 2: Formulario de Registro con validación previa de duplicados
  return (
    <div style={estilos.contenedor}>
      <div style={estilos.tarjeta}>
        <button 
          onClick={() => { setTipoSeleccionado(null); setMensaje(''); }} 
          style={styleBtnVolverSeleccion}
        >
          ← Cambiar tipo de cuenta ({tipoSeleccionado === 'ANFITRION' ? 'Anfitrión' : 'Invitado'})
        </button>

        <h2 style={estilos.subtitulo}>Registro de</h2>
        <h1 style={estilos.tituloLogo}>{tipoSeleccionado === 'ANFITRION' ? 'Anfitrión' : 'Invitado'}</h1>

        <form onSubmit={verificarUsuarioExistente} style={estilos.formulario}>
          
          <div style={estilos.grupoInput}>
            <label style={estilos.etiqueta}>Nombre Completo</label>
            <input 
              type="text" 
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
              placeholder="Ej. Juan Pérez Gómez"
              style={estilos.input}
              required 
            />
          </div>

          <div style={estilos.fila}>
            <div style={estilos.grupoInput}>
              <label style={estilos.etiqueta}>DNI</label>
              <input 
                type="text" 
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                placeholder="Nro. de documento"
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
                placeholder="Ej. 999888777"
                style={estilos.input}
                required 
              />
            </div>
          </div>

          {/* Si es invitado, mostramos el campo obligatorio de código de 7 caracteres */}
          {tipoSeleccionado === 'INVITADO' && (
            <div style={estilos.grupoInput}>
              <label style={estilos.etiqueta}>Código de Invitación (7 Caracteres)</label>
              <input 
                type="text" 
                value={codigoInvitacion}
                onChange={(e) => setCodigoInvitacion(e.target.value)}
                placeholder="Ej. VBETKTT"
                maxLength={7}
                style={{ ...estilos.input, textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px', borderColor: '#00A89F' }}
                required 
              />
              <span style={estilos.ayudaInput}>Proporcionado por tu anfitrión.</span>
            </div>
          )}

          <div style={estilos.fila}>
            <div style={estilos.grupoInput}>
              <label style={estilos.etiqueta}>Nombre de Usuario</label>
              <input 
                type="text" 
                value={nombreUsuario}
                onChange={(e) => setNombreUsuario(e.target.value)}
                placeholder="Ej. jperez"
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

          {/* Campos Opcionales */}
          <div style={estilos.fila}>
            <div style={estilos.grupoInput}>
              <label style={estilos.etiqueta}>Rubro o Sector <span style={estilos.opcional}>(Opcional)</span></label>
              <input 
                type="text" 
                value={rubro}
                onChange={(e) => setRubro(e.target.value)}
                placeholder="Ej. Consultoría, Tecnología"
                style={estilos.input}
              />
            </div>
            <div style={estilos.grupoInput}>
              <label style={estilos.etiqueta}>Temas de Interés <span style={estilos.opcional}>(Opcional)</span></label>
              <input 
                type="text" 
                value={temasInteres}
                onChange={(e) => setTemasInteres(e.target.value)}
                placeholder="Ej. Innovación, Liderazgo"
                style={estilos.input}
              />
            </div>
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
            {cargando ? 'Verificando...' : 'Completar Registro'}
          </button>

        </form>
      </div>
    </div>
  );
}

const styleBtnVolverSeleccion = {
  background: 'none',
  border: 'none',
  color: '#00A89F',
  fontSize: '0.8rem',
  cursor: 'pointer',
  marginBottom: '10px',
  textAlign: 'left',
  width: '100%',
  fontWeight: 'bold'
};

const estilos = {
  contenedor: { display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#EBF5F7', fontFamily: 'sans-serif', padding: '20px' },
  tarjeta: { backgroundColor: '#FFFFFF', padding: '30px 40px', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0, 168, 159, 0.08)', width: '100%', maxWidth: '480px', textAlign: 'center' },
  subtitulo: { fontSize: '0.95rem', color: '#666666', fontWeight: 'normal', marginBottom: '2px' },
  tituloLogo: { fontSize: '2.2rem', fontWeight: 'bold', margin: '0 0 15px 0', background: 'linear-gradient(90deg, #00A89F 0%, #88D84D 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  instruccionSeleccion: { fontSize: '0.9rem', color: '#444', marginBottom: '20px' },
  contenedorOpciones: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' },
  tarjetaOpcion: { padding: '15px', borderRadius: '8px', border: '2px solid #E0E0E0', backgroundColor: '#FAFAFA', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease' },
  tituloOpcion: { fontSize: '1rem', color: '#00796B', margin: '0 0 5px 0' },
  textoOpcion: { fontSize: '0.75rem', color: '#666', margin: 0, lineHeight: '1.3' },
  formulario: { display: 'flex', flexDirection: 'column', gap: '12px' },
  fila: { display: 'flex', gap: '12px' },
  grupoInput: { flex: 1, display: 'flex', flexDirection: 'column', textAlign: 'left' },
  etiqueta: { fontSize: '0.85rem', marginBottom: '5px', color: '#444444', fontWeight: '500' },
  opcional: { fontSize: '0.75rem', color: '#888888', fontWeight: 'normal' },
  input: { padding: '9px', borderRadius: '6px', border: '1px solid #CCCCCC', backgroundColor: '#FAFAFA', color: '#333333', fontSize: '0.9rem', outline: 'none' },
  ayudaInput: { fontSize: '0.7rem', color: '#00A89F', marginTop: '3px' },
  grupoCheckbox: { display: 'flex', alignItems: 'flex-start', gap: '8px', textAlign: 'left', marginTop: '3px' },
  checkbox: { cursor: 'pointer', width: '16px', height: '16px', marginTop: '2px' },
  etiquetaCheckbox: { fontSize: '0.80rem', color: '#666666', cursor: 'pointer', lineHeight: '1.2' },
  mensaje: { fontSize: '0.85rem', color: '#D32F2F', fontWeight: '500', margin: '0', lineHeight: '1.4', padding: '5px', backgroundColor: '#FFEBEE', borderRadius: '4px' },
  boton: { padding: '11px', borderRadius: '6px', border: 'none', background: 'linear-gradient(90deg, #00A89F 0%, #88D84D 100%)', color: '#FFFFFF', fontSize: '0.95rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '3px' },
  botonSecundario: { background: 'none', border: 'none', color: '#00A89F', fontSize: '0.85rem', cursor: 'pointer', marginTop: '10px', textDecoration: 'underline' }
};
