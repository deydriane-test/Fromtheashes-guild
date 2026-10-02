const cfg=window.GUILD_CONFIG||{};
const client=window.supabase?.createClient(cfg.supabase.url,cfg.supabase.publishableKey);
const $=id=>document.getElementById(id);
const loginPanel=$("loginPanel"),deniedPanel=$("deniedPanel"),dashboard=$("dashboard"),logoutBtn=$("logoutBtn"),adminEmail=$("adminEmail");

function show(which){
 [loginPanel,deniedPanel,dashboard].forEach(x=>x.hidden=true);
 which.hidden=false;
}

async function isLeader(user){
 if(!user)return false;
 const {data,error}=await client.from("admin_leaders").select("email,display_name,active").eq("active",true).maybeSingle();
 if(error)return false;
 return !!data;
}

async function loadRoster(){
 const {data,error}=await client.from("roster")
   .select("id,character_name,discord_name,approved,active,joined_at")
   .order("approved",{ascending:true})
   .order("joined_at",{ascending:false});
 const list=$("rosterAdminList");
 if(error){
   list.innerHTML='<div class="adminEmpty">COULDN’T LOAD THE ROSTER.</div>';
   return;
 }
 const pending=data.filter(x=>!x.approved).length;
 $("pendingCount").textContent=pending?pending+" PENDING APPROVAL":data.length+" ROSTER ENTRIES";
 if(!data.length){
   list.innerHTML='<div class="adminEmpty">NO ROSTER ENTRIES YET.</div>';
   return;
 }
 list.innerHTML="";
 data.forEach(member=>{
   const card=document.createElement("article");
   card.className="rosterAdminCard"+(!member.approved?" pending":"")+(!member.active?" inactive":"");
   const info=document.createElement("div");
   const name=document.createElement("div");name.className="adminMemberName";name.textContent=member.character_name;
   const meta=document.createElement("div");meta.className="adminMemberMeta";
   meta.textContent=(member.discord_name?"DISCORD • "+member.discord_name+" • ":"")+(member.approved?(member.active?"ACTIVE":"INACTIVE"):"PENDING APPROVAL");
   info.append(name,meta);
   const actions=document.createElement("div");actions.className="adminActions";
   if(!member.approved){
     const b=document.createElement("button");b.className="adminAction approve";b.textContent="APPROVE";b.onclick=()=>updateMember(member.id,{approved:true});actions.appendChild(b);
   }else{
     const b=document.createElement("button");b.className="adminAction";b.textContent=member.active?"DEACTIVATE":"REACTIVATE";b.onclick=()=>updateMember(member.id,{active:!member.active});actions.appendChild(b);
   }
   const del=document.createElement("button");del.className="adminAction danger";del.textContent="REMOVE";del.onclick=()=>deleteMember(member.id,member.character_name);actions.appendChild(del);
   card.append(info,actions);list.appendChild(card);
 });
}

async function updateMember(id,changes){
 const {error}=await client.from("roster").update(changes).eq("id",id);
 if(error){alert("Couldn’t update that roster entry.");return;}
 await loadRoster();
}

async function deleteMember(id,name){
 if(!confirm("Remove "+name+" from the roster?"))return;
 const {error}=await client.from("roster").delete().eq("id",id);
 if(error){alert("Couldn’t remove that roster entry.");return;}
 await loadRoster();
}

$("loginForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const email=$("loginEmail").value.trim().toLowerCase();
 $("loginStatus").className="formStatus";
 $("loginStatus").textContent="SENDING LOGIN LINK…";
 const {error}=await client.auth.signInWithOtp({
   email,
   options:{emailRedirectTo:window.location.origin+"/admin/"}
 });
 if(error){
   $("loginStatus").className="formStatus error";
   $("loginStatus").textContent=error.message;
   return;
 }
 $("loginStatus").className="formStatus success";
 $("loginStatus").textContent="CHECK YOUR EMAIL FOR THE SIGN-IN LINK.";
});

logoutBtn.onclick=()=>client.auth.signOut();
$("deniedLogout").onclick=()=>client.auth.signOut();

async function boot(){
 if(!client){show(loginPanel);return;}
 const {data:{user}}=await client.auth.getUser();
 if(!user){show(loginPanel);return;}
 const leader=await isLeader(user);
 if(!leader){
   adminEmail.textContent=user.email||"";
   show(deniedPanel);
   return;
 }
 adminEmail.textContent=user.email||"";
 logoutBtn.hidden=false;
 show(dashboard);
 await loadRoster();
}
client?.auth.onAuthStateChange(()=>boot());
boot();
