# KOVA vs Wodify — Gap Analysis & Feature Roadmap

How KOVA stacks up against Wodify (the dominant CrossFit gym management platform), what features close the gap, and a strategic recommendation for which gaps to actually close.

---

## Strategic question first

You can't out-Wodify Wodify on every dimension — they have a 12-year head start on infrastructure (payments, contracts, POS, mobile apps, lead CRM). The honest question is **whether KOVA replaces Wodify or coexists with it**:

**Path A — Replace Wodify.** Build the boring infrastructure (billing, payments, contracts, POS, mobile apps) and use AI programming as the wedge that justifies switching. 18-24 months of work, large team needed, but big moat once built — switching cost becomes prohibitive.

**Path B — Coexist with Wodify.** Stay narrow as the "AI programming brain" that gyms bolt on top of their existing Wodify. Build a Wodify API integration and double down on AI-native features. 3-6 months to MVP, much smaller team needed, but always dependent on Wodify's API and easier to be undercut.

The current product (programming + booking + attendance) is *halfway* between these — too thin to replace Wodify, too overlapping to be a clean complement. Pick a side soon.

I'd recommend **Path A** for one specific reason: AI programming is your only durable advantage, and it's deeply tied to attendance/scoring data that gyms won't share with two systems. If you stay narrow, gyms will eventually pick "the one with payments" because that's the system of record. So if AI programming is the future, you have to own the surrounding system to keep gyms there.

The rest of this doc assumes Path A. If you choose Path B, throw out everything below and focus on Wodify API integration + AI features (F1-F6 in the feature ideas doc).

---

## What Wodify has that KOVA doesn't

Tagged by **strategic priority** (must-build, should-build, nice-to-have) under Path A.

### Must-build to be a credible Wodify alternative

#### W1. Membership billing & payments (Stripe Subscriptions) — **must-build / 2-3 months**
Wodify's whole moat is being the system of record for $X/month per member. KOVA has zero payment infrastructure today.

Build:
- Recurring subscriptions (unlimited / 8-pack / 4-pack / drop-in)
- Failed-payment dunning with retry schedule
- Member-paused state (holiday, injury) with billing pause
- Drop-in / trial pass (one-time charge)
- Family plans (linked accounts, shared billing)
- Refunds and credits
- Invoice history visible to member
- Owner sees MRR, churn, failed-payment count

Without this, no gym will take KOVA seriously as a primary system.

#### W2. Liability waiver e-signing — **must-build / 1 week**
Every CrossFit gym requires a signed waiver before first class. Wodify has a built-in flow. KOVA has nothing. New-member signup must include waiver acceptance, store the signed PDF, link from member profile.

Use a service like Documenso (open-source) or DocuSign API. Or just an HTML form + checkbox + audit row + generated PDF.

#### W3. Score logging + benchmark tracking + leaderboard — **must-build / 2 months**
Wodify's "Performance" module is half their value prop for members. Every member logs their Fran time, their back squat 1RM, their daily WOD score. Wodify shows the leaderboard, the gym leaderboard, the historical PR.

Schema:
```sql
CREATE TABLE workout_scores (
  id uuid PRIMARY KEY,
  booking_id uuid REFERENCES bookings,
  user_id uuid REFERENCES users,
  gym_id uuid REFERENCES gyms,
  score_value numeric,            -- e.g. 273 (lbs) or 305 (seconds)
  score_unit text,                 -- 'lbs' | 'seconds' | 'reps' | 'rounds_reps'
  rx boolean,
  notes text,
  scored_at timestamptz DEFAULT now()
);

CREATE TABLE benchmark_workouts (
  id uuid PRIMARY KEY,
  name text UNIQUE,                -- 'Fran', 'Murph', 'Cindy', etc.
  description text,
  unit text                        -- 'time' | 'reps' | 'rounds'
);
```

UI: post-class "log your score" prompt; member profile shows benchmark PRs and trend. Daily leaderboard on dashboard. Settings to opt out of leaderboard.

This is the single feature most likely to make a CrossFit member say "I miss Wodify" if KOVA doesn't have it.

#### W4. Coach role + multi-coach scheduling — **must-build / 3 weeks**
Most gyms past 50 members have multiple coaches. Wodify supports unlimited coaches with their own logins, class assignments, and pay/hours tracking. KOVA only has owner/member.

Add `users.role = 'coach'`. RLS: coach reads their gym's bookings, takes attendance for their assigned classes, reads member skills/notes. Cannot see billing or invite members.

`class_instances.coach_id` (nullable). Schedule view shows coach name. Coach dashboard shows their upcoming classes.

#### W5. Lead capture & CRM — **must-build / 1 month**
Wodify integrates with the gym's website to capture leads (free trial signups). Tracks: lead source, status (new → trial booked → showed up → joined → lost). Auto-emails at each step.

KOVA needs an equivalent: `/api/leads` POST from any website form, lead status pipeline, automated nurture emails. Without this, gyms can't run their funnel through KOVA — they keep using HubSpot/Mailchimp/etc, which means KOVA is fragmented.

