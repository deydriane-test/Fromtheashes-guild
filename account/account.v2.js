const c=window.GUILD_CONFIG||{};
const sb=window.supabase?.createClient(c.supabase.url,c.publishableKey);
const $=id=>document.getElementById(id);

async function loadAccount(user){
 if(!user){window.location.href="login.html";return}
 const {data:profile,error}=await sb.from("profiles").select("username,role").eq("id",user.id).maybeSingle();
 if(error||!profile){document.body.innerHTML='<main style="padding:120px 8vw;color:#f6efe8"><h1>ACCOUNT ERROR</h1><p>We could not load your guild profile.</p></main>';return}
 const {data:roster}=await sb.from("roster").select("character_name,discord_id,approved,active").eq("user_id",user.id).maybeSingle();
 $("accountUsername").textContent=(profile.username||"MEMBER").toUpperCase()+".";
 $("accountRole").textContent="CURRENT ACCESS: "+profile.role.replace("_"," ").toUpperCase()+".";
 $("accountEmail").textContent=user.email||"";
 $("accountCharacter").textContent=roster?.character_name||"No character submitted.";
 $("accountDiscord").textContent=roster?.discord_id||"Not provided.";
 $("accountStatus").textContent=roster?(roster.approved?(roster.active?"APPROVED • ACTIVE":"APPROVED • INACTIVE"):"PENDING LEADERSHIP APPROVAL"):"NO ROSTER ENTRY";
}

$("accountLogout").onclick=async()=>{await sb.auth.signOut();window.location.href="../";};

async function boot(){
 const {data:{user}}=await sb.auth.getUser();
 await loadAccount(user);
}
boot();
