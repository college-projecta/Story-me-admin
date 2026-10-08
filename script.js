const API="https://story-me-me-fd43.vercel.app";
let token="",providers=[],selected="",routes=[],currentPage="overview",health=null,editingProvider=null;

const $=id=>document.getElementById(id);
const navItems=[
 ["overview","Overview","◈","CORE"],["ai-providers","AI Providers","AI","AI"],["models","Models","M","AI"],["task-routing","Task Routing","⇄","AI"],["ai-health","AI Health","♥","AI"],
 ["stories","Stories","S","CONTENT"],["scenes","Scenes","⌂","CONTENT"],["characters","Characters","C","CONTENT"],["voice","Voice","V","MEDIA"],["images","Images","I","MEDIA"],["users","Users","U","PLATFORM"],["analytics","Analytics","A","PLATFORM"],["system","System","⚙","SYSTEM"],["security","Security","◇","SYSTEM"],["logs","Logs","≡","SYSTEM"],["settings","Settings","☷","SYSTEM"]
];
const pageMeta={
 overview:["Overview","Platform operational overview"],"ai-providers":["AI Providers","Manage provider availability and configuration"],"api-keys":["API Keys","Manage encrypted provider key metadata"],models:["Models","Manage models available to the router"],"task-routing":["Task Routing","Configure task-to-provider fallback order"],"ai-health":["AI Health","Provider configuration and runtime health"],
 stories:["Stories","Story lifecycle and publishing control"],scenes:["Scenes","Reusable visual scene library"],characters:["Characters","Character and relationship control"],voice:["Voice","TTS providers and voice configuration"],images:["Images","Image providers and visual generation"],users:["Users","Safe user and session administration"],analytics:["Analytics","Usage, decisions and retention"],system:["System","Runtime settings and feature controls"],security:["Security","Safety and security configuration"],logs:["Logs","Structured operational and audit logs"],settings:["Settings","Admin control center settings"]
};
const taskNames=["Dialogue","Story/Branch Reasoning","Intent Detection","Emotion","Character Expression","Movement","Positioning","Scene Selection","Memory Summary","Hint Generation","Safety","Voice / TTS","Speech-to-Text","Image Generation","Story Analysis"];

function flash(button){if(!button)return;button.classList.remove("clicked");void button.offsetWidth;button.classList.add("clicked");setTimeout(()=>button.classList.remove("clicked"),700)}
function actionState(button,text){if(!button)return;button.dataset.originalText=button.dataset.originalText||button.textContent;button.textContent=text;button.disabled=true}
function restoreState(button){if(!button)return;button.textContent=button.dataset.originalText||button.textContent;delete button.dataset.originalText;button.disabled=false}
function message(text,error=false){$("msg").textContent=text||"";$("msg").className=error?"global-msg error":"global-msg muted"}
function setFormMessage(id,text,error=false){const el=$(id);el.textContent=text||"";el.className=error?"status-text error":"status-text"}
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function providerKey(p){return p?.keys?.[0]||null}
function providerModel(p){return p?.models?.[0]||""}

async function api(path,opts={}){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
 try{
   const r=await fetch(API+path,{...opts,signal:controller.signal,headers:{...(opts.headers||{}),Authorization:"Bearer "+token,"Content-Type":"application/json"}});
   const d=await r.json().catch(()=>({}));
   if(!r.ok){
     if(r.status===401)throw new Error("Admin token rejected by the STORY ME backend (401).");
     if(r.status===403)throw new Error("Admin request blocked by CORS (403).");
     throw new Error(d.error||("Request failed ("+r.status+")"));
   }
   return d;
 }catch(e){
   if(e?.name==="AbortError")throw new Error("Admin backend request timed out.");
   if(e instanceof TypeError)throw new Error("Could not reach the Admin backend. Check CORS/deployment.");
   throw e
 }finally{clearTimeout(timeout)}
}

