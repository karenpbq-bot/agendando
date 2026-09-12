import 'package:flutter/material.dart';

class TableroVista extends StatefulWidget {
  const TableroVista({super.key});

  @override
  State<TableroVista> createState() => _TableroVistaState();
}

class _TableroVistaState extends State<TableroVista> {
  int _indiceActual = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[100],
      appBar: AppBar(
        title: const Text('Mi Agenda', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF1E3A8A),
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_none),
            onPressed: () {}, // Futuro panel de notificaciones
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Saludo y Gamificación
            const Text(
              'Hola, Bienvenido',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10),
                ],
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _Metrica(icono: Icons.star_rounded, valor: '150 XP', etiqueta: 'Acumulado', color: Colors.orange),
                  _Metrica(icono: Icons.local_fire_department, valor: '3', etiqueta: 'Racha Actual', color: Colors.red),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // 2. Sección de Próximas Citas
            const Text(
              'Próximas Citas',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            _TarjetaResumen(
              titulo: 'Reunión Grupal - Sinergia',
              subtitulo: 'Mañana, 10:00 AM',
              icono: Icons.groups,
              colorIcono: Colors.blue,
            ),
            const SizedBox(height: 12),
            _TarjetaResumen(
              titulo: 'Revisión Individual (Juan P.)',
              subtitulo: 'Jueves 17, 04:00 PM',
              icono: Icons.person,
              colorIcono: Colors.green,
            ),
          ],
        ),
      ),
      // 3. Barra de Navegación Modular
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

// Widgets de apoyo para mantener el código principal limpio
class _Metrica extends StatelessWidget {
  final IconData icono;
  final String valor;
  final String etiqueta;
  final Color color;

  const _Metrica({required this.icono, required this.valor, required this.etiqueta, required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icono, color: color, size: 32),
        const SizedBox(height: 8),
        Text(valor, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        Text(etiqueta, style: const TextStyle(color: Colors.grey)),
      ],
    );
  }
}

class _TarjetaResumen extends StatelessWidget {
  final String titulo;
  final String subtitulo;
  final IconData icono;
  final Color colorIcono;

  const _TarjetaResumen({required this.titulo, required this.subtitulo, required this.icono, required this.colorIcono});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      color: Colors.white,
      shape: RoundedRectangleBorder(
        side: BorderSide(color: Colors.grey.shade200),
        borderRadius: BorderRadius.circular(12),
      ),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: colorIcono.withOpacity(0.1),
          child: Icon(icono, color: colorIcono),
        ),
        title: Text(titulo, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(subtitulo),
        trailing: const Icon(Icons.chevron_right),
        onTap: () {}, // Navegación al detalle de la cita
      ),
    );
  }
}
