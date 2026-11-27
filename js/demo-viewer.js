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
 const NM=['grenade_thrown','player_hurt','player_blind','item_purchase','bomb_beginplant','bomb_begindefuse','bomb_dropped','bomb_pickup'];
 const flat=a=>Array.isArray(a)?(a.length&&a[0]&&Array.isArray(a[0].data)?a.flatMap(x=>x.data):a):[];
 let X=null;
 try{say('A ler detalhes da ronda (dano, granadas, bomba, compras)…');await _nx();const r=_norm(DPM.parseEvents(b,NM)),o={},put=(n,rows)=>{(o[n]||(o[n]=[])).push(...flat(rows))};
  if(Array.isArray(r)){for(const e of r){if(Array.isArray(e)&&typeof e[0]==='string')put(e[0],e[1]);else if(e&&Array.isArray(e.data)&&(e.name||e.event_name))put(e.name||e.event_name,e.data);else if(e&&e.event_name)put(e.event_name,[e])}}
  else if(r&&typeof r==='object'){for(const k of Object.keys(r))put(k,r[k])}
  if(Object.keys(o).length)X=o}catch(e){X=null}
 if(!X){X={};for(const n of NM)X[n]=await ev(n)}
 const gx=n=>X[n]||[];
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
 return{map:h.map_name||'',T:[...fr.keys()].sort((a,b)=>a-b),fr,deaths,starts:starts.map(e=>+e.tick).sort((a,b)=>a-b),ends:ends.map(e=>({tick:+e.tick,w:String(e.winner||'')})),fe:fes.map(e=>+e.tick).sort((a,b)=>a-b),plants:plants.map(e=>+e.tick).sort((a,b)=>a-b),util,shots,defuses:dfs.map(e=>+e.tick),explodes:exs.map(e=>+e.tick),plantR:plants,defR:dfs,exR:exs,thr:gx('grenade_thrown'),hurt:gx('player_hurt'),blind:gx('player_blind'),buys:gx('item_purchase'),bpl:gx('bomb_beginplant'),bdf:gx('bomb_begindefuse'),bdr:gx('bomb_dropped'),bpk:gx('bomb_pickup')};
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
 const DDO=v=>[[64,'1 s'],[128,'2 s'],[192,'3 s'],[320,'5 s'],[640,'10 s'],[960,'15 s'],[1920,'30 s'],[0,'Ronda toda']].map(([k,l])=>`<option value="${k}"${k===v?' selected':''}>${l}</option>`).join('');
 const idxOf=t=>{let k=D.T.findIndex(x=>x>=t);return k<0?N-1:Math.max(0,k)};
 const rend=k=>rounds[k+1]||t1;
 const fes=D.fe||[],plants=D.plants||[];let buy=true,showU=true,showS=true,showN=true;try{buy=localStorage.getItem('ugr_skipbuy')!=='1';showU=localStorage.getItem('ugr_util')!=='0';showS=localStorage.getItem('ugr_shots')!=='0';showN=localStorage.getItem('ugr_names')!=='0'}catch(e){}
 const feOf=k=>{const x=fes.find(q=>q>=rounds[k]&&q<rend(k));return x??rounds[k]+960};
 const st=k=>buy?rounds[k]:feOf(k);let curFe=0,curPl=0;
 const GR={'Smoke Grenade':'☁','Flashbang':'⚡','High Explosive Grenade':'💥','Molotov':'🔥','Incendiary Grenade':'🔥','Decoy Grenade':'◎'};
 const PIS=['Glock-18','USP-S','P2000','P250','Five-SeveN','Tec-9','CZ75-Auto','Desert Eagle','Dual Berettas','R8 Revolver'];
 function gear(r){const inv=Array.isArray(r.inventory)?r.inventory:[];let w='',pis='',u='',c4=false;for(const n of inv){if(GR[n])u+=GR[n];else if(n==='C4 Explosive')c4=true;else if(PIS.includes(n))pis=n;else if(!/^knife|^Zeus|taser/i.test(n))w=n}return{w:w||pis||'—',u,c4}}
 const win=k=>{const e=D.ends.find(e=>e.tick>=rounds[k]&&e.tick<rend(k));return e?e.w:''};
 const _i=d=>`<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
 const IC={cur:_i('<path d="M5 3l14 7-6 2-2 6z"/>'),pen:_i('<path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/>'),line:_i('<path d="M5 19L19 5"/>'),arrow:_i('<path d="M5 19L19 5"/><path d="M10 5h9v9"/>'),circle:_i('<circle cx="12" cy="12" r="8"/>'),text:_i('<path d="M5 7V5h14v2M12 5v14M9 19h6"/>'),erase:_i('<path d="M3 17l9-9 6 6-5 5H7z"/><path d="M12 8l6 6"/>'),undo:_i('<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/>'),trash:_i('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),zin:_i('<circle cx="11" cy="11" r="6"/><path d="M20 20l-4-4M8.5 11h5M11 8.5v5"/>'),zout:_i('<circle cx="11" cy="11" r="6"/><path d="M20 20l-4-4M8.5 11h5"/>'),plus:_i('<path d="M12 5v14M5 12h14"/>'),list:_i('<path d="M5 6h14M5 12h14M5 18h9"/>'),layers:_i('<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>'),full:_i('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),reset:_i('<path d="M20 11a8 8 0 10-2.3 5.7"/><path d="M20 4v7h-7"/>')};
 el.innerHTML=`<div class="stg${D.board?' board':''}">
 <div class="cvw"><canvas id="cv" width="${S}" height="${S}"></canvas></div>
 <div class="tw"><div class="tc"><div class="tm side2"><span>T</span><b id="sc2">0</b></div><div class="mid"><b id="tm">0:00</b><span id="rn"></span></div><div class="tm side3"><b id="sc3">0</b><span>CT</span></div></div></div>

 <div class="colL">
  <div class="pn utp"><div class="ph">Utilidades no mapa</div><div class="grp wrapg">${[['u-smoke','☁','Smoke'],['u-molotov','🔥','Molo'],['u-flash','⚡','Flash'],['u-he','💥','HE'],['u-bomb','💣','Bomba']].map(([k,i_,t])=>`<button class="g" data-tool="${k}" title="${t}">${i_} ${t}</button>`).join('')}</div></div>
  <div class="pl" id="pl2"></div>
  <div class="pn tp">
   ${D.board?`<div class="sec"><div class="ph">Mapa</div><div class="rowc"><select id="mp">${Object.keys(RADAR).sort((x,y)=>(x.startsWith('de_')?0:1)-(y.startsWith('de_')?0:1)||x.localeCompare(y)).map(m=>`<option value="${m}"${m===D.map?' selected':''}>${m.replace(/^(de|cs|ar)_/,'').replace(/_/g,' ')}</option>`).join('')}</select>${R&&R.low?'<button class="g solid" id="fl">Piso: superior</button>':''}</div></div>`:''}
   <div class="sec"><div class="ph">Desenhar</div>
    <div class="grp tools7" id="tl2">${[['',IC.cur,'Cursor'],['pen',IC.pen,'Livre'],['line',IC.line,'Linha'],['arrow',IC.arrow,'Seta'],['circle',IC.circle,'Círculo'],['text',IC.text,'Texto'],['erase',IC.erase,'Borracha']].map(([k,s,t],n)=>`<button class="g${n?'':' on'}" data-tool="${k}" title="${t}">${s}</button>`).join('')}</div>
    <div class="rowc sp" id="cols">${['#ffd43b','#ff6b6b','#51cf66','#4dabf7','#ffffff'].map((c,n)=>`<button class="g sw${n?'':' on'}" data-c="${c}" style="--sw:${c}" title="Cor"></button>`).join('')}<input type="color" id="cc" value="#ffd43b" title="Cor personalizada"></div>
    <div class="rowc"><span id="durg"><select id="dur" title="Durante quanto tempo o desenho fica visível"><option value="640">Visível 10 s</option><option value="320">Visível 5 s</option><option value="1920">Visível 30 s</option><option value="0">Ronda toda</option></select></span><button class="g solid ic" id="un" title="Desfazer o último desenho">${IC.undo}</button><button class="g solid" id="cl" title="Apagar os desenhos soltos">${IC.trash}${D.board?'Limpar':'Ronda'}</button></div>
   </div>
   <div class="sec"><div class="ph">Maquete</div>
    <div class="rowc"><button class="g solid wide" id="mq" title="Maquete: arrasta os jogadores e as utilidades. ☠ Matar: clica no atirador e depois na vítima. Duplo clique renomeia; ⌫ ou botão direito apaga.">${IC.layers}Maquete</button></div>
    <div class="rowc mqx"><button class="g solid" id="mqa" title="Adicionar jogador T">+ T</button><button class="g solid" id="mqb" title="Adicionar jogador CT">+ CT</button><button class="g solid" data-tool="m-kill" title="Matar: clica no atirador e depois na vítima">☠ Matar</button><button class="g solid ic" id="mqr" title="Repor a maquete (volta a tirar a fotografia do instante atual)">${IC.reset}</button></div>
   </div>
   <div class="sec"><div class="ph">Notas</div>
    <div class="rowc"><button class="pri" id="nt">${IC.plus}Criar nota</button><button class="g solid" id="nvw">${IC.list}Ver notas <span class="cnt" id="nc">0</span></button></div>
   </div>
   <div class="sec"><div class="ph">Revisão (coach → aluno)</div>
    <div class="rowc"><button class="g solid" id="rvs" title="Guardar um ficheiro com os desenhos, notas e maquetes para enviar ao aluno">${_i('<path d="M12 4v11"/><path d="M7 11l5 5 5-5"/><path d="M5 20h14"/>')}Guardar</button><button class="g solid" id="rvo" title="Abrir um ficheiro de revisão enviado pelo coach">${_i('<path d="M12 16V5"/><path d="M7 9l5-5 5 5"/><path d="M5 20h14"/>')}Abrir</button><input type="file" id="rvf" accept=".json,.ugr,application/json" style="display:none"></div>
   </div>
   <div class="sec"><div class="ph">Vista</div>
    <div class="rowc"><div class="grp" id="zmg"><button class="g ic" id="zo" title="Menos zoom (ou roda do rato)">${IC.zout}</button><button class="g" id="zr" title="Repor zoom">1×</button><button class="g ic" id="zi" title="Mais zoom (ou roda do rato)">${IC.zin}</button></div><label class="g chk" title="Mostrar os nomes dos jogadores no mapa"><input type="checkbox" id="nn"${showN?' checked':''}>Nomes</label>${D.board?'':`<label class="g chk" title="Mostrar as utilidades lançadas pelos jogadores"><input type="checkbox" id="uu"${showU?' checked':''}>Utilidades</label><label class="g chk" title="Mostrar os tiros (rasto das armas)"><input type="checkbox" id="ts"${showS?' checked':''}>Tiros</label>`}<button class="g solid ic" id="fs" title="Ecrã inteiro">${IC.full}</button></div>
   </div>
  </div>
 </div>

 <div class="nbox">
  <div class="pn mkp" id="mkp"></div>
  <div class="pn nv" id="nv"></div>
  <div class="pn nd pop" id="nd"><div class="kh">Criar nota<u class="x ndx" id="ndx" title="Fechar">✕</u></div><input type="text" id="nti" placeholder="Título"><textarea id="ni" placeholder="Texto da nota… (Ctrl+Enter adiciona)" rows="3"></textarea><label class="opt nmq"><input type="checkbox" id="nmq" checked>Anexar a maquete desta ronda</label><div class="rowc" id="ndr" style="margin:0 0 8px"><span class="mut" style="font-size:12px">Desenhos visíveis</span><select id="ndd">${DDO(192)}</select></div><label class="opt" id="nshl"><input type="checkbox" id="nsh" checked><span id="nshs">Anexar os desenhos desta ronda</span></label><button class="pri wide" id="na">Adicionar nota</button></div>
  <div class="pn nd pop" id="nlp"><div class="kh">Notas</div><div id="nl"></div></div>
  <div id="ln" style="display:none"></div>
 </div>

 <div class="colR">
  <div class="pl pr" id="pl3"></div>
  <div class="pn lg" id="lg"><div class="kh"><span id="lgt">Logs</span><span class="lf"><button class="g on" data-f="kill" title="Kills">☠</button><button class="g on" data-f="hurt" title="Dano">💢</button><button class="g on" data-f="nade" title="Granadas e flashes">🧨</button><button class="g on" data-f="bomb" title="Bomba">💣</button><button class="g on" data-f="buy" title="Compras">🛒</button></span></div><div id="lgl"></div></div>
 </div>

 <div class="pn bar"><div class="tlb" id="tlb"></div>
  <div class="bctl">
   <div class="b1"><div class="rsel"><button class="g" id="rp" title="Ronda anterior">◀</button><select id="rs">${rounds.map((t,k)=>`<option value="${k}">Ronda ${k+1}${win(k)?' · '+win(k):''}</option>`).join('')}</select><button class="g" id="rx" title="Ronda seguinte">▶</button></div><label class="g chk" title="Saltar o tempo de compras: a ronda começa quando o buytime acaba"><input type="checkbox" id="by"${buy?'':' checked'}>Sem buytime</label></div>
   <div class="b2"><span id="tt" class="mut"></span><div class="grp"><button class="g" data-s="-60">−15</button><button class="g" data-s="-20">−5</button></div><button id="pp" class="play">▶</button><div class="grp"><button class="g" data-s="20">+5</button><button class="g" data-s="60">+15</button></div></div>
   <div class="b3"><div class="grp" id="spd">${[.25,.5,1,2,4].map(v=>`<button class="g${v==1?' on':''}" data-v="${v}">${v}×</button>`).join('')}</div>${R&&R.low&&!D.board?'<button class="g solid" id="fl">Piso: superior</button>':''}</div>
  </div>
 </div>
