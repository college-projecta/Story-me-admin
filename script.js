const API="https://story-me-me-fd43.vercel.app";
let token="",providers=[],selected="",routes=[],currentPage="overview",health=null;

const $=id=>document.getElementById(id);
const navItems=[
 ["overview","Overview","◈","CORE"],
 ["ai-providers","AI Providers","AI","AI"],
 ["api-keys","API Keys","K","AI"],
 ["models","Models","M","AI"],
 ["task-routing","Task Routing","⇄","AI"],
 ["ai-health","AI Health","♥","AI"],
 ["stories","Stories","S","CONTENT"],
 ["scenes","Scenes","⌂","CONTENT"],
 ["characters","Characters","C","CONTENT"],
 ["voice","Voice","V","MEDIA"],
 ["images","Images","I","MEDIA"],
 ["users","Users","U","PLATFORM"],
 ["analytics","Analytics","A","PLATFORM"],
 ["system","System","⚙","SYSTEM"],
 ["security","Security","◇","SYSTEM"],
 ["logs","Logs","≡","SYSTEM"],
 ["settings","Settings","☷","SYSTEM"]
];
const pageMeta={
 overview:["Overview","Platform operational overview"],
 "ai-providers":["AI Providers","Manage provider availability and configuration"],
 "api-keys":["API Keys","Manage encrypted provider key metadata"],
 models:["Models","Manage models available to the router"],
 "task-routing":["Task Routing","Configure task-to-provider fallback order"],
 "ai-health":["AI Health","Provider configuration and runtime health"],
 stories:["Stories","Story lifecycle and publishing control"],
 scenes:["Scenes","Reusable visual scene library"],
 characters:["Characters","Character and relationship control"],
 voice:["Voice","TTS providers and voice configuration"],
 images:["Images","Image providers and visual generation"],
 users:["Users","Safe user and session administration"],
 analytics:["Analytics","Usage, decisions and retention"],
 system:["System","Runtime settings and feature controls"],
 security:["Security","Safety and security configuration"],
 logs:["Logs","Structured operational and audit logs"],
 settings:["Settings","Admin control center settings"]
};
const taskNames=["Dialogue","Story/Branch Reasoning","Intent Detection","Emotion","Character Expression","Movement","Positioning","Scene Selection","Memory Summary","Hint Generation","Safety","Voice / TTS","Speech-to-Text","Image Generation","Story Analysis"];

function flash(button){if(!button)return;button.classList.remove("clicked");void button.offsetWidth;button.classList.add("clicked");setTimeout(()=>button.classList.remove("clicked"),700)}
function actionState(button,text){if(!button)return;button.dataset.originalText=button.dataset.originalText||button.textContent;button.textContent=text;button.disabled=true}
function restoreState(button){if(!button)return;button.textContent=button.dataset.originalText||button.textContent;delete button.dataset.originalText;button.disabled=false}
function message(text,error=false){$("msg").textContent=text||"";$("msg").className=error?"global-msg error":"global-msg muted"}
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

async function api(path,opts={}){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
 try{
   const r=await fetch(API+path,{...opts,signal:controller.signal,headers:{...(opts.headers||{}),Authorization:"Bearer "+token,"Content-Type":"application/json","Cache-Control":"no-cache"}});
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
   throw e;
 }finally{clearTimeout(timeout)}
}

