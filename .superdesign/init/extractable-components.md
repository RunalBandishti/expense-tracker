# Extractable Components

## Layout Components

## ResponsiveLayout
- Source: `src/pages/Layout.tsx`
- Category: layout
- Description: Authenticated responsive shell that adds a 20rem event sidebar at desktop width.
- Extractable props: none
- Hardcoded: 1024px desktop breakpoint, sticky full-height shell, all CSS

## Sidebar
- Source: `src/pages/Layout.tsx`
- Category: layout
- Description: Desktop navigation with brand, event creation, event cards, account control, and sync state.
- Extractable props: `activeTripId` (string), `homeHref` (string, default: `"/"`), `pendingCount` (number, default: `0`)
- Hardcoded: Expense Manager branding, “New event”, Plus icon, “Events” label, all CSS

## UserMenu
- Source: `src/components/UserMenu.tsx`
- Category: layout
- Description: Shared account menu for theme, reminders, credentials, recovery, and logout.
- Extractable props: `showName` (boolean, default: `false`)
- Hardcoded: Sun/Moon/Monitor/Bell/KeyRound/LifeBuoy/LogOut icons, action labels, all CSS

## Sheet
- Source: `src/components/ui.tsx`
- Category: layout
- Description: Bottom sheet on mobile and centered dialog above 640px.
- Extractable props: none
- Hardcoded: Cancel/Save defaults, drag handle, backdrop behavior, 28px radius, all CSS

## Basic Components

## Button
- Source: `src/components/ui.tsx`
- Category: basic
- Description: Pill action with primary, secondary, ghost, and danger variants.
- Extractable props: `disabled` (boolean, default: `false`)
- Hardcoded: variant and size classes, all CSS

## Menu
- Source: `src/components/ui.tsx`
- Category: basic
- Description: Portaled action menu with automatic vertical placement.
- Extractable props: none
- Hardcoded: 8px anchor gap, 280px flip threshold, row composition, all CSS

## SegmentedControl
- Source: `src/components/ui.tsx`
- Category: basic
- Description: Horizontally scrollable tab/segment switcher.
- Extractable props: `currentTab` (string)
- Hardcoded: tab roles, selected/unselected classes, 375px type adjustment, all CSS

## SyncBadge
- Source: `src/components/ui.tsx`
- Category: basic
- Description: Saved, saving, or offline state indicator.
- Extractable props: `status` (`"saved" | "saving" | "offline"`), `pendingCount` (number, default: `0`)
- Hardcoded: Check/LoaderCircle/CloudOff icons, state labels, all CSS

## Avatar
- Source: `src/components/ui.tsx`
- Category: basic
- Description: Deterministic initial avatar with ten semantic tones.
- Extractable props: none
- Hardcoded: tone hashing, fallback initial, xs/sm/md/lg sizes, all CSS

## AvatarStack
- Source: `src/components/ui.tsx`
- Category: basic
- Description: Overlapping participant avatars with an overflow count.
- Extractable props: `max` (number, default: `4`)
- Hardcoded: negative overlap, white rings, overflow badge, all CSS

## ProgressBar
- Source: `src/components/ui.tsx`
- Category: basic
- Description: Gradient budget progress that shifts from emerald to amber to red.
- Extractable props: none
- Hardcoded: 85% warning and 100% over-budget thresholds, gradient tones, all CSS

## RingGauge
- Source: `src/components/ui.tsx`
- Category: basic
- Description: Circular percentage gauge used in the dashboard spend summary.
- Extractable props: none
- Hardcoded: 34-unit radius, 9-unit stroke, white track/progress, all CSS

## Sparkline
- Source: `src/components/ui.tsx`
- Category: basic
- Description: Compact area-line chart for recent spending activity.
- Extractable props: none
- Hardcoded: 100×28 coordinate system, 2-unit stroke, current-color fill/stroke

## EmptyState
- Source: `src/components/ui.tsx`
- Category: basic
- Description: Dashed empty/error card with animated emoji, copy, and optional action.
- Extractable props: `showAction` (boolean, default: `false`)
- Hardcoded: card composition, emoji bob animation, all CSS

## TripCard
- Source: `src/components/TripCard.tsx`
- Category: basic
- Description: Tinted event summary card reused by the dashboard and desktop sidebar.
- Extractable props: `active` (boolean, default: `false`), `tripHref` (string)
- Hardcoded: status labels, event route shape, deterministic tint palette, trophy settled badge, all CSS

## UpiPayPanel
- Source: `src/components/UpiPay.tsx`
- Category: basic
- Description: UPI identity, amount, app-launch, QR, and safety panel.
- Extractable props: `showQr` (boolean; defaults from pointer type)
- Hardcoded: app labels, ₹1,00,000 warning, Copy/QrCode/TriangleAlert icons, safety copy, all CSS

## BudgetPanel
- Source: `src/components/trip/BudgetPanel.tsx`
- Category: basic
- Description: Spend, budget progress, remaining, per-day, and timing summary.
- Extractable props: `showSetBudget` (boolean, default: `false`)
- Hardcoded: Spent/Remaining/Over budget/Progress labels, all CSS

## BalancesPanel
- Source: `src/components/trip/BalancesPanel.tsx`
- Category: basic
- Description: Settlement, category debt, per-person balance, and payment-history panel.
- Extractable props: `activePersonId` (string or null), `expandedPersonId` (string or null), `showPay` (boolean), `showRequest` (boolean), `showSettle` (boolean), `showEditPeople` (boolean), `showAddPerson` (boolean)
- Hardcoded: section labels, payment/warning copy, icons, all CSS

## ExpensesPanel
- Source: `src/components/trip/ExpensesPanel.tsx`
- Category: basic
- Description: Date-grouped expense list shared by private and public event views.
- Extractable props: `showAdd` (boolean), `showEdit` (boolean), `showDelete` (boolean)
- Hardcoded: empty-state copy, action labels and icons, all CSS

## InsightsPanel
- Source: `src/components/trip/InsightsPanel.tsx`
- Category: basic
- Description: Category distribution and daily spending chart.
- Extractable props: `showManageCategories` (boolean), `showSettleCategory` (boolean)
- Hardcoded: section labels, red over-budget bars, 62-day cap, all CSS

## PeoplePanel
- Source: `src/components/trip/PeoplePanel.tsx`
- Category: basic
- Description: Per-person spending cards with category details and average.
- Extractable props: `activePersonId` (string or null)
- Hardcoded: Per person/Avg/Personal/Shared/Paid labels, warnings, all CSS
