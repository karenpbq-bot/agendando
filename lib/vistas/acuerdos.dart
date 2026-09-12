import 'package:flutter/material.dart';

class AcuerdosVista extends StatelessWidget {
  const AcuerdosVista({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[100],
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFF1E3A8A), Colors.blue]),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Column(
              children: [
                Text('Siguiente Nivel en 50 XP', style: TextStyle(color: Colors.white70)),
                SizedBox(height: 8),
                LinearProgressIndicator(value: 0.75, backgroundColor: Colors.white24, color: Colors.white),
              ],
            ),
          ),
          const SizedBox(height: 24),
          const Text('Acuerdos Pendientes', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          _AcuerdoItem(tarea: 'Enviar reporte financiero', puntos: '+20 XP', vencimiento: 'Hoy'),
          _AcuerdoItem(tarea: 'Llamar a proveedor de madera', puntos: '+10 XP', vencimiento: 'Mañana'),
        ],
      ),
    );
  }
}

class _AcuerdoItem extends StatelessWidget {
  final String tarea;
  final String puntos;
  final String vencimiento;

  const _AcuerdoItem({required this.tarea, required this.puntos, required this.vencimiento});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: CheckboxListTile(
        value: false,
        onChanged: (bool? value) {},
        title: Text(tarea, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text('Vence: $vencimiento', style: const TextStyle(color: Colors.redAccent)),
        secondary: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(color: Colors.orange.withOpacity(0.2), borderRadius: BorderRadius.circular(20)),
          child: Text(puntos, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.orange)),
        ),
      ),
    );
  }
}
