import 'package:supabase_flutter/supabase_flutter.dart';

class ControladorAgenda {
  final _cliente = Supabase.instance.client;

  // 1. Función para LEER las citas (ya existía)
  Future<List<Map<String, dynamic>>> obtenerProximasCitas() async {
    final usuarioId = _cliente.auth.currentUser?.id;
    if (usuarioId == null) return [];

    try {
      final respuesta = await _cliente
          .from('agd_reuniones')
          .select('''
            id,
            tipo,
            fecha_hora,
            estado,
            agd_grupos(nombre)
          ''')
          .eq('estado', 'Programada')
          .or('chair_id.eq.$usuarioId,empresario_id.eq.$usuarioId')
          .order('fecha_hora', ascending: true)
          .limit(5);

      return List<Map<String, dynamic>>.from(respuesta);
    } catch (e) {
      print('Error al obtener citas: $e');
      return [];
    }
  }

  // 2. NUEVA Función para GUARDAR una cita en Supabase
  Future<bool> crearReunion(String tipo, DateTime fechaHora) async {
    // Captura quién es el usuario (Chair) que está creando la cita
    final usuarioId = _cliente.auth.currentUser?.id;
    
    if (usuarioId == null) return false;

    try {
      await _cliente.from('agd_reuniones').insert({
        'tipo': tipo,
        'fecha_hora': fechaHora.toIso8601String(), // Formato estándar de base de datos
        'estado': 'Programada',
        'chair_id': usuarioId, 
      });
      return true; // Se guardó con éxito
    } catch (e) {
      print('Error al insertar cita: $e');
      return false; // Hubo un error
    }
  }
}