function buildNav(){
 const nav=$("nav");let group="";nav.innerHTML="";
 navItems.forEach(([id,label,icon,g])=>{
   if(g!==group){group=g;const d=document.createElement("div");d.className="nav-group";d.textContent=g;nav.appendChild(d)}
   const b=document.createElement("button");b.className="nav-btn";b.dataset.page=id;b.innerHTML='<span class="nav-icon">'+icon+'</span><span>'+label+'</span>';b.onclick=()=>navigate(id,b);nav.appendChild(b);
 });
}
function navigate(id,button){
 flash(button);currentPage=id;message("");closeProviderMenu();
 document.querySelectorAll(".page").forEach(p=>p.hidden=true);
 const page=$("page-"+id)||$("page-module");page.hidden=false;
 document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.page===id));
 $("pageTitle").textContent=pageMeta[id]?.[0]||"Module";$("pageSubtitle").textContent=pageMeta[id]?.[1]||"STORY ME operational module";
 if(id==="overview")renderOverview();if(id==="ai-providers")renderProviders();if(id==="api-keys")renderAllKeys();if(id==="models")renderAllModels();if(id==="task-routing")renderRoutes();if(id==="ai-health")renderHealth();
 if(!["overview","ai-providers","api-keys","models","task-routing","ai-health"].includes(id))renderUnavailable(id);
}
function renderUnavailable(id){
 const meta=pageMeta[id]||[id,""];
 $("page-module").innerHTML='<div class="card module-card"><div class="module-orb">'+escapeHtml((meta[0]||"M").slice(0,1))+'</div><h2>'+escapeHtml(meta[0])+'</h2><p class="muted">This module is part of the STORY ME Control Center architecture, but its production backend endpoint is not connected yet.</p><div class="module-list"><div class="module-item">No fake data is displayed.</div><div class="module-item">No fake action buttons are provided.</div><div class="module-item">Next implementation step: connect the corresponding Supabase schema and secure Admin API.</div></div></div>';
}

