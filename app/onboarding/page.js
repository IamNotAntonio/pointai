'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { savePerfil, getUserId } from '../lib/db'
import { cursos } from '../lib/cursos'
import { universidades } from '../lib/universidades'
import AutocompleteInput from '../components/AutocompleteInput'
import { User, GraduationCap, Building2, Calendar, BookOpen, Zap, Target, TrendingUp, ClipboardList, Pencil, CheckCircle } from 'lucide-react'

const SEMESTRES = ['1º','2º','3º','4º','5º','6º','7º','8º','9º','10º']

const OBJETIVOS = [
  { id:'passar', label:'Passar em todas as matérias',           Icon: Target },
  { id:'media',  label:'Melhorar minha média geral',            Icon: TrendingUp },
  { id:'prova',  label:'Me preparar para uma prova específica', Icon: BookOpen },
  { id:'faltas', label:'Não reprovar por faltas',               Icon: ClipboardList },
  { id:'outro',  label:'Outro (digitar)',                       Icon: Pencil },
]

function getError(etapa, { nome, curso, universidade, semestre, materias, objetivo, outroTexto }) {
  if (etapa === 0) {
    if (!nome || nome.trim().length < 2) return 'Pelo menos 2 caracteres'
    if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(nome.trim())) return 'Use apenas letras e espaços'
    return null
  }
  if (etapa === 1) return (!curso || curso.trim().length < 3) ? 'Informe seu curso (mín. 3 letras)' : null
  if (etapa === 2) return (!universidade || universidade.trim().length < 2) ? 'Informe sua universidade' : null
  if (etapa === 3) return !semestre ? 'Selecione seu semestre' : null
  if (etapa === 4) return (!materias || materias.length === 0) ? 'Adicione ao menos uma matéria' : null
  if (etapa === 5) {
    if (!objetivo) return 'Escolha um objetivo'
    if (objetivo === 'outro' && (!outroTexto || outroTexto.trim().length < 3)) return 'Descreva seu objetivo'
    return null
  }
  return null
}

