// app.js - improved mobile UI logic with tabs, empty states, and credentials-included fetch
// app.js - improved mobile UI logic with tabs, empty states, and credentials-included fetch
const $ = (id) => document.getElementById(id);
const $ = (id) => document.getElementById(id);
const loginCard = $('loginCard');
const loginCard = $('loginCard');
const dash = $('dash');
const dash = $('dash');
const clientName = $('clientName');
const clientName = $('clientName');
const clientBadges = $('clientBadges');
const clientBadges = $('clientBadges');
$('year').textContent = new Date().getFullYear();
$('year').textContent = new Date().getFullYear();


const tabs = {
const tabs = {
  accounts: $('accountsPanel'),
  accounts: $('accountsPanel'),
  activity: $('activityPanel')
  activity: $('activityPanel')
};
};
$('tabAccounts').addEventListener('click', ()=>showTab('accounts'));
$('tabAccounts').addEventListener('click', ()=>showTab('accounts'));
$('tabActivity').addEventListener('click', ()=>showTab('activity'));
$('tabActivity').addEventListener('click', ()=>showTab('activity'));


function showTab(name){
function showTab(name){
  if(name==="activity" && !document.getElementById("activityList").dataset.loaded){ renderActivityOnDemand(); }
  for (const k in tabs){
  for (const k in tabs){
    if (k===name) tabs[k].classList.remove('hidden'); else tabs[k].classList.add('hidden');
    if (k===name) tabs[k].classList.remove('hidden'); else tabs[k].classList.add('hidden');
  }
  }
}
}


async function api(path, opts={}){
async function api(path, opts={}){
  const res = await fetch(path, Object.assign({
  const res = await fetch(path, Object.assign({
    credentials: 'include',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }
    headers: { 'Content-Type': 'application/json' }
  }, opts));
  }, opts));
  if (!res.ok){
  if (!res.ok){
    const t = await res.text();
    const t = await res.text();
    throw new Error(t || res.statusText);
    throw new Error(t || res.statusText);
  }
  }
  const text = await res.text();
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
  try { return JSON.parse(text); } catch { return text; }
}
}


async function login(){
async function login(){
  $('loginErr').textContent = '';
  $('loginErr').textContent = '';
  $('loginBtn').disabled = true;
  $('loginBtn').disabled = true;
  try {
  try {
    const username = $('username').value.trim();
    const username = $('username').value.trim();
    const password = $('password').value;
    const password = $('password').value;
    if (!username || !password) throw new Error('Enter username and password');
    if (!username || !password) throw new Error('Enter username and password');
    await api('/auth/login', { method:'POST', body: JSON.stringify({ username, password }) });
    await api('/auth/login', { method:'POST', body: JSON.stringify({ username, password }) });
    await loadDashboard();
    await loadDashboard();
    loginCard.classList.add('hidden');
    loginCard.classList.add('hidden');
    dash.classList.remove('hidden');
    dash.classList.remove('hidden');
  } catch(e){
  } catch(e){
    $('loginErr').textContent = e.message || 'Login failed';
    $('loginErr').textContent = e.message || 'Login failed';
  } finally {
  } finally {
    $('loginBtn').disabled = false;
    $('loginBtn').disabled = false;
  }
  }
}
}


