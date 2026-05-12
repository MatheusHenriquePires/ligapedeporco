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

function getToken(event) {
  const headers = event.headers || {};
  const auth = headers.authorization || headers.Authorization || "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return headers["x-admin-token"] || headers["X-Admin-Token"] || "";
}

function validateAdmin(event) {
  const configuredToken = process.env.ADMIN_ACCESS_TOKEN || "";
  const token = getToken(event);

  if (!configuredToken) {
    return { ok: false, statusCode: 500, reason: "ADMIN_ACCESS_TOKEN ausente" };
  }

  if (!token || token !== configuredToken) {
    return { ok: false, statusCode: 401, reason: "Token admin inválido" };
  }

  return { ok: true, statusCode: 200 };
}

module.exports = {
  json,
  validateAdmin,
};
