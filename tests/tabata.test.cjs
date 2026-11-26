// Run: node --test tests/tabata.test.cjs
const {test}=require('node:test');
const assert=require('node:assert/strict');
const html=require('node:fs').readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
function setup(rounds='2',rest='10'){
 const els=new Map(), timers=new Map(), events={};let now=0,id=0;
 function el(k){if(!els.has(k))els.set(k,{style:{},dataset:{},value:k==='roundSelect'?rounds:rest,checked:false,events:{},classList:{add(){},remove(){},toggle(){}},focus(){},addEventListener(n,f){this.events[n]=f}});return els.get(k)}
 const doc={visibilityState:'visible',getElementById:el,addEventListener:(n,f)=>events[n]=f};
 const app=new Function('document','window','navigator','performance','setInterval','clearInterval',html.match(/<script>([\s\S]*?)<\/script>/)[1]+'\nreturn ()=>({state,remainingMs,index,round,exercises})')(doc,{}, {},{now:()=>now},f=>{timers.set(++id,f);return id},i=>timers.delete(i));
 return {el,snapshot:app,click:k=>el(k).events.click(),time:ms=>{now+=ms;for(const [i,f] of [...timers])if(timers.has(i))f()},count:()=>timers.size,progress:()=>parseFloat(el('progressBar').style.width),hide:()=>{doc.visibilityState='hidden';events.visibilitychange()}};
}
test('eight timed exercises, default two rounds and 10 seconds rest',()=>{
 const a=setup();assert.equal(a.snapshot().exercises.length,8);assert.ok(a.snapshot().exercises.every(e=>e.kind==='time'&&e.value===20));assert.match(html,/<option value="2" selected>/);assert.match(html,/<option value="10" selected>/);assert.match(a.el('durationText').textContent,/7 min 50 s/);
});
test('full circuit, monotonic progress, no final rest and repeat',()=>{
 const a=setup();a.click('mainBtn');a.time(2999);assert.equal(a.snapshot().state,'prep');a.time(1);let last=0;
 for(let i=0;i<16;i++){assert.equal(a.snapshot().state,'work');assert.equal(a.snapshot().index,i%8);assert.equal(a.snapshot().round,Math.floor(i/8)+1);a.time(20000);assert.ok(a.progress()>=last);last=a.progress();if(i<15){assert.equal(a.snapshot().state,'rest');a.time(5000);assert.equal(a.progress(),last);a.time(5000)}}
 assert.equal(a.snapshot().state,'finished');assert.equal(a.progress(),100);assert.equal(a.count(),0);a.click('restartBtn');assert.equal(a.progress(),0);
});
test('pause/resume preserves subsecond time during preparation, work and rest',()=>{
 const a=setup();a.click('mainBtn');for(const [phase,ms] of [['prep',3000],['work',20000],['rest',10000]]){assert.equal(a.snapshot().state,phase);a.time(1250);a.click('mainBtn');assert.equal(a.snapshot().state,'paused');assert.equal(a.snapshot().remainingMs,ms-1250);assert.equal(a.count(),0);a.time(90000);a.click('mainBtn');a.time(ms-1251);assert.equal(a.snapshot().state,phase);a.time(1)}assert.equal(a.snapshot().index,1);
});
test('navigation and reset cancel prep; background pauses',()=>{
 const a=setup();a.click('mainBtn');a.click('nextBtn');a.time(6000);assert.equal(a.snapshot().state,'idle');assert.equal(a.snapshot().index,1);assert.equal(a.count(),0);a.click('mainBtn');a.click('resetBtn');a.time(6000);assert.equal(a.snapshot().state,'idle');a.click('mainBtn');a.time(3000);a.time(1200);a.hide();a.time(100000);assert.equal(a.snapshot().state,'paused');assert.equal(a.snapshot().remainingMs,18800);
});
test('one round, zero rest, settings locked until reset',()=>{
 const a=setup('1','0');a.click('mainBtn');assert.equal(a.el('restSelect').disabled,true);a.time(3000);for(let i=0;i<8;i++){assert.equal(a.snapshot().state,'work');a.time(20000)}assert.equal(a.snapshot().state,'finished');assert.equal(a.count(),0);assert.equal(a.el('nextImage').hidden,true);a.click('restartBtn');assert.equal(a.el('restSelect').disabled,false);
});

test('each exercise uses a distinct local WebP illustration',()=>{
 const a=setup();const fs=require('node:fs'),path=require('node:path');
 const images=a.snapshot().exercises.map(e=>e.image);
 assert.equal(new Set(images).size,8);
 for(const image of images){
  assert.match(image,/^images\/[a-z-]+\.webp$/);
  const data=fs.readFileSync(path.join(__dirname,'..',image));
  assert.equal(data.toString('ascii',0,4),'RIFF');
  assert.equal(data.toString('ascii',8,12),'WEBP');
 }
});
