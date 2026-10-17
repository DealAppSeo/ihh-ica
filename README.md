# ICA — Referral Readiness

> For IHH's referral coordinator: ICA turns a faxed hospital referral into what's missing and what
> needs the LVN, with a quote and a page number behind every finding, and turns each open issue
> into one item with an owner. The coordinator decides.

**Team:** Sean (solo)
**Members:** Sean
**Challenge:** 1 Referral intake
**Built at:** Orange County | Claude Impact Lab, October 17, 2026, with Illumination Health + Home

## The problem

IHH's representative at the event estimated that about half of applicants fall out, and about half
of those leave the hospital early. That is their estimate, not an audited figure. Each referral is
15 to 35 faxed pages, read by hand against six pages of criteria with an answer promised within two
hours; the fact that decides it is often deep in the chart, and anything not in the packet is
unknown, not normal. What IHH asked for, in their words: "quick answers to what's missing in a
file", faster correct decisions, and a quicker way through the referral docket.

## What we built

> Items marked *planned* are being built today, and items marked *if time allows* may not make it.
> The app lane confirms or cuts each one at 3:15.

ICA does three jobs.

### 1. Prepare *(if time allows)*

A pre-check a hospital can run before it sends a referral. It gives referral preparation guidance:
what IHH will look for and what the packet seems to lack. It never says "eligible".

### 2. Resolve

An unknown fax becomes what's missing and what needs the LVN, with pages.

- **The docket** *(planned)*. A queue of referral packets, each marked ready for decision, missing
  items, or needs LVN.
- **Every page transcribed.** The packets are image-only faxes. Each page is transcribed on its own
  and keeps its page number.
- **One review screen, four boxes, in this order** *(planned layout)*:
  1. **What's missing.** What the packet lacks, each item tied to IHH's rule ID. Not in the packet
     means unknown, not normal.
  2. **Needs LVN review.** Today, conflicts go to a busy LVN by email or fax. This box puts every
     conflict (the form says one thing, a note deep in the chart says another) and every
     clinical-judgment item into one short brief, each with its quote and page. ICA doesn't pick a
     side.
  3. **What we know (with pages).** For each of IHH's rule IDs, what ICA found, the quote, and the
     page. Click the page number to open the page. Dates are blacked out in these packets, so any
     rule that needs a date or a count of hours says "can't tell from this packet".
  4. **Next action.** One clarification draft to the hospital, each item tied to IHH's rule ID; a
     copy-ready note *(planned)* to paste into IHH's case-management system or EMR; and the
     coordinator's decision with the reason, logged. ICA drafts and offers a lean, labeled as a
     lean. It has no way to send anything, and it never decides.
- **Checked / Wrong on every finding** *(planned)*. A person confirms each finding against its
  page or marks it wrong, and corrections are logged.

### 3. Coordinate *(planned)*

Every unresolved issue becomes one structured item, not a chat thread: its rule ID, its evidence
pages, one specific question, the role that owns it (hospital, LVN or coordinator), a status, and
quick replies. Role views *(if time allows)* show each role its own items. Switching roles is a
demo, not real permissions.

### How we check it

On IHH's 11 real referrals, ICA's lean matched IHH's decision on **__ of 11** *(TODO app lane)*.
A lean is not a decision.

*Screenshot: TODO (app lane).*

**Demo video:** TODO link. The public video uses only the invented demo packet.

## How Claude is used

