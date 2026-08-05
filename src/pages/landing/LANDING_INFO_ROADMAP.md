# 🎯 Landing Info Pages — Fix Roadmap

> **Date:** July 26, 2026
> **Files:** `Gdpr.jsx`, `Privacy.jsx`, `Terms.jsx`, `Rules.jsx`
> **Mode:** Read (visitor reads and understands)
> **Project context:** Legal/policy pages for LKF Academy — GDPR, Privacy Policy, Terms of Service, and WKF Competition Rules

---

## Critique Summary

These 4 pages serve a **Read** mode purpose — visitors arrive to understand legal policies or view WKF competition rules. They should be clean, trustworthy, and visually consistent with the Landing page.

### Key Issues Found

| # | Issue | Severity | Pages Affected |
|---|-------|----------|----------------|
| 1 | **Wrong accent color** — Used `indigo` instead of Landing's `blue` palette | P1 | All 4 |
| 2 | **Duplicate "Back to Home" buttons** — One in content body + one in footer | P1 | Gdpr, Privacy, Terms |
| 3 | **Footer inconsistent with Landing page** — Bare link instead of clean copyright | P2 | All 4 |
| 4 | **No `usePageTitle` for Rules page** — Missing dynamic title | P2 | Rules |
| 5 | **No skip navigation link** — Unlike Landing page which has one | P2 | All 4 |
| 6 | **No `aria-current="page"` on nav links** | P2 | All 4 |
| 7 | **No `focus-visible` rings on interactive elements** | P2 | All 4 |
| 8 | **Header nav items use smaller padding (`py-2`) vs Landing (`py-3`)** | P3 | All 4 |

---

## ✅ Completed Fixes

### Phase 1: Color & Layout

#### Color Consistency (indigo → blue)

| Page | Changes Made |
|------|-------------|
| **Gdpr.jsx** | Header LKF badge, Sign In button, Back link, email links, footer — all `indigo` → `blue` |
| **Privacy.jsx** | Header LKF badge, Sign In button, Back link, email link, footer — all `indigo` → `blue` |
| **Terms.jsx** | Header LKF badge, Sign In button, Back link, footer — all `indigo` → `blue` |
| **Rules.jsx** | Header LKF badge, Rules tab active, Sign In button, PDF download link, mobile fallback button, footer badge, footer link — all `indigo` → `blue` |

#### Duplicate Back Button Removal

| Page | Change |
|------|--------|
| **Gdpr.jsx** | ✅ Removed footer "← Back to Home" — only the main content back link remains |
| **Privacy.jsx** | ✅ Removed footer "← Back to Home" — only the main content back link remains |
| **Terms.jsx** | ✅ Removed footer "← Back to Home" — only the main content back link remains |
| **Rules.jsx** | ✅ Kept footer "Back to Home" (was the only one) — colors fixed to blue |

#### Sticky Footer Layout

All 4 pages now use `min-h-screen flex flex-col` with `flex-1` on `<main>`, so the footer stays at the bottom even on short-content pages.

---

### Phase 2: Shared Components

#### LandingFooter Component

Created `frontend/src/components/LandingFooter.jsx` — shared footer with:
- Rules • Privacy • Terms • GDPR links row
- Subtle separator
- `© 2026 LKF Academy` copyright
- Dark/light mode support
- `focus-visible:ring` on all links

All 5 landing pages (Landing, Gdpr, Privacy, Terms, Rules) now use the same component.

#### LandingHeader Component

Created `frontend/src/components/LandingHeader.jsx` — shared header with:
- Fixed backdrop-blur shell matching Landing page
- LKF logo + "Academy" brand
- `children` prop for flexible nav links (Sign In alone, or Rules + Sign In)
- Built-in `MobileNav` for mobile
- `focus-visible:ring` on logo link

All 4 info pages now use this component instead of duplicating the header HTML.

---

### Phase 3: Accessibility

#### Skip Navigation Links

All 4 pages now have a skip navigation link as the first focusable element:
- `<a href="#main-content" className="skip-link">Skip to main content</a>`
- `<main id="main-content" tabIndex={-1}>` as the target
- Same `skip-link` CSS class from `index.css` as Landing page

#### Focus-Visible Rings

All interactive elements across all 4 pages now have `focus-visible:ring`:
| Element | Count per page |
|---------|---------------|
| Header LKF logo `<Link>` | 1 |
| Header Sign In `<Link>` | 1 |
| Back to Home `<Link>` (Gdpr/Privacy/Terms) | 1 |
| Rules nav `<Link>` (Rules only) | 1 |
| PDF tab `<button>`s (Rules only) | 2 |
| Download PDF `<a>` (Rules only) | 2 |

---

## Open Issues (Remaining)

| # | Issue | Location | Suggested Fix |
|---|-------|----------|--------------|
| P2 | **No `aria-current="page"`** | All 4 pages header nav | Add `aria-current="page"` when route matches current page |
| P2 | **Rules page lacks `usePageTitle`** | Rules.jsx | Add `usePageTitle('WKF Competition Rules')` |
| P3 | **Header nav uses `py-2` instead of `py-3`** | All 4 pages | Match Landing's `py-3` for consistent touch targets (44px) |
| P3 | **No language switcher** | All 4 pages | Consider adding language toggle like Landing page has via i18n |

---

## Persona Red Flags

### Sam (Accessibility)
- ✅ Color contrast passes (inherits from Landing's CSS variables)
- ✅ **Skip link added** — keyboard users can jump directly to content
- ✅ **`focus-visible` rings added** — keyboard users can see which element is focused
- ❌ **No `aria-current`** — screen reader users can't identify current page in nav

### Jordan (First-Timer)
- ✅ Clear "Back to Home" link near content — easy navigation
- ✅ Clean, readable content layout
- ✅ **Skip link added** — Jordan can jump directly to content with one keypress

---

## Related Files

| File | Role |
|------|------|
| `frontend/src/pages/landing/Gdpr.jsx` | GDPR compliance page (Latvian) |
| `frontend/src/pages/landing/Privacy.jsx` | Privacy Policy page (Latvian) |
| `frontend/src/pages/landing/Terms.jsx` | Terms of Service page (Latvian) |
| `frontend/src/pages/landing/Rules.jsx` | WKF Competition Rules viewer (PDF) |
| `frontend/src/pages/Landing.jsx` | Reference implementation for colors/patterns |
