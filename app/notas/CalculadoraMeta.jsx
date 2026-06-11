'use client'
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, animate } from 'motion/react'
import { Target, Plus, Minus, ChevronDown, ChevronUp, RotateCcw, CheckCircle2, AlertTriangle, Ban, CheckCheck, FlaskConical } from 'lucide-react'

// Calculadora "Quanto preciso tirar?" — matemática pura, SEM IA.
// Responde: que nota X, igual em cada avaliação pendente, faz a média final
// (Σ nota×peso / Σ peso sobre TODAS as avaliações) atingir um alvo.
// Mantém consistência absoluta com calcularMedia em lib/db.js.

const DEFAULT_PESO = 1
const EASE = [0.16, 1, 0.3, 1]
const ALVO_MIN = 0
const ALVO_MAX = 10
const ALVO_PASSO = 0.5
const VERDE_TRANQUILO = 7 // X ≤ 7 → verde; 7 < X ≤ 10 → âmbar

const fmt1 = n => Number(n).toFixed(1).replace('.', ',') // "8,0" PT-BR
const fmtPeso = n => {
  const v = Number(n)
  return Number.isInteger(v) ? String(v) : String(v).replace('.', ',')
}
const clampAlvo = v => Math.max(ALVO_MIN, Math.min(ALVO_MAX, v))

// Entrada de nota na simulação: aceita vírgula/ponto; vazio = pendente.
const parseNota = s => (s === '' || s == null ? null : Number(String(s).replace(',', '.')))
const fmtNota = n => (n === '' || n == null ? '' : (Number.isInteger(Number(n)) ? String(Number(n)) : Number(n).toFixed(1).replace('.', ',')))
const notaValida = raw => {
  if (raw === '') return true
  const p = parseNota(raw)
  return !(p == null || Number.isNaN(p) || p < 0 || p > ALVO_MAX)
}
const normalizaNota = v => (v === '' || v == null ? null : Number(v))

// peso normalizado (mesma regra de calcularMedia): vazio→1, NaN/≤0→inválido (null).
function pesoValido(pesoRaw) {
  const peso = pesoRaw === null || pesoRaw === undefined || pesoRaw === '' ? DEFAULT_PESO : Number(pesoRaw)
  if (Number.isNaN(peso) || peso <= 0) return null
  return peso
}
const temNota = a => !(a == null || a.nota === null || a.nota === undefined || a.nota === '')

// Núcleo determinístico. Retorna o cenário completo para um dado alvo.
export function calcularCenario(avaliacoes, alvo) {
  let somaTravadas = 0 // Σ(nota×peso) das avaliações já com nota
  let pesoTravadas = 0
  let pesoPendentes = 0
  const pendentes = []

  for (const a of Array.isArray(avaliacoes) ? avaliacoes : []) {
    const peso = pesoValido(a?.peso)
    if (peso === null) continue
    if (temNota(a)) {
      const nota = Number(a.nota)
      if (Number.isNaN(nota)) continue
      somaTravadas += nota * peso
      pesoTravadas += peso
    } else {
      pesoPendentes += peso
      pendentes.push({ nome: a?.nome || 'Avaliação', peso })
    }
  }

  const pesoTotal = pesoTravadas + pesoPendentes
  const mediaAtual = pesoTravadas > 0 ? somaTravadas / pesoTravadas : null

  // Sem nenhuma avaliação com peso válido — nada a calcular.
  if (pesoTotal === 0) return { tipo: 'vazio', mediaAtual: null, pendentes }

  // Nenhuma pendente: todas as notas estão lançadas, a média final é definitiva.
  if (pesoPendentes === 0) {
    const mediaFinal = somaTravadas / pesoTotal
    return { tipo: 'completo', mediaAtual, mediaFinal, alvo, pendentes }
  }

  // X igual em cada pendente que leva a média final ao alvo.
  const x = (alvo * pesoTotal - somaTravadas) / pesoPendentes
  const piso = somaTravadas / pesoTotal // zerando todas as pendentes
  const teto = (somaTravadas + ALVO_MAX * pesoPendentes) / pesoTotal // gabaritando

  if (x <= 0) return { tipo: 'garantido', mediaAtual, alvo, piso, pendentes }
  if (x > ALVO_MAX) return { tipo: 'impossivel', mediaAtual, alvo, teto, pendentes }
  return { tipo: 'preciso', mediaAtual, alvo, x, pendentes }
}