function renderOverview(){
 const active=providers.filter(p=>p.enabled).length,keys=providers.reduce((n,p)=>n+(p.keyCount||0),0),models=providers.reduce((n,p)=>n+(p.models?.length||0),0);
 const db=health?.database?.status||"checking",router=health?.aiRouter?.status||"checking",backend=health?.backend?.status||"checking";
 const max=Math.max(keys,models,providers.length,1);
 const bars=[["Providers",providers.length],["Keys",keys],["Models",models],["Routes",routes.length]].map(([label,val])=>'<div class="metric-row"><div class="metric-label"><span>'+label+'</span><b>'+val+'</b></div><div class="metric-track"><i style="width:'+Math.round((val/max)*100)+'%"></i></div></div>').join("");
 $("page-overview").innerHTML=
 '<div class="hero-card"><div><div class="eyebrow">STORY ME / AI OPERATIONS</div><h2>Build your intelligent provider pool.</h2><p>Connect AI providers, keep credentials encrypted, and control the model layer from one secure workspace.</p><div class="hero-actions"><button class="primary" id="heroAddProvider">＋ Add API Key</button><button class="ghost" id="heroProviders">View Providers</button></div></div><div class="hero-visual"><div class="orb orb-a"></div><div class="orb orb-b"></div><div class="hero-grid"></div><div class="hero-chip">SECURE ROUTER</div></div></div>'+
 '<div class="kpi-grid"><div class="card kpi accent"><div class="label">CONFIGURED PROVIDERS</div><div class="value">'+providers.length+'</div><div class="sub">'+active+' enabled</div></div><div class="card kpi"><div class="label">ACTIVE API KEYS</div><div class="value">'+keys+'</div><div class="sub">Encrypted metadata only</div></div><div class="card kpi"><div class="label">ACTIVE MODELS</div><div class="value">'+models+'</div><div class="sub">Attached to providers</div></div><div class="card kpi"><div class="label">TASK ROUTES</div><div class="value">'+routes.length+'</div><div class="sub">Saved router rules</div></div></div>'+
 '<div class="dashboard-grid"><section class="card card-pad"><div class="card-title-row"><div><div class="eyebrow">CONFIGURATION MIX</div><h3>AI pool at a glance</h3></div><span class="mini-badge">LIVE DATA</span></div><div class="metric-chart">'+bars+'</div></section>'+
 '<section class="card card-pad"><div class="card-title-row"><div><div class="eyebrow">SYSTEM</div><h3>Operational status</h3></div></div><div class="status-list"><div class="status-item"><span>Backend API</span><span class="state '+(backend==="online"?"ok":"warn")+'">'+escapeHtml(backend.toUpperCase())+'</span></div><div class="status-item"><span>Database</span><span class="state '+(db==="connected"?"ok":"warn")+'">'+escapeHtml(db.toUpperCase())+'</span></div><div class="status-item"><span>AI Router</span><span class="state '+(router==="configured"?"ok":"warn")+'">'+escapeHtml(router.replaceAll("_"," ").toUpperCase())+'</span></div><div class="status-item"><span>Runtime telemetry</span><span class="state warn">NOT CONNECTED</span></div></div></section></div>'+
 '<div class="dashboard-grid"><section class="card card-pad"><div class="card-title-row"><div><div class="eyebrow">PROVIDER POOL</div><h3>Configured providers</h3></div><button class="text-btn" id="overviewProviders">Open pool →</button></div><div class="provider-mini-grid">'+(providers.length?providers.slice(0,6).map(p=>'<div class="provider-mini"><span class="provider-logo">'+escapeHtml(p.name.slice(0,1).toUpperCase())+'</span><div><b>'+escapeHtml(p.name)+'</b><small>'+escapeHtml(providerModel(p)||"Model not set")+'</small></div><span class="state '+(p.enabled?"ok":"warn")+'">'+(p.enabled?"ON":"OFF")+'</span></div>').join(""):'<div class="empty-inline"><span>✦</span><div><b>No AI providers yet</b><small>Add your first key to populate this pool.</small></div></div>')+'</div></section>'+
 '<section class="card card-pad"><div class="card-title-row"><div><div class="eyebrow">STORY ENGINE</div><h3>Backend modules</h3></div></div><div class="status-list"><div class="status-item"><span>Stories</span><span class="state warn">CONTENT API PENDING</span></div><div class="status-item"><span>Scenes</span><span class="state warn">CONTENT API PENDING</span></div><div class="status-item"><span>Characters</span><span class="state warn">CONTENT API PENDING</span></div><div class="status-item"><span>Users & sessions</span><span class="state warn">PLATFORM API PENDING</span></div></div></section></div>';
 $("heroAddProvider")?.addEventListener("click",openAddModal);$("heroProviders")?.addEventListener("click",()=>navigate("ai-providers",document.querySelector('[data-page="ai-providers"]')));$("overviewProviders")?.addEventListener("click",()=>navigate("ai-providers",document.querySelector('[data-page="ai-providers"]')));
}

