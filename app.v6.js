const isPhone=/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)||("ontouchstart" in window && Math.min(screen.width,screen.height)<900);
document.documentElement.classList.toggle("device-phone",isPhone);
document.documentElement.classList.toggle("device-computer",!isPhone);

const c=window.GUILD_CONFIG||{};
const GUILD_TZ=c.timezone||"America/Chicago";
const viewerTZ=(()=>{try{return new Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC"}catch{return"UTC"}})();
const weekdayIndex={Sunday:0,Monday:1,Tuesday:2,Wednesday:3,Thursday:4,Friday:5,Saturday:6};
function zonedParts(date,tz){
 const p=new Intl.DateTimeFormat("en-US",{timeZone:tz,year:"numeric",month:"numeric",day:"numeric",hour:"numeric",minute:"numeric",second:"numeric",hourCycle:"h23"}).formatToParts(date);
 const o={};p.forEach(x=>{if(x.type!=="literal")o[x.type]=x.value});return{year:+o.year,month:+o.month,day:+o.day,hour:+o.hour,minute:+o.minute,second:+o.second};
}
function zoneOffsetMs(date,tz){
 const p=zonedParts(date,tz);return Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second)-date.getTime();
}
function parseGuildTime(value){
 const s=String(value||"").trim().replace(/\\b(?:CT|CST|CDT|CENTRAL(?: TIME)?)\\b/ig,"").trim();
 let m=s.match(/^(\\d{1,2}):(\\d{2})\\s*(AM|PM)?$/i);if(!m)return null;
 let h=+m[1],min=+m[2],ap=(m[3]||"").toUpperCase();
 if(ap){if(h===12)h=0;if(ap==="PM")h+=12} if(h>23||min>59)return null;return{hour:h,minute:min};
}
function nextEventInstant(day,time,tz){
 const target=weekdayIndex[String(day||"Sunday")];const now=new Date();const cur=zonedParts(now,tz);const curDate=new Date(Date.UTC(cur.year,cur.month-1,cur.day));
 const delta=(target-curDate.getUTCDay()+7)%7;curDate.setUTCDate(curDate.getUTCDate()+delta);
 const t=parseGuildTime(time);if(!t)return null;
 let naive=Date.UTC(curDate.getUTCFullYear(),curDate.getUTCMonth(),curDate.getUTCDate(),t.hour,t.minute,0);
 let actual=new Date(naive-zoneOffsetMs(new Date(naive),tz));
 // If the offset changes around the event, recalculate once using the resolved instant.
 actual=new Date(naive-zoneOffsetMs(actual,tz));
 if(actual<now){curDate.setUTCDate(curDate.getUTCDate()+7);naive=Date.UTC(curDate.getUTCFullYear(),curDate.getUTCMonth(),curDate.getUTCDate(),t.hour,t.minute,0);actual=new Date(naive-zoneOffsetMs(new Date(naive),tz));actual=new Date(naive-zoneOffsetMs(actual,tz));}
 return actual;
}
function localEventTime(event){
 if(!event?.day||!event?.time)return null;const instant=nextEventInstant(event.day,event.time,GUILD_TZ);if(!instant)return null;
 const fmt=new Intl.DateTimeFormat("en-US",{timeZone:viewerTZ,weekday:"long",hour:"numeric",minute:"2-digit",timeZoneName:"short"});
 return fmt.format(instant);
}
function localTimeOnly(event){
 if(!event?.day||!event?.time)return null;const instant=nextEventInstant(event.day,event.time,GUILD_TZ);if(!instant)return null;
 return new Intl.DateTimeFormat("en-US",{timeZone:viewerTZ,hour:"numeric",minute:"2-digit",timeZoneName:"short"}).format(instant);
}
function local24(event){
 if(!event?.day||!event?.time)return null;const instant=nextEventInstant(event.day,event.time,GUILD_TZ);if(!instant)return null;
 return new Intl.DateTimeFormat("en-US",{timeZone:viewerTZ,hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(instant);
}
function sourceTime(event){return event?.time||""}
function applyLocalEventTimes(events){
 const all=events||{};const items=[["raid",all.raid],["expedition",all.expedition],["elysium",all.elysium]];
 items.forEach(([key,event])=>{
  const card=document.querySelector(".eventCard."+key);if(!card||!event)return;
  const meta=card.querySelector(".eventInfo span"),big=card.querySelector("b");const local=localTimeOnly(event),clock=local24(event);
  if(meta&&local)meta.textContent=(event.day||"").toUpperCase()+" • "+local;
  if(big&&clock)big.textContent=clock;
 });
 const first=all.raid;const sticky=document.querySelector(".stickyNote");
 if(sticky&&first){const local=localTimeOnly(first);if(local){const strong=sticky.querySelector("strong"),small=sticky.querySelector("small");if(strong)strong.textContent=local;if(small)small.textContent="Your local time";}}
 const note=document.querySelector(".smallNote");if(note)note.textContent="Event times are automatically shown in your local time. Guild schedules are set in Central Time.";
 const banner=document.querySelector(".ruleBanner");if(banner&&first){const local=localTimeOnly(first);if(local)banner.innerHTML="CURRENT GUILD NOTICE <b>•</b> RAID / EXPEDITION "+(first.day||"SUNDAY").toUpperCase()+" "+local+" <b>•</b> 2-DAY INACTIVITY RULE <b>•</b> ACTIVE DISCORD";}
 const rule=document.querySelector("#rules .ruleCards article:nth-child(3) p");if(rule&&first){const local=localTimeOnly(first);if(local)rule.innerHTML="Guild Raid and Guild Expedition are <b>"+(first.day||"Sunday")+" at "+local+"</b>. Join when you can.";}
}
for(const id of ["discordTop","discordHero","discordRecruit"]){
 const a=document.getElementById(id);
 if(a)a.href=c.discordUrl||"#recruit";
}
function render(id,e){
 const x=document.getElementById(id),m=document.getElementById(id+"Meta");
 if(!x)return;
 if(e?.enabled){x.textContent=e.day.toUpperCase()+" • "+e.time;if(m)m.textContent="Guild event";}
 else{x.textContent="SET BY ADMIN";if(m)m.textContent="Schedule coming soon";}
}
render("raid",c.events?.raid);
render("expedition",c.events?.expedition);
applyLocalEventTimes(c.events);
const tz=document.getElementById("tz");
if(tz)tz.textContent=(c.timezone||"America/Chicago")==="America/Chicago"?"CENTRAL TIME":c.timezone.toUpperCase();

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

function formatRole(role){return (role||"member").replace("_"," ").toUpperCase()}

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

document.addEventListener("click",e=>{
 if(accountMenu&&!accountMenu.contains(e.target))closeAccountMenu();
});

document.addEventListener("keydown",e=>{
 if(e.key==="Escape")closeAccountMenu();
});

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

headerLogout?.addEventListener("click",async()=>{
 closeAccountMenu();
 await appSupabase.auth.signOut();
});

appSupabase.auth.onAuthStateChange((event,session)=>{
 if(event==="SIGNED_OUT")renderSignedOutHeader();
 else if(session?.user)renderSignedInHeader(session.user);
});
syncHomeAuth();
loadPublicEventSchedule();

async function loadPublicEventSchedule(){
 try{
  const {data}=await appSupabase.from("site_content").select("section,content").eq("section","events").maybeSingle();
  const events=data?.content;
  if(events){applyLocalEventTimes(events);}
 }catch(error){console.warn("Could not load live event schedule",error)}
}
loadPublicContent();

async function syncHomeAuth(){
 const {data:{user}}=await appSupabase.auth.getUser();
 if(user)await renderSignedInHeader(user);else renderSignedOutHeader();
}
