# Sherwood product flow

This site is a static demo on GitHub Pages. The journey below is clickable. County facts are read from `data/counties/*.json`. Payments, email, DocuSign, and county e-file are simulated behind the adapters in `js/adapters/`. Nothing in those adapters is a live vendor call.

The source of truth for Santa Cruz County is the October 2026 business kit: the build brief, `county_santa_cruz.json`, the pilot filing guide, checklist, comp analysis, the appeal-letter template, and the customer guide. This product does not add fees, phone numbers, deadlines, or savings figures that are not in that kit or computed from numbers the visitor types.

## Journey

1. **Free check** (`index.html`). Address only. Email is asked after the result. The headline is “Think your property is assessed too high?” until the visitor types an address or opens the page with `?county=` set. Then the city in that headline comes from the address, or from Santa Cruz when `?county=santa-cruz` (including the `/santa-cruz/` page, which sets that parameter for the tab). An IP lookup may fill the state. It never puts an IP city in the headline, and a city alone does not choose the launch or non-launch screen. A county name from the lookup can. `?county=santa-cruz` overrides the lookup, a saved choice, and the typed address for that tab. After an address is typed, that address’s city or county overrides the IP result. Next to the check, the page says “Showing results for Santa Cruz County · change” when that county is selected. The same control reads “your county” until a county is known. Under the check: “Free check. No account needed to see your result. Results are estimates.” If the place is still ambiguous, the page shows the county picker and does not show prices. Santa Cruz County shows the $79 line with “+ $50 county fee, paid when you file” and “$249, county fee included,” plus the button “Check my property”. The $50 is `filing_fee.amount` on that adapter. The fee is non-refundable, and the adapter notes that fee waivers exist. Any other confirmed county shows a reminder signup and no prices.
2. **Numbers** (`values.html`). County, assessed value, the visitor's market-value estimate, optional tax bill, confidence, and an optional supplemental notice date. The market field's helper text is "Not sure? Use your recent purchase price or skip." Skipping does not block the check.
3. **Result** (`results.html`). One of four outcomes from `js/engine.js`. Email is collected here, with the privacy line, to save the result or to request a filing-window reminder. The legal disclaimer sits above the path into checkout.
4. **Account** (`login.html`). Magic link, simulated. The link is shown on the page because no email is sent. Open it in the same tab.
5. **Plan and pay** (`checkout.html`). Exactly two cards: DIY kit $79 and We file it $249. When the county adapter's `filing_fee` amount is above zero, the DIY card price is one line, “$79 + $50 county fee, paid when you file” (the amount comes from that field) and the We file it card reads “$249, county fee included.” A `filing_fee` of 0 or missing hides the county fee. Each card shows the price next to the estimated tax difference, labeled "Estimate from your numbers, if the county agrees to your value." If no tax bill was entered, the card says no dollar estimate is available. Contingency is not a checkout plan. While the window is open, the plan step shows “County filing deadline: Nov 30, 2026” from `regular_window.end`. We file it saves a card (a simulated SetupIntent) and does not charge it. The charge happens from ops, “Mark filed, then charge,” after the county confirms the filing, and that step records success or failure. The $79 card shows “[DRAFT – payment timing pending attorney review]”. Checkout does not say “pay now” or give a payment due date. If the adapter's filing window is not open, checkout stops. The closed screen quotes the next window only when `regular_window.start` is still ahead, and it says no outcome is promised. If the file has no future start, it says this county file does not list a future filing window and that no opening date is promised.
6. **Intake** (`intake.html`). Property confirm, occupancy, exemption question, condition notes, optional photo/PDF upload, and the authorization checkboxes.
7. **Kit** (`kit.html`). Short explanation (150 characters where the adapter says so) and a Statement of Facts preview. The visitor approves it.
8. **Signing** (`sign.html`). Round 1 is the county's agent authorization when the plan files as agent. Before that round, a plain-language explainer says what is being signed, why the county needs it (from `agent_authorization` on the adapter), and the line "How to revoke: [pending verification]". The authorization summary (state rule 305) names the parcel (address and APN), the tax years covered (the filing year and earlier years, four at most, with no future year), and the sentence “You get a copy of everything filed.” The date signed is the day the signature is completed. There is no date field and no backdating. Agent name, address, and phone stay `[pending]`. Round 2 is the application certification plus the statement. Round 3 only if the visitor accepts a stipulation preview later.
9. **Filing** (`filed.html`). We file it does not submit on its own. The filing button stays disabled, with an explanation, until the signed agent authorization is stored on the matter as `agentAuthorization`. DIY kit: the adapter's paper or portal checklist, and Sherwood does not submit.
10. **Tracking** (`dashboard.html`). Stages, expectations, notices, notification preferences, annual monitor.
11. **Ops** (`admin.html`). Pipeline, deadline list, review queue. This browser only.