// Número grande com count-up suave a cada mudança (respeita reduced-motion).
// Toda atualização de estado passa pelo callback do animate (assíncrono),
// nunca síncrona no corpo do efeito.
function NumeroGrande({ value, cor, reduce, sufixo }) {
  const [display, setDisplay] = useState(value)
  const prev = useRef(value)
  useEffect(() => {
    if (value == null) { prev.current = null; return }
    const from = prev.current == null ? value : prev.current
    prev.current = value
    const ctrl = animate(from, value, {
      duration: reduce ? 0 : 0.45, ease: EASE,
      onUpdate: v => setDisplay(v),
    })
    return () => ctrl.stop()
  }, [value, reduce])
  return (
    <span style={{ fontSize: 52, fontWeight: 800, lineHeight: 1, color: cor, letterSpacing: '-1.5px' }}>
      {value == null ? '—' : fmt1(display)}
      {sufixo && <span style={{ fontSize: 22, fontWeight: 700, marginLeft: 2 }}>{sufixo}</span>}
    </span>
  )
}

// Stepper compacto do alvo (+/− 0,5, clamp 0–10).
function StepBtnMini({ dir, onClick, disabled }) {
  const Icon = dir === 'up' ? Plus : Minus
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'up' ? 'Aumentar meta' : 'Diminuir meta'}
      style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1.5px solid var(--border-2)', background: 'transparent',
        color: 'var(--text-2)', cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1, transition: 'border-color .15s, color .15s',
      }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.borderColor = '#22c55e'; e.currentTarget.style.color = '#16a34a' } }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text-2)' }}
    >
      <Icon size={15} strokeWidth={2.4} />
    </button>
  )
}

// Mapeia o cenário → cor + selo + frase + número exibido.
function montarVisual(cenario) {
  const { tipo } = cenario
  if (tipo === 'completo') {
    const ok = cenario.mediaFinal >= cenario.alvo - 1e-9
    return {
      cor: ok ? '#22c55e' : '#dc2626',
      selo: ok
        ? { label: 'Meta atingida', Icon: CheckCheck, bg: 'rgba(34,197,94,.14)', sCor: '#16a34a', borda: 'rgba(34,197,94,.3)' }
        : { label: 'Abaixo da meta', Icon: AlertTriangle, bg: 'rgba(220,38,38,.14)', sCor: '#dc2626', borda: 'rgba(220,38,38,.32)' },
      numero: cenario.mediaFinal,
      rotulo: 'média final',
      frase: ok
        ? `Todas as notas lançadas. Sua média final é ${fmt1(cenario.mediaFinal)} — acima da meta de ${fmt1(cenario.alvo)}.`
        : `Todas as notas lançadas. Sua média final é ${fmt1(cenario.mediaFinal)}, abaixo da meta de ${fmt1(cenario.alvo)}.`,
    }
  }
  if (tipo === 'garantido') {
    return {
      cor: '#22c55e',
      selo: { label: 'Meta garantida', Icon: CheckCircle2, bg: 'rgba(34,197,94,.14)', sCor: '#16a34a', borda: 'rgba(34,197,94,.3)' },
      numero: cenario.piso,
      rotulo: 'média no pior caso',
      frase: `Você já garantiu a meta de ${fmt1(cenario.alvo)}! Mesmo zerando as avaliações que faltam, sua média fica em ${fmt1(cenario.piso)}.`,
    }
  }
  if (tipo === 'impossivel') {
    return {
      cor: '#dc2626',
      selo: { label: 'Fora de alcance', Icon: Ban, bg: 'rgba(220,38,38,.14)', sCor: '#dc2626', borda: 'rgba(220,38,38,.32)' },
      numero: cenario.teto,
      rotulo: 'máximo possível',
      frase: `Não dá pra atingir ${fmt1(cenario.alvo)} nesta matéria. Mesmo gabaritando tudo, sua média chega no máximo a ${fmt1(cenario.teto)}. Foque no que é alcançável.`,
    }
  }
  // preciso
  const apertado = cenario.x > VERDE_TRANQUILO
  const umaPendente = cenario.pendentes.length === 1
  return {
    cor: apertado ? '#d97706' : '#22c55e',
    selo: apertado
      ? { label: 'Vai exigir foco', Icon: AlertTriangle, bg: 'rgba(217,119,6,.14)', sCor: '#d97706', borda: 'rgba(217,119,6,.32)' }
      : { label: 'Ao seu alcance', Icon: CheckCircle2, bg: 'rgba(34,197,94,.14)', sCor: '#16a34a', borda: 'rgba(34,197,94,.3)' },
    numero: cenario.x,
    rotulo: umaPendente ? `em ${cenario.pendentes[0].nome}` : 'em cada pendente',
    frase: umaPendente
      ? `Você precisa de ${fmt1(cenario.x)} na ${cenario.pendentes[0].nome} para atingir a meta de ${fmt1(cenario.alvo)}.`
      : `Você precisa de ${fmt1(cenario.x)} em cada uma das ${cenario.pendentes.length} avaliações que faltam para atingir a meta de ${fmt1(cenario.alvo)}.`,
  }
}

