# Deployment Guide

This guide covers a production-like single-VPS installation with EasyPanel,
the repository's Docker Compose configuration, and other supported hosting
shapes. It does not turn the simulated payment provider into a live gateway.

## Choose a deployment shape

| Option | Best for | Trade-off |
| --- | --- | --- |
| EasyPanel on one VPS | Recommended first production deployment: web app and PostgreSQL managed from one panel. | One server is a single failure domain; backups and monitoring are essential. |
| Docker Compose on one VPS | Teams comfortable with SSH, Docker, and a reverse proxy. | More operational work than EasyPanel. |
| Container platform + managed PostgreSQL | Smaller infrastructure footprint and simpler database backups. | Platform-specific release-job and scheduler configuration. |
| Next.js host + managed PostgreSQL | Teams already operating a compatible Node.js platform. | Requires explicit migration and scheduler design; validate runtime limits. |

For a single VPS, use at least 2 vCPU, 4 GB RAM, and 60 GB SSD/NVMe. Building
the Next.js image on the VPS benefits from 4 GB RAM or more. Use Ubuntu LTS,
SSH keys, automatic security updates, and a provider that offers volume or VPS
snapshots. Expose only SSH, HTTP, and HTTPS; never expose PostgreSQL (`5432`)
to the public internet.

## Deployment invariants

Every deployment option must meet these requirements:

1. PostgreSQL data lives on persistent storage and is backed up off the VPS.
2. `npm run db:migrate:deploy` completes before application code that requires
   the new schema receives traffic.
3. All required environment variables are stored in the hosting platform's
   secret store, never in Git or browser-visible configuration.
4. The public application is served over HTTPS with one canonical URL. Set both
   `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to that exact URL.
   `NEXT_PUBLIC_APP_URL` must also be passed as a Docker build argument because
   Next.js embeds public variables in the client bundle.
5. An external or platform scheduler calls both protected maintenance routes at
   least hourly.
6. `GET /api/health` returns `200` after each deployment.

The full variable reference and scheduler behaviour are in
[OPERATIONS.md](OPERATIONS.md).

## EasyPanel on one VPS

EasyPanel is a practical choice when the web app and database should share one
VPS while remaining separate containers and volumes. Follow the current
[EasyPanel installation guide](https://easypanel.io/docs/get-started/installation/)
for the panel itself; do not copy an unverified installer command from an old
blog post.

### Target topology

```text
Internet -> EasyPanel HTTPS proxy -> NexRun web container :3000
                                      |
                                      +-> private PostgreSQL container + persistent volume
