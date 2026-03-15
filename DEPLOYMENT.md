# Google Cloud deployment checklist (leadgen.narrowpathevents.com)

## Why `Login failed` happened

Common root causes fixed in this patch:

1. **Hardcoded credentials in source code** (frontend + backend) caused mismatch and unsafe resets.
2. **Missing or inconsistent env vars** for super admin and API URL in production.
3. **CORS not configured** for your domain, blocking browser auth requests.
4. **No deterministic bootstrap for tenant/company admin** on fresh servers.

## What is now automated

- Backend reads super admin and bootstrap config from `backend/.env`.
- Startup creates/syncs indexes for `companies`, `users`, `leads`.
- Startup ensures super admin exists and remains active.
- Optional startup bootstrap creates company + `company_admin` user.
- Frontend login no longer ships default credentials.
- Frontend API defaults to current origin or explicit `VITE_API_BASE_URL`.

## Server setup commands

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# run backend
cd backend && npm ci && npm run build && npm run start

# run frontend
cd frontend && npm ci && npm run build && npm run preview -- --host 0.0.0.0 --port 5173
```

## Minimum process validation

```bash
# backend health
curl -s https://leadgen.narrowpathevents.com/health

# super login
curl -s -X POST https://leadgen.narrowpathevents.com/auth/super/login \
  -H 'content-type: application/json' \
  -d '{"email":"davidksinc@gmail.com","password":"M@davi19!"}'
```

If super login returns a JWT token, auth is healthy.

## Security hardening recommendations

- Rotate `SUPER_ADMIN_PASSWORD` and `JWT_SECRET` regularly.
- Restrict MongoDB to private IP / VPC only.
- Terminate TLS in load balancer and force HTTPS redirects.
- Add Cloud Armor rate limits for `/auth/*` routes.
- Move secrets to Secret Manager and inject at runtime.
