/* devnotes: in-app visual feedback overlay, no deps. Docs + canonical copy: ~/.claude/skills/devnotes/README.md
   Runs as a <script> tag, or as the extension's content script when extension/ext.js has set self.__devnotesExt (X). */
(async()=>{'use strict';
if(window.__devnotesLoaded)return;window.__devnotesLoaded=1;
const X=self.__devnotesExt,D=(document.currentScript||{}).dataset||{},XC=X&&await X.init();
const C=X?{endpoint:XC.endpoint,project:XC.project,hotkey:XC.keys['toggle-draw']||'no shortcut set',accent:'#b4befe',always:true}
  :{endpoint:D.endpoint||'http://localhost:7799/notes',project:D.project||location.hostname||'local',hotkey:(D.hotkey||'ctrl+alt+j').toLowerCase(),accent:D.accent||'#b4befe',always:'always' in D};
const K='devnotes:'+C.project+':';
const ls=X?X.ls:{get(k,d){try{const v=localStorage.getItem(K+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(K+k,JSON.stringify(v))}catch(e){status='local storage failed: '+e.name}}};
let notes=ls.get('notes',[]),seq=ls.get('seq',0),on=X?XC.on:ls.get('on',false),side=ls.get('side','r'),panel=ls.get('panel',true);
let annot=false,stream=null,video=null,shotMsg='',status='',fb=null,lastBatch=null,draft=null,editing=null,recv=null,recvAt=0,curSig='',H=null,R=null,timer=0,drag=null,busy=false;
const mem={},$=s=>R.querySelector(s);
const q=new URLSearchParams(location.search);
if(!X&&q.has('notes')){on=q.get('notes')!=='0';ls.set('on',on)}
let hid=C.always&&ls.get('hid',false);if(C.always)on=q.get('notes')!=='0'&&(!X||XC.on);
const HK=C.hotkey.split('+'),HKEY=HK.pop();
const hk=e=>e.ctrlKey===HK.includes('ctrl')&&e.altKey===HK.includes('alt')&&e.shiftKey===HK.includes('shift')&&e.metaKey===HK.includes('meta')&&((e.key||'').toLowerCase()===HKEY||(e.code||'').toLowerCase()==='key'+HKEY||(e.code||'').toLowerCase()===HKEY);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const r0=Math.round,frames=n=>new Promise(r=>{const f=()=>--n?requestAnimationFrame(f):r();requestAnimationFrame(f)}),wait=ms=>new Promise(r=>setTimeout(r,ms));
const inUI=e=>!!H&&e.composedPath().includes(H);
const persist=()=>ls.set('notes',notes);
const idb=X?X.shots:(()=>{let p;const db=()=>p||(p=new Promise((res,rej)=>{const r=indexedDB.open('devnotes',1);r.onupgradeneeded=()=>r.result.createObjectStore('s');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}));
  const op=(m,...a)=>db().then(d=>new Promise((res,rej)=>{const t=d.transaction('s',m==='get'?'readonly':'readwrite').objectStore('s')[m](...a);t.onsuccess=()=>res(t.result);t.onerror=()=>rej(t.error)}));
  return{get:k=>mem[k]?Promise.resolve(mem[k]):op('get',k).catch(()=>null),put:(k,v)=>op('put',v,k).catch(()=>{mem[k]=v}),del:k=>{delete mem[k];return op('delete',k).catch(()=>0)}}})();

addEventListener('keydown',e=>{
  if(!X&&hk(e)){e.preventDefault();e.stopImmediatePropagation();if(!on)setOn(true);setAnnot(!annot);return}
  if(!annot||inUI(e))return;
  e.preventDefault();e.stopImmediatePropagation();
  if(e.key==='Escape')draft?cancelDraft():setAnnot(false);
},true);
['keyup','keypress'].forEach(t=>addEventListener(t,e=>{if(annot&&!inUI(e))e.stopImmediatePropagation()},true));

function setOn(v){on=v;if(!X)ls.set('on',v);if(v)mount();else{setAnnot(false);if(H){H.remove();H=R=null;clearInterval(timer)}}X&&X.report(on,openNotes().length)}
function setAnnot(v){if(v&&!on)return;annot=v;if(!v){cancelDraft();drag=null}draw()}
function setHid(v){hid=v;ls.set('hid',v);if(v)setAnnot(false);else{panel=true;ls.set('panel',true)}draw()}

const stable=o=>JSON.stringify(o,(k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(x=>[x,v[x]])):v);
function under(x,y){for(const e of document.elementsFromPoint(x,y))if(e!==H)return e;return document.documentElement}
function desc(e){return e.localName+(e.id&&!HASH.test(e.id)?'#'+e.id:'')+(cls(e)[0]?'.'+cls(e)[0]:'')}
function layers(){const A=innerWidth*innerHeight*.2,s=new Set();
  for(const[px,py]of[[.5,.5],[.25,.25],[.75,.25],[.25,.75],[.75,.75]]){let e=under(innerWidth*px,innerHeight*py);
    while(e.parentElement&&e!==document.body){const b=e.getBoundingClientRect();if(b.width*b.height>=A)break;e=e.parentElement}s.add(desc(e))}
  return[...s].join(',')}
function view(){let st=null;
  if(X)st=X.state();else if(typeof window.__devnotesState==='function'){try{st=window.__devnotesState()}catch(e){st={error:String(e)}}}
  const u=new URL(location.href);u.searchParams.delete('notes');const url=u.pathname+u.search+u.hash;
  const L=st==null?(X?document.title:layers()):Object.entries(st).map(([k,v])=>k+'='+(v&&typeof v==='object'?JSON.stringify(v):v)).join(' · ');
  return{sig:url+'|'+(st!=null?stable(st):X?'title:'+document.title:'dom:'+L),url,title:document.title,state:st,label:L}}

const HASH=/^(svelte|css|sc|jsx|emotion|astro|tw)-|__[A-Za-z0-9-]{5,}$|^_[A-Za-z0-9]{5,}$|^(?=[^-]*\d)(?=[^-]*[a-zA-Z])[A-Za-z0-9]{6,}$|^:|^\d/;
const cls=e=>[...(e.classList||[])].filter(c=>!HASH.test(c));
function sel(el){const p=[];let e=el;
  for(;e&&e.nodeType===1&&e!==document.body&&e!==document.documentElement&&p.length<6;e=e.parentElement){
    const t=e.getAttribute('data-testid');if(t){p.unshift(`[data-testid="${t}"]`);break}
    if(e.id&&!HASH.test(e.id)){p.unshift('#'+CSS.escape(e.id));break}
    let s=e.localName;const a=e.getAttribute('aria-label'),c=cls(e).slice(0,2);
    if(a&&a.length<50)s+=`[aria-label="${a.replace(/"/g,'\\"')}"]`;else if(c.length)s+='.'+c.map(CSS.escape).join('.');
    const P=e.parentElement;if(P){const sib=[...P.children].filter(x=>x.localName===e.localName);if(sib.length>1)s+=`:nth-of-type(${sib.indexOf(e)+1})`}
    p.unshift(s)}
  if(e===document.body)p.unshift('body');return p.join(' > ')||el.localName}
const flat=(s,n)=>{s=String(s||'').replace(/\s+/g,' ').trim();return s.length>n?s.slice(0,n)+'…':s};
function bgEff(e){for(;e;e=e.parentElement){const b=getComputedStyle(e).backgroundColor;if(b&&b!=='transparent'&&!/rgba\(.*,\s*0\)$/.test(b))return b}return''}
function info(e,max){const b=e.getBoundingClientRect(),s=getComputedStyle(e),a={};
  for(const{name:n,value:v}of e.attributes)if(/^(role|aria-label|name|type|href|src|title|alt|placeholder|data-.*)$/.test(n)&&Object.keys(a).length<10)a[n]=flat(v,120);
  return{sel:sel(e),tag:e.localName,id:e.id||undefined,cls:cls(e).slice(0,8),attrs:a,text:flat(/^(input|textarea|select)$/.test(e.localName)?e.value:e.innerText||e.textContent,240),
    box:{x:r0(b.left),y:r0(b.top),w:r0(b.width),h:r0(b.height)},
    style:{color:s.color,background:s.backgroundColor,bgEffective:bgEff(e),font:`${s.fontWeight} ${s.fontSize}/${s.lineHeight} ${s.fontFamily.split(',')[0]}`,padding:s.padding,margin:s.margin,radius:s.borderRadius,border:s.borderTopWidth+' '+s.borderTopStyle+' '+s.borderTopColor,display:s.display,opacity:s.opacity},
    html:flat(e.outerHTML,max)}}
function dataChain(e){const o=[];for(;e&&e.nodeType===1&&o.length<6;e=e.parentElement){const d={};for(const a of e.attributes)if(a.name.startsWith('data-'))d[a.name]=flat(a.value,80);if(Object.keys(d).length)o.push({el:desc(e),data:d})}return o}
function comp(e){const h=new Set();
  for(let i=0;e&&i<12&&h.size<4;e=e.parentElement,i++){
    const m=e.__svelte_meta;if(m&&m.loc)h.add(`svelte ${m.loc.file}:${m.loc.line}`);
    const v=e.__vueParentComponent;if(v&&v.type)h.add(`vue ${v.type.__name||v.type.name||''} ${v.type.__file||''}`.trim());
    const k=Object.keys(e).find(k=>k.startsWith('__reactFiber'));
    if(k)for(let f=e[k],j=0;f&&j<40;f=f.return,j++){const t=f.type;if(t&&typeof t!=='string'){const n=t.displayName||t.name||(t.render&&t.render.name);if(n){h.add('react '+n+(f._debugSource?` ${f._debugSource.fileName}:${f._debugSource.lineNumber}`:''));break}}}}
  return[...h]}
const inter=(b,r)=>Math.max(0,Math.min(b.right,r.x+r.w)-Math.max(b.left,r.x))*Math.max(0,Math.min(b.bottom,r.y+r.h)-Math.max(b.top,r.y));
const covers=(b,r)=>inter(b,r)>=.85*r.w*r.h;
function targets(r,el){
  let c=el||under(r.x+r.w/2,r.y+r.h/2);
  if(!el)while(c.parentElement&&!covers(c.getBoundingClientRect(),r))c=c.parentElement;
  const o={container:info(c,1500)};
  if(c.localName==='canvas'){const b=c.getBoundingClientRect(),sx=c.width/b.width,sy=c.height/b.height;
    o.canvas={w:c.width,h:c.height,cssW:r0(b.width),cssH:r0(b.height),rect:{x:r0((r.x-b.left)*sx),y:r0((r.y-b.top)*sy),w:r0(r.w*sx),h:r0(r.h*sy)}}}
  if(!el){const ins=[],all=c.querySelectorAll('*');
    for(let i=0;i<all.length&&i<4000&&ins.length<8;i++){const e=all[i],b=e.getBoundingClientRect();
      if(b.width<2||b.height<2||ins.some(p=>p.contains(e)))continue;
      if(inter(b,r)>=.6*b.width*b.height&&getComputedStyle(e).visibility!=='hidden')ins.push(e)}
    o.inside=ins.map(e=>info(e,300))}
  o.data=dataChain(c);o.components=comp(c);return o}
function capture(r,el,kind){const v=view(),w=innerWidth,h=innerHeight;
  const n={id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),kind,createdAt:new Date().toISOString(),view:v,
    viewport:{w,h,dpr:devicePixelRatio,scrollX:r0(scrollX),scrollY:r0(scrollY)}};
  if(r){n.rect={x:r0(r.x),y:r0(r.y),w:r0(r.w),h:r0(r.h),nx:+(r.x/w).toFixed(4),ny:+(r.y/h).toFixed(4),nw:+(r.w/w).toFixed(4),nh:+(r.h/h).toFixed(4)};n.target=targets(r,el)}
  return n}

async function enableShots(){shotMsg='';
  try{stream=await navigator.mediaDevices.getDisplayMedia({video:{displaySurface:'browser',frameRate:{max:30}},audio:false,preferCurrentTab:true,selfBrowserSurface:'include',surfaceSwitching:'exclude'});
    const t=stream.getVideoTracks()[0],ds=t.getSettings().displaySurface;
    if(ds&&ds!=='browser'){t.stop();stream=null;shotMsg='pick this tab, not a window/screen'}
    else{t.onended=()=>{stream=null;draw()};video=document.createElement('video');video.muted=true;video.playsInline=true;video.style.cssText='position:fixed;left:0;top:0;width:2px;height:2px;opacity:0';
      R.appendChild(video);video.srcObject=stream;await video.play()}}
  catch(e){stream=null;shotMsg=e.name==='NotAllowedError'?'denied':'unsupported here'}draw()}
function jpeg(c,max){let q=.82,d;for(;;){d=c.toDataURL('image/jpeg',q);if(d.length*.75<=max)return d;
  if(q>.5){q-=.12;continue}const s=document.createElement('canvas');s.width=r0(c.width*.75);s.height=r0(c.height*.75);s.getContext('2d').drawImage(c,0,0,s.width,s.height);c=s;q=.7}}
function box(g,x,y,w,h,n,k){g.lineWidth=Math.max(2,3*k);g.strokeStyle=C.accent;g.strokeRect(x,y,w,h);if(n==null)return;
  const fs=r0(Math.max(13,18*k));g.font=`700 ${fs}px sans-serif`;const tw=g.measureText(n).width+fs*.8,ty=y>fs*1.4?y-fs*1.4:y;
  g.fillStyle=C.accent;g.fillRect(x-g.lineWidth/2,ty,tw,fs*1.4);g.fillStyle='#11111b';g.fillText(n,x+fs*.4-g.lineWidth/2,ty+fs*1.1)}
async function frame(){const t=stream.getVideoTracks()[0];
  if(window.ImageCapture){try{return await Promise.race([new ImageCapture(t).grabFrame(),wait(700).then(()=>null)])||video}catch(e){}}
  await wait(120);return video}
async function grab(r,n){if(!X&&(!stream||!video))return null;
  H.style.visibility='hidden';let src;
  try{await frames(2);await wait(60);src=X?await X.shot():await frame()}finally{H.style.visibility=''}
  if(!src)return null;const vw=src.videoWidth||src.width,vh=src.videoHeight||src.height;if(!vw)return null;
  const sx=vw/innerWidth,sy=vh/innerHeight,W=Math.min(1280,vw),k=W/vw,c=document.createElement('canvas');
  c.width=W;c.height=r0(vh*k);const g=c.getContext('2d');g.drawImage(src,0,0,c.width,c.height);
  if(r)box(g,r.x*sx*k,r.y*sy*k,r.w*sx*k,r.h*sy*k,n,k*sx);
  const o={full:jpeg(c,250e3),frame:{w:vw,h:vh},mismatch:Math.abs(sx/sy-1)>.03};
  if(r&&r.w*r.h<innerWidth*innerHeight*.2){const m=48,x0=Math.max(0,r.x-m),y0=Math.max(0,r.y-m),x1=Math.min(innerWidth,r.x+r.w+m),y1=Math.min(innerHeight,r.y+r.h+m);
    const z=Math.min(2,900/((x1-x0)*sx)),Z=document.createElement('canvas');Z.width=r0((x1-x0)*sx*z);Z.height=r0((y1-y0)*sy*z);const zg=Z.getContext('2d');
    zg.drawImage(src,x0*sx,y0*sy,(x1-x0)*sx,(y1-y0)*sy,0,0,Z.width,Z.height);box(zg,(r.x-x0)*sx*z,(r.y-y0)*sy*z,r.w*sx*z,r.h*sy*z,null,z*sx);o.zoom=jpeg(Z,150e3)}
  if(src.close)src.close();return o}

async function finish(r,el,kind){if(busy)return;busy=true;
  try{const n=capture(r,el,kind);showSel(r);const shot=await grab(r,seq+1);draft={note:n,shot};openEditor(r)}finally{busy=false}}
function saveDraft(text){if(!draft)return;const n=draft.note;n.text=text.trim();
  if(!n.text){cancelDraft();return}
  n.n=++seq;n.status='open';n.shot=!!draft.shot;if(draft.shot){n.shotInfo={frame:draft.shot.frame,mismatch:draft.shot.mismatch,zoom:!!draft.shot.zoom};idb.put(n.id,draft.shot)}
  notes.push(n);ls.set('seq',seq);persist();draft=null;hideEditor();draw()}
function cancelDraft(){draft=null;hideEditor()}
const openNotes=()=>notes.filter(n=>n.status==='open');
async function bundle(list,withShots){const b={devnotes:1,project:C.project,submittedAt:new Date().toISOString(),origin:location.origin,userAgent:navigator.userAgent,views:[],notes:[]};
  for(const n of list){const s=withShots&&n.shot?await idb.get(n.id):null;b.notes.push(Object.assign({},n,{shot:s?s.full:null,zoom:s&&s.zoom||null}));
    let v=b.views.find(v=>v.sig===n.view.sig);if(!v)b.views.push(v={sig:n.view.sig,url:n.view.url,label:n.view.label,notes:[]});v.notes.push(n.n)}
  return b}
const health=()=>C.endpoint.replace(/\/notes\/?$/,'')+'/health';
const net=X?X.net:async(post,b)=>{const r=await fetch(post?C.endpoint:health(),post?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b),signal:AbortSignal.timeout(3e4)}:{signal:AbortSignal.timeout(4e3)});
  return{ok:r.ok,status:r.status,j:await r.json().catch(()=>({}))}};
