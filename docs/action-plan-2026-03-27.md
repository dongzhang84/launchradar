# Dashboard UI Upgrade Action Plan
**Date:** 2026-03-27
**Status:** Completed

---

## Objective
Upgrade the LaunchRadar dashboard UI to match the superior UX patterns found in **socrates-finds-you** dashboard. Focus on reducing click friction and improving information density.

---

## Completed Changes

### Issue 1: Title Click Goes Directly to Link ✅
**Change:** Made `opportunity.title` in `OpportunityCard.tsx` a clickable `<a>` tag pointing to `opportunity.url` with `target="_blank" rel="noopener noreferrer"`. Added hover styling (blue color + underline).
**Commit:** `c87bcaf`

---

### Issue 2: Removed "View Thread" Button ✅
**Change:** Removed the "View Thread" button from `OpportunityCard.tsx`. The clickable title replaces its function. The `ReplyModal` remains accessible via other means for users who want to browse all reply variations.
**Commit:** `9ddc212`

---

### Issue 3: Thread Body Preview Added ✅
**Change:** Added a body preview section in `OpportunityCard.tsx` between the title and "Why relevant". Renders `opportunity.body` truncated to 3 lines (`line-clamp-3`) in muted secondary text. Only renders when `opportunity.body` is non-null — HN posts without body text are unaffected.
**Commit:** `11fe1d6`

---

### Issue 4: Suggested Replies in Modal — Skipped
**Decision:** Not an issue. The `ReplyModal` experience is sufficient for browsing multiple reply variations with pros/cons. Instead, a first-reply preview was added inline (see Bonus below).

---

### Issue 5: Button Text Updated ✅
**Change:** Updated button label from `"Mark Replied"` to `"Mark as Replied"` in `OpportunityCard.tsx`.
**Commit:** `48b4d0c`

---

### Bonus: Inline Suggested Reply on Card ✅
**Problem found during implementation:** `suggestedReplies` was always saved as `[]` during Scan Now. Replies were only generated for the top 5 opportunities at daily digest time.

**Fix (two-part):**

1. **`lib/refresh-opportunities.ts`** — After scoring, generate replies in parallel (`Promise.all`) for all `high` and `medium` intent posts at scan time. `gpt-4o` is used; low-intent posts are skipped to limit API calls and stay within Vercel's 10s timeout. Failures are isolated per post.

2. **`components/OpportunityCard.tsx`** — Added an inline "Suggested Reply" section below the reasoning block:
   - Shows the variation label (e.g. "Direct / Helpful") as a pill badge
   - Displays the reply text in a `bg-slate-50` box with a blue left border, truncated to 4 lines
   - One-click **Copy** button with "Copied ✓" feedback
   - "+N more variations in modal" hint when multiple replies exist
   - Only renders when `suggestedReplies.length > 0`

**Commit:** `eac7a1b`

---

## Files Modified
| File | Changes |
|---|---|
| `components/OpportunityCard.tsx` | Clickable title, removed View Thread button, body preview, inline suggested reply, button text |
| `lib/refresh-opportunities.ts` | Generate replies during scan for high/medium intent posts |

## Files NOT Modified
- `components/ReplyModal.tsx` — kept intact
- `components/DashboardClient.tsx` — no changes needed
- `app/dashboard/page.tsx` — no changes needed
- `app/api/settings/route.ts` — no changes needed (separate sprint)