async function loadDashboard(){
async function loadDashboard(){
  try {
  try {
    const me = await api('/api/self/clients');
    const me = await api('/api/self/clients');
    const c = (me.pageItems && me.pageItems[0]) || {};
    const c = (me.pageItems && me.pageItems[0]) || {};
    clientName.textContent = c.displayName || 'Client';
    clientName.textContent = c.displayName || 'Client';
    clientBadges.innerHTML = `<span class="px-2 py-0.5 rounded-xl chip text-xs">${(c.status&&c.status.value)||'—'}</span>`;
    clientBadges.innerHTML = `<span class="px-2 py-0.5 rounded-xl chip text-xs">${(c.status&&c.status.value)||'—'}</span>`;
    const clientId = c.id;
    const clientId = c.id;
    const accts = await api(`/api/self/accounts?clientId=${clientId}`);
    const accts = await api(`/api/self/accounts?clientId=${clientId}`);
    renderAccounts(accts);
    renderAccounts(accts);
    // Preload activity (loan+save tx)
    // Preload activity (loan+save tx)
    // renderActivity(accts); // lazy-load activity on tab click
    // renderActivity(accts); // lazy-load activity on tab click
  } catch(e){
  } catch(e){
    $('accounts').innerHTML = `<div class="text-red-400 text-sm">${e.message||'Failed to load dashboard'}</div>`;
    $('accounts').innerHTML = `<div class="text-red-400 text-sm">${e.message||'Failed to load dashboard'}</div>`;
  }
  }
}
}


function pill(statusValue){
function pill(statusValue){
  return `<span class="px-2 py-0.5 rounded-xl border text-xs">${statusValue||'—'}</span>`;
  return `<span class="px-2 py-0.5 rounded-xl border text-xs">${statusValue||'—'}</span>`;
}
}


function renderAccounts(accts){
function renderAccounts(accts){
  const loans = accts.loanAccounts || [];
  const loans = accts.loanAccounts || [];
  const savs  = accts.savingsAccounts || [];
  const savs  = accts.savingsAccounts || [];
  // Loans
  // Loans
  const loansList = $('loansList');
  const loansList = $('loansList');
  loansList.innerHTML = loans.length
  loansList.innerHTML = loans.length
    ? loans.map(l => `
    ? loans.map(l => `
      <button class="w-full text-left p-3 rounded-xl border border-slate-700 hover:border-slate-500"
      <button class="w-full text-left p-3 rounded-xl border border-slate-700 hover:border-slate-500"
        onclick="openLoan(${l.id}, '${(l.productName||'').replace(/'/g, "\'")}', '${(l.accountNo||'').replace(/'/g, "\'")}')">
        onclick="openLoan(${l.id}, '${(l.productName||'').replace(/'/g, "\'")}', '${(l.accountNo||'').replace(/'/g, "\'")}')">
        <div class="flex items-center justify-between">
        <div class="flex items-center justify-between">
          <div>
          <div>
            <div class="font-medium">${l.productName||'Loan'} · <span class="text-slate-400">${l.accountNo||''}</span></div>
            <div class="font-medium">${l.productName||'Loan'} · <span class="text-slate-400">${l.accountNo||''}</span></div>
            <div class="text-xs text-slate-400">Balance: ${l.loanBalance!=null? l.loanBalance : '—'}</div>
            <div class="text-xs text-slate-400">Balance: ${l.loanBalance!=null? l.loanBalance : '—'}</div>
          </div>
          </div>
          <div class="text-xs">${(l.status&&l.status.value)||''}</div>
          <div class="text-xs">${(l.status&&l.status.value)||''}</div>
        </div>
        </div>
      </button>`).join('')
      </button>`).join('')
    : `<div class="text-sm text-slate-400">No loans</div>`;
    : `<div class="text-sm text-slate-400">No loans</div>`;


  // Savings
  // Savings
  const savingsList = $('savingsList');
  const savingsList = $('savingsList');
  savingsList.innerHTML = savs.length
  savingsList.innerHTML = savs.length
    ? savs.map(s => `
    ? savs.map(s => `
      <button class="w-full text-left p-3 rounded-xl border border-slate-700 hover:border-slate-500"
      <button class="w-full text-left p-3 rounded-xl border border-slate-700 hover:border-slate-500"
        onclick="openSavings(${s.id}, '${(s.productName||'').replace(/'/g, "\'")}', '${(s.accountNo||'').replace(/'/g, "\'")}')">
        onclick="openSavings(${s.id}, '${(s.productName||'').replace(/'/g, "\'")}', '${(s.accountNo||'').replace(/'/g, "\'")}')">
        <div class="flex items-center justify-between">
        <div class="flex items-center justify-between">
          <div>
          <div>
            <div class="font-medium">${s.productName||'Savings'} · <span class="text-slate-400">${s.accountNo||''}</span></div>
            <div class="font-medium">${s.productName||'Savings'} · <span class="text-slate-400">${s.accountNo||''}</span></div>
            <div class="text-xs text-slate-400">${(s.currency&&s.currency.displayLabel)||''}</div>
            <div class="text-xs text-slate-400">${(s.currency&&s.currency.displayLabel)||''}</div>
          </div>
          </div>
          <div class="text-xs">Bal: ${s.accountBalance!=null? s.accountBalance : '—'}</div>
          <div class="text-xs">Bal: ${s.accountBalance!=null? s.accountBalance : '—'}</div>
        </div>
        </div>
      </button>`).join('')
      </button>`).join('')
    : `<div class="text-sm text-slate-400">No savings</div>`;
    : `<div class="text-sm text-slate-400">No savings</div>`;
}
}


