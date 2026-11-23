(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.Pieces=api;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 // Each orientation of a channel piece has its own painting (ADR-022), dry and full of water, in two strips of six
 // (assets/pilot/pieces-dry.webp, pieces-wet.webp, tools/prepare_portrait.py): all six are cut from one painted loop
 // of the oasis channel, so their light, their curbs and their joins match. A piece covers its 144 px cell.
 const CELL=144,HEIGHT=144,ORDER=[5,10,3,6,12,9],TEES=[7,14,13,11],R=2;
 // Les pièces en T (écran 2, les potagers) : quatre orientations peintes, découpées dans la même boucle avec des branches
 // (assets/pilot/tees-*.webp, tools/prepare_potagers.py).
 const img={dry:null,wet:null,endDry:null,endWet:null,teeDry:null,teeWet:null};
 // The end of the channel (tools/prepare_portrait.py, ends): the last piece before a plant finishes with a stone spout that
 // pours the water into the earth. One painting per direction of flow, 200 x 200 world px, laid over the straight piece of that cell.
 const END=200,ENDS={2:{i:0,x:-28,y:0},3:{i:1,x:-56,y:-28},1:{i:2,x:0,y:-28}};
 function load(base='assets/pilot/'){
  const get=src=>new Promise((ok,ko)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=ko;i.src=src;});
  return Promise.all([get(base+'pieces-dry.webp'),get(base+'pieces-wet.webp'),get(base+'ends-dry.webp'),get(base+'ends-wet.webp'),get(base+'tees-dry.webp'),get(base+'tees-wet.webp')]).then(([d,w,ed,ew,td,tw])=>{img.dry=d;img.wet=w;img.endDry=ed;img.endWet=ew;img.teeDry=td;img.teeWet=tw;return api;});
 }
 function ready(){return!!(img.dry&&img.wet&&img.endDry&&img.endWet&&img.teeDry&&img.teeWet);}
 function tee(mask){return TEES.includes(mask);}
 function index(mask){const i=tee(mask)?TEES.indexOf(mask):ORDER.indexOf(mask);if(i<0)throw Error('pièce inconnue '+mask);return i;}
 // CSS for an element of CELL x HEIGHT world pixels showing one piece.
 function style(mask,kind='dry'){return tee(mask)?`background:url(assets/pilot/tees-${kind}.webp) ${index(mask)*100/3}% 0/400% 100% no-repeat`:`background:url(assets/pilot/pieces-${kind}.webp) ${index(mask)*20}% 0/600% 100% no-repeat`;}
 // Draw one piece on a canvas whose transform is in world units, its cell's top-left corner at (x, y).
 function draw(ctx,mask,kind,x,y){const s=tee(mask)?img[kind==='wet'?'teeWet':'teeDry']:img[kind];if(!s)return;const i=index(mask);ctx.drawImage(s,i*CELL*R,0,CELL*R,HEIGHT*R,x,y,CELL,HEIGHT);}
 // The spout at the end of the channel, for water leaving its cell towards dir (1 right, 2 down, 3 left); (x, y) is the cell's corner.
 function end(dir){const e=ENDS[dir];if(!e)throw Error('bout inconnu '+dir);return e;}
 function endStyle(dir,kind='dry'){const e=end(dir);return`left:${e.x}px;top:${e.y}px;background:url(assets/pilot/ends-${kind}.webp) ${e.i*50}% 0/300% 100% no-repeat`;}
 function drawEnd(ctx,dir,kind,x,y){const e=end(dir),s=kind==='wet'?img.endWet:img.endDry;if(!s)return;ctx.drawImage(s,e.i*END*R,0,END*R,END*R,x+e.x,y+e.y,END,END);}
 const api={CELL,HEIGHT,ORDER,TEES,END,load,ready,style,draw,endStyle,drawEnd,images:img};
 return api;
});
