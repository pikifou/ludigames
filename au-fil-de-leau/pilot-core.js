(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.Pilot=api;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 // The game is played in portrait (ADR-022). The painted courtyard (assets/pilot/court.webp, tools/prepare_portrait.py)
 // sits in the world so that the fountain's spout pours on the top of the board; everything else is placed around it.
 const world={width:3200,height:3200,
  court:{x:1049.28,y:519.35,w:1100,h:1970.83},
  play:{left:1170,right:2030,top:900,bottom:2190},         // what must always be on screen: fountain, keeper, plants
  board:{x:1384,y:1320,cell:144,cols:3,rows:3},
  source:{x:1600,y:1280},                                    // the lip of the opening in the fountain's rim
  valve:{x:1601.8,y:1221.2},gate:{x:1542,y:1154.6,w:119.6,h:133.2}, // the wooden board that closes that opening
  keeper:{x:1945,y:1310},cheer:{x:1905,y:1850},
  roots:[{x:1456,y:1986},{x:1600,y:2130},{x:1744,y:1986},{x:1294,y:1536},{x:1906,y:1536}]}; // the centres of the plants' basins: each basin's wall (radius 100) laps 10 px over the end of the channel
 // Each screen of the valley (ADR-024) has its board and its places for plants. The fountain stays where it is: the water
 // always enters the second column. Screen 2, the vegetable gardens: a 4 × 4 board that grows to the right and down; plants
 // below it (one fixed piece away) or on its left.
 const SCREENS=[
  {board:world.board,roots:world.roots,play:world.play,keeper:world.keeper,cheer:world.cheer},
  {board:{x:1384,y:1320,cell:144,cols:4,rows:4},
   roots:[{x:1456,y:2130},{x:1600,y:2130},{x:1744,y:2130},{x:1888,y:2130},{x:1294,y:1536},{x:1294,y:1680}],
   play:{left:1170,right:2010,top:900,bottom:2190},keeper:world.keeper,cheer:world.keeper},
  // Screen 3, the orchard: a board five columns wide, centred under the fountain (the water enters the middle column), plants
  // below it, one fixed piece away. An old tree drinks at two places at once (two ends of the same plant): it stands between
  // them, under the board.
  {board:{x:1240,y:1320,cell:144,cols:5,rows:4},start:2,
   roots:[{x:1312,y:2130},{x:1456,y:2130},{x:1600,y:2130},{x:1744,y:2130},{x:1888,y:2130}],
   play:{left:1170,right:2010,top:900,bottom:2250},keeper:world.keeper,cheer:world.keeper},
  // Screen 4, the forest: the same board as the orchard (a row more would not fit a small phone). Tree stumps take a cell,
  // like the rocks, and roots lie across the line between two cells: the water cannot go past a root (barriers).
  {board:{x:1240,y:1320,cell:144,cols:5,rows:4},start:2,
   roots:[{x:1312,y:2130},{x:1456,y:2130},{x:1600,y:2130},{x:1744,y:2130},{x:1888,y:2130}],
   play:{left:1170,right:2010,top:900,bottom:2250},keeper:world.keeper,cheer:world.keeper},
  // Screen 5, the village (ADR-035): the same board again; two old lime trees of the square, each drinking at two spouts side
  // by side; low garden walls lie across the line between two cells, like the roots of the forest, and barrels take a cell.
  {board:{x:1240,y:1320,cell:144,cols:5,rows:4},start:2,
   roots:[{x:1312,y:2130},{x:1456,y:2130},{x:1600,y:2130},{x:1744,y:2130},{x:1888,y:2130}],
   play:{left:1170,right:2010,top:900,bottom:2250},keeper:world.keeper,cheer:world.keeper}];
 const dirs=[[0,-1],[1,0],[0,1],[-1,0]],opp=d=>(d+2)%4,rotate=m=>((m<<1)&15)|(m>>3);
 const bits=m=>(m&1)+(m>>1&1)+(m>>2&1)+(m>>3&1);
 // the kind of a piece, whatever its rotation: a straight, a bend, or a tee that shares the water in two
 function shape(m){return!m?'none':bits(m)===3?'tee':m===5||m===10?'straight':'bend';}
 // a root lying across the line between cell p and its neighbour towards d (barriers: [cell, 1 right or 2 down])
 function blocked(l,p,d){const q=neighbour(l.board,p,d);return(l.barriers||[]).some(([c,e])=>c===p&&e===d||c===q&&e===opp(d));}
 function neighbour(b,p,d){const x=p%b.cols+dirs[d][0],y=Math.floor(p/b.cols)+dirs[d][1];return x<0||y<0||x>=b.cols||y>=b.rows?-1:y*b.cols+x;}
 // Un jardin. Écran 1 : son chemin (de la case sous la fontaine à la plante), ses pièces mal tournées (turns), ses pièces qui
 // ne servent pas (extras), ses rochers et ses pièces fixées. Écran 2 : les pièces de la solution (solution), et une ou deux
 // plantes (ends). Les jardins : pilot-levels.js, fait par tools/levels-source.cjs.
 function build(t){const S=SCREENS[t.screen||0],b=S.board,N=b.cols*b.rows;let solution,ends,extras;
  if(t.route){solution=Array(N).fill(0);const dir=(p,q)=>dirs.findIndex((_,d)=>neighbour(b,p,d)===q);
   t.route.forEach((p,i)=>{solution[p]=(1<<(i?dir(p,t.route[i-1]):0))|(1<<(i<t.route.length-1?dir(p,t.route[i+1]):t.exit));});
   for(const[p,m]of Object.entries(t.extras||{}))solution[p]=m;extras=Object.keys(t.extras||{}).map(Number);ends=[{cell:t.route.at(-1),exit:t.exit,root:S.roots[t.root]}];}
  else{solution=t.solution.slice();extras=(t.extras||[]).slice();ends=t.ends.map((e,k)=>({cell:e.cell,exit:e.exit,root:S.roots[e.root],plant:e.plant??k}));}
  const initial=solution.slice();for(const[p,r]of Object.entries(t.turns||{}))for(let i=0;i<r;i++)initial[p]=rotate(initial[p]);
  // the cells the water goes through, from the fountain: what the hint looks at
  const start=S.start??1,route=[],queue=[[start,0]];while(queue.length){const[p,enter]=queue.shift();if(route.includes(p))continue;route.push(p);for(let d=0;d<4;d++){if(d===enter||!(solution[p]&1<<d))continue;if(ends.some(e=>e.cell===p&&e.exit===d))continue;const q=neighbour(b,p,d);if(q>=0)queue.push([q,opp(d)]);}}
  const fixed=(t.fixed||[route[0],...ends.map(e=>e.cell)]).slice();
  return{screen:t.screen||0,board:b,cols:b.cols,rows:b.rows,start,route,initial,solution,fixed,old:(t.old||[]).slice(),barriers:(t.barriers||[]).map(x=>x.slice()),rocks:(t.rocks||[]).slice(),extras,ends,exit:ends[0].exit,root:ends[0].root};}
 const LEVELS=(typeof PilotLevels!=='undefined'?PilotLevels:typeof require==='function'?(()=>{try{return require('./pilot-levels.js');}catch{return[];}})():[]);
 const SCREEN=20;                                   // gardens on one screen of the map
 function level(n){return{number:n+1,...build(LEVELS[n])};}
 function screenOf(n){return Math.floor(n/SCREEN);}
 // The water, from the fountain: it enters the piece under the spout from the top, then leaves each piece through every
 // other opening (two for a tee). It wins when it reaches every plant and spills nowhere.
 // parts: one per stretch of channel the water runs along, with the part it came from (parent), in the order it flows.
 function trace(l,board){const b=l.board,parts=[],seen=new Set(),reached=new Set();let leak=false;const queue=[[l.start??1,0,-1]];
  while(queue.length){const[p,enter,parent]=queue.shift();if(p<0||seen.has(p)||!board[p]||l.rocks.includes(p)||!(board[p]&(1<<enter))){leak=true;continue;}seen.add(p);
   for(let d=0;d<4;d++){if(d===enter||!(board[p]&(1<<d)))continue;const i=parts.push({p,enter,exit:d,parent})-1;const e=l.ends.findIndex(e=>e.cell===p&&e.exit===d);
    if(e>=0){reached.add(e);continue;}if(blocked(l,p,d)){leak=true;continue;}queue.push([neighbour(b,p,d),opp(d),i]);}}
  return{status:!leak&&reached.size===l.ends.length?'win':'leak',parts,reached:[...reached]};}
 // La difficulté d'un jardin, mesurée : le moins de pièces à tourner pour que l'eau arrive à chaque plante, puis le moins de
 // rotations. La recherche suit l'eau depuis la fontaine : seules les pièces qu'elle traverse comptent. Le score ajoute les
 // pièces inutiles, la longueur du chemin, les rochers, la dernière pièce libre, une deuxième plante, un plateau plus grand
 // et les racines de la forêt.
 const difficulty={measure(l){const b=l.board,period=m=>shape(m)==='straight'?2:4;let best={fix:Infinity,taps:Infinity};
   const walk=(queue,assigned,reached,fix,taps)=>{if(fix>best.fix||fix===best.fix&&taps>=best.taps)return;
    if(!queue.length){if(reached.size===l.ends.length)best={fix,taps};return;}
    const[[p,enter],...rest]=queue;if(p<0||assigned.has(p)||!l.initial[p]||l.rocks.includes(p))return;
    const m0=l.initial[p],turns=l.fixed.includes(p)?1:period(m0);let m=m0;
    for(let r=0;r<turns;r++,m=rotate(m)){if(!(m&1<<enter))continue;const next=rest.slice(),got=new Set(reached);let ok=true;
     for(let d=0;d<4&&ok;d++){if(d===enter||!(m&1<<d))continue;const e=l.ends.findIndex(e=>e.cell===p&&e.exit===d);if(e>=0){if(got.has(e))ok=false;got.add(e);continue;}const q=neighbour(b,p,d);if(q<0||assigned.has(q)||blocked(l,p,d))ok=false;else next.push([q,opp(d)]);}
     if(ok){const a=new Set(assigned);a.add(p);walk(next,a,got,fix+(r?1:0),taps+r);}}};
   walk([[l.start??1,0]],new Set(),new Set(),0,0);
   const pieces=l.initial.filter((m,p)=>m&&!l.fixed.includes(p)).length;
   return{solvable:best.fix<Infinity,taps:best.taps,fix:best.fix,pieces,extras:l.extras.length,length:l.route.length,rocks:l.rocks.length,plants:l.ends.length,
    lastFree:l.ends.some(e=>!l.fixed.includes(e.cell)),cells:l.cols*l.rows,barriers:(l.barriers||[]).length};},
  score(m){return 2*m.fix+2*m.extras+m.length+.5*m.rocks+(m.lastFree?1.5:0)+.2*m.taps+5*(m.plants-1)+.5*(m.cells-9)+.8*(m.barriers||0);}};
 // A bend follows the painted channel (assets/pilot/pieces-*.webp): it leaves each port square to the side, 72 px
 // from the corner, and passes about 68 px from it midway (measured on the painted pieces).
 function along(f){const pts=[],ds=[0];let length=0;for(let i=0;i<=64;i++){const p=f(i/64);pts.push(p);if(i){length+=Math.hypot(p.x-pts[i-1].x,p.y-pts[i-1].y);ds.push(length);}}return{length,point:t=>{const d=Math.max(0,Math.min(1,t))*length;let i=1;while(i<64&&ds[i]<d)i++;const k=(d-ds[i-1])/(ds[i]-ds[i-1]||1);return{x:pts[i-1].x+(pts[i].x-pts[i-1].x)*k,y:pts[i-1].y+(pts[i].y-pts[i-1].y)*k};}};}
 function segment(enter,exit,size=1){const ports=[[size/2,0],[size,size/2],[size/2,size],[0,size/2]],a=ports[enter],b=ports[exit];if(opp(enter)===exit)return{length:size,point:t=>({x:a[0]+(b[0]-a[0])*t,y:a[1]+(b[1]-a[1])*t})};
  const k=.45*size/2;
  // each control point leaves its port straight into the cell, perpendicular to the side it opens on
  const ca=enter%2===0?[a[0],a[1]+(a[1]===0?k:-k)]:[a[0]+(a[0]===0?k:-k),a[1]],cb=exit%2===0?[b[0],b[1]+(b[1]===0?k:-k)]:[b[0]+(b[0]===0?k:-k),b[1]];
  return along(t=>{const u=1-t;return{x:u*u*u*a[0]+3*u*u*t*ca[0]+3*u*t*t*cb[0]+t*t*t*b[0],y:u*u*u*a[1]+3*u*u*t*ca[1]+3*u*t*t*cb[1]+t*t*t*b[1]};});}
 function pathBetween(a,b,dir){const d=dirs[dir],dist=Math.hypot(b.x-a.x,b.y-a.y),c={x:a.x+d[0]*dist*.5,y:a.y+d[1]*dist*.5},pts=[],ds=[0];let length=0;for(let i=0;i<=64;i++){const t=i/64,u=1-t,p={x:u*u*a.x+2*u*t*c.x+t*t*b.x,y:u*u*a.y+2*u*t*c.y+t*t*b.y};pts.push(p);if(i){length+=Math.hypot(p.x-pts[i-1].x,p.y-pts[i-1].y);ds.push(length);}}return{length,point:t=>{const d=Math.max(0,Math.min(1,t))*length;let i=1;while(i<64&&ds[i]<d)i++;const f=(d-ds[i-1])/(ds[i]-ds[i-1]||1);return{x:pts[i-1].x+(pts[i].x-pts[i-1].x)*f,y:pts[i-1].y+(pts[i].y-pts[i-1].y)*f};}};}
 // where the water leaves the board towards a plant (e: one of l.ends, the first by default)
 function port(l,e=l.ends[0]){const b=l.board,q=[[.5,0],[1,.5],[.5,1],[0,.5]][e.exit];return{x:b.x+(e.cell%b.cols+q[0])*b.cell,y:b.y+(Math.floor(e.cell/b.cols)+q[1])*b.cell};}
 function connector(l,e=l.ends[0]){return pathBetween(port(l,e),e.root,e.exit);}
 // The fixed pieces between the board and the plant: straight pieces, outside the board, that nobody turns.
 function outer(l,e=l.ends[0]){const b=l.board,a=port(l,e),d=dirs[e.exit],count=Math.floor(Math.hypot(e.root.x-a.x,e.root.y-a.y)/b.cell),cells=[];for(let i=0;i<count;i++){const cx=a.x+d[0]*(i+.5)*b.cell,cy=a.y+d[1]*(i+.5)*b.cell;cells.push({x:cx-b.cell/2,y:cy-b.cell/2,mask:e.exit%2?10:5});}return cells;}
 // Portrait: the painted courtyard always fills the frame; the play area sits between the title bar and the dialogue.
 function camera(width,height,ui={top:72,bottom:118},P=world.play){const C=world.court;let scale=Math.max(width/C.w,height/C.h);scale=Math.min(scale,(width-12)/(P.right-P.left));
  const clamp=(v,lo,hi)=>lo>hi?(lo+hi)/2:Math.max(lo,Math.min(hi,v));
  const tx=clamp(width/2-(P.left+P.right)/2*scale,width-(C.x+C.w)*scale,-C.x*scale),ty=clamp((ui.top+height-ui.bottom)/2-(P.top+P.bottom)/2*scale,height-(C.y+C.h)*scale,-C.y*scale);
  return{scale,tx,ty};}
 function project(p,c){return{x:p.x*c.scale+c.tx,y:p.y*c.scale+c.ty};}
 // The whole game: five screens of twenty gardens (ADR-024). The game is finished when the last one has its water.
 const GARDENS=100;function finished(done){return Number.isFinite(done)&&done>=GARDENS;}
 return{world,SCREENS,dirs,rotate,shape,neighbour,blocked,segment,level,screenOf,build,difficulty,SCREEN,LEVELS,trace,connector,outer,port,pathBetween,camera,project,GARDENS,finished};
});
