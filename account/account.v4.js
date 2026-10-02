const c=window.GUILD_CONFIG||{};
const sb=window.supabase?.createClient(c.supabase?.url||"",c.supabase?.publishableKey||"");
const $=id=>document.getElementById(id);

function showError(message){
 const x=$("accountError");
 if(x){x.hidden=false;x.textContent=message}
}

async function boot(){
 try{
  if(!sb){showError("ACCOUNT SERVICES COULD NOT LOAD. PLEASE REFRESH.");return}
  const {data,error}=await sb.auth.getUser();
  if(error){console.error(error);window.location.href="login.html";return}
  const user=data?.user;
  if(!user){window.location.href="login.html";return}

  const profileResult=await sb.from("profiles").select("username,role").eq("id",user.id).maybeSingle();
  if(profileResult.error||!profileResult.data){
   console.error(profileResult.error);
   showError("WE COULD NOT LOAD YOUR GUILD PROFILE.");
   return;
  }
  const profile=profileResult.data;
  const rosterResult=await sb.from("roster").select("character_name,discord_id,approved,active").eq("user_id",user.id).maybeSingle();
  if(rosterResult.error)console.warn(rosterResult.error);
  const roster=rosterResult.data;

  $("accountUsername").textContent=(profile.username||"MEMBER").toUpperCase()+".";
  $("accountRole").textContent="CURRENT ACCESS: "+(profile.role||"member").replace("_"," ").toUpperCase()+".";
  $("accountEmail").textContent=user.email||"Not available.";
  $("accountCharacter").textContent=roster?.character_name||"No character submitted.";
  $("accountDiscord").textContent=roster?.discord_id||"Not provided.";
  $("accountStatus").textContent=roster?(roster.approved?(roster.active?"APPROVED • ACTIVE":"APPROVED • INACTIVE"):"PENDING LEADERSHIP APPROVAL"):"NO ROSTER ENTRY";

  $("accountLogout").onclick=async()=>{
   $("accountLogout").disabled=true;
   $("accountLogout").textContent="LOGGING OUT…";
   const {error}=await sb.auth.signOut();
   if(error){
    console.error(error);
    $("accountLogout").disabled=false;
    $("accountLogout").textContent="LOG OUT";
    showError("LOG OUT FAILED. PLEASE TRY AGAIN.");
    return;
   }
   window.location.replace("../");
  };
 }catch(error){
  console.error(error);
  showError("ACCOUNT SERVICES ENCOUNTERED AN ERROR. PLEASE REFRESH.");
 }
}
boot();