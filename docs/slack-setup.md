# Slack event submission setup

The latest handoff reports that the BYU IS workspace blocks custom Slack apps. Use the existing owner [paste page](https://doorway-api-production-db29.up.railway.app/paste) for selected event announcements from the jobs/internships channel and `a_team`. No Slack app, polling, or Slack posting is configured.

## Configure extraction

`RAILWAY_TOKEN` must already be exported in your shell. Set the owner's Anthropic key through silent input, never chat or a repository file. In zsh/bash:

```bash
read -rs ANTHROPIC_API_KEY
printf '%s' "$ANTHROPIC_API_KEY" | railway variables --service doorway-api --set-from-stdin ANTHROPIC_API_KEY
unset ANTHROPIC_API_KEY
```

The `read` command waits for the key followed by Enter, with echo disabled. A variable change redeploys the service. Both submit endpoints also require the existing `SUBMIT_TOKEN` (the shared owner secret), which is entered on `/paste` or sent as `x-submit-token`. Do not replace an existing token unnecessarily.

## Test before saving

Use fake/public content only, with `dry_run: true`. This still uses extraction credit but writes no event. With the submit token available in your local `SUBMIT_TOKEN` environment variable, this Node 20+ command sends the header without putting the secret in command arguments:

```bash
node --input-type=module <<'JS'
const response = await fetch('https://doorway-api-production-db29.up.railway.app/submit', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-submit-token': process.env.SUBMIT_TOKEN },
  body: JSON.stringify({
    text: 'Public listing: Homecoming Hackathon, October 2, 2026, 8 AM to 8 PM America/Denver, ESC Annex, BYU.',
    dry_run: true
  })
});
console.log(response.status, await response.json());
JS
```

Expect 200 with `extracted: true`, `dry_run: true`, `verified: false`. A missing/wrong submit token gives 401; missing server configuration gives 503. `ANTHROPIC_API_KEY` was still absent at takeover, so real extraction has not yet been verified.

For an image, send `image_base64`, `media_type` (JPEG, PNG, GIF or WebP) and `dry_run: true`. For several events, use `/submit/bulk` with `text`, `source: "slack"` and `dry_run: true`; expect `saved: 0` plus extracted previews. The ordinary `/paste` button saves events, so do not use that page for fake test events.

## What is retained

Only extracted event facts reach the database. Single submissions have no description; bulk submissions retain the model's short event summary and public event link. No raw messages/images, poster metadata, people rows, or private Slack permalinks are saved. The extraction prompt excludes personal names/contact information and treats pasted instructions as data. Text/images are processed in memory and sent to Anthropic; this does not promise any particular provider retention policy.

Use event announcements appropriate for Doorway's public feed. Ambiguous dates/times and jobs without an event are skipped. New events remain unconfirmed until a trusted public source lists them. See [`api.md`](./api.md) for endpoint shapes, limits and errors.
