# Page Dependency Trees

Local production imports are traced recursively; package imports are omitted. To stay bounded and deduplicated, `→ [name]` inserts the complete named subtree below, and `↩` marks a file already present in that subtree.

## Shared recursive subtrees

### [ui] `src/components/ui.tsx`

- `src/components/ui.tsx`
  - `src/lib/money.ts`
  - `src/lib/types.ts`
  - `src/state/toast.tsx`
  - `src/state/trips.tsx` (type-only `SyncStatus`) → [trips]

### [auth] `src/state/auth.tsx`

- `src/state/auth.tsx`
  - `src/lib/api.ts`
  - `src/lib/storage.ts`
  - `src/lib/types.ts`
  - `src/state/reminders.ts`
    - `src/lib/api.ts` ↩
    - `src/lib/reminders.ts`
      - `src/lib/types.ts` ↩
    - `src/state/toast.tsx`

### [trips] `src/state/trips.tsx`

- `src/state/trips.tsx`
  - `src/lib/api.ts`
  - `src/lib/categories.ts`
    - `src/lib/types.ts`
  - `src/lib/dates.ts`
  - `src/lib/id.ts`
  - `src/lib/ops.ts`
    - `src/lib/categories.ts` ↩
    - `src/lib/split.ts`
      - `src/lib/categories.ts` ↩
      - `src/lib/dates.ts` ↩
      - `src/lib/money.ts`
      - `src/lib/types.ts` ↩
    - `src/lib/types.ts` ↩
  - `src/lib/savedPeople.ts`
    - `src/lib/ops.ts` ↩
    - `src/lib/types.ts` ↩
  - `src/lib/split.ts` ↩
  - `src/lib/storage.ts`
  - `src/lib/types.ts` ↩
  - `src/state/auth.tsx` → [auth]
  - `src/state/toast.tsx`

### [saved-people] `src/components/SavedPeopleSuggestions.tsx`

- `src/components/SavedPeopleSuggestions.tsx`
  - `src/lib/split.ts`
    - `src/lib/categories.ts`
      - `src/lib/types.ts`
    - `src/lib/dates.ts`
    - `src/lib/money.ts`
    - `src/lib/types.ts` ↩
  - `src/lib/types.ts` ↩
  - `src/state/trips.tsx` → [trips]
  - `src/components/ui.tsx` → [ui]

### [layout] `src/pages/Layout.tsx`

- `src/pages/Layout.tsx`
  - `src/components/TripCard.tsx`
    - `src/lib/dates.ts`
    - `src/lib/money.ts`
    - `src/lib/split.ts`
      - `src/lib/categories.ts`
        - `src/lib/types.ts`
      - `src/lib/dates.ts` ↩
      - `src/lib/money.ts` ↩
      - `src/lib/types.ts` ↩
    - `src/lib/tints.ts`
    - `src/lib/types.ts` ↩
    - `src/state/trips.tsx` → [trips]
    - `src/components/ui.tsx` → [ui]
  - `src/components/TripSheet.tsx`
    - `src/lib/dates.ts`
    - `src/lib/money.ts`
    - `src/lib/split.ts`
    - `src/lib/types.ts`
    - `src/state/trips.tsx` → [trips]
    - `src/components/SavedPeopleSuggestions.tsx` → [saved-people]
    - `src/components/ui.tsx` → [ui]
  - `src/components/ui.tsx` → [ui]
  - `src/components/UserMenu.tsx`
    - `src/lib/theme.ts`
    - `src/state/auth.tsx` → [auth]
    - `src/state/reminders.ts`
      - `src/lib/api.ts`
      - `src/lib/reminders.ts`
        - `src/lib/types.ts`
      - `src/state/toast.tsx`
    - `src/state/toast.tsx`
    - `src/state/trips.tsx` → [trips]
    - `src/components/AccountSheets.tsx`
      - `src/lib/share.ts`
      - `src/state/auth.tsx` → [auth]
      - `src/state/toast.tsx`
      - `src/components/ui.tsx` → [ui]
    - `src/components/ui.tsx` → [ui]
  - `src/lib/useMediaQuery.ts`
  - `src/state/trips.tsx` → [trips]

## / (Events dashboard)

Entry: `src/pages/TripsPage.tsx`  
Route wrapper: `src/pages/Layout.tsx`

Dependencies:

- `src/pages/TripsPage.tsx`
  - `src/components/TripCard.tsx`
    - `src/lib/dates.ts`
    - `src/lib/money.ts`
    - `src/lib/split.ts`
      - `src/lib/categories.ts`
        - `src/lib/types.ts`
      - `src/lib/dates.ts` ↩
      - `src/lib/money.ts` ↩
      - `src/lib/types.ts` ↩
    - `src/lib/tints.ts`
    - `src/lib/types.ts` ↩
    - `src/state/trips.tsx` → [trips]
    - `src/components/ui.tsx` → [ui]
  - `src/components/TripSheet.tsx`
    - `src/lib/dates.ts`
    - `src/lib/money.ts`
    - `src/lib/split.ts`
    - `src/lib/types.ts`
    - `src/state/trips.tsx` → [trips]
    - `src/components/SavedPeopleSuggestions.tsx` → [saved-people]
    - `src/components/ui.tsx` → [ui]
  - `src/components/ui.tsx` → [ui]
  - `src/components/UserMenu.tsx`
    - `src/lib/theme.ts`
    - `src/state/auth.tsx` → [auth]
    - `src/state/reminders.ts`
    - `src/state/toast.tsx`
    - `src/state/trips.tsx` → [trips]
    - `src/components/AccountSheets.tsx`
      - `src/lib/share.ts`
      - `src/state/auth.tsx` → [auth]
      - `src/state/toast.tsx`
      - `src/components/ui.tsx` → [ui]
    - `src/components/ui.tsx` → [ui]
  - `src/lib/dates.ts`
  - `src/lib/money.ts`
  - `src/lib/split.ts`
  - `src/lib/useMediaQuery.ts`
  - `src/state/trips.tsx` → [trips]
- `src/pages/Layout.tsx` → [layout]

## /trips/:tripId (Event workspace)

Entry: `src/pages/TripPage.tsx`  
Route wrapper: `src/pages/Layout.tsx`

Dependencies:

