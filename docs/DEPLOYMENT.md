# NexRun Production Deployment Guide

This guide provides a comprehensive, beginner-friendly walkthrough for deploying **NexRun** on a single VPS using **EasyPanel** (with a 2-container architecture: **Web App** + **PostgreSQL Database**), as well as Docker Compose and managed cloud alternative configurations.

---

## Architecture Overview (EasyPanel 2-Container Setup)

For a single VPS, EasyPanel isolates services into separate containers managed via a modern web control panel:

```text
                               +-------------------------------------------------------+
                               |                 Single VPS (EasyPanel)               |
                               |                                                       |
Internet (HTTPS) ------------->| Traefik Reverse Proxy (Auto SSL via Let's Encrypt)   |
                               |                          |                            |
                               |                          v (Port 3000)                |
                               |       +---------------------------------------+       |
                               |       | Container 1: NexRun Web App (Next.js) |       |
                               |       +---------------------------------------+       |
                               |                          |                            |
                               |                          v (Internal Private Port 5432)|
                               |       +---------------------------------------+       |
                               |       | Container 2: PostgreSQL 17 Database  |       |
                               |       | (Attached to Persistent Storage)      |       |
                               |       +---------------------------------------+       |
                               +-------------------------------------------------------+
```

---

## System Requirements & Prerequisites

### Minimum Recommended VPS Specifications
- **CPU**: 2 vCPU cores
- **RAM**: 4 GB (recommended for building Next.js production standalone bundles)
- **Storage**: 60 GB SSD / NVMe
- **Operating System**: Ubuntu 22.04 LTS or 24.04 LTS
- **Network Ports**: Open ports `22` (SSH), `80` (HTTP), `443` (HTTPS). Keep PostgreSQL port `5432` **private** (do not expose to public internet).

### Pre-Deployment Checklist
1. A registered domain or subdomain (e.g., `app.yourdomain.my`).
2. Domain **A Record** pointing `app.yourdomain.my` to your VPS Public IP address.
3. Access to your VPS via SSH.

---

## EasyPanel Step-by-Step Installation Guide (Beginner Friendly)

### Step 1: Install EasyPanel on Your VPS

Connect to your VPS via SSH as root and run the official EasyPanel installation command:

```bash
curl -sSL https://easypanel.io/install.sh | bash
```

Once installed, open your browser and navigate to `http://YOUR_VPS_IP:3000`. Set up your administrator email and password.

---

### Step 2: Create a New Project

1. Log in to the EasyPanel Dashboard.
2. Click **+ Project** in the top right.
3. Name your project: `nexrun` (or `nexrun-production`).
4. Click **Create Project**.

---

### Step 3: Container 1 — Setup PostgreSQL Database Service

1. Inside your `nexrun` project, click **+ Service**.
2. Select **PostgreSQL**.
3. Name the service: `db` (or `postgres`).
4. EasyPanel will automatically generate credentials and configure a persistent storage volume.
5. Note the generated credentials:
   - **Database Name**: e.g., `nexrun`
   - **User**: e.g., `postgres`
   - **Password**: e.g., `<generated-password>`
6. The internal database hostname within EasyPanel's network will be `db`.
7. Your internal **`DATABASE_URL`** connection string will be:
   ```text
   postgresql://<USER>:<PASSWORD>@db:5432/<DATABASE_NAME>?schema=public
   ```
   *(Keep this string ready for Container 2).*

---

### Step 4: Container 2 — Setup NexRun Web Application Service

1. Inside the same `nexrun` project, click **+ Service**.
2. Select **App** (Application).
3. Name the service: `web` (or `nexrun-web`).

#### A. Source Configuration (GitHub)
- **Source**: Select **GitHub**.
- **Repository**: `aznan83/NexRun` (or your repository URL).
- **Branch**: `main`.

#### B. Build Settings
- **Build Method**: Select **Dockerfile**.
- **Dockerfile Path**: `Dockerfile`.
- **Build Arguments**:
  - Add Key: `NEXT_PUBLIC_APP_URL`
  - Value: `https://app.yourdomain.my`

