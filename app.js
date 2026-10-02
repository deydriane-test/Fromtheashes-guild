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



// Create lightweight independent ember particles anchored to the actual document bottom.
const emberLayer=document.querySelector(".embers");
if(emberLayer){
  const emberCount=matchMedia("(max-width:800px)").matches?24:36;
  for(let i=0;i<emberCount;i++){
    const e=document.createElement("span");
    e.className="emberParticle";
    const n=i+1;
    const rnd=(seed)=>Math.abs(Math.sin(seed*12.9898)*43758.5453)%1;
    const x=(rnd(n*2.1)-.5)*260;
    const x2=(rnd(n*3.7)-.5)*320;
    const x3=(rnd(n*5.3)-.5)*280;
    const x4=(rnd(n*7.1)-.5)*340;
    const x5=(rnd(n*9.2)-.5)*240;
    e.style.setProperty("--startX",(rnd(n*11.4)*100).toFixed(1)+"%");
    e.style.setProperty("--size",(2+rnd(n*13.1)*3).toFixed(1)+"px");
    e.style.setProperty("--emberColor",i%3===0?"#ffc46e":"#ff6425");
    e.style.setProperty("--peak",(0.42+rnd(n*15.7)*.48).toFixed(2));
    e.style.setProperty("--duration",(9+rnd(n*17.3)*11).toFixed(1)+"s");
    e.style.setProperty("--delay",(-rnd(n*19.1)*18).toFixed(1)+"s");
    e.style.setProperty("--x1",x.toFixed(0));
    e.style.setProperty("--x2",x2.toFixed(0));
    e.style.setProperty("--x3",x3.toFixed(0));
    e.style.setProperty("--x4",x4.toFixed(0));
    e.style.setProperty("--x5",x5.toFixed(0));
    emberLayer.appendChild(e);
  }
  function setPageHeight(){
    document.documentElement.style.setProperty("--pageHeight",Math.max(document.documentElement.scrollHeight,window.innerHeight)+"px");
    emberLayer.querySelectorAll(".emberParticle").forEach(e=>e.style.setProperty("--travel",Math.max(document.documentElement.scrollHeight,window.innerHeight)+"px"));
  }
  setPageHeight();
  window.addEventListener("load",setPageHeight,{once:true});
  window.addEventListener("resize",setPageHeight,{passive:true});
}
