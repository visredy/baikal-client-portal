// app.js - improved mobile UI logic with tabs, empty states, and credentials-included fetch
const $ = (id) => document.getElementById(id);
const loginCard = $('loginCard');
const dash = $('dash');
const clientName = $('clientName');
const clientBadges = $('clientBadges');
$('year').textContent = new Date().getFullYear();

const tabs = {
  accounts: $('accountsPanel'),
  activity: $('activityPanel')
};
$('tabAccounts').addEventListener('click', ()=>showTab('accounts'));
$('tabActivity').addEventListener('click', ()=>showTab('activity'));

function showTab(name){
  for (const k in tabs){
    if (k===name) tabs[k].classList.remove('hidden'); else tabs[k].classList.add('hidden');
  }
}

async function api(path, opts={}){
  const res = await fetch(path, Object.assign({
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }
  }, opts));
  if (!res.ok){
    const t = await res.text();
    throw new Error(t || res.statusText);
  }
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

async function login(){
  $('loginErr').textContent = '';
  $('loginBtn').disabled = true;
  try {
    const username = $('username').value.trim();
    const password = $('password').value;
    if (!username || !password) throw new Error('Enter username and password');
    await api('/auth/login', { method:'POST', body: JSON.stringify({ username, password }) });
    await loadDashboard();
    loginCard.classList.add('hidden');
    dash.classList.remove('hidden');
  } catch(e){
    $('loginErr').textContent = e.message || 'Login failed';
  } finally {
    $('loginBtn').disabled = false;
  }
}

async function loadDashboard(){
  try {
    const me = await api('/api/self/clients');
    const c = (me.pageItems && me.pageItems[0]) || {};
    clientName.textContent = c.displayName || 'Client';
    clientBadges.innerHTML = `<span class="px-2 py-0.5 rounded-xl chip text-xs">${(c.status&&c.status.value)||'—'}</span>`;
    const clientId = c.id;
    const accts = await api(`/api/self/accounts?clientId=${clientId}`);
    renderAccounts(accts);
    // Preload activity (loan+save tx)
    renderActivity(accts);
  } catch(e){
    $('accounts').innerHTML = `<div class="text-red-400 text-sm">${e.message||'Failed to load dashboard'}</div>`;
  }
}

function pill(statusValue){
  return `<span class="px-2 py-0.5 rounded-xl border text-xs">${statusValue||'—'}</span>`;
}

function renderAccounts(accts){
  const loans = accts.loanAccounts || [];
  const savs  = accts.savingsAccounts || [];
  // Loans
  const loansList = $('loansList');
  loansList.innerHTML = loans.length
    ? loans.map(l => `
      <button class="w-full text-left p-3 rounded-xl border border-slate-700 hover:border-slate-500"
        onclick="openLoan(${l.id}, '${(l.productName||'').replace(/'/g, "\'")}', '${(l.accountNo||'').replace(/'/g, "\'")}')">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium">${l.productName||'Loan'} · <span class="text-slate-400">${l.accountNo||''}</span></div>
            <div class="text-xs text-slate-400">Balance: ${l.loanBalance!=null? l.loanBalance : '—'}</div>
          </div>
          <div class="text-xs">${(l.status&&l.status.value)||''}</div>
        </div>
      </button>`).join('')
    : `<div class="text-sm text-slate-400">No loans</div>`;

  // Savings
  const savingsList = $('savingsList');
  savingsList.innerHTML = savs.length
    ? savs.map(s => `
      <button class="w-full text-left p-3 rounded-xl border border-slate-700 hover:border-slate-500"
        onclick="openSavings(${s.id}, '${(s.productName||'').replace(/'/g, "\'")}', '${(s.accountNo||'').replace(/'/g, "\'")}')">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium">${s.productName||'Savings'} · <span class="text-slate-400">${s.accountNo||''}</span></div>
            <div class="text-xs text-slate-400">${(s.currency&&s.currency.displayLabel)||''}</div>
          </div>
          <div class="text-xs">Bal: ${s.accountBalance!=null? s.accountBalance : '—'}</div>
        </div>
      </button>`).join('')
    : `<div class="text-sm text-slate-400">No savings</div>`;
}

