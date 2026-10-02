const c=window.GUILD_CONFIG||{};
const client=window.supabase.createClient(c.supabase.url,c.publishableKey);
const $=id=>document.getElementById(id);
let me=null,role=null,content={guild:{},events:{},leadership:{}};

function setAccess(message){const x=$("accessText");if(x)x.textContent=message}
function show(id){["accessPanel","dashboard"].forEach(x=>$(x).hidden=x!==id)}
function canAdmin(){return ["owner","site_mod","officer"].includes(role)}
function canEditContent(){return ["owner","site_mod"].includes(role)}

async function getProfile(user){
 const {data,error}=await client.from("profiles").select("id,username,role").eq("id",user.id).maybeSingle();
 if(error)console.error("profile error",error);
 return data;
}

function switchTab(tab){
 document.querySelectorAll(".adminTab").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));
 $("rosterTab").hidden=tab!=="roster";$("contentTabPanel").hidden=tab!=="content";
}
document.querySelectorAll(".adminTab").forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));

async function loadRoster(){
 const [{data,error},{data:profiles}]=await Promise.all([
  client.from("roster").select("id,user_id,character_name,discord_id,approved,active,joined_at").order("approved",{ascending:true}).order("joined_at",{ascending:false}),
  client.from("profiles").select("id,username,role")
 ]);
 const list=$("rosterAdminList");
 if(error){list.innerHTML='<div class="adminEmpty">COULDN’T LOAD THE PRIVATE ROSTER.</div>';console.error(error);return}
 const profileMap=new Map((profiles||[]).map(p=>[p.id,p]));
 $("roleBadge").textContent=role.replace("_"," ").toUpperCase();
 $("adminIntro").textContent=role==="officer"?"You can view approved members and add member tags.":role==="site_mod"?"You can manage the roster and member roles.":"You have full guild administration access.";
 list.innerHTML="";
 if(!data?.length){list.innerHTML='<div class="adminEmpty">NO ROSTER ENTRIES YET.</div>';return}
 for(const m of data){
  const card=document.createElement("article");card.className="rosterAdminCard"+(!m.approved?" pending":"")+(!m.active?" inactive":"");
  const info=document.createElement("div"),name=document.createElement("div");name.className="adminMemberName";name.textContent=m.character_name;
  const meta=document.createElement("div");meta.className="adminMemberMeta";const profile=profileMap.get(m.user_id);meta.textContent=(m.discord_id?"DISCORD • "+m.discord_id+" • ":"")+(m.approved?(m.active?"ACTIVE":"INACTIVE"):"PENDING");info.append(name,meta);
  const actions=document.createElement("div");actions.className="adminActions";
  if((role==="owner"||role==="site_mod")&&profile){const select=document.createElement("select");select.className="roleSelect";const roles=role==="owner"?["recruit","member","officer","site_mod","owner"]:["recruit","member","officer"];roles.forEach(r=>{const o=document.createElement("option");o.value=r;o.textContent=r.replace("_"," ").toUpperCase();o.selected=profile.role===r;select.append(o)});select.onchange=()=>changeRole(m.user_id,select.value,profile.username);actions.append(select)}
  if(role==="owner"||role==="site_mod"){if(!m.approved){const b=document.createElement("button");b.className="adminAction approve";b.textContent="APPROVE";b.onclick=()=>updateRoster(m.id,{approved:true});actions.append(b)}else{const b=document.createElement("button");b.className="adminAction";b.textContent=m.active?"DEACTIVATE":"REACTIVATE";b.onclick=()=>updateRoster(m.id,{active:!m.active});actions.append(b)}const d=document.createElement("button");d.className="adminAction danger";d.textContent="REMOVE";d.onclick=()=>removeRoster(m.id,m.character_name);actions.append(d)}
  if(role==="officer"&&m.approved&&m.active){const tag=document.createElement("button");tag.className="adminAction";tag.textContent="TAG MEMBER";tag.onclick=()=>addTag(m.id,m.character_name);actions.append(tag)}
  card.append(info,actions);list.append(card);
 }
}
async function changeRole(userId,newRole,username){if(role==="site_mod"&&["site_mod","owner"].includes(newRole))return;const {error}=await client.from("profiles").update({role:newRole}).eq("id",userId);if(error){alert("Couldn’t change "+username+"’s role.");return}loadRoster()}
async function updateRoster(id,changes){const {error}=await client.from("roster").update(changes).eq("id",id);if(error){alert("Couldn’t update that member.");return}loadRoster()}
async function removeRoster(id,name){if(!confirm("Remove "+name+" from the roster?"))return;const {error}=await client.from("roster").delete().eq("id",id);if(error){alert("Couldn’t remove that member.");return}loadRoster()}
async function addTag(rosterId,name){const tag=prompt("Tag for "+name+" (example: Raid Lead, Crafter, Recruiter):");if(!tag?.trim())return;const {error}=await client.from("member_tags").insert({roster_id:rosterId,tag:tag.trim(),created_by:me.id});if(error){alert("Couldn’t add that tag.");return}loadRoster()}

