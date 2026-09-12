import 'package:flutter/material.dart';

// 1. Punto de arranque de la aplicación
void main() {
  runApp(const AgendandoApp());
}

// 2. Estructura principal e inyección del diseño base
class AgendandoApp extends StatelessWidget {
  const AgendandoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Agendando',
      debugShowCheckedModeBanner: false, // Oculta la etiqueta de desarrollo
      theme: ThemeData(
        primaryColor: const Color(0xFF1E3A8A), 
        useMaterial3: true,
      ),
      home: const Scaffold(
        body: Center(
          child: Text(
            '🚀 Motor de Agendando Iniciado',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
          ),
        ),
      ),
    );
  }
}
