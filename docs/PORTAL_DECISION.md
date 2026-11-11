# Portal decision

The prototype uses one read-only case page (`dashboard.html`) plus five simulated emails. This note is for the owner. It does not pick a winner where the inputs disagree.

## What is built

The case page shows:

- The signed authorization and a PDF download. Scope is the parcel, the tax years actually signed (the filing year and earlier years, four at most), filing only, and that the named agent does not attend the hearing.
- The application preview and, once a filing record exists, the county receipt fields (confirmation, reference, receipt). Downloads are simulated PDFs in this browser.
- Key dates: adapter deadline, filed date, hearing date when one is stored.
- One next-action line. When a hearing is on the record it includes “You attend the hearing.”
- The notices inbox, read-only. Ops logs a forwarded notice. The customer does not edit it here.
- The five emails as a preview list: received, signed, filed (PDF names attached), hearing scheduled, decision. They are written to the existing simulated outbox. Nothing is delivered.
- Deadline reminders at 14, 7, and 2 days before Sherwood’s order cutoff and before `regular_window.end`. They are stored only after an unchecked “Email me reminders” box is checked. Each one includes an unsubscribe link. The cutoff subject is “Our filing cutoff is Nov 25.” The county subject uses the Nov 30 deadline. Nov 25 is never called the county deadline.
- One customer action: “I got my hearing notice.” Ops can send the single follow-up, then the log stops.

Login is still the simulated magic link. Nothing else on the case page is a form. Stage changes, notice logging, POA review, and county confirmation stay on the ops page. The charge gate is unchanged: “Mark filed, then charge” still requires a filing time, a filing id, and `countyConfirmedAt`, and a simulated filing still cannot be charged.

The hearing acknowledgment is unchanged: “We prepare your evidence, file your appeal, and work toward an informal reduction or settlement with the Assessor. If your case goes to a hearing, you attend…” The owner decides whether to accept a stipulation. That decision is a link off the case page into the existing round-3 signature, or a decline.

## Minimum portal vs email-only

| | Email only | This case page |
|---|---|---|
| Record of the signed authorization | Attachment on the signed email | Same attachment, plus the page keeps the scope and the PDF |
| Filing confirmation and number | On the filed email | On the page, next to the receipt fields |
| Deadlines and “you attend” | In the hearing email | One line on the page, and the hearing email |
| Notices the customer forwards | A reply to an email | Ops pastes them into the inbox on the page |
| Hearing-notice handoff | The hearing email asks for a reply | The page has “I got my hearing notice,” and ops can send one follow-up |
| What it costs to run | An email provider | The same emails, plus a login and a stored case |

Email-only can carry the five events. It does not leave the customer a place to open the signed PDF, the filing number, and the hearing line six months later without searching their mail. The case page is that place. It is not a status feed and it does not promise that Sherwood will write with news the customer did not trigger.

## Resolved by Ops, subject to Ryan's veto

4. **Payment if we decline after intake.** Ops removed the “full refund if we decline after intake” line. The live rule stays: the card is saved and is not charged until the county confirms the filing. Declining before that confirmation means you pay nothing, because nothing was captured. Checkout shows that saved-card sentence next to a simulated card field, with an unchecked consent box. The older draft for a charge that already happened (refund minus the county fee, or a full refund if the county rejects because of our error) is still on the pricing page inside `[DRAFT – pending attorney review]`.

7. **Mobile disclosure.** Ops says the statutory disclaimer may collapse on mobile: a tap expands it, and the full sentence stays in the page. Desktop stays the footer dialog. The control is a button, not a `<details>` element.

## Owner decisions still open

1. **Negotiation wording.** Held for Ryan. The live We file it acknowledgment still says we “work toward an informal reduction or settlement with the Assessor.” The FAQ keeps that sentence and “If the assessor offers a settlement, you decide.” Ops and the GTM case-page footer would say “We don't negotiate or accept offers for you.” That sentence is not on the case page.

2. **Tax years on the authorization.** Ops and the GTM case-page row say the authorization covers one tax year. Signing still offers the filing year and earlier years, four at most. The case page prints the years that were signed. It does not say “one tax year.”

3. **Price display.** Finance’s statewide formula is $199 plus the county fee. `SHOW_199_PLUS_COUNTY_FEE` is still false, so Santa Cruz stays “$249, county fee included.”

5. **Borderline review time.** Ops recommends “You'll get an email within 2 business days.” From Nov 21 the line is “You'll hear from us before Nov 25, or we'll tell you we can't take it this season.” Nov 25 in that sentence is our order cutoff. This is an Ops recommendation for Ryan to confirm. It is not a final promise.

6. **Retention.** The privacy page says appeal-record retention is `[pending attorney review]`. Ops suggested 4 years. That number was not adopted. Signed agent authorizations are still kept 3 years.

8. **Portfolio price.** The steward page shows $249 per filing and $49/yr per parcel, and the waitlist does not take payment.

9. **Hero.** The homepage H1 stays “Your property tax appeal, handled.” Ryan’s sign-off on that line is still open.

## Finance note for Ryan

Filing is recorded before the card is charged. That is a file-first, charge-second collection risk: the county fee and the work can be spent before Stripe captures $249, and a failed capture is not recovered by the filing itself. The free monitor year starts only when that charge is captured. A declined or never-filed case does not get the free year. Before filing, the payment adapter runs a simulated $0 authorization. If it fails, filing stays off until the customer updates the card. Ops can force the next check to fail. None of this charges a real card.

## Not in this prototype

- A live email provider. The five events are outbox rows.
- Proactive status updates between those events.
- Bulk filing, or taking payment for a portfolio.
- Real DocuSign, Stripe, or county e-file.
- A live sender for the 14/7/2 deadline reminders. The dates are stored in this browser’s outbox only. The Firebase job was not retimed.
- Agent name, address, and phone. They are still `[pending]`, so Record the filing stays disabled until those are real. That gate was not relaxed.
