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

**Current `pointai_notas` model (to be refactored soon):** an object keyed by matéria, shaped `{materia: {notas: ['', '', ''], faltas, totalAulas}}` — 3 fixed grade slots per subject. NOTE: this model will be evolved to support N avaliações with `nome` + `nota` + `peso` per assessment.

`signOut()` in `lib/db.js` wipes all localStorage keys on logout.

#### Cérebro Point — Supabase-backed graph (D.4)

The "Cérebro Point" feature persists a knowledge graph per user+matéria in
two Supabase tables. Run these migrations in the Supabase SQL editor
before D.4 features work:

```sql
CREATE TABLE conceitos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  materia text NOT NULL,
  nome text NOT NULL,
  descricao_curta text,
  peso int DEFAULT 1,
  is_seed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, materia, nome)
);

CREATE TABLE conexoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  conceito_a_id uuid REFERENCES conceitos(id) ON DELETE CASCADE NOT NULL,
  conceito_b_id uuid REFERENCES conceitos(id) ON DELETE CASCADE NOT NULL,
  forca int DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, conceito_a_id, conceito_b_id)
);

CREATE INDEX idx_conceitos_user_materia ON conceitos(user_id, materia);
CREATE INDEX idx_conexoes_user ON conexoes(user_id);

ALTER TABLE conceitos ENABLE ROW LEVEL SECURITY;
ALTER TABLE conexoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner all conceitos" ON conceitos
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner all conexoes" ON conexoes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

After each AI turn in Chat.jsx, a fire-and-forget POST to
`/api/extrair-conceitos` runs Claude Haiku 4.5 over the user+AI
exchange, upserts the extracted concepts (case-insensitive match on
`nome`), and connects every pair. The free tier caps at 500 total
connections per user; Pro is unlimited.

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

## Regras Críticas de Segurança

These rules document what has already been implemented and what to keep enforcing. Treat them as non-negotiable when touching auth, AI routes, or payments.

- **Autenticação:** SEMPRE validar o usuário via `auth.getUser()` (valida o JWT do cookie no servidor), NUNCA confiar em `getSession()` sozinho (lê o cookie sem verificar). O helper `requireUser()` em `app/lib/supabase-server.js` faz essa validação — use-o nas rotas.
- **Rotas de IA que leem dados do usuário** (`chat`, `assistant`, `corrigir`, `analisar`, `resumo`, `simulado`, `importar`, `plano`, `relatorio`, etc.) DEVEM ler o perfil do Supabase filtrado pelo `user_id` da sessão. NUNCA confiar no perfil/dados vindos do body do cliente (risco de spoofing). Corrigido no commit `3fd04d0`.
- **Chat:** o PERFIL do Supabase é a fonte de verdade absoluta. Ignorar qualquer perfil contraditório que apareça no histórico da conversa.
- **`SUPABASE_SERVICE_ROLE_KEY`:** server-only, NUNCA expor ao cliente (não usar em código client-side, não prefixar com `NEXT_PUBLIC_`).
- **Pagamentos (Mercado Pago):** NUNCA confiar em preço/plano vindo do cliente — validar server-side. O status da assinatura é sincronizado via webhook (`/api/webhook-mp`).
- **Queries Supabase:** usar colunas explícitas no `select()`, evitar `select('*')`. Adicionar `.limit()` em queries que podem crescer.
- **Validar input** nas rotas de API antes de usar (fail fast com mensagem clara).

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

- Project root: `/Users/antonioinglesi/dev/pointai` (moved out of iCloud)
- Also developed on Windows PC at `C:\dev\pointai` — sync via GitHub (`git pull` antes de começar, `git push` ao terminar; nunca trabalhar nas duas máquinas sem sincronizar).
- GitHub: `https://github.com/IamNotAntonio/pointai.git`
- Vercel preview: `pointai-two.vercel.app`
- Production: `pointedu.com.br` (DNS in propagation)
- Lint: ~65 pre-existing problems — don't try to fix all, just avoid creating new ones
- No test suite configured
- Imports use relative paths (no `jsconfig` alias)
- macOS, zsh, Node 20+

## ECC (ferramenta de dev)

This project uses the **ECC** plugin (`ecc@ecc`) inside Claude Code, with its `rules/common` and `rules/typescript` rule sets installed under `~/.claude/rules/ecc/`.

- **MCPs do ECC:** desativados de propósito (economia de contexto).
- **Agentes úteis:** `database-reviewer` (revisar mudanças no Supabase — queries, schema, RLS, migrations) e `build-error-resolver` (resolver erros de build).
- **Skill:** `/security-scan`.
