# Next Build: CAS Branding & Capture Integration

This document reflects what is implemented today, the intended coordinator workflow, review findings, and recommended follow-up work.

## Guiding Principle

Vercel decides what needs to be captured from the merged publication data and capture manifest. The local app runs browser automation because WebAdMIT requires an interactive login/session. Serverless routes are not a substitute for that.

## Proposed Workflow

1. In Vercel admin, upload or merge the latest CAS Excel exports.
2. Import or adjust the admin settings JSON if needed.
3. Save the publication.
4. Saving writes the public publication blob and the capture manifest to Vercel Blob at `cas-branding-capture/current.json`.
5. Admin shows branding status for GradCAS and EngineeringCAS: `current`, `stale`, `missing`, or `not applicable`.
6. Open the local Flask branding capture app at `http://127.0.0.1:5050`.
7. In the local app, click `Load latest publication from Vercel`.
8. Confirm the manifest shows the expected publication title/slug and Program ID counts per profile.
9. Select the profile that is stale or missing.
10. Run guided login if needed.
11. In Edge, log in, navigate to CAS Configuration Portal, choose the correct CAS/cycle, open branding for a few programs, then close Edge.
12. Back in the local app, click `Capture and upload`.
13. The local app uses manifest Program IDs when the manifest is loaded and lists IDs for that profile; otherwise it falls back to the selected Excel report.
14. Capture runs visibly in Edge, saves a local snapshot, then uploads to Vercel Blob.
15. Refresh Vercel admin to confirm the profile status.
16. Refresh the public page to confirm student-facing branding appears.

## Implemented

| Area | Status |
|------|--------|
| Per-offering branding in publication data | Implemented in `src/lib/types.ts` |
| Merge branding from Blob/local snapshots by Program ID | Implemented in `src/lib/branding-store.ts` |
| Public page shows branding with merged data | Implemented via `getPublicationBySlug` |
| Named profiles `gradcas`, `engineeringcas` | Implemented |
| Shared GradCAS/EngineeringCAS inference | Implemented in `src/lib/cas-profile.ts` |
| Local Node CLI + Flask app for guided login/capture/upload | Implemented in `tools/branding/` and `tools/branding_flask/app.py` |
| Capture manifest written on create/update/merge | Implemented in `src/lib/cas-store.ts` |
| Flask loads manifest from Blob | Implemented via `tools/branding/read-capture-manifest.mjs` |
| Admin branding coverage, manifest pointer, local app link | Implemented in admin page and branding route |

## Current Architecture

Publications are stored at `cas-publications/{slug}.json` in Vercel Blob. The public home page uses `cas-publications/_current-view.json`.

The capture manifest is stored at `cas-branding-capture/current.json`. It is overwritten on publication create, update, or merge. It includes `publicationSlug`, `publicationTitle`, `publicationUpdatedAt`, `generatedAt`, and profile entries containing Program IDs, expected Excel names, labels, and latest snapshot metadata.

Branding snapshots and latest profile pointers live under `cas-branding-snapshots/`. The deployed app merges latest completed branding into publication data when serving.

The local Flask app loads environment values from `.env.local` and `.env.branding`, including `BLOB_READ_WRITE_TOKEN`, optional `CAS_BLOB_ACCESS`, and `BRANDING_LOGIN_URL`. Capture prefers manifest Program IDs when loaded; otherwise it uses the selected Excel report.

## Review Findings

### High: Global Manifest Path

The manifest is always `cas-branding-capture/current.json`. Last save wins across all publications. If multiple publications become active, the safer future design is a per-publication manifest path or a Flask-side slug verification step before capture.

Mitigation today: save the publication you are about to capture immediately before loading the manifest in the local app.

### Medium: Stale After Settings-Only Saves

Admin status now separates missing Program IDs from timestamp-only stale status.

`missing` means expected Program IDs do not have capture records. `stale` means all expected Program IDs have captures, but the latest completed branding snapshot predates the latest publication save.

This means a harmless settings-only save can still show `stale`, but the UI now explains that all IDs are present and the snapshot simply predates the latest publication save.

### Medium: Captured Count vs Offerings With Branding

Per-profile captured counts use any stored branding record, including error or empty-shell records. The summary branded-offerings count only includes `branding.status === "ok"`.

Improvement: rename or split the metric later into `IDs with any capture` and `IDs with OK branding`.

### Medium: Server-Side Branding Actions Still Exist

The admin page now points users to the local app, but the old `POST /api/admin/publications/[slug]/branding` guide/export actions still exist and hidden buttons still call `runBrandingAction`.

Improvement: remove these controls or gate them to local development once the Flask-only workflow is fully proven.

### Low: Blob Access Mode Alignment

The app and local manifest reader both use the same `CAS_BLOB_ACCESS` rule: private unless `CAS_BLOB_ACCESS=public`. Local `.env` should match production.

### Low: Blob Token Assumption

`readBlobJson` in `branding-store.ts` relies on `@vercel/blob` reading `BLOB_READ_WRITE_TOKEN` from the environment. Verify this SDK behavior or add explicit token passing later if needed.

### Low: Flask Delay Input

`delay_ms` parsing can throw on invalid form input. This is low risk with the current form.

## Recommended Next Steps

1. Add per-publication manifest paths or Flask slug verification if multiple active publications become real.
2. Align per-profile metrics with OK branding vs any capture, or rename the labels.
3. Remove or dev-gate the hidden server-side capture controls after the local manifest workflow is proven.
4. Confirm `@vercel/blob` token behavior in `readBlobJson` and add explicit token passing if needed.

## Acceptance Criteria

1. Upload/merge plus save on Vercel produces a manifest listing the Program IDs the public site expects per profile.
2. Local Flask can load that manifest and capture those IDs, or fall back to Excel when manifest IDs are absent.
3. Upload updates Blob so the deployed app shows merged branding on refresh.
4. Admin status is actionable and distinguishes missing IDs from stale snapshot timestamps.
5. HTML branding remains visible to students and coordinators as sanitized HTML, not plain text only.
