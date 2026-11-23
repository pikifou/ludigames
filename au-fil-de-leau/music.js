// La musique d'Au fil de l'eau (règle du 23 novembre : de la musique sur chaque écran). Trois morceaux, un par écran :
// « vallee » sur l'écran titre et la carte, « jardin » pendant qu'on joue, « histoire » sur les grandes images. Ils tournent
// en boucle sans couture : la fin du morceau se fond dans son début (repris de ludigames/monde-a-la-craie/js/sons.js).
// La musique suit le réglage « Musique » de Ludiworld (kit 0.5) ; elle se tait quand le jeu est caché, en pause, ou pendant
// la vidéo de fin, qui a son propre son.
(function(root){
 'use strict';
 const VOLUME=.42,FONDU=2,RACCORD=3;
 let ctx=null,on=true,paused=false,wanted=null,current=null;const buffers=new Map();
 function audio(){if(!ctx){const A=root.AudioContext||root.webkitAudioContext;if(!A)return null;ctx=new A();}if(ctx.state==='suspended')ctx.resume().catch(()=>{});return ctx;}
 function loopable(buf){const a=audio(),x=Math.min(Math.floor(RACCORD*buf.sampleRate),Math.floor(buf.length/4)),n=buf.length-x,out=a.createBuffer(buf.numberOfChannels,n,buf.sampleRate);
  for(let c=0;c<buf.numberOfChannels;c++){const src=buf.getChannelData(c),dst=out.getChannelData(c);dst.set(src.subarray(x));
   for(let i=0;i<x;i++){const t=i/x,k=n-x+i;dst[k]=src[x+k]*Math.cos(t*Math.PI/2)+src[i]*Math.sin(t*Math.PI/2);}}
  return out;}
 function load(name){if(!buffers.has(name)){const a=audio();if(!a)return Promise.resolve(null);
   buffers.set(name,fetch('assets/pilot/music-'+name+'.mp3').then(r=>r.arrayBuffer()).then(b=>a.decodeAudioData(b)).then(loopable).catch(()=>{buffers.delete(name);return null;}));}
  return buffers.get(name);}
 function fade(m){if(!m)return;const a=audio(),t=a.currentTime;m.gain.gain.cancelScheduledValues(t);m.gain.gain.setValueAtTime(m.gain.gain.value,t);m.gain.gain.linearRampToValueAtTime(0,t+FONDU);
  setTimeout(()=>{try{m.src.stop();}catch{}},FONDU*1000+100);}
 function update(){const play=on&&!paused&&wanted&&!root.document?.hidden;if(!play){fade(current);current=null;return;}if(current?.name===wanted)return;
  const name=wanted,a=audio();if(!a)return;
  load(name).then(buf=>{if(!buf||wanted!==name||!on||paused||current?.name===name)return;fade(current);const src=a.createBufferSource(),gain=a.createGain();
   src.buffer=buf;src.loop=true;gain.gain.setValueAtTime(0,a.currentTime);gain.gain.linearRampToValueAtTime(VOLUME,a.currentTime+FONDU);src.connect(gain).connect(a.destination);src.start();current={name,src,gain};});}
 root.document?.addEventListener('visibilitychange',update);
 // Le navigateur n'autorise le son qu'après un geste : au premier toucher, on relance.
 root.addEventListener?.('pointerdown',()=>{if(on&&ctx?.state==='suspended')ctx.resume().catch(()=>{});update();});
 root.PilotMusic={play(name){wanted=name;update();},setOn(v){on=!!v;update();},pause(v){paused=!!v;update();},now(){return current?.name??null;},wanted(){return on&&!paused?wanted:null;}};
})(typeof globalThis==='object'?globalThis:this);
