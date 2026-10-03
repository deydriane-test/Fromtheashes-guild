const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../events.v1.js');
const event=(schedule,props={})=>({id:'test',title:'Raid',game:'RF Online Next',description:'Guild run',image:'raid',color:'red',enabled:true,schedule,...props});

test('existing human-readable Central schedules migrate without changing their time',()=>{
 const items=E.read({raid:{day:'Sunday',time:'7:00 PM CT'},elysium:{day:'Sunday',time:'8:55 PM CT'}});
 assert.equal(items[0].schedule.time,'19:00');assert.equal(items[2].schedule.time,'20:55');
 assert.equal(E.parseTime('12:05 AM CST'),'00:05');assert.equal(E.parseTime('12:05 PM'),'12:05');
 assert.equal(E.parseTime('25:00'),null);assert.equal(E.parseTime('7:60 PM'),null);
 assert.deepEqual(E.read({items:[]}),[],'deleted calendars do not resurrect legacy defaults');
});
test('mixed one-time and weekly events sort by the next occurrence; hidden and past events are excluded',()=>{
 const now=new Date('2026-10-03T21:20:00Z');
 const weekly=event({kind:'weekly',days:[0],time:'19:00'},{id:'weekly'});
 const soon=event({kind:'once',date:'2026-10-03',time:'17:00'},{id:'soon'});
 const later=event({kind:'once',date:'2026-10-05',time:'17:00'},{id:'later'});
 const past=event({kind:'once',date:'2026-10-02',time:'17:00'},{id:'past'});
 const hidden=event({kind:'once',date:'2026-10-03',time:'16:30'},{id:'hidden',enabled:false});
 assert.deepEqual(E.ordered([later,weekly,hidden,past,soon],now).map(x=>x.event.id),['soon','weekly','later']);
 assert.equal(E.ordered([past,weekly],now,true)[0].event.id,'weekly');
 assert.equal(E.nextInstant(weekly,new Date('2026-10-05T00:01:00Z')).toISOString(),'2026-10-12T00:00:00.000Z');
});
test('multiple weekdays, midnight and year rollover work in the source timezone',()=>{
 const recurring=event({kind:'weekly',days:[1,3,5],time:'00:00'});
 assert.equal(E.nextInstant(recurring,new Date('2026-12-31T20:00:00Z')).toISOString(),'2027-01-01T06:00:00.000Z');
 assert.equal(E.nextInstant(event({kind:'weekly',days:[6],time:'17:00'}),new Date('2026-10-03T22:00:00Z')).toISOString(),'2026-10-03T22:00:00.000Z');
});
test('Central daylight saving transitions do not move evening schedules',()=>{
 assert.equal(E.wallTimeToUtc('2026-10-25','19:00').toISOString(),'2026-10-26T00:00:00.000Z');
 assert.equal(E.wallTimeToUtc('2026-11-01','19:00').toISOString(),'2026-11-02T01:00:00.000Z');
 assert.equal(E.wallTimeToUtc('2026-03-08','02:30'),null);
 assert.equal(E.wallTimeToUtc('2026-11-01','01:30').toISOString(),'2026-11-01T06:30:00.000Z');
 const weekly=event({kind:'weekly',days:[0],time:'02:30'});
 assert.equal(E.nextInstant(weekly,new Date('2026-03-07T12:00:00Z')).toISOString(),'2026-03-15T07:30:00.000Z');
});
test('invalid dates, missing weekdays and past one-time saves are rejected',()=>{
 const now=new Date('2026-10-03T21:20:00Z');
 assert.ok(E.validate(event({kind:'weekly',days:[],time:'19:00'}),now));
 assert.ok(E.validate(event({kind:'once',date:'2026-02-30',time:'19:00'}),now));
 assert.ok(E.validate(event({kind:'once',date:'2026-10-02',time:'19:00'}),now));
 assert.equal(E.validate(event({kind:'once',date:'2026-10-03',time:'19:00'}),now),'');
 assert.equal(E.validate(event({kind:'weekly',days:[0,2],time:'19:00'}),now),'');
});
test('display times convert the same instant for visitors outside Central Time',()=>{
 const instant=E.wallTimeToUtc('2026-10-04','19:00');
 assert.equal(E.format(instant,'America/Chicago').time,'7:00 PM CT');
 assert.equal(E.format(instant,'America/Los_Angeles').time,'5:00 PM PDT');
 assert.equal(E.format(instant,'Asia/Tokyo').time,'9:00 AM GMT+9');
 assert.match(E.format(instant,'Asia/Tokyo').date,/Oct 5/);
});
