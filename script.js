const API="https://story-me-me-fd43.vercel.app";
let token="", providers=[], selected="", busy=false;
const $=id=>document.getElementById(id);
function flash(button){if(!button)return;button.classList.remove("clicked");void button.offsetWidth;button.classList.add("clicked");setTimeout(()=>button.classList.remove("clicked"),700)}
function setBusy(value){busy=value;document.querySelectorAll("button").forEach(b=>b.disabled=value&&!b.classList.contains("provider"))}
function message(text,error=false){$("msg").textContent=text||"";$("msg").className=error?"error":"muted"}
async function api(path,opts={}){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
 try{const r=await fetch(API+path,{...opts,signal:controller.signal,headers:{...(opts.headers||{}),Authorization:"Bearer "+token,"Content-Type":"application/json"}});
 const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||("Request failed ("+r.status+")"));return d;
 }catch(e){if(e?.name==="AbortError")throw new Error("Admin backend request timed out.");if(e instanceof TypeError)throw new Error("Could not reach the Admin backend. Check CORS/deployment/API availability.");throw e}finally{clearTimeout(timeout)}
}
async function load(){
 const button=$("loginBtn");flash(button);token=$("token").value.trim();
 if(!token){$("loginMsg").textContent="Enter your admin token.";return}
 button.textContent="Connecting…";button.disabled=true;$("loginMsg").textContent="";
 try{const d=await api("/api/admin/ai/providers",{});providers=d.providers||[];$("login").hidden=true;$("app").hidden=false;if(d.warnings?.length)message(d.warnings.join(" "));render()}
 catch(e){$("loginMsg").textContent=e.message}
 finally{button.textContent="Enter Admin";button.disabled=false}
}
function selectProvider(id,button){selected=id;render();const active=document.querySelector('[data-provider="'+CSS.escape(id)+'"]');flash(active||button);message("")}
function render(){
 $("providers").innerHTML=providers.length?providers.map(p=>'<div class="provider-row"><button class="provider '+(p.id===selected?"selected":"")+'" data-provider="'+escapeHtml(p.id)+'"><b>'+escapeHtml(p.name)+'</b><span>'+p.keyCount+' active keys · '+p.models.length+' models</span></button><button class="provider-toggle '+(p.enabled?"":"off")+'" data-toggle-provider="'+escapeHtml(p.id)+'">'+(p.enabled?"Enabled":"Disabled")+'</button></div>').join(""):"<p class='muted'>No providers configured.</p>";
 document.querySelectorAll("[data-provider]").forEach(b=>b.onclick=()=>selectProvider(b.dataset.provider,b));
 document.querySelectorAll("[data-toggle-provider]").forEach(b=>b.onclick=()=>toggleProvider(b.dataset.toggleProvider,b));
 if(!selected&&providers[0])selected=providers[0].id;const p=providers.find(x=>x.id===selected);if(!p)return;
 $("providerPanel").hidden=false;$("providerTitle").textContent=p.name;
 $("keys").innerHTML=p.keys?.length?p.keys.map(k=>'<div class="keyrow"><div><b>'+escapeHtml(k.label||"Admin key")+'</b><div class="pill">ID '+escapeHtml(k.id.slice(0,8))+'… · priority '+k.priority+'</div></div><div class="row"><button class="ghost update-key" data-id="'+escapeHtml(k.id)+'">Update</button><button class="danger disable-key" data-id="'+escapeHtml(k.id)+'">Disable</button></div></div>').join(""):"<p class='muted'>No active keys.</p>";
 document.querySelectorAll(".update-key").forEach(b=>b.onclick=()=>updateKey(b.dataset.id,b));document.querySelectorAll(".disable-key").forEach(b=>b.onclick=()=>removeKey(b.dataset.id,b));
 $("models").innerHTML=p.models?.length?p.models.map(m=>"<span>"+escapeHtml(m)+"</span>").join(""):"<span>No models configured.</span>";
}
async function toggleProvider(id,button){
 const provider=providers.find(p=>p.id===id);if(!provider)return;flash(button);
 const next=!provider.enabled;button.textContent=next?"Enabling…":"Disabling…";setBusy(true);
 try{await api("/api/admin/ai/providers",{method:"PATCH",body:JSON.stringify({provider:id,enabled:next})});await refreshProviders();message((next?"Enabled ":"Disabled ")+provider.name+".")}
 catch(e){message(e.message,true)}finally{setBusy(false)}
}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
async function addKey(button){flash(button);const v=$("newKey").value.trim();if(!selected){message("Select a provider first.",true);return}if(!v){message("Enter an API key first.",true);return}button.textContent="Saving…";setBusy(true);try{await api("/api/admin/ai/keys",{method:"POST",body:JSON.stringify({provider:selected,apiKey:v,label:"Admin key",priority:100})});$("newKey").value="";await refreshProviders();message("API key saved securely.")}catch(e){message(e.message,true)}finally{button.textContent="Add";setBusy(false)}}
async function updateKey(id,button){flash(button);const value=prompt("Enter the replacement API key:");if(!value?.trim())return;button.textContent="Saving…";setBusy(true);try{await api("/api/admin/ai/keys",{method:"PUT",body:JSON.stringify({id,apiKey:value.trim(),label:"Admin key",priority:100})});await refreshProviders();message("API key updated.")}catch(e){message(e.message,true)}finally{setBusy(false)}}
async function removeKey(id,button){flash(button);if(!confirm("Disable this API key?"))return;button.textContent="Disabling…";setBusy(true);try{await api("/api/admin/ai/keys",{method:"DELETE",body:JSON.stringify({id})});await refreshProviders();message("API key disabled.")}catch(e){message(e.message,true)}finally{setBusy(false)}}
async function addModel(button){flash(button);const v=$("newModel").value.trim();if(!selected){message("Select a provider first.",true);return}if(!v){message("Enter a model ID first.",true);return}button.textContent="Saving…";setBusy(true);try{await api("/api/admin/ai/models",{method:"POST",body:JSON.stringify({provider:selected,model:v})});$("newModel").value="";await refreshProviders();message("Model saved.")}catch(e){message(e.message,true)}finally{button.textContent="Save";setBusy(false)}}
async function refreshProviders(){const d=await api("/api/admin/ai/providers",{});providers=d.providers||[];render();if(d.warnings?.length)message(d.warnings.join(" "))}
function lock(button){flash(button);token="";providers=[];selected="";$("token").value="";$("app").hidden=true;$("login").hidden=false;$("loginMsg").textContent="";message("")}
$("loginBtn").onclick=load;$("token").onkeydown=e=>{if(e.key==="Enter")load()};$("lockBtn").onclick=e=>lock(e.currentTarget);$("addKey").onclick=e=>addKey(e.currentTarget);$("addModel").onclick=e=>addModel(e.currentTarget);
