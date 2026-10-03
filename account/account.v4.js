const c=window.GUILD_CONFIG||{};
const sb=window.supabase?.createClient(c.supabase?.url||"",c.supabase?.publishableKey||"");
const $=id=>document.getElementById(id);
const AVATAR_COUNT=44;
const AVATAR_ROOT="../assets/FromTheAshes_Exact_Site_Asset_Pack/";
let currentAvatar="avatar-001";
let selectedAvatar="avatar-001";
let currentUser=null;

function avatarId(n){return "avatar-"+String(n).padStart(3,"0")}
function avatarSrc(id){return AVATAR_ROOT+(id||"avatar-001")+".webp"}
function avatarLabel(id){return (id||"avatar-001").replace("avatar-","AVATAR ")}
function showError(message){const x=$("accountError");if(x){x.hidden=false;x.textContent=message}}
function setSaveStatus(message,type=""){
  const x=$("avatarSaveStatus");if(!x)return;
  x.textContent=message||"";x.className="avatarSaveStatus"+(type?" "+type:"");
}
function syncAvatarSelection(){
  $("avatarPreviewImage").src=avatarSrc(selectedAvatar);
  $("avatarPreviewLabel").textContent=avatarLabel(selectedAvatar);
  $("avatarCurrentLabel").textContent=selectedAvatar===currentAvatar?"CURRENT AVATAR":"NEW SELECTION";
  document.querySelectorAll(".avatarChoice").forEach(btn=>{
    const selected=btn.dataset.avatar===selectedAvatar;
    btn.classList.toggle("selected",selected);
    btn.setAttribute("aria-pressed",String(selected));
  });
  $("saveAvatar").disabled=selectedAvatar===currentAvatar;
  if(selectedAvatar===currentAvatar)setSaveStatus("");
}
function buildAvatarGrid(){
  const grid=$("avatarGrid");if(!grid)return;
  grid.replaceChildren();
  for(let i=1;i<=AVATAR_COUNT;i++){
    const id=avatarId(i);
    const btn=document.createElement("button");
    btn.type="button";btn.className="avatarChoice";btn.dataset.avatar=id;
    btn.setAttribute("role","listitem");btn.setAttribute("aria-label","Select "+avatarLabel(id));
    btn.setAttribute("aria-pressed","false");
    const img=document.createElement("img");
    img.src=avatarSrc(id);img.alt="";img.loading="lazy";img.decoding="async";
    btn.append(img);
    btn.addEventListener("click",()=>{selectedAvatar=id;setSaveStatus("");syncAvatarSelection()});
    grid.append(btn);
  }
}
async function saveAvatar(){
  if(!currentUser||selectedAvatar===currentAvatar)return;
  const button=$("saveAvatar");
  button.disabled=true;button.textContent="SAVING…";setSaveStatus("SAVING AVATAR…");
  const {data,error}=await sb.from("profiles")
    .update({avatar_id:selectedAvatar})
    .eq("id",currentUser.id)
    .select("avatar_id")
    .maybeSingle();
  button.textContent="SAVE AVATAR";
  if(error||!data){
    console.error(error);
    setSaveStatus("AVATAR COULD NOT BE SAVED.","error");
    button.disabled=false;
    return;
  }
  currentAvatar=data.avatar_id||selectedAvatar;
  selectedAvatar=currentAvatar;
  syncAvatarSelection();
  setSaveStatus("AVATAR SAVED.","success");
}

async function boot(){
  try{
    if(!sb){showError("ACCOUNT SERVICES COULD NOT LOAD. PLEASE REFRESH.");return}
    const {data,error}=await sb.auth.getUser();
    if(error||!data?.user){window.location.href="login.html";return}
    currentUser=data.user;

    const [profileResult,rosterResult]=await Promise.all([
      sb.from("profiles").select("username,role,avatar_id").eq("id",currentUser.id).maybeSingle(),
      sb.from("roster").select("character_name,discord_id,discord_name,approved,active").eq("user_id",currentUser.id).maybeSingle()
    ]);
    if(profileResult.error||!profileResult.data){showError("WE COULD NOT LOAD YOUR GUILD PROFILE.");return}
    const profile=profileResult.data;
    const roster=rosterResult.data;

    const displayName=roster?.character_name||profile.username||"MEMBER";
    $("accountUsername").textContent=displayName.toUpperCase()+".";
    $("accountRole").textContent="CURRENT ACCESS: "+(profile.role||"member").replace("_"," ").toUpperCase()+".";
    const discordLabel=roster?.discord_name||"Discord account";
    $("accountDiscord").textContent=roster?.discord_id?(discordLabel+" • "+roster.discord_id):"Not connected";
    $("accountCharacter").textContent=roster?.character_name||"No character submitted.";
    $("accountStatus").textContent=roster?(roster.approved?(roster.active?"APPROVED • ACTIVE":"APPROVED • INACTIVE"):"PENDING LEADERSHIP APPROVAL"):"NO ROSTER ENTRY";

    currentAvatar=profile.avatar_id||"avatar-001";
    selectedAvatar=currentAvatar;
    buildAvatarGrid();
    syncAvatarSelection();
    $("saveAvatar").addEventListener("click",saveAvatar);

    $("accountLogout").onclick=async()=>{
      $("accountLogout").disabled=true;$("accountLogout").textContent="LOGGING OUT…";
      const {error}=await sb.auth.signOut();
      if(error){$("accountLogout").disabled=false;$("accountLogout").textContent="LOG OUT";showError("LOG OUT FAILED. PLEASE TRY AGAIN.");return}
      window.location.replace("../");
    };
  }catch(error){
    console.error(error);showError("ACCOUNT SERVICES ENCOUNTERED AN ERROR. PLEASE REFRESH.");
  }
}
boot();