#### C. Domain & Port Settings
- **Port**: `3000`
- **Domains**: Add `app.yourdomain.my`
- **HTTPS / SSL**: Enable Automatic SSL (Let's Encrypt).

#### D. Environment Variables Configuration
In the **Environment Variables** section, copy and paste the following keys with your production values:

| Variable Name | Value / Description | Example Value |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string from Container 1. | `postgresql://postgres:secret123@db:5432/nexrun?schema=public` |
| `BETTER_AUTH_SECRET` | Secret key for auth signing (min 32 chars). | `a_random_32_character_secret_string_here` |
| `BETTER_AUTH_URL` | Canonical public HTTPS URL. | `https://app.yourdomain.my` |
| `NEXT_PUBLIC_APP_URL` | Canonical public HTTPS URL (matches `BETTER_AUTH_URL`). | `https://app.yourdomain.my` |
| `UPLOADTHING_TOKEN` | Production token from UploadThing dashboard. | `eyJhcGlLZXkiOi...` |
| `CRON_SECRET` | Secret key for internal cron routes (min 32 chars). | `another_random_32_character_secret_string` |
| `RESEND_API_KEY` | Transactional email API key from Resend.com. | `re_123456789_abcdef` |
| `RESEND_FROM_EMAIL` | Verified sender email address. | `NexRun <noreply@yourdomain.my>` |
| `MOCK_PAYMENT_MODE` | Set `true` for simulated checkout mode. | `true` |
| `TRUST_PROXY_HEADERS` | Set `true` because EasyPanel uses Traefik reverse proxy. | `true` |
| `DATABASE_POOL_MAX` | Maximum connection pool size (optional). | `10` |

*Tip: You can generate random 32-character secrets in terminal using:*
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### Step 5: Database Migration & Deployment

Database migrations must run to create the database schema before the web container serves live traffic.

#### Option A: One-Shot Migration Job in EasyPanel (Recommended)
1. In EasyPanel, create a new **Job** service inside the `nexrun` project.
2. Name it: `migrate`.
3. Set Source to GitHub `aznan83/NexRun` (branch `main`).
4. Set Build Method: **Dockerfile**.
5. Set Dockerfile Target: **`migrator`**.
6. Set Environment Variable: `DATABASE_URL` (same as Container 1).
7. Run the Job once before deploying the web application.

#### Option B: Terminal Command inside Container
Alternatively, open the terminal of the `web` container in EasyPanel and run:
```bash
npx prisma migrate deploy
```

*(Optional for fresh test environments: To seed demo accounts, run `npm run db:seed`)*.

---

### Step 6: Scheduled Maintenance (Cron Jobs)

NexRun includes two automated background endpoints for inventory release and race-day reminders:
- `POST https://app.yourdomain.my/api/internal/expire-reservations`
- `POST https://app.yourdomain.my/api/internal/send-race-reminders`

#### Setting Up EasyPanel Cron / External Scheduler:
Configure an hourly HTTP POST job using an external service like [cron-job.org](https://cron-job.org) or EasyPanel Cron:
- **Method**: `POST`
- **Header**: `Authorization: Bearer <YOUR_CRON_SECRET>`
- **Frequency**: Every 1 hour (or every 15 minutes for reservation cleanup).

---

### Step 7: Verification & Health Check

After deployment, verify that your application is running properly:

1. Open your browser and navigate to:
   ```text
   https://app.yourdomain.my/api/health
   ```
   **Expected Response**: `{"status":"ok", ...}` with HTTP Status `200`.

2. Test sign in at `https://app.yourdomain.my/login`.
3. Test event browsing at `https://app.yourdomain.my/events`.

---

## Alternative Deployment Method 1: EasyPanel Compose Service

If you prefer deploying using a single Docker Compose file in EasyPanel:

1. Click **+ Service** -> Select **Compose**.
2. Paste the contents of [`docker-compose.prod.yaml`](../docker-compose.prod.yaml).
3. Fill in the environment secrets in EasyPanel's Compose environment panel.
4. Set `DATABASE_URL` to use `db` as the hostname:
   ```text
   postgresql://<POSTGRES_USER>:<POSTGRES_PASSWORD>@db:5432/<POSTGRES_DB>?schema=public
   ```
5. Click **Deploy**. EasyPanel will start `db`, execute `migrate`, and spin up `web` in proper sequence.

---

## Alternative Deployment Method 2: Direct Docker Compose (Without EasyPanel)

For users running Docker Engine directly on Ubuntu without a web UI:

1. Clone your repository onto the VPS:
   ```bash
   git clone https://github.com/aznan83/NexRun.git /opt/nexrun
   cd /opt/nexrun
   ```

2. Create a production `.env` file beside `docker-compose.prod.yaml`:
   ```bash
   cp .env.example .env
   # Edit .env to set production secrets and database credentials
   ```

3. Build and launch containers in background:
   ```bash
   docker compose -f docker-compose.prod.yaml up -d --build
   ```

4. Check container status:
   ```bash
   docker compose -f docker-compose.prod.yaml ps
   curl http://127.0.0.1:3000/api/health
   ```

5. Set up Caddy or Nginx reverse proxy to forward HTTPS traffic from port `443` to `http://127.0.0.1:3000`.

---

## Production Launch Checklist

Before launching to live users:

- [ ] **HTTPS Domain**: Canonical domain resolves to `web` container and SSL certificate is valid.
- [ ] **Database Persistence**: PostgreSQL volume is bound to persistent storage on the VPS.
- [ ] **Database Backup**: Automated off-site backups configured (daily SQL dump or VPS snapshot).
- [ ] **Migrations Applied**: `npx prisma migrate deploy` executed cleanly.
- [ ] **Health Endpoint**: `GET /api/health` returns `200 OK`.
- [ ] **Cron Security**: `CRON_SECRET` configured and HTTP scheduler active.
- [ ] **UploadThing Token**: Production UploadThing token configured for file/banner uploads.
- [ ] **Email Delivery**: Resend API key and verified domain configured (`RESEND_FROM_EMAIL`).

---

## Troubleshooting & Maintenance

- **View Logs in EasyPanel**: Click the `web` or `db` service -> **Logs** tab.
- **Restart Application**: Click **Restart** in EasyPanel service dashboard.
- **Database Connection Issues**: Verify that `DATABASE_URL` uses `@db:5432` and that both services belong to the same EasyPanel project network.
