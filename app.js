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
function formatRole(role){return (role||"member").replace("_"," ").toUpperCase()}
async function renderSignedInHeader(user){
 if(!accountLinks||!user)return;
 const {data:profile}=await appSupabase.from("profiles").select("username,role").eq("id",user.id).maybeSingle();
 if(!profile)return;
 accountLinks.innerHTML="";
 const identity=document.createElement("a");identity.className="signedInIdentity";identity.href="account/";identity.textContent=(profile.username||"MEMBER").toUpperCase()+" • "+formatRole(profile.role);
 const account=document.createElement("a");account.href="account/";account.textContent="ACCOUNT";
 const logout=document.createElement("button");logout.type="button";logout.className="headerLogout";logout.textContent="LOG OUT";
 logout.onclick=async()=>{await appSupabase.auth.signOut()};
 accountLinks.append(identity,account,logout);
}
function renderSignedOutHeader(){
 if(!accountLinks)return;
 accountLinks.innerHTML='<a href="account/register.html">SIGN UP</a><a href="account/#signin">SIGN IN</a>';
}
async function syncHomeAuth(){
 const {data:{user}}=await appSupabase.auth.getUser();
 if(user)renderSignedInHeader(user);else renderSignedOutHeader();
}
appSupabase.auth.onAuthStateChange((event,session)=>{
 if(event==="SIGNED_OUT") renderSignedOutHeader();
 else if(session?.user) renderSignedInHeader(session.user);
});
syncHomeAuth();
