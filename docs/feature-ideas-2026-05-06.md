# Feature Ideas — 2026-05-06

Product/feature suggestions for KOVA. Drawn from what I saw of the codebase plus what comparable products (Wodify, Sugarwod, TrainHeroic, TrueCoach, Mindbody) do well. Each item tagged:

- **Quick win** — one-evening to one-week build
- **Project** — a sprint or two
- **Strategic** — multi-month, but high differentiation
- **AI-lever** — a feature that gets dramatically better because you have AI workout generation as a primary input

The current app does AI programming + scheduling + booking + waitlist + member management + attendance. Everything below is a layer on top of that.

---

## The big bet — programming features that only KOVA can do

You're building gym programming with AI as the primary author. Wodify and Sugarwod don't have that. The features below are ones where AI-generated workouts give you an unfair advantage:

### F1. "Why this workout?" — coach-facing AI explanation — **Project / AI-lever**
Beneath every generated week, a collapsible panel: "This week emphasises pulling because last week was push-heavy. The Saturday partner WOD pairs with the Wednesday couplet to test the same engine in a different format."

Today the AI just produces JSON. Have it also produce a 3-bullet reasoning trace and store it alongside `workouts`. Coaches gain trust ("the AI isn't random, it's thinking about my gym"), and over time you build a corpus of programming rationale that's a marketing asset.

Effort: prompt change + one new column. Impact: huge for retention. **This is the single best feature to ship next.**

### F2. AI learns from edits — **Strategic / AI-lever**
When a coach edits the generated day (changes a movement, adjusts reps, swaps a metcon), capture the diff and feed it back into the next generation as "this gym tends to swap X for Y." Over months, each gym's AI output drifts toward their actual style. Style examples already do half this; edit-learning is the rest.

Schema: `workout_edits(gym_id, original, edited, edited_at, reason text)`. Use the last N edits as additional context in the prompt.

### F3. Per-member scaling that adapts over time — **Project / AI-lever**
Right now scaling is generic ("Rx" / "scaled"). Each member has different injuries, mobility, and skill level. Have members log their score (F4 below); use the history to ask the AI: "Given Sarah scaled Fran to 65lb thrusters and finished in 8 min, what should her load be on tomorrow's heavy thruster day?"

This is the killer feature for AI-programmed gyms. Wodify can't do it because they don't generate the workout — they just record what was prescribed.

### F4. Workout score logging — **Project / Important**
After class, member opens the app and logs their score: time, weight, reps, rounds + reps. Pre-fills from prescription. Optional notes ("felt strong, increase load next time"). This is *table stakes* for any CrossFit-adjacent app — Sugarwod's whole product is built on this.

Schema: `workout_scores(booking_id, score_value, score_unit, rx, notes, created_at)`. Display: "your score" + the day's leaderboard (privacy-controlled).

### F5. Benchmark + named-workout tracking — **Project / Important**
"Fran", "Murph", "Cindy", "Diane" — every CrossFit gym does these and members care intensely about their PR. When the AI generates one of these (or a coach manually inputs it), recognise it and surface the member's history: "your last Fran was 4:23 on March 12."

Schema: `benchmark_workouts` reference table; tag generated workouts that match. Reuse F4's score data.

### F6. Programming calendar / macro view — **Project / AI-lever**
Today the owner sees one week at a time. Add a 4- or 8-week roll-up showing movement balance, intensity curve, deload weeks. The AI can suggest a "block" (e.g., 4-week strength cycle with two heavy days per week) and generate against that template.

Differentiator: most gyms wing programming weekly. KOVA could be the first to give small gyms periodised programming that pro-level coaches do.

---

## Member-facing essentials (you'll want all of these)

### F7. Push notifications + class reminders — **Project / Important**
"Class starts in 1 hour." "Spot opened on the waitlist for tomorrow's 6am — confirm now." Today notifications are email-only. Mobile push (web push notifications are free; native PWA is achievable without an app store).

Bare minimum: web push via the Push API. Wires into your existing email send points.

### F8. Calendar export (.ics) — **Quick win / Important**
After booking, "Add to calendar" button generates a `.ics` file. Or auto-subscribe URL: `/api/calendar/<member-token>.ics` returns every booked class. Members live in their phone calendar; meet them there.

### F9. Member profile + attendance streak — **Quick win / Important**
Profile: name, photo, joined date, total classes, current streak, longest streak. Streaks are ridiculously sticky — Duolingo built a $9B company around them.

### F10. Year in review — **Quick win / Important**
At year end (or anytime): "You did 142 classes in 2026. Your favourite time slot is Tuesday 6:30pm. Your longest streak was 17 classes." Shareable card. Acquisition gold; existing members post these on Instagram and you get free marketing.

