/**
 * Coffre du MJ : chiffrement des informations secrètes (Aléas, révélations, objectifs de Quête,
 * séquelles et pénitences non encore communiquées).
 *
 * Foundry transmet toutes les données des documents à tous les clients : un secret écrit en clair
 * sur un acteur serait lisible par un joueur. Les secrets sont donc chiffrés (AES-GCM 256 bits)
 * avec une clé que seuls les MJ possèdent (réglage local du navigateur du MJ). Les joueurs ne
 * reçoivent qu'un texte chiffré.
 *
 * Module pur : WebCrypto (navigateur, Node 20+).
 */
const sub = () => globalThis.crypto?.subtle;

const versB64 = bytes => {
  let s = "";
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s);
};
const depuisB64 = txt => Uint8Array.from(atob(txt), c => c.charCodeAt(0));

/** Nouvelle clé, exportée en base64 (à conserver par le MJ). */
export async function genererCle() {
  const cle = await sub().generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  return versB64(await sub().exportKey("raw", cle));
}

async function importer(cleB64) {
  if (!cleB64) throw new Error("Clé du coffre absente.");
  const brut = depuisB64(cleB64);
  if (brut.length !== 32) throw new Error("Clé du coffre invalide.");
  return sub().importKey("raw", brut, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

/** Empreinte courte de la clé (pour vérifier que deux MJ ont la même), sans révéler la clé. */
export async function empreinte(cleB64) {
  const h = await sub().digest("SHA-256", depuisB64(cleB64));
  return versB64(h).slice(0, 10);
}

/**
 * Chiffre une donnée JSON.
 * @returns {Promise<string>}  « v1.<iv>.<données> » en base64
 */
export async function chiffrer(donnees, cleB64) {
  const cle = await importer(cleB64);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const clair = new TextEncoder().encode(JSON.stringify(donnees));
  const chiffre = await sub().encrypt({ name: "AES-GCM", iv }, cle, clair);
  return `v1.${versB64(iv)}.${versB64(chiffre)}`;
}

/** Déchiffre une donnée produite par `chiffrer` (erreur si la clé ne correspond pas). */
export async function dechiffrer(texte, cleB64) {
  if (!texte) return null;
  const [version, iv, donnees] = String(texte).split(".");
  if (version !== "v1" || !iv || !donnees) throw new Error("Format de coffre inconnu.");
  const cle = await importer(cleB64);
  const clair = await sub().decrypt({ name: "AES-GCM", iv: depuisB64(iv) }, cle, depuisB64(donnees));
  return JSON.parse(new TextDecoder().decode(clair));
}
