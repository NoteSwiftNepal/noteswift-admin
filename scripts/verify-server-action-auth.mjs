// Runtime check that the admin panel's server actions refuse callers who are
// not signed in or not allowed (security issue S1, backend
// CRM_IMPLEMENTATION.md §12). A successful build proves nothing about this;
// this script calls the real action endpoints of a running `next start`.
//
// It starts a stub of the backend profile endpoint (the only thing
// lib/server/require-admin.ts asks), so each case controls exactly what the
// backend answers. The real backend's token checks have their own tests.
//
// Usage (the build must point NEXT_PUBLIC_ADMIN_API_URL at the stub, because
// Next inlines that value at build time):
//   NEXT_PUBLIC_ADMIN_API_URL=http://127.0.0.1:59123 npx next build
//   MONGODB_URI=<throwaway database> node scripts/verify-server-action-auth.mjs
// Use a throwaway database: the authorized case reads counts from it (passed
// to the panel as MONGO_URI, the name src/lib/mongoose.ts reads).
// Middleware does NOT stop server-action POSTs (verified 2026-10-28: a request
// with no cookie reached the action), so every case checks that the action
// itself refuses.
import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import crypto from 'node:crypto';

const STUB_PORT = Number(process.env.STUB_PORT || 59123);
const APP_PORT = Number(process.env.APP_PORT || 59124);
const UNAUTHORIZED_TEXT = 'You are not signed in or not allowed to do this.';

if (!process.env.MONGODB_URI) {
  console.error('Set MONGODB_URI to a throwaway database.');
  process.exit(2);
}

// JWT-shaped tokens. middleware.ts only decodes the claims (it lets a request
// through when it can't verify the signature), so a forged token reaches the
// action; only the backend can tell real from forged.
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const makeToken = (claims) => {
  const head = b64({ alg: 'HS256', typ: 'JWT' });
  const body = b64({ type: 'admin', adminId: crypto.randomUUID(), ...claims });
  const sig = crypto.createHmac('sha256', crypto.randomBytes(32)).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${sig}`;
};
const future = Math.floor(Date.now() / 1000) + 3600;
const tokens = {
  authorized: makeToken({ exp: future, case: 'authorized' }),
  noPermission: makeToken({ exp: future, case: 'noPermission' }),
  forged: makeToken({ exp: future, case: 'forged' }),
  backendExpired: makeToken({ exp: future, case: 'backendExpired' }),
  expired: makeToken({ exp: Math.floor(Date.now() / 1000) - 60, case: 'expired' }),
};

// What the backend would answer for each token.
const stubCalls = [];
const stub = http.createServer((req, res) => {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  stubCalls.push({ path: req.url, token });
  const send = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
  if (req.url !== '/api/admin/admin-auth/profile') return send(404, {});
  if (token === tokens.authorized) return send(200, { success: true, admin: { _id: 'a1', role: 'admin', permissions: ['dashboard.view'] } });
  if (token === tokens.noPermission) return send(200, { success: true, admin: { _id: 'a2', role: 'unknown', permissions: [] } });
  return send(401, { success: false, error: 'Invalid or expired token' }); // forged, expired, anything else
});

const manifest = JSON.parse(readFileSync('.next/server/server-reference-manifest.json', 'utf8'));
const actionId = (name) => {
  const entry = Object.entries(manifest.node).find(([, v]) => v.exportedName === name);
  if (!entry) throw new Error(`Action ${name} not found in the build`);
  return entry[0];
};

async function callAction(name, token) {
  const res = await fetch(`http://127.0.0.1:${APP_PORT}/dashboard`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'Next-Action': actionId(name),
      'Content-Type': 'text/plain;charset=UTF-8',
      Accept: 'text/x-component',
      ...(token ? { Cookie: `admin_token=${token}` } : {}),
    },
    body: '[]',
    signal: AbortSignal.timeout(60_000),
  });
  return { status: res.status, text: await res.text() };
}

const waitFor = async (url) => {
  for (let i = 0; i < 120; i++) {
    try { await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(5_000) }); return; } catch { await new Promise((r) => setTimeout(r, 500)); }
  }
  throw new Error(`${url} did not start`);
};

let app;
const results = [];
const check = (label, ok, detail) => { results.push({ label, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `\n      ${detail}`}`); };

try {
  await new Promise((r) => stub.listen(STUB_PORT, '127.0.0.1', r));
  // Its own process group, so the whole server (not just a wrapper) is
  // stopped at the end, even when a check fails.
  app = spawn('node_modules/.bin/next', ['start', '-p', String(APP_PORT)], {
    env: { ...process.env, MONGO_URI: process.env.MONGODB_URI, GEMINI_API_KEY: '', NODE_ENV: 'production' },
    stdio: ['ignore', 'ignore', 'inherit'],
    detached: true,
  });
  await waitFor(`http://127.0.0.1:${APP_PORT}/login`);

  for (const name of ['handleGetDashboardInsights', 'handleGetTaskSuggestions']) {
    const before = stubCalls.length;
    const none = await callAction(name);
    check(`${name}: no cookie → refused without asking the backend`, none.text.includes(UNAUTHORIZED_TEXT) && !none.text.includes('"success":true') && stubCalls.length === before, `status ${none.status}, body: ${none.text}`);

    const expired = await callAction(name, tokens.expired);
    check(`${name}: expired token → refused`, expired.text.includes(UNAUTHORIZED_TEXT) && !expired.text.includes('"success":true'), `status ${expired.status}, body: ${expired.text}`);

    for (const [label, token] of [['forged signature', tokens.forged], ['expired or revoked per backend', tokens.backendExpired], ['signed in, missing dashboard.view', tokens.noPermission]]) {
      const mark = stubCalls.length;
      const r = await callAction(name, token);
      const askedBackend = stubCalls.slice(mark).some((c) => c.token === token);
      check(`${name}: ${label} → refused`, r.text.includes(UNAUTHORIZED_TEXT) && !r.text.includes('"success":true') && askedBackend, `status ${r.status}, asked backend: ${askedBackend}, body: ${r.text}`);
    }

    const ok = await callAction(name, tokens.authorized);
    check(`${name}: authorized → runs`, ok.text.includes('"success":true') && !ok.text.includes(UNAUTHORIZED_TEXT), `status ${ok.status}, body: ${ok.text}`);
  }

  // Tag suggestions need courses.manage. Only refusals are checked: the
  // authorized case would make a real (paid) AI call.
  const tagArgs = JSON.stringify([{ title: 'x', description: 'y' }]);
  for (const [label, token] of [['no cookie', undefined], ['signed in with dashboard.view only', tokens.authorized]]) {
    const res = await fetch(`http://127.0.0.1:${APP_PORT}/dashboard`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Next-Action': actionId('handleSuggestTags'), 'Content-Type': 'text/plain;charset=UTF-8', Accept: 'text/x-component', ...(token ? { Cookie: `admin_token=${token}` } : {}) },
      body: tagArgs,
      signal: AbortSignal.timeout(60_000),
    });
    const text = await res.text();
    check(`handleSuggestTags: ${label} → refused`, text.includes(UNAUTHORIZED_TEXT) && !text.includes('"success":true'), `status ${res.status}, body: ${text}`);
  }
} catch (err) {
  check('script ran to the end', false, err?.message || String(err));
} finally {
  if (app?.pid) { try { process.kill(-app.pid, 'SIGKILL'); } catch { /* already gone */ } }
  stub.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
