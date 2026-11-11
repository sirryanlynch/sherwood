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

## Owner decisions (not resolved)

1. **Negotiation wording.** Ops and the GTM case-page footer say the page should state “We don't negotiate or accept offers for you.” The We file it acknowledgment, which is still the checkbox at checkout, says we “work toward an informal reduction or settlement with the Assessor.” This build keeps the acknowledgment. The case page does not use the ops sentence. The FAQ says we work toward an informal reduction or settlement, and that the owner decides whether to accept one. The owner has to choose which sentence is the public one.

2. **Tax years on the authorization.** Ops and the GTM case-page row say the authorization covers one tax year. Signing still offers the filing year and earlier years, four at most, and the signed record stores whichever of those the customer checks. This build keeps that behavior. The case page prints the years that were signed. It does not say “one tax year.”

3. **Price display.** Finance’s statewide formula is $199 plus the county fee. `SHOW_199_PLUS_COUNTY_FEE` is still false, so Santa Cruz stays “$249, county fee included.” That flag was not turned on.

4. **“Full refund” if we decline after intake.** The pricing draft now includes that sentence, inside the existing `[DRAFT – pending attorney review]` block. The charge gate is unchanged: the card is saved and not charged until the county confirms filing. Declining before that confirmation means nothing was captured, so “you pay nothing” is the same event as a refund of a charge that never happened. A refund after a captured charge is still the older draft (refund minus the county fee, or a full refund if the county rejects because of our error). Those are not the same case. The owner should say which one counsel is reviewing.

5. **Borderline review time.** The result says “You'll get an email within [X business days, PENDING Ops capacity].” No number was invented.

6. **Retention.** The privacy page says appeal-record retention is `[pending attorney review]`. Ops suggested 4 years. That number was not adopted. The existing rule that signed agent authorizations are kept 3 years is still on the appeal.

7. **Mobile disclosure.** GTM asked to collapse the statutory disclaimer below the fold on mobile, pending an ops confirmation that this is compliant. The footer dialog is unchanged. It was not collapsed.

8. **Portfolio price.** GTM said the 5+ parcel form should show no price. Finance said the price stays $249 and $49 per parcel, with no bulk discount, and no payment. The steward page shows the per-parcel prices and a waitlist that does not charge.

## Not in this prototype

- A live email provider. The five events are outbox rows.
- Proactive status updates between those events.
- Bulk filing, or taking payment for a portfolio.
- Real DocuSign, Stripe, or county e-file.
- The deadline emails at 14, 7, and 2 days before Nov 25. The Firebase job already has its own reminder windows. Those were not retimed.
- Agent name, address, and phone. They are still `[pending]`, so Record the filing stays disabled until those are real. That gate was not relaxed.