async function ping(){if(Date.now()-recvAt<15e3)return;recvAt=Date.now();
  try{const r=await net(0);recv=r.ok?'online':r.status===403?'blocks this origin':'offline'}catch(e){recv='offline'}draw()}
async function submit(){const list=openNotes();if(!list.length)return;status='sending…';fb=null;draw();
  const b=await bundle(list,true);
  try{const r=await net(1,b),j=r.j||{};if(!r.ok)throw new Error(j.error||'HTTP '+r.status);recv='online';sent(list,'receiver → '+(j.dir||'inbox'))}
  catch(e){recv='offline';fb={list,b,err:e.name==='TypeError'?'receiver not reachable at '+C.endpoint:e.message||e.name};status='not sent: '+esc(fb.err);draw()}}
function sent(list,route){const t=new Date().toISOString();list.forEach(n=>{n.status='sent';n.sentAt=t;n.route=route});lastBatch=list.map(n=>n.id);fb=null;persist();status=`${list.length} sent · ${route}`;draw()}
async function copyJSON(){const b=await bundle(fb.list,false);b.note='screenshots omitted (clipboard); use the .json download for images';
  try{await navigator.clipboard.writeText(JSON.stringify(b));sent(fb.list,'clipboard')}catch(e){status='clipboard blocked: '+e.name;draw()}}
