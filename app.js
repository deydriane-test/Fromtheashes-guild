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
  if(entry.isIntersecting){
   entry.target.classList.add("visible");
   revealObserver.unobserve(entry.target);
  }
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

/* Supabase-powered public roster + signup. The publishable key is intentionally
   browser-visible; Row Level Security controls what the browser may do. */
const sbConfig=c.supabase;
const sb=(window.supabase&&sbConfig?.url&&sbConfig?.publishableKey)
  ? window.supabase.createClient(sbConfig.url,sbConfig.publishableKey)
  : null;

async function loadRoster(){
 const list=document.getElementById("rosterList");
 const count=document.getElementById("rosterCount");
 if(!list||!sb)return;
 const {data,error}=await sb.from("roster")
   .select("character_name,discord_name")
   .eq("approved",true)
   .eq("active",true)
   .order("character_name",{ascending:true});
 if(error){
   list.innerHTML='<div class="rosterEmpty">ROSTER TEMPORARILY UNAVAILABLE</div>';
   if(count)count.textContent="ROSTER OFFLINE";
   return;
 }
 if(count)count.textContent=data.length+" ACTIVE MEMBER"+(data.length===1?"":"S");
 if(!data.length){
   list.innerHTML='<div class="rosterEmpty">NO APPROVED MEMBERS YET — BE THE FIRST.</div>';
   return;
 }
 list.innerHTML="";
 data.forEach(member=>{
   const card=document.createElement("article");
   card.className="rosterMember interactive";
   const name=document.createElement("h3");
   name.className="rosterMemberName";
   name.textContent=member.character_name;
   card.appendChild(name);
   if(member.discord_name){
     const discord=document.createElement("div");
     discord.className="rosterMemberDiscord";
     discord.textContent="DISCORD • "+member.discord_name;
     card.appendChild(discord);
   }
   list.appendChild(card);
 });
}

function setupSignup(){
 const form=document.getElementById("rosterSignup");
 const status=document.getElementById("signupStatus");
 if(!form||!sb)return;
 form.addEventListener("submit",async event=>{
   event.preventDefault();
   const character=document.getElementById("signupCharacter").value.trim();
   const discord=document.getElementById("signupDiscord").value.trim()||null;
   if(!character)return;
   status.className="formStatus";
   status.textContent="ADDING YOU TO THE ROSTER…";
   const {error}=await sb.from("roster").insert({
     character_name:character,
     discord_name:discord
   });
   if(error){
     status.className="formStatus error";
     status.textContent=error.code==="23505"
       ?"THAT CHARACTER NAME IS ALREADY ON THE ROSTER."
       :"COULDN’T SUBMIT THAT SIGNUP. TRY AGAIN.";
     return;
   }
   form.reset();
   status.className="formStatus success";
   status.textContent="YOU’RE IN. A LEADER WILL APPROVE YOUR ROSTER ENTRY.";
 });
}

loadRoster();
setupSignup();
