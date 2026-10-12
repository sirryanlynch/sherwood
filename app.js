/* =========================================================
   CONFIG — the single place to connect a real backend.
   Set FORM_ENDPOINT to a Formspree URL (e.g. "https://formspree.io/f/xxxx")
   or your own API. Leave "" to store submissions in localStorage only.
   ========================================================= */
const FORM_ENDPOINT = "";
const GEO_KEY = "sherwood_geo";
const LAUNCH_COUNTY = "Santa Cruz County";
/* Cities IP lookup commonly returns inside the launch county. */
const LAUNCH_CITIES = new Set([
  "santa cruz","watsonville","scotts valley","capitola","aptos","soquel",
  "felton","boulder creek","ben lomond","live oak","la selva beach",
  "rio del mar","davenport","bonny doon","mount hermon","brookdale",
  "corralitos","freedom","interlaken","amesti","pleasure point","seacliff",
  "twin lakes","pasatiempo","zayante"
]);
const GEO_FALLBACKS = {city:"your area", region:"your state", county:"your county", area:"your area"};

function store(kind, data){
  const key = "sherwood_" + kind;
  const all = JSON.parse(localStorage.getItem(key) || "[]");
  all.push({...data, submittedAt: new Date().toISOString()});
  localStorage.setItem(key, JSON.stringify(all));
}
async function send(kind, data){
  store(kind, data);
  if (!FORM_ENDPOINT) return true;
  try{
    const r = await fetch(FORM_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({form:kind,...data})});
    return r.ok;
  }catch(e){ return false; }
}
function validate(form){
  let ok = true;
  form.querySelectorAll(".err").forEach(e=>e.remove());
  form.querySelectorAll("[required],[type=email],[pattern]").forEach(el=>{
    el.classList.remove("invalid");
    if(!el.checkValidity()){
      ok=false; el.classList.add("invalid");
      const m=document.createElement("div"); m.className="err";
      m.textContent = el.dataset.msg || el.validationMessage;
      (el.closest("label")||el).after(m);
    }
  });
  if(!ok){ const f=form.querySelector(".invalid"); f && f.focus(); }
  return ok;
}

function norm(s){ return String(s || "").trim().toLowerCase().replace(/\s+/g, " "); }
function isLaunchArea(g){
  const country = norm(g.countryCode || g.country);
  const inUS = country === "us" || country === "usa" || country === "united states";
  if (!inUS) return false;
  const region = norm(g.region);
  const code = norm(g.regionCode);
  if (region !== "california" && code !== "ca") return false;
  if (norm(g.county).includes("santa cruz")) return true;
  return LAUNCH_CITIES.has(norm(g.city));
}
function emptyGeo(){
  return {ok:false, city:"", region:"", regionCode:"", country:"", countryCode:"", county:"", launchArea:null};
}
function normalizeGeo(raw){
  const geo = {
    ok:true,
    city: String(raw.city || "").trim(),
    region: String(raw.region || "").trim(),
    regionCode: String(raw.regionCode || "").trim(),
    country: String(raw.country || "").trim(),
    countryCode: String(raw.countryCode || "").trim(),
    county: String(raw.county || "").trim(),
    launchArea: false
  };
  geo.launchArea = isLaunchArea(geo);
  if (geo.launchArea) geo.county = LAUNCH_COUNTY;
  return geo;
}
function readGeoCache(){
  try{
    const geo = JSON.parse(sessionStorage.getItem(GEO_KEY) || "null");
    if (!geo || typeof geo.ok !== "boolean") return null;
    return geo;
  }catch(e){ return null; }
}
async function fetchJson(url){
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try{
    const r = await fetch(url, {headers:{Accept:"application/json"}, signal:ctrl.signal});
    if (!r.ok) return null;
    return await r.json();
  }catch(e){ return null; }
  finally{ clearTimeout(timer); }
}
async function lookupGeo(){
  const ipapi = await fetchJson("https://ipapi.co/json/");
  if (ipapi && !ipapi.error && (ipapi.city || ipapi.region)){
    return {
      city: ipapi.city, region: ipapi.region, regionCode: ipapi.region_code,
      country: ipapi.country_name || ipapi.country, countryCode: ipapi.country,
      county: ipapi.county
    };
  }
  const geojs = await fetchJson("https://get.geojs.io/v1/ip/geo.json");
  if (geojs && !geojs.error && (geojs.city || geojs.region)){
    return {
      city: geojs.city, region: geojs.region, regionCode: geojs.region_code,
      country: geojs.country, countryCode: geojs.country_code, county: geojs.county
    };
  }
  return null;
}
function applyGeo(geo){
  const values = geo.ok ? {
    city: geo.city || GEO_FALLBACKS.city,
    region: geo.region || GEO_FALLBACKS.region,
    county: geo.county || GEO_FALLBACKS.county,
    area: geo.city || GEO_FALLBACKS.area
  } : GEO_FALLBACKS;
  document.querySelectorAll("[data-geo]").forEach(el => {
    const key = el.getAttribute("data-geo");
    if (values[key]) el.textContent = values[key];
  });
  const showNote = geo.ok === true && geo.launchArea === false;
  document.querySelectorAll("[data-launch-note]").forEach(el => { el.hidden = !showNote; });
}
let geoPromise;
function initGeo(){
  if (!geoPromise) geoPromise = (async () => {
    const cached = readGeoCache();
    if (cached){ applyGeo(cached); return cached; }
    let geo = emptyGeo();
    try{
      const raw = await lookupGeo();
      if (raw) geo = normalizeGeo(raw);
    }catch(e){ geo = emptyGeo(); }
    try{ sessionStorage.setItem(GEO_KEY, JSON.stringify(geo)); }catch(e){}
    applyGeo(geo);
    return geo;
  })();
  return geoPromise;
}
function geoFields(geo){
  if (!geo || !geo.ok) return {};
  return {
    geoCity: geo.city || "",
    geoRegion: geo.region || "",
    geoCountry: geo.country || "",
    inLaunchArea: geo.launchArea === true
  };
}

document.querySelectorAll("form[data-kind]").forEach(form=>{
  form.noValidate = true;
  form.addEventListener("submit", async e=>{
    e.preventDefault();
    if(!validate(form)) return;
    const data = Object.fromEntries(new FormData(form).entries());
    form.querySelectorAll("input[type=checkbox]").forEach(c=>data[c.name]=c.checked);
    const kind = form.dataset.kind;
    const btn = form.querySelector("button[type=submit]"); btn.disabled = true;
    const geo = await initGeo();
    Object.assign(data, geoFields(geo));
    const sent = await send(kind, data);
    if(kind==="check"){
      sessionStorage.setItem("sherwood_check", JSON.stringify(data));
      location.href = "results.html"; return;
    }
    form.outerHTML = `<div class="ok" role="status"><b>Received.</b> ${form.dataset.thanks || "We'll be in touch by email."}${sent?"":" (Saved on this device; we couldn't reach the server — please try again later.)"}</div>`;
  });
});
/* Results page: show the address they entered and prefill intake */
const chk = JSON.parse(sessionStorage.getItem("sherwood_check") || "null");
document.querySelectorAll("[data-fill=address]").forEach(el=>{ if(chk) el.textContent = chk.address; });
document.querySelectorAll("input[name=address],input[name=email]").forEach(el=>{ if(chk && !el.value && el.closest("form[data-kind=intake]")) el.value = chk[el.name]||""; });
initGeo();