function download(){const a=document.createElement('a'),d=new Date(),p=x=>String(x).padStart(2,'0');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(fb.b)],{type:'application/json'}));
  a.download=`devnotes-${C.project}-${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.json`;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5e3);sent(fb.list,'download '+a.download)}
function undo(){notes.forEach(n=>{if(lastBatch&&lastBatch.includes(n.id)){n.status='open';delete n.sentAt;delete n.route}});lastBatch=null;persist();status='undone: notes are open again';draw()}
function clearSent(){notes=notes.filter(n=>{if(n.status==='sent'){idb.del(n.id);return false}return true});lastBatch=null;persist();status='';draw()}

const STY=`:host{all:initial;--a:${C.accent};--o:#6c7086;--s0:#313244;--s1:#45475a;--k:#11111b}
*{box-sizing:border-box;font:12px/1.45 ui-sans-serif,system-ui,sans-serif;color:#cdd6f4;margin:0}
button{background:none;border:0;cursor:pointer;padding:2px 7px;border-radius:4px;color:#a6adc8}
button:hover{background:var(--s0);color:#cdd6f4}button:disabled{opacity:.4;cursor:default}
.ov{position:fixed;inset:0;display:none;pointer-events:auto;cursor:crosshair;touch-action:none;box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--a) 55%,#0000)}
.ov.on{display:block}.ov b{position:absolute;top:8px;left:50%;transform:translateX(-50%);background:var(--k)e6;padding:3px 11px;border-radius:10px;color:var(--a);font-weight:500;white-space:nowrap}
.hl,.sel,.m{position:fixed;pointer-events:none;border:2px solid var(--a);border-radius:3px}
.hl{display:none;border-width:1.5px;background:color-mix(in srgb,var(--a) 10%,#0000)}.hl i{position:absolute;left:-1px;bottom:100%;background:var(--k)e6;color:var(--a);font-style:normal;padding:0 5px;white-space:nowrap;font-size:11px}
.sel{display:none;border-style:dashed;background:color-mix(in srgb,var(--a) 8%,#0000)}
.m{background:color-mix(in srgb,var(--a) 6%,#0000)}.m i{position:absolute;left:-2px;bottom:100%;background:var(--a);color:var(--k);font:700 11px/16px sans-serif;padding:0 6px;border-radius:3px 3px 0 0}.m.in i{bottom:auto;top:0;border-radius:0 0 3px 0}
.pill{position:fixed;right:12px;bottom:12px;pointer-events:auto;background:#181825f0;border:1px solid var(--s1);border-radius:12px;padding:2px 10px;font-weight:500;opacity:.8}
.pill.a{border-color:var(--a);color:var(--a);opacity:1}.l .pill,.l.pn{right:auto;left:12px}
.pn{position:fixed;right:12px;bottom:42px;width:310px;max-height:min(70vh,560px);display:flex;flex-direction:column;background:#1e1e2ef5;border:1px solid var(--s1);border-radius:8px;pointer-events:auto;box-shadow:0 8px 30px #0009}
.pn.drag{opacity:.2;pointer-events:none}.hd,.ft,.sh{display:flex;align-items:center;gap:2px;padding:5px 6px;border-bottom:1px solid var(--s0)}
.hd b{font-weight:600;padding:0 6px;color:var(--a)}.sp{flex:1}button.on{color:var(--a);background:var(--s0)}
.sh,.sh span{color:var(--o);font-size:11px}.sh button{white-space:nowrap;color:var(--a)}.sh .ok{color:#a6e3a1}
.ls{overflow:auto;padding:4px 0;flex:1}.g{padding:4px 10px 2px;color:var(--o);font-size:11px}.g.cur{color:var(--a)}
.nt{display:flex;gap:6px;align-items:flex-start;padding:3px 8px 3px 10px}.nt:hover{background:#181825}
.nt i{font-style:normal;font-weight:700;color:var(--k);background:var(--a);border-radius:3px;min-width:18px;text-align:center;font-size:11px;margin-top:1px}
.nt span{flex:1;white-space:pre-wrap;word-break:break-word;cursor:text}.nt button{padding:0 5px;color:var(--o)}
.ft{border:0;border-top:1px solid var(--s0);flex-wrap:wrap}.pri{background:var(--a);color:var(--k);font-weight:600}.pri:hover{background:var(--a);color:var(--k);filter:brightness(1.1)}
.st{color:#a6adc8;font-size:11px;padding:2px 4px;flex-basis:100%}.dot{font-size:11px;color:var(--o)}.dot.on{color:#a6e3a1}
.fb{display:flex;gap:4px;padding:0 6px 6px}.fb button{border:1px solid var(--s1)}.muted{color:var(--o);padding:4px 10px;font-size:11px}
.ed{position:fixed;display:none;pointer-events:auto;width:290px;background:#1e1e2e;border:1px solid var(--a);border-radius:6px;padding:6px;box-shadow:0 6px 24px #0009}
textarea{width:100%;min-height:58px;background:var(--k);border:1px solid var(--s0);border-radius:4px;padding:6px;resize:vertical;outline:none;font-size:13px}
.eh{color:var(--o);font-size:11px;padding-top:4px;display:flex;justify-content:space-between}`;
function mount(){if(H)return;H=document.createElement('devnotes-ui');H.setAttribute('data-devnotes','');
  H.style.cssText='position:fixed;inset:0;z-index:2147483647;pointer-events:none;display:block';R=H.attachShadow({mode:X?'closed':'open'});
  R.innerHTML=`<style>${STY}</style><div class="w"><div class="mk"></div><div class="ov"><b>drag a box or click an element · Esc to stop</b></div><div class="hl"><i></i></div><div class="sel"></div><div class="pn"></div><div class="ed"></div><button class="pill" data-a="pill"></button></div>`;
  ['keydown','keyup','keypress','input','beforeinput','click','dblclick','mousedown','mouseup','pointerdown','pointerup','touchstart','touchend','contextmenu','focusin','focusout'].forEach(t=>H.addEventListener(t,e=>e.stopPropagation()));
  const ov=$('.ov');
  ov.addEventListener('pointerdown',e=>{if(e.button||busy)return;if(draft){const t=$('textarea');t&&t.value.trim()?saveDraft(t.value):cancelDraft()}
    drag={x:e.clientX,y:e.clientY,moved:false};ov.setPointerCapture(e.pointerId);$('.hl').style.display='none'});
  ov.addEventListener('pointermove',e=>{if(!drag){hover(e.clientX,e.clientY);return}
    if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>5){drag.moved=true;$('.pn').classList.add('drag')}
    if(drag.moved)showSel(rectOf(drag,e))});
  ov.addEventListener('pointerup',e=>{if(!drag)return;const d=drag;drag=null;$('.pn').classList.remove('drag');
    if(d.moved){finish(rectOf(d,e),null,'rect');return}
    const el=under(e.clientX,e.clientY);
    if(el.localName==='canvas')finish({x:e.clientX-24,y:e.clientY-24,w:48,h:48},null,'point');
    else{const b=el.getBoundingClientRect();finish({x:b.left,y:b.top,w:b.width,h:b.height},el,'element')}});
  ov.addEventListener('pointerleave',()=>{$('.hl').style.display='none'});
  R.addEventListener('click',onClick);
  addEventListener('scroll',drawMarks,{passive:true});addEventListener('resize',drawMarks);addEventListener('popstate',tick);addEventListener('hashchange',tick);
  timer=setInterval(tick,700);document.documentElement.appendChild(H);draw()}