function selectProvider(id,button){selected=id;renderProviders();flash(document.querySelector('[data-provider="'+CSS.escape(id)+'"]')||button);message("")}
function renderProviders(){
 const box=$("providers");$("providerCountBadge").textContent=String(providers.length);
 box.innerHTML=providers.length?providers.map(p=>{
   const k=providerKey(p),m=providerModel(p);
   return '<div class="provider-row"><button class="provider '+(p.id===selected?"selected":"")+'" data-provider="'+escapeHtml(p.id)+'"><span class="provider-logo">'+escapeHtml(p.name.slice(0,1).toUpperCase())+'</span><span class="provider-copy"><b>'+escapeHtml(p.name)+'</b><span>'+escapeHtml(m||"No model")+' · '+(p.keyCount||0)+' key</span></span><span class="provider-health '+(p.enabled?"online":"offline")+'"></span></button><button class="more-btn" data-more-provider="'+escapeHtml(p.id)+'" data-key-id="'+escapeHtml(k?.id||"")+'" aria-label="Provider actions">⋯</button></div>';
 }).join(""):'<div class="list-empty"><div class="empty-icon small">✦</div><b>No providers configured</b><span>Add an API key to create the first provider.</span></div>';
 document.querySelectorAll("[data-provider]").forEach(b=>b.onclick=()=>selectProvider(b.dataset.provider,b));
 document.querySelectorAll("[data-more-provider]").forEach(b=>b.onclick=e=>toggleProviderMenu(e.currentTarget));
 if(!selected&&providers[0])selected=providers[0].id;
 const p=providers.find(x=>x.id===selected);
 if(!p){$("providerPanel").hidden=true;$("providerEmpty").hidden=false;return}
 $("providerEmpty").hidden=true;$("providerPanel").hidden=false;$("providerTitle").textContent=p.name;
 $("providerMeta").textContent=(p.enabled?"Enabled":"Disabled")+" · "+(p.protocol||"openai compatible")+" · secure key-backed provider";
 $("providerPanel").innerHTML='<div class="detail-grid"><div class="detail-stat"><span>API key</span><b>••••••••'+escapeHtml(providerKey(p)?.id?.slice(0,4)||"")+'</b><small>Encrypted at rest</small></div><div class="detail-stat"><span>Primary model</span><b>'+escapeHtml(providerModel(p)||"—")+'</b><small>Active model</small></div><div class="detail-stat"><span>Provider state</span><b class="'+(p.enabled?"good":"bad")+'">'+(p.enabled?"ACTIVE":"DISABLED")+'</b><small>Router availability</small></div></div><div class="detail-section"><div class="card-title-row"><div><div class="eyebrow">SECURITY</div><h3>Credential protection</h3></div><span class="mini-badge">AES-GCM</span></div><p class="muted">The raw API key is never returned to this frontend. Update replaces the encrypted secret server-side.</p></div><div class="detail-section"><div class="card-title-row"><div><div class="eyebrow">MODEL</div><h3>'+escapeHtml(providerModel(p)||"No model configured")+'</h3></div><button class="ghost" id="detailUpdate">Update</button></div></div>';
 $("detailUpdate").onclick=()=>openUpdateModal(p);
}
function toggleProviderMenu(button){
 closeProviderMenu(button);
 const p=providers.find(x=>x.id===button.dataset.moreProvider);if(!p)return;
 const menu=document.createElement("div");menu.className="provider-menu";menu.dataset.providerMenu="true";
 menu.innerHTML='<button data-menu-update>Update</button><button class="danger-menu" data-menu-delete>Delete</button>';
 button.parentElement.appendChild(menu);
 menu.querySelector("[data-menu-update]").onclick=()=>{closeProviderMenu();openUpdateModal(p)};
 menu.querySelector("[data-menu-delete]").onclick=()=>{closeProviderMenu();deleteProvider(p,button.dataset.keyId)};
}
function closeProviderMenu(except){document.querySelectorAll("[data-provider-menu]").forEach(m=>{if(!except||!except.parentElement.contains(m))m.remove()})}
document.addEventListener("click",e=>{if(!e.target.closest(".more-btn")&&!e.target.closest("[data-provider-menu]"))closeProviderMenu()});

function openAddModal(){$("providerModal").hidden=false;setFormMessage("providerFormMsg","");$("providerForm").reset();$("providerName").focus()}
function closeAddModal(){$("providerModal").hidden=true}
function openUpdateModal(p){editingProvider=p;$("updateTitle").textContent="Update "+p.name;$("updateSubtitle").textContent="Replace the encrypted key or change the active model.";$("updateProviderName").value=p.name;$("updateApiKey").value="";$("updateModel").value=providerModel(p);setFormMessage("updateFormMsg","");$("updateModal").hidden=false;$("updateApiKey").focus()}
function closeUpdateModal(){editingProvider=null;$("updateModal").hidden=true}
document.querySelectorAll("[data-close-modal]").forEach(el=>el.onclick=closeAddModal);document.querySelectorAll("[data-close-update]").forEach(el=>el.onclick=closeUpdateModal);
$("addProviderBtn").onclick=openAddModal;$("emptyAddProvider").onclick=openAddModal;$("addKeyPageBtn").onclick=openAddModal;$("addModelPageBtn").onclick=()=>navigate("ai-providers",document.querySelector('[data-page="ai-providers"]'));

