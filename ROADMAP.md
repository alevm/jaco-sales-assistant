# Jaco — Product Roadmap

> Last updated: 2026-03-18

Items ranked by impact on core value proposition (accurate margin tracking + time-saving AI workflows for vintage resellers).

---

## P0 — Critical (blocks real-world usage)

| # | Item | Source | Why |
|---|------|--------|-----|
| 1 | **Multi-marketplace per item** — replace single `marketplace` field with `item_listings` table (many-to-many). Cross-listing status tracking. | Sales, PM | Real resellers list on 3-4 platforms. Current data model makes this impossible and gets harder to migrate later. |
| 2 | **Shipping costs in margin calculation** — add `shipping_cost` field, include in margin formula | Sales, PM | Margins are wrong without this. A 25 EUR Vinted sale with 5 EUR shipping is 20% less profit than displayed. |
| 3 | **More marketplaces** — Depop, Vestiaire Collective, Wallapop, Subito, Facebook Marketplace | Sales | Huge share of Italian vintage moves on these platforms. Fee structures vary significantly. |
| 4 | **Accurate fee model** — variable fees by category, seller tier, country. Boost costs. | Sales | Current flat 13% eBay / 0% Vinted is a rough approximation. Wrong fees = wrong margins. |
| 5 | **ARIA labels on icon-only buttons** (image remove, copy, etc.) | UX/A11y | WCAG 4.1.2 failure. Screen readers can't identify button purpose. |
| 6 | **Color-blind safe status badges** — add icons or text patterns alongside color | UX/A11y | WCAG 1.4.1. Draft/listed/sold are color-only. ~8% of male users are colorblind. |

---

## P1 — High (significant value for daily users)

| # | Item | Source | Why |
|---|------|--------|-----|
| 7 | **AI pricing suggestions** — suggest price based on item attributes, brand, era, condition | Sales, PM | Key AI differentiator competitors can't match. Currently the AI recognizes but doesn't advise on price. |
| 8 | **Inventory aging dashboard** — days since listed, stale item alerts (30+ days), repricing nudges | PM | Items sitting unsold lose value. No visibility into this currently. |
| 9 | **Bulk operations** — multi-select items for status change, lot assignment, delete | PM, UX | Adding 50 items from a bale one-by-one is painful. Daily resellers need this. |
| 10 | **Standardized condition grading** — NWT, NWOT, Excellent, Good, Fair, Poor mapped to marketplace labels | Sales | Current freeform text is inconsistent. Industry-standard scales map to buyer expectations. |
| 11 | **Era sub-categories** — 60s mod, 70s disco, 80s power, 90s minimalist, Y2K | Sales | Era is the #1 pricing driver in vintage. A single field loses critical nuance. |
| 12 | **Item detail page progressive disclosure** — tabs or collapsible sections instead of wall of fields | UX | 8+ sections overwhelm daily users. Power users need fast scanning. |
| 13 | **Sold workflow trigger** — prompt for sold_price, date, delist from other platforms on status change | Sales, PM | Currently just a status toggle. Real workflow has multiple steps. |
| 14 | **Seasonal description awareness** — factor season into pricing language and description tone | Sales | Wool coats in July need different framing than in November. |
| 15 | **Dashboard date picker** — quick presets (This month, Last 30 days, This quarter) + date range widget | UX | Currently raw `from`/`to` params. Daily users need one-click time ranges. |

---

## P2 — Medium (quality of life)

| # | Item | Source | Why |
|---|------|--------|-----|
| 16 | **CSV/accounting export** — items, sales, margins | PM | Can't integrate with tax or accounting systems. Italian resellers need this for fiscal compliance. |
| 17 | **Keyboard shortcuts** — Ctrl+N new item, Ctrl+S save, arrow keys between items | UX | Power resellers adding 20 items/day need fast navigation. |
| 18 | **Skip-to-content link** | UX/A11y | WCAG 2.4.1. Keyboard users have to tab through sidebar on every page. |
| 19 | **`aria-current` on active sidebar nav** | UX/A11y | WCAG 4.1.2. Screen readers can't identify current page. |
| 20 | **Accessible delete confirmation** — styled modal with focus management instead of `confirm()` | UX/A11y | WCAG 4.1.2. Browser confirm() isn't screen reader friendly. |
| 21 | **Lightbox focus trap + restore** — proper focus management on image modal open/close | UX/A11y | WCAG 2.4.3. Focus may get lost when modal closes. |
| 22 | **`aria-live` on margin calculator** — announce dynamic updates to screen readers | UX/A11y | WCAG 4.1.3. Calculated values update silently for assistive tech. |
| 23 | **Table `<caption>` and `<th scope>`** on dashboard tables | UX/A11y | WCAG 1.3.1. Tables lack semantic structure for screen readers. |
| 24 | **Consistent UI language** — pick Italian or English for interface (currently mixed) | UX | Sidebar says "Inventario" / "Nuovo Capo" but other labels are in English. Confusing. |
| 25 | **Inventory sort options** — by date, price, status, brand | UX | Currently only newest-first. Resellers want to sort by price to find repricing candidates. |
| 26 | **Client-side form validation** — required fields, format checks before submission | UX | No validation currently. Silent failures on bad input. |
| 27 | **Unsaved changes warning** — prompt before navigating away from edited forms | UX | Easy to lose work on the long item detail form. |

---

## P3 — Low (future growth)

| # | Item | Source | Why |
|---|------|--------|-----|
| 28 | **Direct marketplace API integration** — push listings to Vinted/eBay via API | PM | Eliminates copy-paste. Major time save but complex to build and maintain. |
| 29 | **Multi-user support** — roles, permissions for small teams/shops | PM | Can't scale beyond single operator. |
| 30 | **First-time onboarding flow** — guided empty-state experience | UX | New users see empty dashboard with no guidance. |
| 31 | **Loading skeleton improvements** — `aria-busy` announcements | UX/A11y | WCAG 4.1.3. Low impact but proper practice. |
| 32 | **Mobile table horizontal scroll** — indicator for overflowing dashboard tables | UX | Tables can overflow on small screens without visual cue. |

---

## Notes

- P0 items should be addressed before onboarding new users
- Data model change (#1) should happen first — other features depend on it
- Accessibility fixes (#5, #6) are low-effort, high-impact — can be done alongside any sprint
- Fee accuracy (#4) is an ongoing concern — consider making fees configurable per marketplace rather than hardcoded
