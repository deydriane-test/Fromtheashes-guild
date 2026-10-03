const c=window.GUILD_CONFIG||{};
const sb=window.supabase?.createClient(c.supabase?.url||"",c.supabase?.publishableKey||"",{
  auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:"pkce"}
});
const $=id=>document.getElementById(id);
let verifiedUser=null;
let verifiedDiscord=null;

function status(msg,type=""){
  const x=$("completeStatus");
  if(!x)return;
  x.className="formStatus"+(type?" "+type:"");
  x.textContent=msg;
}

async function getDiscordIdentity(user){
  const r=await sb.auth.getUserIdentities();
  if(!r.error){
    const i=(r.data?.identities||[]).find(x=>x.provider==="discord");
    if(i){
      const d=i.identity_data||{};
      return{
        discordId:i.identity_id||i.provider_id||d.provider_id||d.sub||d.id||null,
        discordName:d.global_name||d.username||d.user_name||d.preferred_username||d.full_name||d.name||"DISCORD MEMBER"
      };
    }
  }
  const m=user?.user_metadata||{};
  return{
    discordId:m.provider_id||m.sub||m.user_id||m.discord_id||null,
    discordName:m.global_name||m.username||m.user_name||m.preferred_username||m.full_name||m.name||"DISCORD MEMBER"
  };
}

async function establishSession(){
  const url=new URL(window.location.href);
  const oauthError=url.searchParams.get("error_description")||url.searchParams.get("error");
  if(oauthError) throw new Error(oauthError);

  const code=url.searchParams.get("code");
  if(code){
    status("CONNECTING YOUR DISCORD ACCOUNT…");
    const {data,error}=await sb.auth.exchangeCodeForSession(code);
    if(error) throw error;
    url.searchParams.delete("code");
    url.searchParams.delete("sb_flow_id");
    history.replaceState({},document.title,url.pathname+(url.search?url.search:""));
    if(data?.session) return data.session;
  }

  const {data,error}=await sb.auth.getSession();
  if(error) throw error;
  return data?.session||null;
}

async function boot(){
  try{
    if(!sb){window.location.replace("login.html");return;}
    status("VERIFYING DISCORD SESSION…");
    const session=await establishSession();
    if(!session?.user){
      status("YOUR DISCORD SESSION COULD NOT BE VERIFIED. PLEASE SIGN IN AGAIN.","error");
      return;
    }

    verifiedUser=session.user;
    verifiedDiscord=await getDiscordIdentity(verifiedUser);
    $("discordName").textContent=(verifiedDiscord.discordName||"DISCORD MEMBER").toUpperCase();
    $("discordId").textContent=verifiedDiscord.discordId?"DISCORD ID • "+verifiedDiscord.discordId:"DISCORD CONNECTED";

    const {data:existing,error:rosterError}=await sb.from("roster")
      .select("id,character_name,approved,active")
      .eq("user_id",verifiedUser.id)
      .maybeSingle();
    if(rosterError) console.warn("Roster lookup:",rosterError);
    if(existing){
      $("character").value=existing.character_name||"";
      status("YOUR GUILD APPLICATION ALREADY EXISTS. REDIRECTING…","success");
      setTimeout(()=>window.location.replace("../"),800);
      return;
    }
    status("");
  }catch(error){
    console.error("Discord callback:",error);
    status(error?.message||"DISCORD SIGN-IN COULD NOT BE COMPLETED. PLEASE SIGN IN AGAIN.","error");
  }
}

$("discordCompleteForm")?.addEventListener("submit",async e=>{
  e.preventDefault();
  const submit=e.currentTarget.querySelector('button[type="submit"]');
  try{
    const character=$("character").value.trim();
    if(character.length<2){status("ENTER YOUR CHARACTER NAME.","error");return;}
    if(!verifiedUser){
      status("YOUR DISCORD SESSION COULD NOT BE VERIFIED. PLEASE SIGN IN AGAIN.","error");
      return;
    }

    submit.disabled=true;
    status("SUBMITTING YOUR APPLICATION…");
    verifiedDiscord=verifiedDiscord||await getDiscordIdentity(verifiedUser);
    if(!verifiedDiscord?.discordId) throw new Error("DISCORD ID COULD NOT BE VERIFIED. PLEASE SIGN IN AGAIN.");

    const {data:existing,error:existingError}=await sb.from("roster")
      .select("id,user_id")
      .eq("discord_id",verifiedDiscord.discordId)
      .maybeSingle();
    if(existingError) throw existingError;
    if(existing){
      status("THAT DISCORD ACCOUNT IS ALREADY CONNECTED TO A GUILD ROSTER ENTRY.","error");
      submit.disabled=false;
      return;
    }

    const {error}=await sb.from("roster").insert({
      user_id:verifiedUser.id,
      character_name:character,
      discord_id:verifiedDiscord.discordId,
      discord_name:verifiedDiscord.discordName,
      approved:false,
      active:true
    });
    if(error) throw error;

    status("APPLICATION SUBMITTED. WELCOME TO FROM THE ASHES.","success");
    setTimeout(()=>window.location.replace("../"),1200);
  }catch(error){
    console.error("Guild application:",error);
    status(error?.message||"APPLICATION COULD NOT BE SUBMITTED. PLEASE TRY AGAIN.","error");
    if(submit) submit.disabled=false;
  }
});

boot();
