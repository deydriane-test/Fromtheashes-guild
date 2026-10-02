const c=window.GUILD_CONFIG||{};const client=window.supabase.createClient(c.supabase.url,c.supabase.publishableKey);const $=id=>document.getElementById(id);
let me=null,role=null;
function show(id){["loginPanel","deniedPanel","dashboard"].forEach(x=>$(x).hidden=x!==id);}
function canAdmin(){return ["owner","site_mod","officer"].includes(role)}
async function getProfile(user){const {data}=await client.from("profiles").select("id,username,role").eq("id",user.id).maybeSingle();return data}
async function loadRoster(){
 const [{data,error},{data:profiles}]=await Promise.all([client.from("roster").select("id,user_id,character_name,discord_id,approved,active,joined_at").order("approved",{ascending:true}).order("joined_at",{ascending:false}),client.from("profiles").select("id,username,role")]);
 const profileMap=new Map((profiles||[]).map(p=>[p.id,p]));
 const list=$("rosterAdminList");if(error){list.innerHTML='<div class="adminEmpty">COULDN’T LOAD THE PRIVATE ROSTER.</div>';return;}
 $("roleBadge").textContent=role.replace("_"," ").toUpperCase();
 $("adminIntro").textContent=role==="officer"?"You can view approved members and add/remove member tags.":role==="site_mod"?"You can manage the roster, remove members, and promote recruits up through Officer.":"You have full guild administration access.";
 list.innerHTML="";
 if(!data?.length){list.innerHTML='<div class="adminEmpty">NO ROSTER ENTRIES YET.</div>';return;}
 for(const m of data){
  const card=document.createElement("article");card.className="rosterAdminCard"+(!m.approved?" pending":"")+(!m.active?" inactive":"");
  const info=document.createElement("div");const name=document.createElement("div");name.className="adminMemberName";name.textContent=m.character_name;
  const meta=document.createElement("div");meta.className="adminMemberMeta";const profile=profileMap.get(m.user_id);meta.textContent=(m.discord_id?"DISCORD • "+m.discord_id+" • ":"")+(m.approved?(m.active?"ACTIVE":"INACTIVE"):"PENDING");
  info.append(name,meta);
  const actions=document.createElement("div");actions.className="adminActions";
  if((role==="owner"||role==="site_mod")&&profile){
   const select=document.createElement("select");select.className="roleSelect";
   const roles=role==="owner"?["recruit","member","officer","site_mod","owner"]:["recruit","member","officer"];
   roles.forEach(r=>{const o=document.createElement("option");o.value=r;o.textContent=r.replace("_"," ").toUpperCase();o.selected=profile.role===r;select.append(o)});
   select.onchange=()=>changeRole(m.user_id,select.value,profile.username);
   actions.append(select);
  }
  if(role==="owner"||role==="site_mod"){
   if(!m.approved){const b=document.createElement("button");b.className="adminAction approve";b.textContent="APPROVE";b.onclick=()=>updateRoster(m.id,{approved:true});actions.append(b);}
   else{const b=document.createElement("button");b.className="adminAction";b.textContent=m.active?"DEACTIVATE":"REACTIVATE";b.onclick=()=>updateRoster(m.id,{active:!m.active});actions.append(b);}
   const d=document.createElement("button");d.className="adminAction danger";d.textContent="REMOVE";d.onclick=()=>removeRoster(m.id,m.character_name);actions.append(d);
  }
  if(role==="officer"&&m.approved&&m.active){
   const tag=document.createElement("button");tag.className="adminAction";tag.textContent="TAG MEMBER";tag.onclick=()=>addTag(m.id,m.character_name);actions.append(tag);
  }
  card.append(info,actions);list.append(card);
 }
}
async function changeRole(userId,newRole,username){
 if(role==="site_mod"&&["site_mod","owner"].includes(newRole))return;
 const {error}=await client.from("profiles").update({role:newRole}).eq("id",userId);
 if(error){alert("Couldn’t change "+username+"’s role.");return}loadRoster();
}
async function updateRoster(id,changes){const {error}=await client.from("roster").update(changes).eq("id",id);if(error){alert("Couldn’t update that member.");return}loadRoster()}
async function removeRoster(id,name){if(!confirm("Remove "+name+" from the roster?"))return;const {error}=await client.from("roster").delete().eq("id",id);if(error){alert("Couldn’t remove that member.");return}loadRoster()}
async function addTag(rosterId,name){
 const tag=prompt("Tag for "+name+" (example: Raid Lead, Crafter, Recruiter):");if(!tag?.trim())return;
 const {error}=await client.from("member_tags").insert({roster_id:rosterId,tag:tag.trim(),created_by:me.id});
 if(error){alert("Couldn’t add that tag.");return}alert("Tag added.");loadRoster();
}
$("loginForm").onsubmit=async e=>{e.preventDefault();$("loginStatus").textContent="LOGGING IN…";const {error}=await client.auth.signInWithPassword({email:$("loginEmail").value.trim().toLowerCase(),password:$("loginPassword").value});if(error){$("loginStatus").className="formStatus error";$("loginStatus").textContent=error.message;return}boot()};
$("logoutBtn").onclick=()=>client.auth.signOut();
async function boot(){const {data:{user}}=await client.auth.getUser();if(!user){show("loginPanel");return}me=user;const p=await getProfile(user);if(!p){show("deniedPanel");$("deniedText").textContent="Your account profile is not ready yet.";return}role=p.role;$("adminIdentity").textContent=p.username+" • "+role.replace("_"," ").toUpperCase();if(!canAdmin()){show("deniedPanel");return}show("dashboard");loadRoster()}
client.auth.onAuthStateChange(()=>boot());boot();