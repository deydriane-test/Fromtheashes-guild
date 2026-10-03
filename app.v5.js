const isPhone=/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)||("ontouchstart" in window&&Math.min(screen.width,screen.height)<900);
document.documentElement.classList.toggle("device-phone",isPhone);
document.documentElement.classList.toggle("device-computer",!isPhone);

const c=window.GUILD_CONFIG||{};

for(const id of ["discordTop","discordHero","discordRecruit","discordRecruitBottom"]){
  const a=document.getElementById(id);
  if(a)a.href=c.discordUrl||"#recruit";
}

const eventTools=window.GuildEvents;
let publicEvents=eventTools.read({},c.events||{});
function renderAllEvents(){
  const upcoming=eventTools.ordered(publicEvents);
  const localZone=Intl.DateTimeFormat().resolvedOptions().timeZone||eventTools.TIME_ZONE;
  const note=document.getElementById("eventLocalTimeNote");
  if(note)note.textContent="Times shown in your local time ("+eventTools.zoneLabel(localZone)+"). Weekly events display their next occurrence.";
  for(const [id,limit] of [["upcomingEventList",3],["allEventList",Infinity]]){
    const list=document.getElementById(id);if(!list)continue;
    list.replaceChildren();
    if(!upcoming.length){const empty=document.createElement("p");empty.className="eventsEmpty";empty.textContent="No upcoming events yet. Check back soon.";list.append(empty);}
    else upcoming.slice(0,limit).forEach(({event,instant})=>list.append(eventTools.card(event,instant)));
  }
  const count=document.getElementById("allEventCount");if(count)count.textContent=upcoming.length+" UPCOMING";
}
renderAllEvents();

const revealObserver=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){entry.target.classList.add("visible");revealObserver.unobserve(entry.target);}
  });
},{threshold:.12});
document.querySelectorAll(".reveal").forEach(el=>revealObserver.observe(el));

let phoenixTimer;
function wakePhoenix(){
  document.body.classList.add("pageActive");
  clearTimeout(phoenixTimer);
  phoenixTimer=setTimeout(()=>document.body.classList.remove("pageActive"),700);
}
window.addEventListener("pointerdown",wakePhoenix,{passive:true});
window.addEventListener("keydown",wakePhoenix,{passive:true});
window.addEventListener("scroll",wakePhoenix,{passive:true});

const appSupabase=window.supabase?.createClient(c.supabase.url,c.supabase.publishableKey);
const accountLinks=document.getElementById("accountLinks");
const accountSignedOut=accountLinks?.querySelector(".accountSignedOut");
const accountMenu=document.getElementById("accountMenu");
const accountMenuTrigger=document.getElementById("accountMenuTrigger");
const accountDropdown=document.getElementById("accountDropdown");
const accountMenuName=document.getElementById("accountMenuName");
const accountMenuRole=document.getElementById("accountMenuRole");
const accountAvatar=document.getElementById("accountAvatar");
const accountPresenceDot=document.getElementById("accountPresenceDot");
const accountPresenceText=document.getElementById("accountPresenceText");
const adminMenuLink=document.getElementById("adminMenuLink");
const headerLogout=document.getElementById("headerLogout");

const AVATAR_ROOT="assets/avatars/generated/";
const BAR_ROOT="assets/character-bars/generated/bar-001/";
const ASSET_VERSION="20261003-bars5";
const accountBarArtwork=document.getElementById("accountBarArtwork");
let presenceChannel=null;
let presenceUserId=null;

function validAvatar(id){return /^avatar-\d{3}$/.test(id)&&Number(id.slice(7))>=1&&Number(id.slice(7))<=44?id:"avatar-001"}
function avatarSrc(id){return AVATAR_ROOT+validAvatar(id)+".webp?v="+ASSET_VERSION}
function barSrc(id){return BAR_ROOT+validAvatar(id)+".webp?v="+ASSET_VERSION}
function setPresenceState(state){
  const online=state==="online";
  if(accountPresenceText)accountPresenceText.textContent=online?"ONLINE":state==="connecting"?"CONNECTING":"OFFLINE";
  if(accountPresenceDot){
    accountPresenceDot.classList.toggle("online",online);
    accountPresenceDot.classList.toggle("connecting",state==="connecting");
  }
}
async function stopPresence(){
  if(!presenceChannel)return;
  try{await presenceChannel.untrack()}catch(_){}
  try{await appSupabase.removeChannel(presenceChannel)}catch(_){}
  presenceChannel=null;presenceUserId=null;setPresenceState("offline");
}
async function startPresence(user,characterName,avatarId){
  if(!appSupabase||!user)return;
  if(presenceChannel&&presenceUserId===user.id)return;
  await stopPresence();
  presenceUserId=user.id;
  setPresenceState("connecting");
  presenceChannel=appSupabase.channel("guild-presence",{
    config:{presence:{key:user.id}}
  });
  presenceChannel.subscribe(async status=>{
    if(status==="SUBSCRIBED"){
      const result=await presenceChannel.track({
        user_id:user.id,
        character_name:characterName||"MEMBER",
        avatar_id:avatarId||"avatar-001",
        online_at:new Date().toISOString()
      });
      setPresenceState(result==="ok"?"online":"online");
    }else if(status==="CHANNEL_ERROR"||status==="TIMED_OUT"||status==="CLOSED"){
      setPresenceState("offline");
    }
  });
}

