import 'package:supabase_flutter/supabase_flutter.dart';

class ControladorAgenda {
  final _cliente = Supabase.instance.client;

  Future<List<Map<String, dynamic>>> obtenerProximasCitas() async {
    // Captura el ID del usuario autenticado en el SIG
    final usuarioId = _cliente.auth.currentUser?.id;

    if (usuarioId == null) {
      return [];
    }

    try {
      // Consulta filtrada a las tablas agd_ del proyecto SIG
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
}