function set(id,value){const x=$(id);if(x)x.value=value||""}
function get(id){return $(id)?.value.trim()||""}
function renderContent(){
 const g=content.guild||{},e=content.events||{},l=content.leadership||{};
 set("announcement",g.announcement);set("activityRule",g.activity_rule);set("discordUrl",g.discord);
 set("raidDay",e.raid?.day);set("raidTime",e.raid?.time);set("expeditionDay",e.expedition?.day);set("expeditionTime",e.expedition?.time);set("elysiumDay",e.elysium?.day);set("elysiumTime",e.elysium?.time);
 const box=$("leaderEditors");box.innerHTML="";
 ["Deydriane","Aveo","KK779","SaintlyDevil","Draeconia"].forEach(name=>{const wrap=document.createElement("label");wrap.className="leaderEditor";const title=document.createElement("strong");title.textContent=name;const input=document.createElement("textarea");input.rows=3;input.dataset.leader=name;input.value=l[name]?.bio||"";wrap.append(title,input);box.append(wrap)})
}
async function loadContent(){
 const {data,error}=await client.from("site_content").select("section,content").in("section",["guild","events","leadership"]);
 if(error){$("contentStatus").textContent="COULDN’T LOAD SITE CONTENT.";$("contentStatus").className="formStatus error";console.error(error);return}
 content={guild:{},events:{},leadership:{}};(data||[]).forEach(row=>content[row.section]=row.content||{});renderContent();
}
$("contentForm").onsubmit=async e=>{
 e.preventDefault();if(!canEditContent())return;const status=$("contentStatus");status.className="formStatus";status.textContent="SAVING…";
 const guild={...content.guild,announcement:get("announcement"),activity_rule:get("activityRule"),discord:get("discordUrl")};
 const events={...content.events,raid:{day:get("raidDay"),time:get("raidTime")},expedition:{day:get("expeditionDay"),time:get("expeditionTime")},elysium:{day:get("elysiumDay"),time:get("elysiumTime")}};
 const leadership={...content.leadership};document.querySelectorAll(".leaderEditor textarea").forEach(x=>leadership[x.dataset.leader]={...(leadership[x.dataset.leader]||{}),bio:x.value.trim()});
 for(const row of [{section:"guild",content:guild},{section:"events",content:events},{section:"leadership",content:leadership}]){const {error}=await client.from("site_content").update({content:row.content,updated_at:new Date().toISOString()}).eq("section",row.section);if(error){status.textContent="COULDN’T SAVE "+row.section.toUpperCase()+". CHECK YOUR PERMISSIONS.";status.className="formStatus error";return}}
 content={guild,events,leadership};status.textContent="SITE CONTENT SAVED.";status.className="formStatus success";
};

$("logoutBtn").onclick=async()=>{try{await client.auth.signOut()}finally{window.location.replace("../")}};
async function boot(){
 try{
  setAccess("Checking your guild permissions…");
  const sessionResult=await client.auth.getSession();
  if(sessionResult.error)throw sessionResult.error;
  const user=sessionResult.data?.session?.user;
  if(!user){show("accessPanel");setAccess("You are not signed in on this browser. Sign in on the guild site first.");return}
  me=user;
  const p=await getProfile(user);
  if(!p){show("accessPanel");setAccess("Your account profile could not be loaded. Please contact guild leadership.");return}
  role=p.role;
  $("adminIdentity").textContent=(p.username||"MEMBER")+" • "+role.replace("_"," ").toUpperCase();
  if(!canAdmin()){show("accessPanel");setAccess("Your current guild role does not have administration access.");return}
  show("dashboard");$("contentTab").hidden=!canEditContent();await loadRoster();if(canEditContent())await loadContent();
 }catch(error){
  console.error("Admin boot failed",error);
  show("accessPanel");setAccess("ADMIN LOGIN CHECK FAILED. PLEASE REFRESH AND TRY AGAIN.");
 }
}
client.auth.onAuthStateChange((event,session)=>{if(event==="SIGNED_OUT"){window.location.replace("../")}else if(session?.user){boot()}});
boot();