$("providerForm").onsubmit=async e=>{
 e.preventDefault();const button=$("providerSubmit"),provider=$("providerName").value.trim(),apiKey=$("providerApiKey").value.trim(),model=$("providerModel").value.trim();
 if(!provider||!apiKey||!model){setFormMessage("providerFormMsg","Provider name, API key and model are required.",true);return}
 actionState(button,"Encrypting & saving…");setFormMessage("providerFormMsg","Saving securely…");
 try{await api("/api/admin/ai/providers",{method:"POST",body:JSON.stringify({provider,apiKey,model})});closeAddModal();await refreshProviders();selected=slugifyClient(provider);renderProviders();message(provider+" connected securely.")}
 catch(e){setFormMessage("providerFormMsg",e.message,true)}finally{restoreState(button)}
};
$("updateForm").onsubmit=async e=>{
 e.preventDefault();if(!editingProvider)return;const button=$("updateSubmit"),apiKey=$("updateApiKey").value.trim(),model=$("updateModel").value.trim();
 if(!model){setFormMessage("updateFormMsg","Model name is required.",true);return}
 actionState(button,"Saving changes…");setFormMessage("updateFormMsg","Updating securely…");
 try{const id=editingProvider.id;await api("/api/admin/ai/providers",{method:"PUT",body:JSON.stringify({provider:id,apiKey:apiKey||undefined,model})});closeUpdateModal();selected=id;await refreshProviders();message("Provider updated securely.")}
 catch(e){setFormMessage("updateFormMsg",e.message,true)}finally{restoreState(button)}
};
function slugifyClient(v){return String(v).trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80)}
async function deleteProvider(p,keyId){
 if(!keyId){message("No active key is available for this provider.",true);return}
 if(!confirm("Delete the API key for "+p.name+"? The provider will disappear from the configured list until a new key is added."))return;
 try{await api("/api/admin/ai/providers",{method:"DELETE",body:JSON.stringify({provider:p.id,keyId})});if(selected===p.id)selected="";await refreshProviders();message(p.name+" API key deleted.")}
 catch(e){message(e.message,true)}
}
async function toggleProvider(id,button){
 const p=providers.find(x=>x.id===id);if(!p)return;flash(button);const next=!p.enabled;actionState(button,next?"Enabling…":"Disabling…");
 if(!confirm((next?"Enable ":"Disable ")+p.name+"?")){restoreState(button);return}
 try{await api("/api/admin/ai/providers",{method:"PATCH",body:JSON.stringify({provider:id,enabled:next})});await refreshProviders();message((next?"Enabled ":"Disabled ")+p.name)}
 catch(e){message(e.message,true)}finally{restoreState(button)}
}
async function addModel(button){
 flash(button);const v=$("newModel")?.value.trim();if(!selected){message("Select a provider first.",true);return}if(!v){message("Enter a model ID first.",true);return}
 actionState(button,"Saving…");try{await api("/api/admin/ai/models",{method:"POST",body:JSON.stringify({provider:selected,model:v})});if($("newModel"))$("newModel").value="";await refreshProviders();message("Model saved.")}catch(e){message(e.message,true)}finally{restoreState(button)}
}

