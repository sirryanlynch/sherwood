# Sherwood product flow

This site is a static demo on GitHub Pages. The journey below is clickable. County facts are read from `data/counties/*.json`. Payments, email, DocuSign, and county e-file are simulated behind the adapters in `js/adapters/`. Nothing in those adapters is a live vendor call.

The source of truth for Santa Cruz County is the October 2026 business kit: the build brief, `county_santa_cruz.json`, the pilot filing guide, checklist, comp analysis, the appeal-letter template, and the customer guide. This product does not add fees, phone numbers, deadlines, or savings figures that are not in that kit or computed from numbers the visitor types.

## Journey

1. **Free check** (`index.html`). Address and email only. The lead is stored in this browser. Visitor geolocation still fills marketing city/state lines and is not the property's county.
2. **Numbers** (`values.html`). County, assessed value, the visitor's market-value estimate, optional tax bill, confidence, and an optional supplemental notice date.
3. **Result** (`results.html`). One of four outcomes from `js/engine.js`.
4. **Account** (`login.html`). Magic link, simulated. The link is shown on the page because no email is sent. Open it in the same tab.
5. **Plan and pay** (`checkout.html`). DIY $79, done-for-you $249, or contingency at 35% with nothing due today. Those are the prices already published on the site. They sit inside the ranges in the build brief. The county fee is shown from the adapter and is not charged here.
6. **Intake** (`intake.html`). Property confirm, occupancy, exemption question, condition notes, optional photo/PDF upload, and the authorization checkboxes.
7. **Kit** (`kit.html`). Short explanation (150 characters where the adapter says so) and a Statement of Facts preview. The visitor approves it.
8. **Signing** (`sign.html`). Round 1 agent authorization when the plan files as agent. Round 2 application certification plus the statement. Round 3 only if the visitor accepts a stipulation preview later.
9. **Filing** (`filed.html`). Done-for-you and contingency on a verified e-file adapter: a simulated confirmation with filing ID, fee, portal URL, and clerk. DIY: the adapter's paper or portal checklist, and Sherwood does not submit.
10. **Tracking** (`dashboard.html`). Stages, expectations, notices, notification preferences, annual monitor.
11. **Ops** (`admin.html`). Pipeline, deadline list, review queue. This browser only.

## Go / no-go

The engine does not look up the assessor and does not invent comparable sales.

- **Off-season** if today is outside the adapter's regular window, unless a supplemental notice date falls inside `supplemental_days` on that adapter. Santa Cruz: July 2–November 30, 2026, and 60 days from a supplemental notice. The page offers a waitlist. Informal review is whatever `informal_review` says. For Santa Cruz the kit does not describe a procedure, so the page says to ask the assessor and gives that office's phone from the adapter.
- **No-go** if the market-value estimate is not below the assessed value.
- **Borderline → human review** if the county file is an unverified template, the window's start date is missing, the visitor marked the value as a guess, estimated savings are not above the adapter's filing fee, or (when no tax bill was entered) the gap is under 5% of assessed value. The 5% line is Sherwood's review rule, not a legal standard and not a county rule. Borderline matters sit in the ops queue until "Mark reviewed."
- **Go** otherwise, when the adapter is verified and the window is open.

Savings, when a tax bill was entered: `(assessed − market estimate) × (tax bill ÷ assessed)`. Labeled an estimate. The pilot property's 1.23% effective rate is not applied to anyone else's home. That 1.23% and the ~$1,955 figure stay on the case study, where they belong to that one filing.

## Post-filing timeline

The dashboard stages are a product choice, not a county status feed:

Filed → County acknowledged → Assessor review → Hearing scheduled → Decision → Corrected bill / refund → Annual monitor.

Why this shape: the build brief asks for notice tracking through hearing, decision, and refund, and for an annual monitor. The kit also says the assessor can signal a higher value and that withdrawal rules exist, but it has no stipulation form. Assessor review is still on the timeline because a value discussion can happen before a hearing. Accept and decline are the visitor's decision, in plain language, with no recommendation. Accepting opens signing round 3, which is explicitly a product step (`product_step` on the adapter) and not a county form. Declining leaves the hearing path.