async function openLoan(id, productName, accountNo){
async function openLoan(id, productName, accountNo){
  $('loanPanel').classList.remove('hidden');
  $('loanPanel').classList.remove('hidden');
  $('savingsPanel').classList.add('hidden');
  $('savingsPanel').classList.add('hidden');
  $('loanMeta').innerHTML = `<div class="text-sm">Product: <b>${productName}</b>&nbsp;·&nbsp;Account: <b>${accountNo}</b></div>`;
  $('loanMeta').innerHTML = `<div class="text-sm">Product: <b>${productName}</b>&nbsp;·&nbsp;Account: <b>${accountNo}</b></div>`;
  $('loanSchedule').innerHTML = skeletonTable();
  $('loanSchedule').innerHTML = skeletonTable();
  $('loanTx').innerHTML = '';
  $('loanTx').innerHTML = '';


  try {
  try {
    const loan = await api(`/api/self/loan/${id}`);
    const loan = await api(`/api/self/loan/${id}`);
    const statusValue = (loan.status && loan.status.value) || 'Unknown';
    const statusValue = (loan.status && loan.status.value) || 'Unknown';
    if (!(loan.status && loan.status.active)) {
    if (!(loan.status && loan.status.active)) {
      $('loanSchedule').innerHTML = `<div class="p-3 rounded-xl border border-yellow-500 text-yellow-300">No schedule for status <b>${statusValue}</b>.</div>`;
      $('loanSchedule').innerHTML = `<div class="p-3 rounded-xl border border-yellow-500 text-yellow-300">No schedule for status <b>${statusValue}</b>.</div>`;
    } else {
    } else {
      const periods = (loan.repaymentSchedule && loan.repaymentSchedule.periods) || [];
      const periods = (loan.repaymentSchedule && loan.repaymentSchedule.periods) || [];
      const rows = periods.filter(p => p.period && p.period > 0);
      const rows = periods.filter(p => p.period && p.period > 0);
      $('loanSchedule').innerHTML = renderSchedule(rows);
      $('loanSchedule').innerHTML = renderSchedule(rows);
    }
    }
    const txs = (loan.transactions || []).slice(0, 10);
    const txs = (loan.transactions || []).slice(0, 10);
    $('loanTx').innerHTML = txs.length ? renderTxList('Recent Payments', txs) : '';
    $('loanTx').innerHTML = txs.length ? renderTxList('Recent Payments', txs) : '';
  } catch(e){
  } catch(e){
    $('loanSchedule').innerHTML = `<div class="text-red-400 text-sm">${e.message}</div>`;
    $('loanSchedule').innerHTML = `<div class="text-red-400 text-sm">${e.message}</div>`;
  }
  }
}
}


