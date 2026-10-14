/* Leave FUNCTIONS_BASE_URL empty on GitHub Pages. The check then keeps
   using this browser. Set it to the Cloud Functions origin after Firebase
   is deployed, with no trailing path, for example
   https://us-central1-YOUR_PROJECT.cloudfunctions.net */
export const CONFIG = {
  FIREBASE: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    appId: ""
  },
  FUNCTIONS_BASE_URL: "",
  /* Display only. Off keeps Santa Cruz at $249 with the county fee included.
     On switches We file it to $199 plus the county fee. Do not turn this on
     until the attorney clears that price. */
  SHOW_199_PLUS_COUNTY_FEE: false,
  /* False removes the DIY kit from checkout, pricing, and every county offer, including Los Angeles. */
  DIY_ENABLED: false,
  /* Last calendar day a Santa Cruz We file it order is accepted. Inclusive.
     Other counties close orders 5 days before regular_window.end. */
  order_cutoff: "2026-11-25",
  /* One flag per unlisted test county. False keeps We file it orders off
     on that landing even after the county file is verified. */
  LANDING_DFY: {
    san_diego: false,
    san_mateo: false,
    santa_barbara: false
  },
  /* True keeps the boxed disclosure above the header when the first-touch
     src is postcard-*, social, or search. Other visits get the dialog only. */
  DISCLOSURE_TOP_FOR_CAMPAIGN: true
};

export function backendEnabled() {
  return Boolean(CONFIG.FUNCTIONS_BASE_URL && String(CONFIG.FUNCTIONS_BASE_URL).trim());
}

export function functionsUrl(name) {
  return `${String(CONFIG.FUNCTIONS_BASE_URL).replace(/\/$/, "")}/${name}`;
}
