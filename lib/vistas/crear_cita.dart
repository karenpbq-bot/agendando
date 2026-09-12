import 'package:flutter/material.dart';
import '../controladores/ctrl_agenda.dart';

class CrearCitaVista extends StatefulWidget {
  const CrearCitaVista({super.key});

  @override
  State<CrearCitaVista> createState() => _CrearCitaVistaState();
}

class _CrearCitaVistaState extends State<CrearCitaVista> {
  String _tipoSeleccionado = 'Individual';
  final TextEditingController _fechaController = TextEditingController();
  final TextEditingController _horaController = TextEditingController();
  
  // Instancia del controlador y variable de estado agregadas aquí
  final ControladorAgenda _ctrlAgenda = ControladorAgenda();
  bool _guardando = false;

  @override
  void dispose() {
    _fechaController.dispose();
    _horaController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Nueva Reunión', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF1E3A8A),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Selector de Tipo de Reunión
            const Text('Tipo de Reunión', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              value: _tipoSeleccionado,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.category_outlined),
              ),
              items: ['Individual', 'Grupal'].map((String valor) {
                return DropdownMenuItem<String>(
                  value: valor,
                  child: Text(valor),
                );
              }).toList(),
              onChanged: (String? nuevoValor) {
                setState(() {
                  _tipoSeleccionado = nuevoValor!;
                });
              },
            ),
            const SizedBox(height: 24),
            
            // 2. Selectores de Fecha y Hora
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _fechaController,
                    decoration: const InputDecoration(
                      labelText: 'Fecha',
                      prefixIcon: Icon(Icons.calendar_today),
                      border: OutlineInputBorder(),
                    ),
                    readOnly: true,
                    onTap: () async {
                      // Aquí se activará el calendario nativo del celular
                      _fechaController.text = '15/10/2026'; // Dato simulado por ahora
                    },
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: TextField(
                    controller: _horaController,
                    decoration: const InputDecoration(
                      labelText: 'Hora',
                      prefixIcon: Icon(Icons.access_time),
                      border: OutlineInputBorder(),
                    ),
                    readOnly: true,
                    onTap: () async {
                      // Aquí se activará el reloj nativo del celular
                      _horaController.text = '10:00 AM'; // Dato simulado por ahora
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 40),
            
            // 3. Botón para Guardar en Supabase
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF1E3A8A),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                onPressed: _guardando ? null : () async {
                  setState(() => _guardando = true);
                  
                  // Por ahora usamos una fecha estática para probar la inserción en la base de datos
                  // Más adelante conectaremos esto a los selectores nativos del celular
                  DateTime fechaPrueba = DateTime.now().add(const Duration(days: 1));
                  
                  bool exito = await _ctrlAgenda.crearReunion(_tipoSeleccionado, fechaPrueba);
                  
                  if (mounted) {
                    setState(() => _guardando = false);
                    if (exito) {
                      Navigator.pop(context); // Cierra el formulario si fue exitoso
                    } else {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Error al agendar la cita'), backgroundColor: Colors.red),
                      );
                    }
                  }
                },
                child: _guardando 
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('Agendar Reunión', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
