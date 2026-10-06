# AWS Migration Evaluation

Status: **Exploratory – no implementation planned yet.**
Purpose: Understand whether moving from Express + MySQL to an AWS-native, Terraform-managed stack is worth the refactor.

**Preferred direction: Option A on AWS (lowest-cost: Express + MySQL on one small instance, with S3 for images and backups). See [section 11](#11-option-a-on-aws-preferred-lowest-cost).** Option B (RDS) in sections 2, 6 and 10 is the upgrade path once real customer data or uptime needs justify the extra cost. Sections 3–5 and 7–9 are the original comparison, and the serverless design is in [Appendix A](#appendix-a-serverless-alternative-deferred) and non-AWS alternatives are in [Appendix B](#appendix-b-non-aws-alternatives).

**Key context: the app has not been deployed and the only existing users are test accounts.** This makes it a *greenfield* move: no user migration, no production data backfill, no zero-downtime cutover and no parallel running of old and new systems. Those costs are excluded below. Remaining effort is code refactoring, infrastructure, and learning.

> Cost figures are rough, order-of-magnitude estimates and AWS pricing changes. Verify with the AWS Pricing Calculator before deciding.

---

## 1. Current state (as found in the repo)

| Area | Today |
| --- | --- |
| API | Express 5 app ([server/src/app.ts](../server/src/app.ts)) with v2 routers: products, users, auth, basket, blog, audit. ~25 endpoints (see [endpoint-inventory.ts](../server/src/endpoint-inventory.ts)). |
| Auth | Custom: `bcryptjs` password hashes, `jsonwebtoken` JWT in an `auth_token` httpOnly cookie, `verifyAuthToken` / `requireRole('admin')` middleware, `verify-password` endpoint. |
| Database | MySQL via `mysql2` pool, hand-written SQL per handler. Schema in [phase1_schema_v2.sql](../server/scripts/migrations/phase1_schema_v2.sql): users, roles, profiles, products, categories, images, baskets, orders, invoices, payments, audit events, blog posts/comments/reactions. |
| PII protection | App-level field encryption (`ENCRYPTION_KEY`, `ENCRYPTION_KEY_PREVIOUS`) for names, addresses, phone. Key rotation/repair done by scripts. |
| Images | `multer` disk storage writing to `client/public/images`; DB stores `/images/<file>` paths. |
| Logging | `console.log` per route; audit trail in `audit_events_v2` table. |
| CI | GitHub Actions: lint + test for client and server. |
| Frontend | React (CRA) with Redux Toolkit thunks calling `/api/...` and `/api/v2/...`. |

Existing pain points AWS would directly address:

- Images on local disk (not horizontally scalable, tied to the client build folder, lost on redeploy).
- Hand-rolled auth and encryption key management (security burden sits entirely with you).
- Secrets in `.env` files.
- No structured logging/metrics/alerting.
- No defined hosting/infra story (nothing in the repo says where this runs).

---

## 2. Proposed target architecture (Option B, cost-minimised)

Host the existing Express app on a single small EC2 instance, backed by managed RDS MySQL, with S3 + CloudFront for the SPA and images. Everything is provisioned with Terraform. Cognito, WAF, Multi-AZ and Fargate are deliberate later upgrades, not day-one requirements.

```
                          Route 53 (DNS) · ACM (TLS certs)
                                   │
Browser ──► CloudFront ──┬── S3 (React build)                      www.<domain>
                         ├── S3 (product/blog images, OAC)         img.<domain> (admin uploads via presigned PUT)
                         └── API origin ──► EC2 t4g (public subnet) api.<domain>
                                             Caddy/nginx → Express container
                                             │  instance role (least privilege), IMDSv2, SSM Session Manager
                                             ├──► RDS MySQL db.t4g.micro (private subnet, SG allows EC2 only, TLS)
                                             ├──► S3 (images)
                                             ├──► SSM Parameter Store (DB creds, JWT secret, encryption key)
                                             └──► CloudWatch agent → Logs / Metrics / Alarms ──► SNS email

Account-level: CloudTrail · GuardDuty · AWS Budgets · (optional) Cognito · (later) WAF
CI/CD: GitHub Actions (OIDC role) → ECR image → SSM Run Command deploy; Terraform plan/apply
```

### 2.1 Component mapping

| Today | Option B |
| --- | --- |
| Express routers (`/api`, `/api/v2`) | Unchanged, running in a Docker container on EC2 behind Caddy/nginx |
| `mysql2` / `slonik` + MySQL | Unchanged code; MySQL becomes RDS MySQL (`db.t4g.micro`, single-AZ, encrypted, 7-day backups) |
| `multer` disk storage in `client/public/images` | S3 bucket + presigned PUT URLs; DB stores object keys; CloudFront serves images |
| React build served locally | S3 + CloudFront with security headers |
| `.env` secrets | SSM Parameter Store (SecureString) loaded at container start |
| App-level field encryption (`ENCRYPTION_KEY`) | Kept as is, key held in SSM (AWS-managed KMS). Revisit KMS envelope encryption later |
| Custom JWT/bcrypt auth | Kept initially; Cognito is an optional later phase |
| `console.log` | pino JSON to stdout → CloudWatch Logs (14–30 day retention), metric filters and alarms |
| `audit_events_v2` | Kept for business audit; CloudTrail added for infrastructure audit |
| Manual deploys | Terraform + GitHub Actions (OIDC, no stored AWS keys) |

### 2.2 Network and security design

- **VPC**: 2 AZs, public subnets (EC2) and private subnets (RDS subnet group). **No NAT gateway, no ALB, no RDS Proxy, no VPC endpoints.** EC2 reaches AWS APIs over its public IP.
- **Security groups**: EC2 accepts 80/443 only (preferably from the CloudFront managed prefix list); no inbound SSH. RDS accepts 3306 only from the EC2 security group and is not publicly accessible.
- **Access**: SSM Session Manager for shell access, IMDSv2 required, EBS encrypted.
- **IAM**: one instance role limited to its S3 prefix, specific SSM parameters, CloudWatch logs, and ECR pull. Separate OIDC role for CI with narrowly scoped permissions.
- **Data protection**: RDS and S3 encrypted at rest; TLS to RDS; S3 Block Public Access; images only readable via CloudFront OAC.
- **Detection**: CloudTrail, GuardDuty, CloudWatch alarms (status check with auto-recover, CPU, disk, 5xx, RDS storage/CPU, failed logins) to SNS email, AWS Budgets.
- **App hardening**: `helmet`, rate limiting (also at Caddy/nginx), `trust proxy` set correctly, strict CORS, `Secure`/`SameSite` cookies.

### 2.3 Terraform layout

```
infra/
  bootstrap/          remote state bucket, OIDC provider/role
  modules/
    network/          VPC, subnets, route tables, security groups
    database/         RDS, subnet group, parameter group, backups
    storage/          S3 buckets, CloudFront, OAC, lifecycle
    compute/          EC2, instance role, user-data, EIP, ECR
    secrets/          SSM parameters
    observability/    log groups, alarms, SNS, CloudTrail, GuardDuty, budgets
    dns-tls/          Route 53, ACM
  envs/
    dev/              short-lived, destroy when idle
    prod/
```

### 2.4 Growth path (only if needed)

Cognito (managed auth/MFA) → WAF → customer-managed KMS keys → Multi-AZ RDS → ECS Fargate + ALB (same container image and RDS) → optional Lambda for specific workloads such as payment webhooks.

---

## 3. Pros

### Security & compliance
- **Cognito removes custom auth risk**: password hashing, brute-force protection, MFA, email verification, password reset, token handling – managed and patched.
- **Better secrets and key management**: KMS + Secrets Manager replace `.env` keys and the manual `ENCRYPTION_KEY` / `ENCRYPTION_KEY_PREVIOUS` rotation scripts.
- **Defence in depth off the shelf**: WAF, GuardDuty, CloudTrail, Config, Security Hub – useful evidence for GDPR / Cyber Essentials / ISO 27001 conversations.
- **Per-function IAM** limits blast radius (e.g. only the image Lambda can write to the bucket).
- Encryption at rest/in transit is largely a configuration option.

### Operations & scalability
- **S3 fixes the image-storage design flaw**: durable, cheap, CDN-fronted, uploads bypass the API.
- **Scale to zero / pay-per-use** for Lambda and API Gateway – suits a small shop with spiky traffic.
- **No compute patching**; managed backups, Multi-AZ and point-in-time restore on RDS.
- **Built-in observability**: logs, metrics, alarms, tracing; easy alerting on 5xx, auth failures, DB CPU.
- **Reproducible environments**: Terraform makes dev/staging/prod identical and disaster recovery a re-apply.

### Engineering
- Terraform gives **reviewable, versioned infrastructure**.
- Handlers are already split per feature (`routes/v2/<domain>/<action>/handler.ts`), so they port to Lambda relatively cleanly.
- Strong skill value (AWS, IaC, serverless, security).
- Cognito + API Gateway authorizer centralises authentication so Lambdas only need authorisation (group checks).

---

## 4. Cons / risks

### Cost
- **Lambda + RDS is a classic hidden-cost trap**. Reaching a private RDS from Lambda needs a VPC, meaning a **NAT Gateway (~$30+/month)** or VPC endpoints, plus ideally **RDS Proxy (~$15+/month)** to avoid exhausting connections. This can exceed the DB cost itself.
- RDS has no permanent free tier; `db.t4g.micro` + storage + backups is roughly **$15–30/month** running 24/7.
- Aurora Serverless v2 can pause but has resume latency and a higher active floor.
- Secrets Manager, KMS keys, WAF, GuardDuty, Config, CloudWatch all add small recurring costs that stack.
- A small VPS/PaaS, or ECS Fargate/App Runner running the *existing* Express app, may be cheaper for low traffic.

### Complexity & effort
- **Large refactor**: auth, image handling, DB connectivity, config, logging, deployment, local dev and tests all change.
- Terraform learning curve, state management, and IAM debugging are time-consuming.
- Many moving parts for a business website; misconfiguration (IAM, public buckets, security groups) becomes the new risk.
- **Local development is harder**: LocalStack/SAM/serverless-offline or a shared dev AWS account; Cognito cannot be fully emulated locally.
- Lambda cold starts (especially in a VPC) affect p95 latency; mitigated by esbuild bundling and small functions.

### Technical
- **Cognito limits**: user attribute schema can't be removed/renamed after creation, hosted UI customisation is limited, and the pricing tier model has changed recently (check current tiers and free MAU allowance).
- **PII encryption model**: decide between KMS data keys vs. relying on RDS encryption. Best made now, before real data exists (test data can simply be recreated).
- **Cookie-based JWT flow changes**: API Gateway JWT authorizers expect `Authorization: Bearer` headers; keeping httpOnly cookies needs a custom Lambda authorizer or BFF, otherwise tokens live in SPA memory/storage (security trade-off).
- **Express features must be re-expressed**: `cookie-parser`, `cors`, `multer`, middleware chain, `/api` + `/api/v2` aliasing → API Gateway routes, CORS config, Lambda middleware (Middy/Powertools).
- Payload limits (6 MB Lambda sync, 10 MB API Gateway) make presigned S3 uploads mandatory.
- `slonik`/`mysql2` pooling assumes long-lived processes; needs a small reused pool or RDS Proxy.
- **Vendor lock-in**, especially Cognito and API Gateway.
- CRA frontend also needs a deployment pipeline (S3 + CloudFront invalidation).

### Risk
- With no live data, migration risk is low. The main risks are now getting design decisions right early (auth token flow, schema attribute choices in Cognito, networking) because they are costly to change after launch.
- Tests are mocked around Express/`supertest`; Lambda handlers need new harnesses.

---

## 5. Options (it is not all-or-nothing)

| Option | Description | Effort | Cost | Notes |
| --- | --- | --- | --- | --- |
| **A. Stay, harden (preferred for now)** | Keep Express+MySQL on one small AWS instance (Lightsail/EC2); images and backups on S3; secrets, logging, optional light Terraform | Low | ~$10–20/mo (see section 11) | Matches the cost of two separate hosts; upgrade to Option B (RDS) before real customer data. |
| **B. Host Express on AWS (preferred)** | Existing Express app on a small EC2 instance (or App Runner/Fargate) + RDS MySQL + S3, all in Terraform | Low–Med | ~$25–45/mo lean (see section 10) | Minimal code change; Cognito can be added later. |
| **C. Incremental build-out (recommended if proceeding)** | Stand up each AWS service in order (S3 → RDS → Cognito → Lambda routes) and switch the app over as each is ready | Medium–High | Variable | Every phase is a working, testable stopping point. No live traffic, so no strangler/parallel running is needed. |
| **D. Full greenfield serverless** | Build the whole target stack, then point the app at it | High | Variable | Now viable since nothing is deployed, but you get no working checkpoints and debug many new services at once. |

---

## 6. Proposed migration phases (Option B, greenfield)

Because nothing is deployed, phases manage the complexity of the refactor rather than protecting live users. Dev data is re-seeded (`seed:products:v2`, `user:generate-insert`) instead of migrated. Each phase has an exit criterion and leaves a working system, so you can stop at any point.

### Phase 0 – Foundations (no app change)
- Dedicated AWS account, MFA on root, billing alarms and an AWS Budget (e.g. $30 / $50).
- Terraform bootstrap: remote state (S3 with locking), GitHub Actions OIDC role, CloudTrail.
- Repo structure per section 2.3; add `terraform fmt/validate`, `tflint` and `checkov`/`tfsec` to [ci.yml](../.github/workflows/ci.yml).
- **Exit:** `terraform apply` builds an empty secure baseline; budget alert tested.

### Phase 1 – Containerise the app locally (no AWS yet)
- Add a server `Dockerfile` and `.dockerignore` (multi-stage, non-root user, Node LTS) plus a local `docker-compose` with MySQL for parity.
- Add `/health` endpoint, graceful shutdown, `helmet`, rate limiting, `trust proxy` configuration.
- Replace `console.log` with pino JSON logging (no PII in logs).
- Load configuration from env vars with validation so SSM can inject them later.
- **Exit:** `docker compose up` runs the full stack and the existing test suite passes in CI.

### Phase 2 – Network and database
- Terraform: VPC, public/private subnets, security groups, RDS MySQL (encrypted, automated backups, private, TLS), SSM parameters.
- Point a locally run server at RDS through a temporary SSM port-forward or from the EC2 later; apply [phase1_schema_v2.sql](../server/scripts/migrations/phase1_schema_v2.sql) and seed.
- Adopt a migration tool (Flyway or Atlas) to replace ad-hoc SQL scripts.
- **Exit:** schema and seed data on RDS; backup and restore drill into a throwaway instance succeeds.

### Phase 3 – Images to S3
- Terraform: private S3 bucket (Block Public Access, SSE, versioning, lifecycle), CloudFront with OAC for `img.<domain>`.
- Replace `multer.diskStorage` in [uploadImages/handler.ts](../server/src/routes/v2/products/images/uploadImages/handler.ts) and [upload-images-directory.ts](../server/src/ts-common/upload-images-directory.ts) with presigned PUT URLs plus a confirm endpoint; validate type and size; store object keys.
- Update seed scripts and the client image URL helper.
- **Exit:** no runtime writes to local disk; images served via CloudFront.

### Phase 4 – Compute and deploy pipeline
- Terraform: ECR, EC2 (`t4g.small`, or micro) with user-data to install Docker, Caddy and the CloudWatch agent; Elastic IP; instance role; Route 53 + ACM.
- GitHub Actions: build image → push to ECR → deploy via SSM Run Command → smoke-test `/health`; rollback by redeploying the previous image tag.
- Inject secrets from SSM at container start.
- **Exit:** API reachable at `api.<domain>` over HTTPS, deploys via CI only, no SSH open.

### Phase 5 – Frontend hosting
- Terraform: S3 + CloudFront for the React build with security headers (CSP, HSTS, X-Content-Type-Options) and SPA fallback routing.
- CI: build client, sync to S3, invalidate CloudFront; set `REACT_APP_API_URL`.
- Verify CORS and cookie behaviour end to end (`Secure`, `SameSite`, shared parent domain for the auth cookie).
- **Exit:** full user journeys (browse, basket, login, admin product upload) work on the AWS dev environment.

### Phase 6 – Observability and security baseline
- Log retention, metric filters (auth failures, 5xx), alarms to SNS email, EC2 auto-recover on status check failure.
- GuardDuty enabled; SSM Patch Manager or unattended-upgrades; IMDSv2 enforced.
- Short incident runbook, restore runbook, and a threat-model pass over auth, uploads and PII handling.
- **Exit:** a forced error and a failed-login burst each produce an alert.

### Phase 7 – Production cut-in
- Create `prod` from the same Terraform modules with real domain and sizing; create the admin user with the existing generator script.
- Pre-launch checklist: backup restore tested, budgets set, alarms verified, secrets rotated from dev values, dependency audit.
- **Exit:** production live; dev stack destroyed when idle to save cost.

### Phase 8 (optional, decision points) – Growth upgrades
Take each only when a trigger is met:
- **Cognito**: when MFA or managed password flows are wanted (no migration cost while users are few).
- **WAF**: on abuse or bot traffic.
- **Multi-AZ RDS, Fargate + ALB**: when uptime requirements outgrow a single instance.
- **Customer-managed KMS / envelope encryption**: if compliance requires it.
- **Reserved pricing / Savings Plan**: once usage is stable.

---

## 7. Rough monthly cost: serverless target (for comparison)

The Option B estimate is in [10.4](#104-estimated-monthly-cost-illustrative-verify-with-the-aws-pricing-calculator).

| Item | Estimate |
| --- | --- |
| RDS MySQL `db.t4g.micro` + 20 GB + backups | $15–30 |
| RDS Proxy (if Lambda in VPC) | ~$15+ |
| NAT Gateway (if Lambda in VPC, no endpoints) | ~$30+ (avoidable via VPC endpoints / Data API) |
| Lambda + API Gateway (HTTP API) | ~$0–5 |
| Cognito (small user base) | ~$0 within free allowance (verify current tiers) |
| S3 + CloudFront | ~$1–5 |
| CloudWatch logs/metrics/alarms | ~$2–10 |
| Secrets Manager / KMS | ~$2–5 |
| WAF | ~$6–15 |
| GuardDuty / CloudTrail extras | ~$2–10 |
| **Typical total** | **~$40–100/mo** (lower if NAT/Proxy avoided) |

Option B (existing Express on App Runner/Fargate + RDS + S3) is typically similar or cheaper at low traffic for a fraction of the effort.

---

## 8. Open questions before committing

1. **Traffic and growth**: hundreds of users or many more? Serverless benefits scale with size and spikiness.
2. **Payments**: is a provider such as Stripe planned? Webhooks → Lambda is a strong fit.
3. **Compliance drivers**: are GDPR, Cyber Essentials or ISO 27001 formally required?
4. **Time budget**: roughly weeks per phase; is learning value part of the goal?
5. **Auth UX**: is the Cognito hosted UI acceptable, or is a fully custom login needed?
6. **Database choice**: stay on MySQL (least change); DynamoDB would be a large rewrite and is unlikely to be worth it for this relational schema.
7. **Local dev/testing**: LocalStack/SAM vs. per-developer AWS sandbox.
8. **Budget ceiling** and who monitors cost/security alerts.

---

## 9. Recommendation (original comparison)

> Superseded by [11.10](#1110-recommendation) (Option A on AWS now preferred; Option B in [10.7](#107-updated-recommendation) is the upgrade path). Below is the earlier serverless-focused summary.

- The **highest-value, lowest-risk wins** are S3 for images, Secrets Manager/KMS for secrets and keys, RDS for the database, and CloudWatch for observability. All can be done with Terraform **without** rewriting the API.
- **Cognito** is worthwhile mainly to offload security-sensitive auth code. With no users to migrate, now is the cheapest time ever to adopt it.
- **Lambda + RDS** has the worst effort-to-benefit ratio for a small relational app (VPC/NAT/Proxy cost, cold starts). Treat it as optional and last; App Runner/ECS running the existing Express app is a credible end state.
- Being pre-launch lowers the cost and risk of every phase (no migrations, no downtime, no legacy support), which strengthens the case for doing it **before** go-live rather than after. Phases 0–4 deliver most of the security and operability benefit; re-evaluate before Phase 5 using real dev-environment cost and latency data.

---

## 10. Option B in detail: cost-minimised hosting of Express + MySQL

> Upgrade path from [Option A](#11-option-a-on-aws-preferred-lowest-cost): use this when real customer data or uptime needs justify RDS (~+$15–20/month).

Architecture and phases are in [section 2](#2-proposed-target-architecture-option-b-cost-minimised) and [section 6](#6-proposed-migration-phases-option-b-greenfield). This section holds the cost, code-change and risk detail.

Goal: get the security and operational benefits that matter (managed DB, S3 images, secrets, logging, IaC) at the lowest sensible monthly cost, for a small app with low growth expectations. Everything stays in Terraform.

### 10.1 Compute choice (cost-driven)

| Variant | Description | Approx. compute cost/mo | Notes |
| --- | --- | --- | --- |
| **B1 – Single EC2 (recommended for cost)** | One `t4g.small` (or `t4g.micro` if memory allows) running the Express container, Caddy/nginx for TLS, in a public subnet with a tight security group, managed via SSM Session Manager (no SSH). | ~$6–14 + public IPv4 (~$3.65) | Cheapest. No load balancer. You own OS patching (automate with unattended upgrades or a periodically rebuilt AMI/user-data) and a single point of failure (acceptable for a small shop; recover via Terraform re-apply). |
| **B2 – App Runner** | Managed container service, auto TLS and deploys. | ~$5–25 | Less ops, but VPC connector forces all outbound traffic through the VPC, so reaching AWS APIs/Cognito/S3 needs NAT or VPC endpoints (extra $7–35/mo). Eliminates most of its savings. |
| **B3 – ECS Fargate + ALB** | Standard production shape. | ~$35–55 (ALB alone ~$16–20) | Best resilience and deploy story; highest floor. Only worth it if uptime requirements grow. |

**Recommendation: start with B1.** It has the lowest floor, avoids the ALB and NAT costs entirely, and the Terraform modules are easy to evolve into B3 later if needed (container image and RDS stay identical).

### 10.2 Database choice

| Variant | Approx. cost/mo | Trade-off |
| --- | --- | --- |
| **RDS MySQL `db.t4g.micro`, single-AZ, 20 GB gp3, 7-day backups (recommended)** | ~$14–20 | Managed patching, automated backups, point-in-time restore, encryption at rest. SQL and `mysql2` pool unchanged. |
| MySQL in a container on the same EC2 | ~$0–2 (EBS only) | Cheapest, but you own backups, upgrades, corruption recovery and security of customer PII. Only acceptable with automated nightly dumps to S3 plus EBS snapshots (AWS Backup/DLM) and a tested restore. Revisit before taking real customer data/payments. |

Keep RDS in a private subnet group (not publicly accessible); only the EC2 security group may connect on 3306. Reserved instances (1-year) can later cut RDS cost by roughly 30%.

### 10.3 Cost-saving choices

| Decision | Saves | Note |
| --- | --- | --- |
| EC2 instead of ALB + Fargate | ~$16–20+/mo | No load balancer needed for a single instance. |
| SSM Parameter Store (SecureString) instead of Secrets Manager | ~$0.40/secret/mo | Free standard tier; use Secrets Manager only if you want automatic DB-password rotation. |
| AWS-managed KMS keys instead of customer-managed | ~$1/key/mo | Switch to CMKs only if compliance requires key control. |
| Skip WAF initially | ~$6–15/mo | Use nginx/Caddy rate limiting, CloudFront, tight SGs and Express hardening (helmet, rate limiting). Add WAF later if exposed to abuse. |
| Single-AZ RDS, 7-day backups | ~50% of DB cost | Accepts a few minutes to hours of downtime on AZ failure; restore from backup. |
| CloudWatch log retention 14–30 days, JSON logs, no debug in prod | Ongoing | Log ingestion (~$0.50/GB) is the usual surprise bill. |
| CloudTrail (one management-event trail), GuardDuty 30-day trial then evaluate | Small | Keep CloudTrail; GuardDuty is low cost at this volume. |
| S3 lifecycle rules + CloudFront | Pennies | Images are cheap to store and serve. |
| Cognito Lite/Essentials free tier (verify current MAU allowance) | ~$0 | Well within free limits for a small shop. |
| AWS Budgets with alarms (first budgets free) | Protects against surprises | Set at e.g. $30, $50. |
| Compute Savings Plan / 1-yr RDS reservation (later) | ~30% | Only after usage is stable. |
| New-account free tier (12 months, where eligible) | Varies | May cover a `t3.micro`/`t4g.micro`-class instance and RDS micro hours; check current terms. |

### 10.4 Estimated monthly cost (illustrative, verify with the AWS Pricing Calculator)

| Item | Lean (B1) |
| --- | --- |
| EC2 `t4g.small` (or `t4g.micro`) + 20 GB gp3 | ~$12–16 (~$6–9 for micro) |
| Public IPv4 address | ~$3.65 |
| RDS `db.t4g.micro` single-AZ + 20 GB + backups | ~$14–20 |
| S3 + CloudFront (site + images) | ~$1–4 |
| CloudWatch (logs, a few alarms) | ~$2–5 |
| SSM Parameter Store, ECR, Route 53 hosted zone | ~$1–2 |
| CloudTrail / GuardDuty / Budgets | ~$0–5 |
| Cognito (small user base) | ~$0 |
| **Total** | **~$35–55/mo, trending to ~$25–40 with micro sizing or free tier** |

Even lower (~$15–25/mo) if MySQL runs on the EC2 box, at the cost of the trade-offs in 10.2. Compared with Lambda + RDS (VPC, NAT/Proxy, WAF), this is usually cheaper and much simpler.

### 10.5 What changes in the codebase (small)

| Area | Change | Size |
| --- | --- | --- |
| Images | Replace `multer.diskStorage` in [uploadImages/handler.ts](../server/src/routes/v2/products/images/uploadImages/handler.ts) and [upload-images-directory.ts](../server/src/ts-common/upload-images-directory.ts) with S3 presigned URLs; store object keys; serve via CloudFront. | Medium |
| Config/secrets | Load DB credentials and JWT/encryption keys from SSM Parameter Store at startup (or inject as env vars from SSM in the container). | Small |
| Logging | Replace `console.log` with a JSON logger (pino) writing to stdout; CloudWatch agent/awslogs driver ships it. Never log PII. | Small |
| Health/ops | Add `/health` endpoint, graceful shutdown, `helmet`, rate limiting, trust-proxy setting behind Caddy/CloudFront. | Small |
| Container | Add `Dockerfile` and `.dockerignore` for the server; build in CI and push to ECR. | Small |
| Frontend | Build to S3 + CloudFront; set `REACT_APP_API_URL` to the API domain; confirm CORS and cookie settings (`SameSite`, `Secure`, shared parent domain for the auth cookie). | Small |
| DB | Point `mysql2` at the RDS endpoint (TLS enabled, credentials from SSM). Run [phase1_schema_v2.sql](../server/scripts/migrations/phase1_schema_v2.sql) and seeds. | Small |
| Auth (optional) | Cognito can be deferred: the existing JWT/bcrypt flow works unchanged on EC2. Adopt Cognito later if you want MFA and managed password flows. | Deferred |

Express routers, SQL, `slonik`/`mysql2` usage and most tests remain as they are.

### 10.6 Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Single EC2 is a single point of failure | Terraform + AMI/user-data rebuilds in minutes; RDS holds the state; CloudWatch alarm on status checks with auto-recovery. |
| OS and Docker patching is on you | Unattended security upgrades, rebuild/replace instance periodically, SSM Patch Manager. |
| Public instance exposure | SG allows only 80/443 (ideally from CloudFront prefix list); no SSH (SSM Session Manager); IMDSv2 only; least-privilege instance role. |
| Backups/restore never tested | Schedule a restore drill into a temporary RDS instance before launch. |
| Cost drift (logs, data transfer, forgotten resources) | Budgets, log retention, tags, monthly cost review. |
| Scope creep into serverless | Treat Cognito/WAF/Fargate as explicit later phases with a decision point. |

### 10.7 Updated recommendation

Adopt **Option B1**: containerise the existing Express app on a small EC2 instance behind CloudFront, use single-AZ RDS MySQL, S3 + CloudFront for images and the SPA, SSM Parameter Store for secrets, and CloudWatch/CloudTrail for visibility, all in Terraform. Expect roughly **$25–55/month**, a **small code change**, and an easy upgrade path (Cognito, WAF, Multi-AZ, Fargate) if the app grows. Defer the Lambda/serverless rewrite; it adds cost and complexity that a small, low-growth app does not need.

---

## 11. Option A on AWS (preferred, lowest cost)

Goal: run on AWS for roughly the price of two small separate hosts (for example a frontend host plus a backend/DB host, typically **~$10–20/month**), without a big refactor. Terraform is optional; it is used lightly where it saves effort.

### 11.1 Architecture

```
Browser ──► Route 53 / your DNS ──► one small instance (Lightsail or EC2 t4g)
                                     Caddy (auto HTTPS)
                                       ├── /          → React build (static files on the box)
                                       ├── /api       → Express container
                                       └── /images    → S3/CloudFront (or local disk at first)
                                     MySQL container (data on the instance disk)
                                          │
Nightly mysqldump (encrypted) + weekly snapshot ──► S3 backup bucket (30-day lifecycle)
Secrets: instance env file (root-only) or SSM Parameter Store
Logs: Docker json logs → CloudWatch agent (short retention) or on-box logrotate
Alerts: uptime check + CloudWatch/Lightsail alarms → email · AWS Budget alarm
```

Why this shape:
- **One origin for site and API** (Caddy serves the SPA and proxies `/api`): no CORS, no cross-site cookie problems, no CloudFront needed for the SPA, so `auth_token` cookie behaviour stays as it is today.
- **No load balancer, NAT, RDS or WAF**: those are the parts that make AWS cost more than simple hosts.
- **Images on S3** (cents per month) so they survive instance rebuilds; the instance itself is disposable.
- The app code stays almost unchanged and is identical to what B needs, so moving to RDS later is a connection-string change plus a data restore.

### 11.2 Compute: Lightsail vs EC2

| | Lightsail (recommended for cost) | EC2 `t4g.small`/`t4g.micro` |
| --- | --- | --- |
| Price | Fixed ~$7–12/mo (1 GB RAM plan suits Node + MySQL), static IP and data transfer allowance included | ~$6–14 + ~$3.65 public IPv4 + EBS + data transfer |
| Setup | Simple; firewall, snapshots, static IP built in | More flexible (IAM roles, VPC, SSM, CloudWatch agent) |
| Terraform | Supported (`aws_lightsail_*`) | Fully supported |
| IAM for S3/backups | Uses an IAM user's access key (restrict to one bucket); no instance role | Instance role, no stored keys |
| Growth path | Can later peer with VPC; migrating to EC2/Fargate is a rebuild | Natural path to B/Fargate |

Choose **Lightsail** if the priority is lowest cost and least effort; choose **EC2** if you want instance roles (no stored keys), SSM and the same stack you would grow into. Prices are approximate and change; verify before deciding. Memory is the constraint: run Node and MySQL with 1 GB RAM plus a small swap file and a tuned `innodb_buffer_pool_size`.

### 11.3 Estimated monthly cost (illustrative)

| Item | Estimate |
| --- | --- |
| Lightsail 1 GB instance (or EC2 `t4g.small`) | ~$7–12 (EC2 ~$12–16 incl. IPv4/EBS) |
| Instance snapshots (optional, 1–2 retained) | ~$1 |
| S3 (images + backups) + CloudFront free tier | ~$0.50–2 |
| Route 53 hosted zone (or use your registrar DNS) | $0–0.50 |
| CloudWatch / SSM / budgets / CloudTrail (management events) | ~$0–3 |
| **Total** | **~$10–20/mo** |

Domain registration is separate. For comparison, a typical two-site setup (static frontend host free or ~$5, plus a ~$5–15 backend/DB host) lands in the same range, so this is cost-neutral while giving you S3, IAM, CloudWatch and (optionally) Terraform experience.

### 11.4 Database on the box: safe-enough rules

MySQL on the same instance is acceptable now (no real customers, no payments) if you:
- Run MySQL bound to the Docker network only; never publish port 3306; use a strong generated root/app password; app user with least privilege.
- Keep data on a named Docker volume or the instance disk, not the container layer.
- **Back up nightly**: `mysqldump --single-transaction` → gzip → encrypt (age/gpg or S3 SSE) → upload to a private S3 bucket with versioning and a 30-day lifecycle; alert if no new backup in 26 hours.
- Take a weekly full-instance snapshot (Lightsail snapshot or EBS/AWS Backup).
- **Test a restore** into a throwaway container before launch and after any schema change.
- Keep applying MySQL and OS security updates (unattended-upgrades; pin and periodically bump the MySQL image tag).
- Accept the trade-off: potential loss of up to one day of data and a longer outage if the disk fails. Reduce this with more frequent dumps (every 4–6 hours) or binary log shipping if it matters.

**Trigger to move to RDS (Option B):** first real customers, payments or PII at scale, or any need for point-in-time recovery or uptime guarantees. Cost impact is about +$15–20/month.

### 11.5 Security baseline (kept proportionate)

- Firewall allows only 80/443 publicly; SSH restricted to your IP or disabled in favour of SSM (EC2) / browser SSH (Lightsail).
- MFA on the AWS root and admin users; no root access keys; a budget alarm.
- S3 buckets private with Block Public Access; backup IAM credentials limited to one bucket/prefix (write-only for the backup job if possible).
- Keep field-level encryption of PII in the app (`ENCRYPTION_KEY`); store keys **outside** the repo and **also** in an offline backup (losing the key makes the backups' PII unreadable).
- `helmet`, rate limiting (Caddy + Express), strict CORS (same-origin makes this simple), `Secure`/`HttpOnly`/`SameSite` cookies.
- Run containers as non-root, read-only filesystem where possible, pin image versions, scan images in CI (e.g. Trivy), `npm audit` in CI.
- Unattended OS updates and a monthly patch/rebuild routine.

### 11.6 Is Terraform worth it here?

Optional. Suggested middle ground:
- **Use Terraform for the small, stable foundation** (about 100–150 lines, local state at first, move to S3 state later): Lightsail/EC2 instance, static IP, firewall, S3 buckets (images, backups, lifecycle), the backup IAM user/policy, budget alarm, DNS records.
- **Skip it for** anything fiddly or short-lived (container deploys, app config); use a simple deploy script or GitHub Actions + SSH/SSM.
- Benefit: you can destroy and recreate the instance in minutes, and your setup is documented as code. Cost: a learning curve and state to look after. If it starts to feel heavy, console clicks plus a documented `bootstrap.sh` are fine for a one-instance system.

### 11.7 What changes in the codebase

Same list as [10.5](#105-what-changes-in-the-codebase-small), trimmed:
- Add `Dockerfile` (server) and a `docker-compose.yml` (Caddy, Express, MySQL) used both locally and on the instance.
- Images: replace `multer.diskStorage` ([uploadImages/handler.ts](../server/src/routes/v2/products/images/uploadImages/handler.ts), [upload-images-directory.ts](../server/src/ts-common/upload-images-directory.ts)) with S3 uploads (server-side upload via `@aws-sdk/client-s3` is simplest at this size; presigned URLs can come later). Store object keys.
- `/health` endpoint, graceful shutdown, `helmet`, rate limiting, `trust proxy`, pino JSON logging.
- Serve the built React app from Caddy; API base URL becomes relative (`/api`).
- Backup script + cron/systemd timer, restore script, and a short runbook.
- Cognito, WAF, RDS and CloudFront for the SPA are not needed.

### 11.8 Migration phases (Option A)

Because nothing is deployed, this is a build-out, not a live migration: no user or data migration (test data is re-seeded), no cutover window, no parallel running. Each phase ends with a working, verifiable state and can be a stopping point. Rough effort is per phase for one developer working part-time.

#### Phase 1 – Decisions and AWS account setup (~0.5 day)
- Decide: Lightsail vs EC2 (11.2), domain/DNS provider, single region close to users (e.g. `eu-west-2`), and whether to use Terraform for the foundation (11.6).
- Create the AWS account: MFA on root, no root access keys, an admin IAM/Identity Center user with MFA, billing alerts and an AWS Budget (e.g. $15 / $25).
- Register or point a domain; plan `www.<domain>` (site + `/api` on one origin) and optionally `img.<domain>`.
- **Exit:** secure account, budget alarm tested, decisions recorded in this document.

#### Phase 2 – Make the app container-ready (~1–2 days, no AWS needed)
- Add a server `Dockerfile` (multi-stage, non-root, pinned Node LTS) and `.dockerignore`.
- Add `docker-compose.yml`: Caddy, Express, MySQL (internal network only, named volume, 3306 not published) and a `Caddyfile` that serves the React build, proxies `/api`, and serves `/images` initially from a volume.
- Server hardening and ops in [app.ts](../server/src/app.ts): `/health` endpoint, graceful shutdown, `helmet`, rate limiting, `trust proxy`, strict CORS (same origin makes this simple), `Secure`/`HttpOnly`/`SameSite` cookie settings in production.
- Config: validate required env vars at startup (`DB_*`, `JWT_SECRET`, `ENCRYPTION_KEY`, `PORT`, S3 settings); add `.env.production.example`.
- Logging: pino JSON to stdout (no PII).
- Client: make `REACT_APP_API_URL` empty in production so calls are relative (`/api`), and confirm [apiPath.ts](../client/src/api/apiPath.ts) behaves; build the client into the Caddy image or a shared volume.
- Schema and seeding: run [phase1_schema_v2.sql](../server/scripts/migrations/phase1_schema_v2.sql) automatically on first MySQL start (init scripts) and keep the seed scripts working against the container.
- **Exit:** `docker compose up` runs the whole app locally over HTTPS-on-localhost; existing client and server tests pass in CI.

#### Phase 3 – Images to S3 (~1–2 days)
- Create a private S3 bucket (Block Public Access, SSE, versioning, lifecycle) and a scoped IAM policy (put/get/delete on the images prefix only).
- Replace `multer.diskStorage` in [uploadImages/handler.ts](../server/src/routes/v2/products/images/uploadImages/handler.ts) with memory storage plus `@aws-sdk/client-s3` upload; validate type and size; store object keys; remove [upload-images-directory.ts](../server/src/ts-common/upload-images-directory.ts) usage and update its tests.
- Serve images through Caddy proxying to S3, or CloudFront (free tier) with Origin Access Control; update how the client builds image URLs.
- Update seed scripts to upload sample images, and the tests that mock multer/disk.
- **Exit:** no runtime writes to local disk; admin upload works end to end; images survive a container rebuild.

#### Phase 4 – Provision the instance (~1 day)
- Create the instance (Lightsail 1 GB, or EC2 `t4g.small`) with a static/Elastic IP and a firewall allowing 80/443 only plus restricted admin access.
- Optionally capture this in Terraform: instance, static IP, firewall, S3 buckets, backup IAM user/policy, budget, DNS records (local state first).
- Bootstrap script (`bootstrap.sh`, or user-data) to: install Docker and the compose plugin, create a 1–2 GB swap file, enable unattended security upgrades, create an app user, and lay out `/opt/crafty` with a root-only `.env`.
- Point DNS at the static IP; Caddy obtains HTTPS certificates automatically.
- **Exit:** the instance can be destroyed and rebuilt from the script/Terraform in under 30 minutes.

#### Phase 5 – First deploy and data seeding (~0.5–1 day)
- Copy compose files and `.env` to the instance (manually the first time); generate production secrets (`npm run key:generate` for the encryption key, a long random `JWT_SECRET`, DB passwords) and store an offline copy of the encryption key and secrets.
- `docker compose up -d`; schema auto-created; seed products; create the admin user with `npm run user:generate-insert` (see [README.md](../README.md)).
- Smoke test the user journeys: browse, basket, register/login, admin product create and image upload, audit views.
- **Exit:** the site is live on the real domain over HTTPS (private/soft launch, not announced).

#### Phase 6 – Backups and restore (~1 day)
- Nightly (and optionally every 4–6 hours) `mysqldump --single-transaction` → gzip → encrypt → private S3 backup bucket with versioning and a 30-day lifecycle, driven by a systemd timer or cron using a bucket-scoped credential.
- Weekly full-instance snapshot (Lightsail snapshot schedule, or EBS snapshots via DLM/AWS Backup).
- Missing-backup alert (e.g. the backup script pings a healthcheck URL, or a CloudWatch alarm on the last upload).
- Write `restore.sh` and perform a restore drill into a throwaway container, then document the steps.
- **Exit:** a restore from S3 succeeds and is timed; the missing-backup alert is verified by skipping a run.

#### Phase 7 – CI/CD deploy pipeline (~1 day)
- GitHub Actions in [ci.yml](../.github/workflows/ci.yml) (or a new workflow): lint and test (existing jobs), build and push images (GitHub Container Registry or ECR), then deploy to the instance (SSH with a restricted deploy key, or SSM for EC2) running `docker compose pull && docker compose up -d`.
- Add a `/health` smoke test after deploy and rollback by redeploying the previous image tag.
- Add `npm audit` and an image scan (e.g. Trivy) to CI; deploy only from `main`.
- **Exit:** a merge to `main` deploys automatically; a bad deploy can be rolled back in minutes; no manual SSH needed for releases.

#### Phase 7b (optional, not planned) – Cognito for authentication (~2–4 days)
Captured so it is not forgotten at future reviews. Not required for Option A; the existing bcrypt + JWT flow works unchanged. Consider before launch (no users to migrate) or after go-live if MFA or managed password flows become important.
- **Cost:** ~$0/month within the free allowance for a small user base (verify current tiers). Total Option A cost is unchanged.
- **Setup (Terraform or console):** User Pool with password policy, email verification, optional MFA (required for admins), groups `admin` and `customer`, and an app client. Use a separate dev pool for local work, since Cognito cannot be fully emulated.
- **Token handling (recommended):** keep the single-origin httpOnly cookie design. Express performs sign-in server-side (`InitiateAuth`) and sets the Cognito tokens in `Secure`/`HttpOnly`/`SameSite` cookies; this means using your own login form rather than the hosted UI.
- **Server changes:**
  - Replace login/register/`verify-password` handlers in [auth.ts](../server/src/routes/v2/auth.ts) with Cognito flows (sign-up, confirm, forgot/reset password).
  - Replace `verifyAuthToken` / `requireRole` in [middleware.ts](../server/src/ts-common/middleware.ts) with Cognito token verification (e.g. `aws-jwt-verify`) and `cognito:groups` checks.
  - Key `users_v2` by the Cognito `sub`; keep profile data and encrypted PII in MySQL; remove `bcryptjs` and password-hash columns.
  - User admin (create/update/delete) calls the Cognito admin APIs plus the existing profile updates; keep audit events.
- **Client changes:** `authThunks`, `protectedRoutes`, `userAuth`, login/register UI and the admin user-management screens; rework the related tests.
- **IAM:** instance role (EC2) or a scoped IAM user (Lightsail) allowing only the required Cognito actions on that pool.
- **Trade-offs:** removes password hashing/reset/verification code and adds MFA, but adds lock-in, a managed dependency and the largest code change in Option A.
- **Exit:** all logins via Cognito; admin routes enforce the `admin` group; custom password code deleted.

#### Phase 8 – Monitoring and security hardening (~1 day)
- External uptime check (free tier of an uptime service, or Route 53 health check) on `/health` with email alerts.
- CPU, memory, disk and instance status alarms (CloudWatch agent on EC2, or Lightsail metric alarms); Docker log rotation and short retention.
- Confirm firewall rules, SSH restricted or disabled, fail2ban (optional), non-root containers, patch routine (monthly rebuild or `apt` updates and image bumps).
- CloudTrail management-events trail enabled; review IAM scope for the backup and S3 credentials; document key rotation (including `ENCRYPTION_KEY_PREVIOUS` flow).
- Short runbook: deploy, rollback, restore, rotate secrets, rebuild instance.
- **Exit:** a forced outage and a missed backup both alert you; runbook reviewed.

#### Phase 9 – Go-live checklist and decision point (~0.5 day)
- Pre-launch: fresh restore drill, secrets rotated from any dev values, test accounts removed, privacy/cookie notices in place, budgets and alarms verified, DNS TTLs lowered if switching any existing domain.
- **Decision point:** if real customers, payments or uptime commitments are imminent, add RDS (Option B): create the RDS instance, restore the latest dump into it, change the DB connection settings, remove the MySQL container, and keep the same instance, images and pipeline (about +$15–20/month).
- **Exit:** announced launch, or a documented decision to stay on A with the reasoning.

**Rough total:** about 7–9 working days, spread however suits you. Phases 2–3 are the real refactor, and the rest is operations work.

**Suggested order of risk:** Phases 2 and 3 change code and are covered by tests, Phases 4–5 are reversible infrastructure, and Phase 6 must be done before any data you care about lives on the box.

### 11.9 Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Data loss from on-box MySQL | Frequent dumps to S3, weekly snapshot, tested restore, move to RDS before real customers |
| Single instance outage | Static IP + scripted rebuild (Terraform/bootstrap), uptime alert; accept short downtime at this scale |
| Memory pressure (Node + MySQL on 1 GB) | Swap file, tune MySQL buffer pool, container memory limits; step up to the next plan if needed |
| Public exposure of the DB/host | Never publish 3306; firewall 80/443 only; patching; fail2ban or provider firewall rules |
| Lost encryption key | Offline copy of `ENCRYPTION_KEY`; document rotation using the existing scripts |
| Stored cloud credentials on the box (Lightsail) | Scope the IAM user to one bucket, rotate keys, or use EC2 with an instance role |
| Cost drift | Budget alarm, short log retention, S3 lifecycle rules |

### 11.10 Recommendation

Start with **Option A on AWS**: one Lightsail (or small EC2) instance running Caddy, Express and MySQL via Docker Compose, with S3 for images and backups, and light Terraform for the foundation. Expect **~$10–20/month**, in line with two separate hosts, and small code changes. Add RDS (Option B) at the go-live decision point if real customer data or uptime needs call for it; nothing in this design needs to be thrown away to do so.

---

## Appendix A: Serverless alternative (deferred)

Kept for reference if the app grows or the goals change. Not the preferred path.

### A.1 Serverless target architecture

```
Browser (React SPA)
   │
   ├── S3 + CloudFront ........... static site hosting (+ WAF, TLS via ACM)
   │
   ├── API Gateway (HTTP API) ── AWS WAF
   │        │  JWT authorizer (Cognito)
   │        ▼
   │     Lambda (Node.js/TS, per route group)
   │        │            │               │
   │        ▼            ▼               ▼
   │   RDS / Aurora   S3 (images)   Secrets Manager / KMS
   │   (MySQL)        presigned URLs
   │
   ├── Cognito User Pool ......... sign-up/sign-in, groups (admin/customer), MFA
   │
   └── CloudWatch Logs/Metrics/Alarms, X-Ray, CloudTrail, GuardDuty

All provisioned with Terraform (remote state in S3 with locking).
```

| Today | AWS replacement |
| --- | --- |
| Express routers | API Gateway (HTTP API) + Lambda handlers (existing handler logic can largely be reused) |
| Custom JWT/bcrypt/cookies | Cognito User Pool + groups (`admin`, `customer`) + API Gateway JWT authorizer |
| `multer` disk storage | S3 bucket + presigned PUT URLs (browser uploads direct), CloudFront for delivery |
| MySQL | RDS for MySQL (`db.t4g.micro`) or Aurora Serverless v2 – **keeps SQL as-is** |
| `.env` secrets | Secrets Manager / SSM Parameter Store |
| App-level field encryption key | KMS envelope encryption, or RDS encryption at rest plus selective field encryption |
| `console.log` | Structured JSON logs → CloudWatch Logs, metric filters, alarms, dashboards |
| `audit_events_v2` | Keep for business audit; add CloudTrail for infrastructure/API audit |
| Manual deploy | Terraform + GitHub Actions (OIDC role, no long-lived keys) |

Security tooling: WAF (rate limiting/managed rules), CloudTrail, GuardDuty, AWS Config and Security Hub (optional), KMS CMKs, least-privilege IAM per Lambda, security groups, S3 Block Public Access, Budgets/billing alarms.

### A.2 Serverless migration phases (greenfield)

Because nothing is deployed, phases are about managing complexity and risk of the refactor, not protecting live users. Dev data is re-seeded (existing scripts such as `seed:products:v2` and `user:generate-insert`, or Cognito users created directly) rather than migrated.

#### Phase S0 – Foundations (no behaviour change)
- Dedicated AWS account(s) (separate `dev` and `prod`), MFA on root, IAM Identity Center.
- Terraform bootstrap: remote state (S3 + locking), GitHub Actions OIDC role, budgets + billing alarms, CloudTrail, GuardDuty.
- Repo layout: `infra/modules/` (network, s3, cognito, rds, api, observability) and `infra/envs/dev|prod`.
- Add `terraform fmt/validate/plan` plus `tflint` and `checkov`/`tfsec` to CI.
- **Exit:** `terraform apply` creates a secure baseline; cost alarm active.

#### Phase S1 – Images to S3 (low risk, high value)
- Terraform: private S3 bucket (Block Public Access, SSE-KMS, versioning, lifecycle), CloudFront with OAC.
- Change the upload endpoint to issue **presigned PUT URLs** (still on Express); DB stores object keys, not `/images/...` paths.
- Upload any seed/sample images to S3 and update the seed scripts (no production backfill needed).
- Validate content type/size; optionally malware-scan.
- **Exit:** no runtime writes to local disk; images served via CloudFront.

#### Phase S2 – Database to RDS
- Terraform: RDS MySQL (`db.t4g.micro`, encrypted, automated backups, private subnets, not public) or Aurora Serverless v2.
- Credentials in Secrets Manager; Express reads them at startup.
- Create the schema from [phase1_schema_v2.sql](../server/scripts/migrations/phase1_schema_v2.sql) and re-seed; no data migration or cutover window.
- Adopt a proper migration tool (Flyway/Atlas) instead of ad-hoc SQL scripts.
- **Exit:** Express running unchanged against RDS.

#### Phase S3 – Observability & security baseline
- Structured logger (Powertools/pino) with correlation IDs; never log PII.
- CloudWatch dashboards, metric filters (auth failures, 5xx), alarms → SNS/email.
- WAF (managed rules + rate limiting) in front of the API/CDN.
- **Exit:** actionable alerts and an incident runbook.

#### Phase S4 – Authentication to Cognito
- Terraform: User Pool (MFA for admins, password policy, groups `admin`/`customer`), app client(s).
- No user migration: re-create your test users in Cognito (admin via group assignment).
- Replace `verifyAuthToken` / `requireRole` with Cognito token verification (`aws-jwt-verify`) in Express first; map `user_roles_v2` to Cognito groups; key `users_v2` by Cognito `sub`.
- Decide token storage (Bearer in memory + refresh via BFF vs. custom authorizer retaining httpOnly cookie).
- Update client `authThunks`, `protectedRoutes`, `userAuth`.
- Remove `bcryptjs`, password hashing and `verify-password` custom logic (replaced by Cognito flows) outright; no legacy window needed.
- **Exit:** all logins via Cognito; custom auth code deleted.

#### Phase S5 – API to API Gateway + Lambda (route by route)
- Terraform: HTTP API, JWT authorizer, Lambda module (esbuild bundle, per-function IAM role, log group retention, X-Ray).
- Port handlers via a thin adapter so business logic stays shared; start with read-only routes (`products/get`, `blog`), then writes (`basket`, `users`, `audit`).
- Networking decision: Lambda in VPC + RDS Proxy (+ VPC endpoints/NAT), or Aurora with the **RDS Data API** to avoid VPC/NAT cost.
- No parallel running required; switch the client's API base URL per environment. Drop the legacy `/api` alias and keep only `/api/v2` (or a single version) since there are no external consumers.
- Tests: keep handler-logic unit tests; replace `supertest` flows with handler-level tests plus a few deployed smoke tests.
- **Exit:** Express decommissioned (see [stage10-decommission-runbook.md](../server/docs/stage10-decommission-runbook.md) for the existing pattern).

#### Phase S6 – PII encryption & hardening
- Move field encryption to KMS envelope encryption (or RDS-at-rest plus column encryption for highest-risk fields).
- No re-encryption of existing data needed; delete `ENCRYPTION_KEY*` handling and the repair scripts.
- Optional Config/Security Hub; threat-model/pen-test; document retention and GDPR deletion/export across Cognito, DB, S3 and logs.

#### Phase S7 – Frontend hosting & CI/CD
- S3 + CloudFront for the React build with security headers (CSP, HSTS).
- GitHub Actions: build → test → `terraform plan` on PR → `apply` on merge via OIDC; per-environment promotion.

---

## Appendix B: Non-AWS alternatives

Captured for future reviews. The goal is the same as Option A: low cost, one small host, durable image storage, tested backups, and optionally managed auth. Costs are rough and provider pricing changes, so verify before deciding.

### B.1 Options compared

| Approach | Rough cost/mo | What it is | Fit with this app |
| --- | --- | --- | --- |
| **Single VPS** (Hetzner, DigitalOcean, Vultr, OVH) | ~$5–12 | Same Docker Compose design as Option A (Caddy + Express + MySQL) on one VM | **Best fit and cheapest.** No code changes beyond Option A's container work. Hetzner is notably cheap and has EU regions. Images can stay on a volume or go to the provider's object storage (often a ~$5 minimum). You manage the firewall, patching and backups. |
| **Managed PaaS** (Render, Railway, Fly.io) | ~$15–35 | Push a container, get HTTPS, deploys and optionally a managed database | Least ops. Managed DB adds cost, MySQL support varies (Postgres is more common), and free tiers may sleep or change. |
| **Split hosting** (Netlify/Vercel/Cloudflare Pages for the site; API + DB on a VPS or PaaS) | ~$5–25 | Static frontend on a CDN, backend elsewhere | Good CDN and preview deploys, but reintroduces CORS and cross-site cookie issues that the single-origin design avoids. |
| **Cloudflare stack** (Pages + R2 + Workers) | ~$5–10 | Edge hosting, S3-compatible storage with no egress fees | Express and MySQL do not map well (Workers runtime; D1 is SQLite). Would be a rewrite. Not recommended for this codebase. |
| **Supabase / Firebase** | ~$0–25 | Managed database, auth and storage | Supabase is Postgres, so the MySQL SQL would need porting. Gives auth and storage cheaply but is a larger rewrite than Option A. |
| **Azure / GCP** (Container Apps, Cloud Run) | ~$10–25 | Equivalent managed container services | No real advantage over AWS at this size unless existing credits or skills apply. |

### B.2 Managed-auth alternatives to Cognito

| Option | Notes |
| --- | --- |
| **Keep the current bcrypt + JWT flow** | Default for a small app; no new dependency, works on any host. |
| **Auth0 / Clerk / Supabase Auth** | Polished hosted login and free tiers, but per-user pricing and lock-in. |
| **Keycloak / Authentik (self-hosted)** | Free, but heavy for a 1 GB instance; not recommended at this size. |

### B.3 How they compare to Option A on AWS

| Consideration | Single VPS | Option A on AWS | Managed PaaS |
| --- | --- | --- | --- |
| Monthly cost | Lowest (~$5–12) | ~$10–20 | ~$15–35 |
| Code change | Same as Option A | Same | Same, plus possible DB change |
| Ops effort | Medium (you run everything) | Medium | Low |
| Image storage | Volume or provider object storage | S3 | Usually external object storage |
| Backups | Scripted dumps to object storage | Scripted dumps to S3 + snapshots | Often built in (managed DB) |
| IAM, CloudWatch, Terraform ecosystem | Limited (provider-specific) | Full | Limited |
| Path to managed DB / managed auth | Provider's DB, or move to AWS | RDS, Cognito | Built in |
| Learning value (AWS skills) | Low | High | Low |

### B.3.1 Portability

Option A is plain Docker Compose, so the same stack runs on a VPS, Lightsail or EC2 with little change. Only three things are provider-specific:
- **Image storage client:** the S3 SDK works against any S3-compatible store (Hetzner, DigitalOcean Spaces, Cloudflare R2, Backblaze B2) by changing the endpoint and credentials.
- **Backup destination:** the same dump script can target any S3-compatible bucket.
- **Provisioning:** Terraform has providers for Hetzner, DigitalOcean and others, but the modules would be different.

Keeping the S3 endpoint, bucket and credentials as configuration, rather than hard-coding AWS, keeps this move cheap.

### B.4 When to choose a non-AWS option

- **Choose a single VPS** if minimum cost and simplicity matter most and AWS-specific learning is not a goal.
- **Choose a managed PaaS** if you want the least operational work and accept ~2x the cost.
- **Stay with Option A on AWS** if you want the AWS skills, easy upgrade paths (RDS, Cognito, WAF, Fargate), and a similar cost to the VPS route once monitoring and storage are included.
- **Avoid** Cloudflare Workers and Supabase unless you are willing to rewrite the API or port the schema.

### B.5 Recommendation

Build Option A in a provider-neutral way (Docker Compose, configurable S3 endpoint, scripted backups) so the host can be chosen or changed late. If, at Phase 1 or later, cost or simplicity outweighs the AWS learning goal, run the identical stack on a single VPS instead.
