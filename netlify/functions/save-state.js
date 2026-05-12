const { json, validateAdmin } = require("./admin-utils");

const SUPABASE_TABLE = "league_state";
const SUPABASE_ROW_ID = "main";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Metodo nao permitido" });
  }

  const auth = validateAdmin(event);
  if (!auth.ok) {
    return json(auth.statusCode, { ok: false, error: auth.reason });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !serviceKey) {
    return json(500, { ok: false, error: "Supabase service key ausente" });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (err) {
    return json(400, { ok: false, error: "JSON invalido" });
  }

  if (!payload || typeof payload.data !== "object" || Array.isArray(payload.data)) {
    return json(400, { ok: false, error: "Estado da liga invalido" });
  }

  const response = await fetch(
    `${supabaseUrl.replace(/\/$/, "")}/rest/v1/${SUPABASE_TABLE}?on_conflict=id`,
    {
      method: "POST",
      headers: {
        apikey: serviceKey,
        authorization: `Bearer ${serviceKey}`,
        "content-type": "application/json",
        prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        id: SUPABASE_ROW_ID,
        data: payload.data,
        updated_at: new Date().toISOString(),
      }),
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    return json(response.status, { ok: false, error: "Falha ao salvar no Supabase", detail });
  }

  return json(200, { ok: true });
};
