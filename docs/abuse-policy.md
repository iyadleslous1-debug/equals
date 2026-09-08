# Abuse policy — what happens when an account acts like a bot

No code ships with this doc (MVP1 wires the triggers); it exists so the
report/ban flow has a policy to reference instead of improvising under
pressure. Thresholds are starting points — tune from real data, never from gut.

## Detection signals (any dashboard query / edge log can compute these)

| Signal                  | Bot smell threshold (per rolling 24h)                                         |
| ----------------------- | ----------------------------------------------------------------------------- |
| Swipes                  | > 500 distinct targets (humans browse; bots enumerate)                        |
| Friend requests         | > 50 sent, or > 80% decline rate on > 20 sent                                 |
| Messages                | > 200 sent, or identical text to > 10 distinct recipients (spam)              |
| Reports received        | ≥ 3 independent reporters → auto-flag for review (already in moderation plan) |
| OTP/resend requests     | hitting `check_rate_limit('otp_send', …)` ceiling repeatedly                  |
| Account age vs activity | < 24h old with above-threshold volume                                         |

## Progressive response (each step logged with reason + actor)

1. **Throttle** — client already backs off via `check_rate_limit()` budgets
   (message_send 30/min, swipe 60/min, request_send 10/hr — MVP1 trigger
   values, tune later). Invisible to normal users by design.
2. **Shadow-limit** — matching/discovery weight drops to zero for the account
   (they can still use the app; nobody new sees them). Reversible, no
   notification. Buys review time without tipping off the operator.
3. **Suspend** — `users.account_status = 'suspended'`. Login still works (so
   they see the notice + appeal path) but all writes are refused by the
   bootstrap gate. Requires a human + written reason.
4. **Delete** — `account_status='deleted'` + `deleted_at`. Content preserved
   for evidence. Only for confirmed spam rings, scams, or illegal content.
5. **Erase** — physical `DELETE FROM users` (cascades). Two-person rule, logged
   outside the DB. Legal requests and extreme cases only.

## Bot-account specifics

- Never notify the account which signal tripped (don't train the bot farm).
- Appeals: suspended users get one in-app appeal → human review within 72h.
  Mass-created accounts from one device/IP fingerprint skip appeal.
- Fake DZ numbers / VoIP ranges: block at OTP-send time once identified
  (aggregator blocklist), not after they've swiped 500 people.
- Rate-limit budgets are per-account; add per-IP/per-device budgets in MVP2
  when the first bot wave justifies the complexity — not before.

## What MVP1 must build from this doc

`check_rate_limit()` BEFORE INSERT triggers on `messages` + `swipe_actions`,
the bootstrap `is_active()` gate, suspend/delete admin actions with reason
logging, and the appeal ticket type. Everything else stays policy until data
says otherwise.