#### W6. Mobile apps (PWA first, native later) — **must-build / 3-4 months**
Wodify has iOS and Android apps. Members and coaches expect them. KOVA is web-only.

PWA path: add a manifest, service worker, push notifications, splash screens. Members can "Add to Home Screen" and it feels native enough. ~3 weeks of work.

Native path: React Native shell that wraps the PWA, proper app store presence, push notification support, biometric auth. 3+ months. Defer until PWA is shipped.

#### W7. Whiteboard / TV display mode — **must-build / 1 week**
Every CrossFit gym has a TV/iPad on the wall showing today's workout, today's classes, today's leaderboard. Wodify has a dedicated "Wodify Whiteboard" product. KOVA has nothing.

Build `/whiteboard` route — auto-refreshing, kiosk-friendly, shows: today's WOD with parts/movements, current class roster, top 3 scores from today's leaderboard, the gym's logo. Lock it down so a casual visitor at the gym can't navigate elsewhere.

This is high-ROI: it's visible to every member every day, it's free marketing for KOVA, and it makes the gym look modern.

---

### Should-build to be at parity

#### W8. Reports / analytics dashboard — **should-build / 1 month**
Wodify's reports cover: revenue, MRR, churn, retention, attendance trends, lead conversion, class capacity utilization, no-show rate. KOVA's owner dashboard shows current state, not trends.

Build a `/reports` route under owner with at minimum:
- MRR + 12-month MRR trend
- Active member count + 12-month trend
- Churn (cancelled subscriptions / starting subscriptions × 12 months)
- Attendance heatmap (which class times are most popular)
- Class capacity utilization (% of seats filled)
- Member retention cohort chart (members joined in month N, % still active in month N+M)

Owner-side analytics is what justifies the price for the gym owner.

#### W9. Skills tracking — **should-build / 2 weeks**
Wodify lets coaches mark skills per member: can do strict pull-up, can do double-under, RX strict press 95lb. KOVA has nothing.

Schema:
```sql
CREATE TABLE skills (
  id uuid PRIMARY KEY,
  gym_id uuid REFERENCES gyms,
  name text NOT NULL,                -- 'Strict Pull-up', 'Double-under'
  category text                       -- 'gymnastics' | 'olympic' | 'strength'
);

CREATE TABLE member_skills (
  user_id uuid REFERENCES users,
  skill_id uuid REFERENCES skills,
  achieved_at timestamptz,            -- null = not yet
  notes text,
  PRIMARY KEY (user_id, skill_id)
);
```

UI: member profile shows skill grid. Coach updates as the member progresses. Feeds AI scaling suggestions (e.g., "this member can't kip yet, scale to ring rows").

#### W10. Movement library with video — **should-build / 2 months**
Wodify has demos for every movement. New members can preview before class. KOVA has nothing.

Don't film these yourself — license a library (BarBend, Catalyst Athletics) or use Creative Commons YouTube content. Curated, not user-generated.

Auto-link from generated workouts: "today's WOD includes Power Cleans → tap for demo". This is huge for new members who don't know what a clean is.

#### W11. Body composition / measurements — **should-build / 2 weeks**
Wodify lets members log weight, body fat, measurements. Trend chart. Optional and private. Gyms with InBody scanners or DEXA partnerships use this heavily.

Schema is straightforward:
```sql
CREATE TABLE measurements (
  id uuid PRIMARY KEY,
  user_id uuid,
  measured_at date,
  weight_kg numeric,
  body_fat_pct numeric,
  notes text
);
```

#### W12. Member profile + photo + streaks — **should-build / 1 week**
Wodify's profile shows: photo, joined date, total classes, current streak, longest streak, recent PRs, upcoming classes. KOVA's profile is bare.

Already in feature-ideas-2026-05-06.md as F9. Streaks are ridiculously sticky.

#### W13. Drop-in / trial passes — **should-build / 1 week**
Visiting CrossFitter from another gym pays $25 for one class. Trial member gets one free week. Wodify handles both as first-class concepts. KOVA needs to.

Schema: `passes(id, gym_id, user_id, type, classes_remaining, expires_at, paid_amount)`. Booking checks for an active pass before allowing the booking; decrements `classes_remaining`.

#### W14. Class booking pricing tiers — **should-build / 2 weeks**
Some classes cost more (private session, specialty seminar). Wodify supports per-class pricing with auto-charge at booking. KOVA's booking is free / membership-only.

Add `class_slot_templates.price_cents` (nullable). On booking, if `price_cents > 0`, charge via Stripe before confirming.

#### W15. Family / partner plans — **should-build / 2 weeks**
Spouse + spouse, parent + kids. Wodify supports linked accounts under one billing relationship. KOVA could too.

Schema: `gym_billing_groups(id, gym_id, primary_user_id, plan_id)`. `users.billing_group_id` (nullable). Charge the primary user; everyone in the group counts toward member-cap.

