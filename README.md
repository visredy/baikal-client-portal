# Mobile Client Portal (Fineract Self-Service)

Mobile-first web app (vanilla JS + Tailwind) with a Node/Express proxy that adds the tenant header and keeps Basic auth server-side.

## Quick start

```bash
cd mobile-client-portal
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:3000 and log in with a **self-service** user.

### Environment (.env)
- `FINERACT_BASE` e.g. `https://baikalfinance.smartfric.online/fineract-provider/api/v1`
- `TENANT` e.g. `default`
- `SESSION_SECRET` any random string

### What it includes
- Login → verifies via `/self/clients`
- Accounts → `/self/clients/{id}/accounts?fields=loanAccounts,savingsAccounts`
- Loan details → `/self/loans/{id}?associations=repaymentSchedule,transactions`
- Savings details → `/self/savingsaccounts/{id}?associations=transactions,charges`

### Production notes
- Put the app behind HTTPS.
- Set `cookie.secure = true` in `server.js` when served over HTTPS/reverse proxy.
- Consider storing credentials in a more robust session store (Redis) for multi-instance deployments.
- Optionally restrict exposed routes and add CSRF protection for form posts.