### F11. "First class" onboarding flow for new members — **Quick win / Important**
A new member's first booking should trigger a checklist: book their first class, watch a 90-second intro video, sign the liability waiver, complete profile. Day-one activation is the strongest predictor of 6-month retention.

### F12. Class roster ("who's coming?") — **Quick win / Important**
For confirmed bookers (not waitlist), show first names of others booked. Gated by `show_member_names`. Members love this — it's social proof and reduces "do I know anyone there?" friction.

### F13. Personal goal tracker — **Project / Nice-to-have**
"Get my first muscle-up." "Squat bodyweight." "Train 3x/week consistently." Members set goals, the app tracks progress, the AI tailors programming hints. Coaches see what their members are working on.

### F14. Workout-of-the-day shareable card — **Quick win / Nice-to-have**
"Add to story" — generates an Instagram-sized PNG of today's workout with the gym's logo. Free marketing every time a member shares.

---

## Coach / owner workflow tools

### F15. Whiteboard / TV mode — **Quick win / Important**
A `/whiteboard` route the gym puts on a wall-mounted iPad/TV. Auto-refreshes every minute. Shows: today's class, the workout, current bookings, who's checked in. Looks fantastic, costs nothing, lets the gym project KOVA branding to every visitor.

This is what Sugarwod's TV display does and gym owners love it.

### F16. Coach role + class assignment — **Project / Important**
Already in the security plan as A3 (architecture). Product side: assign a coach to each class. Coach sees only their classes. Coach takes attendance, leaves member notes. Owner sees coach pay/hours.

This unlocks single-owner-multi-coach gyms (most of them past 50 members).

### F17. Member notes (coach-private) — **Quick win / Important**
On a member's profile, coaches can write private notes: "knee injury — scale to box squats", "wants to compete in 2027 Open", "intimidated by barbell, prefers bodyweight days". Visible to coaches only, never to the member.

### F18. Substitution requests — **Project / Nice-to-have**
Coach can't make their assigned class. They post a "sub needed" request. Other coaches in the gym claim it. Notifies owner. Saves "frantic group-chat at 6am".

### F19. Today's check-in QR — **Project / Nice-to-have**
Member scans a QR at the gym to mark themselves attended. Coach doesn't have to manually mark it. Or it auto-confirms via geofence on the member's phone if they're at the gym at class time.

### F20. Equipment booking within a class — **Project / Nice-to-have**
For gyms with limited equipment (one GHD, two ergs), members reserve a station when they book. Capacity = stations, not just headcount.

---

## Business / payments / operations

### F21. Stripe billing integration — **Strategic / Critical (for monetisation)**
Membership plans (unlimited, 8/month, 4/month, drop-in), recurring billing, failed-payment retries, dunning. Without this you're not a viable gym SaaS — you're a programming tool. Wodify's whole moat is this layer.

Stripe Subscriptions handles 80% of it. Custom plumbing is in the gym↔Stripe-customer mapping and the "member paused / reactivated" state.

### F22. Drop-in / trial pass — **Quick win / Important**
"Try us for free this week" — generates a guest account with one or three free classes. Visiting CrossFitter pays $25 for one class. Common revenue source for boutique gyms.

### F23. Membership pause — **Project / Important**
Member is on holiday or injured. Pause for 30 days; billing pauses too. They keep their account but can't book. Re-activation is one click.

### F24. Failed payment recovery flow — **Project / Important** (depends on F21)
Card decline → email "your payment failed, update card here" → if not updated in 7 days, account suspends. Needed for any subscription business.

### F25. Revenue dashboard for owners — **Quick win / Important** (depends on F21)
MRR, churn, new members this month, lapsed members. Owners care about this more than anything else; surface it on /dashboard.

### F26. Family / partner plans — **Project / Nice-to-have**
"Sign up your spouse for $50/mo extra." Linked accounts, shared billing. Common ask in family-oriented gyms.

### F27. Liability waiver e-signing — **Quick win / Important**
Every CrossFit gym needs a signed waiver before first class. Bake it in: sign at signup, store the signed PDF, link from member profile. Saves the gym a binder full of paper.

### F28. Photo/video consent — **Quick win / Important** (compliance-related)
Members opt in/out of being in marketing photos. Coaches see a green/red badge. GDPR-relevant in EU; politeness-relevant everywhere.

---

## Community / engagement

### F29. Daily leaderboard — **Project / AI-lever**
Today's WOD, every member's score, rankings. Privacy-controlled (members can hide). Sugarwod built their company on this — gym owners say it's the #1 reason members come back.

Pair with F4 (score logging). The AI can call out "biggest improvement of the day" or "first sub-7 Fran for Member X".

### F30. Achievement badges — **Quick win / Nice-to-have**
"100 classes." "First muscle-up logged." "10 PRs in one month." "Visited at 5am ten times." Stupid, sticky, free retention.