**How we built it.** Built on the day with Claude Code: one session wrote the app in `ica/`, a
second wrote this README and the pitch, and Sean reviewed each step before it was committed. The
night before, Sean used Claude to plan and to generate the invented demo packet (see
[Data and privacy](#data-and-privacy)).

**What Claude does when ICA runs:**

1. Reads each image-only fax page and transcribes it, page by page.
2. Checks the transcription against IHH's official rule IDs from
   [`admission-criteria.json`](challenges/1-referral-intake/criteria/admission-criteria.json) and,
   for each rule, returns a finding with a short quote and its page number.
3. Every quote is then checked against the page it cites by TrustShell's open-source grounding
   check (Apache-2.0, vendored in this repo). A quote that is not on its page, or a wrong page
   number, is set aside and the rule is marked unclear. This is how ICA keeps ground rule 4: no
   made-up page numbers or quotes.
4. Drafts the clarification message from the checked findings (and, as planned, the LVN brief and
   the case note). It never sends anything.

**What a person checks:**

- Each finding, with Checked or Wrong *(planned)*. The grounding check compares a quote with the
  transcription, not the image, so the coordinator opens the page to confirm.
- Every conflict. It stays open until a person resolves it.
- Every clinical judgment, such as medical stability or orientation. ICA shows the evidence; the
  coordinator or the LVN makes the call.
- The decision. Only the coordinator decides, and the decision is logged with the reason.

## Try it

> **TODO (app lane, 3:15):** fill in this table and the commands.

| What | Value |
|---|---|
| Installed | TODO |
| Environment variables | TODO. The API key goes in a local env file that git ignores, never in the repo |
| Packets | Download the 11 packets from the event's Google Drive into `challenges/1-referral-intake/packets/` ([how](challenges/1-referral-intake/README.md)). ICA reads them in place |
| Start | TODO |
| Open | TODO |

```bash
# TODO (app lane): exact steps to run ICA on a laptop
```

## What is real and what is mocked

> **TODO (app lane, 3:15):** set each status to working, partly working or mocked.

| Part | Status |
|---|---|
| Prepare: hospital pre-check (guidance only) | TODO (if time allows) |
| Docket view | TODO |
| Transcription of image-only faxes | TODO |
| Box 1: What's missing | TODO |
| Box 2: Needs LVN review (conflicts, clinical calls) | TODO |
| Box 3: What we know, with pages and "can't tell" | TODO |
| Box 4: clarification draft | TODO (drafted only) |
| Box 4: copy-ready case note | TODO (copy and paste only) |
| Box 4: coordinator decision log | TODO |
| Quote check against the cited page | TODO |
| Checked / Wrong on each finding | TODO |
| Coordinate: one item per open issue, with owner and status | TODO |
| Role views | TODO (if time allows; a demo switch, not real permissions) |
| Eval against IHH's 11 decisions | TODO |
| Sending anything to a hospital | Not built, by design |
| Connection to any IHH system | None, by design |

## Where it gets things wrong

> **TODO (app lane, 3:15):** add what we saw it miss on the real packets.

| What we saw | How often, and on what | What we would do |
|---|---|---|
| TODO | TODO | TODO |
| A misread page can still pass the quote check, because the check compares against the transcription, not the image | Known by design | The coordinator opens the page before relying on a finding |
| IHH's children's criteria are not covered | Any packet for a patient under 18 | ICA shows a "Children's program" banner so the coordinator reviews it against the children's criteria by hand |
| Rules that need a date or a count of hours, such as INF-2, CARD-1, DOC-6 and DM-3, cannot be checked on these packets | Every packet: the dates are blacked out | ICA says "can't tell from this packet" and puts the item in the clarification draft |

**What we would not trust it with yet:** making the decision, any clinical judgment, or any finding
that no person has checked against the page.

## Next steps

**To pilot it:** a 30-day shadow pilot. ICA reviews each referral alongside the coordinator, the
coordinator decides exactly as today, and we measure, rule by rule, how often they agree. ICA is
designed for HIPAA, not certified: before any real referral it would need IHH's IT and compliance
sign-off and a BAA covering the model provider and the host.

**Fitting IHH's systems:** IHH told us their team communicates by email and fax and works in KIPU
(their CRM) and an EMR. Today ICA connects to none of them (ground rule 2) and gives a copy-ready
note instead. Integration with KIPU or the EMR comes later, with IHH's permission.

**With one more week:** the plan is in [pitch/VISION.md](pitch/VISION.md), "The Care Coordination
Bridge": an installable phone app for hospital and IHH roles, trust earned per rule from measured
agreement, a morning brief for the coordinator, and the moments after the yes.

## Data and privacy

This project uses only data from the event repo and public sources. It contains no real
patient or client information. It does not connect to any Illumination Health + Home system.

- The 11 official packets are de-identified real referrals. ICA reads them in place from
  `challenges/1-referral-intake/packets/`, which git ignores. They are never copied into this repo,
  and the public demo video does not show them.
- The demo packet "Maria" is invented. It was generated the night before the event so a public
  recording could be made without showing a real packet. Every page is marked as synthetic test
  data.
- IHH's decisions (`challenges/1-referral-intake/eval/decisions.json`) are used only to score ICA
  after a review. The review step never reads them.
- API keys live in a local env file that git ignores.

**Credit:** quote checking uses `ground.ts` from TrustShell (Apache-2.0), vendored with its license
header.

## License

[MIT](LICENSE). The vendored TrustShell file keeps its Apache-2.0 license. IHH's admission criteria
and referral form remain IHH's documents.
