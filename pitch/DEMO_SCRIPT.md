# Demo script — ICA, Referral Readiness

Two scripts, two minutes each.

- **A. Live finalist demo** runs on IHH's real de-identified packets, on the judges' call only.
- **B. Public recording** uses only the invented packet "Maria". A public video may never show a
  real packet.

Blanks (`__`) are filled from the app at 3:15. If a blank is still empty at demo time, say
"we didn't measure that" instead of a number. If a feature was cut at 3:15, cut its line too.

---

## A. Live finalist demo (2:00, real packet)

**Before the call:**
- Run one real packet through ICA and keep the result open, labeled as already processed. If the
  live run is slow or fails, show that one and say so.
- If anyone says the call is recorded or streamed publicly, switch to script B.
- Pick the packet and note its pages now: packet R__, form page __, chart page __, and the rule ID.
  **Write these on paper, never in this file.** No detail from a real packet (diagnosis, quote, age)
  goes into the repo.

| Time | Screen | Say |
|---|---|---|
| 0:00 | ICA's docket | "IHH's representative estimated this morning that about half of applicants fall out, and about half of those leave the hospital early. That's their estimate, not an audit. As IHH puts it, a hospital bed isn't housing. IHH builds the bridge between survival and stability, and this is a tool to help its coordinators get people across it." |
| 0:20 | The docket | "This is the coordinator's docket. These are IHH's own referrals, de-identified, read where they sit. Each one is marked ready for decision, missing items, or needs LVN." Open packet R__. |
| 0:35 | Box 1: What's missing | "One screen, four boxes, and what's missing comes first. IHH asked for exactly this: quick answers to what's missing in a file. Each item is tied to IHH's own rule ID. If it's not in the packet, ICA says unknown, never normal." |
| 0:50 | Box 2: Needs LVN review | "This is the kind of thing that hides deep in a chart. The form on page __ says [__]. The chart on page __ says [__]." Click the page number; the page opens. "ICA doesn't pick a side. Today this goes to a busy LVN by email or fax. Here every conflict and clinical call sits in one short brief, each with its quote and page." |
| 1:10 | Box 3: What we know (with pages) | "Every finding has its quote and page, and every quote was checked against the page it cites." Click Checked on one finding. "A person confirms each one, or marks it wrong, and the correction is logged. This rule needs a date, and the dates in these packets are blacked out, so ICA says 'can't tell from this packet'. It won't guess." |
| 1:30 | Box 4: Next action | "Each open issue is one item: its rule, its pages, one question, and who owns it: the hospital, the LVN or the coordinator. The hospital's items become one message, each line with IHH's rule ID. ICA drafts it; it has no way to send it." The coordinator picks a decision and types a reason. "The coordinator decides, and the reason is logged. ICA never decides." |
| 1:50 | The eval | "On IHH's 11 real referrals, ICA's lean matched IHH's decision on __ of 11. That's a lean, not a decision. Every quote was checked against its page, and __ that didn't match were set aside." |
| 2:00 | — | "IHH builds the bridge between survival and stability. ICA helps its care teams move people across it, one checked step at a time." |

**If a judge hands you a new packet:** run it live. While it reads, say what it's doing: "It's
transcribing each page, then checking every quote against its page." Don't promise a time; say how
long it actually took.

**If asked "is it right?":** point to the eval line and to "Where it gets things wrong" in the
README. Say what it missed.

---

## B. Public recording (2:00, invented packet only)

**Before recording:**
- Only the synthetic demo docket on screen. Close every real packet, window and tab first.
- Every Maria page is marked synthetic test data. Keep that marking visible.
- Say once, at the start, that the patient is invented.

Facts below are from the invented packet `maria-short` (6 pages).

| Time | Screen | Say |
|---|---|---|
| 0:00 | Title or docket | "IHH's representative estimated that about half of applicants fall out, and about half of those leave the hospital early. That's their estimate, not an audit. As IHH puts it, a hospital bed isn't housing. This is ICA, a tool for IHH's referral coordinator. Everything you'll see is an invented patient, so no real record is shown." |
| 0:20 | The demo docket | "This is the docket: each referral marked ready for decision, missing items, or needs LVN. Let's open Maria, an invented 6-page referral." |
| 0:30 | Box 1: What's missing | "One screen, four boxes, and what's missing comes first. No health-plan authorization. No history and physical. No statement of a 30-day medication supply. And the most recent vitals, on page 3, are 41 hours old when the referral arrived; IHH asks for vitals from the last 24 hours. Each line names IHH's rule, so the coordinator knows exactly what to ask for." |
| 0:55 | Box 2: Needs LVN review | "Page 4, the therapy note, says 'Transfers: independent' and 'ambulated 40 ft'. Page 6 says '2-person assist'." Click page 6; it opens. "Those don't agree, and IHH asks for walking 100 feet. ICA doesn't pick. It goes to the LVN as one short brief, with both quotes and both pages, instead of a chain of emails and faxes." |
| 1:20 | Box 3: What we know (with pages) | "Page 2: 'sleeps in her car'. Every quote was checked against the page it cites." Click Checked. "A person confirms each finding, or marks it wrong, and the correction is logged." |
| 1:35 | Box 4: Next action | "Each open issue is one item with its rule, its pages, one question and an owner. The hospital's items become one message, each line with IHH's rule ID. ICA drafts it. It cannot send it. The coordinator decides, and the reason is logged. ICA offers a lean, and only a lean." |
| 1:55 | — | "IHH builds the bridge between survival and stability. ICA helps its care teams move people across it, one checked step at a time." |

**Do not say in either script:** "AI decides", "automates admissions", "HIPAA compliant" (say
"designed for HIPAA"), any time saved or outcome we did not measure, or any product name.
