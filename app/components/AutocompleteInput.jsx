'use client'
import { useState, useRef, useMemo, useId, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { Search } from 'lucide-react'

const EASE_OUT = [0.16, 1, 0.3, 1]
const MAX_RESULTS = 50

function normalize(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * AutocompleteInput — list-assisted text field with FREE fallback.
 *
 * Suggests from `data`, prioritising `popular` items, but never blocks: the
 * user can keep typing anything and a friendly notice confirms the free value
 * will be saved as written. Designed for the Point onboarding (dark, green
 * #22c55e), but fully reusable.
 */
export default function AutocompleteInput({
  data = [],
  value = '',
  onChange,
  onSubmit,
  placeholder = '',
  getDisplay = (item) => item?.nome ?? String(item ?? ''),
  getSearch = (item) => `${item?.nome ?? ''} ${item?.sigla ?? ''}`,
  getMeta = (item) => item?.sigla ?? '',
  autoFocus = false,
  id,
}) {
  const reduce = useReducedMotion()
  const reactId = useId()
  const listId = `${id || 'ac'}-${reactId}-list`

  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [blurredOnce, setBlurredOnce] = useState(false)

  const inputRef = useRef(null)
  const blurTimer = useRef(0)

  const q = normalize(value)

  // ── Filter + rank ─────────────────────────────────────────────
  const results = useMemo(() => {
    let pool
    if (q.length < 2) {
      // Short query: show only populars (keeps the list from being noise).
      pool = data.filter(d => d.popular)
      if (q.length === 1) pool = pool.filter(d => normalize(getSearch(d)).includes(q))
    } else {
      pool = data.filter(d => normalize(getSearch(d)).includes(q))
    }
    const scored = pool.map(item => {
      const disp = normalize(getDisplay(item))
      const search = normalize(getSearch(item))
      let score = 0
      if (item.popular) score += 100
      if (disp.startsWith(q) || search.startsWith(q)) score += 40
      else if (q && search.includes(` ${q}`)) score += 15
      return { item, score, disp }
    })
    scored.sort((a, b) =>
      b.score - a.score || a.disp.length - b.disp.length || a.disp.localeCompare(b.disp)
    )
    return scored.slice(0, MAX_RESULTS).map(s => s.item)
  }, [data, q, getDisplay, getSearch])

  const exactMatch = useMemo(() => {
    if (!q) return false
    return data.some(d => normalize(getDisplay(d)) === q || normalize(getMeta(d)) === q)
  }, [data, q, getDisplay, getMeta])

  const showNotice = blurredOnce && value.trim().length > 0 && !exactMatch
  const showDropdown = open && (results.length > 0 || value.trim().length > 0)
  const showFooterNote = value.trim().length > 0

  // ── Handlers ──────────────────────────────────────────────────
  const select = useCallback((item) => {
    onChange?.(getDisplay(item))
    setOpen(false)
    setActiveIndex(-1)
    setBlurredOnce(false)
    inputRef.current?.focus()
  }, [onChange, getDisplay])

  function handleChange(e) {
    onChange?.(e.target.value)
    setOpen(true)
    setActiveIndex(-1)
    setBlurredOnce(false)
  }

  function handleFocus() {
    clearTimeout(blurTimer.current)
    setOpen(true)
    setBlurredOnce(false)
  }

  function handleBlur() {
    // Delay so a mousedown on an option still registers before close.
    blurTimer.current = setTimeout(() => {
      setOpen(false)
      setActiveIndex(-1)
      if (value.trim().length > 0) setBlurredOnce(true)
    }, 140)
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) { setOpen(true); return }
      setActiveIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      if (open && activeIndex >= 0 && results[activeIndex]) {
        e.preventDefault()
        select(results[activeIndex])
      } else {
        // No highlight → accept the free text and advance.
        setOpen(false)
        if (value.trim().length > 0 && !exactMatch) setBlurredOnce(true)
        onSubmit?.()
      }
    } else if (e.key === 'Escape') {
      if (open) { e.preventDefault(); e.stopPropagation(); setOpen(false); setActiveIndex(-1) }
    } else if (e.key === 'Tab') {
      // Accept free text and let focus move on.
      setOpen(false)
      if (value.trim().length > 0 && !exactMatch) setBlurredOnce(true)
    }
  }

  const activeOptionId = activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined

  return (
    <div className="ac-wrap">
      <style>{AC_CSS}</style>

      <div className={`ac-field${showNotice ? ' ac-field--notice' : ''}`}>
        <input
          ref={inputRef}
          id={id}
          className="ac-input"
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
        <Search size={17} strokeWidth={1.8} className="ac-search-ico" aria-hidden />
      </div>

      <AnimatePresence initial={false}>
        {showDropdown && (
          <motion.div
            className="ac-dropdown"
            role="listbox"
            id={listId}
            aria-label="Sugestões"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scaleY: 0.95 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, scaleY: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scaleY: 0.95, transition: { duration: 0.1 } }}
            transition={{ duration: 0.15, ease: EASE_OUT }}
            style={{ transformOrigin: 'top' }}
          >
            {results.length > 0 && (
              <ul className="ac-list">
                {results.map((item, i) => {
                  const meta = getMeta(item)
                  return (
                    <li
                      key={`${getDisplay(item)}-${i}`}
                      id={`${listId}-opt-${i}`}
                      role="option"
                      aria-selected={i === activeIndex}
                      className={`ac-item${i === activeIndex ? ' ac-item--active' : ''}`}
                      onMouseDown={(e) => { e.preventDefault(); select(item) }}
                      onMouseEnter={() => setActiveIndex(i)}
                    >
                      {item.popular && <span className="ac-pop-dot" aria-hidden />}
                      <span className="ac-item-name">{getDisplay(item)}</span>
                      {meta && getDisplay(item) !== meta && (
                        <span className="ac-item-meta">{meta}</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
            {showFooterNote && (
              <div className="ac-foot" role="note">
                Não está na lista? Continue digitando — vamos cadastrar como você escreveu.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {showNotice && (
        <p className="ac-notice">
          Vamos cadastrar como você escreveu: <strong>“{value.trim()}”</strong>. Você pode revisar depois nas configurações.
        </p>
      )}

      {/* Screen-reader live region */}
      <div className="ac-sr" aria-live="polite" role="status">
        {showDropdown && results.length > 0
          ? `${results.length} resultado${results.length === 1 ? '' : 's'} encontrado${results.length === 1 ? '' : 's'}`
          : ''}
      </div>
    </div>
  )
}

const AC_CSS = `
  .ac-wrap{position:relative;width:100%}

  .ac-field{
    display:flex;align-items:center;gap:8px;
    background:#0d0d0d;border:1px solid #262626;border-radius:12px;
    padding:0 14px;transition:border-color .15s,box-shadow .15s;
  }
  .ac-field:focus-within{border-color:rgba(34,197,94,.55);box-shadow:0 0 0 3px rgba(34,197,94,.10)}
  .ac-field--notice{border-color:rgba(34,197,94,.28)}
  .ac-input{
    flex:1;background:transparent;border:none;outline:none;
    font-size:14.5px;color:#f4f4f5;padding:13px 0;font-family:inherit;
  }
  .ac-input::placeholder{color:#3f3f46}
  .ac-search-ico{color:#52525b;flex-shrink:0}
  .ac-field:focus-within .ac-search-ico{color:#22c55e}

  .ac-dropdown{
    position:absolute;top:calc(100% + 6px);left:0;right:0;z-index:50;
    background:rgba(15,15,15,.97);border:1px solid rgba(255,255,255,.08);
    border-radius:12px;overflow:hidden;
    box-shadow:0 16px 40px rgba(0,0,0,.5);
    backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
  }
  .ac-list{list-style:none;margin:0;padding:4px;max-height:320px;overflow-y:auto}
  .ac-list::-webkit-scrollbar{width:6px}
  .ac-list::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:8px}
  .ac-item{
    display:flex;align-items:center;gap:8px;
    padding:10px 12px;border-radius:8px;cursor:pointer;
    font-size:13.5px;color:#d4d4d8;line-height:1.35;
    transition:background .1s,color .1s;
  }
  .ac-item:hover{background:rgba(34,197,94,.08);color:#bbf7d0}
  .ac-item--active{background:rgba(34,197,94,.12);color:#bbf7d0}
  .ac-pop-dot{width:5px;height:5px;border-radius:50%;background:#22c55e;flex-shrink:0;box-shadow:0 0 6px rgba(34,197,94,.6)}
  .ac-item-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .ac-item-meta{font-size:12px;color:#71717a;font-weight:600;flex-shrink:0}

  .ac-foot{
    padding:11px 14px;border-top:1px solid rgba(255,255,255,.06);
    font-size:11.5px;color:#71717a;line-height:1.45;
  }

  .ac-notice{
    font-size:12px;color:#86efac;margin:7px 2px 0;line-height:1.5;
    display:flex;flex-wrap:wrap;gap:3px;align-items:baseline;
  }
  .ac-notice strong{color:#bbf7d0;font-weight:700}

  .ac-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}

  @media (max-width:767px){
    .ac-list{max-height:60vh}
  }
`
