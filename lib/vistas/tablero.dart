import 'package:flutter/material.dart';
import 'calendario.dart';
import 'acuerdos.dart';
import '../controladores/ctrl_agenda.dart';

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
class _InicioVista extends StatefulWidget {
  const _InicioVista();

  @override
  State<_InicioVista> createState() => _InicioVistaState();
}

class _InicioVistaState extends State<_InicioVista> {
  // Instanciamos el controlador que lee tu base de datos SIG
  final ControladorAgenda _ctrlAgenda = ControladorAgenda();

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Hola, Bienvenido', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          // 1. Tarjeta de Gamificación
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
          const SizedBox(height: 24),
          const Text('Próximas Citas', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          
          // 2. Lector Dinámico de Citas desde Supabase
          FutureBuilder<List<Map<String, dynamic>>>(
            future: _ctrlAgenda.obtenerProximasCitas(),
            builder: (context, snapshot) {
              // Mientras carga la información
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }
              // Si ocurre un error de conexión
              if (snapshot.hasError) {
                return Text('Error al cargar citas: ${snapshot.error}');
              }
              
              final citas = snapshot.data ?? [];
              
              // Si la tabla está vacía para este usuario
              if (citas.isEmpty) {
                return const Padding(
                  padding: EdgeInsets.all(16.0),
                  child: Text('No tienes citas programadas.', style: TextStyle(color: Colors.grey)),
                );
              }

              // Genera una tarjeta por cada cita encontrada en la base de datos
              return Column(
                children: citas.map((cita) {
                  final esGrupal = cita['tipo'] == 'Grupal';
                  // Lee el nombre del grupo si es grupal, sino indica que es individual
                  final nombreGrupo = cita['agd_grupos']?['nombre'] ?? 'Sin grupo';
                  final titulo = esGrupal ? 'Reunión Grupal - $nombreGrupo' : 'Revisión Individual';
                  
                  // Formato de fecha simplificado
                  final fechaHora = DateTime.parse(cita['fecha_hora']);
                  final fechaStr = '${fechaHora.day}/${fechaHora.month}/${fechaHora.year} - ${fechaHora.hour}:${fechaHora.minute.toString().padLeft(2, '0')}';

                  return Card(
                    elevation: 0,
                    margin: const EdgeInsets.only(bottom: 12),
                    shape: RoundedRectangleBorder(
                      side: BorderSide(color: Colors.grey.shade200),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: (esGrupal ? Colors.blue : Colors.green).withOpacity(0.1),
                        child: Icon(esGrupal ? Icons.groups : Icons.person, color: esGrupal ? Colors.blue : Colors.green),
                      ),
                      title: Text(titulo, style: const TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: Text(fechaStr),
                      trailing: const Icon(Icons.chevron_right),
                    ),
                  );
                }).toList(),
              );
            },
          ),
        ],
      ),
    );
  }
}
