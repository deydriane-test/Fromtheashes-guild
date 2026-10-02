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

const displayGlyphs={A:[59,46],B:[52,35],C:[51,35],D:[52,35],E:[52,35],F:[52,35],G:[53,35],H:[50,35],I:[12,35],J:[34,35],K:[49,46],L:[42,35],M:[72,62],N:[68,72],O:[48,37],P:[48,49],Q:[49,38],R:[59,56],S:[47,37],T:[44,50],U:[46,37],V:[49,41],W:[57,45],X:[53,37],Y:[50,52],Z:[42,37]};
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
     svg.setAttribute("viewBox","0 0 "+box[0]+" "+box[1]);
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
