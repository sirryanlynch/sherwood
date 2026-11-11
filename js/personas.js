const KEY = "sherwood_persona";

/* ?for=parent and ?for=portfolio are doors into the same free check. */
export function personaFromSearch(search) {
  const raw = String(search || "");
  const params = new URLSearchParams(raw.startsWith("?") ? raw.slice(1) : raw);
  const value = String(params.get("for") || "").toLowerCase();
  if (value === "parent" || value === "family") return "family";
  if (value === "portfolio") return "portfolio";
  return "home";
}

export function rememberPersona(search) {
  const raw = String(search || "");
  const params = new URLSearchParams(raw.startsWith("?") ? raw.slice(1) : raw);
  if (!params.has("for")) return currentPersona();
  const id = personaFromSearch(raw);
  try { sessionStorage.setItem(KEY, id); } catch (e) { /* this browser only */ }
  return id;
}

export function currentPersona() {
  try {
    const id = sessionStorage.getItem(KEY);
    if (id === "family" || id === "portfolio") return id;
  } catch (e) { /* ignore */ }
  return "home";
}

export const DOOR_COPY = {
  home: {
    eyebrowLaunch: "Santa Cruz County homeowners",
    eyebrowOther: "Homeowners",
    note: ""
  },
  family: {
    eyebrowLaunch: "For a parent or relative",
    eyebrowOther: "For a parent or relative",
    note: "You're checking for a parent or relative. The owner, or their legal representative, signs the authorization before we file anything. If you hold a power of attorney or a conservatorship, upload it and a person checks it before filing. You both get every email."
  },
  portfolio: {
    eyebrowLaunch: "More than one property",
    eyebrowOther: "More than one property",
    note: "Run a free check on each parcel. We file it is $249 per parcel in Santa Cruz County, and the monitor is $49/yr per parcel. There is no bulk price, and this page does not take a portfolio payment."
  }
};
