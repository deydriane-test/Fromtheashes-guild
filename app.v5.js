const isPhone=/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)||("ontouchstart" in window && Math.min(screen.width,screen.height)<900);
document.documentElement.classList.toggle("device-phone",isPhone);
document.documentElement.classList.toggle("device-computer",!isPhone);

const c=window.GUILD_CONFIG||{};
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
loadPublicContent();

async function syncHomeAuth(){
 const {data:{user}}=await appSupabase.auth.getUser();
 if(user)await renderSignedInHeader(user);else renderSignedOutHeader();
}
