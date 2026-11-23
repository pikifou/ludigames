(() => {
 'use strict';
 const P=Pilot,W=P.world,$=id=>document.getElementById(id),KEY='au-fil-de-leau.pilot.v3';
 const frame=$('game'),view=()=>({w:frame.clientWidth||innerWidth,h:frame.clientHeight||innerHeight}),canvas=$('water'),ctx=canvas.getContext('2d'),petals=$('petals'),fx=petals.getContext('2d');
 const motion=!matchMedia('(prefers-reduced-motion:reduce)').matches;
 // Français ou anglais (PilotText) ; les textes de la page sont posés ici, ceux du jeu au fil de l'eau.
 const L=PilotText.pick(location.search,navigator.languages||[navigator.language]),T=PilotText.texts[L];document.documentElement.lang=L;
 document.querySelectorAll('[data-t]').forEach(e=>{e.textContent=T[e.dataset.t];});document.querySelectorAll('[data-t-aria]').forEach(e=>e.setAttribute('aria-label',T[e.dataset.tAria]));document.querySelectorAll('[data-t-alt]').forEach(e=>{e.alt=T[e.dataset.tAlt];});
 let save={done:0,plant:0,screen:'home',sound:true,reading:'none',thanked:false,tools:[]};try{save={...save,...JSON.parse(localStorage.getItem(KEY)||localStorage.getItem('au-fil-de-leau.pilot.v1')||'{}')};}catch{}
 const resetToken=new URLSearchParams(location.search).get('recommencer');if(resetToken&&save.resetToken!==resetToken)save={done:0,plant:0,screen:'home',sound:save.sound,reading:save.reading,thanked:false,tools:[],seen:[],intro:false,resetToken};
 if(!Array.isArray(save.tools))save.tools=[];if(!Array.isArray(save.seen))save.seen=[];
 // SCREEN : les jardins d'un écran de la carte ; AVAILABLE : les jardins déjà faits (deux écrans au lot 2).
 const SCREEN=P.SCREEN,AVAILABLE=P.LEVELS.length,LAST=AVAILABLE-1,screenEnd=i=>i%SCREEN===SCREEN-1,S=()=>P.SCREENS[l.screen];save.done=Math.max(0,Math.min(AVAILABLE,Number.isInteger(save.done)?save.done:0));save.plant=Math.max(0,Math.min(LAST,Number.isInteger(save.plant)?save.plant:save.done));
 // ?aller=20 : ouvre directement le 20e jardin, comme si les précédents étaient faits (pour que Julien essaie un endroit
 // précis). Le paramètre est retiré de l'adresse aussitôt : recharger la page garde la partie.
 const goTo=Math.floor(+new URLSearchParams(location.search).get('aller'));
 if(goTo>=1&&goTo<=AVAILABLE){const d=goTo-1,seen=[['sami',1],['noe',6],['lina',12],['potagers',20],['malik',29],['thanks2',40],['verger',40],['tom',50],['thanks3',60],['foret',60],['doe',70],['thanks4',80],['village',80],['nour',90]].filter(([,at])=>at<=d).map(([id])=>id);
  save={...save,done:d,plant:d,screen:'garden',intro:true,seen,thanked:d>=20,facts:Array.from({length:25},(_,j)=>2+4*j).filter(k=>k<=d),tools:['key','shovel','level','map','source'].slice(0,(d>=20)+(d>=40)+(d>=60)+(d>=80)+(d>=100)),active:null};delete save.active;
  try{localStorage.setItem(KEY,JSON.stringify(save));}catch{}const u=new URL(location.href);u.searchParams.delete('aller');window.history.replaceState(null,'',u);}
 const resumeRequest=JSON.parse(JSON.stringify(save));
 let n=save.plant,l=P.level(n),board=l.initial.slice(),history=[],phase='build',cam=P.camera(view().w,view().h,undefined,P.SCREENS[l.screen].play),geometry=[],head=0,total=0,bloom=0,clock=0,last=performance.now(),pause=false,wrap=false,zoom=1,particles=[],activeScreen='home',busyUntil=0,ready=false,actors=false;
 const growth=Array.from({length:AVAILABLE},(_,i)=>i<save.done?1:0),tiles=[],nodes=[];let mapShown=save.done;
 let sounds={},waterSound=null;const effects=new Set();fetch('assets/adventure/audio.json').then(r=>r.json()).then(v=>sounds=v.files||{}).catch(()=>{});
 function persist(){save.plant=n;save.screen=activeScreen;if(n===save.done){if(phase==='build'||phase==='leak')save.active=board.slice();else delete save.active;}   // un jardin rejoué ne touche pas au jardin en cours
 try{localStorage.setItem(KEY,JSON.stringify(save));}catch{note(T.noSave);}if(window.Ludi&&Ludi.save){const{sound,reading,...shared}=save;Ludi.save(shared);}}
 function audio(kind){if(!save.sound||pause||!sounds[kind])return;try{const a=new Audio(sounds[kind]);a.volume=kind==='water'?.20:.40;if(kind==='water'){stopWater();waterSound=a;a.loop=true;}else{effects.add(a);a.onended=()=>effects.delete(a);}a.play().catch(()=>effects.delete(a));}catch{}}
 function stopWater(){waterSound?.pause();waterSound=null;}function stopAudio(){stopWater();for(const a of effects)a.pause();effects.clear();}
 function note(text=''){$('note').textContent=text;}
 function say(text){$('speech-text').textContent=text;$('speech').classList.remove('quiet');auto(text);}
 // La lecture à voix haute (décisions de la plateforme du 22 novembre) : l'enfant appuie sur un texte pour l'entendre.
 // Le réglage « Lecture » de Ludiworld (tout, un peu, pas à la voix) dit si les textes se lisent aussi d'eux-mêmes ; ouvert seul, celui du jeu.
 function readingLevel(){const l=window.Ludi&&typeof Ludi.reading==='function'?Ludi.reading():null;return['all','some','none'].includes(l)?l:save.reading||'none';}
 // Le son est réglé par Ludiworld pour toute la maison (kit 0.5, Julien, 23 novembre) : jamais muet au départ. Le bouton du
 // jeu change les bruitages de toute la maison ; la voix coupée fait taire la lecture des textes. Pas encore de musique.
 let voice=true;function soundButton(){$('sound').setAttribute('aria-pressed',String(save.sound));$('sound').setAttribute('aria-label',save.sound?T.soundOff:T.soundOn);}
 function speak(text){if(!voice)return;try{const s=window.speechSynthesis;text=(text||'').replace(/\s+/g,' ').trim();if(!s||!text)return;s.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=PilotText.voice[L];s.speak(u);$('game').dataset.spoken=text;}catch{}}
 function auto(text){const level=readingLevel();if(level==='all'||level==='some'&&text.length>120)speak(text);}
 function readable(el){return el.id==='speech'?$('speech-text').textContent:el.id==='home-text'?[...el.querySelectorAll('h2,#home-message')].map(e=>e.textContent).filter(Boolean).join('. '):el.textContent;}
 document.addEventListener('click',e=>{const r=e.target.closest('.readable');if(r&&!e.target.closest('button'))speak(readable(r));});
 document.querySelectorAll('.readable').forEach(r=>{r.tabIndex=0;r.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();speak(readable(r));}});});
 function readingButton(){const level=readingLevel();$('reading').dataset.level=level;$('reading').setAttribute('aria-label',T.reading[level]);$('reading').title=T.reading[level];}
 function transition(){if(!motion)return;const el=$('transition');el.classList.remove('play');void el.offsetWidth;el.classList.add('play');setTimeout(()=>el.classList.remove('play'),800);}
 function show(screen){if(activeScreen!==screen)transition();activeScreen=screen;$('home').hidden=screen!=='home';$('garden').hidden=screen!=='garden';window.PilotMusic?.play(screen==='garden'?'jardin':'vallee');persist();}
 function plantNodes(){
  $('plants').replaceChildren();$('beds').replaceChildren();
  for(let i=0;i<AVAILABLE;i++){const lv=P.level(i);nodes[i]={els:[],beds:[]};for(const e of lv.ends){const bed=document.createElement('div');bed.className='bed';bed.style.left=e.root.x+'px';bed.style.top=e.root.y+'px';   // la terre mouillée, en face de l'arrivée d'eau
   $('beds').append(bed);nodes[i].beds.push(bed);}
   // au pied de chaque plante, une petite ombre nette, décalée comme les autres ombres du jeu : la plante est plantée dans le sol,
   // pas posée dessus (retours de Julien, 23 novembre : ni cuvette, ni talus, ni grand fondu)
   for(const g of[...new Set(lv.ends.map(e=>e.plant??0))].map(g=>lv.ends.filter(e=>(e.plant??0)===g))){const tree=g.length>1,x=g.reduce((s,e)=>s+e.root.x,0)/g.length,y=tree?g[0].root.y+TREE_DROP:foot(g[0]).y;
    const patch=document.createElement('div');patch.className='bed patch'+(tree?' tree':'');patch.style.left=x+'px';patch.style.top=y+'px';$('beds').append(patch);nodes[i].beds.push(patch);}
   // une plante par groupe de bouts : le vieil arbre du verger boit à deux bouts voisins, il pousse sous les deux becs
   const groups=[...new Set(lv.ends.map(e=>e.plant??0))].map(g=>lv.ends.filter(e=>(e.plant??0)===g));
   groups.forEach((g,k)=>{const tree=g.length>1,p=tree?{x:g.reduce((s,e)=>s+e.root.x,0)/g.length,y:g[0].root.y+TREE_DROP}:foot(g[0]);const plant=document.createElement('div');plant.className='plant'+(tree?' tree':'');plant.dataset.plant=i;plant.dataset.screen=lv.screen;plant.dataset.rootX=p.x;plant.dataset.rootY=p.y;plant.style.left=p.x+'px';plant.style.top=p.y+'px';plant.style.setProperty('--delay',(-(i+k)*.63)+'s');for(let f=0;f<4;f++){const s=document.createElement('div');s.className='sprite';s.style.backgroundPosition=(f/3*100)+'% 0';plant.append(s);}for(let b=0;b<2;b++){const bird=document.createElement('div');bird.className='bird bird-'+b;plant.append(bird);}nodes[i].els.push(plant);$('plants').append(plant);});setGrowth(i,growth[i]);}
 }
 // Un niveau = un jardin = un terrain de la carte (ADR-023) : la cour ne montre que la plante de ce jardin.
 function showGarden(){nodes.forEach((node,k)=>{for(const e of[...node.els,...node.beds])e.hidden=k!==n;});}
 function setGrowth(i,v){growth[i]=Math.max(0,Math.min(1,v));const node=nodes[i];if(!node)return;const f=growth[i]*3,low=Math.floor(f);for(const el of node.els){el.dataset.growth=growth[i].toFixed(4);el.classList.toggle('living',growth[i]===1);[...el.querySelectorAll('.sprite')].forEach((s,j)=>{s.style.opacity=j===low?1-(f-low):j===low+1?f-low:0;});}for(const bed of node.beds)bed.classList.toggle('wet',growth[i]>0||i===n&&phase==='bloom');}
 // Trois cours qui tournent (lot 1). Les deux nouvelles ont du décor là où pousse une plante de côté : un jardin dont la
 // plante est à gauche ou à droite garde la cour d'origine.
 // Écran 2, les potagers : trois cours de potager ; celle aux citrouilles, la plus étroite à gauche, quand une plante est à gauche.
 // Écrans 3 et 4, le verger et la forêt : trois cours chacun, plantes toujours en bas.
 const TREE_DROP=-20;
 // une plante sur le côté du plateau : le pied un peu plus bas que l'arrivée d'eau, pour que la plante soit centrée sur le bec
 // (retour de Julien, 23 novembre : « la plante n'est pas centrée par rapport à l'arrivée d'eau »)
 const SIDE_DROP=34;function foot(e){return e.exit===2?e.root:{x:e.root.x,y:e.root.y+SIDE_DROP};}
 const COURTS=[['court','court-b','court-c'],['court2-a','court2-b','court2-c'],['court3-a','court3-b','court3-c'],['court4-a','court4-b','court4-c'],['court5-a','court5-b','court5-c']];function courtOf(i){const lv=P.level(i),side=lv.screen<2&&lv.ends.some(e=>e.exit!==2);return'assets/pilot/'+(side?COURTS[lv.screen][lv.screen?1:0]:COURTS[lv.screen][i%3])+'.webp';}
 let dropAt=[];
 function renderBoard(){
  $('board').replaceChildren();tiles.length=0;$('terrain').src=courtOf(n);$('board').style.left=l.board.x+'px';
  const B=l.board;l.rocks.forEach((p,k)=>{const r=document.createElement('span');r.className='rock';r.style.left=p%B.cols*B.cell+'px';r.style.top=Math.floor(p/B.cols)*B.cell+'px';r.style.backgroundPosition=((p+n)%3*50)+'% 0';if(l.screen===3)r.classList.add('stump');if(l.screen===4)r.classList.add('barrel');r.onclick=()=>nudge(r);$('board').append(r);});board.forEach((mask,p)=>{if(!mask)return;const b=document.createElement('button');b.className='tile'+(l.fixed.includes(p)?' fixed':'')+(l.old.includes(p)?' old':'');b.dataset.cell=p;b.dataset.mask=mask;b.style.left=p%B.cols*B.cell+'px';b.style.top=Math.floor(p/B.cols)*B.cell+'px';b.setAttribute('aria-label',T.tile(Math.floor(p/B.cols)+1,p%B.cols+1,l.fixed.includes(p)));b.innerHTML=`<span class="piece" style="${Pieces.style(mask,'dry')}"></span>`;b.onclick=()=>turn(p);tiles[p]=b;$('board').append(b);});
  for(const end of l.ends){for(const o of P.outer(l,end)){const d=document.createElement('span');d.className='piece outer';d.style.cssText=Pieces.style(o.mask);d.style.left=o.x-B.x+'px';d.style.top=o.y-B.y+'px';$('board').append(d);}
   const e=endCell(end),spout=document.createElement('span');spout.className='spout';spout.style.cssText=Pieces.endStyle(end.exit);spout.style.left=e.x-B.x+parseFloat(spout.style.left)+'px';spout.style.top=e.y-B.y+parseFloat(spout.style.top)+'px';$('board').append(spout);}
  // une goutte au-dessus de chaque bec à remplir (retour de Julien, 23 novembre : sous les arbres, on ne voyait pas toujours où envoyer l'eau)
  dropAt=l.ends.map(end=>{const e=endCell(end);return{x:e.x+72,y:e.y+60};});   // sur la case du bec, pas au-dessus de la plante
  $('target').innerHTML=l.ends.map(()=>'<div class="drop"><svg viewBox="0 0 24 32"><path d="M12 2C9 8 4 12 4 17a8 8 0 0 0 16 0c0-5-5-9-8-15Z"/><path d="m7 27 5 4 5-4"/></svg></div>').join('');
  anchorNodes();sizeTargets();
 }
 // Une pièce qu'on ne peut pas tourner est accrochée au sol (ADR-032) : la première, sous la fontaine, et les pièces fixes du
 // plateau ; pas le bec, qui se comprend seul (« ça charge visuellement »). Deux piquets de bois et une corde en travers de la
 // rigole (choix de Julien), au milieu d'une pièce droite ; sur un coude, au milieu de l'arc, les piquets restent debout de chaque
 // côté et seule la corde se tourne (« la perspective n'est pas bonne dans ce sens »). assets/pilot/anchors.webp :
 // l'attache couchée, l'attache debout, le piquet de gauche, celui de droite, la corde seule (tools/prepare_fixed.py).
 // Par-dessus l'eau : l'eau passe dessous.
 const STAKE=59;
 function anchorNodes(){const B=l.board,list=[];$('anchors').replaceChildren();
  for(const p of l.fixed){const m=board[p];if(!m||Pieces.TEES.includes(m))continue;const x=B.x+p%B.cols*B.cell,y=B.y+Math.floor(p/B.cols)*B.cell;
   if(m===5||m===10){list.push({x:x+72,y:y+72,parts:[{i:m===10?1:0}]});continue;}
   const cx=m&2?144:0,cy=m&4?144:0,dx=72-cx,dy=72-cy,d=Math.hypot(dx,dy),ux=dx/d,uy=dy/d,mx=x+cx+ux*72,my=y+cy+uy*72;
   let a=Math.atan2(uy,ux)*180/Math.PI;if(a>90)a-=180;if(a<=-90)a+=180;
   const s=ux<0?-1:1;list.push({x:mx,y:my,parts:[{i:4,a},{i:2,dx:-s*ux*STAKE,dy:-s*uy*STAKE},{i:3,dx:s*ux*STAKE,dy:s*uy*STAKE}]});}
  // les racines de la forêt, couchées sur la ligne entre deux cases : l'eau ne passe pas
  for(const[p,d]of l.barriers){const c=p%B.cols,r=Math.floor(p/B.cols),s=document.createElement('span');s.className='barrier'+(l.screen===4?' wall':'');
   const x=d===1?B.x+(c+1)*B.cell:B.x+c*B.cell+72,y=d===1?B.y+r*B.cell+72:B.y+(r+1)*B.cell;s.style.left=x-100+'px';s.style.top=y-100+'px';s.style.backgroundPosition=((d===1?2:0)+(p+n)%2)*100/3+'% 0';$('anchors').append(s);}
  for(const o of list.filter((o,k)=>!list.slice(0,k).some(q=>Math.hypot(q.x-o.x,q.y-o.y)<60)))for(const q of o.parts){const s=document.createElement('span');s.className='anchor';s.style.left=o.x+(q.dx||0)-100+'px';s.style.top=o.y+(q.dy||0)-100+'px';s.style.backgroundPosition=(q.i*25)+'% 0';if(q.a)s.style.rotate=q.a+'deg';$('anchors').append(s);}}
 // The last cell before the plant: its straight piece ends with a stone spout that pours into the earth (the last fixed
 // piece outside the board, or the last piece of the route when the plant is right beside the board).
 function endCell(end=l.ends[0]){const out=P.outer(l,end),b=l.board;if(out.length)return out.at(-1);const p=end.cell;return{x:b.x+p%b.cols*b.cell,y:b.y+Math.floor(p/b.cols)*b.cell};}
 // The water: the painted wet pieces, revealed along the path up to the water front. A world canvas under the plants.
 const AREA={x:1150,y:1250,w:960,h:960,r:1.5};let wetLayer=null,wetMask=null,wetKey='';
 function wetPieces(){const b=l.board,list=[];board.forEach((m,p)=>{if(m)list.push({mask:m,x:b.x+p%b.cols*b.cell,y:b.y+Math.floor(p/b.cols)*b.cell});});return list.concat(...l.ends.map(e=>P.outer(l,e)));}
 function drawWater(){const R=AREA.r,list=wetPieces(),key=n+'/'+list.map(o=>o.mask+'@'+o.x+','+o.y).join('|');
  if(!wetLayer){wetLayer=document.createElement('canvas');wetMask=document.createElement('canvas');wetLayer.width=wetMask.width=AREA.w*R;wetLayer.height=wetMask.height=AREA.h*R;}
  if(key!==wetKey){wetKey=key;const x=wetLayer.getContext('2d');x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,wetLayer.width,wetLayer.height);x.setTransform(R,0,0,R,-AREA.x*R,-AREA.y*R);for(const o of list)Pieces.draw(x,o.mask,'wet',o.x,o.y);for(const end of l.ends){const e=endCell(end);Pieces.drawEnd(x,end.exit,'wet',e.x,e.y);}}
  const m=wetMask.getContext('2d');m.globalCompositeOperation='source-over';m.setTransform(1,0,0,1,0,0);m.clearRect(0,0,wetMask.width,wetMask.height);m.setTransform(R,0,0,R,-AREA.x*R,-AREA.y*R);
  m.lineCap='round';m.lineJoin='round';m.strokeStyle='#000';m.lineWidth=60;
  for(const s of geometry.slice(1)){if(head<=s.start)continue;path(m,s,Math.min(1,(head-s.start)/s.length));m.stroke();}
  m.globalCompositeOperation='source-in';m.setTransform(1,0,0,1,0,0);m.drawImage(wetLayer,0,0);m.globalCompositeOperation='source-over';
  ctx.drawImage(wetMask,AREA.x,AREA.y,AREA.w,AREA.h);
 }
 function connections(){
  // chaque tronçon part du bout de celui d'où vient l'eau : après une pièce en T, les deux branches coulent en même temps
  const b=l.board,sourceY=W.source.y,entry={x:W.source.x,y:b.y};geometry=[{length:b.y-sourceY,p:null,start:0,point:t=>({x:entry.x,y:sourceY+(b.y-sourceY)*t})}];
  const tr=P.trace(l,board),ends=[];for(const part of tr.parts){const seg=P.segment(part.enter,part.exit,b.cell),x=b.x+part.p%b.cols*b.cell,y=b.y+Math.floor(part.p/b.cols)*b.cell,from=part.parent<0?geometry[0]:ends[part.parent];const g={...seg,p:part.p,exit:part.exit,start:from.start+from.length,point:t=>{const q=seg.point(t);return{x:x+q.x,y:y+q.y};}};ends.push(g);geometry.push(g);
   const e=l.ends.find(e=>e.cell===part.p&&e.exit===part.exit);if(e&&tr.status==='win')geometry.push({...P.connector(l,e),p:null,start:g.start+g.length});}
  total=Math.max(...geometry.map(s=>s.start+s.length));$('garden').dataset.trace=tr.status;
 }
 function pointAt(distance){const s=geometry.find(s=>distance>=s.start&&distance<=s.start+s.length)||geometry.at(-1);return s?s.point(Math.max(0,Math.min(1,(distance-s.start)/(s.length||1)))):W.source;}
 function state(){
  const running=phase==='flow',celebrating=phase==='bloom',won=phase==='won';$('garden').dataset.phase=phase;$('garden').dataset.plant=n;$('garden').dataset.done=save.done;
  $('valve').disabled=!ready||pause||running||celebrating||won;$('valve').classList.toggle('running',running||celebrating||won);$('valve').classList.toggle('waiting',ready&&!pause&&(phase==='build'||phase==='leak'));$('valve-label').textContent=running?T.valveState.run:phase==='leak'?T.valveState.leak:T.valveState.idle;$('result').hidden=!celebrating&&!won;$('speech').hidden=celebrating||won;$('next').disabled=celebrating||pause||wrap;$('next').innerHTML=(screenEnd(n)?T.next[1]:T.next[0])+' <span>➜</span>';
  $('target').hidden=celebrating||won;$('back').disabled=running||celebrating||pause;$('undo').disabled=!history.length||running||celebrating||won||pause;$('hint').disabled=celebrating||won||pause;$('restart').disabled=running||celebrating||pause;$('settings').disabled=celebrating;
  document.querySelector('.toolbox').hidden=celebrating||won;tiles.forEach(b=>{b.disabled=!ready||pause||celebrating||won;});
  const base=l.screen*SCREEN;$('leaves').replaceChildren();for(let i=base;i<base+SCREEN;i++){const leaf=document.createElement('i');leaf.className=i<save.done?'done':i===n?'active':'';leaf.setAttribute('aria-label',T.leaf(i+1,i<save.done));$('leaves').append(leaf);}
  $('leaves').setAttribute('aria-label',T.leaves(Math.max(0,Math.min(SCREEN,save.done-base)),l.screen));document.querySelector('#garden-label h1').textContent=T.parts[l.screen];
 }
 function start(i,resume=false){
  if(pause||wrap)return;n=i;l=P.level(n);phase='build';head=0;bloom=0;history=[];particles=[];zoom=1;stopWater();board=l.initial.slice();
  if(n<save.done)setGrowth(n,0);   // un jardin rejoué repart à sec
  if(resume&&Array.isArray(save.active)&&save.active.length===l.cols*l.rows&&save.active.every((m,p)=>l.fixed.includes(p)?m===l.initial[p]:P.shape(m)===P.shape(l.initial[p])))board=save.active.slice();
  showGarden();renderBoard();connections();show('garden');note();state();resize();keeper('idle',S().keeper.x,S().keeper.y);
  say(T.lines[n]);
  if(n===0)hint(false);persist();
 }
 // un petit geste de refus : la pièce fixe tire sur ses piquets, le rocher vacille
 function nudge(el){if(!el||!motion)return;el.classList.remove('nudge');void el.offsetWidth;el.classList.add('nudge');setTimeout(()=>el.classList.remove('nudge'),500);}
 function turn(p){
  if(!ready||pause||['bloom','won'].includes(phase))return;if(l.fixed.includes(p)){note(T.fixed);nudge(tiles[p]);return;}
  if(phase==='flow'&&geometry.some(s=>s.p===p&&s.start<head)){note(T.alreadyWet);return;}
  if(phase==='leak'){phase='build';head=0;}history.push(board.slice());board[p]=P.rotate(board[p]);const b=tiles[p];b.dataset.mask=board[p];const s=b.firstElementChild;s.style.cssText=Pieces.style(board[p]);b.classList.remove('hint');s.style.transition='none';s.style.transform='rotate(-90deg) scale(.9)';void s.getBoundingClientRect();s.style.transition='';s.style.transform='';busyUntil=performance.now()+(motion?230:0);$('speech').classList.add('quiet');note();connections();state();persist();audio('turn');
 }
 function hint(withMessage=true){if(pause||['won','bloom'].includes(phase))return;tiles.forEach(b=>b.classList.remove('hint'));const p=l.route.find(p=>!l.fixed.includes(p)&&board[p]!==l.solution[p]);if(p!==undefined){tiles[p].classList.add('hint');if(withMessage)say(T.tryThis);}else if(withMessage)say(T.ready);}
 function water(){if(!ready||pause||['flow','bloom','won'].includes(phase))return;phase='flow';head=0;connections();note();$('speech').classList.add('quiet');audio('water');state();}
 function keeper(pose,x,y){const k=$('keeper');k.className='keeper '+pose;k.style.left=x+'px';k.style.top=y+'px';k.dataset.pose=pose;let image=k.querySelector('img:not(.shadow)');if(!image){const shadow=new Image();shadow.alt='';shadow.className='shadow';image=new Image();image.alt='';k.replaceChildren(shadow,image);}k.querySelector('.shadow').src=image.src='assets/pilot/keeper-'+pose+'.webp';}
 function wonText(){return screenEnd(n)?T.wonScreen[l.screen]:T.won[n<1?0:1+(n-1)%4];}
 function reactionSpot(){return l.screen===0&&l.root===W.roots[4]?W.keeper:S().cheer;} // près de la plante de droite, elle la cacherait : elle fête depuis sa place
 function arrive(){phase='bloom';bloom=0;stopWater();for(const bed of nodes[n].beds)bed.classList.add('wet');$('result-text').textContent=T.drinks;state();audio('bloom');}
 function finish(){phase='won';if(n===save.done){save.done++;delete save.active;}setGrowth(n,1);persist();keeper('cheer',reactionSpot().x,reactionSpot().y);$('result-text').textContent=wonText();auto(wonText());audio('celebration');state();Ludi?.progress('jardin-pilote',save.done);Ludi?.checkpoint('plante-arrosee');ended();}
 // Le récit (ADR-027) : les habitants du hameau reviennent au fil des jardins, puis remercient la fontainière à la fin de l'écran.
 // Écran 2, les potagers : la famille de maraîchers (Rosa, Malik, Mamie Zohra) attend l'eau près de sa cabane ; Malik montre la
 // pièce qui partage l'eau avant le 30e jardin ; Rosa offre la pelle à la fin de l'écran.
 const PEOPLE={sami:{at:1,plan:0,x:.27,y:.215,story:true},noe:{at:6,plan:0,x:.335,y:.22,story:true},lina:{at:12,plan:0,x:.395,y:.215,story:true},
  rosa:{at:20,plan:1,x:.22,y:.19},zohra:{at:20,plan:1,x:.28,y:.195},malik:{at:29,plan:1,x:.34,y:.19,story:true},
  anselme:{at:40,plan:2,x:.22,y:.19},ines:{at:40,plan:2,x:.28,y:.195},tom:{at:50,plan:2,x:.34,y:.19,story:true},
  // Écran 4, la forêt : Margot la bûcheronne et les animaux (h : leur taille sur la carte, par rapport à une grande personne) ;
  // la biche et le hérisson viennent boire après le 70e jardin ; Margot offre sa carte de la vallée à la fin de l'écran.
  margot:{at:60,plan:3,x:.22,y:.19},fox:{at:60,plan:3,x:.28,y:.2,h:.55},squirrel:{at:60,plan:3,x:.33,y:.2,h:.38},
  doe:{at:70,plan:3,x:.39,y:.19,h:.8,story:true},hedgehog:{at:70,plan:3,x:.44,y:.2,h:.32},
  // Écran 5, le village (ADR-035) : Hugo le boulanger et sa fille Mila attendent l'eau ; Nour, la plus vieille du village,
  // revient avec les autres familles après le 90e jardin ; à la fin, elle rend à Aïna la clé de la source.
  hugo:{at:80,plan:4,x:.22,y:.19},mila:{at:80,plan:4,x:.28,y:.2},nour:{at:90,plan:4,x:.34,y:.19,story:true}};
 // les scènes de fin d'écran et d'arrivée : le jardin après lequel elles se jouent, et l'outil offert
 const SCENES=[{id:'thanks',at:20,tool:'key'},{id:'potagers',at:20},{id:'thanks2',at:40,tool:'shovel'},{id:'verger',at:40},{id:'thanks3',at:60,tool:'level'},{id:'foret',at:60},{id:'thanks4',at:80,tool:'map'},{id:'village',at:80},{id:'thanks5',at:100,tool:'source'}];
 function villagers(newOnes,plan){const host=$('villagers');host.replaceChildren();for(const[who,v]of Object.entries(PEOPLE)){if(save.done<v.at||v.plan!==plan)continue;const im=new Image();im.src='assets/pilot/villager-'+who+'.webp';im.className='villager'+(newOnes&&mapShown<v.at&&motion?' arriving':'');im.alt=T.people[who];im.dataset.who=who;im.style.left=v.x*100+'%';im.style.top=v.y*100+'%';if(v.h)im.style.height=7.5*v.h+'%';im.onclick=()=>{const line=T.talk[who];panel(who,'wave',line);speak(line);};host.append(im);}}
 function portrait(who,pose){return who==='keeper'?'assets/pilot/keeper-'+(pose==='receive'?'receive':pose==='wave'?'wave':'point')+'.webp':'assets/pilot/villager-'+who+(pose==='key'?'-key':'')+'.webp';}
 function panel(who,pose,text,title=''){$('home-portrait').src=portrait(who,pose);$('home-portrait').classList.toggle('child',['noe','malik','ines','tom','fox','squirrel','hedgehog','doe','mila'].includes(who));$('home-portrait').alt=who==='keeper'?T.keeper:T.people[who];document.querySelector('.home-dialogue .speaker').textContent=who==='keeper'?T.keeperOfValley:T.people[who];const h=document.querySelector('.home-dialogue h2');h.textContent=title;h.hidden=!title;$('home-message').textContent=text;fitMap();}
 function chest(){$('chest').hidden=!save.tools.length;$('chest').setAttribute('aria-label',T.chest);}
 // L'histoire en grandes images (comme Le Chemin du Roi) : une planche peinte, la légende, le visage de celui qui parle.
 // Après le 1er et le 3e jardin, un habitant revient ; après le 5e, les remerciements et la clé des vannes.
  function storyDue(){for(const s of SCENES)if(save.done===s.at&&!(s.id==='thanks'?save.thanked:save.seen.includes(s.id)))return s.id;for(const[who,v]of Object.entries(PEOPLE))if(save.done===v.at&&v.story&&!save.seen.includes(who))return who;return null;}
 function story(id,done){const pages=T.story[id],s=$('story'),im=$('story-image');window.PilotMusic?.play('histoire');let i=0;stopAudio();s.hidden=false;s.dataset.id=id;$('settings-panel').hidden=true;
  const page=()=>{const[img,who,text]=pages[i],src='assets/pilot/story-'+img+'.webp';s.dataset.page=i;
   if(im.dataset.src!==src){im.dataset.src=src;im.style.backgroundImage=`url(${src})`;s.style.setProperty('--story-bg',`url(${src})`);im.classList.remove('enter');void im.offsetWidth;if(motion)im.classList.add('enter');}
   const cap=document.querySelector('.story-caption');cap.classList.remove('arrive');void cap.offsetWidth;if(motion)cap.classList.add('arrive');cap.classList.toggle('talk',!!who);
   const face=document.querySelector('.story-face');face.hidden=!who;if(who)$('story-face').src='assets/pilot/face-'+who+'.webp';
   $('story-speaker').textContent=who?(who==='keeper'?T.keeper:T.people[who]):'';$('story-text').textContent=text;auto(text);};
  const close=()=>{s.hidden=true;delete s.dataset.id;try{speechSynthesis.cancel();}catch{}done();};
  const next=()=>{if(pause)return;i++;if(i>=pages.length)close();else{audio('turn');page();}};
  $('story-next').onclick=e=>{e.stopPropagation();next();};im.onclick=next;$('story-skip').onclick=close;page();}
 function keyToChest(tool='key'){const key=$('flying-key'),to=$('chest').getBoundingClientRect(),box=$('game').getBoundingClientRect();if(!motion)return;key.src='assets/pilot/tool-'+tool+'.webp';
  key.hidden=false;key.style.transition='none';key.style.opacity=1;key.style.width='90px';key.style.left=box.width/2-45+'px';key.style.top=box.height*.4+'px';
  requestAnimationFrame(()=>requestAnimationFrame(()=>{key.style.transition='';key.style.left=to.left-box.left+4+'px';key.style.top=to.top-box.top+8+'px';key.style.width='44px';key.style.opacity=0;}));
  setTimeout(()=>{key.hidden=true;$('chest').classList.add('bump');setTimeout(()=>$('chest').classList.remove('bump'),700);},1100);}
 // La fin (ADR-004, ADR-024, ADR-035) : après les remerciements du village, la vidéo de toute la vallée verte, puis le générique.
 // La vidéo a son propre son, joué si les bruitages sont allumés ; si elle ne se charge pas, l'image de la vallée la remplace.
 function ending(done){const e=$('ending'),v=$('ending-video'),c=$('ending-credits');stopAudio();window.PilotMusic?.play(null);e.hidden=false;c.hidden=true;$('ending-still').hidden=true;
  $('ending-skip').textContent=T.ending.skip;c.querySelector('h2').textContent=T.ending.title;c.querySelector('.ending-lines').innerHTML=T.ending.lines.map(x=>'<p></p>').join('');c.querySelectorAll('.ending-lines p').forEach((p,i)=>p.textContent=T.ending.lines[i]);$('ending-again').textContent=T.ending.again;
  let shown=false;const credits=()=>{if(shown)return;shown=true;v.pause();c.hidden=false;$('ending-skip').hidden=true;auto(T.ending.lines.join(' '));};
  const still=()=>{v.hidden=true;$('ending-still').hidden=false;setTimeout(credits,motion?9000:500);};
  $('ending-skip').hidden=false;$('ending-skip').onclick=credits;$('ending-again').onclick=()=>{e.hidden=true;v.pause();done();};
  v.hidden=false;v.muted=!save.sound;v.onended=credits;v.onerror=still;v.src='assets/pilot/fin.mp4';v.currentTime=0;const p=v.play();if(p&&p.catch)p.catch(()=>{v.muted=true;v.play().catch(still);});}
 // « Le savais-tu ? » (ADR-036) : l'eau et les plantes, un tous les quatre jardins, la première fois qu'on finit ce jardin. Une image
 // quand il y en a une, le texte lu à voix haute selon le réglage de lecture.
 function factDue(){const k=n+1;return T.facts[k]&&n===save.done-1&&!(save.facts||[]).includes(k)?k:null;}
 function fact(k,done){const[img,text]=T.facts[k],box=$('fact'),im=$('fact-image');stopAudio();box.hidden=false;$('fact-title').textContent=T.factTitle;$('fact-text').textContent=text;$('fact-next').textContent=T.factNext;
  im.hidden=!img;if(img){im.style.backgroundImage=`url(assets/pilot/${img}.webp)`;im.classList.toggle('sprite',img.startsWith('villager-'));}
  auto(text);$('fact-next').onclick=()=>{box.hidden=true;try{speechSynthesis.cancel();}catch{}save.facts=[...(save.facts||[]),k];persist();done();};}
 function afterStory(id){const scene=SCENES.find(s=>s.id===id);if(id==='thanks')save.thanked=true;else if(!save.seen.includes(id))save.seen.push(id);if(scene?.tool){Ludi?.checkpoint('fin-ecran');if(!save.tools.includes(scene.tool))save.tools.push(scene.tool);}persist();
  const next=storyDue();if(next){story(next,()=>afterStory(next));return;}if(id==='thanks5'&&!save.endSeen){save.endSeen=true;persist();ending(()=>{home();if(scene?.tool)setTimeout(()=>keyToChest(scene.tool),motion?400:0);});return;}home();if(scene?.tool)setTimeout(()=>keyToChest(scene.tool),motion?400:0);}
 function tools(open){$('tools').hidden=!open;if(!open)return;document.querySelector('.tools-title').textContent=T.toolsTitle;const ul=$('tools').querySelector('ul');ul.replaceChildren();for(const id of save.tools){const[name,what]=T.tools[id]||[];const li=document.createElement('li');li.className='readable';li.innerHTML=`<img src="assets/pilot/tool-${id}.webp" alt=""><span><b></b></span>`;li.querySelector('b').textContent=name;li.querySelector('span').append(what);ul.append(li);}$('replay').innerHTML=T.replay;$('replay').hidden=!save.thanked;$('replay').dataset.scene=save.seen.includes('thanks5')?'thanks5':save.seen.includes('thanks4')?'thanks4':save.seen.includes('thanks3')?'thanks3':save.seen.includes('thanks2')?'thanks2':'thanks';$('tools-close').setAttribute('aria-label',T.close);}
 function currentPlan(){return Math.floor(Math.min(save.done,LAST)/SCREEN);}
 function home(_,plan=currentPlan()){stopAudio();show('home');tools(false);const from=motion?Math.min(mapShown,save.done):save.done,mine=plan===currentPlan();ValleyMap.render($('valley-frame'),save.done,{plan,onSelect:i=>i<save.done?start(i):$('begin').onclick(),available:AVAILABLE,from,label:T.field});$('home-valley').src=ValleyMap.image(plan,'dry');$('home').dataset.plan=plan;
  document.querySelectorAll('.plan-stone').forEach((s,i)=>{s.classList.toggle('selected',i===plan);s.classList.toggle('open',i<=currentPlan());s.disabled=i>currentPlan();});document.querySelector('.valley-path>p').textContent=T.parts[plan];
  if(motion&&from===0&&save.done>0){const ch=$('valley-frame').querySelector('.channel-wet');ch?.classList.add('growing');requestAnimationFrame(()=>requestAnimationFrame(()=>ch?.classList.remove('growing')));}
  villagers(true,plan);const arrived=save.done>mapShown?T.arrive[save.done]:null;mapShown=save.done;chest();
  const all=save.done===AVAILABLE,first=save.done%SCREEN===0&&save.done>0&&!all,k=all?2:save.done>0?1:0;
  const title=all?T.screenDone[plan]:first?T.screenStart[plan][0]:T.homeTitle[k],text=arrived||(all?T.screenDoneText[plan]:first?T.screenStart[plan][1]:T.homeText[k]);
  panel('keeper','point',text,title);$('begin').innerHTML=T.begin[k]+' <span>➜</span>';$('begin').hidden=!mine;if($('title').hidden)auto(title+'. '+text);$('home').dataset.restored=all?'true':'false';fitMap();}
 // La fin du jeu : quand le dernier jardin de la vallée est rendu (Pilot.finished), Ludiworld le sait (Ludi.fini, une seule fois
 // suffit, il ne s'enlève jamais) et la carte le montre avec une forme, la clé de la source, pas seulement une couleur.
 function ended(){const done=P.finished(save.done);$('finished').hidden=!done;if(done)Ludi?.fini?.();}
 // la carte garde la place du plus haut panneau vu sur cet écran : elle ne bouge pas d'une réplique à l'autre
 function fitMap(){const d=document.querySelector('.home-dialogue');if(!d||$('home').hidden)return;const h=d.offsetHeight+Math.max(0,-parseFloat(getComputedStyle($('home-portrait')).marginTop)||0),size=view().w+'x'+view().h;if(fitMap.size!==size||h>fitMap.h){fitMap.size=size;fitMap.h=h;}$('home').style.setProperty('--card',fitMap.h+'px');}
 function resize(){
  fitMap();const v=view();cam=P.camera(v.w,v.h,undefined,S().play);sizeTargets();applyCamera();const d=Math.min(devicePixelRatio||1,2);petals.width=Math.round(v.w*d);petals.height=Math.round(v.h*d);canvas.width=AREA.w*AREA.r;canvas.height=AREA.h*AREA.r;draw();drawParticles(0);
 }
 function sizeTargets(){const B=l.board,size=Math.max(B.cell,46/cam.scale),pad=(size-B.cell)/2;tiles.forEach((b,p)=>{b.style.width=size+'px';b.style.height=size+'px';b.style.left=(p%B.cols*B.cell-pad)+'px';b.style.top=(Math.floor(p/B.cols)*B.cell-pad)+'px';b.style.setProperty('--pad',pad+'px');});}
 function applyCamera(){const z=zoom,c={scale:cam.scale*z,tx:cam.tx+(1-z)*cam.scale*l.root.x,ty:cam.ty+(1-z)*cam.scale*l.root.y};$('camera').style.transform=`matrix(${c.scale},0,0,${c.scale},${c.tx},${c.ty})`;$('garden').dataset.camera=JSON.stringify(c);[...$('target').children].forEach((d,k)=>{const q=P.project(dropAt[k],c);d.style.left=q.x+'px';d.style.top=q.y+'px';const e=l.ends[k],g=geometry.find(s=>s.p===e.cell&&s.exit===e.exit);d.classList.toggle('filled',!!g&&['flow','bloom','won'].includes(phase)&&head>=g.start+g.length);});   /* la goutte d'un bec que l'eau a atteint se remplit et s'efface */return c;}
 function path(c,s,amount=1){const p=s.point(0);c.beginPath();c.moveTo(p.x,p.y);for(let i=1;i<=64;i++){const q=s.point(amount*i/64);c.lineTo(q.x,q.y);}}
 function draw(){
  applyCamera();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.setTransform(AREA.r,0,0,AREA.r,-AREA.x*AREA.r,-AREA.y*AREA.r);
  const feed=geometry[0],fall=$('fall');fall.style.left=W.source.x+'px';fall.style.top=W.source.y+'px';fall.style.setProperty('--length',feed.length+'px');fall.style.setProperty('--flow',Math.min(1,head/feed.length).toFixed(3));fall.classList.toggle('on',head>0);
  if(head>0){if(Pieces.ready())drawWater();
   const markers=[];for(let i=0;i<Math.ceil(total/95);i++){const distance=(clock*108+i*95)%total;if(distance>head)continue;markers.push(distance);if(distance<feed.length)continue;const p=pointAt(distance),a=pointAt(Math.max(0,distance-2)),b=pointAt(Math.min(total,distance+2));ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.atan2(b.y-a.y,b.x-a.x));ctx.beginPath();ctx.ellipse(0,0,7,1.4,0,0,Math.PI*2);ctx.fillStyle='#f4fffd90';ctx.fill();ctx.restore();}$('garden').dataset.current=JSON.stringify(markers);
   const inside=P.dirs[l.exit],e0=endCell(l.ends[0]),out={x:e0.x+72+inside[0]*72,y:e0.y+72+inside[1]*72},outlet=$('outlet');outlet.style.left=out.x+inside[0]*26+'px';outlet.style.top=out.y+inside[1]*26+'px';   // au bout du bec (la case du bec peut être hors du plateau)
   outlet.classList.toggle('on',l.exit!==2&&['bloom','won'].includes(phase));const tip=pointAt(head);$('garden').dataset.tip=JSON.stringify(tip);const spill=$('spill');spill.classList.toggle('on',phase==='leak');if(phase==='leak'){spill.style.left=tip.x+'px';spill.style.top=tip.y+'px';}
  }else{$('spill').classList.remove('on');$('outlet').classList.remove('on');}
  $('garden').dataset.head=head.toFixed(4);$('garden').dataset.total=total.toFixed(4);
 }
 function burst(){for(const e of l.ends)for(let i=0;i<(screenEnd(n)?36:20);i++)particles.push({x:e.root.x,y:e.root.y,vx:(Math.random()-.5)*150,vy:-20-Math.random()*140,age:0,color:['#ee5b3b','#ffd27a','#6fe3d8'][i%3],r:Math.random()*6.3});}
 function drawParticles(dt){const d=Math.min(devicePixelRatio||1,2),c=applyCamera(),v=view();fx.setTransform(d,0,0,d,0,0);fx.clearRect(0,0,v.w,v.h);fx.setTransform(d*c.scale,0,0,d*c.scale,d*c.tx,d*c.ty);for(const p of particles){p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=70*dt;p.r+=dt;fx.save();fx.globalAlpha=Math.max(0,1-p.age/2);fx.translate(p.x,p.y);fx.rotate(p.r);fx.fillStyle=p.color;fx.beginPath();fx.ellipse(0,0,7,3,0,0,Math.PI*2);fx.fill();fx.restore();}particles=particles.filter(p=>p.age<2);}
 function tick(now){const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;if(!pause&&!document.hidden&&activeScreen==='garden'){clock+=dt;if(phase==='flow'&&now>=busyUntil){head=Math.min(total,head+dt*190);if(head===total){if(P.trace(l,board).status==='win')arrive();else{phase='leak';stopWater();audio('leak');note(T.leak);auto(T.leak);state();}}}
   if(phase==='bloom'){bloom+=dt;const f=Math.min(1,bloom/2.7);setGrowth(n,Math.max(0,Math.min(1,(f-.15)/.58)));if(motion)zoom=1+.035*Math.sin(f*Math.PI/2);if(f>.72&&$('keeper').dataset.pose!=='walk'&&$('keeper').dataset.pose!=='cheer')keeper('walk',reactionSpot().x,reactionSpot().y);if(f>.82&&!particles.length)burst();if(f===1)finish();}draw();drawParticles(dt);}requestAnimationFrame(tick);}
 $('begin').onclick=()=>{if(save.done===AVAILABLE){n=LAST;l=P.level(LAST);board=l.solution.slice();showGarden();renderBoard();connections();head=total;phase='won';show('garden');state();resize();$('result-text').textContent=T.wonScreen[l.screen];$('next').innerHTML=T.again+' <span>➜</span>';}else start(save.done,true);};
 $('next').onclick=()=>{if(pause||wrap||phase!=='won')return;if(screenEnd(n))Ludi?.checkpoint('jardin-termine');const go=()=>{const due=storyDue();if(due)story(due,()=>afterStory(due));else home(undefined,n<save.done-1?Math.floor(n/SCREEN):currentPlan());};const f=factDue();if(f)fact(f,go);else go();};$('valve').onclick=water;$('back').onclick=()=>{if(!['flow','bloom'].includes(phase)&&!pause)home();};
 $('restart').onclick=()=>{if(!pause&&!['flow','bloom'].includes(phase))start(n);};$('hint').onclick=()=>hint();$('undo').onclick=()=>{if(pause||!history.length||['flow','bloom','won'].includes(phase))return;board=history.pop();phase='build';head=0;renderBoard();connections();state();persist();};
 $('settings').onclick=()=>{$('settings-panel').hidden=!$('settings-panel').hidden;};$('sound').onclick=()=>{const on=!save.sound;let done=null;try{done=window.Ludi?.reglerSon?.({bruitages:on,musique:on});}catch{}if(!done){save.sound=on;window.PilotMusic?.setOn(on);soundButton();if(!on)stopAudio();persist();}if(on)audio('turn');};   /* le bouton du jeu coupe ou rallume les bruitages et la musique */$('chest').onclick=()=>tools($('tools').hidden);$('tools-close').onclick=()=>tools(false);$('replay').onclick=()=>{tools(false);/* après les remerciements du village, la fin se revoit aussi */const sc=$('replay').dataset.scene||'thanks';story(sc,()=>sc==='thanks5'?ending(()=>home()):home());};
 $('reading').onclick=()=>{const order=['none','some','all'];save.reading=order[(order.indexOf(readingLevel())+1)%3];readingButton();persist();speak(T.reading[save.reading]);};$('fullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.().catch(()=>{});};
 addEventListener('resize',resize);addEventListener('pagehide',()=>{persist();stopAudio();});document.addEventListener('visibilitychange',()=>{persist();last=performance.now();if(document.hidden)stopAudio();else if(phase==='flow')audio('water');});
 if(window.Ludi){Ludi.init({game:'au-fil-de-leau'});
  // Reprendre sur un autre appareil : la partie gardée par Ludiworld remplace celle de cet appareil, sauf ses réglages (son, lecture).
  Ludi.onRestore?.(data=>{if(!data||typeof data!=='object')return;save={...save,...data,sound:save.sound,reading:save.reading};try{localStorage.setItem(KEY,JSON.stringify(save));}catch{}location.reload();});
  Ludi.onSon?.(s=>{save.sound=!!s.bruitages;voice=!!s.voix;window.PilotMusic?.setOn(!!s.musique);soundButton();if(!save.sound)stopAudio();if(!voice)try{speechSynthesis.cancel();}catch{}});
  Ludi.onReading?.(()=>readingButton());Ludi.onPause(()=>{pause=true;persist();stopAudio();window.PilotMusic?.pause(true);document.body.classList.add('paused');$('pause').hidden=false;state();});Ludi.onWrapUp(()=>{wrap=true;note(T.wrap);auto(T.wrap);if(activeScreen==='home'||phase==='won')Ludi.checkpoint('pause-jardin');state();});}
 soundButton();window.PilotMusic?.play('vallee');   // l'écran titre ; le son part au premier toucher
 T.plans.forEach((name,i)=>{const node=document.createElement('button');node.className='plan-stone';node.setAttribute('aria-label',name+(i<=currentPlan()?T.planHere:T.planLater));node.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21V10M12 14C3 14 3 7 3 7s9-1 9 7ZM12 10c0-8 9-8 9-8s1 8-9 8Z"/></svg>';node.onclick=()=>{if(i<=currentPlan())home(null,i);};$('valley-plans').append(node);});
 $('sound').setAttribute('aria-label',save.sound?T.soundOff:T.soundOn);readingButton();ended();
 plantNodes();connections();renderBoard();resize();home();
 const load=src=>new Promise((ok,no)=>{const i=new Image();i.onload=ok;i.onerror=no;i.src=src;});
 Promise.all([load('assets/pilot/title.webp'),load('assets/pilot/story-secheresse.webp'),load('assets/pilot/court.webp'),load('assets/pilot/court-b.webp'),load('assets/pilot/court-c.webp'),load('assets/pilot/rocks.webp'),load('assets/pilot/map-dry.webp'),load('assets/pilot/map-wet.webp'),load('assets/pilot/actors.webp'),load('assets/pilot/actors-2.webp'),load('assets/pilot/actors-3.webp'),load('assets/pilot/trees-3.webp'),load('assets/pilot/actors-4.webp'),load('assets/pilot/trees-4.webp'),load('assets/pilot/stumps.webp'),load('assets/pilot/roots.webp'),load('assets/pilot/trees-5.webp'),load('assets/pilot/barrels.webp'),load('assets/pilot/walls.webp'),load('assets/pilot/stream.webp'),load('assets/pilot/splash.webp'),load('assets/pilot/gate.webp'),Pieces.load(),...['idle','walk','cheer','point','wave','receive'].map(p=>load('assets/pilot/keeper-'+p+'.webp')),...['sami','lina','lina-key','noe'].map(p=>load('assets/pilot/villager-'+p+'.webp')),load('assets/pilot/chest.webp'),load('assets/pilot/tool-key.webp')]).then(()=>{actors=true;renderBoard();keeper('idle',S().keeper.x,S().keeper.y);document.querySelectorAll('.plant').forEach(p=>p.querySelectorAll('.sprite').forEach(s=>s.style.backgroundImage=p.classList.contains('tree')?`url(assets/pilot/trees-${+p.dataset.screen+1}.webp)`:`url(assets/pilot/actors${+p.dataset.screen?'-'+(+p.dataset.screen+1):''}.webp)`));ready=true;$('game').dataset.ready='true';state();if(goTo>=1&&goTo<=AVAILABLE)enter();}).catch(()=>{note(T.loading);});
 if('serviceWorker'in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
 // L'écran titre, à chaque ouverture ; « Jouer » ouvre l'histoire la première fois, puis la vallée (ou le jardin en cours).
 function enter(){$('title').hidden=true;if(resumeRequest.screen==='garden'&&save.done<AVAILABLE&&!enter.done){enter.done=true;save.active=resumeRequest.active;start(resumeRequest.plant,true);}else if(new URLSearchParams(location.search).has('jardin')&&!enter.done){enter.done=true;$('begin').onclick();}else home();}
 $('play').textContent=save.intro?T.resume:T.play;
 $('play').onclick=()=>{if(!ready)return;audio('turn');if(!save.intro)story('intro',()=>{save.intro=true;persist();enter();});else enter();};
 requestAnimationFrame(tick);
})();
