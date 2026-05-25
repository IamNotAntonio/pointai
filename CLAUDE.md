# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # Run ESLint
```

No test suite is configured. There is no `jsconfig.paths` alias — imports use relative paths.

## Environment Variables

`ANTHROPIC_API_KEY` must be set for AI features to work. Add it to `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

## Architecture

Point is a Next.js 16 app (App Router, JavaScript — no TypeScript) targeting Brazilian university students. It is a personal academic assistant powered by the Anthropic SDK (`claude-sonnet-4-5`). The AI feature surfaced inside the product is branded "Point AI"; "Point" alone refers to the platform.

**State persistence**: All user data lives in `localStorage` — no database or auth. The profile is stored under `pointai_perfil`, per-subject chat histories under `chat_<materia>`, grades/absences under `pointai_notas`, and calendar events under `pointai_eventos`. This means all data is browser-local and lost if the user clears storage.

**User flow**:
1. `/` — marketing landing page (static, no client state)
2. `/onboarding` — multi-step wizard that collects `nome`, `curso`, `universidade`, `semestre`, `materias` (comma-separated), and `objetivo`, then writes to `localStorage` and redirects to `/dashboard`
3. `/dashboard` — main chat interface, sidebar lists subjects parsed from `perfil.materias`; each subject has its own chat history; calls `POST /api/chat`
4. `/notas` — grades and absences tracker per subject; computes averages and remaining absences (25% rule)
5. `/calendario` — event calendar (provas, trabalhos, apresentações); urgency coloring based on days remaining
6. `/evolucao` — summary dashboard: overall average, per-subject progress bars, risk alerts (near absence limit or below 7.0), upcoming events in 14 days
7. `/trabalhos` — paper correction; user pastes text, selects type and subject; calls `POST /api/corrigir`

**API routes** (all `'use server'`, no auth):
- `app/api/chat/route.js` — chat endpoint; receives `{ mensagens, perfil, materia }`, builds a system prompt personalized to the student, calls Claude
- `app/api/corrigir/route.js` and `app/api/chat/corrigir/route.js` — both are paper correction endpoints with identical logic (the second appears to be a duplicate)

**Styling**: Tailwind CSS v4 (PostCSS plugin). Design language is green (`green-600`) as the primary brand color, with `rounded-2xl` card pattern and a consistent sidebar layout shared across all interior pages.

**Sidebar pattern**: Every interior page (`/dashboard`, `/notas`, `/calendario`, `/evolucao`, `/trabalhos`) renders its own copy of the 264px sidebar with the same nav links. There is no shared layout component — each page duplicates this sidebar.

**AI model**: All routes use `claude-sonnet-4-5` with `max_tokens: 1500` (chat) or `2000` (correction). The Anthropic client is instantiated at module level in each route file.