function buildNav(){
 const nav=$("nav");let group="";
 nav.innerHTML="";
 navItems.forEach(([id,label,icon,g])=>{
   if(g!==group){group=g;const d=document.createElement("div");d.className="nav-group";d.textContent=g;nav.appendChild(d)}
   const b=document.createElement("button");b.className="nav-btn";b.dataset.page=id;b.innerHTML='<span class="nav-icon">'+icon+'</span><span>'+label+'</span>';
   b.onclick=()=>navigate(id,b);nav.appendChild(b);
 });
}
function navigate(id,button){
 flash(button);currentPage=id;
 document.querySelectorAll(".page").forEach(p=>p.hidden=true);
 const page=$("page-"+id)||$("page-module");page.hidden=false;
 document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.page===id));
 $("pageTitle").textContent=pageMeta[id]?.[0]||"Module";
 $("pageSubtitle").textContent=pageMeta[id]?.[1]||"STORY ME operational module";
 if(id==="overview")renderOverview();
 if(id==="ai-providers")renderProviders();
 if(id==="api-keys")renderAllKeys();
 if(id==="models")renderAllModels();
 if(id==="task-routing")renderRoutes();
 if(id==="ai-health")renderHealth();
 if(!["overview","ai-providers","api-keys","models","task-routing","ai-health"].includes(id))renderUnavailable(id);
}
function renderUnavailable(id){
 const meta=pageMeta[id]||[id,""];
 $("page-module").innerHTML='<div class="card module-card"><h2>'+escapeHtml(meta[0])+'</h2><p class="muted">This module is part of the STORY ME Control Center architecture, but its production backend endpoint is not connected yet.</p><div class="module-list"><div class="module-item">No fake data is displayed.</div><div class="module-item">No fake action buttons are provided.</div><div class="module-item">Next implementation step: connect the corresponding Supabase schema and secure Admin API.</div></div></div>';
}