## Go / no-go

The engine does not look up the assessor and does not invent comparable sales.

- **Off-season** if today is outside the adapter's regular window, unless a supplemental notice date falls inside `supplemental_days` on that adapter. Santa Cruz: July 2–November 30, 2026, and 60 days from a supplemental notice. October 13, 2026 is inside that window, so the result can be Go and checkout stays open. This is a waiting state, not a dead end. The page shows the next window only when that start date is still ahead, and it says no outcome is promised. If the only window has already ended, or the start is missing, the page says the file does not list a future filing window and that no opening date is promised. It does not quote a passed window as the next one. A "Remind me when filing opens" signup is stored on the matter and in the local outbox, with the $49 annual monitor. Informal review stays the adapter's `informal_review` text. For Santa Cruz the kit does not describe a procedure, so the page still says to ask the assessor. There is no preview path into checkout.
- **No-go** if a market-value estimate was entered and it is not below the assessed value.
- **Borderline → human review** if market value was skipped, the county file is an unverified template, the window's start date is missing, the visitor marked the value as a guess, estimated savings are not above the adapter's filing fee, or (when no tax bill was entered) the gap is under 5% of assessed value. Skipping market value does not invent a reduction or a dollar estimate. The 5% line is Sherwood's review rule, not a legal standard and not a county rule. Borderline matters sit in the ops queue until "Mark reviewed." A closed window wins over a skip: the result is off-season, not borderline.
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
| `santa_cruz.json` | Verified 2026-10-12 | Full launch county from the kit. E-file portal, $50 non-refundable filing fee, fee waivers exist, $30 paper fee from the 2021 local rules, window July 2 through November 30, 2026, Rule 6 agent filing. `regular_window.source_url` is the county Filing Deadlines and Appeal Information PDF. `regular_window.verified_date` is 2026-10-12. `filing_fee` is `{ amount: 50, refundable: false, note }`. `agent_authorization` is titled "Agent authorization"; the source is Rule 6, and the kit has no separate form number. |
| `template_sept15_paper.json` | unverified template | Not a real county. Paper only, closes September 15, 2026, no fee, no clerk, no portal. `source_url` and `verified_date` are null. `agent_authorization.verified` is false. The brief says some counties close September 15 and does not name them. |
| `template_efile_unverified.json` | unverified template | Not a real county. E-file shape, November 30 close, opening day unset, no fee and no portal URL. Deadline source and verified date are null. Agent authorization is unverified. |

Fee conflict, kept on purpose: the pilot portal charged $50 on October 12, 2026, and the 2021 rules said $30 for paper. Both strings live on the Santa Cruz adapter. The product does not pick one number for every channel.

Address conflict, also kept: the adapter and the filing guide use Room 520. The cover-letter template and one checklist line say Room 500. The product shows Room 520 and the adapter's note. It does not silently decide the template was right.

Agent roles: Rule 6 is the verified piece (an authorized agent may file). The brief's list of owner, spouse, child, agent, and attorney is a tracking reminder, not a verified Santa Cruz roster, so the adapter says the other roles are not separately verified.

## Simulated vs needs a real integration

| Adapter | File | Demo behavior | Replace with |
|---|---|---|---|
| Auth | `js/adapters/auth.js` | Magic-link token in local storage, link shown on screen | Email provider and a real session |
| Payments | `js/adapters/payments.js` | `simulated-stripe` record, no card number | Stripe Checkout or Billing. Contingency is not at checkout (coming soon, pending review). The hearing quote still needs a real billing rule |
| DocuSign | `js/adapters/docusign.js` | Local envelope id and a typed name | DocuSign embedded signing. The round-3 document does not exist yet |
| County e-file | `js/adapters/efile.js` | Local filing id if the adapter has a portal URL | The county portal. Santa Cruz: register, 9 sections, attach the statement at the DocuSign step, pay the portal fee |
| Email/SMS | `js/adapters/notify.js` | Outbox in local storage | Transactional email and an SMS vendor, plus consent |

