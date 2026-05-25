# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Brand Identity (READ FIRST)

The product is called **Point** (no dot, no AI). The AI assistant feature inside it is called **Point AI** (with a space, no dot). Think of it like "Notion" (the product) vs "Notion AI" (the AI feature inside it).

When writing or modifying any user-facing copy:
- Use **"Point"** for: app branding, wordmarks, metadata, landing copy, legal pages, breadcrumbs, plan names ("Point Pro"), institutional/platform identity
- Use **"Point AI"** ONLY when the AI is actively manifesting/identifying itself: chat header, AI-generated content headings ("Feedback do Point AI"), system prompts where the AI introduces itself, transcript role labels
- "Assistente Point" is a distinct persona name (the floating coach assistant) — do not change it
- Internal technical names use `pointai` (package.json name, localStorage keys, CSS ids like `#pointai-fab`) — do not rebrand these

The rebrand was applied in commit `c8e879a`. See that commit for canonical examples of each case.

## Commands

```bash
npm run dev      # next dev
npm run build    # node scripts/pack-extension.js && next build (also re-zips chrome-extension/)
npm run start    # next start
npm run lint     # eslint
```

No test suite. No `jsconfig` alias — imports use relative paths.

## Environment Variables

Required for full functionality (set in `.env.local`):

- `ANTHROPIC_API_KEY` — all Claude calls
- `OPENAI_API_KEY` — DALL-E 3 image gen + `tts-1` voice
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase auth (client)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase admin (server)
- `MP_ACCESS_TOKEN` — Mercado Pago checkout
- `CANVAS_CLIENT_ID`, `CANVAS_CLIENT_SECRET` — Canvas LMS OAuth
- `NEXT_PUBLIC_APP_URL` — deployment URL used in webhooks/callbacks
- `STABILITY_API_KEY` — referenced (image gen fallback)

## Architecture

Point is a Next.js 16 app (App Router, JavaScript — no TypeScript) targeting Brazilian university students. AI features powered by the Anthropic SDK; primary model is `claude-sonnet-4-5`, with `claude-haiku-4-5-20251001` used on lighter routes (assistant, resumo, quiz, sugestoes, resumir). Tailwind CSS v4 via PostCSS plugin. React 19. Font: Geist + Geist_Mono via `next/font/google`. Deployed on Vercel. Production domain `pointedu.com.br` (DNS in propagation at time of writing); preview at `pointai-two.vercel.app`.

### Data Persistence & Auth

**Supabase + localStorage hybrid.** Supabase handles Google OAuth authentication (sole login method) and stores the canonical `perfis` table; `app/lib/db.js` writes through to Supabase and mirrors to localStorage for offline read. `app/lib/supabase-browser.js` exposes a lazy singleton browser client; `proxy.js` (root-level middleware) protects routes with `createServerClient` and `auth.getUser()`, redirecting unauthenticated users to `/login`. OAuth callback lives at `app/auth/callback/route.js`.

Most feature data (notas, eventos, chats, etc.) is **localStorage-only** at the moment — not synced to Supabase. Keys (all `pointai_*` prefixed):

`pointai_perfil`, `pointai_tema`, `pointai_plano`, `pointai_user_id`, `pointai_sidebar_collapsed`, `pointai_notas`, `pointai_eventos`, `pointai_topicos`, `pointai_analises`, `pointai_simulados_hist`, `pointai_simulados_semana`, `pointai_plano_estudos`, `pointai_canvas`, `pointai_moodle`, `pointai_notifs_lidas`, `pointai_last_access`, `pointai_tutorial_done`, `pointai_dev_pro`. Plus dynamic per-chat: `chat_<materia>`, `resumo_<chatKey>`.

`signOut()` in `lib/db.js` wipes all localStorage keys on logout.

### Routes (Pages)

**Public:**
- `/` — landing page (marketing, animated, no client state)
- `/login` — Google OAuth via Supabase
- `/auth/callback` — OAuth code-exchange handler (server route)
- `/privacidade`, `/termos` — legal pages
- `/assinar/sucesso`, `/assinar/erro` — Mercado Pago return URLs

**Onboarding (protected):**
- `/onboarding` — multi-step wizard collecting `nome`, `curso`, `universidade`, `semestre`, `materias` (comma-separated), `objetivo`; writes to localStorage + Supabase

**Protected (middleware redirects to /login if unauthenticated):**
- `/dashboard` — chat interface; sidebar lists subjects parsed from `perfil.materias` (PLANNED: become home with cards, chat moves to `/dashboard/chat`)
- `/notas` — grades + absences tracker (25% absence rule)
- `/calendario` — events calendar (provas, trabalhos, apresentações) with urgency coloring
- `/evolucao` — progress dashboard: averages, risk alerts, upcoming events
- `/trabalhos` — paper correction (paste text → AI feedback)
- `/analise`, `/relatorio`, `/simulado`, `/plano` — Pro-tier features (image/PDF analysis, weekly report, simulado generator, study plan)

### API Routes