### F31. Monthly challenge — **Project / Nice-to-have**
"Most classes in February." "Hit 30 squats every day." Gym-wide leaderboard. Members opt in. Coach/owner posts winners on Instagram. Free engagement campaign.

### F32. Member referral — **Quick win / Important**
"Refer a friend, both of you get a free month." Track referrals, automate the credit. Referred members stick because their friend made them stick.

### F33. Class feedback (post-WOD rating) — **Quick win / AI-lever**
After class, optional: "How was it?" 1-5 stars + free text. Privacy: visible to coach/owner only. Feed the ratings back into the AI: "this gym hates ascending ladders, avoid them next month."

---

## Content / education

### F34. Movement library with video — **Project / AI-lever**
Every movement (kipping pull-up, snatch, double-under) gets a demo video and progression notes. AI-generated workouts auto-link to the demos. New members can study before class.

You don't have to film these — license a stock library or use creative-commons YouTube content. Or commission the gym's coaches to film their own and brand it.

### F35. Skill tracker — **Quick win / Important**
On member profile: "can do strict pull-ups", "can do kipping handstand push-ups", "RX double-unders". Coach updates as the member progresses. Affects scaling suggestions (F3).

### F36. Recovery / mobility content — **Project / Nice-to-have**
After-class mobility videos, suggested home stretches based on today's WOD. AI can pick the right ones. Adjacent revenue stream — pay $5/mo for premium recovery library.

### F37. "Intro to CrossFit" course — **Project / Important**
Six-class onboarding curriculum for new members. Each gym uses the same curriculum (you provide it). New members see a checklist, coaches mark progress.

Big in retention. ROMWOD/Origin Athletics built businesses on the adjacency.

---

## Public marketing / SEO

### F38. Public gym page — **Quick win / Important**
Each gym gets a public URL: `kova.app/gyms/<slug>`. Shows class schedule, "Sign up for trial" button, gym photo, a snippet of this week's WOD. SEO-friendly. Replaces or complements the gym's own website.

Acquisition channel: prospective members google "CrossFit Manchester" and find the gym's KOVA page.

### F39. Public workout-of-the-day blog — **Project / AI-lever**
Each gym opts in to a public archive of their WODs. SEO-massive over time — every workout becomes an indexed page. CrossFitters search for workouts they've heard about; one hit, one new lead.

### F40. Gym discovery / map — **Strategic / Strategic**
Eventually: a marketplace. "Find a CrossFit gym near you using KOVA." If you have 100 gyms on the platform, this becomes a real acquisition flywheel.

---

## Integrations

### F41. Strava / Garmin / Whoop sync — **Project / Nice-to-have**
Push completed classes (with score, duration) to Strava. Pull HR data from Garmin/Whoop into the workout score. Members who use these wearables are sticky and vocal.

### F42. Apple Health / Google Fit — **Quick win / Nice-to-have**
Same idea, easier — both have standard SDKs. Most members will have one or the other.

### F43. Slack / Discord for gym community — **Quick win / Nice-to-have**
Each gym gets a Slack/Discord webhook URL in settings. Daily WOD auto-posts. Member PRs auto-announce. Gyms have community already; meet them there.

### F44. Zapier — **Project / Nice-to-have**
Eventually. "When a member signs up, add to my Mailchimp." "When a class is fully booked, post in Slack." Don't build this until 50+ paying gyms ask.

---

## If I had to pick three to ship next

If I were on this team and could ship three features in the next quarter, in this order:

1. **F1 — "Why this workout?"** Cheap, ships in days, makes the AI feel intentional rather than random. The single biggest trust-building feature available to you. Also generates content (the rationale) you can market with.

2. **F4 + F29 — Score logging + leaderboard.** Without these you're not really competing with Sugarwod / Wodify in the eyes of CrossFit members. With them, you're at parity on tracking and ahead on programming. Two-month build.

3. **F38 — Public gym page.** Free SEO, free acquisition. Every gym becomes a landing page that converts. Pairs beautifully with F39 (public WOD archive) when you're ready.

Then: **F21 (Stripe billing)** is non-negotiable for monetisation. Whatever quarter you decide to start charging gyms is the quarter you build it.

---

## Things I'd explicitly skip for now

- **Native iOS/Android app.** PWA + push notifications gets you 80% of native UX at 10% of the cost. Native makes sense at 1000+ gyms, not before.
- **Equipment booking (F20).** Most gyms don't need it; the ones that do can handle it informally for now.
- **Marketplace (F40).** Premature; first you need 100+ gyms.
- **Internationalization.** Park until you have a non-English-speaking customer asking.

---

## Process suggestion

Don't ship features in priority order — ship them in **gym-feedback order**. Pick three of the gyms using KOVA today, ask each what they'd buy first, ship that. Most of the list above is wrong for the specific gyms you have; right for hypothetical gyms you don't. Read this list as a menu of options, not a roadmap.
