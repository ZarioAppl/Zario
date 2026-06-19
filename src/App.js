import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import ZarioApp from './ZarioApp'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{
      minHeight: '100vh',
      background: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      fontFamily: 'sans-serif'
    }}>
      <div style={{
        width: 70,
        height: 70,
        background: 'linear-gradient(135deg, #06B6D4, #0284C7)',
        borderRadius: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 8px 32px rgba(6,182,212,0.35)',
        animation: 'pulse 1.5s infinite'
      }}>
        <span style={{ fontSize: 36, fontWeight: 800, color: 'white' }}>Z</span>
      </div>
      <div style={{ color: '#06B6D4', fontSize: 15, fontWeight: 600 }}>Cargando Zario...</div>
      <style>{`@keyframes pulse{0%,100%{transform:scale(1);}50%{transform:scale(1.05);}}`}</style>
    </div>
  )

  return <ZarioApp supabase={supabase} initialSession={session} />
}
