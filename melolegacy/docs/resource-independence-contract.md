# Melo Resource Independence — Application Contract
Version: 1.0 — 2026-11-20

This is one Melo ecosystem and one MeloLegacy application. The repositories are separate storage/work spaces, not separate products.

The governing policy and current funding register are maintained in Studio:
https://github.com/truongquyasia712001-cell/Melolegacy-Studio-/blob/research/borrow-learn-build-own/docs/resource-breeding-independence-and-funding.md

## Mandatory product rules
1. Every external provider, sponsor dataset, model, API and compute resource must be registered with source, version, license/contract, attribution, allowed operations, expiry and deletion/exit terms.
2. Never mark a third-party dataset, re-annotated crop, model output, fine-tuned weight or synthetic derivative as Melo-owned merely because Melo processed it. The rights basis must be reviewed and recorded.
3. Prefer independent Melo assets: score images rendered from Melo-authored MusicXML, legally usable notation fonts, controlled synthetic transformations, teacher/student contributions with explicit permission, and Melo-authored annotation/QA.
4. Keep sponsor-restricted, private learner, shared training and open research corpora logically separated.
5. A teacher/student upload is private by default; it is not automatically training data or public material.
6. The notation record must preserve image geometry and musical semantics: staff position, pitch, octave, duration, accidental, clef/key/time context, symbol relationships, confidence, annotator and correction history.
7. Each model must have a reproducible lineage record: code commit, dataset versions, licenses, base weights, training run, metrics and rights review.
8. When a sponsor/provider is removed, the app must continue using lawful Melo-owned/exportable assets and a replaceable provider adapter. Restricted resources must be deleted/returned when required.
9. No paid service, account, grant, or external integration is activated without explicit approval and review of ongoing costs and post-credit billing risk.

## Product-facing behavior
- Display provenance and confidence for machine-recognized notation.
- Keep original score, machine proposal, user-corrected version and teacher-verified version distinct.
- Allow export in open formats where the user has rights.
- Do not train shared models from private student content without explicit consent and policy approval.
- Keep YouTube content under platform/API terms; do not download or extract unauthorized audio.

## Current funding leads
The Studio policy register tracks AWS Education Equity (up to USD 10,000 credits for eligible organizations; rolling application), Google Cloud Research Credits (institutional researcher eligibility; Vietnam included), EMKP Legacy Digitisation (conditional on endangered legacy material and a host institution; deadline 1 December 2026; CC BY-NC-SA 4.0 outputs), and future EAP/MEAP archive calls. These are leads, not awards. No application or contact has been made.

## Implementation status
Policy/documentation only. No application code, dataset, model, API credential or runtime provider has been added or activated.