async function openLoan(id, productName, accountNo){
  $('loanPanel').classList.remove('hidden');
  $('savingsPanel').classList.add('hidden');
  $('loanMeta').innerHTML = `<div class="text-sm">Product: <b>${productName}</b>&nbsp;·&nbsp;Account: <b>${accountNo}</b></div>`;
  $('loanSchedule').innerHTML = skeletonTable();
  $('loanTx').innerHTML = '';

  try {
    const loan = await api(`/api/self/loan/${id}`);
    const statusValue = (loan.status && loan.status.value) || 'Unknown';
    if (!(loan.status && loan.status.active)) {
      $('loanSchedule').innerHTML = `<div class="p-3 rounded-xl border border-yellow-500 text-yellow-300">No schedule for status <b>${statusValue}</b>.</div>`;
    } else {
      const periods = (loan.repaymentSchedule && loan.repaymentSchedule.periods) || [];
      const rows = periods.filter(p => p.period && p.period > 0);
      $('loanSchedule').innerHTML = renderSchedule(rows);
    }
    const txs = (loan.transactions || []).slice(0, 10);
    $('loanTx').innerHTML = txs.length ? renderTxList('Recent Payments', txs) : '';
  } catch(e){
    $('loanSchedule').innerHTML = `<div class="text-red-400 text-sm">${e.message}</div>`;
  }
}

async function openSavings(id, productName, accountNo){
  $('savingsPanel').classList.remove('hidden');
  $('loanPanel').classList.add('hidden');
  $('savingsMeta').innerHTML = `<div class="text-sm">Product: <b>${productName}</b>&nbsp;·&nbsp;Account: <b>${accountNo}</b></div>`;
  $('savingsTx').innerHTML = '<div class="text-slate-400 text-sm">Loading…</div>';
  try {
    const acct = await api(`/api/self/savings/${id}`);
    const tx = (acct.transactions || []).slice(0, 20);
    $('savingsTx').innerHTML = tx.length ? renderTxList('Recent Transactions', tx, acct.currency&&acct.currency.code) : '<div class="opacity-70 text-sm">No recent transactions.</div>';
  } catch(e){
    $('savingsTx').innerHTML = `<div class="text-red-400 text-sm">${e.message}</div>`;
  }
}

function renderTxList(title, txs, currencyCode){
  let list = `<div class="mt-2"><div class="font-semibold mb-1">${title}</div><ul class="text-sm divide-y divide-slate-700">`;
  txs.forEach(t => {
    const date = Array.isArray(t.date) ? t.date.join('-') : t.date;
    list += `<li class="py-2 flex justify-between"><span>${date||''} — ${(t.type&&t.type.value)||''}</span><span>${t.amount||0} ${currencyCode||''}</span></li>`;
  });
  list += '</ul></div>';
  return list;
}

function renderSchedule(rows){
  let t = '<div class="overflow-x-auto">';
  t += '<table class="w-full text-sm"><thead><tr class="text-left text-slate-400">';
  t += '<th class="py-2">Due date</th><th>Principal</th><th>Interest</th><th>Fees</th><th>Total</th></tr></thead><tbody>';
  rows.forEach(r => {
    const due = Array.isArray(r.dueDate) ? r.dueDate.join('-') : r.dueDate;
    t += `<tr class="border-t border-slate-800"><td class="py-2">${due||''}</td><td>${r.principalDue||0}</td><td>${r.interestDue||0}</td><td>${r.feeChargesDue||0}</td><td class="font-semibold">${r.totalDueForPeriod||0}</td></tr>`;
  });
  t += '</tbody></table></div><button onclick="window.print()" class="mt-3 px-3 py-1.5 rounded-xl border border-slate-700">Print</button>';
  return t;
}

function skeletonTable(){
  return '<div class="animate-pulse h-24 rounded-xl bg-slate-800/40"></div>';
}

async function renderActivity(accts){
  const loans = accts.loanAccounts||[];
  const savs  = accts.savingsAccounts||[];
  // For demo, just show the first loan & first savings tx lists if present
  const act = $('activityList');
  let blocks = '';
  if (loans[0]){
    try {
      const l = await api(`/api/self/loan/${loans[0].id}`);
      const txs = (l.transactions||[]).slice(0,5);
      if (txs.length) blocks += renderTxList('Loan activity', txs);
    } catch {}
  }
  if (savs[0]){
    try {
      const s = await api(`/api/self/savings/${savs[0].id}`);
      const txs = (s.transactions||[]).slice(0,5);
      if (txs.length) blocks += renderTxList('Savings activity', txs, s.currency&&s.currency.code);
    } catch {}
  }
  act.innerHTML = blocks || '<div class="text-slate-400 text-sm">No recent activity.</div>';
}

$('loginBtn').addEventListener('click', login);
$('logoutBtn').addEventListener('click', async () => {
  await api('/auth/logout', { method:'POST' });
  dash.classList.add('hidden');
  $('loanPanel').classList.add('hidden');
  $('savingsPanel').classList.add('hidden');
  $('username').value=''; $('password').value='';
  loginCard.classList.remove('hidden');
});
$('closeLoan').addEventListener('click', ()=> $('loanPanel').classList.add('hidden'));
$('closeSavings').addEventListener('click', ()=> $('savingsPanel').classList.add('hidden'));