async function openSavings(id, productName, accountNo){
async function openSavings(id, productName, accountNo){
  $('savingsPanel').classList.remove('hidden');
  $('savingsPanel').classList.remove('hidden');
  $('loanPanel').classList.add('hidden');
  $('loanPanel').classList.add('hidden');
  $('savingsMeta').innerHTML = `<div class="text-sm">Product: <b>${productName}</b>&nbsp;·&nbsp;Account: <b>${accountNo}</b></div>`;
  $('savingsMeta').innerHTML = `<div class="text-sm">Product: <b>${productName}</b>&nbsp;·&nbsp;Account: <b>${accountNo}</b></div>`;
  $('savingsTx').innerHTML = '<div class="text-slate-400 text-sm">Loading…</div>';
  $('savingsTx').innerHTML = '<div class="text-slate-400 text-sm">Loading…</div>';
  try {
  try {
    const acct = await api(`/api/self/savings/${id}`);
    const acct = await api(`/api/self/savings/${id}`);
    const tx = (acct.transactions || []).slice(0, 20);
    const tx = (acct.transactions || []).slice(0, 20);
    $('savingsTx').innerHTML = tx.length ? renderTxList('Recent Transactions', tx, acct.currency&&acct.currency.code) : '<div class="opacity-70 text-sm">No recent transactions.</div>';
    $('savingsTx').innerHTML = tx.length ? renderTxList('Recent Transactions', tx, acct.currency&&acct.currency.code) : '<div class="opacity-70 text-sm">No recent transactions.</div>';
  } catch(e){
  } catch(e){
    $('savingsTx').innerHTML = `<div class="text-red-400 text-sm">${e.message}</div>`;
    $('savingsTx').innerHTML = `<div class="text-red-400 text-sm">${e.message}</div>`;
  }
  }
}
}


function renderTxList(title, txs, currencyCode){
function renderTxList(title, txs, currencyCode){
  let list = `<div class="mt-2"><div class="font-semibold mb-1">${title}</div><ul class="text-sm divide-y divide-slate-700">`;
  let list = `<div class="mt-2"><div class="font-semibold mb-1">${title}</div><ul class="text-sm divide-y divide-slate-700">`;
  txs.forEach(t => {
  txs.forEach(t => {
    const date = Array.isArray(t.date) ? t.date.join('-') : t.date;
    const date = Array.isArray(t.date) ? t.date.join('-') : t.date;
    list += `<li class="py-2 flex justify-between"><span>${date||''} — ${(t.type&&t.type.value)||''}</span><span>${t.amount||0} ${currencyCode||''}</span></li>`;
    list += `<li class="py-2 flex justify-between"><span>${date||''} — ${(t.type&&t.type.value)||''}</span><span>${t.amount||0} ${currencyCode||''}</span></li>`;
  });
  });
  list += '</ul></div>';
  list += '</ul></div>';
  return list;
  return list;
}
}


function renderSchedule(rows){
function renderSchedule(rows){
  let t = '<div class="overflow-x-auto">';
  let t = '<div class="overflow-x-auto">';
  t += '<table class="w-full text-sm"><thead><tr class="text-left text-slate-400">';
  t += '<table class="w-full text-sm"><thead><tr class="text-left text-slate-400">';
  t += '<th class="py-2">Due date</th><th>Principal</th><th>Interest</th><th>Fees</th><th>Total</th></tr></thead><tbody>';
  t += '<th class="py-2">Due date</th><th>Principal</th><th>Interest</th><th>Fees</th><th>Total</th></tr></thead><tbody>';
  rows.forEach(r => {
  rows.forEach(r => {
    const due = Array.isArray(r.dueDate) ? r.dueDate.join('-') : r.dueDate;
    const due = Array.isArray(r.dueDate) ? r.dueDate.join('-') : r.dueDate;
    t += `<tr class="border-t border-slate-800"><td class="py-2">${due||''}</td><td>${r.principalDue||0}</td><td>${r.interestDue||0}</td><td>${r.feeChargesDue||0}</td><td class="font-semibold">${r.totalDueForPeriod||0}</td></tr>`;
    t += `<tr class="border-t border-slate-800"><td class="py-2">${due||''}</td><td>${r.principalDue||0}</td><td>${r.interestDue||0}</td><td>${r.feeChargesDue||0}</td><td class="font-semibold">${r.totalDueForPeriod||0}</td></tr>`;
  });
  });
  t += '</tbody></table></div><button onclick="window.print()" class="mt-3 px-3 py-1.5 rounded-xl border border-slate-700">Print</button>';
  t += '</tbody></table></div><button onclick="window.print()" class="mt-3 px-3 py-1.5 rounded-xl border border-slate-700">Print</button>';
  return t;
  return t;
}
}