function renderAllKeys(){
 const rows=providers.flatMap(p=>(p.keys||[]).map(k=>({provider:p.name,key:k,model:providerModel(p),providerId:p.id})));
 $("allKeys").innerHTML=rows.length?'<table class="data-table"><thead><tr><th>Provider</th><th>Credential</th><th>Model</th><th>Priority</th><th>Status</th><th></th></tr></thead><tbody>'+rows.map(x=>'<tr><td><div class="table-provider"><span class="provider-logo">'+escapeHtml(x.provider.slice(0,1).toUpperCase())+'</span><b>'+escapeHtml(x.provider)+'</b></div></td><td><span class="masked-key">••••••••'+escapeHtml(x.key.id.slice(0,6))+'</span><small>Encrypted server-side</small></td><td>'+escapeHtml(x.model||"—")+'</td><td>'+x.key.priority+'</td><td><span class="state ok">ENABLED</span></td><td><button class="ghost table-update" data-provider="'+escapeHtml(x.providerId)+'">Update</button></td></tr>').join("")+'</tbody></table>':'<div class="blank-panel"><div class="empty-icon">🔐</div><h3>No API keys yet</h3><p>Nothing is stored or displayed here until you add your first provider credential.</p><button class="primary" id="emptyKeyPageAdd">＋ Add API Key</button></div>';
 document.querySelectorAll(".table-update").forEach(b=>b.onclick=()=>{const p=providers.find(x=>x.id===b.dataset.provider);if(p)openUpdateModal(p)});$("emptyKeyPageAdd")?.addEventListener("click",openAddModal);
}
function renderAllModels(){
 const rows=providers.flatMap(p=>(p.models||[]).map(m=>({provider:p.name,model:m})));
 $("allModels").innerHTML=rows.length?'<table class="data-table"><thead><tr><th>Provider</th><th>Model</th><th>Status</th></tr></thead><tbody>'+rows.map(x=>'<tr><td>'+escapeHtml(x.provider)+'</td><td><span class="model-chip">'+escapeHtml(x.model)+'</span></td><td><span class="state ok">ACTIVE</span></td></tr>').join("")+'</tbody></table>':'<div class="blank-panel"><div class="empty-icon">◇</div><h3>No models configured</h3><p>Models appear automatically when you add a provider through the secure API Key form.</p><button class="primary" id="emptyModelAdd">＋ Add API Key</button></div>';
 $("emptyModelAdd")?.addEventListener("click",openAddModal);
}
function renderRoutes(){
 if(!providers.length){$("routes").innerHTML='<div class="blank-panel"><div class="empty-icon">⇄</div><h3>No providers available for routing</h3><p>Add an API key and model first. Provider options will appear here automatically.</p><button class="primary" id="emptyRouteAdd">＋ Add API Key</button></div>';$("emptyRouteAdd")?.addEventListener("click",openAddModal);return}
 const options=providers.map(p=>'<option value="'+escapeHtml(p.id)+'">'+escapeHtml(p.name)+'</option>').join("");
 $("routes").innerHTML=taskNames.map(task=>{const route=routes.find(r=>r.task===task)||{providers:[]};return '<section class="card route-card"><div class="route-head"><h3>'+escapeHtml(task)+'</h3><span class="state '+(route.enabled===false?"warn":"ok")+'">'+(route.enabled===false?"DISABLED":"ACTIVE")+'</span></div>'+[0,1,2].map((n)=>'<div class="route-slot"><label>'+(n===0?"PRIMARY":"FALLBACK #"+n)+'</label><select data-route-task="'+escapeHtml(task)+'" data-route-index="'+n+'"><option value="">Not configured</option>'+options+'</select></div>').join("")+'<div class="route-actions"><button class="save-route" data-route-task="'+escapeHtml(task)+'">Save Routing</button></div></section>'}).join("");
 document.querySelectorAll("select[data-route-task]").forEach(s=>{const r=routes.find(x=>x.task===s.dataset.routeTask);s.value=r?.providers?.[Number(s.dataset.routeIndex)]||""});document.querySelectorAll(".save-route").forEach(b=>b.onclick=()=>saveRoute(b.dataset.routeTask,b));
}
async function saveRoute(task,button){
 flash(button);actionState(button,"Saving…");try{const vals=[0,1,2].map(i=>document.querySelector('select[data-route-task="'+CSS.escape(task)+'"][data-route-index="'+i+'"]')?.value||"").filter(Boolean);await api("/api/admin/ai/routes",{method:"PUT",body:JSON.stringify({task,providers:vals})});await refreshProviders();message("Routing saved for "+task+".")}catch(e){message(e.message,true)}finally{restoreState(button)}
}
function renderHealth(){
 $("health").innerHTML=providers.map(p=>'<section class="card health-card"><div class="health-head"><span class="provider-logo">'+escapeHtml(p.name.slice(0,1).toUpperCase())+'</span><div><h3>'+escapeHtml(p.name)+'</h3><p class="muted">'+escapeHtml(providerModel(p)||"No model")+'</p></div><span class="state '+(p.enabled?"ok":"warn")+'">'+(p.enabled?"ACTIVE":"DISABLED")+'</span></div><div class="health-metrics"><div><b>'+(p.keyCount||0)+'</b><span>active keys</span></div><div><b>'+(p.models?.length||0)+'</b><span>models</span></div></div><p class="muted">Runtime latency, success rate and cooldown telemetry require the health API.</p></section>').join("")||'<div class="blank-panel"><div class="empty-icon">♥</div><h3>No AI providers to monitor</h3><p>Add an API key to begin the provider health pool.</p></div>';
}
async function refreshProviders(){
 const d=await api("/api/admin/ai/providers",{});providers=Array.isArray(d.providers)?d.providers:[];routes=Array.isArray(d.routes)?d.routes:[];
 try{health=await api("/api/admin/health",{});}catch(e){health=null;console.warn("[STORY ME ADMIN] health unavailable",e)}
 if(selected&&!providers.some(p=>p.id===selected))selected="";
 renderProviders();renderOverview();if(currentPage==="api-keys")renderAllKeys();if(currentPage==="models")renderAllModels();if(currentPage==="task-routing")renderRoutes();if(currentPage==="ai-health")renderHealth();if(d.warnings?.length)message(d.warnings.join(" "));
}
async function load(){
 const button=$("loginBtn");flash(button);token=$("token").value.trim();if(!token){$("loginMsg").textContent="Enter your admin token.";return}
 actionState(button,"Authenticating…");$("loginMsg").textContent="Authenticating against secure Admin API…";
 try{const [d,h]=await Promise.all([api("/api/admin/ai/providers",{}),api("/api/admin/health",{})]);providers=Array.isArray(d.providers)?d.providers:[];routes=Array.isArray(d.routes)?d.routes:[];health=h;$("loginMsg").textContent="Admin access verified. Opening Control Center…";$("login").hidden=true;$("app").hidden=false;buildNav();navigate("overview",document.querySelector('[data-page="overview"]'));if(d.warnings?.length)message(d.warnings.join(" "))}
 catch(e){$("loginMsg").textContent=e?.message||"Admin login failed.";$("loginMsg").className="status-text error";console.error("[STORY ME ADMIN]",e)}
 finally{restoreState(button)}
}
function lock(button){flash(button);token="";providers=[];routes=[];selected="";health=null;$("token").value="";$("app").hidden=true;$("login").hidden=false;$("loginMsg").className="status-text";$("loginMsg").textContent="";message("")}
$("loginBtn").onclick=load;$("token").onkeydown=e=>{if(e.key==="Enter")load()};$("lockBtn").onclick=e=>lock(e.currentTarget);
$("refreshProviders").onclick=async e=>{flash(e.currentTarget);actionState(e.currentTarget,"Refreshing…");try{await refreshProviders();message("Provider data refreshed")}catch(x){message(x.message,true)}finally{restoreState(e.currentTarget)}};
$("refreshRoutes").onclick=async e=>{flash(e.currentTarget);actionState(e.currentTarget,"Refreshing…");try{await refreshProviders();message("Routing data refreshed")}catch(x){message(x.message,true)}finally{restoreState(e.currentTarget)}};
