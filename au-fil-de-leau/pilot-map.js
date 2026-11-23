(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ValleyMap=api;})(typeof globalThis==='object'?globalThis:this,function(){
 // The map of one part of the valley, painted in portrait (assets/pilot/map-dry.webp and map-wet.webp, tools/prepare_portrait.py):
 // twenty plots in five rows of four, on both sides of a channel that runs down from the spring.
 // A plot is a garden, and a garden is a level (ADR-023): when its plant (later, its plants) has drunk, the plot turns green.
 const plans=['La source','Les potagers','Le verger','La forêt','Le village'];
 const RATIO=2304/1856,VIEW={w:1000,h:Math.round(1000*RATIO)};
 const COLS=[.2694,.4095,.5975,.7365],ROWS=[.2743,.3918,.5094,.6269,.7444],W=.124,H=.094;   // measured on the painted plots
 const CHANNEL={left:.477,right:.525,top:.15};                                          // the channel, below the spring
 // One painting per part of the valley; the later ones are retouches of the first, so the plots stay at the same places.
 // From the second part on, the channel comes in from the top of the screen: it already holds water down to the first row.
 const IMAGES=['map','map2','map3','map4','map5'];function image(plan,kind){return'assets/pilot/'+IMAGES[plan]+'-'+kind+'.webp';}
 function cell(index){const local=index%20,row=Math.floor(local/4),col=local%4;return{index,plan:Math.floor(index/20),slot:local,row,col,x:COLS[col],y:ROWS[row],w:W,h:H};}
 // done: the number of gardens restored so far in the whole valley
 function states(done,plan=0){const d=Math.max(0,Math.min(100,Math.floor(done)||0));return Array.from({length:20},(_,i)=>{const c=cell(plan*20+i);return{...c,wet:c.index<d,current:c.index===d};});}
// How far down the channel holds water: to the bottom of the lowest row with a restored garden.
 // When the twenty gardens are green, the water goes on out of the bottom of the screen, towards the next part of the valley (ADR-024).
 function channel(done,plan=0){const wet=states(done,plan).filter(c=>c.wet),top=plan?0:CHANNEL.top;if(!wet.length)return{...CHANNEL,top,bottom:plan?ROWS[0]-H/2:top};if(wet.length===20)return{...CHANNEL,top,bottom:1};return{...CHANNEL,top,bottom:ROWS[Math.max(...wet.map(c=>c.row))]+H/2};}
 function render(host,done,{plan=0,onSelect=()=>{},available=5,from=done,label=(i,wet)=>'Jardin '+i+(wet?', irrigué':', asséché')}={}){
  const ns='http://www.w3.org/2000/svg',svg=host.querySelector('svg'),buttons=host.querySelector('.valley-fields');svg.replaceChildren();buttons.replaceChildren();svg.setAttribute('viewBox',`0 0 ${VIEW.w} ${VIEW.h}`);
  const defs=document.createElementNS(ns,'defs');svg.append(defs);host.dataset.restored=Math.max(0,Math.min(20,done-plan*20));host.dataset.plan=plan;
  const el=(name,attrs)=>{const e=document.createElementNS(ns,name);for(const k in attrs)e.setAttribute(k,attrs[k]);return e;};
  const wetImage=()=>el('image',{href:image(plan,'wet'),width:VIEW.w,height:VIEW.h});
  const c0=channel(done,plan),clip=el('clipPath',{id:'channel-'+plan});clip.append(el('rect',{x:c0.left*VIEW.w,y:c0.top*VIEW.h,width:(c0.right-c0.left)*VIEW.w,height:Math.max(0,(c0.bottom-c0.top)*VIEW.h)}));defs.append(clip);
  const water=wetImage();water.setAttribute('clip-path','url(#channel-'+plan+')');water.classList.add('channel-wet');svg.append(water);host.dataset.channel=c0.bottom.toFixed(4);
  const before=states(from,plan),grow=[];
  for(const c of states(done,plan)){
   // the green garden, shown through a soft edge that spreads from the channel side when it has just been restored
   const id='garden-'+plan+'-'+c.slot,side=c.col<2?{x1:1,x2:0}:{x1:0,x2:1},g=el('linearGradient',{id:id+'-g',x1:side.x1,y1:0,x2:side.x2,y2:0}),a=el('stop',{'stop-color':'#fff'}),b=el('stop',{'stop-color':'#000'});g.append(a,b);
   const mask=el('mask',{id:id+'-m'});mask.append(el('rect',{x:(c.x-c.w/2)*VIEW.w,y:(c.y-c.h/2)*VIEW.h,width:c.w*VIEW.w,height:c.h*VIEW.h,rx:14,fill:`url(#${id}-g)`}));defs.append(g,mask);
   const set=p=>{const e=p>=1?1.2:p<=0?-.2:p;a.setAttribute('offset',Math.max(0,e-.08));b.setAttribute('offset',Math.min(1,e+.08));};
   const old=before[c.slot].wet?1:0,now=c.wet?1:0;set(old);if(old!==now)grow.push({set,from:old,to:now});
   const im=wetImage();im.setAttribute('mask',`url(#${id}-m)`);im.dataset.field=c.slot;im.classList.add('field-wet');svg.append(im);
   const btn=document.createElement('button');btn.className='valley-field'+(c.wet?' restored':'')+(c.current&&c.index<available?' current':'');btn.dataset.field=c.slot;btn.style.cssText=`left:${c.x*100}%;top:${c.y*100}%;width:${c.w*100}%;height:${c.h*100}%`;btn.disabled=c.index>=available||!(c.current||c.wet);   // un jardin déjà vert se rejoue (retour de Julien, 23 novembre)
   btn.setAttribute('aria-label',label(c.index+1,c.wet));btn.onclick=()=>onSelect(c.index);if(c.current&&c.index<available)btn.innerHTML='<svg viewBox="0 0 24 30" aria-hidden="true"><path d="M12 2C9 8 4 12 4 17a8 8 0 0 0 16 0c0-5-5-9-8-15Z"/></svg>';buttons.append(btn);
  }
  if(grow.length){const t0=performance.now(),step=now=>{const k=Math.min(1,(now-t0)/1400),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;for(const g of grow)g.set(g.from+(g.to-g.from)*e);if(k<1)requestAnimationFrame(step);};requestAnimationFrame(step);}
 }
 return{cell,states,channel,plans,ratio:RATIO,render,image};
});
