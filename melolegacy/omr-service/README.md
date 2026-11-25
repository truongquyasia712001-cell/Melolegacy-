# MeloLegacy OMR Service

PDF-to-MusicXML worker service using the official Audiveris 5.11.0 Linux package.

## API

- `GET /health` — service and engine availability.
- `POST /v1/jobs` — multipart upload with field name `pdf`; returns HTTP 202 and a job ID.
- `GET /v1/jobs/{id}` — queued / processing / completed / failed state.
- `GET /v1/jobs/{id}/result` — ZIP containing the MusicXML/MXL outputs.
- `GET /v1/jobs/{id}/musicxml` — extracts and returns the first MusicXML score for direct import into Composer Room.

The worker invokes Audiveris in headless batch mode and enables parallel processing of systems by default:

```sh
Audiveris -constant org.audiveris.omr.ui.action.AdvancedTopics$Constants.processSystemsInParallel=true -batch -export -save -output OUTPUT_DIR -- INPUT.pdf
```

Audiveris documents this option as applying to 13 of 20 processing steps, with approximately 25% overall transcription-time savings. It can make results not strictly reproducible because systems compete when assigning internal entities. Set `OMR_PARALLEL_SYSTEMS=false` to disable it. This is a throughput optimization, not a claim of 90% recognition accuracy; that target must be measured against a representative, human-verified score corpus.

This command and the PDF input format are documented by Audiveris:
https://audiveris.github.io/audiveris/_pages/guides/advanced/cli/

## Run locally

From this directory:

```sh
docker build -t melolegacy-omr .
docker run --rm -p 8080:8080 -v melolegacy-omr-data:/data \
  -e OMR_ENV=development melolegacy-omr
```

Then check `http://localhost:8080/health`.

For a protected deployment, set `OMR_ENV=production` and `OMR_API_TOKEN`. Set `OMR_ALLOWED_ORIGINS` to the exact MeloLegacy origin(s), separated by commas. The MeloLegacy Vercel API proxy also requires server-side `OMR_SERVICE_URL` and `OMR_API_TOKEN` environment variables. Never put the API token in a `VITE_*` browser variable.

## Current pilot limits

- OMR service upload cap: 40 MB (`OMR_MAX_UPLOAD_BYTES`). The current Vercel proxy UI intentionally limits uploads to 4 MB because Vercel Function request bodies have a much lower platform limit; larger PDFs require a direct, short-lived authenticated upload flow.
- Default job timeout: 900 seconds (`OMR_JOB_TIMEOUT_SECONDS`).
- Default concurrency: one Audiveris process (`OMR_MAX_CONCURRENT_JOBS`).
- Job records and results are stored under `OMR_DATA_DIR` (default `/data`).

This first service is a single-instance integration/pilot, not yet a multi-instance production queue. Its SQLite database and result files require a persistent volume. For a large public event, the next deployment stage must move job metadata to a shared database, PDF/MXL files to durable object storage, and processing dispatch to a durable queue with worker scaling and per-user authorization/rate limits. Do not scale this SQLite/local-disk version horizontally.

## License

Audiveris is distributed under AGPL-3.0. Review and satisfy the license obligations before distributing or operating a network-accessible derivative/combined service. Keep the Audiveris license and notices available to users. This service is an integration layer and does not change Audiveris's license.