External scheduler ------------------> protected NexRun routes
```

### 1. Prepare the VPS and domain

1. Create the VPS, use SSH key authentication, apply OS updates, and configure
   the provider firewall for ports `22`, `80`, and `443` only.
2. Point an `A` record such as `app.example.com` to the VPS public IP.
3. Install EasyPanel using its current official documentation, then create an
   administrator account and enable the panel's HTTPS/domain integration.
4. Create a dedicated EasyPanel project, for example `nexrun-production`.
5. Plan independent backups before importing real data: database logical backup
   plus VPS or volume snapshot, retained outside the same VPS.

### 2. Create PostgreSQL as a private service

Create a PostgreSQL service inside the same EasyPanel project.

- Use PostgreSQL 17 (matching `docker-compose.prod.yaml`) or a supported
  compatible version approved by the team.
- Generate unique database user, password, and database name in EasyPanel.
- Attach persistent storage to the PostgreSQL data directory.
- Keep the service private to the project network; do not attach a public
  domain or public port.
- Record the private connection string supplied by EasyPanel. Its hostname is
  the internal service hostname, not `localhost` and not the VPS public IP.

Example shape only (replace every placeholder in EasyPanel's secret store):

```text
postgresql://<DB_USER>:<DB_PASSWORD>@<PRIVATE_DB_HOST>:5432/<DB_NAME>?schema=public
```

### 3. Add the migration job

Database migration is a release step, not a web-request side effect. Create a
one-shot EasyPanel job/service from this repository with:

- Dockerfile: `Dockerfile`
- build target: `migrator`
- command: use the Dockerfile default (`npx prisma migrate deploy`)
- environment: `DATABASE_URL` only, using the private PostgreSQL URL

Run and confirm this job on the first deployment and before every app release
that contains a new migration. It must finish successfully before the web
service is deployed. If the installed EasyPanel version has no job or Dockerfile
target control, use its Compose service with
`docker-compose.prod.yaml` instead; that file already models `migrate` as a
one-shot dependency of `web`.

Do not run `prisma migrate dev`, `prisma db push`, or `npm run db:seed` against
the production database.

### 4. Add the NexRun web service

Create an application service from the repository Git branch (or a deployed
image) using the default `Dockerfile` target. Configure its internal port as
`3000`, attach `app.example.com`, and enable the EasyPanel-managed TLS
certificate.

Set these environment variables in EasyPanel's encrypted environment/secret
configuration:

| Variable | Production value |
| --- | --- |
| `DATABASE_URL` | Private PostgreSQL connection string from the previous step. |
| `BETTER_AUTH_SECRET` | A unique random secret of at least 32 characters. |
| `BETTER_AUTH_URL` | Canonical HTTPS URL, for example `https://app.example.com`. |
| `NEXT_PUBLIC_APP_URL` | The same canonical HTTPS URL. |
| `UPLOADTHING_TOKEN` | Production UploadThing token. |
| `CRON_SECRET` | Separate unique random secret of at least 32 characters. |
| `RESEND_API_KEY` | Production Resend API key. |
| `RESEND_FROM_EMAIL` | A verified production sender address. |
| `MOCK_PAYMENT_MODE` | `true` until a real payment integration is implemented and verified. |
| `TRUST_PROXY_HEADERS` | Leave `false` unless the EasyPanel proxy is explicitly configured to replace and protect forwarded-IP headers. |
| `DATABASE_POOL_MAX` | Pool limit appropriate for the database plan; default is `10`. |
| `DATABASE_POOL_IDLE_TIMEOUT_MS` | Optional idle timeout; default is `30000`. |
| `DATABASE_CONNECTION_TIMEOUT_MS` | Optional connection timeout; default is `10000`. |

Optional database pool variables are described in [OPERATIONS.md](OPERATIONS.md).
Never use the local `.env`, demo password, or an `http://` URL in this service.

### 5. Add scheduled maintenance

Create two scheduled HTTP jobs in EasyPanel if its installed version provides a
cron/HTTP-job feature. Otherwise use a trusted external scheduler. Each runs at
least hourly and sends the same bearer secret:

```text
POST https://app.example.com/api/internal/expire-reservations
POST https://app.example.com/api/internal/send-race-reminders
Authorization: Bearer <CRON_SECRET>
```

Store `CRON_SECRET` in the scheduler secret store. Do not put it in a URL,
source repository, dashboard note, or client-side script. A successful job
returns JSON with `ok: true`; alert on any non-2xx response.

### 6. Verify, monitor, and back up

After a deployment:

```text
GET https://app.example.com/api/health
```

Expect `200` and `{"status":"ok",...}`. Then sign in with a non-demo account,
check a public event page, upload path if enabled, and inspect the EasyPanel web
and migration logs. Monitor container restarts, disk capacity, database storage,
health responses, failed scheduler calls, and backup completion.

Back up the PostgreSQL database daily at minimum and test a restore into a
separate database regularly. A database volume on the same VPS is not a backup.

## EasyPanel Compose alternative

When EasyPanel's Compose deployment is available, the repository already has
[`docker-compose.prod.yaml`](../docker-compose.prod.yaml). It starts the
`db`, one-shot `migrate`, and `web` services in the correct order.

1. Create production secrets in EasyPanel and provide `POSTGRES_USER`,
   `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DATABASE_URL`, Better Auth values,
   `UPLOADTHING_TOKEN`, `CRON_SECRET`, Resend values, and explicit
   `MOCK_PAYMENT_MODE` and `TRUST_PROXY_HEADERS` choices.
