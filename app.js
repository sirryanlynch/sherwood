/* =========================================================
   CONFIG — the single place to connect a real backend.
   Set FORM_ENDPOINT to a Formspree URL (e.g. "https://formspree.io/f/xxxx")
   or your own API. Leave "" to store submissions in localStorage only.
   ========================================================= */
const FORM_ENDPOINT = "";

function store(kind, data){
  const key = "fairbase_" + kind;
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
document.querySelectorAll("form[data-kind]").forEach(form=>{
  form.noValidate = true;
  form.addEventListener("submit", async e=>{
    e.preventDefault();
    if(!validate(form)) return;
    const data = Object.fromEntries(new FormData(form).entries());
    form.querySelectorAll("input[type=checkbox]").forEach(c=>data[c.name]=c.checked);
    const kind = form.dataset.kind;
    const btn = form.querySelector("button[type=submit]"); btn.disabled = true;
    const sent = await send(kind, data);
    if(kind==="check"){
      sessionStorage.setItem("fairbase_check", JSON.stringify(data));
      location.href = "results.html"; return;
    }
    form.outerHTML = `<div class="ok" role="status"><b>Received.</b> ${form.dataset.thanks || "We'll be in touch by email."}${sent?"":" (Saved on this device; we couldn't reach the server — please try again later.)"}</div>`;
  });
});
/* Results page: show the address they entered and prefill intake */
const chk = JSON.parse(sessionStorage.getItem("fairbase_check") || "null");
document.querySelectorAll("[data-fill=address]").forEach(el=>{ if(chk) el.textContent = chk.address; });
document.querySelectorAll("input[name=address],input[name=email]").forEach(el=>{ if(chk && !el.value && el.closest("form[data-kind=intake]")) el.value = chk[el.name]||""; });
