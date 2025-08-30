// server.js - Mobile-first client portal (Node/Express) for Fineract Self-Service APIs
// Run: npm install && npm run dev
// Env: see .env.example

const express = require('express');
const session = require('express-session');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// --- Config ---
const PORT = process.env.PORT || 3000;
const FINERACT_BASE = process.env.FINERACT_BASE || 'https://baikalfinance.smartfric.online/fineract-provider/api/v1';
const TENANT = process.env.TENANT || 'default';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-this-secret';

// --- Middlewares ---
app.use(helmet());
app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  name: 'mifos_selfsvc.sid',
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false // set to true behind HTTPS reverse proxy
  }
}));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false
});

// --- Helpers ---
async function fineractFetch(sessionData, pathAndQuery, options = {}) {
  if (!sessionData?.basic) {
    return { status: 401, body: { message: 'Not authenticated' } };
  }
  const headers = Object.assign({
    'Authorization': sessionData.basic,
    'Fineract-Platform-TenantId': TENANT,
    'Accept': 'application/json'
  }, options.headers || {});

  const res = await fetch(`${FINERACT_BASE}${pathAndQuery}`, {
    method: options.method || 'GET',
    headers,
    body: options.body || undefined
  });

  let bodyText = await res.text();
  let body;
  try { body = JSON.parse(bodyText); } catch {
    body = bodyText;
  }
  return { status: res.status, body };
}

// --- Auth routes ---

// Login: stores Basic auth for the self-service user in the session after verifying
app.post('/auth/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ message: 'username & password required' });

    const basic = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');

    // Verify by calling /self/clients
    const verifyRes = await fetch(`${FINERACT_BASE}/self/clients`, {
      headers: {
        'Authorization': basic,
        'Fineract-Platform-TenantId': TENANT,
        'Accept': 'application/json'
      }
    });

    if (verifyRes.status !== 200) {
      const errText = await verifyRes.text();
      return res.status(401).json({ message: 'Invalid credentials or self-service user', details: errText });
    }

    const json = await verifyRes.json();
    // Attempt to capture clientId for convenience
    const clientId = json?.pageItems?.[0]?.id || null;

    req.session.user = {
      username,
      basic,
      clientId
    };
    res.json({ ok: true, clientId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Login error', error: String(e) });
  }
});

app.post('/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// --- API proxy routes (self-service) ---
app.get('/api/self/clients', async (req, res) => {
  const out = await fineractFetch(req.session.user, '/self/clients');
  res.status(out.status).send(out.body);
});

app.get('/api/self/accounts', async (req, res) => {
  const clientId = req.query.clientId || req.session?.user?.clientId;
  if (!clientId) return res.status(400).json({ message: 'clientId is required' });
  const qs = '?fields=loanAccounts,savingsAccounts';
  const out = await fineractFetch(req.session.user, `/self/clients/${clientId}/accounts${qs}`);
  res.status(out.status).send(out.body);
});

app.get('/api/self/loan/:id', async (req, res) => {
  const assoc = 'repaymentSchedule,transactions';
  const out = await fineractFetch(req.session.user, `/self/loans/${req.params.id}?associations=${assoc}`);
  res.status(out.status).send(out.body);
});

app.get('/api/self/savings/:id', async (req, res) => {
  const assoc = 'transactions,charges';
  const out = await fineractFetch(req.session.user, `/self/savingsaccounts/${req.params.id}?associations=${assoc}`);
  res.status(out.status).send(out.body);
});

// --- Static client ---
app.use(express.static(path.join(__dirname, 'public')));

// simple health endpoint
app.get("/health", (req,res)=>res.status(200).send("ok"));

// Fallback to index.html for any unknown path (single-page app behavior)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {

  console.log(`Mobile client portal running on http://localhost:${PORT}`);
  console.log(`Proxying to FINERACT_BASE=${FINERACT_BASE} (tenant=${TENANT})`);
});