function formatRole(role){return(role||"member").replace("_"," ").toUpperCase()}
function closeAccountMenu(){
  if(!accountDropdown||!accountMenuTrigger)return;
  accountDropdown.hidden=true;
  accountMenuTrigger.setAttribute("aria-expanded","false");
}
accountMenuTrigger?.addEventListener("click",e=>{
  e.stopPropagation();
  const open=!accountDropdown.hidden;
  accountDropdown.hidden=open;
  accountMenuTrigger.setAttribute("aria-expanded",String(!open));
});
document.addEventListener("click",e=>{if(accountMenu&&!accountMenu.contains(e.target))closeAccountMenu();});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeAccountMenu();});

async function renderSignedInHeader(user){
  if(!accountLinks||!user)return;
  const [profileResult,rosterResult]=await Promise.all([
    appSupabase.from("profiles").select("username,role,avatar_id").eq("id",user.id).maybeSingle(),
    appSupabase.from("roster").select("character_name").eq("user_id",user.id).maybeSingle()
  ]);
  const profile=profileResult.data;
  if(!profile)return;
  const characterName=rosterResult.data?.character_name||profile.username||"MEMBER";
  const avatarId=validAvatar(profile.avatar_id);
  if(accountSignedOut)accountSignedOut.hidden=true;
  if(accountMenu)accountMenu.hidden=false;
  if(accountMenuName)accountMenuName.textContent=characterName.toUpperCase();
  if(accountMenuRole)accountMenuRole.textContent=formatRole(profile.role);
  if(accountAvatar){accountAvatar.src=avatarSrc(avatarId);accountAvatar.alt=characterName+" avatar"}
  if(accountBarArtwork)accountBarArtwork.src=barSrc(avatarId);
  if(adminMenuLink)adminMenuLink.hidden=!["owner","site_mod","officer"].includes(profile.role);
  closeAccountMenu();
  startPresence(user,characterName,avatarId);
}
function renderSignedOutHeader(){
  stopPresence();
  if(accountSignedOut)accountSignedOut.hidden=false;
  if(accountMenu)accountMenu.hidden=true;
  closeAccountMenu();
}
headerLogout?.addEventListener("click",async()=>{closeAccountMenu();await appSupabase.auth.signOut();});

async function syncHomeAuth(){
  if(!appSupabase)return;
  const {data:{user}}=await appSupabase.auth.getUser();
  if(user)await renderSignedInHeader(user);else renderSignedOutHeader();
}

async function loadPublicContent(){
  if(!appSupabase)return;
  const {data,error}=await appSupabase.from("site_content").select("section,content").in("section",["guild","events","leadership"]);
  if(error){console.warn("Public content load failed:",error);return;}
  const sections={};
  (data||[]).forEach(row=>sections[row.section]=row.content||{});

  const guild=sections.guild||{};
  if(guild.discord){
    for(const id of ["discordTop","discordHero","discordRecruit","discordRecruitBottom"]){
      const a=document.getElementById(id);if(a)a.href=guild.discord;
    }
  }
  const ann=document.getElementById("announcement");
  const annText=document.getElementById("announcementText");
  if(ann&&annText&&guild.announcement){
    ann.hidden=false;annText.textContent=guild.announcement;
  }

  publicEvents=eventTools.read(sections.events||{},c.events||{});
  renderAllEvents();

  const leadership=sections.leadership||{};
  document.querySelectorAll(".leader").forEach(card=>{
    const name=card.querySelector("h3")?.textContent?.trim();
    const bio=card.querySelector("p");
    if(name&&bio&&leadership[name]?.bio)bio.textContent=leadership[name].bio;
  });
}

if(appSupabase){
  appSupabase.auth.onAuthStateChange((event,session)=>{
    if(event==="SIGNED_OUT")renderSignedOutHeader();
    else if(session?.user)renderSignedInHeader(session.user);
  });
}
window.addEventListener("beforeunload",()=>{try{presenceChannel?.untrack()}catch(_){}});
syncHomeAuth();
loadPublicContent();

// Reorder at schedule boundaries and pick up newly published events while the page is open.
setInterval(()=>{if(!document.hidden){renderAllEvents();loadPublicContent();}},60000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden){renderAllEvents();loadPublicContent();}});