function skeletonTable(){
function skeletonTable(){
  return '<div class="animate-pulse h-24 rounded-xl bg-slate-800/40"></div>';
  return '<div class="animate-pulse h-24 rounded-xl bg-slate-800/40"></div>';
}
}


async function renderActivity(accts){
async function renderActivity(accts){
  const loans = accts.loanAccounts||[];
  const loans = accts.loanAccounts||[];
  const savs  = accts.savingsAccounts||[];
  const savs  = accts.savingsAccounts||[];
  // For demo, just show the first loan & first savings tx lists if present
  // For demo, just show the first loan & first savings tx lists if present
  const act = $('activityList');
  const act = $('activityList');
  let blocks = '';
  let blocks = '';
  if (loans[0]){
  if (loans[0]){
    try {
    try {
      const l = await api(`/api/self/loan/${loans[0].id}`);
      const l = await api(`/api/self/loan/${loans[0].id}`);
      const txs = (l.transactions||[]).slice(0,5);
      const txs = (l.transactions||[]).slice(0,5);
      if (txs.length) blocks += renderTxList('Loan activity', txs);
      if (txs.length) blocks += renderTxList('Loan activity', txs);
    } catch {}
    } catch {}
  }
  }
  if (savs[0]){
  if (savs[0]){
    try {
    try {
      const s = await api(`/api/self/savings/${savs[0].id}`);
      const s = await api(`/api/self/savings/${savs[0].id}`);
      const txs = (s.transactions||[]).slice(0,5);
      const txs = (s.transactions||[]).slice(0,5);
      if (txs.length) blocks += renderTxList('Savings activity', txs, s.currency&&s.currency.code);
      if (txs.length) blocks += renderTxList('Savings activity', txs, s.currency&&s.currency.code);
    } catch {}
    } catch {}
  }
  }
  act.innerHTML = blocks || '<div class="text-slate-400 text-sm">No recent activity.</div>';
  act.innerHTML = blocks || '<div class="text-slate-400 text-sm">No recent activity.</div>';
}
}


$('loginBtn').addEventListener('click', login);
$('loginBtn').addEventListener('click', login);
$('logoutBtn').addEventListener('click', async () => {
$('logoutBtn').addEventListener('click', async () => {
  await api('/auth/logout', { method:'POST' });
  await api('/auth/logout', { method:'POST' });
  dash.classList.add('hidden');
  dash.classList.add('hidden');
  $('loanPanel').classList.add('hidden');
  $('loanPanel').classList.add('hidden');
  $('savingsPanel').classList.add('hidden');
  $('savingsPanel').classList.add('hidden');
  $('username').value=''; $('password').value='';
  $('username').value=''; $('password').value='';
  loginCard.classList.remove('hidden');
  loginCard.classList.remove('hidden');
});
});
$('closeLoan').addEventListener('click', ()=> $('loanPanel').classList.add('hidden'));
$('closeLoan').addEventListener('click', ()=> $('loanPanel').classList.add('hidden'));
$('closeSavings').addEventListener('click', ()=> $('savingsPanel').classList.add('hidden'));
$('closeSavings').addEventListener('click', ()=> $('savingsPanel').classList.add('hidden'));

async function renderActivityOnDemand(){ document.getElementById("activityList").dataset.loaded=1; const me=await api("/api/self/clients"); const c=(me.pageItems&&me.pageItems[0])||{}; const accts=await api(`/api/self/accounts?clientId=${c.id}`); await renderActivity(accts); }