const rectOf=(d,e)=>({x:Math.min(d.x,e.clientX),y:Math.min(d.y,e.clientY),w:Math.abs(e.clientX-d.x),h:Math.abs(e.clientY-d.y)});
const place=(el,r)=>Object.assign(el.style,{left:r.x+'px',top:r.y+'px',width:r.w+'px',height:r.h+'px'});
function showSel(r){const s=$('.sel');if(!r){s.style.display='none';return}place(s,r);s.style.display='block'}
let hovRaf=0;function hover(x,y){if(hovRaf)return;hovRaf=requestAnimationFrame(()=>{hovRaf=0;if(!annot||drag||draft)return;
  const el=under(x,y),b=el.getBoundingClientRect(),h=$('.hl');place(h,{x:b.left,y:b.top,w:b.width,h:b.height});h.style.display='block';h.firstChild.textContent=el.localName==='canvas'?'canvas: click marks a point':desc(el)})}
function openEditor(r){const e=$('.ed'),W=300,h=110,vw=innerWidth,vh=innerHeight;let x,y;
  if(!r){x=(vw-W)/2;y=vh/3}else if(r.x+r.w+W+8<vw){x=r.x+r.w+8;y=r.y}else if(r.x>W+8){x=r.x-W-8;y=r.y}else{x=r.x;y=r.y+r.h+8>vh-h?r.y-h-8:r.y+r.h+8}
  Object.assign(e.style,{left:Math.max(8,Math.min(x,vw-W))+'px',top:Math.max(8,Math.min(y,vh-h-8))+'px',display:'block'});
  e.innerHTML=`<textarea placeholder="${r?'what should change here?':'general note about this view'}"></textarea><div class="eh"><span>#${seq+1} · Enter save · Shift+Enter newline · Esc cancel</span><span>${draft.shot?'shot ✓':'no shot'}</span></div>`;
  const t=e.firstChild;t.addEventListener('keydown',ev=>{if(ev.isComposing)return;if(ev.key==='Enter'&&!ev.shiftKey){ev.preventDefault();saveDraft(t.value)}else if(ev.key==='Escape'){ev.preventDefault();cancelDraft()}});t.focus()}
