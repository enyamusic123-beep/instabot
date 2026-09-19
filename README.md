# Signal backend

The frontend can be served by the Node server, with API routes under `/api`.
This backend generates images through OpenAI, persists a JSON queue, and
publishes only through the Instagram Graph API (no browser automation).

## Run

Node 18+ is required. Set `OPENAI_API_KEY`, `PUBLIC_BASE_URL` (a public HTTPS
origin where generated PNGs can be fetched by Meta), and, for publishing,
`INSTAGRAM_ACCESS_TOKEN` plus `INSTAGRAM_USER_ID`, then run:

```sh
npm start
```

Useful options include `PORT`, `QUEUE_FILE`, `WAKING_TIMEZONE`,
`WAKING_START_HOUR` (default 8), `WAKING_END_HOUR` (default 22), and
`PUBLISH_RETRY_LIMIT` (default 3). Secrets are read only from the environment.

## API

- `GET /api/instagram/status` checks the connected Professional account.
- `GET /api/queue` returns queued, published, and failed items.
- `POST /api/queue` accepts `{ prompt, caption, scheduledFor }` and requires a
  unique `Idempotency-Key` header. It generates an image and queues it.
- `POST /api/instagram/publish/:id` publishes one item immediately through Graph.

The scheduler wakes once per minute, publishes at most one post per hour during
the configured waking hours, and retries transient Graph errors with a bounded
attempt count. Instagram permissions, account type, media eligibility, and
rate limits remain enforced by Meta.