All under `app/api/`, all server routes, none gated by the middleware (auth must be checked inside the handler if needed).

**AI / content generation:** `chat`, `chat/corrigir`, `corrigir` *(near-duplicate of `chat/corrigir` — only emoji differences in markdown section headings; tech debt)*, `assistant`, `analisar`, `plano`, `quiz`, `relatorio`, `resumo`, `resumir`, `simulado`, `sugestoes`

**Media:** `imagem` (DALL-E 3), `tts` (OpenAI tts-1)

**Imports:** `importar`, `canvas`, `canvas/callback`, `canvas/oauth`, `canvas/sync`, `moodle`, `moodle/callback`, `moodle/oauth`, `moodle/sync`

**Payments:** `assinar` (creates Mercado Pago subscription), `assinar/ativar`, `webhook-mp`

Anthropic clients are instantiated at module scope per route. `max_tokens` varies (300 for `assistant`, 800 for `resumo`, 1500 for `chat`, 2000 for `corrigir`/`relatorio`).

### Components (`app/components/`)

- `ClientWrapper.js` — wraps `{children}` and renders `<PointAssistant />` globally
- `Notificacoes.js` — bell icon with computed notifications from perfil/notas/eventos/lastAccess
- `PointAssistant.js` — floating coach FAB and chat panel (persona: "Assistente Point", preserved through rebrand — the file name is internal)
- `PortalImportModal.js` — modal flow for importing grades from Canvas/Moodle/etc., including extension install steps
- `RichMessage.js` — markdown renderer (react-markdown + remark-gfm + remark-math + rehype-katex) with embedded Recharts for chart blocks
- `Sidebar.js` — shared 264px sidebar used by all 9 interior protected pages (confirmed via grep `import Sidebar`); renders nav, account dropdown, plan modal, edit-profile modal
- `ThemeProvider.js` — applies `dark` class on mount from `pointai_tema`
- `TutorialOverlay.js` — guided tour over interior pages (PLANNED FOR REMOVAL — see Roadmap)
- `UpgradeModal.js` — Pro upsell modal triggered when free-tier limit hit

### `app/lib/`

- `db.js` — Supabase + localStorage data layer (perfil, auth helpers, sign-out wipe)
- `supabase-browser.js` — lazy singleton browser Supabase client
- `plano.js` — plan/limit utility (free vs Pro gating)
- `pdfExport.js` — PDF export helper (jspdf + html2canvas + autotable)

### Chrome Extension

`chrome-extension/` is a Manifest V3 extension that scrapes academic portals (SIGA, Moodle, Canvas, TOTVS, Sapiens, etc.) and hands data to Point:

- `manifest.json` — MV3 config
- `popup.html` / `popup.js` — extension popup UI
- `background.js` — service worker; stores extracted data in `chrome.storage.local` under `pointai_pending_import`
- `content.js` — injected into portal pages; detects context, renders the floating button (CSS id `#pointai-fab` — preserved through rebrand)
- `README.md` — install + usage docs

Build re-zips it into `public/point-extension.zip` via `scripts/pack-extension.js`.

### Styling

Tailwind CSS v4 (PostCSS plugin). Design tokens:
- Primary color: `green-600` (#22c55e); brand gradient `#1a7a4a → #22c55e`
- Pattern: `rounded-2xl` cards; default theme is dark
- Logo: green disk with "P" → `/logo-mark.png`, auto-detected `app/icon.png` (favicon), `app/apple-icon.png`, `app/opengraph-image.png`

### Sidebar Convention

There is no shared layout wrapper. Each of the 9 interior pages imports `Sidebar` directly. The sidebar pattern is a 264px column; when collapsed (`pointai_sidebar_collapsed`) it shrinks to 60px and shows only the logo + icons.

## Roadmap (current — May 2026)

- [x] Logo installed across app (commit `cd4c1ca`)
- [x] Rebrand "Point.AI" → "Point" (commit `c8e879a`)
- [x] CLAUDE.md updated (this commit)
- [ ] Polish onboarding: course/university validation fails for ESPM, Santa Casa, Ciência de Dados, etc. Plan: curated ~200 university + ~150 course lists from INEP/MEC, with free-text fallback
- [ ] Remove `TutorialOverlay` (to be replaced by the new dashboard home)
- [ ] New home at `/dashboard` with cards (resume last chat, upcoming events, grade/absence alerts, shortcuts)
- [ ] Move current chat from `/dashboard` to `/dashboard/chat`
- [ ] Clean up Chat / Conversas / Matérias duplication in sidebar

## Notes for Future Sessions

- Project root: `/Users/antonioinglesi/Desktop/pointai`
- GitHub: `https://github.com/IamNotAntonio/pointai.git`
- Vercel preview: `pointai-two.vercel.app`
- Production: `pointedu.com.br` (DNS in propagation)
- Lint: ~65 pre-existing problems — don't try to fix all, just avoid creating new ones
- No test suite configured
- Imports use relative paths (no `jsconfig` alias)
- macOS, zsh, Node 20+
