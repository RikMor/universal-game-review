// Aplicação: rotas (#jogo/#projeto), biblioteca local (IndexedDB), leitor de vídeo e marcadores.

const GAMES=[
 {id:'cs2',name:'Counter-Strike 2',short:'CS2',genre:'FPS tático',c1:'#f08c00',c2:'#c2410c',fmt:'.dem (Source 2)',demo:'wip',desc:'Revê rondas, posicionamento, utilitários e duelos.'},
 {id:'deadlock',name:'Deadlock',short:'DL',genre:'Hero shooter / MOBA',c1:'#7c3aed',c2:'#312e81',fmt:'.dem (Source 2)',demo:'wip',desc:'Analisa lanes, rotações, itens e team fights.'},
 {id:'soon',name:'Mais jogos',short:'+',genre:'Em breve',c1:'#475569',c2:'#1e293b',off:1,desc:'Dota 2, LoL, Valorant, Rocket League…'}
];
let db;
function open(){return new Promise((res,rej)=>{try{const r=indexedDB.open('ugr',1);r.onupgradeneeded=()=>r.result.createObjectStore('p',{keyPath:'id'});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}catch(e){rej(e)}})}
const tx=(m,f)=>new Promise((res,rej)=>{const t=db.transaction('p',m),s=t.objectStore('p'),q=f(s);t.oncomplete=()=>res(q&&q.result);t.onerror=()=>rej(t.error)});
const all=()=>tx('readonly',s=>s.getAll()).then(a=>a||[]);
const put=p=>tx('readwrite',s=>s.put(p));
const del=id=>tx('readwrite',s=>s.delete(id));
const $=document.getElementById('app');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=t=>{t=Math.floor(t);return Math.floor(t/60)+':'+String(t%60).padStart(2,'0')};
let url;

function home(){
 $.innerHTML=`<h1>Escolhe um jogo</h1><p class="mut">Importa partidas, analisa momento a momento e guarda as tuas sessões de treino.</p>
 <div class="grid" style="margin-top:22px">${GAMES.map(g=>`<div class="card ${g.off?'off':''}" style="--gc:${g.c1}" ${g.off?'':`onclick="location.hash='${g.id}'"`}>
 <div class="cover" style="--c1:${g.c1};--c2:${g.c2}">${g.short}</div>
 <div class="body"><h3>${g.name}</h3><div class="mut">${g.desc}</div>
 <span class="tag">${g.genre}</span>${g.off?'':`<span class="tag ok">Vídeo</span><span class="tag wip">Demo .dem · beta</span>`}</div></div>`).join('')}</div>
 <div class="note"><b>Sobre as demos 3D.</b> As demos <code>.dem</code> do CS2 são lidas localmente no navegador e mostradas num radar 2D (beta). A vista 3D e o Deadlock vêm a seguir. Gravações em vídeo funcionam em qualquer jogo.</div>`;
}

async function game(id){
 const g=GAMES.find(x=>x.id===id);if(!g)return home();
 let ps=[];try{ps=(await all()).filter(p=>p.game===id).sort((a,b)=>b.created-a.created)}catch(e){}
 $.innerHTML=`<span class="crumb" onclick="location.hash=''">← Jogos</span><h1>${g.name}</h1><p class="mut">Projetos e sessões de treino</p>
 <div class="row" style="margin:18px 0"><input type="text" id="nm" placeholder="Nome do projeto (ex.: Mirage vs Team X)"><button onclick="create('${id}')">Novo projeto</button></div>
 ${ps.length?ps.map(p=>`<div class="proj" onclick="location.hash='${id}/${p.id}'"><div style="font-size:26px">${p.blob?'🎞️':'📁'}</div><div class="n"><div>${esc(p.name)}</div><div class="mut" style="font-size:13px">${p.fileName?esc(p.fileName):'Sem ficheiro'} · ${p.markers.length} marcadores · ${new Date(p.created).toLocaleDateString('pt-PT')}</div></div><button class="ghost" onclick="event.stopPropagation();rm('${id}','${p.id}')">Apagar</button></div>`).join(''):`<div class="note">Ainda não tens projetos de ${g.name}. Cria o primeiro acima.</div>`}`;
}
async function create(g){const n=document.getElementById('nm').value.trim();if(!n)return;const id=Date.now().toString(36);try{await put({id,game:g,name:n,created:Date.now(),markers:[]})}catch(e){alert('Armazenamento local indisponível.')}location.hash=g+'/'+id}
async function rm(g,id){if(confirm('Apagar este projeto?')){await del(id);game(g)}}