- `src/pages/TripPage.tsx`
  - `src/components/CategoriesSheet.tsx`
    - `src/lib/categories.ts`
      - `src/lib/types.ts`
    - `src/lib/dates.ts`
    - `src/lib/id.ts`
    - `src/lib/ops.ts`
      - `src/lib/categories.ts` ↩
      - `src/lib/split.ts`
      - `src/lib/types.ts` ↩
    - `src/lib/types.ts` ↩
    - `src/state/toast.tsx`
    - `src/state/trips.tsx` → [trips]
    - `src/components/CategoryPicker.tsx`
      - `src/lib/categories.ts` ↩
      - `src/lib/id.ts` ↩
      - `src/lib/types.ts` ↩
      - `src/components/ui.tsx` → [ui]
    - `src/components/ui.tsx` → [ui]
  - `src/components/ClaimSheet.tsx`
    - `src/lib/ops.ts`
    - `src/lib/split.ts`
    - `src/lib/storage.ts`
    - `src/lib/types.ts`
    - `src/lib/upi.ts`
      - `src/lib/split.ts` ↩
      - `src/lib/types.ts` ↩
    - `src/state/trips.tsx` → [trips]
    - `src/components/ui.tsx` → [ui]
  - `src/components/ExpenseSheet.tsx`
    - `src/lib/categories.ts`
    - `src/lib/dates.ts`
    - `src/lib/id.ts`
    - `src/lib/money.ts`
    - `src/lib/split.ts`
    - `src/lib/types.ts`
    - `src/state/trips.tsx` → [trips]
    - `src/components/CategoryPicker.tsx`
      - `src/lib/categories.ts` ↩
      - `src/lib/id.ts` ↩
      - `src/lib/types.ts` ↩
      - `src/components/ui.tsx` → [ui]
    - `src/components/LabelCombobox.tsx`
      - `src/lib/split.ts` ↩
      - `src/lib/types.ts` ↩
      - `src/state/trips.tsx` → [trips]
      - `src/components/SavedPeopleSuggestions.tsx` → [saved-people]
      - `src/components/ui.tsx` → [ui]
    - `src/components/SplitPicker.tsx`
      - `src/lib/money.ts` ↩
      - `src/lib/split.ts` ↩
      - `src/lib/types.ts` ↩
      - `src/components/SavedPeopleSuggestions.tsx` → [saved-people]
      - `src/components/ui.tsx` → [ui]
    - `src/components/ui.tsx` → [ui]
  - `src/components/PersonSheet.tsx`
    - `src/lib/dates.ts`
    - `src/lib/ops.ts`
    - `src/lib/split.ts`
    - `src/lib/storage.ts`
    - `src/lib/types.ts`
    - `src/lib/upi.ts`
    - `src/state/toast.tsx`
    - `src/state/trips.tsx` → [trips]
    - `src/components/ui.tsx` → [ui]
  - `src/components/ReminderPrompt.tsx`
    - `src/lib/reminders.ts`
      - `src/lib/types.ts`
    - `src/lib/storage.ts`
    - `src/state/reminders.ts`
      - `src/lib/api.ts`
      - `src/lib/reminders.ts` ↩
      - `src/state/toast.tsx`
    - `src/components/ui.tsx` → [ui]
  - `src/components/SettlementSheet.tsx`
    - `src/lib/dates.ts`
    - `src/lib/id.ts`
    - `src/lib/money.ts`
    - `src/lib/split.ts`
    - `src/lib/types.ts`
    - `src/state/toast.tsx`
    - `src/state/trips.tsx` → [trips]
    - `src/components/ui.tsx` → [ui]
  - `src/components/ShareSheet.tsx`
    - `src/lib/api.ts`
    - `src/lib/share.ts`
    - `src/lib/shareText.ts`
      - `src/lib/dates.ts`
      - `src/lib/money.ts`
      - `src/lib/split.ts`
      - `src/lib/types.ts`
      - `src/lib/upi.ts`
    - `src/lib/types.ts`
    - `src/state/toast.tsx`
    - `src/state/trips.tsx` → [trips]
    - `src/components/ui.tsx` → [ui]
  - `src/components/TripSheet.tsx`
    - `src/lib/dates.ts`
    - `src/lib/money.ts`
    - `src/lib/split.ts`
    - `src/lib/types.ts`
    - `src/state/trips.tsx` → [trips]
    - `src/components/SavedPeopleSuggestions.tsx` → [saved-people]
    - `src/components/ui.tsx` → [ui]
  - `src/components/UpiPay.tsx`
    - `src/lib/money.ts`
    - `src/lib/share.ts`
    - `src/lib/upi.ts`
      - `src/lib/split.ts`
      - `src/lib/types.ts`
    - `src/lib/useMediaQuery.ts`
    - `src/state/toast.tsx`
    - `src/components/UpiQr.tsx`
    - `src/components/ui.tsx` → [ui]
  - `src/components/trip/BalancesPanel.tsx`
    - `src/lib/categories.ts`
    - `src/lib/dates.ts`
    - `src/lib/money.ts`
    - `src/lib/split.ts`
    - `src/lib/types.ts`
    - `src/lib/upi.ts`
    - `src/components/SavedPeopleSuggestions.tsx` → [saved-people]
    - `src/components/ui.tsx` → [ui]
    - `src/components/trip/SettleCategoryMenu.tsx`
      - `src/lib/split.ts`
      - `src/lib/types.ts`
      - `src/components/ui.tsx` → [ui]
  - `src/components/trip/BudgetPanel.tsx`
    - `src/lib/dates.ts`
    - `src/lib/money.ts`
    - `src/lib/split.ts`
    - `src/lib/types.ts`
    - `src/components/ui.tsx` → [ui]
  - `src/components/trip/ExpensesPanel.tsx`
    - `src/lib/categories.ts`
    - `src/lib/dates.ts`
    - `src/lib/money.ts`
    - `src/lib/split.ts`
    - `src/lib/types.ts`
    - `src/components/ui.tsx` → [ui]
  - `src/components/trip/InsightsPanel.tsx`
    - `src/lib/categories.ts`
    - `src/lib/dates.ts`
    - `src/lib/money.ts`
    - `src/lib/split.ts`
    - `src/lib/types.ts`
    - `src/components/ui.tsx` → [ui]
    - `src/components/trip/SettleCategoryMenu.tsx`
  - `src/components/trip/PeoplePanel.tsx`
    - `src/lib/categories.ts`
    - `src/lib/money.ts`
    - `src/lib/split.ts`
    - `src/lib/types.ts`
    - `src/components/ui.tsx` → [ui]
  - `src/components/ui.tsx` → [ui]
  - `src/lib/dates.ts`
  - `src/lib/id.ts`
  - `src/lib/money.ts`
  - `src/lib/share.ts`
  - `src/lib/split.ts`
  - `src/lib/tints.ts`
  - `src/lib/types.ts`
  - `src/lib/upi.ts`
  - `src/lib/useMediaQuery.ts`
  - `src/state/toast.tsx`
  - `src/state/trips.tsx` → [trips]
  - `src/lib/pdf.ts` (lazy)
    - `src/lib/categories.ts`
    - `src/lib/dates.ts`
    - `src/lib/money.ts`
    - `src/lib/split.ts`
    - `src/lib/types.ts`
