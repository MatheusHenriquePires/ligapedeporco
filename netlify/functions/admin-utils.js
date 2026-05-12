function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

function splitList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeIp(ip) {
  return String(ip || "")
    .trim()
    .replace(/^::ffff:/, "")
    .replace(/^\[/, "")
    .replace(/\]$/, "");
}

function getClientIp(event) {
  const headers = event.headers || {};
  const direct =
    headers["x-nf-client-connection-ip"] ||
    headers["client-ip"] ||
    headers["x-real-ip"] ||
    "";
  const forwarded = headers["x-forwarded-for"] || "";
  return normalizeIp(direct || forwarded.split(",")[0]);
}

function ipv4ToNumber(ip) {
  const parts = String(ip).split(".");
  if (parts.length !== 4) return null;
  return parts.reduce((acc, part) => {
    const value = Number(part);
    if (!Number.isInteger(value) || value < 0 || value > 255) return null;
    return acc * 256 + value;
  }, 0);
}

function matchesCidr(ip, rule) {
  const [rangeIp, prefixRaw] = rule.split("/");
  const prefix = Number(prefixRaw);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;

  const client = ipv4ToNumber(ip);
  const range = ipv4ToNumber(rangeIp);
  if (client === null || range === null) return false;

  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (client & mask) === (range & mask);
}

function isAllowedIp(ip) {
  const allowedIps = splitList(process.env.ADMIN_ALLOWED_IPS);
  if (!allowedIps.length) return false;
  return allowedIps.some((rule) => {
    if (rule === "*") return true;
    if (rule.includes("/")) return matchesCidr(ip, rule);
    return normalizeIp(rule) === ip;
  });
}

function getToken(event) {
  const headers = event.headers || {};
  const auth = headers.authorization || headers.Authorization || "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return headers["x-admin-token"] || headers["X-Admin-Token"] || "";
}

function validateAdmin(event) {
  const configuredToken = process.env.ADMIN_ACCESS_TOKEN || "";
  const token = getToken(event);
  const ip = getClientIp(event);

  if (!configuredToken) {
    return { ok: false, statusCode: 500, ip, reason: "ADMIN_ACCESS_TOKEN ausente" };
  }

  if (!token || token !== configuredToken) {
    return { ok: false, statusCode: 401, ip, reason: "Token admin inválido" };
  }

  if (!isAllowedIp(ip)) {
    return { ok: false, statusCode: 403, ip, reason: "IP não autorizado" };
  }

  return { ok: true, statusCode: 200, ip };
}

module.exports = {
  json,
  validateAdmin,
};
