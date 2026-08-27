Redesign the School Feed page as a **CSS-only visual refresh** of the existing design language (same blue identity, no template/structure changes) — zero risk to behavior, tests, and Firebase logic. All changes live in the feed CSS block of `src/styles.css` (~lines 691–947). Both teacher and student views get the redesign automatically since they share the same components.

## Test contracts preserved (verified against all 4 feed specs)
- Like/comment buttons keep exact `thumb_up` / `chat_bubble` text content, order, and aria-labels.
- Dialogs stay teleported to body; delete button keeps exact "Delete post" text.
- All asserted classes stay: `.feed-sticky-controls`, `.feed-filter-bar button`, `.feed-achiever-ranking li` + `.tier-*`, `.feed-post-actions button`, `.feed-post-body-collapsed`, `.feed-post-edit-form`, composer form/textarea/select contracts.
- No template edits at all.

## Redesign by area

**1. Sticky header + intro**
- Frosted glass bar: `rgba(247,249,252,.88)` + 14px blur + bottom hairline (replaces current gradient).
- "Live updates" badge: proper green pill (soft tint bg, border, pulsing dot kept).
- Heading hierarchy refined; eyebrow pill + Manrope 800 h2 retained.

**2. Filter chips**
- Full-pill chips: transparent at rest, blue gradient fill + white text when active; count badges as neutral pills (white/25 on active); hover + focus-visible rings; 36px touch height.

**3. Composer (teacher + student)**
- Blue-tinted card (`#f5f8ff`, hairline border, 16px radius) replacing the left-border style; composer icon becomes a 40px gradient-blue rounded tile with white icon; cleaner textarea focus ring; footer counter styling; success/error status refinement.

**4. Post cards**
- 16px radius, hairline border, soft resting shadow, hover lift (+1px translate, deeper shadow, tinted border).
- Replace colored 2px top borders with per-type tinted icon tiles (42px rounded-square): achievement purple, attendance green, announcement amber, student warm, teacher blue; student photo avatars stay circular.
- Byline/meta typography refinement; type chips (QUIZ / LECTURE / EVENTS) as colored pills.

**5. Achievers block**
- Softer lavender gradient panel; "N students ranked" overview with white icon chip.
- Rank badges: gold/silver/bronze gradient circles; row hover; score as a white pill; centered "View N more" toggle.

**6. Attendance summary**
- Green-tinted panel with white count tile (green gradient number, Manrope 800), refined labels.

**7. Engagement footer**
- Counts row as small muted text above a hairline; like/comment become 40px round buttons on soft gray fill; liked state = blue tint + filled icon + slight pop.

**8. Comments**
- 30px blue-gradient avatar circles (matching the new account avatar language); bubble with `#f7f9fd` fill + hairline border; centered "View all N comments" toggle.

**9. End-of-feed + load more**
- "You're up to date." becomes a centered pill with a `check_circle` icon (pure CSS `::before`, Material font); "Load older posts" as a full-width soft secondary button.

**10. Context rail (right sidebar)**
- Cards: white, 16px radius, hairline borders; community card gets gradient icon tile; "What appears here" legend rows get 34px per-type tinted icon tiles matching the post icons (visual language alignment) with hover states; privacy notes become soft callout cards with icon chips.

**11. Dialogs + responsive**
- Light polish on comment/delete dialogs (radii, icon chips) preserving all text contracts.
- Existing breakpoints (1120px rail collapse, 760px mobile, 359px small) adjusted only where new paddings/radii need it; sticky offsets and mechanics unchanged.

## Verification
1. `npm run typecheck`
2. `npx vitest run` (full suite — all 4 feed specs must stay green)
3. Live check via DOM snapshot on the signed-in session at /admin/feed (HMR); screenshot if the capture surface cooperates.