// Painel expansível dentro do MateriaCard (aba Notas). metaPadrao = media_aprovacao
// da matéria; o alvo é simulável e independente (não persiste).
export default function CalculadoraMeta({ avaliacoes, metaPadrao, nomeMateria, reduce }) {
  const [aberto, setAberto] = useState(false)
  const [alvo, setAlvo] = useState(clampAlvo(Number(metaPadrao) || 7))
  // Rascunho local da simulação: { [indice]: notaDigitada }. NUNCA persiste.
  const [overrides, setOverrides] = useState({})

  const lista = Array.isArray(avaliacoes) ? avaliacoes : []

  // Cada linha editável: valor exibido + flags de simulado/inválido.
  const linhas = lista.map((a, i) => {
    const peso = pesoValido(a?.peso) ?? 1
    const tem = i in overrides
    const raw = tem ? overrides[i] : undefined
    const value = tem ? raw : fmtNota(a?.nota)
    const realN = normalizaNota(a?.nota)
    let simulado = false
    let invalido = false
    if (tem) {
      if (!notaValida(raw)) invalido = true
      else simulado = (raw === '' ? null : parseNota(raw)) !== realN
    }
    return { i, nome: a?.nome || 'Avaliação', peso, value, simulado, invalido }
  })
  const temAlteracoes = linhas.some(l => l.simulado || l.invalido)

  // Avaliações mescladas (reais + overrides válidos) que alimentam o cálculo.
  const merged = lista.map((a, i) => {
    if (!(i in overrides)) return a
    const raw = overrides[i]
    if (raw === '') return { ...a, nota: null }
    if (!notaValida(raw)) return a // inválido: ignora, mantém o valor real
    return { ...a, nota: parseNota(raw) }
  })

  const cenario = calcularCenario(merged, alvo)
  const visual = montarVisual(cenario)
  const nPendentes = cenario.pendentes.length
  const alvoDifere = Math.abs(alvo - (Number(metaPadrao) || 7)) > 1e-9

  const ajustarAlvo = delta => setAlvo(v => clampAlvo(Math.round((v + delta) * 2) / 2))
  const restaurar = () => setOverrides({})
  const editarNota = (i, val) => setOverrides(prev => ({ ...prev, [i]: val.replace(/[^\d.,]/g, '') }))
  // Fechar o painel descarta o rascunho da simulação.
  const alternar = () => {
    if (aberto) setOverrides({})
    setAberto(v => !v)
  }

  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
      {/* Atalho discreto */}
      <button
        onClick={alternar}
        aria-expanded={aberto}
        aria-label="Abrir calculadora: quanto preciso tirar"
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 12px', fontSize: 13, fontWeight: 600, borderRadius: 11,
          border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-2)',
          cursor: 'pointer', transition: 'border-color .15s, color .15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(34,197,94,.4)'; e.currentTarget.style.color = '#16a34a' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)' }}
      >
        <Target size={15} strokeWidth={2} style={{ flexShrink: 0, color: '#16a34a' }} />
        <span style={{ flex: 1, textAlign: 'left' }}>Quanto preciso tirar?</span>
        {aberto ? <ChevronUp size={15} strokeWidth={2} /> : <ChevronDown size={15} strokeWidth={2} />}
      </button>

      <AnimatePresence initial={false}>
        {aberto && (
          <motion.div
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={reduce ? {} : { opacity: 1, height: 'auto' }}
            exit={reduce ? {} : { opacity: 0, height: 0 }}
            transition={{ duration: reduce ? 0 : 0.28, ease: EASE }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 14 }}>
              {/* Cabeçalho + resumo do estado */}
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
                  Quanto preciso tirar?
                </h4>
                <p style={{ fontSize: 12, color: 'var(--text-4)', margin: '3px 0 0' }}>
                  {cenario.mediaAtual != null
                    ? `Média atual: ${fmt1(cenario.mediaAtual)}`
                    : 'Nenhuma nota lançada ainda'}
                  {nPendentes > 0 && ` · ${nPendentes} ${nPendentes === 1 ? 'avaliação pendente' : 'avaliações pendentes'}`}
                </p>
              </div>

              {/* Aviso de simulação ativa + restaurar (só quando há alterações) */}
              <AnimatePresence initial={false}>
                {temAlteracoes && (
                  <motion.div
                    initial={reduce ? false : { opacity: 0, height: 0 }}
                    animate={reduce ? {} : { opacity: 1, height: 'auto' }}
                    exit={reduce ? {} : { opacity: 0, height: 0 }}
                    transition={{ duration: reduce ? 0 : 0.22, ease: EASE }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10,
                      background: 'rgba(217,119,6,.1)', border: '1px solid rgba(217,119,6,.28)',
                    }}>
                      <FlaskConical size={14} strokeWidth={2} style={{ flexShrink: 0, color: '#d97706' }} />
                      <span style={{ flex: 1, fontSize: 11.5, fontWeight: 600, color: '#b45309', lineHeight: 1.4 }}>
                        Simulação — nada aqui altera suas notas reais.
                      </span>
                      <button
                        onClick={restaurar}
                        aria-label="Restaurar valores reais"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
                          padding: '4px 8px', fontSize: 11.5, fontWeight: 700, borderRadius: 8,
                          color: '#b45309', background: 'transparent', border: '1px solid rgba(217,119,6,.4)',
                          cursor: 'pointer', fontFamily: 'inherit', transition: 'background .15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(217,119,6,.12)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <RotateCcw size={12} strokeWidth={2.2} /> Restaurar reais
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* RESULTADO em destaque (cor + texto sempre juntos) */}
              <div
                role="status"
                aria-live="polite"
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  padding: '18px 16px', borderRadius: 14, textAlign: 'center',
                  background: `color-mix(in srgb, ${visual.cor} 9%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${visual.cor} 26%, transparent)`,
                }}
              >
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: visual.selo.bg, color: visual.selo.sCor, border: `1px solid ${visual.selo.borda}`,
                  borderRadius: 99, padding: '3px 10px', fontSize: 11.5, fontWeight: 700,
                }}>
                  <visual.selo.Icon size={13} strokeWidth={2.2} /> {visual.selo.label}
                </span>

                {cenario.tipo === 'vazio' ? (
                  <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-2)', margin: '2px 0 0', maxWidth: 320 }}>
                    Adicione avaliações com peso para simular a nota que você precisa.
                  </p>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
                      <NumeroGrande value={visual.numero} cor={visual.cor} reduce={reduce} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-4)' }}>{visual.rotulo}</span>
                    </div>
                    <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-2)', margin: '2px 0 0', maxWidth: 340 }}>
                      {visual.frase}
                    </p>
                  </>
                )}
              </div>

              {/* Controle do alvo (recalcula ao vivo, sem botão) */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Meta</span>
                  {alvoDifere && (
                    <button
                      onClick={() => setAlvo(clampAlvo(Number(metaPadrao) || 7))}
                      aria-label="Voltar à meta da matéria"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 6px',
                        fontSize: 11, fontWeight: 600, color: 'var(--text-4)', background: 'none',
                        border: 'none', cursor: 'pointer', borderRadius: 6, transition: 'color .15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#16a34a')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-4)')}
                    >
                      <RotateCcw size={12} strokeWidth={2} /> {fmt1(Number(metaPadrao) || 7)}
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <StepBtnMini dir="down" onClick={() => ajustarAlvo(-ALVO_PASSO)} disabled={alvo <= ALVO_MIN} />
                  <span
                    aria-label={`Meta ${fmt1(alvo)}`}
                    style={{ minWidth: 48, textAlign: 'center', fontSize: 22, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-.5px' }}
                  >
                    {fmt1(alvo)}
                  </span>
                  <StepBtnMini dir="up" onClick={() => ajustarAlvo(ALVO_PASSO)} disabled={alvo >= ALVO_MAX} />
                </div>
              </div>

              {/* Lista editável: simule qualquer nota (cálculo ao vivo, nada persiste) */}
              {linhas.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <div>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '.4px' }}>
                      Simular notas
                    </span>
                    <p style={{ fontSize: 11.5, color: 'var(--text-4)', margin: '3px 0 0', lineHeight: 1.4 }}>
                      Edite qualquer nota para testar um cenário. Deixe em branco para tratar como pendente.
                    </p>
                  </div>
                  {linhas.map(l => {
                    const corBorda = l.invalido ? 'rgba(220,38,38,.5)' : l.simulado ? 'rgba(217,119,6,.55)' : 'var(--border)'
                    const corTexto = l.invalido ? '#dc2626' : l.simulado ? '#d97706' : 'var(--text-1)'
                    const corFundo = l.invalido ? 'rgba(220,38,38,.08)' : l.simulado ? 'rgba(217,119,6,.1)' : 'var(--surface-2)'
                    return (
                      <div key={l.i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {l.nome}
                          {l.simulado && (
                            <span style={{ marginLeft: 6, fontSize: 10.5, fontWeight: 700, color: '#d97706' }}>simulado</span>
                          )}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <input
                            aria-label={`Nota simulada de ${l.nome}`}
                            aria-invalid={l.invalido}
                            type="text" inputMode="decimal"
                            value={l.value}
                            placeholder="—"
                            onChange={e => editarNota(l.i, e.target.value)}
                            style={{
                              width: 58, textAlign: 'center', padding: '5px 6px', fontSize: 14, fontWeight: 700,
                              borderRadius: 9, fontFamily: 'inherit', outline: 'none',
                              background: corFundo, color: corTexto, border: `1.5px solid ${corBorda}`,
                              transition: 'border-color .15s, color .15s, background .15s',
                            }}
                          />
                          <span style={{
                            fontSize: 11.5, fontWeight: 600, color: 'var(--text-3)',
                            background: 'var(--surface-2)', border: '1px solid var(--border)',
                            borderRadius: 99, padding: '2px 9px',
                          }}>
                            peso {fmtPeso(l.peso)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