Each stage's "what to expect" sentences are `stage_expectations` on the county adapter. Santa Cruz includes: keep paying taxes, up to two years to decide, hearing notice at least 45 days ahead, 3 copies of the statement unless the clerk wants more, the board can raise or lower or leave the value, the decision is final with superior-court review, and a proportionate refund if a reduction is granted.

The **Advance one stage** control is a demo toggle. It does not contact the county. A hearing preview date is set only when the adapter has `notice_minimum_days` (45 for Santa Cruz). No date is invented when that field is null.

The notices inbox stores pasted mail and runs a keyword match (`hearing`, `stipulation`, `decision`, `refund`). It does not parse a real notice. Email and SMS preferences write to a local outbox. Messages are not sent. The build brief's 60/30/7-day reminder idea is named on the dashboard and not implemented as a scheduler.

Hearing support is the published "quoted per case" add-on. The button records a request and does not invent a price. Annual monitor enrolls at the published $49/yr in the same simulated payment adapter.

## County adapters

`js/counties.js` loads `data/counties/index.json` and then each file. Pages render portal URL, e-file versus paper, fees, deadline, form, signature steps, hearing format, timelines, clerk, assessor, agent rules, and stage copy from that object.

| File | Status | What it is |
|---|---|---|
| `santa_cruz.json` | Verified 2026-10-12 | Full launch county from the kit. E-file portal, $50 portal fee that day, $30 paper fee from the 2021 local rules, November 30, 2026 deadline, Rule 6 agent filing. |
| `template_sept15_paper.json` | unverified template | Not a real county. Paper only, closes September 15, 2026, no fee, no clerk, no portal. The brief says some counties close September 15 and does not name them. |
| `template_efile_unverified.json` | unverified template | Not a real county. E-file shape, November 30 close, opening day unset, no fee and no portal URL. |

Fee conflict, kept on purpose: the pilot portal charged $50 on October 12, 2026, and the 2021 rules said $30 for paper. Both strings live on the Santa Cruz adapter. The product does not pick one number for every channel.

Address conflict, also kept: the adapter and the filing guide use Room 520. The cover-letter template and one checklist line say Room 500. The product shows Room 520 and the adapter's note. It does not silently decide the template was right.

Agent roles: Rule 6 is the verified piece (an authorized agent may file). The brief's list of owner, spouse, child, agent, and attorney is a tracking reminder, not a verified Santa Cruz roster, so the adapter says the other roles are not separately verified.

## Simulated vs needs a real integration

| Adapter | File | Demo behavior | Replace with |
|---|---|---|---|
| Auth | `js/adapters/auth.js` | Magic-link token in local storage, link shown on screen | Email provider and a real session |
| Payments | `js/adapters/payments.js` | `simulated-stripe` record, no card number | Stripe Checkout or Billing. Contingency and the hearing quote still need a real billing rule |
| DocuSign | `js/adapters/docusign.js` | Local envelope id and a typed name | DocuSign embedded signing. The round-3 document does not exist yet |
| County e-file | `js/adapters/efile.js` | Local filing id if the adapter has a portal URL | The county portal. Santa Cruz: register, 9 sections, attach the statement at the DocuSign step, pay the portal fee |
| Email/SMS | `js/adapters/notify.js` | Outbox in local storage | Transactional email and an SMS vendor, plus consent |

Also not integrated, and not faked with made-up comps:

