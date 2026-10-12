# Retheme - Refactor

## Description
A visual retheme of the site to a clean, professional "atelier" style for hand crafted wedding keepsakes. Functionality is unchanged; only layout and styling were reworked.

## Basic Principles
- Products are hand crafted wedding items
- Calm, editorial feel: lots of whitespace, flat bordered panels, no drop shadows
- Serif headings, sans-serif body text
- Square (or 2px) corners everywhere; no rounded cards
- One strong action colour (ink); everything else is neutral

## Design tokens
Defined in `client/src/helpers/theme.ts` as `ui`. Use these rather than hard-coded colours.

| Token | Value | Use |
|---|---|---|
| `ui.page` | `#FAF8F5` | Page background (ivory), table header fills |
| `ui.sand` | `#F1ECE4` | Image placeholders, selected rows, badges, admin panels |
| `ui.line` | `#E4DDD3` | All borders and dividers |
| `ui.ink` | `#2B2623` | Text, primary buttons, announcement bar |
| `ui.inkHover` | `#4A413B` | Primary button hover |
| `ui.muted` | `#6F675F` | Secondary text, labels |
| `ui.accent` | `#5E7060` | Sage; basket count, NEW badge, brand colour |
| `ui.serif` | Georgia | Headings and product names |

Sale prices use red; the unread-blog dot is red.

The original pastel palette (pink, blue, yellow, green) is still in the theme as `pale-*` colours but is no longer used for page chrome.

## Component patterns
- **Page header:** small uppercase letter-spaced label above a serif `h1` (e.g. "Your account" / "Profile"). Use `SectionHeading` for panel titles.
- **Panels:** white background, 1px `ui.line` border, `medium` padding, no radius or elevation.
- **Buttons:** always use `ActionButton` (`features/landingPage/components/ActionButton.tsx`). Primary is solid ink; `secondary` is outlined. Props: `secondary`, `fixed` (min 130px, no flex), `compact` (smaller, for tight spaces such as shop tiles). Raw grommet `<Button label>` with `buttonStyles` is no longer used for labelled buttons (`buttonStyle.test.ts` enforces this).
- **Form fields:** small uppercase muted label above a square input (`borderRadius: 0`).
- **Tables:** flat bordered, `ui.page` header row, uppercase small headings, `ui.line` row dividers.
- **Page width:** content pages centre at max 1100px (`width={{ width: '100%', max: '1100px' }}`); without `width: '100%'` the box shrinks to its content.
- **Placeholders:** missing product images show a sand tile with "No Image" (not a broken image).

## Modals
- Consistent style regardless of use: square corners, white, serif title, outlined "Close" button, `responsive={false}`, max height 90vh with scroll.
- Shared shell: `components/modals/common-modal.tsx`.
- Stacking: the header is `z-index: 100`; modals (`layer`) are 200 and dropdowns (`global.drop`) are 300 in `appTheme`, so tall modals sit above the header and dropdowns open above modals.

## Navigation
- Simple, uppercase letter-spaced links on the left; icons (notifications, basket with count, profile) on the right
- Logo central and sticky to the top
    - Click event = homepage redirect
- Announcement bar above the header
- Admin Tools link only shown to admins

## Pages

### Done
- **Header / navigation / footer**
- **Homepage:** hero, login / welcome panel, "Most Popular" gallery tiles beside "The Keepsake Journal" (latest post, popular reads)
- **Shop:** category tabs with counts, search and filter bar, hover-reveal tiles (Add to Basket / View Details stacked, both dark)
- **Product modal:** two-column image gallery and details; shared by Shop and homepage
- **Blog:** feature card for the latest post, card grid, post page, create-post modal; NEW badge
- **Admin tools:** tabs (Users, Products, Reports, Audit log) with an Add / Update / Delete switch; select a user to edit or delete without a Submit step
- **Profile:** details and password panels, invoices list
- **Invoice modal:** summary, addresses, items table, admin "Manage invoice" panel
- **Basket:** item list with quantity steppers, sticky order summary, delivery address modal
- **Login / Registration:** inline panels on the homepage (Sign In, Register, toggle links); `/Register` route; `POST /api/auth/register` creates a customer account (min 8 char password, 409 on duplicate email)

### Still to do
- About
- Contact Us (the `/Contact` route does not exist yet)
- Notifications (the bell is present but the `/notifications` route does not exist yet)
- Admin Reports (placeholder only)
