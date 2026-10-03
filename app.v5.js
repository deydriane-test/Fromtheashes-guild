const isPhone=/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)||("ontouchstart" in window&&Math.min(screen.width,screen.height)<900);
document.documentElement.classList.toggle("device-phone",isPhone);
document.documentElement.classList.toggle("device-computer",!isPhone);

const c=window.GUILD_CONFIG||{};
const SOURCE_TZ=c.timezone||"America/Chicago";

for(const id of ["discordTop","discordHero","discordRecruit","discordRecruitBottom"]){
  const a=document.getElementById(id);
  if(a)a.href=c.discordUrl||"#recruit";
}

function partsInZone(date,timeZone){
  const parts=new Intl.DateTimeFormat("en-US",{
    timeZone,year:"numeric",month:"2-digit",day:"2-digit",
    hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23",
    weekday:"short"
  }).formatToParts(date);
  return Object.fromEntries(parts.filter(p=>p.type!=="literal").map(p=>[p.type,p.value]));
}

function zoneOffsetMs(date,timeZone){
  const p=partsInZone(date,timeZone);
  const asUTC=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);
  return asUTC-date.getTime();
}

function wallTimeToUtc(year,month,day,hour,minute,timeZone){
  let guess=new Date(Date.UTC(year,month-1,day,hour,minute,0));
  for(let i=0;i<3;i++){
    const offset=zoneOffsetMs(guess,timeZone);
    guess=new Date(Date.UTC(year,month-1,day,hour,minute,0)-offset);
  }
  return guess;
}

const DAY_INDEX={Sunday:0,Monday:1,Tuesday:2,Wednesday:3,Thursday:4,Friday:5,Saturday:6};

function nextEventInstant(event){
  if(!event?.day||!event?.time)return null;
  const [hour,minute]=String(event.time).split(":").map(Number);
  if(!Number.isFinite(hour)||!Number.isFinite(minute))return null;

  const now=new Date();
  const src=partsInZone(now,SOURCE_TZ);
  const currentY=+src.year,currentM=+src.month,currentD=+src.day;
  const srcWeekday=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(src.weekday);
  const target=DAY_INDEX[event.day] ?? 0;
  let delta=(target-srcWeekday+7)%7;

  let candidateDate=new Date(Date.UTC(currentY,currentM-1,currentD+delta));
  let y=candidateDate.getUTCFullYear(),m=candidateDate.getUTCMonth()+1,d=candidateDate.getUTCDate();
  let instant=wallTimeToUtc(y,m,d,hour,minute,SOURCE_TZ);
  if(instant<=now){
    candidateDate=new Date(Date.UTC(y,m-1,d+7));
    y=candidateDate.getUTCFullYear();m=candidateDate.getUTCMonth()+1;d=candidateDate.getUTCDate();
    instant=wallTimeToUtc(y,m,d,hour,minute,SOURCE_TZ);
  }
  return instant;
}

function formatLocalEvent(event){
  const instant=nextEventInstant(event);
  if(!instant)return null;
  const localZone=Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC";
  const weekday=new Intl.DateTimeFormat("en-US",{weekday:"long",timeZone:localZone}).format(instant);
  const time=new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit",hour12:true,timeZone:localZone}).format(instant);
  const zone=new Intl.DateTimeFormat("en-US",{timeZoneName:"short",timeZone:localZone}).formatToParts(instant).find(p=>p.type==="timeZoneName")?.value||localZone;
  return{weekday,time,zone,instant,localZone};
}

function renderEvent(prefix,event){
  const meta=document.getElementById(prefix+"Meta");
  const timeEl=document.getElementById(prefix);
  if(!meta&&!timeEl)return;
  if(!event?.enabled){
    if(meta)meta.textContent="SCHEDULE COMING SOON";
    if(timeEl)timeEl.textContent="TBD";
    return;
  }
  const local=formatLocalEvent(event);
  if(!local){
    if(meta)meta.textContent=(event.day||"").toUpperCase()+" • "+(event.time||"");
    if(timeEl)timeEl.textContent=event.time||"";
    return;
  }
  if(meta)meta.textContent=`${local.weekday.toUpperCase()} • ${local.time} ${local.zone}`;
  if(timeEl)timeEl.textContent=local.time.replace(" ","\u00a0");
}

function renderAllEvents(events){
  renderEvent("raid",events?.raid);
  renderEvent("expedition",events?.expedition);
  renderEvent("elysium",events?.elysium);

  const heroMap=[
    ["heroRaidMeta",events?.raid],
    ["heroExpeditionMeta",events?.expedition],
    ["heroElysiumMeta",events?.elysium]
  ];
  heroMap.forEach(([id,event])=>{
    const el=document.getElementById(id);
    const local=formatLocalEvent(event);
    if(el&&local)el.textContent=local.weekday.toUpperCase()+" • "+local.time+" "+local.zone;
  });

  const primary=formatLocalEvent(events?.raid||events?.expedition||events?.elysium);
  const stickyDay=document.getElementById("stickyEventDay");
  const stickyTime=document.getElementById("stickyEventTime");
  const stickyZone=document.getElementById("stickyEventZone");
  if(primary){
    if(stickyDay)stickyDay.textContent=primary.weekday.toUpperCase()+" NIGHT";
    if(stickyTime)stickyTime.textContent=primary.time;
    if(stickyZone)stickyZone.textContent="Your local time • "+primary.zone;
  }
}

renderAllEvents(c.events||{});

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
const adminMenuLink=document.getElementById("adminMenuLink");
const headerLogout=document.getElementById("headerLogout");

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
  const {data:profile}=await appSupabase.from("profiles").select("username,role").eq("id",user.id).maybeSingle();
  if(!profile)return;
  if(accountSignedOut)accountSignedOut.hidden=true;
  if(accountMenu)accountMenu.hidden=false;
  if(accountMenuName)accountMenuName.textContent=(profile.username||"MEMBER").toUpperCase();
  if(accountMenuRole)accountMenuRole.textContent=" • "+formatRole(profile.role);
  if(adminMenuLink)adminMenuLink.hidden=!["owner","site_mod","officer"].includes(profile.role);
  closeAccountMenu();
}
function renderSignedOutHeader(){
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

  const dbEvents=sections.events||{};
  const merged={
    raid:{...(c.events?.raid||{}),...(dbEvents.raid||{}),enabled:true},
    expedition:{...(c.events?.expedition||{}),...(dbEvents.expedition||{}),enabled:true},
    elysium:{day:"Sunday",time:"20:55",enabled:true,...(dbEvents.elysium||{})}
  };
  renderAllEvents(merged);

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
syncHomeAuth();
loadPublicContent();
