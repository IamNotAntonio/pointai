'use client'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { useState, useRef } from 'react'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'

const CHART_COLORS = ['#1a7a4a', '#2563eb', '#7c3aed', '#d97706', '#dc2626', '#0891b2', '#059669']

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '8px 12px', boxShadow: 'var(--shadow)',
      fontSize: 12,
    }}>
      <p style={{ color: 'var(--text-3)', marginBottom: 2 }}>{payload[0]?.payload?.fullLabel || label}</p>
      <p style={{ fontWeight: 700, color: payload[0]?.fill || 'var(--text-1)' }}>{payload[0]?.value}</p>
    </div>
  )
}

function ChartBlock({ raw }) {
  try {
    const { type = 'bar', title, data = [] } = JSON.parse(raw)

    const chartData = data.map((d, i) => ({
      name: String(d.label ?? d.x ?? i),
      fullLabel: String(d.label ?? d.x ?? ''),
      value: Number(d.value ?? d.y ?? 0),
    }))

    return (
      <div className="chat-chart-block">
        {title && <p className="chat-chart-title">{title}</p>}
        <ResponsiveContainer width="100%" height={200}>
          {type === 'line' ? (
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="value" stroke="#1a7a4a" strokeWidth={2} dot={{ fill: '#1a7a4a', r: 3 }} />
            </LineChart>
          ) : (
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    )
  } catch {
    return <pre className="chat-code-pre"><code>{raw}</code></pre>
  }
}

function SvgBlock({ content }) {
  const [fullscreen, setFullscreen] = useState(false)
  const containerRef = useRef(null)

  function download() {
    const blob = new Blob([content], { type: 'image/svg+xml' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'diagrama-pointai.svg'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Sanitise: allow only the SVG element itself (no scripts, no foreignObject)
  const safe = content
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\bon\w+\s*=/gi, 'data-removed=')

  const svgEl = (
    <div
      ref={containerRef}
      dangerouslySetInnerHTML={{ __html: safe }}
      style={{ lineHeight: 0 }}
    />
  )

  return (
    <>
      <div className="svg-block">
        <div className="svg-block-toolbar">
          <span className="svg-block-label">Diagrama SVG</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="svg-block-btn" onClick={download} title="Baixar .svg">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Baixar
            </button>
            <button className="svg-block-btn" onClick={() => setFullscreen(true)} title="Tela cheia">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
              Expandir
            </button>
          </div>
        </div>
        <div className="svg-block-canvas">{svgEl}</div>
      </div>

      {fullscreen && (
        <div className="svg-fullscreen-overlay" onClick={() => setFullscreen(false)}>
          <div className="svg-fullscreen-inner" onClick={e => e.stopPropagation()}>
            <button className="svg-fullscreen-close" onClick={() => setFullscreen(false)}>×</button>
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div dangerouslySetInnerHTML={{ __html: safe }} style={{ maxWidth: '90vw', maxHeight: '85vh' }} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function CodeBlock({ language, content }) {
  const [copied, setCopied] = useState(false)

  if (language === 'chart') return <ChartBlock raw={content} />
  if (language === 'svg')   return <SvgBlock content={content} />

  function copiar() {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="chat-code-block">
      <div className="chat-code-header">
        <span className="chat-code-lang">{language || 'code'}</span>
        <button className="chat-code-copy" onClick={copiar}>
          {copied ? '✓ Copiado' : 'Copiar'}
        </button>
      </div>
      <pre className="chat-code-pre"><code>{content}</code></pre>
    </div>
  )
}

const components = {
  // Block code — pre wraps the code element
  pre({ children }) {
    const child = Array.isArray(children) ? children[0] : children
    const cls = child?.props?.className || ''
    const language = /language-(\w+)/.exec(cls)?.[1]
    const content = String(child?.props?.children ?? '').replace(/\n$/, '')
    return <CodeBlock language={language} content={content} />
  },
  // Inline code — only reaches here when NOT inside pre
  code({ children, className }) {
    const cls = className || ''
    // Math nodes from rehype-katex get a special class — let them pass through
    if (cls.includes('language-')) return null // pre handles this
    return <code className="chat-inline-code">{children}</code>
  },
  table: ({ children }) => (
    <div className="chat-table-wrap">
      <table className="chat-table">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="chat-th">{children}</th>,
  td: ({ children }) => <td className="chat-td">{children}</td>,
  p: ({ children }) => <p style={{ margin: '0 0 7px' }}>{children}</p>,
  h2: ({ children }) => <h2 style={{ fontSize: 14, fontWeight: 700, margin: '14px 0 5px', color: 'var(--text-1)', borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>{children}</h2>,
  h3: ({ children }) => <h3 style={{ fontSize: 13, fontWeight: 700, margin: '10px 0 4px', color: 'var(--text-1)' }}>{children}</h3>,
  strong: ({ children }) => <strong style={{ fontWeight: 700, color: 'var(--text-1)' }}>{children}</strong>,
  ul: ({ children }) => <ul style={{ margin: '4px 0 8px 18px' }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ margin: '4px 0 8px 18px' }}>{children}</ol>,
  li: ({ children }) => <li style={{ marginBottom: 3 }}>{children}</li>,
  blockquote: ({ children }) => (
    <blockquote style={{ borderLeft: '3px solid var(--brand)', paddingLeft: 12, margin: '8px 0', color: 'var(--text-3)', fontStyle: 'italic' }}>{children}</blockquote>
  ),
}

export default function RichMessage({ content }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={components}
    >
      {content}
    </ReactMarkdown>
  )
}
