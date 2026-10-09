(()=>{
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const blank={name:"",xp:0,quizzes:0,correct:0,answered:0,best:0,ach:[]};
let P={...blank,...load("cq_player",{})},S=load("cq_scores",[]),Q=null,timer=null;
const level=()=>Math.floor(P.xp/100)+1,acc=()=>P.answered?Math.round(P.correct/P.answered*100):0;
const commit=()=>{save("cq_player",P);save("cq_scores",S)};
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("on");setTimeout(()=>t.classList.remove("on"),2600)}
const ACH={first:["First Quest","Finish a quiz"],perfect:["Perfect Round","Answer every question correctly"],fire:["On Fire","Get a 5-answer streak"],lvl3:["Level 3","Reach level 3"]};

/* routing */
let boardTimer;function route(){clearInterval(boardTimer);
  const v=(location.hash||"#home").slice(1);const view=$("#"+v)?v:"home";
  if(view!=="play"&&Q){clearInterval(timer);Q=null}
  $$(".view").forEach(e=>e.classList.toggle("on",e.id===view));
  $$("#links a").forEach(a=>a.classList.toggle("on",a.dataset.view===view));
  ({home:renderStats,play:renderSetup,challenges:renderChallenges,leaderboard:renderBoard,about(){}})[view]();
  window.scrollTo(0,0);
}
window.addEventListener("hashchange",route);

/* home */
function renderStats(){
  const players=new Set(S.map(s=>s.name)).size;
  $("#stats").innerHTML=[[10,"Challenges to play"],[P.answered,"Questions you answered"],[CATEGORIES.length,"Programming topics"],[players,"Players on this device"]].map(([n,l])=>`<div class="stat"><b data-n="${n}">0</b><span>${l}</span></div>`).join("");
  count();
}
function count(){$$("[data-n]").forEach(e=>{const to=+e.dataset.n,t0=performance.now();(function f(t){const p=Math.min(1,(t-t0)/800);e.textContent=Math.round(to*p);if(p<1)requestAnimationFrame(f)})(t0)})}

/* challenges */
function renderChallenges(){
  const cards=[`<article class="card"><p class="eyebrow">[ MODE_01 ]</p><div class="ic">⚔</div><h3>Mixed Quest</h3><p>10 random questions, 20 seconds each.</p><p><br><button class="btn primary" data-start="mixed">Start</button></p></article>`,
  `<article class="card"><p class="eyebrow">[ MODE_02 ]</p><div class="ic">⚡</div><h3>Speed Round</h3><p>10 random questions, only 10 seconds each.</p><p><br><button class="btn primary" data-start="speed">Start</button></p></article>`];
  CATEGORIES.forEach((c,i)=>cards.push(`<article class="card"><p class="eyebrow">[ TOPIC_${String(i+1).padStart(2,"0")} ]</p><div class="ic">${i+1}</div><h3>${c}</h3><p>${QUESTIONS.filter(q=>q.cat===i).length} questions, 20 seconds each.</p><p><br><button class="btn" data-start="cat" data-cat="${i}">Start</button></p></article>`));
  $("#challengeGrid").innerHTML=cards.join("");
}
document.addEventListener("click",e=>{const b=e.target.closest("[data-start]");if(b)start(b.dataset.start,+b.dataset.cat)});

/* setup / profile */
function renderSetup(){
  clearInterval(timer);Q=null;
  const next=P.xp%100;
  $("#playBody").innerHTML=`
  <h1 class="h1s">Player profile</h1>
  <div class="panel">
    <label for="nm">Display name</label><br>
    <div class="row" style="margin-top:8px"><input type="text" id="nm" maxlength="20" placeholder="Enter your name" value="${esc(P.name)}"><button class="btn primary" id="saveName">${P.name?"Change name":"Save name"}</button></div>
    ${P.name?`<div class="profile">
      <div><b>${esc(P.name)}</b><small>Player</small></div><div><b>${P.xp}</b><small>Total XP</small></div><div><b>${P.quizzes}</b><small>Quizzes completed</small></div><div><b>${P.correct}</b><small>Correct answers</small></div>
      <div><b>${acc()}%</b><small>Accuracy</small></div><div><b>${P.best}</b><small>Best score</small></div><div><b>Level ${level()}</b><small>Current level</small></div>
      <div><div class="bar"><i style="width:${next}%"></i></div><small>${100-next} XP to next level</small></div></div>
    <div class="badges">${Object.entries(ACH).map(([k,[n,d]])=>`<span class="ach ${P.ach.includes(k)?"got":""}" title="${d}">${P.ach.includes(k)?"★ ":""}${n}</span>`).join("")}</div>`:`<p class="note">Enter a name to start. No email or password needed.</p>`}
  </div>
  <h2 style="margin-top:30px">Choose your quest</h2>
  <div class="row"><button class="btn primary big" data-start="mixed">Mixed Quest</button><button class="btn big" data-start="speed">Speed Round</button><a class="btn ghost big" href="#challenges">Pick a topic</a></div>`;
  $("#saveName").onclick=saveName;$("#nm").onkeydown=e=>{if(e.key==="Enter")saveName()};
}
function saveName(){
  const v=$("#nm").value.trim().slice(0,20);
  if(!v){toast("Type a display name first.");return}
  P.name=v;commit();toast("Name saved: "+v);renderSetup();
}

/* quiz */
function start(mode,cat){
  if(!P.name){location.hash="play";if(location.hash==="#play")renderSetup();toast("Enter a display name to start.");return}
  let qs,sec=20;
  if(mode==="cat")qs=shuffle(QUESTIONS.filter(q=>q.cat===cat));else qs=shuffle(QUESTIONS).slice(0,10);
  if(mode==="speed")sec=10;
  qs=qs.map(q=>{const order=shuffle(q.opts.map((_,i)=>i));return{...q,order,right:order.indexOf(q.ans)}});
  Q={mode,cat,qs,sec,i:0,score:0,correct:0,streak:0,best:0,left:sec,done:false,newAch:[]};
  if(location.hash!=="#play")location.hash="play";else $$(".view").forEach(e=>e.classList.toggle("on",e.id==="play"));
  showQ();
}
function showQ(){
  const q=Q.qs[Q.i];Q.done=false;Q.left=Q.sec;
  const title=Q.mode==="cat"?CATEGORIES[Q.cat]:Q.mode==="speed"?"Speed Round":"Mixed Quest";
  $("#playBody").innerHTML=`<div class="panel">
   <div class="qhead"><span>${title} · ${Q.i+1}/${Q.qs.length}</span><span>Score ${Q.score}</span><span>Streak ${Q.streak}</span><span class="timer" id="tm">${Q.sec}</span></div>
   <div class="bar"><i style="width:${Q.i/Q.qs.length*100}%"></i></div>
   <p style="margin:14px 0 0"><span class="badge">${CATEGORIES[q.cat]}</span><span class="badge ${q.diff}">${q.diff}</span><span class="badge">${q.pts} pts</span></p>
   <p class="q">${esc(q.q)}</p>
   ${q.code?`<div class="code"><div class="dots"><i></i><i></i><i></i><span>main.c</span></div><pre><code>${esc(q.code)}</code></pre></div>`:""}
   <div class="opts">${q.order.map((o,k)=>`<button class="opt" data-k="${k}"><kbd>${"ABCD"[k]}</kbd>${esc(q.opts[o])}</button>`).join("")}</div>
   <div id="fb"></div></div>`;
  $$(".opt").forEach(b=>b.onclick=()=>answer(+b.dataset.k));
  clearInterval(timer);const t0=Date.now();
  timer=setInterval(()=>{Q.left=Math.max(0,Q.sec-(Date.now()-t0)/1000);const tm=$("#tm");if(!tm)return;tm.textContent=Math.ceil(Q.left);tm.classList.toggle("low",Q.left<=5);if(Q.left<=0)answer(-1)},100);
}
function answer(k){
  if(!Q||Q.done)return;Q.done=true;clearInterval(timer);
  const q=Q.qs[Q.i],ok=k===q.right;P.answered++;
  if(ok){const bonus=Math.floor(Q.left/Q.sec*10);Q.score+=q.pts+bonus;Q.correct++;Q.streak++;Q.best=Math.max(Q.best,Q.streak);P.correct++}else Q.streak=0;
  $$(".opt").forEach((b,i)=>{b.disabled=true;if(i===q.right)b.classList.add("right");else if(i===k)b.classList.add("wrong")});
  const last=Q.i===Q.qs.length-1;
  $("#fb").innerHTML=`<div class="expl"><b>${ok?"Correct!":k<0?"Time is up.":"Not quite."}</b> ${esc(q.exp)}</div><p><button class="btn primary" id="nx">${last?"See results":"Next question"}</button></p>`;
  $("#nx").focus();$("#nx").onclick=()=>{Q.i++;last?finish():showQ()};
}
function finish(){
  const n=Q.qs.length,oldLvl=level();
  P.xp+=Q.score;P.quizzes++;P.best=Math.max(P.best,Q.score);
  const entry={name:P.name,score:Q.score,correct:Q.correct,total:n,mode:Q.mode==="cat"?CATEGORIES[Q.cat]:Q.mode==="speed"?"Speed Round":"Mixed Quest",date:new Date().toLocaleDateString()};S.push(entry);pushScore(entry);
  S.sort((a,b)=>b.score-a.score);S=S.slice(0,100);
  const give=k=>{if(!P.ach.includes(k)){P.ach.push(k);Q.newAch.push(ACH[k][0])}};
  give("first");if(Q.correct===n)give("perfect");if(Q.best>=5)give("fire");if(level()>=3)give("lvl3");
  commit();
  $("#playBody").innerHTML=`<div class="panel result"><p class="tag">Quest complete</p><div class="big" id="sc">0</div><p class="lead" style="margin:auto">${Q.correct} of ${n} correct · ${Math.round(Q.correct/n*100)}% accuracy · longest streak ${Q.best}</p>
   <p>+${Q.score} XP · Level ${level()}${level()>oldLvl?" — level up!":""}</p>
   ${Q.newAch.length?`<div class="badges" style="justify-content:center">${Q.newAch.map(a=>`<span class="ach got">★ ${a} unlocked</span>`).join("")}</div>`:""}
   <div class="row" style="justify-content:center"><button class="btn primary" id="again">Play again</button><a class="btn" href="#leaderboard">View leaderboard</a><button class="btn ghost" id="prof">Profile</button></div></div>`;
  const to=Q.score,t0=performance.now(),m=Q.mode,c=Q.cat;
  (function f(t){const p=Math.min(1,(t-t0)/1000);const e=$("#sc");if(e)e.textContent=Math.round(to*p);if(p<1)requestAnimationFrame(f)})(t0);
  $("#again").onclick=()=>start(m,c);$("#prof").onclick=renderSetup;Q=null;
}

/* shared leaderboard (Supabase REST, no library needed) */
const CFG=window.RQ_CONFIG||{},cloudOn=()=>!!(CFG.SUPABASE_URL&&CFG.SUPABASE_ANON_KEY);
const hdr=()=>({apikey:CFG.SUPABASE_ANON_KEY,Authorization:"Bearer "+CFG.SUPABASE_ANON_KEY,"Content-Type":"application/json"});
async function pushScore(e){
  if(!cloudOn())return;
  try{const r=await fetch(CFG.SUPABASE_URL.replace(/\/$/,"")+"/rest/v1/scores",{method:"POST",headers:{...hdr(),Prefer:"return=minimal"},body:JSON.stringify({name:e.name,score:e.score,correct:e.correct,total:e.total,mode:e.mode})});
    if(!r.ok)throw 0;toast("Score added to the shared leaderboard.")}
  catch{toast("Could not reach the shared leaderboard. Your score is saved on this device.")}
}
/* leaderboard / reset */
const rowsHtml=rows=>rows.length?`<table><thead><tr><th>Rank</th><th>Player</th><th>Mode</th><th>Correct</th><th>Score</th><th>Date</th></tr></thead><tbody>${rows.map((s,i)=>`<tr><td>${i+1}</td><td>${esc(s.name)}</td><td>${esc(s.mode)}</td><td>${s.correct}/${s.total}</td><td><b>${s.score}</b></td><td>${esc(s.date||new Date(s.created_at).toLocaleDateString())}</td></tr>`).join("")}</tbody></table>`:`<div class="panel">No scores yet. <a href="#play" style="color:var(--cy)">Play a quiz</a> to take the first place.</div>`;
async function renderBoard(){
  const on=cloudOn();
  $("#boardLead").textContent=on?"Top 10 scores from all players. Updates every 10 seconds.":"Top 10 runs saved on this computer. Scores stay in this browser only.";
  $("#clearBoard").style.display=on?"none":"";
  if(!on){$("#board").innerHTML=rowsHtml(S.slice(0,10));return}
  const draw=async()=>{try{const r=await fetch(CFG.SUPABASE_URL.replace(/\/$/,"")+"/rest/v1/scores?select=name,score,correct,total,mode,created_at&order=score.desc,created_at.asc&limit=10",{headers:hdr()});if(!r.ok)throw 0;const rows=await r.json();if(location.hash==="#leaderboard")$("#board").innerHTML=rowsHtml(rows)}catch{$("#board").innerHTML='<div class="panel">Could not load the shared leaderboard. Check the internet connection.</div>'}};
  $("#board").innerHTML='<div class="panel">Loading…</div>';await draw();boardTimer=setInterval(draw,10000);
}
$("#clearBoard").onclick=()=>{if(confirm("Clear all leaderboard scores?")){S=[];commit();renderBoard();toast("Leaderboard cleared.")}};
$("#resetAll").onclick=()=>{if(confirm("Erase your profile, XP, and all scores on this browser?")){P={...blank};S=[];commit();toast("All data erased.");location.hash="home"}};
route();
})();
