const API="https://story-me-me-fd43.vercel.app";
let token="", providers=[], selected="";
const $=id=>document.getElementById(id);
async function api(path,opts){
  const r=await fetch(API+path,{...opts,headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"}});
  const d=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(d.error||"Request failed");
  return d;
}
async function load(){
  try{
    const d=await api("/api/admin/ai/providers",{});
    providers=d.providers||[];
    $("login").hidden=true;$("app").hidden=false;
    render();
  }catch(e){$("loginMsg").textContent=e.message}
}
function render(){
  $("providers").innerHTML=providers.map(p=>'<button class="provider '+(p.id===selected?"selected":"")+'" onclick="selectProvider(\''+p.id+'\')"><b>'+p.name+'</b><span>'+p.keyCount+' active keys · '+p.models.length+' models</span></button>').join("");
  if(!selected&&providers[0])selected=providers[0].id;
  const p=providers.find(x=>x.id===selected);
  if(!p)return;
  $("providerPanel").hidden=false;$("providerTitle").textContent=p.name;
  $("keys").innerHTML=p.keys.map(k=>'<div class="keyrow"><div><b>'+k.label+'</b><div class="pill">ID '+k.id.slice(0,8)+'… · priority '+k.priority+'</div></div></div>').join("")||"<p class='muted'>No active keys.</p>";
  $("models").innerHTML=p.models.map(m=>"<span>"+m+"</span>").join("")||"<span>No models configured.</span>";
}
window.selectProvider=id=>{selected=id;render()};
$("loginBtn").onclick=()=>{token=$("token").value.trim();if(token)load()};
$("token").onkeydown=e=>{if(e.key==="Enter")$("loginBtn").click()};
$("lockBtn").onclick=()=>{location.reload()};
$("addKey").onclick=async()=>{const v=$("newKey").value.trim();if(!v)return;try{await api("/api/admin/ai/keys",{method:"POST",body:JSON.stringify({provider:selected,apiKey:v,label:"Admin key",priority:100})});$("newKey").value="";await load()}catch(e){$("msg").textContent=e.message}};
$("addModel").onclick=async()=>{const v=$("newModel").value.trim();if(!v)return;try{await api("/api/admin/ai/models",{method:"POST",body:JSON.stringify({provider:selected,model:v})});$("newModel").value="";await load()}catch(e){$("msg").textContent=e.message}};
