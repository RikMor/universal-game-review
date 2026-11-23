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
 el.innerHTML=`<div class="stg${D.board?' board':''}"><canvas id="cv" width="${S}" height="${S}"></canvas>
 <div class="tw"><div class="tc"><div class="tm side3">CT <b id="sc3">0</b></div><div class="mid"><b id="tm">0:00</b><span id="rn"></span></div><div class="tm side2"><b id="sc2">0</b> T</div></div>
 <div class="rsel"><button class="g" id="rp">◀</button><select id="rs">${rounds.map((t,k)=>`<option value="${k}">Ronda ${k+1}${win(k)?' · '+win(k):''}</option>`).join('')}</select><button class="g" id="rx">▶</button></div></div>
 <div class="pl" id="pl3"></div><div class="pl pr" id="pl2"></div>
 <div class="kp"><div class="kh">Kills <span id="kn">0</span></div><div id="kf"></div></div>
 <div class="bar"><div class="tlb" id="tlb"></div>
 <div class="ctl"><span id="tt" class="mut"></span><div class="grp"><button class="g" data-s="-60">−15</button><button class="g" data-s="-20">−5</button></div><button id="pp" class="play">▶</button><div class="grp"><button class="g" data-s="20">+5</button><button class="g" data-s="60">+15</button></div>
 <div class="grp" id="spd">${[.25,.5,1,2,4].map(v=>`<button class="g${v==1?' on':''}" data-v="${v}">${v}×</button>`).join('')}</div>
 ${R&&R.low&&!D.board?'<div class="grp"><button class="g" id="fl">Piso: superior</button></div>':''}</div>
 <div class="ctl tools">${D.board?`<div class="grp"><select id="mp">${Object.keys(RADAR).sort((x,y)=>(x.startsWith('de_')?0:1)-(y.startsWith('de_')?0:1)||x.localeCompare(y)).map(m=>`<option value="${m}"${m===D.map?' selected':''}>${m.replace(/^(de|cs|ar)_/,'').replace(/_/g,' ')}</option>`).join('')}</select></div>${R&&R.low?'<div class="grp"><button class="g" id="fl">Piso: superior</button></div>':''}`:''}<div class="grp" id="tl2">${[['','✋','Cursor'],['pen','✏️','Livre'],['line','／','Linha'],['arrow','➚','Seta'],['circle','◯','Círculo'],['text','T','Texto'],['erase','⌫','Borracha']].map(([k,ic,t],n)=>`<button class="g${n?'':' on'}" data-tool="${k}" title="${t}">${ic}</button>`).join('')}</div>
 <div class="grp" id="cols">${['#ffd43b','#ff6b6b','#51cf66','#4dabf7','#ffffff'].map((c,n)=>`<button class="g sw${n?'':' on'}" data-c="${c}" style="--sw:${c}"></button>`).join('')}</div>
 <div class="grp" id="durg"><select id="dur"><option value="640">Visível 10 s</option><option value="320">Visível 5 s</option><option value="1920">Visível 30 s</option><option value="0">Ronda toda</option></select></div>
 <div class="grp"><button class="g" id="un" title="Desfazer">↶</button><button class="g" id="cl">${D.board?'🗑 Limpar':'🗑 Ronda'}</button></div>
 <div class="grp"><button class="g" id="nt">📝 Notas <span id="nc">0</span></button></div></div></div>
 <div class="nd" id="nd"><div class="kh">Anotações</div><div class="row" style="flex-wrap:nowrap;margin-bottom:10px"><input type="text" id="ni" placeholder="Nota neste instante" style="flex:1"><button id="na">+</button></div><div id="nl"></div></div></div>`;
 const cv=document.getElementById('cv'),c=cv.getContext('2d'),$$=id=>document.getElementById(id);
 let i=0,play=false,spd=1,last=performance.now(),lastI=-1,lastR=-2,bg=null,rs=t0,re=t1;
 function mkBg(){const o=document.createElement('canvas');o.width=o.height=S;const g=o.getContext('2d');
  for(const f of D.fr.values())for(const r of f){const[x,y]=P(r.X,r.Y);g.fillStyle='rgba(130,170,255,.16)';g.fillRect(x-9,y-9,18,18)}
  return o}
 const mp=$$('mp');if(mp)mp.onchange=()=>{p.boardMap=mp.value;try{put(p).catch(()=>{})}catch(e){}demoBoard(p,el)};
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
  $$('tlb').innerHTML='<u></u>'+D.deaths.filter(d=>d.tick>=rs&&d.tick<re).map(d=>{const f=D.fr.get(D.T[idxOf(d.tick)])||[],a=f.find(r=>r.steamid===d.attacker_steamid);return`<s style="left:${pcr(d.tick)};background:${a?col(a.team_num):'#ff5d5d'}" data-t="${d.tick-160}" title="${esc(d.attacker_name||'?')} → ${esc(d.user_name||'?')}"></s>`}).join('')+anno.notes.filter(n=>rIdx(n.t)===k).map(n=>`<b style="left:${pcr(n.t)}" data-t="${n.t}" title="${esc(n.text)}"></b>`).join('')+'<i id="cur"></i>'}
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
  for(const s of anno.shapes)if(vis(s))drawShape(s);if(cur)drawShape(cur);
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
 // ---- anotações e desenhos (guardados à parte: registo "<id>:anno") ----
 const AK=p.id+':anno'+(D.board?':'+D.map:'');let anno={shapes:[],notes:[]},tool='',color='#ffd43b',cur=null,sv=null;
 const inv=(x,y)=>R?[x*R.p[2]+R.p[0],R.p[1]-y*R.p[2]]:[(x-62)*sc+x0,y1-(y-62)*sc];
 const save=()=>{clearTimeout(sv);sv=setTimeout(()=>{try{put({id:AK,anno}).catch(()=>{})}catch(e){}},400)};
 const rIdx=t=>{let k=0;rounds.forEach((r,n)=>{if(r<=t)k=n});return k};
 const vis=s=>{const t=D.T[Math.floor(i)];return t>=s.t&&(s.d?t<s.t+s.d:t<rend(rIdx(s.t)))};
 const dur=()=>D.board?0:+$$('dur').value;
 function refresh(){$$('nc').textContent=anno.notes.length;renderNotes();if(lastR>=0)setRound(lastR)}
 function renderNotes(){const L=[...anno.notes].sort((a,b)=>a.t-b.t);$$('nl').innerHTML=L.length?L.map(n=>`<div class="mk" data-t="${n.t}"><time>R${rIdx(n.t)+1} ${fmt(Math.max(0,n.t-rounds[rIdx(n.t)])/64)}</time><span>${esc(n.text)}</span><u data-d="${n.id}">✕</u></div>`).join(''):'<div class="mut" style="padding:6px">Sem notas.</div>'}
 function drawShape(s){c.save();c.strokeStyle=c.fillStyle=s.c;c.lineWidth=s.w;c.lineCap=c.lineJoin='round';const q=s.pts.map(v=>P(v[0],v[1]));
  if(s.type==='pen'){c.beginPath();q.forEach((v,n)=>n?c.lineTo(v[0],v[1]):c.moveTo(v[0],v[1]));c.stroke()}
  else if(s.type==='line'||s.type==='arrow'){const[a,b]=q;c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);c.stroke();
   if(s.type==='arrow'){const g=Math.atan2(b[1]-a[1],b[0]-a[0]),h=14+s.w*2;c.beginPath();c.moveTo(b[0],b[1]);c.lineTo(b[0]-h*Math.cos(g-.45),b[1]-h*Math.sin(g-.45));c.lineTo(b[0]-h*Math.cos(g+.45),b[1]-h*Math.sin(g+.45));c.closePath();c.fill()}}
  else if(s.type==='circle'){const[a,b]=q;c.beginPath();c.arc(a[0],a[1],Math.hypot(b[0]-a[0],b[1]-a[1]),0,7);c.stroke()}
  else if(s.type==='text'){c.font='700 20px sans-serif';c.textAlign='center';c.lineWidth=4;c.strokeStyle='#0b0d12';c.strokeText(s.text,q[0][0],q[0][1]);c.fillText(s.text,q[0][0],q[0][1])}
  c.restore()}
 const pt=e=>{const b=cv.getBoundingClientRect();return inv((e.clientX-b.left)/b.width*S,(e.clientY-b.top)/b.height*S)};
 const dist=(s,w)=>{const pp=P(w[0],w[1]),pq=s.pts.map(v=>P(v[0],v[1]));
  const seg=(a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy||1;let u=((pp[0]-a[0])*dx+(pp[1]-a[1])*dy)/l;u=Math.max(0,Math.min(1,u));return Math.hypot(pp[0]-a[0]-u*dx,pp[1]-a[1]-u*dy)};
  if(s.type==='circle')return Math.abs(Math.hypot(pp[0]-pq[0][0],pp[1]-pq[0][1])-Math.hypot(pq[1][0]-pq[0][0],pq[1][1]-pq[0][1]));
  if(s.type==='text'||pq.length===1)return Math.hypot(pp[0]-pq[0][0],pp[1]-pq[0][1]);
  let m=1e9;for(let n=1;n<pq.length;n++)m=Math.min(m,seg(pq[n-1],pq[n]));return m};
 const erase=w=>{let best=null,bd=24;for(const s of anno.shapes)if(vis(s)){const d=dist(s,w);if(d<bd){bd=d;best=s}}if(best){anno.shapes=anno.shapes.filter(x=>x!==best);save();refresh()}};
 cv.style.touchAction='none';
 cv.onpointerdown=e=>{if(!tool)return;const w=pt(e),t=D.T[Math.floor(i)];
  if(tool==='erase')return erase(w);
  if(tool==='text'){const x=prompt('Texto:');if(x){anno.shapes.push({id:Date.now(),t,d:dur(),type:'text',c:color,w:3,pts:[w],text:x});save();refresh()}return}
  play=false;$$('pp').textContent='▶';try{cv.setPointerCapture(e.pointerId)}catch(x){}
  cur={id:Date.now(),t,d:dur(),type:tool,c:color,w:4,pts:tool==='pen'?[w]:[w,w]}};
 cv.onpointermove=e=>{if(!cur)return;const w=pt(e);if(cur.type==='pen')cur.pts.push(w);else cur.pts[1]=w};
 cv.onpointerup=()=>{if(!cur)return;const q=cur.pts;if(q.length>1&&(cur.type==='pen'||q[0][0]!==q[1][0]||q[0][1]!==q[1][1])){anno.shapes.push(cur);save();refresh()}cur=null};
 $$('tl2').onclick=e=>{const b=e.target.closest('[data-tool]');if(!b)return;tool=b.dataset.tool;[...$$('tl2').children].forEach(x=>x.classList.toggle('on',x===b));cv.style.cursor=tool?'crosshair':'default'};
 $$('cols').onclick=e=>{const b=e.target.closest('[data-c]');if(!b)return;color=b.dataset.c;[...$$('cols').children].forEach(x=>x.classList.toggle('on',x===b))};
 $$('un').onclick=()=>{anno.shapes.pop();save();refresh()};
 $$('cl').onclick=()=>{const k=curR();if(confirm('Apagar todos os desenhos desta ronda?')){anno.shapes=anno.shapes.filter(s=>rIdx(s.t)!==k);save();refresh()}};
 function addNote(){const x=$$('ni').value.trim();if(!x)return;anno.notes.push({id:Date.now(),t:D.T[Math.floor(i)],text:x});$$('ni').value='';save();refresh()}
 $$('na').onclick=addNote;$$('ni').onkeydown=e=>{if(e.key==='Enter')addNote()};
 $$('nl').onclick=e=>{const d=e.target.dataset.d;if(d){anno.notes=anno.notes.filter(n=>String(n.id)!==d);save();return refresh()}const r=e.target.closest('.mk');if(r){i=idxOf(+r.dataset.t);play=false;$$('pp').textContent='▶'}};
 $$('nt').onclick=()=>$$('nd').classList.toggle('open');
 try{tx('readonly',s=>s.get(AK)).then(r=>{if(r&&r.anno){anno=r.anno;refresh()}}).catch(()=>{})}catch(e){}

 function loop(now){if(!document.body.contains(cv))return;if(play){i+=(now-last)/1000*4*spd;if(i>=N-1){i=N-1;play=false;$$('pp').textContent='▶'}}last=now;draw();requestAnimationFrame(loop)}
 requestAnimationFrame(loop);
}


// Quadro tático: só o mapa (radar) para desenhar estratégias e notas, sem demo.
async function demoBoard(p,el){
 await loadRadars();
 const map=RADAR[p.boardMap]?p.boardMap:(RADAR.de_mirage?'de_mirage':Object.keys(RADAR)[0]);
 demoPlay({map,T:[0,1],fr:new Map([[0,[]],[1,[]]]),deaths:[],starts:[0],ends:[],board:true},el,p);
}