export default function Onboarding() {
  const router = useRouter()
  const [etapa,        setEtapa]        = useState(0)
  const [animKey,      setAnimKey]      = useState(0)
  const [dir,          setDir]          = useState(1)
  const [touched,      setTouched]      = useState(false)

  const [nome,         setNome]         = useState('')
  const [curso,        setCurso]        = useState('')
  const [universidade, setUniversidade] = useState('')
  const [semestre,     setSemestre]     = useState('')
  const [materias,     setMaterias]     = useState([])
  const [novaMateria,  setNovaMateria]  = useState('')
  const [objetivo,     setObjetivo]     = useState('')
  const [outroTexto,   setOutroTexto]   = useState('')

  const [sugestoes,    setSugestoes]    = useState([])
  const [loadingSubj,  setLoadingSubj]  = useState(false)

  const [saving,       setSaving]       = useState(false)
  const [done,         setDone]         = useState(false)

  const st  = { nome, curso, universidade, semestre, materias, objetivo, outroTexto }
  const err = getError(etapa, st)
  const ok  = err === null

  // When returning from Google OAuth (first-time user), recover localStorage profile and save to DB
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('from') !== 'callback') return
    try {
      const stored = localStorage.getItem('pointai_perfil')
      if (!stored) return
      const p = JSON.parse(stored)
      if (p?.nome) savePerfil(p).then(() => router.push('/dashboard'))
    } catch {}
  }, [])

  useEffect(() => {
    if (etapa !== 4) return
    setLoadingSubj(true)
    setSugestoes([])
    fetch('/api/sugestoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ curso, universidade, semestre }),
    })
      .then(r => r.json())
      .then(d => { setSugestoes(d.materias || []); setLoadingSubj(false) })
      .catch(() => setLoadingSubj(false))
  }, [etapa])

  function next() {
    if (saving) return
    if (!ok) { setTouched(true); return }
    if (etapa === 5) { finalize(); return }
    setDir(1)
    setAnimKey(k => k + 1)
    setTouched(false)
    setEtapa(e => e + 1)
  }

  function back() {
    if (etapa === 0 || saving) return
    setDir(-1)
    setAnimKey(k => k + 1)
    setTouched(false)
    setEtapa(e => e - 1)
  }

  async function finalize() {
    setSaving(true)
    const objLabel = objetivo === 'outro'
      ? outroTexto.trim()
      : OBJETIVOS.find(o => o.id === objetivo)?.label || objetivo
    getUserId()
    await savePerfil({
      nome: nome.trim(),
      curso: curso.trim(),
      universidade: universidade.trim(),
      semestre,
      materias: materias.join(', '),
      objetivo: objLabel,
    })
    setDone(true)
  }

  function addMateria(m) {
    const s = m.trim()
    if (!s || materias.some(x => x.toLowerCase() === s.toLowerCase())) return
    setMaterias(ms => [...ms, s])
  }
  function removeMateria(i) { setMaterias(ms => ms.filter((_, idx) => idx !== i)) }
  function acceptAll() { sugestoes.forEach(s => addMateria(s)); setSugestoes([]) }

  const progresso = Math.round((etapa / 5) * 100)
  const nome1     = nome.trim().split(' ')[0] || 'você'
  const objLabel  = objetivo === 'outro'
    ? outroTexto
    : OBJETIVOS.find(o => o.id === objetivo)?.label || ''

  if (done) {
    return (
      <>
        <style>{CSS}</style>
        <div className="ob">
          <div className="ob-grid" /><div className="ob-orb" />
          <main className="ob-main">
            <div className="ob-final">
              <div className="ob-confetti-row" aria-hidden>
                {[0,1,2,3,4].map(i => (
                  <span key={i} className="ob-confetti-piece" style={{ animationDelay: `${i * 90}ms`, color: '#22c55e' }}>
                    <CheckCircle size={22} strokeWidth={1.5} />
                  </span>
                ))}
              </div>
              <div className="ob-final-emoji">🎉</div>
              <h1 className="ob-final-h1">Tudo pronto, {nome1}!</h1>
              <p className="ob-final-p">Seu perfil foi criado. Veja o resumo:</p>
              <div className="ob-summary">
                {[
                  ['Nome',         nome.trim()],
                  ['Curso',        curso.trim()],
                  ['Universidade', universidade.trim()],
                  ['Semestre',     semestre],
                  ['Matérias',     materias.join(', ')],
                  ['Objetivo',     objLabel],
                ].map(([l, v]) => (
                  <div key={l} className="ob-sum-row">
                    <span className="ob-sum-lbl">{l}</span>
                    <span className="ob-sum-val">{v}</span>
                  </div>
                ))}
              </div>
              <button className="ob-final-btn" onClick={() => router.push('/login?novo=1')}>
                Entrar e salvar meus dados →
              </button>
            </div>
          </main>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="ob">
        <div className="ob-grid" /><div className="ob-orb" />

        <header className="ob-hdr">
          <span className="ob-logo">Point</span>
          <div className="ob-prog-area">
            <div className="ob-prog-track">
              <div className="ob-prog-fill" style={{ width: `${progresso}%` }} />
            </div>
            <span className="ob-prog-pct">{progresso}%</span>
          </div>
          <span className="ob-step-count">{etapa + 1} / 6</span>
        </header>

        <main className="ob-main">
          <div
            key={animKey}
            className="ob-card"
            style={{ animation: `${dir > 0 ? 'obSlideIn' : 'obSlideBack'} .38s cubic-bezier(.16,1,.3,1) both` }}
          >
            {/* ── 0: Nome ── */}
            {etapa === 0 && (<>
              <div className="ob-step-em"><User size={40} strokeWidth={1.3} style={{ color: '#22c55e' }} /></div>
              <h2 className="ob-title">Qual é o seu nome?</h2>
              <p className="ob-sub">Vou te chamar assim durante toda a experiência.</p>
              <div className={`ob-field${touched && err ? ' ob-field--err' : nome.trim().length >= 2 ? ' ob-field--ok' : ''}`}>
                <input
                  autoFocus
                  className="ob-inp"
                  placeholder="Seu nome completo…"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && next()}
                  maxLength={60}
                />
                {nome.trim().length >= 2 && <span className="ob-check">✓</span>}
              </div>
              {touched && err && <p className="ob-err">{err}</p>}
            </>)}

            {/* ── 1: Curso ── */}
            {etapa === 1 && (<>
              <div className="ob-step-em"><GraduationCap size={40} strokeWidth={1.3} style={{ color: '#22c55e' }} /></div>
              <h2 className="ob-title">Qual curso você faz, {nome1}?</h2>
              <p className="ob-sub">Digite ou escolha da lista. Aceitamos qualquer curso.</p>
              <AutocompleteInput
                data={cursos}
                value={curso}
                onChange={setCurso}
                onSubmit={next}
                placeholder="Ex: Medicina, Engenharia Civil, Ciência de Dados…"
                autoFocus
              />
              {touched && err && <p className="ob-err">{err}</p>}
            </>)}

            {/* ── 2: Universidade ── */}
            {etapa === 2 && (<>
              <div className="ob-step-em"><Building2 size={40} strokeWidth={1.3} style={{ color: '#22c55e' }} /></div>
              <h2 className="ob-title">Em qual universidade você estuda?</h2>
              <p className="ob-sub">Digite o nome ou a sigla. Aceitamos qualquer instituição.</p>
              <AutocompleteInput
                data={universidades}
                value={universidade}
                onChange={setUniversidade}
                onSubmit={next}
                placeholder="Ex: USP, ESPM, FCMSCSP, PUC-SP…"
                autoFocus
              />
              {touched && err && <p className="ob-err">{err}</p>}
            </>)}

            {/* ── 3: Semestre ── */}
            {etapa === 3 && (<>
              <div className="ob-step-em"><Calendar size={40} strokeWidth={1.3} style={{ color: '#22c55e' }} /></div>
              <h2 className="ob-title">Em qual semestre você está?</h2>
              <p className="ob-sub">Isso ajuda a sugerir as matérias certas para você.</p>
              <div className="ob-sem-grid">
                {SEMESTRES.map((s, i) => {
                  const val = `${i + 1}º semestre`
                  return (
                    <button
                      key={s}
                      className={`ob-sem-btn${semestre === val ? ' ob-sem-btn--sel' : ''}`}
                      onClick={() => setSemestre(val)}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
              {touched && err && <p className="ob-err">{err}</p>}
            </>)}

            {/* ── 4: Matérias ── */}
            {etapa === 4 && (<>
              <div className="ob-step-em"><BookOpen size={40} strokeWidth={1.3} style={{ color: '#22c55e' }} /></div>
              <h2 className="ob-title">Quais matérias você tem esse semestre?</h2>
              <p className="ob-sub">Aceite as sugestões ou adicione manualmente.</p>

              {loadingSubj && (
                <p className="ob-sugg-loading">Buscando matérias de {curso}…</p>
              )}
              {!loadingSubj && sugestoes.length > 0 && (
                <div className="ob-sugg-area">
                  <div className="ob-sugg-chips">
                    {sugestoes.map(s => (
                      <button key={s} className="ob-chip-sg"
                        onClick={() => { addMateria(s); setSugestoes(ss => ss.filter(x => x !== s)) }}>
                        + {s}
                      </button>
                    ))}
                  </div>
                  <button className="ob-accept-all" onClick={acceptAll}>+ Aceitar todas</button>
                </div>
              )}

              {materias.length > 0 && (
                <div className="ob-added">
                  {materias.map((m, i) => (
                    <span key={i} className="ob-chip-ok">
                      {m}
                      <button className="ob-chip-x" onClick={() => removeMateria(i)}>×</button>
                    </span>
                  ))}
                </div>
              )}

              <div className="ob-mat-row">
                <input
                  autoFocus
                  className="ob-inp-mat"
                  placeholder="Adicionar matéria e pressionar Enter…"
                  value={novaMateria}
                  onChange={e => setNovaMateria(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (novaMateria.trim()) { addMateria(novaMateria); setNovaMateria('') }
                    }
                  }}
                />
                <button
                  className="ob-mat-add"
                  disabled={!novaMateria.trim()}
                  onClick={() => { addMateria(novaMateria); setNovaMateria('') }}
                >+</button>
              </div>
              {touched && err && <p className="ob-err">{err}</p>}
            </>)}

            {/* ── 5: Objetivo ── */}
            {etapa === 5 && (<>
              <div className="ob-step-em"><Zap size={40} strokeWidth={1.3} style={{ color: '#22c55e' }} /></div>
              <h2 className="ob-title">Qual é o seu principal objetivo?</h2>
              <p className="ob-sub">Isso personaliza como o Point AI vai te ajudar.</p>
              <div className="ob-obj-list">
                {OBJETIVOS.map(o => (
                  <button
                    key={o.id}
                    className={`ob-obj-btn${objetivo === o.id ? ' ob-obj-btn--sel' : ''}`}
                    onClick={() => setObjetivo(o.id)}
                  >
                    <span className="ob-obj-ico"><o.Icon size={18} strokeWidth={1.5} /></span>
                    <span>{o.label}</span>
                    {objetivo === o.id && <span className="ob-obj-check">✓</span>}
                  </button>
                ))}
              </div>
              {objetivo === 'outro' && (
                <input
                  autoFocus
                  className="ob-outro"
                  placeholder="Descreva seu objetivo…"
                  value={outroTexto}
                  onChange={e => setOutroTexto(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && next()}
                />
              )}
              {touched && err && <p className="ob-err">{err}</p>}
            </>)}

            {/* ── Nav ── */}
            <div className="ob-nav">
              {etapa > 0 && (
                <button className="ob-back" onClick={back}>← Voltar</button>
              )}
              <button
                className={`ob-next${ok ? '' : ' ob-next--dim'}`}
                onClick={next}
                disabled={saving || (etapa === 0 && nome.trim().length < 1)}
              >
                {etapa === 5 ? (saving ? 'Salvando…' : 'Concluir ✓') : 'Continuar →'}
              </button>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}

const CSS = `
  .ob {
    background: #0a0a0a; color: #f4f4f5;
    font-family: var(--font-geist-sans, system-ui, sans-serif);
    -webkit-font-smoothing: antialiased;
    min-height: 100vh; display: flex; flex-direction: column;
    position: relative; overflow: hidden;
  }
  .ob-grid {
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background-image:
      linear-gradient(rgba(26,122,74,.07) 1px, transparent 1px),
      linear-gradient(90deg, rgba(26,122,74,.07) 1px, transparent 1px);
    background-size: 56px 56px;
    mask-image: radial-gradient(ellipse 85% 75% at 50% 50%, black 30%, transparent 100%);
    -webkit-mask-image: radial-gradient(ellipse 85% 75% at 50% 50%, black 30%, transparent 100%);
    animation: obGridDrift 28s linear infinite;
  }
  .ob-orb {
    position: fixed; top: -10%; left: 50%; transform: translateX(-50%);
    width: 600px; height: 600px; border-radius: 50%; pointer-events: none; z-index: 0;
    background: radial-gradient(circle, rgba(26,122,74,.16) 0%, rgba(26,122,74,.05) 50%, transparent 70%);
    filter: blur(4px);
  }

  /* Header */
  .ob-hdr {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    padding: 16px 28px 14px;
    background: linear-gradient(180deg, rgba(10,10,10,.96) 0%, transparent 100%);
    display: flex; align-items: center; gap: 16px;
  }
  .ob-logo { font-size: 15px; font-weight: 800; color: #22c55e; letter-spacing: -.3px; white-space: nowrap; }
  .ob-prog-area { flex: 1; display: flex; flex-direction: column; gap: 4px; }
  .ob-prog-track { height: 3px; background: #1a1a1a; border-radius: 99px; overflow: hidden; }
  .ob-prog-fill { height: 100%; background: linear-gradient(90deg,#1a7a4a,#22c55e); border-radius: 99px; transition: width .55s cubic-bezier(.4,0,.2,1); }
  .ob-prog-pct { font-size: 10px; font-weight: 600; color: #52525b; }
  .ob-step-count { font-size: 12px; font-weight: 600; color: #52525b; white-space: nowrap; }

  /* Layout */
  .ob-main {
    flex: 1; display: flex; align-items: center; justify-content: center;
    padding: 88px 16px 40px; position: relative; z-index: 1; min-height: 100vh;
  }

  /* Card */
  .ob-card {
    width: 100%; max-width: 500px;
    background: #111; border: 1px solid #1e1e1e; border-radius: 20px;
    padding: 36px 32px 28px;
    box-shadow: 0 24px 64px rgba(0,0,0,.55), 0 0 0 1px rgba(26,122,74,.06);
  }

  /* Step content */
  .ob-step-em { display: flex; margin: 0 0 14px; }
  .ob-title { font-size: 20px; font-weight: 700; color: #f4f4f5; margin: 0 0 6px; line-height: 1.3; }
  .ob-sub { font-size: 13.5px; color: #71717a; margin: 0 0 20px; }

  /* Field */
  .ob-field {
    display: flex; align-items: center;
    background: #0d0d0d; border: 1px solid #262626; border-radius: 12px;
    padding: 0 14px; margin-bottom: 8px;
    transition: border-color .15s, box-shadow .15s;
  }
  .ob-field:focus-within { border-color: rgba(26,122,74,.55); box-shadow: 0 0 0 3px rgba(26,122,74,.10); }
  .ob-field--ok  { border-color: rgba(34,197,94,.38); }
  .ob-field--err { border-color: rgba(239,68,68,.45); box-shadow: 0 0 0 3px rgba(239,68,68,.08); }
  .ob-inp {
    flex: 1; background: transparent; border: none; outline: none;
    font-size: 14.5px; color: #f4f4f5; padding: 13px 0; font-family: inherit;
  }
  .ob-inp::placeholder { color: #3f3f46; }
  .ob-check { color: #22c55e; font-size: 14px; font-weight: 700; flex-shrink: 0; }

  /* Dropdown */
  .ob-dropdown {
    position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 50;
    background: #151515; border: 1px solid #252525; border-radius: 12px;
    overflow: hidden; box-shadow: 0 8px 28px rgba(0,0,0,.45);
  }
  .ob-dd-item {
    display: block; width: 100%; text-align: left; padding: 10px 14px;
    font-size: 13.5px; color: #d4d4d8; background: transparent; border: none;
    cursor: pointer; font-family: inherit; transition: background .1s;
    line-height: 1.35;
  }
  .ob-dd-item:hover { background: #1e1e1e; color: #f4f4f5; }
  .ob-dd-sigla { font-weight: 700; color: #f4f4f5; }
  .ob-dd-nome  { color: #71717a; font-size: 12.5px; }

  /* Semester grid */
  .ob-sem-grid { display: grid; grid-template-columns: repeat(5,1fr); gap: 8px; margin-bottom: 4px; }
  .ob-sem-btn {
    padding: 10px 0; border-radius: 10px; font-size: 13px; font-weight: 600;
    background: #161616; border: 1px solid #262626; color: #a1a1aa;
    cursor: pointer; font-family: inherit; transition: all .12s;
  }
  .ob-sem-btn:hover { background: #1e1e1e; color: #d4d4d8; border-color: #333; }
  .ob-sem-btn--sel { background: rgba(26,122,74,.2); border-color: rgba(26,122,74,.55); color: #86efac; transform: scale(1.06); }

  /* Suggestions */
  .ob-sugg-loading { font-size: 12.5px; color: #52525b; font-style: italic; margin-bottom: 12px; }
  .ob-sugg-area { margin-bottom: 14px; }
  .ob-sugg-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
  .ob-chip-sg {
    background: rgba(26,122,74,.12); border: 1px solid rgba(26,122,74,.28); color: #86efac;
    font-size: 12px; font-weight: 500; padding: 5px 12px; border-radius: 99px;
    cursor: pointer; font-family: inherit; transition: background .12s, border-color .12s;
  }
  .ob-chip-sg:hover { background: rgba(26,122,74,.22); border-color: rgba(26,122,74,.5); }
  .ob-accept-all {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 12.5px; color: #4ade80; font-weight: 600;
    background: rgba(26,122,74,.10); border: 1px solid rgba(34,197,94,.35);
    cursor: pointer; font-family: inherit; padding: 6px 14px; border-radius: 99px;
    transition: background .15s, border-color .15s, color .15s;
  }
  .ob-accept-all:hover {
    background: rgba(26,122,74,.22); border-color: rgba(34,197,94,.55); color: #bbf7d0;
  }

  /* Added chips */
  .ob-added { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
  .ob-chip-ok {
    display: flex; align-items: center; gap: 5px;
    background: rgba(34,197,94,.1); border: 1px solid rgba(34,197,94,.25);
    color: #86efac; font-size: 12px; padding: 4px 10px; border-radius: 99px;
  }
  .ob-chip-x {
    background: transparent; border: none; color: #4ade80; cursor: pointer;
    font-size: 15px; line-height: 1; padding: 0; font-family: inherit; opacity: .7;
    transition: opacity .12s;
  }
  .ob-chip-x:hover { opacity: 1; }

  /* Manual matéria input */
  .ob-mat-row { display: flex; gap: 8px; align-items: center; margin-top: 4px; }
  .ob-inp-mat {
    flex: 1; background: #0d0d0d; border: 1px solid #262626; border-radius: 10px;
    padding: 10px 14px; font-size: 13.5px; color: #f4f4f5; outline: none;
    font-family: inherit; transition: border-color .15s;
  }
  .ob-inp-mat:focus { border-color: rgba(26,122,74,.55); box-shadow: 0 0 0 3px rgba(26,122,74,.08); }
  .ob-inp-mat::placeholder { color: #3f3f46; }
  .ob-mat-add {
    width: 42px; height: 42px; border-radius: 11px; flex-shrink: 0;
    background: #1a7a4a; color: #fff; border: none; cursor: pointer;
    font-size: 22px; font-weight: 600; line-height: 1;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 0 14px rgba(26,122,74,.30);
    transition: background .12s, transform .12s, box-shadow .12s;
  }
  .ob-mat-add:hover:not(:disabled) {
    background: #15693e; transform: translateY(-1px);
    box-shadow: 0 0 20px rgba(26,122,74,.45);
  }
  .ob-mat-add:active:not(:disabled) { transform: scale(.95); }
  .ob-mat-add:disabled {
    background: #1f1f1f; color: #52525b; cursor: not-allowed;
    box-shadow: none;
  }

  /* Objetivo */
  .ob-obj-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
  .ob-obj-btn {
    display: flex; align-items: center; gap: 12px; padding: 12px 16px;
    border-radius: 12px; text-align: left; width: 100%;
    background: #161616; border: 1px solid #252525; color: #a1a1aa;
    cursor: pointer; font-size: 13.5px; font-family: inherit; transition: all .12s;
  }
  .ob-obj-btn:hover { background: #1c1c1c; border-color: #333; color: #d4d4d8; }
  .ob-obj-btn--sel { background: rgba(26,122,74,.15); border-color: rgba(26,122,74,.5); color: #86efac; }
  .ob-obj-ico { font-size: 18px; flex-shrink: 0; }
  .ob-obj-check { margin-left: auto; color: #22c55e; font-weight: 700; font-size: 13px; flex-shrink: 0; }
  .ob-outro {
    width: 100%; box-sizing: border-box;
    background: #0d0d0d; border: 1px solid rgba(26,122,74,.4); border-radius: 10px;
    padding: 10px 14px; font-size: 13.5px; color: #f4f4f5; outline: none;
    font-family: inherit; margin-top: 8px; transition: border-color .15s;
  }
  .ob-outro:focus { border-color: rgba(26,122,74,.65); box-shadow: 0 0 0 3px rgba(26,122,74,.10); }
  .ob-outro::placeholder { color: #3f3f46; }

  /* Error */
  .ob-err { font-size: 12px; color: #f87171; margin: 6px 0 0; }

  /* Navigation */
  .ob-nav { display: flex; align-items: center; justify-content: flex-end; gap: 14px; margin-top: 26px; }
  .ob-back {
    font-size: 13px; color: #71717a; background: transparent; border: none;
    cursor: pointer; font-family: inherit; padding: 8px 14px; border-radius: 9px;
    transition: color .12s, background .12s;
  }
  .ob-back:hover { color: #d4d4d8; background: #161616; }
  .ob-next {
    padding: 11px 26px; border-radius: 11px; font-size: 14px; font-weight: 600;
    background: #1a7a4a; color: #fff; border: none; cursor: pointer; font-family: inherit;
    box-shadow: 0 0 20px rgba(26,122,74,.35);
    transition: background .15s, transform .12s, box-shadow .15s, opacity .15s;
  }
  .ob-next:hover:not(:disabled) { background: #155f3a; transform: translateY(-1px); box-shadow: 0 0 28px rgba(26,122,74,.5); }
  .ob-next:active:not(:disabled) { transform: scale(.95); }
  .ob-next:disabled { opacity: .5; cursor: not-allowed; box-shadow: none; }
  .ob-next--dim { opacity: .55; }

  /* Final screen */
  .ob-final {
    width: 100%; max-width: 500px;
    background: #111; border: 1px solid #1e1e1e; border-radius: 20px;
    padding: 36px 32px; box-shadow: 0 24px 64px rgba(0,0,0,.55);
    animation: obFinalIn .55s cubic-bezier(.16,1,.3,1) both;
  }
  .ob-confetti-row { display: flex; justify-content: center; gap: 10px; font-size: 22px; margin-bottom: 16px; }
  .ob-confetti-piece { display: inline-block; animation: obConfetti .7s cubic-bezier(.16,1,.3,1) both; }
  .ob-final-emoji { font-size: 52px; line-height: 1; margin-bottom: 14px; }
  .ob-final-h1 { font-size: 24px; font-weight: 800; color: #f4f4f5; margin: 0 0 8px; }
  .ob-final-p { font-size: 13.5px; color: #71717a; margin: 0 0 20px; }
  .ob-summary {
    border-radius: 12px; overflow: hidden; border: 1px solid #1e1e1e; margin-bottom: 24px;
  }
  .ob-sum-row {
    display: flex; gap: 12px; align-items: flex-start;
    padding: 10px 14px; background: #0d0d0d; border-bottom: 1px solid #1a1a1a;
  }
  .ob-sum-row:last-child { border-bottom: none; }
  .ob-sum-lbl { font-size: 11.5px; color: #52525b; font-weight: 600; min-width: 88px; padding-top: 1px; }
  .ob-sum-val { font-size: 13px; color: #d4d4d8; flex: 1; line-height: 1.5; word-break: break-word; }
  .ob-final-btn {
    width: 100%; padding: 13px; border-radius: 12px;
    background: linear-gradient(135deg,#1a7a4a,#22c55e);
    color: #fff; font-size: 15px; font-weight: 700; border: none; cursor: pointer;
    font-family: inherit; box-shadow: 0 0 24px rgba(26,122,74,.4);
    transition: opacity .15s, transform .12s;
  }
  .ob-final-btn:hover { opacity: .92; transform: translateY(-1px); }

  /* Keyframes */
  @keyframes obSlideIn {
    from { opacity: 0; transform: translateX(36px) scale(.98); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes obSlideBack {
    from { opacity: 0; transform: translateX(-36px) scale(.98); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes obFinalIn {
    from { opacity: 0; transform: translateY(28px) scale(.97); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes obConfetti {
    from { opacity: 0; transform: translateY(-16px) rotate(-15deg) scale(.5); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes obGridDrift {
    from { background-position: 0 0, 0 0; }
    to   { background-position: 56px 56px, 56px 56px; }
  }
`
