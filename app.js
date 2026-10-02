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

const root=document.documentElement,header=document.querySelector("header");
const isMobile=matchMedia("(max-width:800px)").matches;
let ticking=false;
function updateScroll(){
 const max=Math.max(1,document.documentElement.scrollHeight-window.innerHeight);
 const p=Math.min(1,Math.max(0,window.scrollY/max));
 root.style.setProperty("--pageHue",(12+p*28).toFixed(1));
 if(!isMobile){
  root.style.setProperty("--accentOpacity",(0.11+p*0.12).toFixed(3));
  root.style.setProperty("--goldOpacity",(0.04+p*0.05).toFixed(3));
  root.style.setProperty("--glowY",(20+p*55)+"%");
  root.style.setProperty("--glowShift",(-p*10*window.innerHeight/100)+"px");
  root.style.setProperty("--phoenixShift",(-p*18)+"px");
  root.style.setProperty("--phoenixScale",(1+p*.035).toFixed(3));
  root.style.setProperty("--hue",(p*28)+"deg");
  if(header)header.classList.toggle("scrolled",window.scrollY>20);
 }
 ticking=false;
}
window.addEventListener("scroll",()=>{if(!ticking){requestAnimationFrame(updateScroll);ticking=true;}},{passive:true});
updateScroll();

const art=document.querySelector(".hero");
const canHover=matchMedia("(hover:hover) and (pointer:fine)").matches;
if(art && canHover && !matchMedia("(prefers-reduced-motion: reduce)").matches){
 window.addEventListener("pointermove",e=>{
   const r=art.getBoundingClientRect();
   art.style.setProperty("--mx",(e.clientX-r.left-r.width/2)+"px");
   art.style.setProperty("--my",(e.clientY-r.top-r.height/2)+"px");
 },{passive:true});
}

const revealObserver=new IntersectionObserver(entries=>{
 entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("visible");revealObserver.unobserve(entry.target);}});
},{threshold:.12});
document.querySelectorAll(".reveal").forEach(el=>revealObserver.observe(el));

if(canHover && !matchMedia("(prefers-reduced-motion: reduce)").matches){
 document.querySelectorAll(".interactive").forEach(card=>{
   card.addEventListener("pointermove",e=>{
     const r=card.getBoundingClientRect();
     const rx=((e.clientY-r.top)/r.height-.5)*-4;
     const ry=((e.clientX-r.left)/r.width-.5)*5;
     card.style.setProperty("--rx",rx+"deg");
     card.style.setProperty("--ry",ry+"deg");
   });
   card.addEventListener("pointerleave",()=>{card.style.setProperty("--rx","0deg");card.style.setProperty("--ry","0deg");});
 });
}