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

const displayGlyphs={A:[59,35],B:[52,35],C:[51,35],D:[52,35],E:[52,35],F:[52,35],G:[53,35],H:[50,35],I:[12,35],J:[34,35],K:[49,35],L:[42,35],M:[56,35],N:[52,35],O:[48,35],P:[48,35],Q:[49,35],R:[52,35],S:[47,35],T:[44,35],U:[46,35],V:[49,35],W:[57,35],X:[53,35],Y:[50,35],Z:[42,35]};
function renderDisplayFont(){
 document.querySelectorAll(".displayFont").forEach(root=>{
  if(root.dataset.displayRendered)return;
  root.dataset.displayRendered="1";
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const nodes=[];
  while(walker.nextNode())nodes.push(walker.currentNode);
  nodes.forEach(node=>{
   const frag=document.createDocumentFragment();
   for(const ch of node.nodeValue){
    const key=ch.toUpperCase(),box=displayGlyphs[key];
    if(box){
     const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
     svg.classList.add("displayGlyph");
     svg.setAttribute("viewBox","0 0 "+box[0]+" 35");
     svg.setAttribute("aria-hidden","true");
     svg.style.height=".68em";
     svg.style.width="calc(.68em * "+(box[0]/box[1])+")";
     svg.innerHTML='<use href="assets/display-font.svg#'+key+'"></use>';
     frag.appendChild(svg);
    }else frag.appendChild(document.createTextNode(ch));
   }
   node.parentNode.replaceChild(frag,node);
  });
 });
}
renderDisplayFont();

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
