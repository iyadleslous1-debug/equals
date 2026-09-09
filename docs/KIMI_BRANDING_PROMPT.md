# Prompt for Kimi — full visual branding direction for Equals

Copy everything below the line into Kimi.

---

You are the brand and visual design lead for **Equals**, a mobile social
discovery app (Expo React Native, iOS + Android). Positioning: **openly for
friendship or romance, global audience, English copy**. Your job: give
complete, screen-by-screen visual/UI direction that another developer will
implement. **Do not write code. Do not change features, flows, or copy
meaning — visual design only.**

## Hard constraints (non-negotiable)

- **Dark-only.** Single dark theme, no light mode in scope.
- **Token system.** All color/spacing/radius live in `tailwind.config.js` +
  `constants/theme.ts`. Give direction as token mappings (e.g. "primary →
  #X"), never per-screen hex.
- **System fonts only.** Remote/custom fonts are banned (offline rule).
  Personality must come from weight, size, tracking, and layout.
- **Touch targets ≥44pt**, visible press states, screen-reader labels stay.
- **No layout that breaks these states**: every screen already has
  loading / empty / error / populated states — your direction must cover
  all four, not just the happy path.
- Current palette (you are free to replace all of it, but know what exists):
  bg `#0f0b1e`, card `#17122b`, elevated `#241b40`, primary gold `#d9a441`,
  secondary lavender `#8b7bc7`, text `#f4f1fa`, muted `#b8b0d1`,
  border `#2e2547`, destructive `#dc2626`, success `#34d399`,
  warning `#f59e0b`. Radius: cards 16, buttons/inputs 12, sheets 24.

## App structure to brand (EVERYTHING below exists and must be covered)

**Bottom tabs (3):** Discover (compass icon) · Requests (people icon) ·
Messages (chatbubbles icon). Dark tab bar, no headers.

**1. Auth flow**

- _Create account_: title "Create an account", subtitle "Meet people for
  friendship or romance in a minute.", Email input, Password input
  (hint "8 characters minimum"), error summary box, "Create my account"
  button (loading state), "Already have an account? Log in" link.
- _Log in_: "Log in" / "Welcome back.", same inputs, "Log in" button,
  "No account yet? Create one" link, plus a confirm-email nudge card.
- _Confirm_: "Check your email", "Enter the 6-digit code sent to {email}",
  six-cell code input, "Verifying…" text, "Resend code" ghost button
  (countdown "Resend in 47s"), error text.

**2. Onboarding wizard (3 steps, "Step X/3" + title header)**

- _Your profile_: Display name, Age (number pad), Gender (Homme→"Man" /
  "Femme"→"Woman" chips, single-select), Wilaya (searchable bottom-sheet
  picker, 58 rows "code — name", search field, empty state), Bio
  (optional, multiline), field errors + error summary, Continue button.
- _Your photos_: helper "Add 1 to 6 photos. The first becomes your main
  photo.", photo grid tiles (image / spinner / "Photo unreadable" +
  Retry / "Set main" overlay / trash icon / "Main" badge / "Under review"
  badge / "Rejected — replace it" badge / failed-upload tile with Retry +
  Remove), dashed "add" tile, "6-photo count" line, Back + Continue.
- _Review_: summary rows (Name/Age/Gender/Wilaya/Bio/Photos),
  "Review your profile before you start discovering.", Back + Finish.

**3. Discover (main screen)**

- Header "Discover" + Filters icon-button (with active dot •).
- Deferrable card "Get better matches / Answer 10 quick questions…"
  with Start + Later buttons (and a "Continue your survey" resume variant).
- Deck card: full-bleed photo (h-96, rounded-2xl), initial-fallback tile,
  "Name, Age" title, wilaya line, 4-line bio, "···" more button, Pass
  (secondary) + Request (primary) buttons, inline action-error text.
- Tapping the photo opens the profile detail (below).
- Empty: "No more profiles for now / Check back later…" + Refresh.
- Safety bottom-sheet (from ···): Report {name} / Block {name} rows.
- Filter bottom-sheet: Min age + Max age inputs, Wilayas section (count,
  search field, 58 checkmark rows, empty state), Sort by chips
  (Recommended / Newest / Best match), Reset + Apply buttons.
- Report sheet: "Report {name}", "A report can't be undone…" notice,
  reason chips (Spam, Harassment, Fake profile, Inappropriate content,
  Scam, Other), Details (optional, 1000 max) input, Cancel + Send
  (destructive).
- Block sheet: "Block {name}?", consequence text, Cancel + Block.

**4. Requests tab**

- Title "Requests", sections "Received" (Accept primary + Decline ghost
  buttons per row, acting-disabled) and "Sent" (status chips: Pending /
  Accepted / Declined / Canceled), avatar + name + wilaya rows,
  empty states per section, inline action-error.

**5. Messages tab + thread**

- List rows: avatar, name (or "User unavailable"), preview (or "No
  messages yet."), time, unread-count dot. Empty: "No conversations /
  Accept a request to start chatting."
- Thread: back button, name header, safety (···) menu, inverted message
  list (mine/theirs bubbles, "Sending…", "Failed — retry"), "Load older
  messages" ghost button, input ("Write a message…", send button),
  "Conversation locked." notice state, send-error text.

**6. Survey screen** (`/survey`)

- "Help us match you" + "10 quick questions…", 10 chip-question blocks:
  hobbies multi (max 3), vibe single, three 1–5 scales, sports, cooking,
  travel, family, career, kids, smoking; per-question error text; Save
  button (loading); save-error alert.

**7. Profile detail** (`/profile/[id]`, from card tap)

- Back button, swipeable full-bleed gallery + "2 / 5" counter, name/age,
  wilaya, bio, subtle compat badge ("Great match" green / "Good match"
  amber — never show low scores), Pass + Request buttons, action-error,
  "Profile unavailable" dead-end state.

**Shared components inventory**: Button (primary/secondary/ghost/
destructive × loading/disabled), IconButton (labeled), Input (label/hint/
inline error/red border), Chip (toggle pills), Badge (info/success/warning/
destructive), Avatar (initial fallback), Modal/Sheet (scrim + close),
Toast (bottom alert + Close), LoadingState (spinner + label), EmptyState
(title/message/action), ErrorState (message + Retry), FormErrorSummary
(linked error list).

## What to deliver back

1. Verdict on the current palette (keep / replace / adjust) with reasons
   tied to dating-and-friendship psychology for a global audience.
2. Full replacement token table (bg/card/text/muted/border/primary/
   secondary/destructive/success/warning) with contrast notes.
3. Per-screen direction for items 1–7: layout tweaks, type scale usage,
   imagery treatment (photo cards are 80% of the product), button/chip/
   sheet styling, empty-state illustration approach (no emoji), motion
   (press/sheet/list, subtle).
4. Anything in the inventory above that should be restructured visually
   (not functionally).