2. Set `DATABASE_URL` to use the Compose hostname `db`, for example
   `postgresql://<DB_USER>:<DB_PASSWORD>@db:5432/<DB_NAME>?schema=public`.
3. Deploy the compose file, attach the public domain to the `web` service on
   port `3000`, and keep `db` private.
4. Confirm `migrate` completed successfully, then perform the health and
   scheduler checks above.

Use a named, persistent volume for PostgreSQL and configure backups outside
that volume. Do not delete the Compose project or its volume during routine
redeployments.

## Docker Compose directly on a VPS

This path uses the same production compose file without EasyPanel. Install
Docker Engine and the Compose plugin from their current official documentation,
then clone the repository onto the VPS.

1. Create a protected production `.env` beside `docker-compose.prod.yaml`.
   It must contain the same required secrets as the EasyPanel Compose option.
   For this topology, `DATABASE_URL` must use `@db:5432`, not `@localhost`.
2. Build and start the stack:

   ```bash
   docker compose -f docker-compose.prod.yaml up -d --build
   ```

3. Confirm the migration job completed and web is running:

   ```bash
   docker compose -f docker-compose.prod.yaml ps
   docker compose -f docker-compose.prod.yaml logs migrate
   curl --fail --silent --show-error http://127.0.0.1:3000/api/health
   ```

4. Put Caddy, Nginx, or another managed reverse proxy in front of port `3000`
   for TLS and the public domain. Do not publish `5432`.
5. Configure the two scheduler POST requests, database backups, log rotation,
   and operating-system updates.

For updates, pull the reviewed release, run the same `docker compose ... up -d
--build` command, confirm migration success, and then check health. Preserve the
`pgdata-prod` volume between deployments.

## Managed platform alternatives

### Container platform plus managed PostgreSQL

Platforms such as Railway, Render, Fly.io, DigitalOcean App Platform, or a
Kubernetes-based deployment can run the default Dockerfile. Use a managed
PostgreSQL service where possible.

- Keep the database private and supply its TLS-capable connection URL as
  `DATABASE_URL`.
- Configure a release job from the `migrator` Dockerfile target before the web
  rollout; do not rely on a web container to migrate itself at runtime.
- Set the same application secrets, canonical HTTPS URL, health probe, and
  external scheduler requirements as the EasyPanel path.
- Confirm the platform's request timeout, Node.js runtime, persistent upload
  strategy, and outbound network policy suit NexRun before adoption.

### Next.js-oriented hosting plus managed PostgreSQL

A Next.js-oriented host can be used only when it supports the current Next.js
runtime, server-side tRPC/Better Auth handlers, PostgreSQL connectivity, and a
separate scheduled-job mechanism. Use a managed PostgreSQL provider and apply
migrations from a controlled CI/CD release job. Do not run migrations from a
serverless request handler. Validate upload handling and connection-pool limits
under the host's actual concurrency model before selecting this option.

## First-production launch checklist

The Docker files received a static audit on 2026-07-25, but Docker was not
available on that machine. Before the first repository push or deployment, run
`docker compose config`, render `docker-compose.prod.yaml` with non-production
test secrets, build the image with the canonical `NEXT_PUBLIC_APP_URL`, execute
the migration container against a disposable database, start the web container,
and verify its health check and `/api/health`. A static review is not a substitute
for these runtime gates.

- [ ] HTTPS domain resolves to the web service and both canonical URL variables match it.
- [ ] PostgreSQL has persistent storage, no public network exposure, and a tested restore path.
- [ ] `migrate` completed successfully against the intended database.
- [ ] `GET /api/health` returns `200` after deployment.
- [ ] `CRON_SECRET` is unique, stored only as a secret, and both scheduled calls succeed.
- [ ] `MOCK_PAYMENT_MODE` remains clearly understood as simulated payment; no real payment is claimed.
- [ ] UploadThing production token and allowed upload behaviour have been verified.
- [ ] Monitoring, log retention, security updates, and backup alerts are enabled.