- Assessor value lookup (the brief's pipeline; this demo asks the visitor to type the bill).
- MLS or a licensed comp feed (BatchData, ATTOM, or a Realtor partnership are named in the brief as options, not as a connected account).
- A server-side notice parser.
- Deadline reminders at 60/30/7 days.
- Real contingency collection after a reduction.

DIY never calls the e-file adapter. Unverified templates do not get a filing confirmation unless the visitor used the off-season "preview anyway" path, and even then a missing portal URL returns "not submitted."

## Decisions

- **Static demo, one browser.** A `sherwood_db_v1` object in `localStorage` holds users, matters, payments, envelopes, filings, and the outbox. The signed-in user and the current matter id are in `sessionStorage`. There is no account server. The ops page can only see this browser.
- **County copy is data.** Marketing pages that used to type the Santa Cruz phone number now fill it from the adapter. The case study still tells the pilot story, including that one home's published figures ($158,915 reduction sought, about $1,955 a year, filed in a day, awaiting a decision).
- **No invented comps.** The free check blurs a sample line and says sales were not pulled. The statement preview says the same.
- **You sign the certification.** Round 2 is required for every plan. Round 1 is required only when the plan files as agent (done-for-you and contingency).
- **Borderline does not auto-file.** Ops has to mark it reviewed. The demo path in the section below is a Go, so it does not stop there.
- **Off-season still keeps the lead.** Waitlist flag on the matter. A separate preview link exists so a closed template county can still be walked, and it is labeled as a preview.
- **Refund policy is a placeholder** on `trust.html`. It is not a customer promise.
- **Room 520 vs Room 500** and **$50 vs $30** are shown as conflicts from the kit, not smoothed over.

## Demo path

Use the verified Santa Cruz adapter while its window is open (through November 30, 2026). Any assessed value clearly above your market estimate works. To mirror the published pilot math, the bill figures from that case study are an assessed value of $1,233,915 and a market estimate of $1,075,000. Add a tax bill only if you want a dollar savings estimate; the pilot's own tax was $15,176.44, which is how that case produced about $1,955. You do not have to use those numbers.

1. Open the site and submit an address and email.
2. On the numbers screen choose **Santa Cruz — Verified from the October 12, 2026 pilot kit**. Enter an assessed value above the market estimate. Leave confidence on "Sure enough to use." Submit.
3. The result should say **Go**. Continue.
4. On sign-in, create the link and open **Open the simulated magic link** in the same tab.
5. Choose **Done-for-you filing** and simulate payment. No card is requested.
6. Complete intake. Photos are optional.
7. Approve the kit.
8. Sign round 1 (agent authorization), then round 2 (certification and statement). Type a name. Both screens say they are not DocuSign.
9. The filing screen shows a simulated filing ID, the adapter's $50 e-file fee, and the Santa Cruz portal link. The portal is not contacted.
10. Open **Track the appeal**. Read "What to expect now." Use **Advance one stage** to walk acknowledged → assessor review. Accept (round 3) or decline, then advance through hearing, decision, refund, and monitor. Enroll the monitor if you want the $49 record.
11. Paste a sentence containing "hearing" into Notices and save. The keyword note should suggest the hearing stage.
12. Open **Ops** (`admin.html`) and see the matter in the pipeline and Santa Cruz on the deadline list.

To see the other outcomes: a market estimate at or above the assessed value is a no-go; a rough guess, or a gap under 5% with no tax bill, is borderline; **Unverified template — September 15, paper only** is off-season after September 15, 2026.

## Open legal questions

From the build brief, section 9. The pilot did not answer these. They need a California property-tax attorney before a real launch.

- Unauthorized practice of law: where form preparation stops and legal advice starts. Customer copy on this site is written to stay on the form-preparation side and to say Sherwood is not a law firm.
- Whether a non-attorney agent may represent a homeowner at an Assessment Appeals Board hearing in each target county, and any registration or qualification rules. Santa Cruz Rule 6, as cited in the brief, covers filing by an authorized agent. It is not treated here as permission to appear at a hearing. Hearing support stays "quoted per case."
- Contingency-fee compliance for non-attorney tax representatives. The 35% plan is the published price and is not a legal opinion that the fee is allowed.
- Data licensing for MLS or comp data at commercial scale.
- Privacy and CCPA handling of homeowner personal information. This demo avoids a server by keeping data in the browser, which is not a CCPA program.

## Per-county variation

A new county is a new JSON file plus a line in `data/counties/index.json`, then a verified test filing before `status` may be `verified`. The UI already branches on:

- `filing.efile` and `portal_url` (submit vs paper steps)
- `efile_fee.amount` / `paper_fee.amount` (null means "do not quote a number")
- `regular_window.start` / `end` and `supplemental_days`
- `signature_steps[].required_for`
- `agent.agent_filing_allowed` (null on templates)
- `hearing.format`, `notice_minimum_days`, `prep`
- `stage_expectations`, `rules`, `timelines`
- `homeowner_exemption` (omitted means the intake will not quote $7,000 or $86)

Until `status` is `verified`, the engine will not return Go.
