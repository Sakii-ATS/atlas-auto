// Accès au Google Sheet avec le compte de service (sa clé JSON est dans le secret GOOGLE_JSON).

const b64url = octets => btoa(String.fromCharCode(...new Uint8Array(octets))).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
const texte = s => new TextEncoder().encode(s);

let jeton = null; // gardé tant que le Worker reste en mémoire, pour ne pas en redemander un à chaque minute

async function accessToken(env) {
  if (jeton && jeton.expire > Date.now() + 60_000) return jeton.valeur;
  const cle = JSON.parse(env.GOOGLE_JSON);
  const t = Math.floor(Date.now() / 1000);
  const partie = o => b64url(texte(JSON.stringify(o)));
  const corps = `${partie({ alg: "RS256", typ: "JWT" })}.${partie({
    iss: cle.client_email, scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token", iat: t, exp: t + 3600,
  })}`;
  const der = Uint8Array.from(atob(cle.private_key.replace(/-----[^-]+-----|\s/g, "")), c => c.charCodeAt(0));
  const k = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", k, texte(corps));
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${corps}.${b64url(signature)}`,
  });
  if (!r.ok) throw new Error(`Google refuse la clé (${r.status}) : ${await r.text()}`);
  const { access_token, expires_in } = await r.json();
  jeton = { valeur: access_token, expire: Date.now() + expires_in * 1000 };
  return access_token;
}

// Identifiant du tableau, même si c'est le lien entier qui a été collé (ou avec des espaces autour)
export const idTableau = valeur => String(valeur ?? "").match(/\/d\/([\w-]+)/)?.[1] ?? String(valeur ?? "").trim();

export function google(env) {
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${idTableau(env.SHEET_ID)}`;
  async function appel(chemin, corps) {
    const r = await fetch(base + chemin, {
      method: corps ? "POST" : "GET",
      headers: { authorization: `Bearer ${await accessToken(env)}`, "content-type": "application/json" },
      body: corps && JSON.stringify(corps),
    });
    if (!r.ok) {
      const msg = await r.text();
      const e = new Error(r.status === 404
        ? "Google ne trouve pas le tableau : vérifie le secret SHEET_ID dans Cloudflare (la partie entre /d/ et /edit du lien de la copie)."
        : `Google Sheets ${r.status} : ${msg}`);
      e.ongletManquant = r.status === 400 && msg.includes("Unable to parse range");
      throw e;
    }
    return r.json();
  }
  return {
    lire: async plages => (await appel(`/values:batchGet?valueRenderOption=UNFORMATTED_VALUE&${plages.map(p => "ranges=" + encodeURIComponent(p)).join("&")}`)).valueRanges.map(v => v.values || []),
    vider: plages => appel("/values:batchClear", { ranges: plages }),
    ecrire: data => appel("/values:batchUpdate", { valueInputOption: "RAW", data }),
    onglets: async () => (await appel("?fields=sheets.properties(sheetId,title)")).sheets.map(s => s.properties),
    modifier: requests => appel(":batchUpdate", { requests }),
  };
}

export const q = nom => `'${nom.replace(/'/g, "''")}'`;
