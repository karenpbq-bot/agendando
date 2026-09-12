import 'package:flutter/material.dart';
import 'core/conexion.dart';
import 'vistas/login.dart'; // Importamos la nueva vista

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Conexion.inicializar();
  runApp(const AgendandoApp());
}

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
      home: const LoginVista(), // Apuntamos la ruta de inicio al Login
    );
  }
}
