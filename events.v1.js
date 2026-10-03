/* Shared event catalog, Central Time scheduling, and public/admin card rendering. */
(function(root){
  'use strict';
  const TIME_ZONE='America/Chicago';
  const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const GAMES=['RF Online Next','Dune: Awakening','Path of Exile','Path of Exile 2','Community / Other'];
  const IMAGES=[
    {id:'raid',label:'Guild raid',path:'assets/thumbnails/raid-boss.webp'},
    {id:'expedition',label:'Expedition',path:'assets/thumbnails/expedition.webp'},
    {id:'elysium',label:'Elysium',path:'assets/thumbnails/elysium-blue.webp'},
    {id:'battlefield',label:'Battlefield',path:'assets/backgrounds/hero-rf-battle-bg.webp'},
    {id:'city',label:'City skyline',path:'assets/backgrounds/header-city-bg.webp'}
  ];
  const COLORS=[
    {id:'red',label:'Ember red',accent:'#ff5d42',wash:'#261310'},
    {id:'blue',label:'Electric blue',accent:'#35c0ff',wash:'#0e202b'},
    {id:'green',label:'Elysium green',accent:'#5fe09a',wash:'#10271c'},
    {id:'orange',label:'Phoenix orange',accent:'#ff9c4a',wash:'#291c10'},
    {id:'purple',label:'Void purple',accent:'#b893ff',wash:'#21152f'},
    {id:'gold',label:'Guild gold',accent:'#e9ca77',wash:'#262215'}
  ];
  const LEGACY=[
    {id:'raid',title:'Guild Raid',description:'Boss Progression • Guild Run',image:'raid',color:'red',time:'19:00'},
    {id:'expedition',title:'Guild Expedition',description:'Exploration • Objectives • Rewards',image:'expedition',color:'blue',time:'19:00'},
    {id:'elysium',title:'Elysium',description:'Farming • Gear • Community',image:'elysium',color:'green',time:'20:55'}
  ];
  const pad=n=>String(n).padStart(2,'0');
  function parseTime(value){
    const m=String(value||'').trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?(?:\s*(?:CT|CST|CDT))?$/i);
    if(!m)return null;
    let hour=Number(m[1]),minute=Number(m[2]);
    if(minute>59)return null;
    if(m[3]){if(hour<1||hour>12)return null;hour=hour%12+(m[3].toUpperCase()==='PM'?12:0);}
    else if(hour>23)return null;
    return pad(hour)+':'+pad(minute);
  }
  function dateParts(date,zone=TIME_ZONE){
    return Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
  }
  function dateString(date=new Date(),zone=TIME_ZONE){const p=dateParts(date,zone);return `${p.year}-${pad(p.month)}-${pad(p.day)}`;}
  function validDate(value){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return false;
    const [y,m,d]=value.split('-').map(Number),date=new Date(Date.UTC(y,m-1,d));
    return y>=2000&&y<=2100&&date.getUTCFullYear()===y&&date.getUTCMonth()+1===m&&date.getUTCDate()===d;
  }
  function wallTimeToUtc(date,time,zone=TIME_ZONE){
    time=parseTime(time);if(!validDate(date)||!time)return null;
    const [year,month,day]=date.split('-').map(Number),[hour,minute]=time.split(':').map(Number);
    const base=Date.UTC(year,month-1,day,hour,minute);
    const offsets=new Set([-86400000,0,86400000].map(delta=>{
      const p=dateParts(new Date(base+delta),zone);
      return Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second)-(base+delta);
    }));
    // Choose the first occurrence during a fall-back overlap. Missing spring times are invalid.
    const candidates=[...offsets].map(offset=>new Date(base-offset)).filter(candidate=>{
      const p=dateParts(candidate,zone);return p.year===year&&p.month===month&&p.day===day&&p.hour===hour&&p.minute===minute;
    }).sort((a,b)=>a-b);
    return candidates[0]||null;
  }
  function read(content={},fallback={}){
    if(Array.isArray(content.items))return content.items.map(item=>({...item,schedule:{...item.schedule}}));
    return LEGACY.map(def=>{
      const old={...(fallback[def.id]||{}),...(content[def.id]||{})};
      const day=DAYS.findIndex(d=>d.toLowerCase()===String(old.day||'Sunday').toLowerCase());
      return {...def,game:'RF Online Next',enabled:old.enabled!==false,schedule:{kind:'weekly',days:[day<0?0:day],time:parseTime(old.time)||def.time}};
    });
  }
  function nextInstant(event,now=new Date()){
    const s=event.schedule||{};const time=parseTime(s.time);if(!time)return null;
    if(s.kind==='once')return wallTimeToUtc(s.date,time);
    if(s.kind!=='weekly'||!Array.isArray(s.days)||!s.days.length)return null;
    const p=dateParts(now),today=Date.UTC(p.year,p.month-1,p.day);
    for(let delta=0;delta<14;delta++){
      const day=new Date(today+delta*86400000);
      if(!s.days.includes(day.getUTCDay()))continue;
      const date=`${day.getUTCFullYear()}-${pad(day.getUTCMonth()+1)}-${pad(day.getUTCDate())}`;
      const instant=wallTimeToUtc(date,time);
      if(instant&&instant>=now)return instant;
    }
    return null;
  }
  function ordered(items,now=new Date(),includeAll=false){
    return items.map((event,index)=>({event,index,instant:nextInstant(event,now)}))
      .filter(x=>includeAll||(x.event.enabled!==false&&x.instant&&x.instant>=now))
      .sort((a,b)=>{
        const future=x=>x.event.enabled!==false&&x.instant&&x.instant>=now;
        if(includeAll&&future(a)!==future(b))return future(a)?-1:1;
        return (a.instant?.getTime()??Infinity)-(b.instant?.getTime()??Infinity)||a.index-b.index;
      });
  }
  function format(instant,zone=Intl.DateTimeFormat().resolvedOptions().timeZone||TIME_ZONE){
    const time=new Intl.DateTimeFormat('en-US',{timeZone:zone,hour:'numeric',minute:'2-digit',hour12:true}).format(instant);
    const tz=zone===TIME_ZONE?'CT':new Intl.DateTimeFormat('en-US',{timeZone:zone,timeZoneName:'short'}).formatToParts(instant).find(p=>p.type==='timeZoneName')?.value||zone;
    const date=new Intl.DateTimeFormat('en-US',{timeZone:zone,weekday:'short',month:'short',day:'numeric'}).format(instant);
    return {time:time+' '+tz,date};
  }
  function validate(event,now=new Date()){
    if(!event.title?.trim()||event.title.length>80)return 'Enter an event title (up to 80 characters).';
    if(!event.game?.trim()||event.game.length>80)return 'Choose a game or enter its name.';
    if((event.description||'').length>400)return 'Keep the description under 400 characters.';
    if(!IMAGES.some(x=>x.id===event.image)||!COLORS.some(x=>x.id===event.color))return 'Choose an image and color scheme.';
    const s=event.schedule||{};
    if(!parseTime(s.time))return 'Choose a valid time.';
    if(s.kind==='weekly'){
      if(!Array.isArray(s.days)||!s.days.length||s.days.some(d=>!Number.isInteger(d)||d<0||d>6))return 'Select at least one day of the week.';
    }else if(s.kind==='once'){
      const instant=wallTimeToUtc(s.date,s.time);
      if(!instant)return 'Choose a valid date and time in Central Time. That time may fall in a daylight-saving gap.';
      if(instant<now)return 'Choose a future date and time for a one-time event.';
    }else return 'Choose a one-time or weekly schedule.';
    return '';
  }
  function card(event,instant,{assetPrefix='',zone}={}){
    const el=document.createElement('article');el.className='exactEventCard managedEventCard';el.dataset.eventId=event.id;
    const color=COLORS.find(x=>x.id===event.color)||COLORS[0];
    el.style.setProperty('--event-accent',color.accent);el.style.setProperty('--event-wash',color.wash);
    const image=IMAGES.find(x=>x.id===event.image)||IMAGES[0];
    const thumb=document.createElement('img');thumb.className='eventThumb';thumb.src=assetPrefix+image.path;thumb.alt='';thumb.loading='lazy';
    const copy=document.createElement('div');copy.className='eventCopy';
    const game=document.createElement('small');game.textContent=event.game;
    const title=document.createElement('strong');title.textContent=event.title;
    const description=document.createElement('span');description.textContent=event.description||'';copy.append(game,title,description);
    const when=document.createElement('div');when.className='eventWhen';const time=document.createElement('b'),meta=document.createElement('span');
    if(instant){const formatted=format(instant,zone);time.textContent=formatted.time;meta.textContent=formatted.date.toUpperCase()+(event.schedule?.kind==='weekly'?' • WEEKLY':'');}
    else {time.textContent='Pick a schedule';meta.textContent='CENTRAL TIME';}
    when.append(time,meta);el.append(thumb,copy,when);return el;
  }
  const api={TIME_ZONE,DAYS,GAMES,IMAGES,COLORS,read,parseTime,dateString,validDate,wallTimeToUtc,nextInstant,ordered,format,validate,card};
  root.GuildEvents=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