- `src/pages/Layout.tsx` → [layout]

## /s/:token (Public event view)

Entry: `src/pages/PublicTripPage.tsx`  
Route wrapper: none

Dependencies:

- `src/pages/PublicTripPage.tsx`
  - `src/components/trip/BalancesPanel.tsx`
    - `src/lib/categories.ts`
      - `src/lib/types.ts`
    - `src/lib/dates.ts`
    - `src/lib/money.ts`
    - `src/lib/split.ts`
    - `src/lib/types.ts`
    - `src/lib/upi.ts`
    - `src/components/SavedPeopleSuggestions.tsx` → [saved-people]
    - `src/components/ui.tsx` → [ui]
    - `src/components/trip/SettleCategoryMenu.tsx`
      - `src/lib/split.ts`
      - `src/lib/types.ts`
      - `src/components/ui.tsx` → [ui]
  - `src/components/trip/BudgetPanel.tsx`
    - `src/lib/dates.ts`
    - `src/lib/money.ts`
    - `src/lib/split.ts`
    - `src/lib/types.ts`
    - `src/components/ui.tsx` → [ui]
  - `src/components/trip/ExpensesPanel.tsx`
    - `src/lib/categories.ts`
    - `src/lib/dates.ts`
    - `src/lib/money.ts`
    - `src/lib/split.ts`
    - `src/lib/types.ts`
    - `src/components/ui.tsx` → [ui]
  - `src/components/trip/InsightsPanel.tsx`
    - `src/lib/categories.ts`
    - `src/lib/dates.ts`
    - `src/lib/money.ts`
    - `src/lib/split.ts`
    - `src/lib/types.ts`
    - `src/components/ui.tsx` → [ui]
    - `src/components/trip/SettleCategoryMenu.tsx`
  - `src/components/trip/PeoplePanel.tsx`
    - `src/lib/categories.ts`
    - `src/lib/money.ts`
    - `src/lib/split.ts`
    - `src/lib/types.ts`
    - `src/components/ui.tsx` → [ui]
  - `src/components/ui.tsx` → [ui]
  - `src/components/UpiPay.tsx`
    - `src/lib/money.ts`
    - `src/lib/share.ts`
    - `src/lib/upi.ts`
    - `src/lib/useMediaQuery.ts`
    - `src/state/toast.tsx`
    - `src/components/UpiQr.tsx`
    - `src/components/ui.tsx` → [ui]
  - `src/lib/api.ts`
  - `src/lib/dates.ts`
  - `src/lib/split.ts`
  - `src/lib/types.ts`
  - `src/lib/upi.ts`

## Authentication surface

Entry: `src/pages/AuthPage.tsx`  
Effective route: any non-public URL while anonymous  
Route wrapper: none

Dependencies:

- `src/pages/AuthPage.tsx`
  - `src/components/ui.tsx` → [ui]
  - `src/lib/api.ts`
  - `src/lib/types.ts`
  - `src/state/auth.tsx` → [auth]

## /join/:token (Authenticated invitation)

Entry: `src/pages/JoinPage.tsx`  
Route wrapper: `src/pages/Layout.tsx`

Dependencies:

- `src/pages/JoinPage.tsx`
  - `src/components/ui.tsx` → [ui]
  - `src/lib/api.ts`
  - `src/lib/dates.ts`
  - `src/lib/types.ts`
  - `src/state/toast.tsx`
  - `src/state/trips.tsx` → [trips]
- `src/pages/Layout.tsx` → [layout]

## /pay (Public UPI payment)

Entry: `src/pages/PayPage.tsx`  
Route wrapper: none

Dependencies:

- `src/pages/PayPage.tsx`
  - `src/components/UpiPay.tsx`
    - `src/lib/money.ts`
    - `src/lib/share.ts`
    - `src/lib/upi.ts`
      - `src/lib/split.ts`
        - `src/lib/categories.ts`
          - `src/lib/types.ts`
        - `src/lib/dates.ts`
        - `src/lib/money.ts` ↩
        - `src/lib/types.ts` ↩
      - `src/lib/types.ts` ↩
    - `src/lib/useMediaQuery.ts`
    - `src/state/toast.tsx`
    - `src/components/UpiQr.tsx`
    - `src/components/ui.tsx` → [ui]
  - `src/components/ui.tsx` → [ui]
  - `src/lib/upi.ts`

These are candidate sets, not unconditional payloads. For a design call, select the target page, its visible component branches, `src/index.css`, and the smallest necessary shared subtree under the payload budget.
