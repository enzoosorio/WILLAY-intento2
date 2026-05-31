import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
// Importamos tu wrapper tipado exactamente desde la ruta de tu proyecto
import { classifyText } from '../lib/functions';

export default function PruebaIAScreen() {
  const [texto, setTexto] = useState('');
  const [resultado, setResultado] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const analizarReporte = async () => {
    if (!texto) return;
    
    try {
      setCargando(true);
      setResultado(null);
      
      // 1. Inicializamos tu función tipada
      const callClassifyText = classifyText(); 
      
      // 2. Enviamos el texto al backend (Firebase)
      const respuesta = await callClassifyText({ text: texto }); 
      
      // 3. Mostramos la respuesta de la IA en pantalla
      const info = `Prioridad: ${respuesta.data.priority}\nRazón: ${respuesta.data.reason}\nGemini Activo: ${respuesta.data.usedGemini ? 'Sí' : 'No'}`;
      setResultado(info);
      
    } catch (error) {
      console.error("Error en la llamada a la IA:", error);
      setResultado('Hubo un error al conectar con el servidor. Revisa la consola.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Analizador WILLAY</Text>
      
      <TextInput 
        style={styles.input}
        placeholder="Ej: Hay un incendio fuerte cerca del parque principal..."
        value={texto}
        onChangeText={setTexto}
        multiline
      />
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={analizarReporte}
        disabled={cargando}
      >
        <Text style={styles.buttonText}>
          {cargando ? 'Analizando con IA...' : 'Analizar Reporte'}
        </Text>
      </TouchableOpacity>

      {cargando && <ActivityIndicator size="large" color="#007BFF" style={{ marginTop: 20 }} />}

      {resultado && (
        <View style={styles.resultBox}>
          <Text style={styles.resultText}>{resultado}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    justifyContent: 'center', 
    backgroundColor: '#f5f5f5' 
  },
  title: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    marginBottom: 20, 
    textAlign: 'center',
    color: '#333'
  },
  input: { 
    backgroundColor: '#fff', 
    borderWidth: 1, 
    borderColor: '#ccc', 
    padding: 15, 
    borderRadius: 8, 
    marginBottom: 20, 
    minHeight: 120, 
    textAlignVertical: 'top',
    fontSize: 16
  },
  button: { 
    backgroundColor: '#007BFF', 
    padding: 15, 
    borderRadius: 8, 
    alignItems: 'center' 
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
  resultBox: { 
    marginTop: 30, 
    padding: 15, 
    backgroundColor: '#e8f4f8', 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: '#b6d4fe' 
  },
  resultText: { 
    fontSize: 16, 
    color: '#004085',
    lineHeight: 24
  }
});