async function proj(gid,pid){
 const g=GAMES.find(x=>x.id===gid);let p;try{p=(await all()).find(x=>x.id===pid)}catch(e){}
 if(!p)return game(gid);
 if(url){URL.revokeObjectURL(url);url=null}
 const save=()=>put(p);
 const isVid=p.blob&&(p.blob.type.startsWith('video')||/\.(mp4|webm|mkv|mov)$/i.test(p.fileName||''));
 if(isVid)url=URL.createObjectURL(p.blob);
 $.innerHTML=`<span class="crumb" onclick="location.hash='${gid}'">← ${g.name}</span><h1>${esc(p.name)}</h1>
 ${!p.blob?`<div class="note">Importa uma gravação (mp4/webm) para começar a analisar.<br><br><input type="file" id="f" accept="video/*,.dem" style="display:none"><button onclick="document.getElementById('f').click()">Importar ficheiro</button></div>`:
 !isVid?`<div id="dv"><div class="note"><b>${esc(p.fileName)}</b> guardado (formato sem leitor).</div></div>`:
 `<div class="player"><div><video id="v" src="${url}" controls></video><div class="tl" id="tl"></div>
 <div class="row" style="margin-top:12px"><button class="ghost" id="sp">Velocidade 1×</button><button class="ghost" onclick="v.currentTime-=5">−5s</button><button class="ghost" onclick="v.currentTime+=5">+5s</button></div></div>
 <div class="side"><div class="row"><input type="text" id="mt" placeholder="Nota neste instante" style="flex:1"><button id="ad">+</button></div><div id="ml" style="margin-top:12px"></div></div></div>`}`;
 const f=document.getElementById('f');
 if(f)f.onchange=async()=>{const x=f.files[0];if(!x)return;p.blob=x;p.fileName=x.name;try{await save()}catch(e){alert('Não foi possível guardar o ficheiro.')}proj(gid,pid)};
 if(!isVid){if(/\.dem$/i.test(p.fileName||''))demoView(p,document.getElementById('dv'));return}
 const v=document.getElementById('v'),ml=document.getElementById('ml'),tl=document.getElementById('tl');
 const draw=()=>{p.markers.sort((a,b)=>a.t-b.t);ml.innerHTML=p.markers.length?p.markers.map((m,i)=>`<div class="mk" data-i="${i}"><time>${fmt(m.t)}</time><span>${esc(m.text)}</span><u data-d="${i}">✕</u></div>`).join(''):'<div class="mut">Sem marcadores.</div>';
  const d=v.duration||0;tl.innerHTML=d?p.markers.map(m=>`<i style="left:calc(${m.t/d*100}% - 2px)" data-t="${m.t}"></i>`).join(''):''};
 v.onloadedmetadata=draw;draw();
 const add=async()=>{const i=document.getElementById('mt');p.markers.push({t:v.currentTime,text:i.value.trim()||'Marcador'});i.value='';await save();draw()};
 document.getElementById('ad').onclick=add;document.getElementById('mt').onkeydown=e=>{if(e.key==='Enter')add()};
 ml.onclick=async e=>{const d=e.target.dataset.d;if(d!==undefined){p.markers.splice(+d,1);await save();return draw()}const r=e.target.closest('.mk');if(r){v.currentTime=p.markers[+r.dataset.i].t;v.play()}};
 tl.onclick=e=>{if(e.target.dataset.t)v.currentTime=+e.target.dataset.t};
 const sp=document.getElementById('sp'),S=[1,.5,.25,2];let si=0;sp.onclick=()=>{si=(si+1)%S.length;v.playbackRate=S[si];sp.textContent='Velocidade '+S[si]+'×'}
}

function route(){$.style.maxWidth='';const [g,p]=location.hash.slice(1).split('/');if(!g)home();else if(!p)game(g);else proj(g,p)}
addEventListener('hashchange',route);
open().then(d=>{db=d}).catch(()=>{}).finally(route);
