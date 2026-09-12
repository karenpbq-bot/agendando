import 'package:flutter/material.dart';

class CalendarioVista extends StatelessWidget {
  const CalendarioVista({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[100],
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          const Text(
            'Reuniones de Octubre',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          _CitaDetalle(
            dia: '15',
            mes: 'OCT',
            titulo: 'Reunión Grupal - Sinergia',
            hora: '10:00 AM - 12:00 PM',
            color: Colors.blue,
          ),
          const SizedBox(height: 12),
          _CitaDetalle(
            dia: '17',
            mes: 'OCT',
            titulo: 'Revisión Individual (Juan P.)',
            hora: '04:00 PM - 05:00 PM',
            color: Colors.green,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {},
        backgroundColor: const Color(0xFF1E3A8A),
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('Agendar'),
      ),
    );
  }
}

class _CitaDetalle extends StatelessWidget {
  final String dia;
  final String mes;
  final String titulo;
  final String hora;
  final Color color;

  const _CitaDetalle({
    required this.dia,
    required this.mes,
    required this.titulo,
    required this.hora,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                children: [
                  Text(dia, style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color)),
                  Text(mes, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: color)),
                ],
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(titulo, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.access_time, size: 14, color: Colors.grey),
                      const SizedBox(width: 4),
                      Text(hora, style: const TextStyle(color: Colors.grey, fontSize: 14)),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
