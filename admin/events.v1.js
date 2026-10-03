/* Event editor uses the existing staff-only site_content events row. */
(function(){
  'use strict';
  const E=window.GuildEvents,$=id=>document.getElementById(id);
  let client,canEdit=()=>false,items=[],stored={},updatedAt=null,editingId=null,ready=false,busy=false;
  const form=$('eventForm'),fields=$('eventFields');
  function status(id,message,error=false){const el=$(id);el.textContent=message;el.className='formStatus'+(error?' error':message?' success':'');}
  function options(select,values){select.replaceChildren(...values.map(value=>{const o=document.createElement('option');o.value=value;o.textContent=value;return o;}));}
  function games(selected='RF Online Next'){
    const values=[...new Set([...E.GAMES,...items.map(e=>e.game).filter(Boolean)])];
    options($('eventGame'),values);const other=document.createElement('option');other.value='__custom';other.textContent='Add another game…';$('eventGame').append(other);
    $('eventGame').value=values.includes(selected)?selected:'__custom';$('eventCustomGame').value=values.includes(selected)?'':selected;
  }
  function scheduleFields(){
    const weekly=$('eventSchedule').value==='weekly';$('eventDaysField').hidden=!weekly;$('eventDateField').hidden=weekly;
    $('eventDate').required=!weekly;
    const custom=$('eventGame').value==='__custom';$('customGameField').hidden=!custom;$('eventCustomGame').required=custom;
  }
  function readForm(){
    const hour=Number($('eventHour').value)%12+($('eventPeriod').value==='PM'?12:0);
    return {id:editingId||crypto.randomUUID(),title:$('eventTitle').value.trim(),game:$('eventGame').value==='__custom'?$('eventCustomGame').value.trim():$('eventGame').value,
      description:$('eventDescription').value.trim(),image:form.querySelector('[name="eventImage"]:checked')?.value,
      color:form.querySelector('[name="eventColor"]:checked')?.value,enabled:$('eventEnabled').checked,
      schedule:{kind:$('eventSchedule').value,time:String(hour).padStart(2,'0')+':'+$('eventMinute').value,
        ...($('eventSchedule').value==='weekly'?{days:[...form.querySelectorAll('[name="eventDay"]:checked')].map(x=>Number(x.value))}:{date:$('eventDate').value})}};
  }
  function preview(){scheduleFields();const event=readForm();$('eventPreview').replaceChildren(E.card(event,E.nextInstant(event),{assetPrefix:'../',zone:E.TIME_ZONE}));}
  function close(){form.hidden=true;editingId=null;status('eventFormStatus','');}
  function open(event=null){
    if(!ready||busy||!canEdit())return;
    editingId=event?.id||null;form.reset();games(event?.game);
    $('eventEditorTitle').textContent=event?'EDIT EVENT':'NEW EVENT';$('saveEvent').textContent=event?'SAVE CHANGES ↗':'ADD EVENT ↗';
    $('eventTitle').value=event?.title||'';$('eventDescription').value=event?.description||'';$('eventEnabled').checked=event?.enabled!==false;
    const s=event?.schedule||{kind:'weekly',days:[0],time:'19:00'};
    $('eventSchedule').value=s.kind;$('eventDate').value=s.date||E.dateString();$('eventDate').min=E.dateString();
    const [hour,minute]=(E.parseTime(s.time)||'19:00').split(':').map(Number);
    $('eventHour').value=String(hour%12||12);$('eventMinute').value=String(minute).padStart(2,'0');$('eventPeriod').value=hour>=12?'PM':'AM';
    form.querySelectorAll('[name="eventDay"]').forEach(x=>x.checked=(s.days||[]).includes(Number(x.value)));
    form.querySelectorAll('[name="eventImage"]').forEach(x=>x.checked=x.value===(event?.image||'raid'));
    form.querySelectorAll('[name="eventColor"]').forEach(x=>x.checked=x.value===(event?.color||'red'));
    form.hidden=false;status('eventFormStatus','');preview();form.scrollIntoView({behavior:'smooth',block:'start'});$('eventTitle').focus({preventScroll:true});
  }
  function render(){
    const list=$('adminEventList');list.replaceChildren();const now=new Date();
    if(!items.length){const empty=document.createElement('p');empty.className='adminEmpty';empty.textContent='No events yet. Add an event to start the guild calendar.';list.append(empty);return;}
    E.ordered(items,now,true).forEach(({event,instant})=>{
      const wrap=document.createElement('article');wrap.className='adminEventItem'+(event.enabled===false?' eventHidden':'');
      wrap.append(E.card(event,instant,{assetPrefix:'../',zone:E.TIME_ZONE}));
      const footer=document.createElement('div');footer.className='adminEventFooter';
      const label=document.createElement('span');label.className='adminEventState';
      const days=event.schedule?.kind==='weekly'?(event.schedule.days||[]).map(d=>E.DAYS[d]).join(', '):'One-time event';
      label.textContent=(event.enabled===false?'HIDDEN':instant&&instant>=now?'PUBLISHED':'PAST EVENT')+' • '+days;
      const actions=document.createElement('div');actions.className='adminActions';
      for(const [text,action,danger] of [
        ['EDIT',()=>open(event),false],
        [event.enabled===false?'PUBLISH':'HIDE',()=>mutate(items.map(x=>x.id===event.id?{...x,enabled:x.enabled===false}:x)),false],
        ['DELETE',()=>{if(confirm('Delete “'+event.title+'” from the calendar?'))mutate(items.filter(x=>x.id!==event.id));},true]
      ]){const b=document.createElement('button');b.type='button';b.className='adminAction'+(danger?' danger':'');b.textContent=text;b.disabled=busy||!ready;b.onclick=action;actions.append(b);}
      footer.append(label,actions);wrap.append(footer);list.append(wrap);
    });
  }
  function setBusy(value){busy=value;fields.disabled=value||!ready;$('addEvent').disabled=value||!ready;$('reloadEvents').disabled=value;$('closeEventEditor').disabled=value;render();}
  async function persist(next){
    if(!ready||busy||!canEdit())throw new Error('You do not have permission to manage events.');
    setBusy(true);
    try{
      const content={...stored,version:2,items:next};
      const result=await client.from('site_content').update({content,updated_at:new Date().toISOString()}).eq('section','events').eq('updated_at',updatedAt).select('content,updated_at').maybeSingle();
      if(result.error)throw result.error;
      if(!result.data)throw new Error('The event list changed since you loaded it. Refresh the list, then try again.');
      stored=result.data.content;updatedAt=result.data.updated_at;items=E.read(stored);render();
      status('eventManagerStatus','Event calendar saved. Changes are live on the public site.');
    }finally{setBusy(false);}
  }
  async function mutate(next){
    try{await persist(next);if(editingId&&!items.some(x=>x.id===editingId))close();}
    catch(error){status('eventManagerStatus',error.message||'Could not save events. Please try again.',true);}
  }
  function load(row){
    if(!row){ready=false;setBusy(false);status('eventManagerStatus','The event calendar could not be loaded. Refresh the list to try again.',true);return;}
    stored=row.content||{};updatedAt=row.updated_at;items=E.read(stored,window.GUILD_CONFIG?.events);ready=true;setBusy(false);
  }
  async function reload(){
    if(busy||!canEdit())return;$('reloadEvents').disabled=true;
    try{const {data,error}=await client.from('site_content').select('content,updated_at').eq('section','events').maybeSingle();if(error)throw error;load(data);if(data)status('eventManagerStatus','Event list refreshed.');}
    catch(error){status('eventManagerStatus',error.message||'Could not load events.',true);}
    finally{$('reloadEvents').disabled=false;}
  }
  function init(connection,allowed){
    client=connection;canEdit=allowed;
    options($('eventHour'),Array.from({length:12},(_,i)=>String(i+1)));
    options($('eventMinute'),Array.from({length:60},(_,i)=>String(i).padStart(2,'0')));
    E.DAYS.forEach((name,day)=>{const label=document.createElement('label');const input=document.createElement('input');input.type='checkbox';input.name='eventDay';input.value=day;label.append(input,document.createTextNode(name.slice(0,3)));$('eventDays').append(label);});
    E.IMAGES.forEach(image=>{const label=document.createElement('label');label.className='eventImageChoice';const input=document.createElement('input');input.type='radio';input.name='eventImage';input.value=image.id;input.required=true;const img=document.createElement('img');img.src='../'+image.path;img.alt='';const text=document.createElement('span');text.textContent=image.label;label.append(input,img,text);$('eventImages').append(label);});
    E.COLORS.forEach(color=>{const label=document.createElement('label');label.className='eventColorChoice';label.style.setProperty('--swatch',color.accent);const input=document.createElement('input');input.type='radio';input.name='eventColor';input.value=color.id;input.required=true;const text=document.createElement('span');text.textContent=color.label;label.append(input,text);$('eventColors').append(label);});
    $('addEvent').onclick=()=>open();$('closeEventEditor').onclick=close;$('reloadEvents').onclick=reload;
    form.addEventListener('input',preview);form.addEventListener('change',preview);
    form.onsubmit=async e=>{
      e.preventDefault();if(busy)return;
      const event=readForm(),error=E.validate(event);
      if(error){status('eventFormStatus',error,true);return;}
      if(editingId&&!items.some(x=>x.id===editingId)){status('eventFormStatus','This event was removed. Cancel and add a new event instead.',true);return;}
      status('eventFormStatus','Saving event…');
      try{await persist(editingId?items.map(x=>x.id===editingId?event:x):[...items,event]);close();}
      catch(error){status('eventFormStatus',error.message||'Could not save the event.',true);}
    };
    setInterval(()=>{if(ready&&!busy&&!document.hidden)render();},60000);
  }
  window.AdminEvents={init,load};
})();
