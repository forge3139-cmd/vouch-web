# VOUCH-WEB

Context for the **web project** — `C:\Projects\vouch-web` (Next.js).

The mobile app lives separately at `C:\Projects\vouch` (Expo, React
Native). Both connect to the same Supabase database. The database is the
link, not the codebase.

> **No design direction in this file.** Visual design comes from the
> screenshots and references provided in conversation. Do not invent
> colours, spacing or component styles from this document.

---

## What VOUCH is

A CV is a document someone writes about themselves. Nobody can verify
it, so employers guess.

VOUCH replaces it with a **permanent, portable record of work that
other people confirmed**. Someone does a job; the person they did it
for confirms it happened, rates it, and says whether they'd hire them
again. That becomes a **Record** — a fact two people created together,
which neither could have made alone.

> **A CV is one person's claim. A Record is two people's fact.**

Records accumulate as evidence. The worker shares one link instead of
a CV.

**Who it serves:** people the formal economy cannot see. A tailor, a
mechanic, an AC technician — skilled workers with no corporate email,
no LinkedIn, and no way to prove fifteen years of good work.

---

## What this web project is for

**The confirmation page. That's the priority.**

It is the only part of VOUCH a non-user ever touches, and it is where
every Record in the system is born.

```
Worker sends a link (WhatsApp, SMS, or pasted)
        ↓
Client opens it in a browser
        ↓
NO APP INSTALL · NO ACCOUNT · NO SIGNUP
        ↓
They confirm in about 30 seconds
        ↓
A Record exists
```

Later this project may also host the public profile (the shareable
link that replaces a CV) and a marketing page. **Confirmation comes
first.**

---

## Why this page carries so much weight

**It is the evidence engine.** Nothing enters VOUCH without passing
through it.

**It is the growth engine.** Every confirmation request reaches someone
who is not a user, and shows them the product working from the inside.

**It is the one untested assumption.** Whether a real person will tap a
link and confirm work for an app they've never heard of is the single
open question the entire product rests on. This page is the experiment.

If it is confusing, slow, or feels like a favour with nothing in
return, VOUCH does not work.

---

## The confirmation flow

### 1 — Language
English or Kiswahili. First thing shown, before anything else. The
person opening this did not choose to use VOUCH and may not read
English.

### 2 — The ask
State plainly who is asking, what they say happened, and how long this
will take. The person needs to understand what VOUCH is within about
five seconds.

Two paths: confirm, or "I don't recognise this."

### 3 — The questions
Short. One idea at a time.

```
Did this work happen?            yes / no
What did they do?                pre-filled, editable
When?                            month + year
Was it completed?                yes / partly
How was the work?                1–5
Would you work with them again?  yes / maybe / no
Add a photo                      optional
```

### 4 — Success, and this part matters

Confirming cannot be charity. The confirmer must get something back or
they won't do it a second time and won't tell anyone.

After confirming, show them:

- Their **trusted network** — people whose work they've confirmed
- The ability to **hire that person again**
- Access to **other verified people nearby**
- An optional route to creating their own VOUCH profile

The confirmation is the door into the network, not a favour.

---

## Hard constraints

**No account required.** Ever. Adding a signup wall here kills the
growth loop and the evidence loop simultaneously.

**Must work on a cheap Android over mobile data.** Target under two
seconds on a slow connection. No heavy media, no large frameworks
loaded before first paint, no video.

**Bilingual from the start** — English and Kiswahili. Externalise every
string. Do not hardcode text.

**Mobile-first.** Almost every visitor arrives from a WhatsApp message
on a phone.

**No jargon.** The visitor has never heard of VOUCH. Words like
"Record", "evidence strength" and "standing" are internal vocabulary
and should not appear raw on this page.

---

## Rules that apply here

**Never show a score.** No 0–100, no 4.9 out of 5. Facts only:
*"12 jobs confirmed by 9 different people."*

**Rating and payment are separate.** Someone can confirm the work
happened and also say they weren't paid. Never bundle them.

**Facts and opinions are different things.** "The work happened" is a
fact. "The quality was poor" is an opinion. A confirmer can say both at
once, and the form must let them without it feeling contradictory.

**A rejection is not an accusation.** "I don't recognise this" opens a
question, it does not punish anyone.

**Confirmation strength varies.** An anonymous link confirmation is
weaker than one from a verified phone, which is weaker than one from a
verified organisation. The page collects what it can and lets the
system decide the weight.

**Never expose private data.** The confirmer sees only what is needed
to confirm this one job. Not the worker's other clients, not their
rates, not their other records.

---

## The database

Supabase. Full schema in `vouch-schema.sql` (mobile project). The
tables this project touches:

### `confirmation_links`
```
id · record_id · token (unique) · sent_to · language
opened_at · completed_at · expires_at · created_at
```
Look up by `token` from the URL. Set `opened_at` on load and
`completed_at` on submit — the gap between them tells you where people
abandon.

### `records`
```
id · worker_id · confirmer_id · confirmer_type · agreement_id
kind · status · is_ongoing · tier
title · description · role_title
started_at · ended_at · submitted_at · confirmed_at
payment_status · created_at
```
`status` moves `submitted` → `confirmed` when the form is completed.

`confirmer_type` is `client | employer | colleague | teacher |
institution` — a degree confirmed by a university is the same object as
a job confirmed by a client.

### `confirmations`
```
id · record_id · confirmer_id · confirmer_name · confirmer_contact
strength (0–4)
work_happened · delivered_on_time · would_work_again
rating_reliability · rating_quality · rating_communication
rating_timeliness
comment · released_at · created_at
```
This is what the form writes.

**`strength`** — set from how verified the confirmer is:
```
0  anonymous link
1  verified phone or email
2  verified VOUCH human
3  verified organisation
4  repeat relationship
```
An anonymous confirmation is still a real confirmation. It just counts
for less. This is what makes self-confirmation from a second phone
produce weak evidence by construction rather than needing to be
detected.

### `proofs`
```
id · record_id · uploaded_by · side ('worker' | 'confirmer')
file_url · media_type · caption · created_at
```
Optional. **Never required.** A mechanic has no digital artifact of a
repaired gearbox — demanding proof would exclude exactly the people
VOUCH exists for. When both sides upload, the Record's strength rises.

### `identities`
```
id · kind ('person' | 'organisation') · display_name
headline · location · language
```
Read-only here — to show who is asking for the confirmation.

---

## Double-blind

When work is agreed through VOUCH, both sides rate each other and
**neither sees the other's rating until both have submitted, or seven
days pass**. `released_at` controls this.

It stops retaliation without letting anyone veto a bad review. Bear it
in mind if this project ever displays ratings.

---

## Things to get right

**Speed over polish.** A page that loads in one second and looks plain
beats a beautiful page that takes six. The visitor did not choose to be
here.

**Explain VOUCH in one sentence, immediately.** Something like: *"VOUCH
helps people prove the work they've actually done."* Not a paragraph.

**Make the ask feel small.** "About 30 seconds" up front, and then be
truthful about it.

**Track abandonment.** Log where people drop — opened but not started,
started but not finished, which question they stopped at. This data
answers the most important open question in the product.

---

## Do not build here

- Signup walls or login gates on the confirmation flow
- The full app experience — that's the Expo project
- Anything that requires JavaScript to render the core question
- Analytics or tracking scripts that slow first paint
- Anything assuming the visitor knows what VOUCH is
