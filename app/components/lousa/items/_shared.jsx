'use client'

export function DrawerCard({ label, children, style }) {
  return (
    <div className="lousa-dcard" style={style}>
      <p className="lousa-dcard-label">{label}</p>
      <div>{children}</div>
    </div>
  )
}

export function FullscreenSkeleton({ Icon, title, bullets }) {
  return (
    <div style={{ maxWidth: 640, margin: '40px auto 0' }}>
      <div style={{
        width: 80, height: 80, borderRadius: 22,
        background: 'rgba(34,197,94,.08)',
        border: '1px solid rgba(34,197,94,.18)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 22,
      }}>
        <Icon size={36} strokeWidth={1.4} style={{ color: '#22c55e' }} />
      </div>
      <h2 style={{ fontSize: 26, fontWeight: 800, color: '#f4f4f5', letterSpacing: '-.025em', marginBottom: 10 }}>{title}</h2>
      <p style={{ fontSize: 14, color: '#a1a1aa', lineHeight: 1.7, marginBottom: 26 }}>
        Detalhamento completo em breve. O que está no roadmap:
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {bullets.map((b, i) => (
          <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13.5, color: '#d4d4d8', lineHeight: 1.6 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', marginTop: 9, flexShrink: 0 }} />
            {b}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ProPaywall({ Icon, title, description, bullets, onSeePlans }) {
  return (
    <div>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: 'rgba(26,122,74,.14)',
        border: '1px solid rgba(34,197,94,.3)',
        color: '#86efac',
        fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em',
        padding: '4px 10px', borderRadius: 99,
        marginBottom: 14,
      }}>
        PRO
      </div>
      <h3 style={{ fontSize: 19, fontWeight: 800, color: '#f4f4f5', letterSpacing: '-.02em', marginBottom: 10 }}>{title}</h3>
      <p style={{ fontSize: 13.5, color: '#a1a1aa', lineHeight: 1.65, marginBottom: 22 }}>{description}</p>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {bullets.map((b, i) => (
          <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: '#d4d4d8', lineHeight: 1.6 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', marginTop: 8, flexShrink: 0 }} />
            {b}
          </li>
        ))}
      </ul>
      <button onClick={onSeePlans} className="lousa-primary-btn">
        Ver planos
      </button>
    </div>
  )
}

export function openPlansModal() {
  try {
    window.dispatchEvent(new CustomEvent('open-plans-modal'))
  } catch {}
}

export const sharedItemCss = `
  .lousa-dcard{background:#101010;border:1px solid #1a1a1a;border-radius:12px;padding:14px 16px}
  .lousa-dcard-label{font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#71717a;margin-bottom:8px}
  .lousa-cta-btn{display:inline-flex;align-items:center;gap:6px;background:rgba(26,122,74,.14);border:1px solid rgba(34,197,94,.3);color:#86efac;font-size:13px;font-weight:600;padding:9px 16px;border-radius:10px;cursor:pointer;font-family:inherit;transition:background .15s}
  .lousa-cta-btn:hover{background:rgba(26,122,74,.22)}
  .lousa-primary-btn{display:inline-flex;align-items:center;gap:8px;background:#1a7a4a;color:#fff;font-size:14px;font-weight:700;padding:11px 22px;border-radius:10px;border:1px solid rgba(34,197,94,.3);cursor:pointer;font-family:inherit;transition:background .15s,transform .15s,box-shadow .15s;box-shadow:0 0 20px rgba(26,122,74,.18)}
  .lousa-primary-btn:hover{background:#155f3a;transform:translateY(-1px);box-shadow:0 0 28px rgba(26,122,74,.3)}
`
