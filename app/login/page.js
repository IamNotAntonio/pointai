'use client'
import { useState } from 'react'
import { getSupabaseBrowser } from '../lib/supabase-browser'

function IcGoogle() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [erro,    setErro]    = useState(null)

  async function handleGoogle() {
    setLoading(true)
    setErro(null)
    try {
      const supabase = getSupabaseBrowser()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (e) {
      setErro('Não foi possível iniciar o login. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
      {/* Subtle background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-green-950/25 via-transparent to-transparent pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <p className="text-3xl font-bold text-white tracking-tight">Point.AI</p>
          <div className="w-8 h-0.5 bg-green-500 mx-auto mt-2 rounded-full" />
        </div>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl shadow-black/60">
          <h1 className="text-xl font-semibold text-white text-center mb-1.5">Bem-vindo de volta</h1>
          <p className="text-sm text-zinc-400 text-center mb-7">
            Sua conta acadêmica, seu progresso salvo
          </p>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-800 text-sm font-semibold py-3 px-4 rounded-xl transition-all duration-150 hover:-translate-y-0.5 active:scale-[.98] disabled:opacity-60 disabled:cursor-not-allowed border-0 cursor-pointer shadow-sm"
          >
            <IcGoogle />
            {loading ? 'Redirecionando…' : 'Entrar com Google'}
          </button>

          {erro && (
            <p className="mt-3 text-xs text-red-400 text-center">{erro}</p>
          )}

          <p className="text-xs text-zinc-600 text-center mt-6 leading-relaxed">
            Ao entrar, você concorda com os nossos{' '}
            <span className="text-zinc-500 underline underline-offset-2 cursor-pointer">termos de uso</span>
            {' '}e{' '}
            <span className="text-zinc-500 underline underline-offset-2 cursor-pointer">política de privacidade</span>
          </p>
        </div>

        {/* Feature chips */}
        <div className="mt-6 flex justify-center gap-5 flex-wrap">
          {[
            'Chat por matéria',
            'Notas e calendário',
            'IA personalizada',
          ].map(f => (
            <span key={f} className="text-xs text-zinc-600 flex items-center gap-1">
              <span className="text-green-600">✓</span> {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