function renderOverview(){
 const active=providers.filter(p=>p.enabled).length;
 const keys=providers.reduce((n,p)=>n+(p.keyCount||0),0);
 const models=providers.reduce((n,p)=>n+(p.models?.length||0),0);
 const db=health?.database?.status||"checking";
 const router=health?.aiRouter?.status||"checking";
 const backend=health?.backend?.status||"checking";
 $("page-overview").innerHTML=
 '<div class="kpi-grid">'+
 '<div class="card kpi"><div class="label">AI PROVIDERS</div><div class="value">'+providers.length+'</div><div class="sub">'+active+' enabled</div></div>'+
 '<div class="card kpi"><div class="label">ACTIVE API KEYS</div><div class="value">'+keys+'</div><div class="sub">Safe metadata only</div></div>'+
 '<div class="card kpi"><div class="label">ENABLED MODELS</div><div class="value">'+models+'</div><div class="sub">Available to configuration</div></div>'+
 '<div class="card kpi"><div class="label">TASK ROUTES</div><div class="value">'+routes.length+'</div><div class="sub">'+(health?.aiRouter?.routeCount||0)+' saved in backend</div></div>'+
 '</div>'+
 '<div class="dashboard-grid">'+
 '<section class="card card-pad"><h3>System Status</h3><div class="status-list">'+
 '<div class="status-item"><span>Backend API</span><span class="state '+(backend==="online"?"ok":"warn")+'">'+escapeHtml(backend.toUpperCase())+'</span></div>'+
 '<div class="status-item"><span>Database</span><span class="state '+(db==="connected"?"ok":"warn")+'">'+escapeHtml(db.toUpperCase())+'</span></div>'+
 '<div class="status-item"><span>AI Router</span><span class="state '+(router==="configured"?"ok":"warn")+'">'+escapeHtml(router.replaceAll("_"," ").toUpperCase())+'</span></div>'+
 '<div class="status-item"><span>Runtime telemetry</span><span class="state warn">NOT CONNECTED</span></div>'+
 '</div></section>'+
 '<section class="card card-pad"><h3>AI Provider Pool</h3><div class="status-list">'+
 providers.slice(0,8).map(p=>'<div class="status-item"><span>'+escapeHtml(p.name)+'</span><span class="state '+(p.enabled?"ok":"warn")+'">'+(p.enabled?"ENABLED":"DISABLED")+'</span></div>').join("")+
 (providers.length>8?'<div class="muted">+'+(providers.length-8)+' more providers</div>':"")+
 '</div></section></div>'+
 '<div class="dashboard-grid">'+
 '<section class="card card-pad"><h3>Story Engine</h3><div class="status-list">'+
 '<div class="status-item"><span>Stories</span><span class="state warn">CONTENT API PENDING</span></div>'+
 '<div class="status-item"><span>Scenes</span><span class="state warn">CONTENT API PENDING</span></div>'+
 '<div class="status-item"><span>Characters</span><span class="state warn">CONTENT API PENDING</span></div>'+
 '<div class="status-item"><span>Users & sessions</span><span class="state warn">PLATFORM API PENDING</span></div>'+
 '</div></section>'+
 '<section class="card card-pad"><h3>Control Center Scope</h3><div class="module-list">'+
 '<div class="module-item">AI configuration · live</div>'+
 '<div class="module-item">Task routing · live</div>'+
 '<div class="module-item">Story / Scene / Character control · next backend integration</div>'+
 '<div class="module-item">Analytics / Logs / Audit · next backend integration</div>'+
 '</div></section></div>';
}
function selectProvider(id,button){
 selected=id;renderProviders();flash(document.querySelector('[data-provider="'+CSS.escape(id)+'"]')||button);message("");
}
function renderProviders(){
 const box=$("providers");
 box.innerHTML=providers.length?providers.map(p=>'<div class="provider-row"><button class="provider '+(p.id===selected?"selected":"")+'" data-provider="'+escapeHtml(p.id)+'"><b>'+escapeHtml(p.name)+'</b><span>'+(p.keyCount||0)+' active keys · '+(p.models?.length||0)+' models</span></button><button class="provider-toggle '+(p.enabled?"":"off")+'" data-toggle-provider="'+escapeHtml(p.id)+'">'+(p.enabled?"Enabled":"Disabled")+'</button></div>').join(""):'<p class="muted">No providers configured.</p>';
 document.querySelectorAll("[data-provider]").forEach(b=>b.onclick=()=>selectProvider(b.dataset.provider,b));
 document.querySelectorAll("[data-toggle-provider]").forEach(b=>b.onclick=()=>toggleProvider(b.dataset.toggleProvider,b));
 if(!selected&&providers[0])selected=providers[0].id;
 const p=providers.find(x=>x.id===selected);
 if(!p){$("providerPanel").hidden=true;$("providerEmpty").hidden=false;return}
 $("providerEmpty").hidden=true;$("providerPanel").hidden=false;$("providerTitle").textContent=p.name;
 $("providerMeta").textContent=(p.enabled?"Enabled":"Disabled")+" · "+(p.protocol||"unknown protocol")+" · priority configuration available";
 $("keys").innerHTML=p.keys?.length?p.keys.map(k=>'<div class="keyrow"><div><b>'+escapeHtml(k.label||"Admin key")+'</b><div class="pill">ID '+escapeHtml(k.id.slice(0,8))+'… · priority '+k.priority+'</div></div><div class="row"><button class="ghost update-key" data-id="'+escapeHtml(k.id)+'">Update</button><button class="danger disable-key" data-id="'+escapeHtml(k.id)+'">Disable</button></div></div>').join(""):'<p class="muted">No active keys.</p>';
 document.querySelectorAll(".update-key").forEach(b=>b.onclick=()=>updateKey(b.dataset.id,b));document.querySelectorAll(".disable-key").forEach(b=>b.onclick=()=>removeKey(b.dataset.id,b));
 $("models").innerHTML=p.models?.length?p.models.map(m=>"<span>"+escapeHtml(m)+"</span>").join(""):"<span>No models configured.</span>";
}
async function toggleProvider(id,button){
 const p=providers.find(x=>x.id===id);if(!p)return;flash(button);const next=!p.enabled;actionState(button,next?"Enabling…":"Disabling…");
 if(!confirm((next?"Enable ":"Disable ")+p.name+"?")){restoreState(button);return}
 try{await api("/api/admin/ai/providers",{method:"PATCH",body:JSON.stringify({provider:id,enabled:next})});await refreshProviders();message((next?"Enabled ":"Disabled ")+p.name+".","");}
 catch(e){message(e.message,true)}finally{restoreState(button)}
}
async function addKey(button){
 flash(button);const v=$("newKey").value.trim();if(!selected){message("Select a provider first.",true);return}if(!v){message("Enter an API key first.",true);return}
 actionState(button,"Saving…");try{await api("/api/admin/ai/keys",{method:"POST",body:JSON.stringify({provider:selected,apiKey:v,label:"Admin key",priority:100})});$("newKey").value="";await refreshProviders();message("API key saved securely.");}catch(e){message(e.message,true)}finally{restoreState(button)}
}
async function updateKey(id,button){
 flash(button);const value=prompt("Enter the replacement API key:");if(!value?.trim())return;actionState(button,"Saving…");
 try{await api("/api/admin/ai/keys",{method:"PUT",body:JSON.stringify({id,apiKey:value.trim(),label:"Admin key",priority:100})});await refreshProviders();message("API key updated.");}catch(e){message(e.message,true)}finally{restoreState(button)}
}
async function removeKey(id,button){
 flash(button);if(!confirm("Disable this API key?"))return;actionState(button,"Disabling…");
 try{await api("/api/admin/ai/keys",{method:"DELETE",body:JSON.stringify({id})});await refreshProviders();message("API key disabled.");}catch(e){message(e.message,true)}finally{restoreState(button)}
}
async function addModel(button){
 flash(button);const v=$("newModel").value.trim();if(!selected){message("Select a provider first.",true);return}if(!v){message("Enter a model ID first.",true);return}
 actionState(button,"Saving…");try{await api("/api/admin/ai/models",{method:"POST",body:JSON.stringify({provider:selected,model:v})});$("newModel").value="";await refreshProviders();message("Model saved.");}catch(e){message(e.message,true)}finally{restoreState(button)}
}
function renderAllKeys(){
 const rows=providers.flatMap(p=>(p.keys||[]).map(k=>({provider:p.name,key:k})));
 $("allKeys").innerHTML=rows.length?'<table class="data-table"><thead><tr><th>Provider</th><th>Key ID</th><th>Label</th><th>Priority</th><th>Status</th></tr></thead><tbody>'+rows.map(x=>'<tr><td>'+escapeHtml(x.provider)+'</td><td>KEY-'+escapeHtml(x.key.id.slice(0,8))+'</td><td>'+escapeHtml(x.key.label||"Admin key")+'</td><td>'+x.key.priority+'</td><td><span class="state ok">ENABLED</span></td></tr>').join("")+'</tbody></table>':'<div class="card-pad"><p class="muted">No active API keys configured.</p></div>';
}
function renderAllModels(){
 const rows=providers.flatMap(p=>(p.models||[]).map(m=>({provider:p.name,model:m})));
 $("allModels").innerHTML=rows.length?'<table class="data-table"><thead><tr><th>Provider</th><th>Model</th><th>Status</th></tr></thead><tbody>'+rows.map(x=>'<tr><td>'+escapeHtml(x.provider)+'</td><td>'+escapeHtml(x.model)+'</td><td><span class="state ok">ENABLED</span></td></tr>').join("")+'</tbody></table>':'<div class="card-pad"><p class="muted">No enabled models configured.</p></div>';
}
function renderRoutes(){
 const options=providers.map(p=>'<option value="'+escapeHtml(p.id)+'">'+escapeHtml(p.name)+'</option>').join("");
 $("routes").innerHTML=taskNames.map(task=>{
   const route=routes.find(r=>r.task===task)||{providers:[]};const vals=[route.providers?.[0]||"",route.providers?.[1]||"",route.providers?.[2]||""];
   return '<section class="card route-card"><div class="route-head"><h3>'+escapeHtml(task)+'</h3><span class="state '+(route.enabled===false?"warn":"ok")+'">'+(route.enabled===false?"DISABLED":"ACTIVE")+'</span></div>'+
   [0,1,2].map((n)=>'<div class="route-slot"><label>'+(n===0?"PRIMARY":"FALLBACK #"+n)+'</label><select data-route-task="'+escapeHtml(task)+'" data-route-index="'+n+'"><option value="">Not configured</option>'+options+'</select></div>').join("")+
   '<div class="route-actions"><button class="save-route" data-route-task="'+escapeHtml(task)+'">Save Routing</button></div></section>';
 }).join("");
 document.querySelectorAll("select[data-route-task]").forEach(s=>{const r=routes.find(x=>x.task===s.dataset.routeTask);s.value=r?.providers?.[Number(s.dataset.routeIndex)]||""});
 document.querySelectorAll(".save-route").forEach(b=>b.onclick=()=>saveRoute(b.dataset.routeTask,b));
}
async function saveRoute(task,button){
 flash(button);actionState(button,"Saving…");
 try{
  const vals=[0,1,2].map(i=>document.querySelector('select[data-route-task="'+CSS.escape(task)+'"][data-route-index="'+i+'"]')?.value||"").filter(Boolean);
  await api("/api/admin/ai/routes",{method:"PUT",body:JSON.stringify({task,providers:vals})});
  await refreshProviders();message("Routing saved for "+task+".");
 }catch(e){message(e.message,true)}finally{restoreState(button)}
}
function renderHealth(){
 $("health").innerHTML=providers.map(p=>'<section class="card health-card"><h3>'+escapeHtml(p.name)+'</h3><div class="health-state">'+(p.enabled?"CONFIGURED / ENABLED":"DISABLED")+'</div><p class="muted">'+(p.keyCount||0)+' active keys · '+(p.models?.length||0)+' enabled models</p><p class="muted">Runtime latency, success rate and cooldown telemetry require the health API.</p></section>').join("")||'<div class="card card-pad"><p class="muted">No providers configured.</p></div>';
}
async function refreshProviders(){
 const [d,h]=await Promise.all([api("/api/admin/ai/providers",{}),api("/api/admin/health",{}).catch(()=>null)]);providers=Array.isArray(d.providers)?d.providers:[];routes=Array.isArray(d.routes)?d.routes:[];health=h;renderProviders();renderOverview();if(currentPage==="api-keys")renderAllKeys();if(currentPage==="models")renderAllModels();if(currentPage==="task-routing")renderRoutes();if(currentPage==="ai-health")renderHealth();if(d.warnings?.length)message(d.warnings.join(" "));
}
async function load(){
 const button=$("loginBtn");flash(button);token=$("token").value.trim();if(!token){$("loginMsg").textContent="Enter your admin token.";return}
 actionState(button,"Authenticating…");$("loginMsg").textContent="Authenticating against secure Admin API…";
 try{
  const [d,h]=await Promise.all([api("/api/admin/ai/providers",{}),api("/api/admin/health",{})]);
  providers=Array.isArray(d.providers)?d.providers:[];routes=Array.isArray(d.routes)?d.routes:[];health=h;
  $("loginMsg").textContent="Admin access verified. Opening Control Center…";
  $("login").hidden=true;$("app").hidden=false;buildNav();navigate("overview",document.querySelector('[data-page="overview"]'));
  if(d.warnings?.length)message(d.warnings.join(" "));
 }catch(e){$("loginMsg").textContent=e?.message||"Admin login failed.";$("loginMsg").className="status-text error";console.error("[STORY ME ADMIN]",e)}
 finally{restoreState(button)}
}
function lock(button){flash(button);token="";providers=[];routes=[];selected="";$("token").value="";$("app").hidden=true;$("login").hidden=false;$("loginMsg").className="status-text";$("loginMsg").textContent="";message("")}
$("loginBtn").onclick=load;
$("token").onkeydown=e=>{if(e.key==="Enter")load()};
$("lockBtn").onclick=e=>lock(e.currentTarget);
$("addKey").onclick=e=>addKey(e.currentTarget);
$("addModel").onclick=e=>addModel(e.currentTarget);
$("refreshProviders").onclick=async e=>{flash(e.currentTarget);actionState(e.currentTarget,"Refreshing…");try{await refreshProviders();message("Provider data refreshed.")}catch(x){message(x.message,true)}finally{restoreState(e.currentTarget)}};
$("refreshRoutes").onclick=async e=>{flash(e.currentTarget);actionState(e.currentTarget,"Refreshing…");try{await refreshProviders();message("Routing data refreshed.")}catch(x){message(x.message,true)}finally{restoreState(e.currentTarget)}};
