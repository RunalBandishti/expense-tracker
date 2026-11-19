# Design System — Expense Manager

## Product context
A Splitwise-style **shared expense & budget tracker** (PWA). Users create "events" (a trip, a party, monthly home costs), invite friends, log expenses with categories/emoji, track a budget, and see exactly who owes whom. Indian-market aware: UPI payments, QR codes, WhatsApp share links. Works offline-first with sync; light + dark themes; mobile-first with a desktop master-detail shell.

**Key pages:** Events home (grid of event cards + total spent), Event detail (budget ring/panel, tabs: Expenses / Balances / Insights / Per person, add-expense FAB), public shared view, UPI pay page, auth.

**JTBD:** "Track what our trip costs and who owes what, without spreadsheets or awkward math at checkout."

## Current design foundations (ground truth)
- **Font:** Inter Variable only; headings `font-semibold tracking-tight`; numerals `tabular-nums`.
- **Palette:** warm paper background `#f6f5f1` / `#f1efea`; white cards, zinc-200 borders, zinc-900/black primary pill buttons; emerald = you-get-back/paid, red = you-owe/over-budget, amber = near budget limit. Pastel avatar tints (10 hues). Full dark-mode token remap.
- **Shape:** pill buttons (rounded-full), rounded-2xl cards, rounded-xl emoji tiles, rounded-3xl empty states, 28px radius sheets.
- **Identity per event:** a user-chosen emoji (e.g. 🏝️ 🎉 🏠) — this is the main "personality" hook already in the product.
- **Motion:** gentle — sheet slide-up, pop-in menus/toasts, hover lift on cards, press scale.
- **Icons:** lucide-react stroke icons.

## Redesign goal (user brief)
The current UI is functional but reads **blank and clinical — no fun, low visual delight, weak intuitive hierarchy**. The redesign keeps all functionality and content structure but injects personality: more color, depth, delight, and at-a-glance intuitive cues (status, progress, who-owes-whom). It should still feel like a trustworthy money app — playful, not toy-like.

## Constraints
- Keep Inter as the font family; keep emerald=positive / red=negative / amber=warning money semantics.
- Keep pill-button DNA and rounded geometry; keep light + dark parity possible.
- Lucide icons + per-event emoji are the iconography; no heavy illustration libraries in product surfaces.
- Mobile-first (bottom sheets, FABs) must survive; desktop is a 20rem-sidebar master-detail.
- All amounts use `tabular-nums`.