#### W16. Email/SMS marketing — **should-build / 1 month**
Beyond transactional. "Hey, we noticed you haven't been in for 2 weeks." "New 6am class starting next month." Wodify integrates with Mailchimp etc; KOVA could ship a basic version.

Start with: tag-based segmentation (active members, lapsed, trial), one-off broadcast email composer, basic templates. SMS via Twilio later.

#### W17. Membership contracts with terms — **should-build / 2 weeks**
"3-month minimum commitment, then month-to-month." Wodify enforces these — auto-renews, applies cancellation fees. KOVA's billing model needs this for any gym selling annual contracts.

Schema: `subscriptions.commitment_months`, `subscriptions.commitment_ends_at`, `subscriptions.early_termination_fee`.

---

### Nice-to-have

#### W18. Programming track marketplace
Wodify has a marketplace where named coaches sell their programming tracks. KOVA's AI is a substitute — but a hybrid (named coach + AI augmentation) could be a differentiator long-term. Defer.

#### W19. POS / retail
Sell t-shirts, supplements, drop-ins through KOVA. Wodify integrates with Square. Nice-to-have, not urgent.

#### W20. Multi-location / franchise support
A gym chain with three locations needs one owner login that sees all three. KOVA assumes one gym = one tenant. Add later when a real franchise asks.

#### W21. Custom branding (white-label)
"Use our domain, our colors, our logo on emails." Wodify Pro tier. Defer — chase enterprise customers later.

#### W22. Zapier integration
"When a member joins, add them to Mailchimp." Defer until 50+ paying gyms ask.

#### W23. Strava / Whoop / Garmin sync
Push completed workouts to Strava. Pull HR data from Whoop. Nice-to-have for member stickiness; not table stakes.

---

## Where KOVA already wins

These are advantages to lean into in marketing and the product:

- **AI-generated programming.** Wodify doesn't have this. Their answer is "buy a programming track from CompTrain or InvictusBoz." KOVA generates fresh, gym-tuned programming every week.

- **Style-tuned AI.** The `style_examples` table lets each gym teach the AI their voice. Wodify's tracks are one-size-fits-all.

- **Modern UI.** Wodify looks 2014. KOVA can ship a much better designed product with a fraction of their dev team.

- **Setup time.** Wodify onboarding takes weeks (a Wodify rep walks the gym through it). KOVA is signup-and-go.

- **Probable price advantage.** Wodify charges $200-500/month per gym depending on member count + add-ons. KOVA can undercut them while still having margin.

Every pitch to a CrossFit gym should start with: "we generate your programming for you, in your style, in 30 seconds." The rest of the gap-closing work is to make sure they don't bounce off because something obvious is missing.

---

## Recommended sequence (12 months)

If I were building toward Wodify-replacement parity in the next year:

**Q1 (months 1-3) — Member essentials**
- W3: Score logging + benchmarks + leaderboard (the single biggest gap)
- W7: Whiteboard/TV mode (cheap, visible, marketing)
- W2: Liability waiver e-sign
- W12: Profile + streaks
- W13: Drop-in / trial pass
- W6 (PWA part): web push + manifest

**Q2 (months 4-6) — Make it monetisable**
- W1: Stripe Subscriptions billing
- W17: Membership contracts
- W14: Per-class pricing tiers
- W15: Family plans
- W8: Reports dashboard
- W4: Coach role

**Q3 (months 7-9) — Acquire new gyms**
- W5: Lead capture & CRM
- W16: Email marketing basics
- W9: Skills tracking
- W10: Movement library
- W11: Body composition

**Q4 (months 10-12) — Mobile + polish**
- W6 (native part): React Native shell, App Store + Play Store launch
- Polish, performance, customer requests

By month 12 you have: AI programming + scoring + payments + leads + mobile + multi-coach. That's a credible Wodify replacement for new gyms (existing Wodify customers are stickier; chase greenfield first).

---

## What this means for hiring / capital

This roadmap is roughly 4-6 engineer-quarters of work. Solo it's two years; with a small team (2 full-stack + 1 designer + 1 part-time DBA/ops) it's a year.

Hardest hires:
- Senior full-stack who can do payments (Stripe is its own discipline)
- Designer who has shipped fitness/booking apps before
- Customer-success person to onboard early gyms (do this before more dev hires — without happy gyms, the dev work is theatre)

If you can't or won't go that big, **Path B (coexist with Wodify) is the correct answer.** Build a Wodify integration, ship F1-F6 from feature-ideas, charge $50/month per gym as an AI add-on, stay tiny and profitable.

There's no shame in Path B. Most CrossFit-adjacent SaaS companies that exist today coexist with Wodify rather than replace it.

---

## TL;DR

- **Decide Path A or Path B first.** Don't half-do both.
- **If Path A:** the 23 features above are roughly in priority order. Q1-Q4 sequence above is what I'd ship.
- **If Path B:** build a Wodify API integration + F1-F6 from feature-ideas, stay narrow.
- **KOVA's only durable advantage is AI programming.** Every feature you build should either (a) close a Wodify gap that prevents adoption or (b) deepen the AI advantage. If a feature does neither, don't build it.
