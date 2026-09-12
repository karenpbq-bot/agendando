import 'package:flutter/material.dart';
import 'core/conexion.dart'; 

// 1. Punto de arranque de la aplicación
void main() async {
  // Garantiza que el motor gráfico esté listo antes de conectar a la base de datos
  WidgetsFlutterBinding.ensureInitialized();
  
  // Activa el puente de conexión hacia tu proyecto de Supabase
  await Conexion.inicializar();

  runApp(const AgendandoApp());
}

// 2. Estructura principal e inyección del diseño base
class AgendandoApp extends StatelessWidget {
  const AgendandoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Agendando',
      debugShowCheckedModeBanner: false, 
      theme: ThemeData(
        primaryColor: const Color(0xFF1E3A8A), 
        useMaterial3: true,
      ),
      home: const Scaffold(
        body: Center(
          child: Text(
            '🚀 Motor y Base de Datos Conectados',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
          ),
        ),
      ),
    );
  }
}
