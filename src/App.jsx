import React, { useState, useEffect } from 'react'

export default function App() {
  const [status, setStatus] = useState('Iniciando Agendando...')

  useEffect(() => {
    setStatus('Sistema listo para conectar a Supabase y gamificación.')
  }, [])

  return (
    <div style={{ fontFamily: 'sans-serif', textAlign: 'center', marginTop: '50px' }}>
      <h1>Agendando</h1>
      <p>{status}</p>
      <div style={{ marginTop: '20px', padding: '10px', background: '#f3f4f6', display: 'inline-block', borderRadius: '8px' }}>
        <span>🔥 Racha actual: 0 días | ⭐ Puntos XP: 0</span>
      </div>
    </div>
  )
}
