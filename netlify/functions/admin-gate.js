const { json, validateAdmin } = require("./admin-utils");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return json(405, { ok: false, error: "Metodo nao permitido" });
  }

  const auth = validateAdmin(event);
  if (!auth.ok) {
    return json(auth.statusCode, { ok: false, error: auth.reason });
  }

  return json(200, { ok: true });
};
