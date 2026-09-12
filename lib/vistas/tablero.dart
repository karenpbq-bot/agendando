import 'package:flutter/material.dart';
import 'calendario.dart';
import 'acuerdos.dart';

class TableroVista extends StatefulWidget {
  const TableroVista({super.key});

  @override
  State<TableroVista> createState() => _TableroVistaState();
}

class _TableroVistaState extends State<TableroVista> {
  int _indiceActual = 0;

  // Lista de las pantallas a mostrar según la pestaña seleccionada
  final List<Widget> _pantallas = [
    const _InicioVista(), // Lo que antes estaba directo en el body
    const CalendarioVista(),
    const AcuerdosVista(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Agendando', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF1E3A8A),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: _pantallas[_indiceActual], // Muestra la pantalla correspondiente
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _indiceActual,
        selectedItemColor: const Color(0xFF1E3A8A),
        unselectedItemColor: Colors.grey,
        onTap: (index) {
          setState(() {
            _indiceActual = index;
          });
        },
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Inicio'),
          BottomNavigationBarItem(icon: Icon(Icons.calendar_month), label: 'Calendario'),
          BottomNavigationBarItem(icon: Icon(Icons.handshake), label: 'Acuerdos'),
        ],
      ),
    );
  }
}

// Extraemos el diseño del inicio a un widget independiente para mantener el orden
class _InicioVista extends StatelessWidget {
  const _InicioVista();

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Hola, Bienvenido', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                Column(
                  children: [
                    const Icon(Icons.star_rounded, color: Colors.orange, size: 32),
                    const SizedBox(height: 8),
                    const Text('150 XP', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    const Text('Acumulado', style: TextStyle(color: Colors.grey)),
                  ],
                ),
                Column(
                  children: [
                    const Icon(Icons.local_fire_department, color: Colors.red, size: 32),
                    const SizedBox(height: 8),
                    const Text('3', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    const Text('Racha Actual', style: TextStyle(color: Colors.grey)),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
