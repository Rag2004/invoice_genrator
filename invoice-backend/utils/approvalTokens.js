const crypto = require('crypto');

const USED_NONCES = new Set();

function base64urlEncode(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64urlDecode(str) {
  const padded = String(str)
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(str.length / 4) * 4, '=');
  return Buffer.from(padded, 'base64').toString('utf8');
}

function getSigningKey() {
  const key = process.env.ADMIN_API_KEY;
  if (!key) {
    throw new Error('ADMIN_API_KEY is required for approval tokens');
  }
  return String(key);
}

function sign(payloadB64) {
  const key = getSigningKey();
  return crypto.createHmac('sha256', key).update(payloadB64).digest('base64url');
}

function timingSafeEqualStr(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function createApprovalToken({ invoiceId, action, ttlMs = 48 * 60 * 60 * 1000 }) {
  if (!invoiceId) throw new Error('invoiceId required');
  if (action !== 'approve' && action !== 'reject') throw new Error('invalid action');

  const now = Date.now();
  const exp = now + Number(ttlMs || 0);
  const nonce = crypto.randomBytes(16).toString('hex');

  const payload = { invoiceId: String(invoiceId), action, exp, nonce };
  const payloadB64 = base64urlEncode(JSON.stringify(payload));
  const sig = sign(payloadB64);
  return `${payloadB64}.${sig}`;
}

function verifyApprovalToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return { ok: false, error: 'invalid_token' };
  }

  const [payloadB64, sig] = token.split('.', 2);
  if (!payloadB64 || !sig) return { ok: false, error: 'invalid_token' };

  try {
    const expected = sign(payloadB64);
    if (!timingSafeEqualStr(sig, expected)) {
      return { ok: false, error: 'invalid_signature' };
    }

    const payloadJson = base64urlDecode(payloadB64);
    const payload = JSON.parse(payloadJson);

    if (!payload || !payload.invoiceId || !payload.action || !payload.exp || !payload.nonce) {
      return { ok: false, error: 'invalid_payload' };
    }

    if (payload.action !== 'approve' && payload.action !== 'reject') {
      return { ok: false, error: 'invalid_action' };
    }

    if (Number(payload.exp) < Date.now()) {
      return { ok: false, error: 'expired' };
    }

    if (USED_NONCES.has(payload.nonce)) {
      return { ok: false, error: 'used' };
    }

    return { ok: true, payload };
  } catch (e) {
    return { ok: false, error: 'invalid_token' };
  }
}

function markTokenUsed(nonce) {
  if (!nonce) return;
  USED_NONCES.add(String(nonce));
}

module.exports = {
  createApprovalToken,
  verifyApprovalToken,
  markTokenUsed,
};

