import 'package:supabase_flutter/supabase_flutter.dart';

class Conexion {
  // Método principal para inicializar el puente con la base de datos
  static Future<void> inicializar() async {
    await Supabase.initialize(
      url: 'https://hnwjjzpgguzysvapdfbm.supabase.co'
      anonKey: 'sb_publishable_61CzW1YSHXBrnPCnF_Najg_vk6r3geu',
    );
  }

  // Instancia global para leer y escribir en las tablas (ej. agd_usuarios) desde cualquier archivo
  static final SupabaseClient cliente = Supabase.instance.client;
}