function hideEditor(){if(!R)return;const a=R.activeElement;if(a)a.blur();$('.ed').style.display='none';showSel(null)}
async function general(){if(busy)return;busy=true;try{const n=capture(null,null,'general'),shot=await grab(null);draft={note:n,shot};openEditor(null)}finally{busy=false}}
function tick(){if(!H)return;const s=view().sig;if(s!==curSig){curSig=s;draw()}}
function drawMarks(){if(!R)return;$('.mk').innerHTML=hid?'':openNotes().filter(n=>n.rect&&n.view.sig===curSig).map(n=>{
  const x=n.rect.x+n.viewport.scrollX-scrollX,y=n.rect.y+n.viewport.scrollY-scrollY;
  return`<div class="m${y<18?' in':''}" style="left:${x}px;top:${y}px;width:${n.rect.w}px;height:${n.rect.h}px"><i>${n.n}</i></div>`}).join('')}
function draw(){X&&X.report(on,openNotes().length);if(!R)return;curSig=view().sig;$('.w').className='w'+(side==='l'?' l':'');
  const o=openNotes(),ov=$('.ov'),pl=$('.pill'),pn=$('.pn');
  ov.classList.toggle('on',annot);if(!annot)$('.hl').style.display='none';
  pl.className='pill'+(annot?' a':'');pl.textContent=(annot?'● drawing · ':'✎ notes ')+o.length;pl.title=`devnotes (${C.hotkey} to draw)`;
  if(hid){pl.textContent='✎ show';pl.style.opacity='.55'}else pl.style.opacity='';drawMarks();pn.style.display=panel&&!hid?'flex':'none';pn.className='pn'+(side==='l'?' l':'');if(!panel||hid)return;ping();
  const groups=[];for(const n of o){let g=groups.find(g=>g.sig===n.view.sig);if(!g)groups.push(g={sig:n.view.sig,n:n.view,list:[]});g.list.push(n)}
  groups.sort((a,b)=>(b.sig===curSig)-(a.sig===curSig));
  const path=u=>u.split(/[?#]/)[0].split('/').filter(Boolean).slice(-2).join('/')||'/';
  const ns=notes.length-o.length;
  pn.innerHTML=`<div class="hd"><b>devnotes</b><span class="sp"></span><button data-a="annot" class="${annot?'on':''}" title="${C.hotkey}">✎ draw</button><button data-a="general">+ note</button><button data-a="side" title="move panel">⇆</button><button data-a="min" title="collapse">–</button><button data-a="${C.always?'hide':'off'}" title="${C.always?'hide devnotes (the pill stays)':'turn devnotes off (?notes brings it back)'}">${C.always?'hide':'×'}</button></div>
  ${X?'':`<div class="sh">${stream?'<span class="ok">● screenshots on</span>':`<button data-a="shots">enable screenshots</button><span>${esc(shotMsg||'once per page load: share this tab')}</span>`}</div>`}
  <div class="ls">${groups.length?groups.map(g=>`<div class="g${g.sig===curSig?' cur':''}">${g.sig===curSig?'this view · ':''}${esc(path(g.n.url))} ${esc(g.n.label)}</div>`+g.list.map(n=>`<div class="nt" data-id="${n.id}"><i>${n.n}</i>${editing===n.id?`<textarea data-e="1">${esc(n.text)}</textarea>`:`<span data-a="edit" title="click to edit">${esc(n.text)}</span>`}<button data-a="del" title="delete">×</button></div>`).join('')).join(''):'<div class="muted">No open notes. Press ✎ draw, then drag a box over anything.</div>'}
  ${ns?`<div class="muted">${ns} sent · ${lastBatch?'<button data-a="undo">undo last</button>':''}<button data-a="clear">clear sent</button></div>`:''}</div>
  <div class="ft"><button class="pri" data-a="submit" ${o.length?'':'disabled'}>Submit ${o.length}</button><span class="sp"></span><span class="dot${recv==='online'?' on':''}">receiver ${recv==='online'?'● online':'○ '+(recv||'…')}</span><span class="st">${status}</span></div>
  ${fb?`<div class="fb"><button data-a="copy">Copy JSON</button><button data-a="dl">Download .json</button><button data-a="submit">retry</button></div>`:''}`;
  const t=pn.querySelector('textarea[data-e]');if(t){t.focus();t.selectionStart=t.value.length;
    const done=v=>{const n=notes.find(n=>n.id===editing);editing=null;if(n&&v!=null&&v.trim())n.text=v.trim();persist();draw()};
    t.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();done(t.value)}else if(e.key==='Escape'){e.preventDefault();done(null)}});
    t.addEventListener('blur',()=>editing&&done(t.value))}}