</div>`;
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
 function setRound(k){lastI=-1;buildLog(k);curFe=feOf(k);curPl=plants.find(q=>q>=curFe&&q<rend(k))||0;rs=rounds[k]===undefined?t0:st(k);re=rend(k);lastR=k;mqUi();$$('rs').value=k;
  $$('tlb').innerHTML='<u></u>'+D.deaths.filter(d=>d.tick>=rs&&d.tick<re).map(d=>{const f=D.fr.get(D.T[idxOf(d.tick)])||[],a=f.find(r=>r.steamid===d.attacker_steamid);return`<s style="left:${pcr(d.tick)};background:${a?col(a.team_num):'#ff5d5d'}" data-t="${d.tick-160}" title="${esc(d.attacker_name||'?')} → ${esc(d.user_name||'?')}"></s>`}).join('')+anno.notes.filter(n=>rIdx(n.t)===k).map(n=>`<b style="left:${pcr(n.t)};background:${n.c||'#ffd43b'}" data-t="${n.t}" data-n="${n.id}" title="${esc(n.title||n.text||'')}"></b>`).join('')+'<i id="cur"></i><em id="curt"></em>'}
 const zm={k:1,x:0,y:0};
 function draw(){c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,S,S);c.save();c.translate(zm.x,zm.y);c.scale(zm.k,zm.k);try{drawScene()}finally{c.restore()}}
 function drawScene(){
  c.clearRect(0,0,S,S);
  const ri0=curR();if(ri0!==lastR)setRound(ri0);
  if(!buy&&!D.board&&D.T[Math.floor(i)]<rs)i=idxOf(rs);
  const a=Math.floor(i),f=i-a,A=D.fr.get(D.T[a]),B=D.fr.get(D.T[Math.min(a+1,N-1)])||A;
  const im=floor==='low'&&imgs.low?imgs.low:imgs.up;
  if(R&&im&&im.complete)c.drawImage(im,0,0,S,S);else if(!R){if(!bg)bg=mkBg();c.drawImage(bg,0,0)}
  if(showU&&D.util){const tk=D.T[a];for(const u of D.util)if(tk>=u.t&&tk<u.e)drawUtil(u,tk)}
  const bm=new Map(B.map(r=>[r.steamid,r])),nums=numMap(A),tkn=D.T[a]+f*((D.T[Math.min(a+1,N-1)]||D.T[a])-D.T[a]);
  drawSkulls(D.T[a]);
  for(const r of A){const q=bm.get(r.steamid)||r,X=r.X+(q.X-r.X)*f,Y=r.Y+(q.Y-r.Y)*f,[x,y]=P(X,Y),dead=!(r.health>0);
   if(dead)continue;
   const onF=th==null||(floor==='low')===(r.Z<th);
   c.globalAlpha=mq.on?.18:dead?.4:onF?1:.3;const cl=dead?'#8b93a7':col(r.team_num);
   if(r.yaw!=null&&!dead){const g=r.yaw*Math.PI/180;c.strokeStyle=cl;c.lineWidth=3;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(g)*28,y-Math.sin(g)*28);c.stroke()}
   c.fillStyle=cl;c.strokeStyle='#0b0d12';c.lineWidth=3;c.beginPath();c.arc(x,y,10,0,7);c.stroke();c.fill();
   c.textAlign='center';c.fillStyle='#fff';{const nu=nums.get(r.steamid);if(nu!==undefined){c.font='700 13px sans-serif';c.textBaseline='middle';c.lineWidth=3;c.strokeText(nu,x,y+1);c.fillText(nu,x,y+1)}}
   c.textBaseline='alphabetic';if(showN){c.font='600 14px sans-serif';c.lineWidth=3;c.strokeText(r.name||'',x,y-16);c.fillText(r.name||'',x,y-16)}c.globalAlpha=1}
  if(showS&&!mq.on)drawShots(tkn);
  for(const s of anno.shapes)if(vis(s))drawShape(s);{const sn=selN!=null&&anno.notes.find(x=>String(x.id)===String(selN));if(sn&&sn.shapes&&(D.board||(D.T[a]>=sn.t&&(sn.dd===0?D.T[a]<rend(rIdx(sn.t)):D.T[a]<sn.t+(sn.dd??192)))))for(const s of sn.shapes)drawShape(s)}if(cur)drawShape(cur);mqDraw();
  const t=D.T[a];
  const cu=$$('cur');if(cu){cu.style.left=pcr(t);const ct=$$('curt');if(ct)ct.style.left=pcr(t)}
  if(a!==lastI){lastI=a;
   $$('tt').textContent=fmt(Math.max(0,(t-rs)/64))+' / '+fmt((re-rs)/64);
   let ck,lb;if(t<curFe){ck=buy?fmt((curFe-t)/64):'1:55';lb='Compras'}else if(curPl&&t>=curPl){ck=fmt(Math.max(0,40-(t-curPl)/64));lb='Bomba'}else{ck=fmt(Math.max(0,115-(t-curFe)/64));lb='Ronda'}
   $$('tm').textContent=ck;{const ctt=$$('curt');if(ctt)ctt.textContent=ck}{const aT=A.filter(r=>r.team_num==2&&r.health>0).length,aC=A.filter(r=>r.team_num==3&&r.health>0).length;$$('rn').innerHTML=lb+' · <span style="color:#f08c00">'+aT+'T</span> vs <span style="color:#4dabf7">'+aC+'CT</span>'}renderLive(t);renderLog(t);
   let s3=0,s2=0;for(const e of D.ends)if(e.tick<=t){if(e.w==='CT')s3++;else if(e.w==='T')s2++}
   $$('sc3').textContent=s3;$$('sc2').textContent=s2;
   const ks=D.deaths.filter(d=>d.tick<=t),kd={},dd={};for(const d of ks){kd[d.attacker_steamid]=(kd[d.attacker_steamid]||0)+1;dd[d.user_steamid]=(dd[d.user_steamid]||0)+1}
   if(!plDrag)for(const tn of [3,2])$$('pl'+tn).innerHTML=teamSorted(A,tn).map((r,n)=>{const h=Math.max(0,r.health||0),g=gear(r);return`<div class="pc${h?'':' dead'}" data-s="${esc(String(r.steamid))}" data-tn="${tn}" style="--c:${col(tn)}"><b class="gp" title="Arrasta para mudar a posição (e o número no mapa)">${NB[tn]+Math.min(n,4)}</b><div class="pcb"><div class="r1"><span class="nm">${esc(r.name||'')}</span><span class="kd">⌖${kd[r.steamid]||0} ☠${dd[r.steamid]||0}</span><span class="hp">${h}</span></div><div class="hb"><i style="width:${h}%"></i></div>${h?`<div class="gr"><span>${esc(g.w)}</span><b>$${r.balance??''}</b></div><div class="gr"><span>${g.u}</span><span>${r.armor_value>0?'🛡'+r.armor_value+(r.has_helmet?'⛑':''):''}${r.has_defuser?' 🔧':''}${g.c4?' 💣':''}</span></div>`:''}</div></div>`}).join('');
  }
 }
 // ---- anotações e desenhos (guardados à parte: registo "<id>:anno") ----
 const AK=p.id+':anno'+(D.board?':'+D.map:'');let anno={shapes:[],notes:[],mocks:{},pos:{}},tool='',color='#ffd43b',cur=null,sv=null;
  const NB={2:0,3:5};let plDrag=false;
 const teamSorted=(A,tn)=>{const ps=anno.pos||{};return A.map((r,n)=>({r,n})).filter(o=>o.r.team_num==tn).sort((a,b)=>(ps[a.r.steamid]??99)-(ps[b.r.steamid]??99)||a.n-b.n).map(o=>o.r)};
 const numMap=A=>{const m=new Map();for(const tn of [2,3])teamSorted(A,tn).forEach((r,n)=>m.set(r.steamid,NB[tn]+Math.min(n,4)));return m};
 const inv=(x,y)=>R?[x*R.p[2]+R.p[0],R.p[1]-y*R.p[2]]:[(x-62)*sc+x0,y1-(y-62)*sc];
 const save=()=>{clearTimeout(sv);sv=setTimeout(()=>{try{put({id:AK,anno}).catch(()=>{})}catch(e){}},400)};
 const rIdx=t=>{let k=0;rounds.forEach((r,n)=>{if(r<=t)k=n});return k};
 const vis=s=>{const t=D.T[Math.floor(i)];return t>=s.t&&(s.d?t<s.t+s.d:t<rend(rIdx(s.t)))};
 const dur=()=>D.board?0:+$$('dur').value;
  let selN=null,lastLn='';
  const nt=n=>(n.mock?'🧩 ':'')+(n.shapes&&n.shapes.length?'✏️ ':'')+(n.title||(n.text||'').slice(0,40)||'Nota');
  const delNote=id=>{anno.notes=anno.notes.filter(n=>String(n.id)!==String(id));if(String(selN)===String(id))selN=null;save();refresh()};
  function renderLive(t){return;const L=anno.notes.filter(n=>D.board||(t>=n.t&&t<n.t+640));const h=L.map(n=>`<div class="lnc" data-id="${n.id}" style="--c:${n.c||'#ffd43b'}"><u class="x" data-d="${n.id}" title="Apagar nota">✕</u><span>${esc(nt(n))}</span></div>`).join('');if(h!==lastLn){lastLn=h;$$('ln').innerHTML=h}}
 function refresh(){$$('nc').textContent=anno.notes.length;renderNotes();lastI=-1;if(lastR>=0)setRound(lastR)}
  let lgList=[],lgHtml='';
  const WN={hegrenade:'HE',smokegrenade:'Smoke',flashbang:'Flash',molotov:'Molotov',incgrenade:'Incendiária',inferno:'fogo',decoy:'Decoy',c4:'C4'},HG=['','cabeça','peito','barriga','braço esq.','braço dir.','perna esq.','perna dir.'];
  const wname=w=>{w=String(w||'').replace(/^weapon_/,'');return esc(WN[w]||w)};
  const NI={smoke:'☁',molotov:'🔥',flash:'⚡',he:'💥'},NN={smoke:'Smoke',molotov:'Molotov',flash:'Flash',he:'HE'};
  function buildLog(k){const s0=rounds[k]===undefined?t0:rounds[k],e0=rend(k),L=[],inR=t=>t>=s0&&t<e0,tmOf=(sid,t)=>{const r=rowAt(sid,t);return r?r.team:0},
   N=(n,sid,t)=>{const r=rowAt(sid,t);return`<span style="color:${r?col(r.team):'#c3c9d6'}">${esc(n||'?')}</span>`},has=x=>x&&String(x)!=='0',mu=x=>`<span class="mut">${x}</span>`;
   const f=fes.find(q=>q>=s0&&q<e0);if(f!==undefined)L.push({t:f,c:'end',h:'▶ Fim do buytime — a ronda começou'});
   for(const b of D.buys||[]){const t=+b.tick;if(!inR(t))continue;const w=b.weapon||b.item||b.name;if(!w)continue;L.push({t,c:'buy',h:`🛒 ${N(b.user_name,b.user_steamid,t)} comprou <b>${wname(w)}</b>`})}
   if((D.thr||[]).length){for(const g of D.thr){const t=+g.tick;if(inR(t))L.push({t,c:'nade',h:`🧨 ${N(g.user_name,g.user_steamid,t)} lançou <b>${wname(g.weapon)}</b>`})}}
   else for(const u of D.util||[])if(inR(u.t))L.push({t:u.t,c:'nade',h:`${NI[u.k]||'🧨'} ${N(u.n,u.s,u.t)} — ${NN[u.k]||u.k} detonou`});
   for(const b of D.blind||[]){const t=+b.tick,du=+b.blind_duration;if(!inR(t)||!(du>=.5))continue;const tf=has(b.attacker_steamid)&&tmOf(b.attacker_steamid,t)===tmOf(b.user_steamid,t);
    L.push({t,c:'nade',h:`⚡ ${has(b.attacker_steamid)?N(b.attacker_name,b.attacker_steamid,t):'?'} cegou ${N(b.user_name,b.user_steamid,t)} ${mu(du.toFixed(1)+' s')}${tf?' ⚠ colega':''}`})}
   for(const[arr,txt]of[[D.bpl,'começou a plantar a bomba'],[D.bdr,'largou a bomba'],[D.bpk,'apanhou a bomba']])for(const b of arr||[]){const t=+b.tick;if(inR(t))L.push({t,c:'bomb',h:`💣 ${N(b.user_name,b.user_steamid,t)} ${txt}`})}
   for(const b of D.bdf||[]){const t=+b.tick;if(inR(t))L.push({t,c:'bomb',h:`🔧 ${N(b.user_name,b.user_steamid,t)} começou a desarmar${b.haskit?' (com kit)':''}`})}
   for(const h of D.hurt||[]){const t=+h.tick,dm=+h.dmg_health;if(!inR(t)||!(dm>0))continue;const A_=has(h.attacker_steamid),tf=A_&&h.attacker_steamid!==h.user_steamid&&tmOf(h.attacker_steamid,t)===tmOf(h.user_steamid,t),ar=+h.dmg_armor,hg=HG[+h.hitgroup]||'';
    L.push({t,c:'hurt',h:`${A_?N(h.attacker_name,h.attacker_steamid,t)+' 💢 ':''}${N(h.user_name,h.user_steamid,t)} <b style="color:#ff8787">−${dm}</b> ${mu((ar>0?'colete −'+ar+' · ':'')+wname(h.weapon||'queda')+(hg?' · '+hg:'')+(isFinite(+h.health)?' · vida '+h.health:''))}${tf?' ⚠ fogo amigo':''}`})}
   for(const d of D.deaths){const t=+d.tick;if(!inR(t))continue;const self=!has(d.attacker_steamid)||d.attacker_steamid===d.user_steamid;
    const tg=[];if(d.headshot)tg.push('★ cabeça');if(+d.penetrated>0)tg.push('através de parede');if(d.thrusmoke)tg.push('através de smoke');if(d.noscope)tg.push('sem scope');if(d.attackerblind)tg.push('atacante cego');if(+d.distance>0)tg.push(Math.round(+d.distance)+' m');
    const as=d.assister_name?` · assist: ${N(d.assister_name,d.assister_steamid,t)}${d.assistedflash?' (flash)':''}`:'';
    L.push({t,c:'kill',h:self?`☠ ${N(d.user_name,d.user_steamid,t)} morreu ${mu(wname(d.weapon||'queda'))}`:`${N(d.attacker_name,d.attacker_steamid,t)} ☠ ${N(d.user_name,d.user_steamid,t)} ${mu(wname(d.weapon)+(tg.length?' · '+tg.join(' · '):''))}${as}`})}
   for(const b of D.plantR||[]){const t=+b.tick;if(inR(t))L.push({t,c:'bomb',h:`💣 <b>${N(b.user_name,b.user_steamid,t)} plantou a bomba</b>`})}
   for(const b of D.defR||[]){const t=+b.tick;if(inR(t))L.push({t,c:'bomb',h:`🔧 <b>${N(b.user_name,b.user_steamid,t)} desarmou a bomba</b>`})}
   for(const t of D.explodes||[])if(inR(t))L.push({t,c:'bomb',h:'💥 <b>A bomba explodiu</b>'});
   for(const e of D.ends)if(e.tick>=s0&&e.tick<e0)L.push({t:e.tick,c:'end',h:'🏁 <b>Ronda para '+(e.w==='CT'?'CT':e.w==='T'?'T':'—')+'</b>'});
   L.forEach((x,n)=>x.o=n);L.sort((a,b)=>a.t-b.t||a.o-b.o);lgList=L;lgHtml=''}
  function renderLog(t){const rt=tk=>tk<curFe?'−'+fmt((curFe-tk)/64):fmt(Math.max(0,115-(tk-curFe)/64)),h=lgList.filter(x=>x.t<=t).map(x=>`<div data-t="${x.t}" data-c="${x.c}"><time>${rt(x.t)}</time> ${x.h}</div>`).join('')||'<div class="mut">Sem eventos ainda</div>';
   if(h!==lgHtml){lgHtml=h;const g=$$('lgl'),near=g.scrollHeight-g.scrollTop-g.clientHeight<40;g.innerHTML=h;if(near)g.scrollTop=g.scrollHeight}$$('lgt').textContent='Logs · R'+(lastR+1)}
  const LF=['kill','hurt','nade','bomb','buy'];let lgOff=new Set();try{lgOff=new Set(JSON.parse(localStorage.getItem('ugr_lgoff')||'[]'))}catch(e){}
  const lgApply=()=>{LF.forEach(c=>$$('lg').classList.toggle('off-'+c,lgOff.has(c)));el.querySelectorAll('#lg [data-f]').forEach(b=>b.classList.toggle('on',!lgOff.has(b.dataset.f)))};lgApply();
  $$('lg').onclick=e=>{const b=e.target.closest('[data-f]');if(b){const c=b.dataset.f;lgOff.has(c)?lgOff.delete(c):lgOff.add(c);try{localStorage.setItem('ugr_lgoff',JSON.stringify([...lgOff]))}catch(x){}lgApply();return}const r=e.target.closest('[data-t]');if(r){i=idxOf(+r.dataset.t-160);play=false;$$('pp').textContent='▶'}};
  function renderViewer(){const v=$$('nv'),n=selN!=null&&anno.notes.find(x=>String(x.id)===String(selN));if(mqPrev&&!(n&&n.mock)){const q=mqPrev;mqPrev=null;if(q.mock)anno.mocks[q.key]=q.mock;else delete anno.mocks[q.key];save();mqSet(q.on,false)}
  if(!n){v.style.display='none';v.innerHTML='';return}v.style.display='block';v.style.setProperty('--c',n.c||'#ffd43b');v.innerHTML='<b>'+esc(nt(n))+'</b>'+(n.text?'<div>'+esc(n.text)+'</div>':'')+(n.shapes&&n.shapes.length?'<small>✏️ '+n.shapes.length+(n.shapes.length>1?' desenhos':' desenho')+' desta nota no mapa</small><label class="mut" style="font-size:12px;display:flex;gap:8px;align-items:center;margin-top:6px">Visíveis<select id="nvd">'+DDO(n.dd??192)+'</select></label>':'')}
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
 const pt=e=>{const b=cv.getBoundingClientRect();return inv(((e.clientX-b.left)/b.width*S-zm.x)/zm.k,((e.clientY-b.top)/b.height*S-zm.y)/zm.k)};
 const dist=(s,w)=>{const pp=P(w[0],w[1]),pq=s.pts.map(v=>P(v[0],v[1]));
  const seg=(a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy||1;let u=((pp[0]-a[0])*dx+(pp[1]-a[1])*dy)/l;u=Math.max(0,Math.min(1,u));return Math.hypot(pp[0]-a[0]-u*dx,pp[1]-a[1]-u*dy)};
  if(s.type==='circle')return Math.abs(Math.hypot(pp[0]-pq[0][0],pp[1]-pq[0][1])-Math.hypot(pq[1][0]-pq[0][0],pq[1][1]-pq[0][1]));
  if(s.type==='text'||pq.length===1)return Math.hypot(pp[0]-pq[0][0],pp[1]-pq[0][1]);
  let m=1e9;for(let n=1;n<pq.length;n++)m=Math.min(m,seg(pq[n-1],pq[n]));return m};
 const erase=w=>{const sn=selN!=null&&anno.notes.find(x=>String(x.id)===String(selN)),pool=[...anno.shapes.filter(vis).map(s=>[s,anno.shapes]),...(sn&&sn.shapes?sn.shapes.map(s=>[s,sn.shapes]):[])];let best=null,own=null,bd=24;for(const[s,arr]of pool){const d=dist(s,w);if(d<bd){bd=d;best=s;own=arr}}if(best){own.splice(own.indexOf(best),1);save();refresh()}};
 cv.style.touchAction='none';
 cv.onpointerdown=e=>{if(mq.on&&mqDown(e))return;if(e.button===1||(!tool&&zm.k>1)){e.preventDefault();pan={x:e.clientX,y:e.clientY,ox:zm.x,oy:zm.y};try{cv.setPointerCapture(e.pointerId)}catch(x){}return}if(!tool||tool==='m-kill')return;const w=pt(e),t=D.T[Math.floor(i)];
  if(tool==='erase')return erase(w);
  if(tool.startsWith('u-')){const m=mqCur();if(!m||!mq.on)return;(m.ut||(m.ut=[])).push({id:Date.now(),k:tool.slice(2),x:w[0],y:w[1]});save();return}
  if(tool==='text'){const x=prompt('Texto:');if(x){anno.shapes.push({id:Date.now(),t,d:dur(),type:'text',c:color,w:3,pts:[w],text:x});save();refresh()}return}
  play=false;$$('pp').textContent='▶';try{cv.setPointerCapture(e.pointerId)}catch(x){}
  cur={id:Date.now(),t,d:dur(),type:tool,c:color,w:4,pts:tool==='pen'?[w]:[w,w]}};
 cv.onpointermove=e=>{if(pan){const b=cv.getBoundingClientRect();zm.x=pan.ox+(e.clientX-pan.x)/b.width*S;zm.y=pan.oy+(e.clientY-pan.y)/b.height*S;zmClamp();return}if(mq.drag){const w=pt(e);mq.drag.x=w[0];mq.drag.y=w[1];return}if(!cur)return;const w=pt(e);if(cur.type==='pen')cur.pts.push(w);else cur.pts[1]=w};
 cv.onpointerup=()=>{if(pan){pan=null;return}if(mq.drag){mq.drag=null;save();return}if(!cur)return;const q=cur.pts;if(q.length>1&&(cur.type==='pen'||q[0][0]!==q[1][0]||q[0][1]!==q[1][1])){anno.shapes.push(cur);save();refresh()}cur=null};
 el.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{tool=b.dataset.tool;el.querySelectorAll('[data-tool]').forEach(x=>x.classList.toggle('on',x===b));cv.style.cursor=tool?'crosshair':'default';ndDis=false;noteAuto()});
 $$('cols').onclick=e=>{const b=e.target.closest('[data-c]');if(!b)return;color=b.dataset.c;$$('cc').value=color;el.querySelectorAll('#cols .sw').forEach(x=>x.classList.toggle('on',x===b))};
 const nn=$$('nn');if(nn)nn.onchange=e=>{showN=e.target.checked;try{localStorage.setItem('ugr_names',showN?'1':'0')}catch(x){}};
 const ts=$$('ts');if(ts)ts.onchange=e=>{showS=e.target.checked;try{localStorage.setItem('ugr_shots',showS?'1':'0')}catch(x){}};
 const uu=$$('uu');if(uu)uu.onchange=e=>{showU=e.target.checked;try{localStorage.setItem('ugr_util',showU?'1':'0')}catch(x){}};
 $$('cc').oninput=e=>{color=e.target.value;el.querySelectorAll('#cols .sw').forEach(x=>x.classList.remove('on'))};
 $$('by').onchange=e=>{buy=!e.target.checked;try{localStorage.setItem('ugr_skipbuy',buy?'0':'1')}catch(x){}setRound(curR());if(!buy&&D.T[Math.floor(i)]<rs)i=idxOf(rs);lastI=-1;draw()};
 $$('un').onclick=()=>{anno.shapes.pop();save();refresh()};
 $$('cl').onclick=()=>{const k=curR();if(confirm('Apagar todos os desenhos desta ronda?')){anno.shapes=anno.shapes.filter(s=>rIdx(s.t)!==k);save();refresh()}};
 const roundShapes=()=>anno.shapes.filter(s=>rIdx(s.t)===curR());
  function shUi(){const n=roundShapes().length,l=$$('nshl');if(!l)return;l.style.display=n?'flex':'none';$$('nshs').textContent='Anexar '+n+(n>1?' desenhos':' desenho')+' desta ronda'}
  function addNote(){const x=$$('ni').value.trim(),ti=$$('nti').value.trim(),sh=roundShapes(),att=$$('nsh').checked&&sh.length>0;if(!x&&!ti&&!att)return;const nm={id:Date.now(),t:D.T[Math.floor(i)],title:ti,text:x,c:color},mc=mq.on&&$$('nmq').checked&&mqCur();if(mc)nm.mock=JSON.parse(JSON.stringify(mc));
   if(att){nm.dd=+$$('ndd').value;nm.shapes=JSON.parse(JSON.stringify(sh));anno.shapes=anno.shapes.filter(s=>!sh.includes(s));selN=nm.id}
   anno.notes.push(nm);$$('ni').value='';$$('nti').value='';$$('nd').classList.remove('open');save();refresh()}
  $$('na').onclick=addNote;$$('ni').onkeydown=e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey))addNote()};
  $$('nl').onclick=e=>{const d=e.target.closest('[data-d]');if(d)return delNote(d.dataset.d);const r=e.target.closest('.mk');if(r&&r.dataset.id){selN=+r.dataset.id===selN?null:+r.dataset.id;if(!D.board){i=idxOf(+r.dataset.t);play=false;$$('pp').textContent='▶'}if(selN!==null){openNote(selN);$$('nlp').classList.remove('open')}renderNotes()}};
  $$('ln').onclick=e=>{const d=e.target.closest('[data-d]');if(d)return delNote(d.dataset.d);const r=e.target.closest('.lnc');if(r){const id=+r.dataset.id;if(selN===id){selN=null;renderNotes();return}selN=id;if(!D.board){i=idxOf(noteT(selN));play=false;$$('pp').textContent='▶'}openNote(selN);renderNotes()}};
  $$('nv').onclick=e=>{if(e.target.closest('select,label'))return;selN=null;renderNotes()};
  $$('nv').onchange=e=>{if(e.target.id!=='nvd')return;const n=anno.notes.find(x=>String(x.id)===String(selN));if(n){n.dd=+e.target.value;save()}};
  const noteT=id=>{const n=anno.notes.find(x=>String(x.id)===String(id));return n?n.t:D.T[0]};
  let mqPrev=null,ndAuto=false,ndDis=false;
  // ao desenhar ou com a Maquete ligada, o painel "Criar nota" abre sozinho (como se estivesses a adicionar uma nota)
  const isAct=()=>mq.on||['pen','line','arrow','circle','text'].includes(tool);
  function noteAuto(){const nd=$$('nd');if(!nd)return;if(isAct()){if(!ndDis){ndAuto=true;bh();shUi();$$('nlp').classList.remove('open');nd.classList.add('open')}}else if(ndAuto){ndAuto=false;nd.classList.remove('open')}}
  $$('ndx').onclick=()=>{ndDis=true;ndAuto=false;$$('nd').classList.remove('open')};
  function openNote(id){const n=anno.notes.find(x=>String(x.id)===String(id));if(!n||!n.mock)return;const key=D.board?'b':String(rIdx(n.t));if(!mqPrev)mqPrev={on:mq.on,key,mock:anno.mocks&&anno.mocks[key]?JSON.parse(JSON.stringify(anno.mocks[key])):null};(anno.mocks||(anno.mocks={}))[key]=JSON.parse(JSON.stringify(n.mock));save();mqSet(true,false)}
  const popOut=e=>{if(!document.body.contains(stg)){document.removeEventListener('pointerdown',popOut);return}if(e.target.closest('.pop,#nt,#nvw'))return;if(!(ndAuto&&isAct()))$$('nd').classList.remove('open');$$('nlp').classList.remove('open')};document.addEventListener('pointerdown',popOut);
  $$('nt').onclick=()=>{ndAuto=false;bh();shUi();$$('nlp').classList.remove('open');$$('nd').classList.toggle('open')};
  $$('nvw').onclick=()=>{bh();$$('nd').classList.remove('open');$$('nlp').classList.toggle('open')};
 // ---- Revisão: guardar/abrir ficheiro .ugr.json (coach envia ao aluno) ----
 const flash=(b,t)=>{const o=b.innerHTML;b.textContent=t;setTimeout(()=>{b.innerHTML=o},2200)};
 const hasAnno=a=>(a.shapes||[]).length||(a.notes||[]).length||Object.keys(a.mocks||{}).length,hasOwn=a=>(a.shapes||[]).length||(a.notes||[]).length;
 const mergeAnno=(a,b)=>{const sid=new Set((a.shapes||[]).map(x=>String(x.id))),nid=new Set((a.notes||[]).map(x=>String(x.id)));
  return{shapes:[...(a.shapes||[]),...(b.shapes||[]).filter(x=>!sid.has(String(x.id)))],notes:[...(a.notes||[]),...(b.notes||[]).filter(x=>!nid.has(String(x.id)))],mocks:{...(a.mocks||{}),...(b.mocks||{})},pos:{...(a.pos||{}),...(b.pos||{})}}};
 $$('rvs').onclick=()=>{
  const a=JSON.parse(JSON.stringify(anno));
  if(mqPrev){const q=mqPrev;if(q.mock)a.mocks[q.key]=JSON.parse(JSON.stringify(q.mock));else delete a.mocks[q.key]}
  if(!hasAnno(a)&&!confirm('Ainda não tens desenhos, notas nem maquetes. Guardar mesmo assim um ficheiro vazio?'))return;
  const d={ugr:1,kind:D.board?'board':'demo',game:'cs2',project:p.name,map:D.map,demoFile:p.fileName||null,demoSize:p.blob?p.blob.size:null,ticks:D.board?null:{n:N,first:t0,last:t1,rounds:rounds.length},saved:new Date().toISOString(),anno:a};
  const slug=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-+|-+$/g,'').toLowerCase();
  const nm=[slug(p.name)||'revisao',slug(String(D.map).replace('de_','')),new Date().toISOString().slice(0,10)].filter(Boolean).join('_')+'.ugr.json';
  const u=URL.createObjectURL(new Blob([JSON.stringify(d)],{type:'application/json'})),l=document.createElement('a');
  l.href=u;l.download=nm;document.body.appendChild(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);
  flash($$('rvs'),'✓ Guardado');
 };
 $$('rvo').onclick=()=>$$('rvf').click();
 $$('rvf').onchange=async e=>{
  const fl=e.target.files[0];e.target.value='';if(!fl)return;
  let d;try{d=JSON.parse(await fl.text())}catch(x){return alert('Este ficheiro não é válido.')}
  if(!d||d.ugr!==1||!d.anno||typeof d.anno!=='object')return alert('Este ficheiro não é uma revisão do Universal Game Review.');
  const isB=d.kind==='board';
  if(isB&&!D.board)return alert('Este ficheiro é de um quadro tático (só o mapa'+(d.map?': '+String(d.map).replace('de_',''):'')+'). Abre um projeto com "Usar só o mapa" para o importar.');
  if(!isB&&D.board)return alert('Este ficheiro é de uma demo'+(d.demoFile?' ('+d.demoFile+')':'')+'. Abre o projeto com essa demo para o importar.');
  const inc=d.anno;
  if(isB){
   const mk=d.map&&RADAR[d.map]?d.map:D.map,key=p.id+':anno:'+mk;
   if(mk!==D.map&&!confirm('Esta revisão é do mapa '+String(mk).replace('de_','')+'. Mudar para esse mapa e importar?'))return;
   let cur={shapes:[],notes:[],mocks:{},pos:{}};
   if(mk===D.map)cur=anno;else{try{const r=await tx('readonly',s=>s.get(key));if(r&&r.anno)cur=r.anno}catch(x){}}
   if(hasOwn(cur)&&!confirm('Já tens anotações neste mapa. OK = juntar as do ficheiro às tuas. Cancelar = não importar.'))return;
   const m=mergeAnno(cur,inc);
   if(mk===D.map){anno=m;save();refresh();mqUi();flash($$('rvo'),'✓ Importado');return}
   try{await put({id:key,anno:m});p.boardMap=mk;await put(p)}catch(x){return alert('Não foi possível guardar a revisão.')}
   return demoBoard(p,el);
  }
  const tk=d.ticks;
  if((d.map&&d.map!==D.map)||(tk&&(tk.n!==N||tk.first!==t0||tk.last!==t1))){
   if(!confirm('Esta revisão parece ser de outra demo'+(d.demoFile?' ('+d.demoFile+')':'')+'. Os momentos das notas podem não coincidir. Importar mesmo assim?'))return;
  }
  if(hasOwn(anno)&&!confirm('Já tens anotações neste projeto. OK = juntar as do ficheiro às tuas (nas maquetes da mesma ronda, ficam as do ficheiro). Cancelar = não importar.'))return;
  anno=mergeAnno(anno,inc);save();refresh();mqUi();
  flash($$('rvo'),'✓ Importado: '+(inc.notes||[]).length+' notas');
 };
 try{tx('readonly',s=>s.get(AK)).then(r=>{if(r&&r.anno){anno=r.anno;anno.shapes=anno.shapes||[];anno.notes=anno.notes||[];anno.mocks=anno.mocks||{};anno.pos=anno.pos||{};refresh();mqUi()}}).catch(()=>{})}catch(e){}

  // ---- maquete: jogadores arrastáveis + quem mata quem (guardada em anno.mocks, por ronda; no quadro, por mapa) ----
  const mq={on:false,pick:null,drag:null};
  const mqKey=()=>D.board?'b':String(curR());
  const mqCur=()=>(anno.mocks||(anno.mocks={}))[mqKey()];
  function mqSnap(){let tk;
   if(D.board){tk=[];for(const[tm,px]of[[2,70],[3,954]])for(let n=0;n<5;n++){const[x,y]=inv(px,300+n*95);tk.push({id:tm*100+n,tm,n:(tm==2?'T':'CT')+(n+1),x,y})}}
   else{const a=Math.floor(i),f=i-a,A=D.fr.get(D.T[a])||[],B=D.fr.get(D.T[Math.min(a+1,N-1)])||A,bm=new Map(B.map(r=>[r.steamid,r]));
    tk=A.filter(r=>r.health>0&&(r.team_num==2||r.team_num==3)).map((r,n)=>{const q=bm.get(r.steamid)||r;return{id:n+1,tm:r.team_num,n:r.name||'',s:r.steamid,x:r.X+(q.X-r.X)*f,y:r.Y+(q.Y-r.Y)*f}})}
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
   const ros=D.board?[]:(D.fr.get(D.T[Math.floor(i)])||[]),rn=numMap(ros),bn={2:0,3:0};
   for(const t of m.tk){const[x,y]=P(t.x,t.y),d=dead.has(t.id),sel=mq.pick===t.id;
    let nu;{const sid=t.s!==undefined?t.s:(ros.find(r=>r.team_num==t.tm&&r.name===t.n)||{}).steamid;nu=sid!==undefined&&rn.has(sid)?rn.get(sid):NB[t.tm]+Math.min(bn[t.tm]||0,4);bn[t.tm]=(bn[t.tm]||0)+1}c.globalAlpha=d?.6:1;c.fillStyle=d?'#8b93a7':col(t.tm);c.strokeStyle=sel?'#fff':'#0b0d12';c.lineWidth=sel?5:3;c.beginPath();c.arc(x,y,13,0,7);c.stroke();c.fill();c.globalAlpha=1;
    c.textAlign='center';c.fillStyle='#fff';c.strokeStyle='#0b0d12';c.lineWidth=3;
    if(d){c.font='16px sans-serif';c.textBaseline='middle';c.fillText('☠',x,y+1)}else{c.font='700 14px sans-serif';c.textBaseline='middle';c.strokeText(nu,x,y+1);c.fillText(nu,x,y+1)}
    c.textBaseline='alphabetic';if(showN){c.font='600 14px sans-serif';c.strokeText(t.n,x,y-20);c.fillText(t.n,x,y-20)}}
   c.restore()}
  function mqSet(on,snap){mq.on=on;mq.pick=mq.drag=null;stg.classList.toggle('mq',on);$$('mq').classList.toggle('on',on);
   if(on){play=false;$$('pp').textContent='▶';if(snap&&!D.board)mqSnap();const nb=$$('nmq');if(nb)nb.checked=true}else{const b=el.querySelector('#tl2 [data-tool=""]');if(b)b.click()}mqUi();bh()}
  $$('mq').onclick=()=>{mqSet(!mq.on,true);ndDis=false;noteAuto()};
  if(D.board){mq.on=true;stg.classList.add('mq');$$('mq').parentNode.style.display='none';mqUi();bh()}
  $$('mqa').onclick=()=>mqAdd(2);$$('mqb').onclick=()=>mqAdd(3);
  $$('mqr').onclick=()=>{if(confirm('Repor a maquete? Perdes as posições e as mortes atuais.'))mqSnap()};
  $$('mkp').onclick=e=>{const k=e.target.dataset.k,m=mqCur();if(k!==undefined&&m){m.kl.splice(+k,1);save();mqUi()}};
  // arrastar as cartas pela faixa colorida: muda a posição e, por isso, o número (T 0–4, CT 5–9)
  {let dg=null;const clr=()=>el.querySelectorAll('.pc.ov').forEach(x=>x.classList.remove('ov','ovb'));
   const cardAt=(e,tn)=>{const x=document.elementFromPoint(e.clientX,e.clientY),c2=x&&x.closest&&x.closest('.pc');return c2&&c2.dataset.tn===tn&&c2!==dg.card?c2:null};
   const onDown=e=>{const g=e.target.closest&&e.target.closest('.gp');if(!g)return;const card=g.closest('.pc');if(!card)return;e.preventDefault();dg={card,sid:card.dataset.s,tn:card.dataset.tn,over:null};plDrag=true;card.classList.add('drg');try{g.setPointerCapture(e.pointerId)}catch(x){}};
   const onMove=e=>{if(!dg)return;clr();const c2=cardAt(e,dg.tn);dg.over=c2;if(c2){const r=c2.getBoundingClientRect();dg.after=e.clientY>r.top+r.height/2;c2.classList.add('ov');c2.classList.toggle('ovb',dg.after)}};
   const onUp=e=>{if(!dg)return;const d=dg;dg=null;plDrag=false;clr();d.card.classList.remove('drg');
    if(d.over){const L=[...d.card.parentNode.children].map(c2=>c2.dataset.s).filter(s2=>s2!==d.sid),k=L.indexOf(d.over.dataset.s);L.splice(k+(d.after?1:0),0,d.sid);const ps=anno.pos||(anno.pos={});L.forEach((s2,n)=>{ps[s2]=n});save();lastI=-1}};
   for(const id of ['pl2','pl3']){const b=$$(id);b.addEventListener('pointerdown',onDown);b.addEventListener('pointermove',onMove);b.addEventListener('pointerup',onUp);b.addEventListener('pointercancel',onUp)}}
  let pan=null;
  const zmUi=()=>{const b=$$('zr');if(b)b.textContent=zm.k.toFixed(1).replace(/\.0$/,'')+'×';cv.style.cursor=zm.k>1?'grab':''};
  const zmClamp=()=>{if(zm.k<=1){zm.k=1;zm.x=zm.y=0}else{zm.x=Math.min(0,Math.max(S-S*zm.k,zm.x));zm.y=Math.min(0,Math.max(S-S*zm.k,zm.y))}};
  const zmAt=(px,py,f)=>{const k2=Math.min(8,Math.max(1,zm.k*f));zm.x=px-(px-zm.x)*(k2/zm.k);zm.y=py-(py-zm.y)*(k2/zm.k);zm.k=k2;zmClamp();zmUi()};
  cv.addEventListener('wheel',e=>{e.preventDefault();const b=cv.getBoundingClientRect();zmAt((e.clientX-b.left)/b.width*S,(e.clientY-b.top)/b.height*S,e.deltaY<0?1.2:1/1.2)},{passive:false});
  $$('zi').onclick=()=>zmAt(S/2,S/2,1.4);$$('zo').onclick=()=>zmAt(S/2,S/2,1/1.4);$$('zr').onclick=()=>{zm.k=1;zmClamp();zmUi()};
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
   if(showN){c.font='600 12px sans-serif';c.textBaseline='alphabetic';c.fillStyle='#c3c9d6';c.strokeStyle='#0b0d12';c.lineWidth=3;c.strokeText(d.user_name||'',x,y-20);c.fillText(d.user_name||'',x,y-20)}c.restore()}}
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
