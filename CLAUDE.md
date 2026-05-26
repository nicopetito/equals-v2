# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ Critical version warnings

**Next.js 16.2.6** — breaking changes from what most models have in training data. Check `node_modules/next/dist/docs/` before writing Next.js-specific code.

**Tailwind CSS v4** — not v3. No `tailwind.config.js`. Configuration is CSS-first: `@import "tailwindcss"` in `globals.css`, custom tokens as CSS variables (not `theme.extend`). Arbitrary values like `border-[var(--border)]` are the norm here.

## Commands

```bash
npm run dev        # Start dev server (localhost:3000)
npm run build      # Production build
npm run lint       # ESLint
npx tsc --noEmit   # Type-check without emitting (no test suite exists)
```

## Architecture

### Route groups
- `app/(auth)/` — login, register (public, no sidebar)
- `app/(dashboard)/` — all protected pages; wrapped by `DashboardLayout` via `app/(dashboard)/layout.tsx`
  - dashboard, transactions, wallets, goals, budgets, categories, scheduled, dollar, import, achievements, calendar, estadisticas, plazo-fijo

### Auth middleware
`proxy.ts` at root (not `middleware.ts`) — redirects unauthenticated users to `/login`, authenticated users away from auth pages. PUBLIC_PATHS: `/login`, `/register`, `/forgot-password`.

### Data layer pattern
Every entity follows the same three-layer pattern:

1. **Type** in `types/<entity>.ts`, re-exported from `types/index.ts`
2. **Service** in `services/<entity>.service.ts` — all Supabase calls live here; each method calls `getUserId()` first and throws on error
3. **Hook** in `hooks/use<Entity>.ts` — thin wrapper managing loading/error/data state, exposes `refetch()`

Pages import the hook for reads and the service directly for mutations.

Available services: transactions, wallets, goals, budgets, categories, scheduled, fixed_term, refund, calendar_tasks, transaction_template, exchange (external API).

### Supabase quirks — read carefully
- **NUMERIC/DECIMAL columns come back as strings**, not numbers. Always wrap with `safeNumber()` from `utils/format.ts` before arithmetic. Do this in the service layer (see `wallets.service.ts`, `goals.service.ts`).
- **Read-only views** — never insert/update: `wallet_current_balance`, `transactions_with_details`, `transaction_monthly_summary`
- Auth: `createClient()` from `lib/supabase/client.ts` in services/hooks (browser); `lib/supabase/server.ts` for server components.
- All user data is scoped with `.eq('user_id', user_id)` — never omit this filter.
- Relational selects use Supabase FK syntax: `select('*, categories(name, color, icon)')` — map results in the service.

### Goals / Wallets — non-atomic mutations
`goalsService.deposit()` and `goalsService.withdraw()` are 3-step operations (transaction → goal update → movement log) with no RPC wrapping. If one step fails mid-flight, state can be inconsistent. Keep this in mind when modifying these flows.

### External API
`services/exchange.service.ts` fetches USD/EUR rates from `bluelytics.com.ar`. Uses `next: { revalidate: 60 }` for a 60-second cache. Never call this from client components directly — route through the service.

### Design system
All visual tokens are CSS variables in `app/globals.css`:
- Colors: `--brand-500` (#6d3bd7), `--bg-card` (#fff), `--bg-base` (#F4F5F9), `--border` (#E4E7EF), `--text-primary/secondary/muted/faint`
- Semantic: `--income-*` (green), `--expense-*` (rose), `--goal-*` (sky blue)
- Shadows: `--shadow-sm` (resting), `--shadow-md` (hover), `--shadow-xs` through `--shadow-xl`
- Fonts: `--font-sora` (headings, numbers, `tabular-nums`), `--font-inter` (body)
- Hero gradient: `linear-gradient(135deg, #6d3bd7 0%, #0566d9 100%)`
- Card pattern: `rounded-2xl bg-card border border-[var(--border)] shadow-[var(--shadow-sm)]`, hover `translateY(-1px)` + `--shadow-md`
- Glass: `--glass-bg` (rgba white 0.15), `--glass-border` (rgba white 0.25)

### Shared utilities
- `safeNumber(v)` — converts any value to finite number (0 on failure)
- `formatCurrency(amount, currency)` — formats with correct symbol for ARS/USD/EUR/CRYPTO
- `utils/currency.ts` — exchange calculation helpers (`calculateExchange`)
- `utils/date.ts` — `formatDate()`, `getDateRangeForPeriod()`, `PERIOD_OPTIONS` ('7_days' | '30_days' | '90_days' | 'this_month' | 'last_month' | 'this_year')
- `utils/achievements.ts` — milestone unlock logic
- `utils/csv.ts` — CSV parsing for bank imports
- `utils/merchant-rules.ts` — auto-categorization hints from merchant names
- `utils/refund.ts` — refund pairing logic

### Key UI components
- `Modal` — overlay glass modal; props: `open`, `onClose`, `title`
- `PageHeader` — gradient hero header; props: `icon`, `title`, `subtitle`, `layout` (`"centered"` default | `"split"` for title-left/CTA-right)
- `EmptyState` — built-in SVG illustrations via `type`: `'wallets' | 'transactions' | 'goals' | 'categories' | 'scheduled' | 'dollar'`
- `Button` — `variant`: `primary`/`secondary`; `size`; `loading`
- `Input`, `Select` — styled form controls
- `ToastProvider` / `useToast()` — `addToast(message, 'success' | 'error' | 'info')`
- `AnimatedAmount` — counter animation for number reveals
- `ConversionModal` — ARS↔USD/EUR inline conversion widget
- `HelpButton` / `HelpDrawer` — in-app help system; content defined in `components/help/helpContent.ts`
- `FAB` — floating action button for quick transaction entry
- `HealthScore` — financial wellness score display
- `ReportModal` — export/share financial summaries
- Chart components (Recharts wrappers): `BudgetVsActualChart`, `CategoryDonutChart`, `IncomeExpenseChart`, `NetWorthSparkline`

### Auth
`AuthProvider` wraps the whole app and exposes `useAuth()` → `{ user, loading, signIn, signUp, signOut }`. Services call `getSupabase().auth.getUser()` directly rather than reading from context, so they work outside React trees.
