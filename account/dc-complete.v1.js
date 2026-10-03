const c=window.GUILD_CONFIG||{};
const sb=window.supabase?.createClient(c.supabase?.url||"",c.supabase?.publishableKey||"",{
  auth:{
    persistSession:true,
    autoRefreshToken:true,
    detectSessionInUrl:true,
    flowType:"implicit"
  }
});
const $=id=>document.getElementById(id);

function status(msg,type=""){
  const x=$("completeStatus");
  if(!x)return;
  x.className="formStatus"+(type?" "+type:"");
  x.textContent=msg;
}

async function getDiscordIdentity(user){
  const {data}=await sb.auth.getUserIdentities();
  const i=(data?.identities||[]).find(x=>x.provider==="discord");
  if(i){
    const d=i.identity_data||{};
    return{
      discordId:i.identity_id||i.provider_id||d.provider_id||d.sub||d.id||null,
      discordName:d.global_name||d.username||d.user_name||d.preferred_username||d.full_name||d.name||user?.email||"DISCORD MEMBER"
    };
  }
  const m=user?.user_metadata||{};
  return{
    discordId:m.provider_id||m.sub||m.user_id||m.discord_id||null,
    discordName:m.global_name||m.username||m.user_name||m.preferred_username||m.full_name||m.name||user?.email||"DISCORD MEMBER"
  };
}

async function waitForSession(){
  const first=await sb.auth.getSession();
  if(first.data?.session?.user)return first.data.session;

  return await new Promise(resolve=>{
    let done=false;
    const finish=session=>{
      if(done)return;
      done=true;
      clearTimeout(timer);
      subscription.unsubscribe();
      resolve(session?.user?session:null);
    };
    const {data:{subscription}}=sb.auth.onAuthStateChange((event,session)=>{
      if((event==="SIGNED_IN"||event==="INITIAL_SESSION")&&session?.user)finish(session);
    });
    const timer=setTimeout(async()=>{
      const last=await sb.auth.getSession();
      finish(last.data?.session||null);
    },3000);
  });
}

async function boot(){
  try{
    if(!sb){window.location.replace("login.html");return;}
    status("VERIFYING DISCORD SESSION…");

    const session=await waitForSession();
    const user=session?.user||null;
    if(!user){
      status("YOUR DISCORD SESSION COULD NOT BE VERIFIED. PLEASE SIGN IN AGAIN.","error");
      return;
    }

    const discord=await getDiscordIdentity(user);
    $("discordName").textContent=(discord.discordName||"DISCORD MEMBER").toUpperCase();
    $("discordId").textContent=discord.discordId?"DISCORD ID • "+discord.discordId:"DISCORD CONNECTED";

    const {data:existing,error}=await sb.from("roster")
      .select("id,character_name,approved,active")
      .eq("user_id",user.id)
      .maybeSingle();
    if(error)throw error;

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

    const {data:{user},error:userError}=await sb.auth.getUser();
    if(userError||!user){
      status("YOUR DISCORD SESSION COULD NOT BE VERIFIED. PLEASE SIGN IN AGAIN.","error");
      return;
    }

    submit.disabled=true;
    status("SUBMITTING YOUR APPLICATION…");
    const discord=await getDiscordIdentity(user);
    if(!discord?.discordId)throw new Error("DISCORD ID COULD NOT BE VERIFIED. PLEASE SIGN IN AGAIN.");

    const {data:existing,error:existingError}=await sb.from("roster")
      .select("id,user_id")
      .eq("discord_id",discord.discordId)
      .maybeSingle();
    if(existingError)throw existingError;
    if(existing){
      status("THAT DISCORD ACCOUNT IS ALREADY CONNECTED TO A GUILD ROSTER ENTRY.","error");
      submit.disabled=false;
      return;
    }

    const {error}=await sb.from("roster").insert({
      user_id:user.id,
      character_name:character,
      discord_id:discord.discordId,
      discord_name:discord.discordName,
      approved:false,
      active:true
    });
    if(error)throw error;

    status("APPLICATION SUBMITTED. WELCOME TO FROM THE ASHES.","success");
    setTimeout(()=>window.location.replace("../"),1200);
  }catch(error){
    console.error("Guild application:",error);
    status(error?.message||"APPLICATION COULD NOT BE SUBMITTED. PLEASE TRY AGAIN.","error");
    if(submit)submit.disabled=false;
  }
});
boot();