function onClick(e){const b=e.target.closest('[data-a]');if(!b)return;const a=b.dataset.a,nt=b.closest('[data-id]'),id=nt&&nt.dataset.id;
  if(a==='pill'){if(hid)setHid(false);else{panel=!panel;ls.set('panel',panel);draw()}}else if(a==='hide')setHid(true);else if(a==='annot')setAnnot(!annot);else if(a==='general')general();else if(a==='shots')enableShots();
  else if(a==='min'){panel=false;ls.set('panel',false);draw()}else if(a==='side'){side=side==='l'?'r':'l';ls.set('side',side);draw()}
  else if(a==='off')setOn(false);else if(a==='submit')submit();else if(a==='copy')copyJSON();else if(a==='dl')download();
  else if(a==='undo')undo();else if(a==='clear')clearSent();else if(a==='edit'){editing=id;draw()}
  else if(a==='del'){notes=notes.filter(n=>n.id!==id);idb.del(id);persist();draw()}}
if(on)document.readyState==='loading'?document.addEventListener('DOMContentLoaded',mount):mount();
window.__devnotes={toggle:()=>setOn(!on),annotate:v=>{if(!on)setOn(true);setAnnot(v!==false)},notes:()=>notes};
if(X){X.report(on,openNotes().length);X.onCmd(c=>{if(c==='off')return setOn(false);if(!on)setOn(true);if(c==='toggle-hide')return setHid(!hid);if(hid)setHid(false);
  if(c==='toggle-draw')setAnnot(!annot);else if(c==='add-note')general();else if(c==='submit'){if(!panel){panel=true;ls.set('panel',true);draw()}submit()}})}
})();
