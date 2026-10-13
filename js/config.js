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
  SHOW_199_PLUS_COUNTY_FEE: false
};

export function backendEnabled() {
  return Boolean(CONFIG.FUNCTIONS_BASE_URL && String(CONFIG.FUNCTIONS_BASE_URL).trim());
}

export function functionsUrl(name) {
  return `${String(CONFIG.FUNCTIONS_BASE_URL).replace(/\/$/, "")}/${name}`;
}
