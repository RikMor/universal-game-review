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
 const deaths=await ev('player_death'),starts=await ev('round_start'),ends=await ev('round_end'),fes=await ev('round_freeze_end'),plants=await ev('bomb_planted');
 const sm=await ev('smokegrenade_detonate'),sx=await ev('smokegrenade_expired'),ib=await ev('inferno_startburn'),ie=await ev('inferno_expire'),fl=await ev('flashbang_detonate'),he=await ev('hegrenade_detonate');
 const wf=await ev('weapon_fire'),dfs=await ev('bomb_defused'),exs=await ev('bomb_exploded');
 const shots=wf.map(e=>({t:+e.tick,s:e.user_steamid,w:String(e.weapon||'')})).filter(x=>isFinite(x.t)&&x.s!=null&&!/knife|bayonet|flash|smoke|grenade|molotov|decoy|c4|taser|zeus/i.test(x.w)).sort((a,b)=>a.t-b.t);
 const pair=(a,b,k,def)=>a.map(e=>{const o=b.find(x=>x.entityid===e.entityid&&+x.tick>=+e.tick);return{k,t:+e.tick,e:o?+o.tick:+e.tick+def,x:+e.x,y:+e.y,z:+e.z,s:e.user_steamid,n:e.user_name}});
 const one=(a,k,def)=>a.map(e=>({k,t:+e.tick,e:+e.tick+def,x:+e.x,y:+e.y,z:+e.z,s:e.user_steamid,n:e.user_name}));
 const util=[...pair(sm,sx,'smoke',1152),...pair(ib,ie,'molotov',448),...one(fl,'flash',96),...one(he,'he',64)].filter(u=>isFinite(u.x)&&isFinite(u.y));
 const lastEv=[...deaths,...ends].reduce((m,e)=>Math.max(m,+e.tick||0),0);
 const maxT=+h.playback_ticks||lastEv+640,step=16;
 const ticks=new Int32Array(Math.ceil(maxT/step)+1).map((_,i)=>i*step);
 say('A ler posições dos jogadores…');await _nx();
 const props=['X','Y','Z','health','team_num','name','steamid','active_weapon_name','inventory','armor_value','has_helmet','has_defuser','balance','yaw'];let rows;
 try{rows=_rows(DPM.parseTicks(b,props,ticks,null,false))}catch(e){rows=_rows(DPM.parseTicks(b,['X','Y','Z','health','team_num','name','steamid','yaw'],ticks,null,false))}
 const fr=new Map();
 for(const r of rows){if(r.X==null)continue;let f=fr.get(r.tick);if(!f)fr.set(r.tick,f=[]);f.push(r)}
 if(!fr.size)throw new Error('Sem dados de posição na demo (formato inesperado).');
 return{map:h.map_name||'',T:[...fr.keys()].sort((a,b)=>a-b),fr,deaths,starts:starts.map(e=>+e.tick).sort((a,b)=>a-b),ends:ends.map(e=>({tick:+e.tick,w:String(e.winner||'')})),fe:fes.map(e=>+e.tick).sort((a,b)=>a-b),plants:plants.map(e=>+e.tick).sort((a,b)=>a-b),util,shots,defuses:dfs.map(e=>+e.tick),explodes:exs.map(e=>+e.tick)};
}
function demoView(p,el){
 el.innerHTML='<div class="note" id="ds">A preparar…</div>';
 loadRadars().then(()=>demoParse(p.blob,m=>{const s=document.getElementById('ds');if(s)s.textContent=m})).then(D=>demoPlay(D,el,p)).catch(e=>{el.innerHTML='<div class="note"><b>Não foi possível ler a demo.</b><br>'+esc(e&&e.message||e)+'</div>'});
}
function demoPlay(D,el,p){
 $.classList.add('wide');
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
 const fes=D.fe||[],plants=D.plants||[];let buy=true,showU=true,showS=true;try{buy=localStorage.getItem('ugr_skipbuy')!=='1';showU=localStorage.getItem('ugr_util')!=='0';showS=localStorage.getItem('ugr_shots')!=='0'}catch(e){}
 const feOf=k=>{const x=fes.find(q=>q>=rounds[k]&&q<rend(k));return x??rounds[k]+960};
 const st=k=>buy?rounds[k]:feOf(k);let curFe=0,curPl=0;
 const GR={'Smoke Grenade':'☁','Flashbang':'⚡','High Explosive Grenade':'💥','Molotov':'🔥','Incendiary Grenade':'🔥','Decoy Grenade':'◎'};
 const PIS=['Glock-18','USP-S','P2000','P250','Five-SeveN','Tec-9','CZ75-Auto','Desert Eagle','Dual Berettas','R8 Revolver'];
 function gear(r){const inv=Array.isArray(r.inventory)?r.inventory:[];let w='',pis='',u='',c4=false;for(const n of inv){if(GR[n])u+=GR[n];else if(n==='C4 Explosive')c4=true;else if(PIS.includes(n))pis=n;else if(!/^knife|^Zeus|taser/i.test(n))w=n}return{w:w||pis||'—',u,c4}}
 const win=k=>{const e=D.ends.find(e=>e.tick>=rounds[k]&&e.tick<rend(k));return e?e.w:''};
 el.innerHTML=`<div class="stg${D.board?' board':''}"><canvas id="cv" width="${S}" height="${S}"></canvas>
 <div class="tw"><div class="tc"><div class="tm side2">T <b id="sc2">0</b></div><div class="mid"><b id="tm">0:00</b><span id="rn"></span></div><div class="tm side3"><b id="sc3">0</b> CT</div></div>
 <div class="rsel"><button class="g" id="rp">◀</button><select id="rs">${rounds.map((t,k)=>`<option value="${k}">Ronda ${k+1}${win(k)?' · '+win(k):''}</option>`).join('')}</select><button class="g" id="rx">▶</button><label class="g" title="Saltar o tempo de compras: a ronda começa quando o buytime acaba"><input type="checkbox" id="by"${buy?'':' checked'}> Sem buytime</label></div></div>
 <div class="pl" id="pl2"></div>
 <div class="rc"><div class="kp"><div class="kh">Kills <span id="kn">0</span></div><div id="kf"></div></div><div class="pl pr" id="pl3"></div>
 </div>
 <div class="bar"><div class="tlb" id="tlb"></div>
 <div class="ctl"><span id="tt" class="mut"></span><div class="grp"><button class="g" data-s="-60">−15</button><button class="g" data-s="-20">−5</button></div><button id="pp" class="play">▶</button><div class="grp"><button class="g" data-s="20">+5</button><button class="g" data-s="60">+15</button></div>
 <div class="grp" id="spd">${[.25,.5,1,2,4].map(v=>`<button class="g${v==1?' on':''}" data-v="${v}">${v}×</button>`).join('')}</div>
 ${R&&R.low&&!D.board?'<div class="grp"><button class="g" id="fl">Piso: superior</button></div>':''}</div>
 </div>
 <div class="utp"><div class="kh">Utilidades no mapa</div><div class="grp" style="flex-wrap:wrap">${[['u-smoke','☁','Smoke'],['u-molotov','🔥','Molo'],['u-flash','⚡','Flash'],['u-he','💥','HE'],['u-bomb','💣','Bomba']].map(([k,ic,t])=>`<button class="g" data-tool="${k}" title="${t}">${ic} ${t}</button>`).join('')}</div></div><div class="lc"><div class="mkp" id="mkp"></div><div class="nv" id="nv"></div></div><div class="nd pop" id="nd"><div class="kh">Criar nota</div><div class="row" style="flex-wrap:nowrap;margin-bottom:6px"><input type="text" id="nti" style="flex:1" placeholder="Título"></div><label class="nmq"><input type="checkbox" id="nmq" checked> 🧩 Anexar a maquete desta ronda</label><textarea id="ni" placeholder="Texto da nota… (Ctrl+Enter adiciona)" rows="3"></textarea><button id="na" style="margin:8px 0 10px;width:100%">Adicionar nota</button></div><div class="nd pop" id="nlp"><div class="kh">Notas</div><div id="nl"></div></div><div class="bl"><div class="ctl tools">${D.board?`<div class="grp"><select id="mp">${Object.keys(RADAR).sort((x,y)=>(x.startsWith('de_')?0:1)-(y.startsWith('de_')?0:1)||x.localeCompare(y)).map(m=>`<option value="${m}"${m===D.map?' selected':''}>${m.replace(/^(de|cs|ar)_/,'').replace(/_/g,' ')}</option>`).join('')}</select></div>${R&&R.low?'<div class="grp"><button class="g" id="fl">Piso: superior</button></div>':''}`:''}<div class="grp" id="tl2">${[['','✋','Cursor'],['pen','✏️','Livre'],['line','／','Linha'],['arrow','➚','Seta'],['circle','◯','Círculo'],['text','T','Texto'],['erase','⌫','Borracha']].map(([k,ic,t],n)=>`<button class="g${n?'':' on'}" data-tool="${k}" title="${t}">${ic}</button>`).join('')}</div>
 <div class="grp" id="cols">${['#ffd43b','#ff6b6b','#51cf66','#4dabf7','#ffffff'].map((c,n)=>`<button class="g sw${n?'':' on'}" data-c="${c}" style="--sw:${c}"></button>`).join('')}<input type="color" id="cc" value="#ffd43b" title="Cor personalizada"></div>
 <div class="grp" id="durg"><select id="dur"><option value="640">Visível 10 s</option><option value="320">Visível 5 s</option><option value="1920">Visível 30 s</option><option value="0">Ronda toda</option></select></div>
 <div class="grp"><button class="g" id="un" title="Desfazer">↶</button><button class="g" id="cl">${D.board?'🗑 Limpar':'🗑 Ronda'}</button></div>
 <div class="grp"><button class="g" id="mq" title="Maquete: arrasta os jogadores e as utilidades. ☠ Matar: clica no atirador e depois na vítima. Duplo clique renomeia; ⌫ ou botão direito apaga.">🧩 Maquete</button></div><div class="grp mqx"><button class="g" id="mqa" title="Adicionar jogador T">+ T</button><button class="g" id="mqb" title="Adicionar jogador CT">+ CT</button><button class="g" data-tool="m-kill" title="Matar: clica no atirador e depois na vítima">☠ Matar</button><button class="g" id="mqr" title="Repor a maquete">↻ Repor</button></div><div class="grp"><button class="g" id="nt">✏️ Criar nota</button><button class="g" id="nvw">📋 Ver notas <span id="nc">0</span></button></div>
 <div class="grp">${D.board?'':`<label class="g" title="Mostrar as utilidades lançadas pelos jogadores"><input type="checkbox" id="uu"${showU?' checked':''}> Utilidades</label><label class="g" title="Mostrar os tiros (rasto das armas)"><input type="checkbox" id="ts"${showS?' checked':''}> Tiros</label>`}<button class="g" id="fs" title="Ecrã inteiro">⛶</button></div></div></div><div class="br"><div class="lg" id="lg"></div><div id="ln" style="display:none"></div></div></div>`;
 const cv=document.getElementById('cv'),c=cv.getContext('2d'),$$=id=>document.getElementById(id);
 const stg=el.querySelector('.stg');
 const fit=()=>{if(!document.body.contains(stg)){removeEventListener('resize',fit);document.removeEventListener('fullscreenchange',fit);return}stg.style.height=document.fullscreenElement===stg?'100vh':Math.max(560,innerHeight-(stg.getBoundingClientRect().top+scrollY)-2)+'px'};
 addEventListener('resize',fit);document.addEventListener('fullscreenchange',fit);fit();
  function bh(){if(!document.body.contains(stg)){removeEventListener('resize',bh);return}const b=el.querySelector('.bar');if(b)stg.style.setProperty('--bh',(b.offsetHeight+22)+'px')}bh();addEventListener('resize',bh);
 $$('fs').onclick=()=>{document.fullscreenElement?document.exitFullscreen():stg.requestFullscreen&&stg.requestFullscreen()};
 let i=0,play=false,spd=1,last=performance.now(),lastI=-1,lastR=-2,bg=null,rs=t0,re=t1;
 function mkBg(){const o=document.createElement('canvas');o.width=o.height=S;const g=o.getContext('2d');
  for(const f of D.fr.values())for(const r of f){const[x,y]=P(r.X,r.Y);g.fillStyle='rgba(130,170,255,.16)';g.fillRect(x-9,y-9,18,18)}
  return o}
 const mp=$$('mp');if(mp)mp.onchange=()=>{p.boardMap=mp.value;try{put(p).catch(()=>{})}catch(e){}demoBoard(p,el)};
 const fb=$$('fl');if(fb)fb.onclick=()=>{floor=floor==='up'?'low':'up';fb.textContent='Piso: '+(floor==='up'?'superior':'inferior')};
 const goRound=k=>{k=Math.min(rounds.length-1,Math.max(0,k));i=idxOf(st(k))};
 $$('rs').onchange=e=>goRound(+e.target.value);
 const curR=()=>{let ri=-1;rounds.forEach((s,k)=>{if(s<=D.T[Math.floor(i)])ri=k});return Math.max(0,ri)};
 $$('rp').onclick=()=>goRound(curR()-1);$$('rx').onclick=()=>goRound(curR()+1);
 const tlb=$$('tlb');let tdrag=false;tlb.style.touchAction='none';
 const tlRatio=e=>{const b=tlb.getBoundingClientRect();return Math.min(1,Math.max(0,(e.clientX-b.left)/b.width))};
 tlb.onpointerdown=e=>{const nid=e.target.dataset&&e.target.dataset.n;
  if(nid!==undefined&&nid!==''){const id=+nid;if(selN===id){selN=null;renderNotes();return}selN=id;if(!D.board){i=idxOf(noteT(id));play=false;$$('pp').textContent='▶'}openNote(id);renderNotes();return}
  const t=e.target.dataset&&e.target.dataset.t;if(t!==undefined){i=idxOf(+t);return}
  tdrag=true;try{tlb.setPointerCapture(e.pointerId)}catch(x){}i=idxOf(rs+tlRatio(e)*(re-rs))};
 tlb.onpointermove=e=>{const h=$$('hov');if(h){const r=tlRatio(e);h.style.display='block';h.style.left=(r*100)+'%';h.textContent=fmt(r*(re-rs)/64)}if(tdrag)i=idxOf(rs+tlRatio(e)*(re-rs))};
 tlb.onpointerup=tlb.onpointercancel=()=>{tdrag=false};
 tlb.onpointerleave=()=>{const h=$$('hov');if(h)h.style.display='none'};
 $$('pp').onclick=function(){play=!play;this.textContent=play?'⏸':'▶'};
 el.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{i=Math.min(N-1,Math.max(0,i+ +b.dataset.s))});
 $$('spd').onclick=e=>{const v=e.target.dataset.v;if(!v)return;spd=+v;[...$$('spd').children].forEach(b=>b.classList.toggle('on',b===e.target))};
 const pcr=t=>(Math.min(1,Math.max(0,(t-rs)/(re-rs)))*100).toFixed(2)+'%';
 function setRound(k){lastI=-1;buildLog(k);curFe=feOf(k);curPl=plants.find(q=>q>=curFe&&q<rend(k))||0;rs=rounds[k]===undefined?t0:st(k);re=rend(k);lastR=k;mqUi();$$('rs').value=k;$$('rn').textContent='R'+(k+1);
  $$('tlb').innerHTML='<u></u>'+D.deaths.filter(d=>d.tick>=rs&&d.tick<re).map(d=>{const f=D.fr.get(D.T[idxOf(d.tick)])||[],a=f.find(r=>r.steamid===d.attacker_steamid);return`<s style="left:${pcr(d.tick)};background:${a?col(a.team_num):'#ff5d5d'}" data-t="${d.tick-160}" title="${esc(d.attacker_name||'?')} → ${esc(d.user_name||'?')}"></s>`}).join('')+anno.notes.filter(n=>rIdx(n.t)===k).map(n=>`<b style="left:${pcr(n.t)};background:${n.c||'#ffd43b'}" data-t="${n.t}" data-n="${n.id}" title="${esc(n.title||n.text||'')}"></b>`).join('')+'<i id="cur"></i><em id="curt"></em>'}
 function draw(){
  c.clearRect(0,0,S,S);
  const ri0=curR();if(ri0!==lastR)setRound(ri0);
  if(!buy&&!D.board&&D.T[Math.floor(i)]<rs)i=idxOf(rs);
  const a=Math.floor(i),f=i-a,A=D.fr.get(D.T[a]),B=D.fr.get(D.T[Math.min(a+1,N-1)])||A;
  const im=floor==='low'&&imgs.low?imgs.low:imgs.up;
  if(R&&im&&im.complete)c.drawImage(im,0,0,S,S);else if(!R){if(!bg)bg=mkBg();c.drawImage(bg,0,0)}
  if(showU&&D.util){const tk=D.T[a];for(const u of D.util)if(tk>=u.t&&tk<u.e)drawUtil(u,tk)}
  const bm=new Map(B.map(r=>[r.steamid,r])),tkn=D.T[a]+f*((D.T[Math.min(a+1,N-1)]||D.T[a])-D.T[a]);
  drawSkulls(D.T[a]);
  for(const r of A){const q=bm.get(r.steamid)||r,X=r.X+(q.X-r.X)*f,Y=r.Y+(q.Y-r.Y)*f,[x,y]=P(X,Y),dead=!(r.health>0);
   if(dead)continue;
   const onF=th==null||(floor==='low')===(r.Z<th);
   c.globalAlpha=mq.on?.18:dead?.4:onF?1:.3;const cl=dead?'#8b93a7':col(r.team_num);
   if(r.yaw!=null&&!dead){const g=r.yaw*Math.PI/180;c.strokeStyle=cl;c.lineWidth=3;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(g)*28,y-Math.sin(g)*28);c.stroke()}
   c.fillStyle=cl;c.strokeStyle='#0b0d12';c.lineWidth=3;c.beginPath();c.arc(x,y,10,0,7);c.stroke();c.fill();
   c.font='600 14px sans-serif';c.textAlign='center';c.fillStyle='#fff';c.strokeText(r.name||'',x,y-16);c.fillText(r.name||'',x,y-16);c.globalAlpha=1}
  if(showS&&!mq.on)drawShots(tkn);
  for(const s of anno.shapes)if(vis(s))drawShape(s);if(cur)drawShape(cur);mqDraw();
  const t=D.T[a];
  const cu=$$('cur');if(cu){cu.style.left=pcr(t);const ct=$$('curt');if(ct)ct.style.left=pcr(t)}
  if(a!==lastI){lastI=a;
   $$('tt').textContent=fmt(Math.max(0,(t-rs)/64))+' / '+fmt((re-rs)/64);
   let ck,lb;if(t<curFe){ck=buy?fmt((curFe-t)/64):'1:55';lb='COMPRAS'}else if(curPl&&t>=curPl){ck=fmt(Math.max(0,40-(t-curPl)/64));lb='BOMBA'}else{ck=fmt(Math.max(0,115-(t-curFe)/64));lb='RONDA'}
   $$('tm').textContent=ck;{const ctt=$$('curt');if(ctt)ctt.textContent=ck}$$('rn').textContent=lb+' · R'+(lastR+1);renderLive(t);renderLog(t);
   let s3=0,s2=0;for(const e of D.ends)if(e.tick<=t){if(e.w==='CT')s3++;else if(e.w==='T')s2++}
   $$('sc3').textContent=s3;$$('sc2').textContent=s2;
   const ks=D.deaths.filter(d=>d.tick<=t),kd={},dd={};for(const d of ks){kd[d.attacker_steamid]=(kd[d.attacker_steamid]||0)+1;dd[d.user_steamid]=(dd[d.user_steamid]||0)+1}
   const rk=ks.filter(d=>d.tick>=rs);$$('kn').textContent=rk.length;
   $$('kf').innerHTML=rk.slice(-6).reverse().map(d=>`<div><b>${esc(d.attacker_name||'?')}</b> <span class="mut">${esc(d.weapon||'')}${d.headshot?' ★':''}</span> ${esc(d.user_name||'?')}</div>`).join('')||'<div class="mut">Sem kills nesta ronda</div>';
   for(const tn of [3,2])$$('pl'+tn).innerHTML=A.filter(r=>r.team_num==tn).map(r=>{const h=Math.max(0,r.health||0),g=gear(r);return`<div class="pc${h?'':' dead'}" style="--c:${col(tn)}"><div class="nm">${esc(r.name||'')}</div><span class="hp">${h}</span><div class="hb"><i style="width:${h}%"></i></div>${h?`<div class="gr"><span>${esc(g.w)}</span><b>$${r.balance??''}</b></div><div class="gr"><span>${g.u}</span><span>${r.armor_value>0?'🛡'+r.armor_value+(r.has_helmet?'⛑':''):''}${r.has_defuser?' 🔧':''}${g.c4?' 💣':''}</span></div>`:''}<div class="kd">⌖ ${kd[r.steamid]||0} · ☠ ${dd[r.steamid]||0}</div></div>`}).join('');
  }
 }
 // ---- anotações e desenhos (guardados à parte: registo "<id>:anno") ----
 const AK=p.id+':anno'+(D.board?':'+D.map:'');let anno={shapes:[],notes:[],mocks:{}},tool='',color='#ffd43b',cur=null,sv=null;
 const inv=(x,y)=>R?[x*R.p[2]+R.p[0],R.p[1]-y*R.p[2]]:[(x-62)*sc+x0,y1-(y-62)*sc];
 const save=()=>{clearTimeout(sv);sv=setTimeout(()=>{try{put({id:AK,anno}).catch(()=>{})}catch(e){}},400)};
 const rIdx=t=>{let k=0;rounds.forEach((r,n)=>{if(r<=t)k=n});return k};
 const vis=s=>{const t=D.T[Math.floor(i)];return t>=s.t&&(s.d?t<s.t+s.d:t<rend(rIdx(s.t)))};
 const dur=()=>D.board?0:+$$('dur').value;
  let selN=null,lastLn='';
  const nt=n=>(n.mock?'🧩 ':'')+(n.title||(n.text||'').slice(0,40)||'Nota');
  const delNote=id=>{anno.notes=anno.notes.filter(n=>String(n.id)!==String(id));if(String(selN)===String(id))selN=null;save();refresh()};
  function renderLive(t){return;const L=anno.notes.filter(n=>D.board||(t>=n.t&&t<n.t+640));const h=L.map(n=>`<div class="lnc" data-id="${n.id}" style="--c:${n.c||'#ffd43b'}"><u class="x" data-d="${n.id}" title="Apagar nota">✕</u><span>${esc(nt(n))}</span></div>`).join('');if(h!==lastLn){lastLn=h;$$('ln').innerHTML=h}}
 function refresh(){$$('nc').textContent=anno.notes.length;renderNotes();lastI=-1;if(lastR>=0)setRound(lastR)}
  let lgList=[],lgHtml='';
  function buildLog(k){const s0=rounds[k]===undefined?t0:rounds[k],e0=rend(k),L=[],cl=r=>r?col(r.team):'#c3c9d6';
   for(const d of D.deaths){const dt=+d.tick;if(dt<s0||dt>=e0)continue;const a=rowAt(d.attacker_steamid,dt),v=rowAt(d.user_steamid,dt);
    L.push({t:dt,h:`<span style="color:${cl(a)}">${esc(d.attacker_name||'?')}</span> ☠ <span style="color:${cl(v)}">${esc(d.user_name||'?')}</span> <span class="mut">${esc(d.weapon||'')}${d.headshot?' ★':''}</span>`})}
   for(const[arr,h]of[[D.plants,'💣 Bomba plantada'],[D.defuses,'🔧 Bomba desarmada'],[D.explodes,'💥 Bomba explodiu']])for(const t of arr||[])if(t>=s0&&t<e0)L.push({t,h});
   for(const e of D.ends)if(e.tick>=s0&&e.tick<e0)L.push({t:e.tick,h:'🏁 Ronda para '+(e.w==='CT'?'CT':e.w==='T'?'T':'—')});
   L.sort((a,b)=>a.t-b.t);lgList=L;lgHtml=''}
  function renderLog(t){const rt=tk=>tk<curFe?'compras':fmt(Math.max(0,115-(tk-curFe)/64)),h=lgList.filter(x=>x.t<=t).map(x=>`<div data-t="${x.t}"><time>${rt(x.t)}</time> ${x.h}</div>`).join('')||'<div class="mut">Sem eventos ainda</div>';
   if(h!==lgHtml){lgHtml=h;const g=$$('lg');g.innerHTML='<div class="kh">Logs · R'+(lastR+1)+'</div>'+h;g.scrollTop=g.scrollHeight}}
  $$('lg').onclick=e=>{const r=e.target.closest('[data-t]');if(r){i=idxOf(+r.dataset.t-160);play=false;$$('pp').textContent='▶'}};
  function renderViewer(){const v=$$('nv'),n=selN!=null&&anno.notes.find(x=>String(x.id)===String(selN));if(mqPrev&&!(n&&n.mock)){const q=mqPrev;mqPrev=null;if(q.mock)anno.mocks[q.key]=q.mock;else delete anno.mocks[q.key];save();mqSet(q.on,false)}
  if(!n){v.style.display='none';v.innerHTML='';return}v.style.display='block';v.style.setProperty('--c',n.c||'#ffd43b');v.innerHTML='<b>'+esc(nt(n))+'</b>'+(n.text?'<div>'+esc(n.text)+'</div>':'')}
  function renderNotes(){renderViewer();const L=[...anno.notes].sort((a,b)=>a.t-b.t);$$('nl').innerHTML=L.length?L.map(n=>`<div class="mk${n.id===selN?' sel':''}" data-t="${n.t}" data-id="${n.id}"><u class="x" data-d="${n.id}" title="Apagar nota">✕</u><em class="dt" style="background:${n.c||'#ffd43b'}"></em><time>R${rIdx(n.t)+1} ${fmt(Math.max(0,n.t-rounds[rIdx(n.t)])/64)}</time><b>${esc(nt(n))}</b></div>`).join(''):'<div class="mut" style="padding:6px">Sem notas.</div>'}
 function drawShape(s){c.save();c.strokeStyle=c.fillStyle=s.c;c.lineWidth=s.w;c.lineCap=c.lineJoin='round';const q=s.pts.map(v=>P(v[0],v[1]));
  if(s.type==='pen'){c.beginPath();q.forEach((v,n)=>n?c.lineTo(v[0],v[1]):c.moveTo(v[0],v[1]));c.stroke()}
  else if(s.type==='line'||s.type==='arrow'){const[a,b]=q;c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);c.stroke();
   if(s.type==='arrow'){const g=Math.atan2(b[1]-a[1],b[0]-a[0]),h=14+s.w*2;c.beginPath();c.moveTo(b[0],b[1]);c.lineTo(b[0]-h*Math.cos(g-.45),b[1]-h*Math.sin(g-.45));c.lineTo(b[0]-h*Math.cos(g+.45),b[1]-h*Math.sin(g+.45));c.closePath();c.fill()}}
  else if(s.type==='circle'){const[a,b]=q;c.beginPath();c.arc(a[0],a[1],Math.hypot(b[0]-a[0],b[1]-a[1]),0,7);c.stroke()}
  else if(s.type==='text'){c.font='700 20px sans-serif';c.textAlign='center';c.lineWidth=4;c.strokeStyle='#0b0d12';c.strokeText(s.text,q[0][0],q[0][1]);c.fillText(s.text,q[0][0],q[0][1])}
  else if(s.type==='util'){const U={smoke:['☁','#cbd5e1',144],molotov:['🔥','#ff7b2e',120],flash:['⚡','#ffe066',0],he:['💥','#ff6b6b',0],bomb:['💣','#ff6b6b',0]}[s.k]||['?','#fff',0],[x,y]=q[0];
   if(U[2]){const e=P(s.pts[0][0]+U[2],s.pts[0][1]),rad=Math.abs(e[0]-x);c.fillStyle=U[1]+'66';c.strokeStyle=U[1];c.lineWidth=2;c.beginPath();c.arc(x,y,rad,0,7);c.fill();c.stroke()}
   else{c.fillStyle='rgba(15,18,26,.75)';c.strokeStyle=U[1];c.lineWidth=2;c.beginPath();c.arc(x,y,17,0,7);c.fill();c.stroke()}
   c.font='22px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#fff';c.fillText(U[0],x,y+1)}
  c.restore()}
 const pt=e=>{const b=cv.getBoundingClientRect();return inv((e.clientX-b.left)/b.width*S,(e.clientY-b.top)/b.height*S)};
 const dist=(s,w)=>{const pp=P(w[0],w[1]),pq=s.pts.map(v=>P(v[0],v[1]));
  const seg=(a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy||1;let u=((pp[0]-a[0])*dx+(pp[1]-a[1])*dy)/l;u=Math.max(0,Math.min(1,u));return Math.hypot(pp[0]-a[0]-u*dx,pp[1]-a[1]-u*dy)};
  if(s.type==='circle')return Math.abs(Math.hypot(pp[0]-pq[0][0],pp[1]-pq[0][1])-Math.hypot(pq[1][0]-pq[0][0],pq[1][1]-pq[0][1]));
  if(s.type==='text'||pq.length===1)return Math.hypot(pp[0]-pq[0][0],pp[1]-pq[0][1]);
  let m=1e9;for(let n=1;n<pq.length;n++)m=Math.min(m,seg(pq[n-1],pq[n]));return m};
 const erase=w=>{let best=null,bd=24;for(const s of anno.shapes)if(vis(s)){const d=dist(s,w);if(d<bd){bd=d;best=s}}if(best){anno.shapes=anno.shapes.filter(x=>x!==best);save();refresh()}};
 cv.style.touchAction='none';
 cv.onpointerdown=e=>{if(mq.on&&mqDown(e))return;if(!tool||tool==='m-kill')return;const w=pt(e),t=D.T[Math.floor(i)];
  if(tool==='erase')return erase(w);
  if(tool.startsWith('u-')){const m=mqCur();if(!m||!mq.on)return;(m.ut||(m.ut=[])).push({id:Date.now(),k:tool.slice(2),x:w[0],y:w[1]});save();return}
  if(tool==='text'){const x=prompt('Texto:');if(x){anno.shapes.push({id:Date.now(),t,d:dur(),type:'text',c:color,w:3,pts:[w],text:x});save();refresh()}return}
  play=false;$$('pp').textContent='▶';try{cv.setPointerCapture(e.pointerId)}catch(x){}
  cur={id:Date.now(),t,d:dur(),type:tool,c:color,w:4,pts:tool==='pen'?[w]:[w,w]}};
 cv.onpointermove=e=>{if(mq.drag){const w=pt(e);mq.drag.x=w[0];mq.drag.y=w[1];return}if(!cur)return;const w=pt(e);if(cur.type==='pen')cur.pts.push(w);else cur.pts[1]=w};
 cv.onpointerup=()=>{if(mq.drag){mq.drag=null;save();return}if(!cur)return;const q=cur.pts;if(q.length>1&&(cur.type==='pen'||q[0][0]!==q[1][0]||q[0][1]!==q[1][1])){anno.shapes.push(cur);save();refresh()}cur=null};
 el.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{tool=b.dataset.tool;el.querySelectorAll('[data-tool]').forEach(x=>x.classList.toggle('on',x===b));cv.style.cursor=tool?'crosshair':'default'});
 $$('cols').onclick=e=>{const b=e.target.closest('[data-c]');if(!b)return;color=b.dataset.c;$$('cc').value=color;el.querySelectorAll('#cols .sw').forEach(x=>x.classList.toggle('on',x===b))};
 const ts=$$('ts');if(ts)ts.onchange=e=>{showS=e.target.checked;try{localStorage.setItem('ugr_shots',showS?'1':'0')}catch(x){}};
 const uu=$$('uu');if(uu)uu.onchange=e=>{showU=e.target.checked;try{localStorage.setItem('ugr_util',showU?'1':'0')}catch(x){}};
 $$('cc').oninput=e=>{color=e.target.value;el.querySelectorAll('#cols .sw').forEach(x=>x.classList.remove('on'))};
 $$('by').onchange=e=>{buy=!e.target.checked;try{localStorage.setItem('ugr_skipbuy',buy?'0':'1')}catch(x){}setRound(curR());if(!buy&&D.T[Math.floor(i)]<rs)i=idxOf(rs);lastI=-1;draw()};
 $$('un').onclick=()=>{anno.shapes.pop();save();refresh()};
 $$('cl').onclick=()=>{const k=curR();if(confirm('Apagar todos os desenhos desta ronda?')){anno.shapes=anno.shapes.filter(s=>rIdx(s.t)!==k);save();refresh()}};
 function addNote(){const x=$$('ni').value.trim(),ti=$$('nti').value.trim();if(!x&&!ti)return;const nm={id:Date.now(),t:D.T[Math.floor(i)],title:ti,text:x,c:color},mc=mq.on&&$$('nmq').checked&&mqCur();if(mc)nm.mock=JSON.parse(JSON.stringify(mc));anno.notes.push(nm);$$('ni').value='';$$('nti').value='';save();refresh()}
 $$('na').onclick=addNote;$$('ni').onkeydown=e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey))addNote()};
  $$('nl').onclick=e=>{const d=e.target.closest('[data-d]');if(d)return delNote(d.dataset.d);const r=e.target.closest('.mk');if(r&&r.dataset.id){selN=+r.dataset.id===selN?null:+r.dataset.id;if(!D.board){i=idxOf(+r.dataset.t);play=false;$$('pp').textContent='▶'}if(selN!==null){openNote(selN);$$('nlp').classList.remove('open')}renderNotes()}};
  $$('ln').onclick=e=>{const d=e.target.closest('[data-d]');if(d)return delNote(d.dataset.d);const r=e.target.closest('.lnc');if(r){const id=+r.dataset.id;if(selN===id){selN=null;renderNotes();return}selN=id;if(!D.board){i=idxOf(noteT(selN));play=false;$$('pp').textContent='▶'}openNote(selN);renderNotes()}};
  $$('nv').onclick=()=>{selN=null;renderNotes()};
  const noteT=id=>{const n=anno.notes.find(x=>String(x.id)===String(id));return n?n.t:D.T[0]};
  let mqPrev=null;
  function openNote(id){const n=anno.notes.find(x=>String(x.id)===String(id));if(!n||!n.mock)return;const key=D.board?'b':String(rIdx(n.t));if(!mqPrev)mqPrev={on:mq.on,key,mock:anno.mocks&&anno.mocks[key]?JSON.parse(JSON.stringify(anno.mocks[key])):null};(anno.mocks||(anno.mocks={}))[key]=JSON.parse(JSON.stringify(n.mock));save();mqSet(true,false)}
  const popOut=e=>{if(!document.body.contains(stg)){document.removeEventListener('pointerdown',popOut);return}if(e.target.closest('.pop,#nt,#nvw'))return;$$('nd').classList.remove('open');$$('nlp').classList.remove('open')};document.addEventListener('pointerdown',popOut);
  $$('nt').onclick=()=>{bh();$$('nlp').classList.remove('open');$$('nd').classList.toggle('open')};
  $$('nvw').onclick=()=>{bh();$$('nd').classList.remove('open');$$('nlp').classList.toggle('open')};
 try{tx('readonly',s=>s.get(AK)).then(r=>{if(r&&r.anno){anno=r.anno;anno.shapes=anno.shapes||[];anno.notes=anno.notes||[];anno.mocks=anno.mocks||{};refresh();mqUi()}}).catch(()=>{})}catch(e){}

  // ---- maquete: jogadores arrastáveis + quem mata quem (guardada em anno.mocks, por ronda; no quadro, por mapa) ----
  const mq={on:false,pick:null,drag:null};
  const mqKey=()=>D.board?'b':String(curR());
  const mqCur=()=>(anno.mocks||(anno.mocks={}))[mqKey()];
  function mqSnap(){let tk;
   if(D.board){tk=[];for(const[tm,px]of[[2,70],[3,954]])for(let n=0;n<5;n++){const[x,y]=inv(px,300+n*95);tk.push({id:tm*100+n,tm,n:(tm==2?'T':'CT')+(n+1),x,y})}}
   else{const a=Math.floor(i),f=i-a,A=D.fr.get(D.T[a])||[],B=D.fr.get(D.T[Math.min(a+1,N-1)])||A,bm=new Map(B.map(r=>[r.steamid,r]));
    tk=A.filter(r=>r.health>0&&(r.team_num==2||r.team_num==3)).map((r,n)=>{const q=bm.get(r.steamid)||r;return{id:n+1,tm:r.team_num,n:r.name||'',x:r.X+(q.X-r.X)*f,y:r.Y+(q.Y-r.Y)*f}})}
   (anno.mocks||(anno.mocks={}))[mqKey()]={tk,kl:[],ut:[]};save();mqUi()}
  function mqAdd(tm){if(!mqCur())mqSnap();const m=mqCur(),k=m.tk.length%7,[x,y]=inv(512+k*34,512+k*34);m.tk.push({id:Math.max(0,...m.tk.map(t=>t.id))+1,tm,n:(tm==2?'T':'CT')+(m.tk.filter(t=>t.tm===tm).length+1),x,y});save();mqUi()}
  const mqHit=w=>{const m=mqCur();if(!m)return null;const[px,py]=P(w[0],w[1]);let b=null,bd=22;for(const t of m.tk){const[x,y]=P(t.x,t.y),d=Math.hypot(x-px,y-py);if(d<bd){bd=d;b=t}}return b};
  const mqHitU=w=>{const m=mqCur();if(!m||!m.ut)return null;const[px,py]=P(w[0],w[1]);let b=null,bd=24;for(const u of m.ut){const[x,y]=P(u.x,u.y),d=Math.hypot(x-px,y-py);if(d<bd){bd=d;b=u}}return b};
  function mqDown(e){const m=mqCur();if(!m)return false;const w=pt(e),h=mqHit(w),u=h?null:mqHitU(w);
   if(tool==='m-kill'){if(!h){mq.pick=null;return true}if(!mq.pick){mq.pick=h.id;return true}
    if(mq.pick!==h.id&&!m.kl.some(k=>k.a===mq.pick&&k.b===h.id)){m.kl.push({a:mq.pick,b:h.id});save();mqUi()}mq.pick=null;return true}
   if(tool==='erase'){if(!h&&!u)return false;if(h){m.tk=m.tk.filter(t=>t!==h);m.kl=m.kl.filter(k=>k.a!==h.id&&k.b!==h.id)}else m.ut=m.ut.filter(x=>x!==u);save();mqUi();return true}
   if((!tool||tool.startsWith('u-'))&&(h||u)){mq.drag=h||u;try{cv.setPointerCapture(e.pointerId)}catch(x){}return true}
   return false}
  function mqUi(){const p=$$('mkp');if(!p)return;const m=mqCur(),nm=id=>{const t=m&&m.tk.find(x=>x.id===id);return t?esc(t.n):'?'},has=!!(mq.on&&m&&m.kl.length);
   p.style.display=has?'block':'none';p.innerHTML=has?'<div class="kh">☠ Mortes</div>'+m.kl.map((k,x)=>`<div class="kr"><u class="x" data-k="${x}" title="Apagar">✕</u><b>${x+1}</b> ${nm(k.a)} ☠ ${nm(k.b)}</div>`).join(''):''}
  function mqDraw(){if(!mq.on)return;if(!mqCur())mqSnap();const m=mqCur(),by=id=>m.tk.find(t=>t.id===id),dead=new Set(m.kl.map(k=>k.b));c.save();
   for(const u of (m.ut||[]))drawShape({type:'util',k:u.k,c:'#fff',w:3,pts:[[u.x,u.y]]});
   m.kl.forEach((k,n)=>{const A=by(k.a),B=by(k.b);if(!A||!B)return;const[x1,y1]=P(A.x,A.y),[x2,y2]=P(B.x,B.y),g=Math.atan2(y2-y1,x2-x1),ex=x2-Math.cos(g)*16,ey=y2-Math.sin(g)*16;
    c.strokeStyle=c.fillStyle='#ff4d4d';c.lineWidth=4;c.setLineDash([10,6]);c.beginPath();c.moveTo(x1+Math.cos(g)*16,y1+Math.sin(g)*16);c.lineTo(ex,ey);c.stroke();c.setLineDash([]);
    c.beginPath();c.moveTo(ex,ey);c.lineTo(ex-14*Math.cos(g-.45),ey-14*Math.sin(g-.45));c.lineTo(ex-14*Math.cos(g+.45),ey-14*Math.sin(g+.45));c.closePath();c.fill();
    c.font='700 16px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#fff';c.strokeStyle='#0b0d12';c.lineWidth=4;const mx=(x1+x2)/2,my=(y1+y2)/2-12;c.strokeText(n+1,mx,my);c.fillText(n+1,mx,my)});
   for(const t of m.tk){const[x,y]=P(t.x,t.y),d=dead.has(t.id),sel=mq.pick===t.id;c.globalAlpha=d?.6:1;c.fillStyle=d?'#8b93a7':col(t.tm);c.strokeStyle=sel?'#fff':'#0b0d12';c.lineWidth=sel?5:3;c.beginPath();c.arc(x,y,13,0,7);c.stroke();c.fill();c.globalAlpha=1;
    c.font='600 14px sans-serif';c.textAlign='center';c.textBaseline='alphabetic';c.fillStyle='#fff';c.strokeStyle='#0b0d12';c.lineWidth=3;c.strokeText(t.n,x,y-20);c.fillText(t.n,x,y-20);
    if(d){c.font='16px sans-serif';c.textBaseline='middle';c.fillText('☠',x,y+1)}}
   c.restore()}
  function mqSet(on,snap){mq.on=on;mq.pick=mq.drag=null;stg.classList.toggle('mq',on);$$('mq').classList.toggle('on',on);
   if(on){play=false;$$('pp').textContent='▶';if(snap&&!D.board)mqSnap();const nb=$$('nmq');if(nb)nb.checked=true}else{const b=el.querySelector('#tl2 [data-tool=""]');if(b)b.click()}mqUi();bh()}
  $$('mq').onclick=()=>mqSet(!mq.on,true);
  if(D.board){mq.on=true;stg.classList.add('mq');$$('mq').parentNode.style.display='none';mqUi();bh()}
  $$('mqa').onclick=()=>mqAdd(2);$$('mqb').onclick=()=>mqAdd(3);
  $$('mqr').onclick=()=>{if(confirm('Repor a maquete? Perdes as posições e as mortes atuais.'))mqSnap()};
  $$('mkp').onclick=e=>{const k=e.target.dataset.k,m=mqCur();if(k!==undefined&&m){m.kl.splice(+k,1);save();mqUi()}};
  cv.oncontextmenu=e=>{if(!mq.on)return;const m=mqCur(),u=m&&mqHitU(pt(e));if(u){e.preventDefault();m.ut=m.ut.filter(x=>x!==u);save()}};
  cv.ondblclick=e=>{if(!mq.on)return;const h=mqHit(pt(e));if(h){const n=prompt('Nome do jogador:',h.n);if(n!==null){h.n=n.trim()||h.n;save();mqUi()}}};
  const teamOf=u=>{if(u.tm===undefined){const r=(D.fr.get(D.T[idxOf(u.t)])||[]).find(x=>x.steamid===u.s);u.tm=r?r.team_num:0}return u.tm};
 // posição/olhar de um jogador num tick (interpolado)
 function rowAt(sid,t){let lo=0,hi=N-1;while(lo<hi){const m=(lo+hi+1)>>1;if(D.T[m]<=t)lo=m;else hi=m-1}
  const A=D.fr.get(D.T[lo])||[],ra=A.find(r=>r.steamid===sid);if(!ra)return null;
  const nx=Math.min(lo+1,N-1),B=D.fr.get(D.T[nx])||A,rb=B.find(r=>r.steamid===sid)||ra,dt=D.T[nx]-D.T[lo],f=dt>0?Math.min(1,Math.max(0,(t-D.T[lo])/dt)):0;
  return{X:ra.X+(rb.X-ra.X)*f,Y:ra.Y+(rb.Y-ra.Y)*f,Z:ra.Z,yaw:ra.yaw,team:ra.team_num}}
 // tiros: rasto a partir do jogador, na direção do olhar, ~0,4 s
 const SL=26;
 function drawShots(tk){const SH=D.shots;if(!SH||!SH.length)return;let lo=0,hi=SH.length;while(lo<hi){const m=(lo+hi)>>1;if(SH[m].t<tk-SL)lo=m+1;else hi=m}
  for(let q=lo;q<SH.length&&SH[q].t<=tk;q++){const sh=SH[q],r=rowAt(sh.s,sh.t);if(!r||r.yaw==null)continue;
   const age=(tk-sh.t)/SL,[x,y]=P(r.X,r.Y),g=r.yaw*Math.PI/180,L=70+age*110,onF=th==null||(floor==='low')===(r.Z<th),cl=r.team==2?'#ffd8a8':'#a5d8ff';
   c.save();c.globalAlpha=(onF?1:.3)*(1-age);c.lineCap='round';
   c.strokeStyle=cl;c.lineWidth=3;c.beginPath();c.moveTo(x+Math.cos(g)*16,y-Math.sin(g)*16);c.lineTo(x+Math.cos(g)*L,y-Math.sin(g)*L);c.stroke();
   c.fillStyle='#fff';c.beginPath();c.arc(x+Math.cos(g)*16,y-Math.sin(g)*16,6*(1-age)+2,0,7);c.fill();c.restore()}}
 // caveiras: onde cada jogador morreu, até ao fim da ronda
 function skPos(d){if(d._sp!==undefined)return d._sp;let r=null;for(let q=0;q<6&&!r;q++)r=rowAt(d.user_steamid,+d.tick-q*16);d._sp=r;return r}
 function drawSkulls(tk){const k=curR(),s0=rounds[k],e0=rend(k);
  for(const d of D.deaths){const dt=+d.tick;if(!(dt<=tk)||dt<s0||dt>=e0)continue;const r=skPos(d);if(!r)continue;
   const[x,y]=P(r.X,r.Y),onF=th==null||(floor==='low')===(r.Z<th);
   c.save();c.globalAlpha=mq.on?.18:onF?1:.3;c.fillStyle='rgba(15,18,26,.85)';c.strokeStyle=col(r.team);c.lineWidth=3;c.beginPath();c.arc(x,y,14,0,7);c.fill();c.stroke();
   c.font='18px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#fff';c.fillText('☠',x,y+1);
   c.font='600 12px sans-serif';c.textBaseline='alphabetic';c.fillStyle='#c3c9d6';c.strokeStyle='#0b0d12';c.lineWidth=3;c.strokeText(d.user_name||'',x,y-20);c.fillText(d.user_name||'',x,y-20);c.restore()}}
 function drawUtil(u,tk){const[x,y]=P(u.x,u.y),onF=th==null||(floor==='low')===(u.z<th),tc=teamOf(u)?col(teamOf(u)):'#cbd5e1',left=(u.e-tk)/64,pg=(tk-u.t)/Math.max(1,u.e-u.t),rw=w=>Math.abs(P(u.x+w,u.y)[0]-x);
  c.save();c.globalAlpha=(onF?1:.25)*Math.min(1,left+.2);
  const ring=(r,f,s,lw)=>{c.fillStyle=f;c.strokeStyle=s;c.lineWidth=lw;c.beginPath();c.arc(x,y,r,0,7);c.fill();c.stroke()};
  let ic;
  if(u.k==='smoke'){ring(rw(144),'rgba(203,213,225,.55)',tc,3);ic='☁'}
  else if(u.k==='molotov'){ring(rw(125),'rgba(255,123,46,.45)','#ff7b2e',3);ic='🔥'}
  else if(u.k==='flash'){ring(14+pg*26,'rgba(255,224,102,.45)','#ffe066',2);ic='⚡'}
  else{ring(14+pg*30,'rgba(255,107,107,.45)','#ff6b6b',2);ic='💥'}
  c.font='20px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#fff';c.fillText(ic,x,y+1);c.restore()}
 function loop(now){if(!document.body.contains(cv))return;if(play){i+=(now-last)/1000*4*spd;if(i>=N-1){i=N-1;play=false;$$('pp').textContent='▶'}}last=now;draw();requestAnimationFrame(loop)}
 requestAnimationFrame(loop);
}


// Quadro tático: só o mapa (radar) para desenhar estratégias e notas, sem demo.
async function demoBoard(p,el){
 await loadRadars();
 const map=RADAR[p.boardMap]?p.boardMap:(RADAR.de_mirage?'de_mirage':Object.keys(RADAR)[0]);
 demoPlay({map,T:[0,1],fr:new Map([[0,[]],[1,[]]]),deaths:[],starts:[0],ends:[],board:true},el,p);
}
