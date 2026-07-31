# Certis Web

React + TypeScript frontend for Certis.

## Local development

Requirements:

- Node.js 22+
- `certis-api` running on `http://localhost:8080`

Install dependencies and start Vite:

```bash
npm install
npm run dev
```

The app is available at `http://localhost:3000`. Vite proxies `/api` requests to
the backend, so authentication cookies remain browser-managed and are never
stored in JavaScript.

## Authentication configuration

The frontend uses the backend contract from `certis-api`:

- `POST /api/v1/auth` — sign in
- `POST /api/v1/auth/registration` — create an account

Optional environment variables:

```dotenv
# Use an empty value for the local Vite proxy or same-origin deployment.
VITE_API_URL=

# Redirect here after a successful sign-in. When omitted, a success message is shown.
VITE_AUTH_SUCCESS_URL=/dashboard
```

## Checks

```bash
npm run lint
npm run build
```