Also not integrated, and not faked with made-up comps:

- Assessor value lookup (the brief's pipeline; this demo asks the visitor to type the bill).
- MLS or a licensed comp feed (BatchData, ATTOM, or a Realtor partnership are named in the brief as options, not as a connected account).
- A server-side notice parser.
- Deadline reminders at 60/30/7 days.
- Real contingency collection after a reduction. Contingency is mentioned on the pricing page as coming soon, pending review, and is not a checkout card.

DIY never calls the e-file adapter. Unverified templates do not get a filing confirmation. A missing portal URL returns "not submitted." Checkout and the filing button both re-check `filingWindow` and stop when the adapter window is not open.

## Decisions

- **Static demo, one browser.** A `sherwood_db_v1` object in `localStorage` holds users, matters, payments, envelopes, filings, and the outbox. The signed-in user and the current matter id are in `sessionStorage`. There is no account server. The ops page can only see this browser.
- **County copy is data.** Marketing pages that used to type the Santa Cruz phone number now fill it from the adapter. The case study still tells the pilot story, including that one home's published figures ($158,915 reduction sought, about $1,955 a year, filed in a day, awaiting a decision).
- **No invented comps.** The free check blurs a sample line and says sales were not pulled. The statement preview says the same.
- **You sign the certification.** Round 2 is required for every checkout plan. Round 1 is required only for We file it (plan id `dfy`). The document title, source, and verified flag come from `agent_authorization` on the county adapter. The signed record is `matter.agentAuthorization` (`doc_title`, `source`, `verified`, `signerName`, `signedAt`, `envelopeId`, `parcel`, `taxYears`, `ownerGetsCopy`, and the agent name, address, and phone). `signedAt` is the completion time. The form has no date control. Agent name, address, and phone are `[pending]`. The filing button reads that record and stays disabled until it exists. Revocation steps are not invented; the explainer uses the placeholder "How to revoke: [pending verification]".
- **Two checkout plans.** DIY kit $79 and We file it $249. Santa Cruz `filing_fee.amount` is 50 and `refundable` is false, so the DIY price is one line, “$79 + $50 county fee, paid when you file”, and We file it reads “$249, county fee included.” The adapter note says the county fee is non-refundable and that fee waivers exist. The $249 card says “You won't be charged until the county confirms your filing.” The $79 card shows “[DRAFT – payment timing pending attorney review]”. The same price lines are on the pricing page, the FAQ, the home launch line, and the filing confirmation. A missing or zero `filing_fee` hides every county-fee line. The comparison label on each card is "Estimate from your numbers, if the county agrees to your value." No outcome is promised. Contingency stays on the pricing page as "Coming soon, pending review."
- **Closed window is a hard stop.** `regular_window` carries `source_url` and `verified_date`. Checkout cannot proceed when `filingWindow` is not `open`, including a window that has closed and a window whose start is missing. The closed screen and the off-season result use `nextWindowCopy`: dates only from a start that is still ahead, plus “No outcome is promised.” A passed window is not called the next window. The off-season result does not link into checkout. On an open window the plan step shows `deadlineBadge`, “County filing deadline: Nov 30, 2026” for Santa Cruz.
- **Skip market value.** Empty market value, or the Skip control, is borderline human review when the window is open. It does not block, and it does not invent a statistic.
- **Borderline does not auto-file.** Ops has to mark it reviewed. The demo path in the section below is a Go, so it does not stop there.
- **Off-season still keeps the lead.** "Remind me when filing opens" sets `remindWhenOpen` on the matter. The $49 monitor can be recorded from that same screen.
- **Refund policy is a draft.** `trust.html` and the pricing page mark the $249 terms “[DRAFT – pending attorney review]”. The card is saved and not charged until the county confirms the filing. Cancel before that confirmation: no charge. Cancel after that charge: refund minus the county fee. County rejects because of our error: we refile or give a full refund. County rejects because of the customer's information: refund our service portion only. This is not a final policy.
- **Room 520 vs Room 500** and **$50 vs $30** are shown as conflicts from the kit, not smoothed over.

## Demo path

Use the verified Santa Cruz adapter while its window is open (through November 30, 2026). Any assessed value clearly above your market estimate works. To mirror the published pilot math, the bill figures from that case study are an assessed value of $1,233,915 and a market estimate of $1,075,000. Add a tax bill only if you want a dollar savings estimate; the pilot's own tax was $15,176.44, which is how that case produced about $1,955. You do not have to use those numbers.

1. Open the site and submit an address and email.
2. On the numbers screen choose **Santa Cruz — Verified from the October 12, 2026 pilot kit**. Enter an assessed value above the market estimate. Leave confidence on "Sure enough to use." Submit.
3. The result should say **Go**. Continue.
4. On sign-in, create the link and open **Open the simulated magic link** in the same tab.
5. Choose **We file it** (“$249, county fee included.”). The card is saved and not charged. The page says “You won't be charged until the county confirms your filing.” The other card is **DIY kit** (“$79 + $50 county fee, paid when you file”) with “[DRAFT – payment timing pending attorney review]”. While the window is open the page also shows “County filing deadline: Nov 30, 2026”. No card number is requested. Contingency is not on this screen. Each card shows the price against the estimate, with the label "Estimate from your numbers, if the county agrees to your value."
6. Complete intake. Photos are optional.
7. Approve the kit.
8. Round 1 starts with the explainer (what you are signing, why Santa Cruz needs it, and "How to revoke: [pending verification]"). Continue, then sign agent authorization. Sign round 2 (certification and statement). Type a name. The signing screens say they are not DocuSign.
9. The filing screen keeps **Record the filing** disabled until the agent authorization is stored on the appeal. After you sign, press the button. The confirmation shows a simulated filing ID, the adapter's $50 e-file fee, and the Santa Cruz portal link. The portal is not contacted. The page was not filed on load.
10. Open **Track the appeal**. Read "What to expect now." Use **Advance one stage** to walk acknowledged → assessor review. Accept (round 3) or decline, then advance through hearing, decision, refund, and monitor. Enroll the monitor if you want the $49 record.
11. Paste a sentence containing "hearing" into Notices and save. The keyword note should suggest the hearing stage.
12. Open **Ops** (`admin.html`) and see the matter in the pipeline and Santa Cruz on the deadline list.

To see the other outcomes: a market estimate at or above the assessed value is a no-go; leaving market value blank, pressing Skip, marking a rough guess, or a gap under 5% with no tax bill is borderline; **Unverified template — September 15, paper only** is off-season after September 15, 2026. That result shows "Remind me when filing opens", says the adapter does not state an opening date, and offers the $49 monitor. Opening checkout for that matter stops with no payment button.

## Open legal questions

From the build brief, section 9. The pilot did not answer these. They need a California property-tax attorney before a real launch.

- Unauthorized practice of law: where form preparation stops and legal advice starts. Customer copy on this site is written to stay on the form-preparation side and to say Sherwood is not a law firm.
- Whether a non-attorney agent may represent a homeowner at an Assessment Appeals Board hearing in each target county, and any registration or qualification rules. Santa Cruz Rule 6, as cited in the brief, covers filing by an authorized agent. It is not treated here as permission to appear at a hearing. Hearing support stays "quoted per case."
- Contingency-fee compliance for non-attorney tax representatives. The 35% idea is not sold at checkout. The pricing page says "Coming soon, pending review." That is not a legal opinion that the fee is allowed.
- Data licensing for MLS or comp data at commercial scale.
- Privacy and CCPA handling of homeowner personal information. This demo avoids a server by keeping data in the browser, which is not a CCPA program.

## Per-county variation

A new county is a new JSON file plus a line in `data/counties/index.json`, then a verified test filing before `status` may be `verified`. The UI already branches on:

- `filing.efile` and `portal_url` (submit vs paper steps)
- `filing.filing_fee` (a number, or `{ amount, refundable, note }`; an amount above zero is the county fee on the plan cards; 0 or missing hides that line)
- `efile_fee.amount` / `paper_fee.amount` (null means "do not quote a number"; these stay as kit facts)
- `regular_window.start` / `end`, plus `source_url` and `verified_date` (null until someone verifies that county)
- `supplemental_days`
- `agent_authorization.doc_title`, `source`, and `verified`
- `signature_steps[].required_for`
- `agent.agent_filing_allowed` (null on templates)
- `hearing.format`, `notice_minimum_days`, `prep`
- `stage_expectations`, `rules`, `timelines`
- `homeowner_exemption` (omitted means the intake will not quote $7,000 or $86)

Until `status` is `verified`, the engine will not return Go.

## Place, email, and privacy

The first screen does not ask for an email. `js/place.js` decides the county in this order: the `?county=` parameter (kept for the browser tab), a property address the visitor typed, a county they picked in “Showing results for”, then an IP lookup that uses a county name only. An IP city such as Cupertino does not choose a variant and is not written into the headline. The headline city is filled only from a typed address or from `?county=`. The state may still fill `data-geo="region"`.

The first landing URL that carries `src` or `utm_*` is stored once in this browser (`sherwood_attribution`) and copied onto a reminder, a saved result, and the appeal. A later link does not replace it. An empty first visit does not block a later campaign. `?county=` stays separate, so `?county=santa-cruz&src=mail1` still selects the county. Ops counts paid appeals by `src`.

Launch copy (Santa Cruz County) names the $79 and $249 prices with the county-fee line from `filing_fee`. Any other confirmed county hides prices and offers a reminder. An ambiguous lookup shows the county picker and the check, without prices.

Every email field has the sentence “We use your email and approximate location only to run your check and send what you ask for.” linking to `privacy.html`. That page is marked “Draft, pending review” and lists address, email, IP-based approximate location, signatures, and payment via a processor. Deletion requests go through `contact.html`.

The B&P 17537.9 disclosure is one component, `js/statutoryDisclosure.js`, mounted at the top of the home page and `/santa-cruz/`. The same sentence is the first block in the reminder email templates. It is bold, in a 4px black box, at 34px, which is larger than body text and fine print. `/santa-cruz/?src=search` still selects Santa Cruz and stores `src=search` as the first touch. The separate “not a law firm” box stays on the home page, `/santa-cruz/`, checkout, and the result when checkout is the next step. On those pages the headline is bold at 20px. Reminder headings stay at 20px.

The $49 annual monitor shows its renewal terms next to an unchecked consent box. Agreeing stores a consent record kept for 3 years, sends the confirmation template, and the daily job sends a renewal notice only when the date is 15 to 45 days before renewal. `cancel.html?token=` is the one-click cancel page. Signed agent authorizations store a keep-until date three years out. Ops states “Signed agent authorizations are kept 3 years.”

`trust.html` has a “Who we are” block. Founder name, bio, and photo are `[pending]`, along with the Santa Cruz tie and contact. The sample packet is `sample-packet.html`. It uses a fictional property (42 Example Lane, Fictional City) and is not the pilot.

## Reminders backend

`backend/` is the Firebase project: rules, indexes, and Node 20 functions. `js/config.js` holds `FUNCTIONS_BASE_URL`. While that string is empty, reminder and result emails stay in this browser and no request is made.

When it is set, the site POSTs to `createReminder` (outside a launch county, or when the filing window is closed) and `createLead` (email me this result). Checkout can POST `markConverted`. The function stores marketing consent with `consent_source`, `consent_requested_at`, and `confirmed_at`. `confirmed_at` is set only from the double opt-in link. A daily job in America/Los_Angeles sends a 14-day heads-up, an open-window note, and a 14-day deadline nudge if the reminder is confirmed and not converted. Dates come from the county adapter. Mail goes out through Resend. It is not sent unless `MAIL_POSTAL_ADDRESS`, `MAIL_FROM`, `RESEND_API_KEY`, and `PUBLIC_FUNCTIONS_BASE_URL` are set. Every email includes an unsubscribe link, that postal address, and a not-legal-advice line.

Setup steps for the owner are in `backend/README.md`. The GitHub workflow deploys rules and functions on a push to `main` that touches `backend/`, and it skips when `FIREBASE_SERVICE_ACCOUNT` or `FIREBASE_PROJECT_ID` is missing.
