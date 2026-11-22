// Leitor de demos: leitura (parser WASM), radar 2D e interface de reprodução.
// Radares e calibração: assets/radars/radars.json
let RADAR={};
async function loadRadars(){if(Object.keys(RADAR).length)return;try{RADAR=await(await fetch('assets/radars/radars.json')).json()}catch(e){console.warn('radars.json não carregou',e)}}
const _nx=()=>new Promise(r=>setTimeout(r,30));
const _norm=x=>x instanceof Map?Object.fromEntries([...x].map(([k,v])=>[k,_norm(v)])):Array.isArray(x)?x.map(_norm):x;
const _rows=r=>{r=_norm(r);if(r&&!Array.isArray(r))r=r.data||Object.values(r);if(!Array.isArray(r))return [];return r.length&&r[0]&&Array.isArray(r[0].data)?r.flatMap(x=>x.data):r};
let _wasm;
async function demoParse(blob,say){
 const b=new Uint8Array(await blob.arrayBuffer());
 if(!_wasm){const w=new Uint8Array(await(await fetch('assets/wasm/demoparser_bg.wasm')).arrayBuffer());DPM.initSync({module:w});_wasm=1}
 say('A ler cabeçalho…');await _nx();
 const h=_norm(DPM.parseHeader(b))||{};
 const ev=async n=>{say('A ler eventos ('+n+')…');await _nx();try{return _rows(DPM.parseEvent(b,n))}catch(e){return []}};
 const deaths=await ev('player_death'),starts=await ev('round_start'),ends=await ev('round_end');
 const lastEv=[...deaths,...ends].reduce((m,e)=>Math.max(m,+e.tick||0),0);
 const maxT=+h.playback_ticks||lastEv+640,step=16;
 const ticks=new Int32Array(Math.ceil(maxT/step)+1).map((_,i)=>i*step);
 say('A ler posições dos jogadores…');await _nx();
 const props=['X','Y','Z','health','team_num','name','steamid','yaw'];let rows;
 try{rows=_rows(DPM.parseTicks(b,props,ticks,null,false))}catch(e){props.pop();rows=_rows(DPM.parseTicks(b,props,ticks,null,false))}
 const fr=new Map();
 for(const r of rows){if(r.X==null)continue;let f=fr.get(r.tick);if(!f)fr.set(r.tick,f=[]);f.push(r)}
 if(!fr.size)throw new Error('Sem dados de posição na demo (formato inesperado).');
 return{map:h.map_name||'',T:[...fr.keys()].sort((a,b)=>a-b),fr,deaths,starts:starts.map(e=>+e.tick).sort((a,b)=>a-b),ends:ends.map(e=>({tick:+e.tick,w:String(e.winner||'')}))};
}
function demoView(p,el){
 el.innerHTML='<div class="note" id="ds">A preparar…</div>';
 loadRadars().then(()=>demoParse(p.blob,m=>{const s=document.getElementById('ds');if(s)s.textContent=m})).then(D=>demoPlay(D,el,p)).catch(e=>{el.innerHTML='<div class="note"><b>Não foi possível ler a demo.</b><br>'+esc(e&&e.message||e)+'</div>'});
}
function demoPlay(D,el,p){
 $.style.maxWidth='1600px';
 const R=RADAR[D.map],S=1024,N=D.T.length,th=R&&R.th!=null?R.th:null;
 const xs=[],ys=[];for(const f of D.fr.values())for(const r of f){xs.push(r.X);ys.push(r.Y)}
 const mn=a=>a.reduce((m,v)=>v<m?v:m,Infinity),mx=a=>a.reduce((m,v)=>v>m?v:m,-Infinity);
 const x0=mn(xs),y1=mx(ys),sc=Math.max(mx(xs)-x0,y1-mn(ys))/900||1;
 const imgs={up:null,low:null};let floor='up';
 if(R)for(const k of ['up','low'])if(R[k]){const im=new Image();im.src=R[k];imgs[k]=im}
 const P=(X,Y)=>R?[(X-R.p[0])/R.p[2],(R.p[1]-Y)/R.p[2]]:[(X-x0)/sc+62,(y1-Y)/sc+62];
 const rounds=D.starts.filter((t,k,a)=>k===0||t-a[k-1]>640);
 const t0=D.T[0],t1=D.T[N-1];
 const col=t=>t==2?'#f08c00':'#4dabf7';
 const idxOf=t=>{let k=D.T.findIndex(x=>x>=t);return k<0?N-1:Math.max(0,k)};
 const rend=k=>rounds[k+1]||t1;
 const win=k=>{const e=D.ends.find(e=>e.tick>=rounds[k]&&e.tick<rend(k));return e?e.w:''};
 el.innerHTML=`<div class="stg"><canvas id="cv" width="${S}" height="${S}"></canvas>
 <div class="tw"><div class="tc"><div class="tm side3">CT <b id="sc3">0</b></div><div class="mid"><b id="tm">0:00</b><span id="rn"></span></div><div class="tm side2"><b id="sc2">0</b> T</div></div>
 <div class="rsel"><button class="g" id="rp">◀</button><select id="rs">${rounds.map((t,k)=>`<option value="${k}">Ronda ${k+1}${win(k)?' · '+win(k):''}</option>`).join('')}</select><button class="g" id="rx">▶</button></div></div>
 <div class="pl" id="pl3"></div><div class="pl pr" id="pl2"></div>
 <div class="kp"><div class="kh">Kills <span id="kn">0</span></div><div id="kf"></div></div>
 <div class="bar"><div class="tlb" id="tlb"></div>
 <div class="ctl"><span id="tt" class="mut"></span><div class="grp"><button class="g" data-s="-60">−15</button><button class="g" data-s="-20">−5</button></div><button id="pp" class="play">▶</button><div class="grp"><button class="g" data-s="20">+5</button><button class="g" data-s="60">+15</button></div>
 <div class="grp" id="spd">${[.25,.5,1,2,4].map(v=>`<button class="g${v==1?' on':''}" data-v="${v}">${v}×</button>`).join('')}</div>
 ${R&&R.low?'<div class="grp"><button class="g" id="fl">Piso: superior</button></div>':''}</div></div></div>`;
 const cv=document.getElementById('cv'),c=cv.getContext('2d'),$$=id=>document.getElementById(id);
 let i=0,play=false,spd=1,last=performance.now(),lastI=-1,lastR=-2,bg=null,rs=t0,re=t1;
 function mkBg(){const o=document.createElement('canvas');o.width=o.height=S;const g=o.getContext('2d');
  for(const f of D.fr.values())for(const r of f){const[x,y]=P(r.X,r.Y);g.fillStyle='rgba(130,170,255,.16)';g.fillRect(x-9,y-9,18,18)}
  return o}
 const fb=$$('fl');if(fb)fb.onclick=()=>{floor=floor==='up'?'low':'up';fb.textContent='Piso: '+(floor==='up'?'superior':'inferior')};
 const goRound=k=>{k=Math.min(rounds.length-1,Math.max(0,k));i=idxOf(rounds[k])};
 $$('rs').onchange=e=>goRound(+e.target.value);
 const curR=()=>{let ri=-1;rounds.forEach((s,k)=>{if(s<=D.T[Math.floor(i)])ri=k});return Math.max(0,ri)};
 $$('rp').onclick=()=>goRound(curR()-1);$$('rx').onclick=()=>goRound(curR()+1);
 $$('tlb').onclick=e=>{const t=e.target.dataset.t;if(t!==undefined){i=idxOf(+t);return}const b=e.currentTarget.getBoundingClientRect();i=idxOf(rs+(e.clientX-b.left)/b.width*(re-rs))};
 $$('pp').onclick=function(){play=!play;this.textContent=play?'⏸':'▶'};
 el.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{i=Math.min(N-1,Math.max(0,i+ +b.dataset.s))});
 $$('spd').onclick=e=>{const v=e.target.dataset.v;if(!v)return;spd=+v;[...$$('spd').children].forEach(b=>b.classList.toggle('on',b===e.target))};
 const pcr=t=>(Math.min(1,Math.max(0,(t-rs)/(re-rs)))*100).toFixed(2)+'%';
 function setRound(k){rs=rounds[k]??t0;re=rend(k);lastR=k;$$('rs').value=k;$$('rn').textContent='RONDA '+(k+1);
  $$('tlb').innerHTML='<u></u>'+D.deaths.filter(d=>d.tick>=rs&&d.tick<re).map(d=>{const f=D.fr.get(D.T[idxOf(d.tick)])||[],a=f.find(r=>r.steamid===d.attacker_steamid);return`<s style="left:${pcr(d.tick)};background:${a?col(a.team_num):'#ff5d5d'}" data-t="${d.tick-160}" title="${esc(d.attacker_name||'?')} → ${esc(d.user_name||'?')}"></s>`}).join('')+'<i id="cur"></i>'}
 function draw(){
  c.clearRect(0,0,S,S);
  const a=Math.floor(i),f=i-a,A=D.fr.get(D.T[a]),B=D.fr.get(D.T[Math.min(a+1,N-1)])||A;
  const im=floor==='low'&&imgs.low?imgs.low:imgs.up;
  if(R&&im&&im.complete)c.drawImage(im,0,0,S,S);else if(!R){if(!bg)bg=mkBg();c.drawImage(bg,0,0)}
  const bm=new Map(B.map(r=>[r.steamid,r]));
  for(const r of A){const q=bm.get(r.steamid)||r,X=r.X+(q.X-r.X)*f,Y=r.Y+(q.Y-r.Y)*f,[x,y]=P(X,Y),dead=!(r.health>0);
   const onF=th==null||(floor==='low')===(r.Z<th);
   c.globalAlpha=dead?.4:onF?1:.3;const cl=dead?'#8b93a7':col(r.team_num);
   if(r.yaw!=null&&!dead){const g=r.yaw*Math.PI/180;c.strokeStyle=cl;c.lineWidth=3;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(g)*28,y-Math.sin(g)*28);c.stroke()}
   c.fillStyle=cl;c.strokeStyle='#0b0d12';c.lineWidth=3;c.beginPath();c.arc(x,y,10,0,7);c.stroke();c.fill();
   c.font='600 14px sans-serif';c.textAlign='center';c.fillStyle='#fff';c.strokeText(r.name||'',x,y-16);c.fillText(r.name||'',x,y-16);c.globalAlpha=1}
  const t=D.T[a],ri=curR();if(ri!==lastR)setRound(ri);
  const cu=$$('cur');if(cu)cu.style.left=pcr(t);
  if(a!==lastI){lastI=a;
   $$('tm').textContent=fmt(Math.max(0,(t-rs)/64));$$('tt').textContent=fmt(Math.max(0,(t-rs)/64))+' / '+fmt((re-rs)/64);
   let s3=0,s2=0;for(const e of D.ends)if(e.tick<=t){if(e.w==='CT')s3++;else if(e.w==='T')s2++}
   $$('sc3').textContent=s3;$$('sc2').textContent=s2;
   const ks=D.deaths.filter(d=>d.tick<=t),kd={},dd={};for(const d of ks){kd[d.attacker_steamid]=(kd[d.attacker_steamid]||0)+1;dd[d.user_steamid]=(dd[d.user_steamid]||0)+1}
   const rk=ks.filter(d=>d.tick>=rs);$$('kn').textContent=rk.length;
   $$('kf').innerHTML=rk.slice(-8).reverse().map(d=>`<div><b>${esc(d.attacker_name||'?')}</b> <span class="mut">${esc(d.weapon||'')}${d.headshot?' ★':''}</span> ${esc(d.user_name||'?')}</div>`).join('')||'<div class="mut">Sem kills nesta ronda</div>';
   for(const tn of [3,2])$$('pl'+tn).innerHTML=A.filter(r=>r.team_num==tn).map(r=>{const h=Math.max(0,r.health||0);return`<div class="pc${h?'':' dead'}" style="--c:${col(tn)}"><div class="nm">${esc(r.name||'')}</div><div class="kd">⌖ ${kd[r.steamid]||0} · ☠ ${dd[r.steamid]||0}</div><div class="hb"><i style="width:${h}%"></i></div><span class="hp">${h}</span></div>`}).join('');
  }
 }
 function loop(now){if(!document.body.contains(cv))return;if(play){i+=(now-last)/1000*4*spd;if(i>=N-1){i=N-1;play=false;$$('pp').textContent='▶'}}last=now;draw();requestAnimationFrame(loop)}
 requestAnimationFrame(loop);
}

