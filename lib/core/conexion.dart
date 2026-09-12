import 'package:supabase_flutter/supabase_flutter.dart';

class Conexion {
  // Método principal para inicializar el puente con la base de datos
  static Future<void> inicializar() async {
    await Supabase.initialize(
      url: 'AQUI_TU_URL_DE_SUPABASE',
      anonKey: 'AQUI_TU_ANON_KEY_DE_SUPABASE',
    );
  }

  // Instancia global para leer y escribir en las tablas (ej. agd_usuarios) desde cualquier archivo
  static final SupabaseClient cliente = Supabase.instance.client;
}
