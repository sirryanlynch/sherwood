# Personas

Source: the November 2026 jobs-to-be-done research, plus the GTM copy, finance, brand, and ops notes from the same week. Each person enters the same free check. The result decides whether We file it is offered.

| Persona | Door | Question | Pages | Primary CTA |
|---|---|---|---|---|
| Intention-Stalled Challenger (MVP) | Home hero | Can this just be handled? | `index.html` hero, `#handled`, checkout, sign, case page | Check my property, then Have Sherwood file it, $249 |
| Frustrated Acceptor | “Is it worth it?” | Is challenging it worth it? | `index.html#worth`, `results.html` | See if I have a case |
| Disconnected Payer | `/understand/` | Is anything wrong? | `understand/index.html`, no-action result | Explain my notice, then Check my property |
| Property Steward, family | `?for=parent`, `/steward/` | Can I handle this for a parent? | `index.html?for=parent`, intake, case page | Check for a parent |
| Property Steward, portfolio | `?for=portfolio`, `/steward/` | Can I watch several parcels? | `index.html?for=portfolio`, `steward/index.html` | Check a property, or join the waitlist |

## Intention-Stalled Challenger

Home H1: “Your property tax appeal, handled.”

The hero says what happens if there is a case ($249, county fee included, you sign, we file) and that a weak case is told the truth. The four-step stack is we gather, we fill, we file, you attend the hearing. The order cutoff for Santa Cruz stays “Orders for us to file close Nov 25, 2026.” There is no second paid filing product.

Checkout shows We do / You do, the hearing acknowledgment, and the $49 renewal terms before the card is saved. The card is still not charged until the county confirms the filing.

## Frustrated Acceptor

The result shows the numbers the visitor typed, a low / likely / high savings band, the assumption behind that band, and the $249 fee beside it. Comparable sales stay locked. We file it is offered only when the low estimate is at least $249 and the engine’s other Go rules pass (verified county, open window, market below assessed, not a rough guess).

What we do and what you do, including “you attend the hearing,” is on the result. Emailing the result is the step before hiring us.

## Disconnected Payer

`/understand/` defines market value, assessed value, taxable value, and the tax bill in one sentence each. It says a higher bill can come from the tax rate or voter-approved charges, and that only value is appealable.

“No action recommended.” is the customer name for an engine `no_go`. That page does not sell a filing. It offers “Remind me next year,” a link back to the explainer, and the standalone $49/yr monitor. The monitor’s renewal price and cancel path are on the form before any charge. The first year of monitoring is not included unless there is a filing.

## Property Steward

Family (`?for=parent`): the same address check, with copy that the owner signs, or the advocate uploads a power of attorney or conservatorship. Intake asks who is paying and who owns. Both email addresses receive the five case emails. A POA upload is flagged in ops and blocks filing until a person marks it reviewed.

Portfolio (`?for=portfolio`): up to three addresses on the check. The first address enters the same numbers screen. The price is $249 per filing and $49/yr per parcel. The waitlist stores a note in this browser and does not take payment. Bulk filing is not built.

## Outcome copy

| Engine | Customer heading | Next step |
|---|---|---|
| `go` and low estimate ≥ $249 | You likely have a case. | Have Sherwood file it, $249 |
| `borderline` | It's close. A person will review it. | Send it for review (free). Before Nov 21 the line is “within 2 business days.” From Nov 21 it is “before Nov 25, or we'll tell you we can't take it this season.” Ops recommended that wording. Ryan has not confirmed it. |
| `no_go` | No action recommended. | Remind me next year |
| `off_season` | Filing is closed for this season in [county]. | Email me when it opens |

The low figure is half the bill math: `(assessed − market estimate) × (tax bill ÷ assessed)`. The likely and high figures are that full math. The page calls this Sherwood’s planning assumption, not a county rule and not a promise. No comparable sales are invented.

## Mobile and desktop

Mobile leads with the address field, a sticky deadline chip, and a sticky Check my property button. The house story collapses to one sample card. Results put the decision above the evidence. Primary buttons are full width and at least 52px tall.

Desktop keeps the house story, a two-column result (evidence and decision), and the same signing and case pages. Signing, the kit, and the case page use the same large controls at 375px.
