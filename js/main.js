"use strict";

let cards = [];
let currentCard = 0;
let dailyProgress = 0;
let dailyFinished = false;
let mode = "study";
let quizState = null;
const K = window.Kamizuki;

document.addEventListener("DOMContentLoaded", () => {
  refreshDailyBadge();
  refreshTopExp();
});

async function startLesson() {
  mode = "study";
  try {
    await ensureCards();
    loadDailyProgress();
    if (dailyProgress >= K.settings().dailyGoal) {
      dailyFinished = true;
      showDailyComplete();
      return;
    }
    currentCard = chooseBestCardIndex();
    showCard();
  } catch (err) {
    console.error(err);
    showLoadError();
  }
}

async function startListeningQuiz() {
  mode = "listen";
  try {
    await ensureCards();
    const unlocked = cards.filter(c => c.unlocked);
    if (unlocked.length < 2) {
      K.toast("先学习至少 2 张假名卡，再开始听音辨字。");
      return;
    }
    quizState = { number:1, total:5, correct:0, answered:false, target:null, options:[] };
    renderListeningQuestion();
  } catch (err) {
    console.error(err);
    showLoadError();
  }
}

async function ensureCards() {
  if (!cards.length) cards = await K.loadCards("data/cards.json");
}

function loadDailyProgress() {
  dailyProgress = Number(localStorage.getItem(K.dailyKey()) || 0);
  refreshDailyBadge();
}

function refreshDailyBadge() {
  const goal = K.settings().dailyGoal;
  dailyProgress = Number(localStorage.getItem(K.dailyKey()) || 0);
  const el = document.getElementById("study-progress");
  if (el) el.textContent = `${Math.min(dailyProgress,goal)} / ${goal}`;
}

function refreshTopExp() {
  const s = K.getStats();
  const exp = Number(s.exp)||0;
  const levelExp = exp % 100;
  document.getElementById("top-exp-text")?.replaceChildren(document.createTextNode(`总经验 ${exp} · 下一等级 ${levelExp} / 100`));
  const bar = document.getElementById("top-exp-value");
  if (bar) bar.style.width = `${levelExp}%`;
}

function chooseBestCardIndex() {
  const candidates = cards.map((card,index)=>({card,index})).filter(x=>x.card.unlocked);
  if (!candidates.length) return 0;
  let best = candidates[0], bestScore = -Infinity;
  for (const item of candidates) {
    const s = item.card.study || {};
    const seen = Number(s.seen||0), correct = Number(s.correct||0), wrong = Number(s.wrong||0), mastery = Number(s.mastery||0);
    let score = (seen===0?80:0) + wrong*35 + (100-mastery)*0.4 - correct*5 + Math.random()*3;
    if (score > bestScore) { bestScore = score; best = item; }
  }
  return best.index;
}

function showCard() {
  mode = "study";
  const card = cards[currentCard];
  if (!card) return;
  const lesson = document.getElementById("lesson-area");
  lesson.innerHTML = `
    <article class="flip-card" id="flip-card" tabindex="0" aria-label="${esc(card.hiragana)} 学习卡">
      <div class="flip-inner">
        <section class="flip-front">
          <div class="card-decoration">${esc(card.group)} · KANA</div>
          <div class="card-main-kana">${esc(card.hiragana)}</div>
          <div class="tap-tip">点击卡片查看答案</div>
        </section>
        <section class="flip-back">
          <div class="card-decoration">${esc(card.group)} · ANSWER</div>
          <div class="card-katakana">${esc(card.katakana)}</div>
          <div class="card-romaji">${esc(card.roma)}</div>
          <div class="divider"></div>
          <div class="word-area"><div><strong>${esc(card.word)}</strong></div><div>${esc(card.meaning)}</div></div>
          <div class="audio-practice-row">
            <button type="button" class="audio-practice-button" data-speak="${attr(card.hiragana)}">🔊 假名 <span>${esc(card.hiragana)}</span></button>
            <button type="button" class="audio-practice-button" data-speak="${attr(card.word||card.hiragana)}">🔊 例词 <span>${esc(card.word||card.hiragana)}</span></button>
          </div>
          <div class="study-actions">
            <button type="button" class="study-action retry" id="retry-card">再来一次</button>
            <button type="button" class="study-action remember" id="remember-card">记住了 +10 EXP</button>
          </div>
          <div class="card-level">Lv.${Number(card.level||1)} · EXP ${Number(card.exp||0)}/100</div>
        </section>
      </div>
    </article>
  `;

  const flip = document.getElementById("flip-card");
  flip.addEventListener("click", e => { if (!e.target.closest("button")) flip.classList.toggle("flipped"); });
  flip.addEventListener("keydown", e => {
    if (e.key==="Enter" || e.key===" ") { e.preventDefault(); flip.classList.toggle("flipped"); }
  });
  lesson.querySelectorAll("[data-speak]").forEach(btn => btn.addEventListener("click", e => { e.stopPropagation(); K.speak(btn.dataset.speak); }));
  document.getElementById("remember-card").addEventListener("click", e => { e.stopPropagation(); rememberCard(); });
  document.getElementById("retry-card").addEventListener("click", e => { e.stopPropagation(); againCard(); });

  updateAyanoDialogue(card);
  updateLearningTips(card);
  updateButtons();
  if (K.settings().autoPlay) setTimeout(()=>K.speak(card.hiragana),120);
}

function previousCard() {
  if (!cards.length || mode!=="study") return;
  const prev = findUnlockedIndex(currentCard-1,-1);
  if (prev!==-1) { currentCard=prev; showCard(); }
}
function nextCard() {
  if (!cards.length || mode!=="study") return;
  const next = findUnlockedIndex(currentCard+1,1);
  if (next!==-1) { currentCard=next; showCard(); }
}
function findUnlockedIndex(start,dir) {
  for (let i=start;i>=0&&i<cards.length;i+=dir) if (cards[i].unlocked) return i;
  return -1;
}
function updateButtons() {
  const p=document.getElementById("previous-button"), n=document.getElementById("next-button");
  if (!p||!n) return;
  if (mode!=="study") { p.disabled=true; n.disabled=true; return; }
  p.disabled=findUnlockedIndex(currentCard-1,-1)===-1;
  n.disabled=findUnlockedIndex(currentCard+1,1)===-1;
}

function rememberCard() {
  if (dailyFinished) return;
  const card=cards[currentCard], s=card.study ||= {};
  s.seen=Number(s.seen||0)+1; s.correct=Number(s.correct||0)+1;
  card.exp=Number(card.exp||0)+10;
  while (card.exp>=100) { card.exp-=100; card.level=Number(card.level||1)+1; }
  recalcMastery(card); unlockNextCard(currentCard); K.saveCards(cards);
  K.addStats({studyActions:1,correct:1,exp:10}); completeOneDailyStep(); refreshTopExp();
  K.toast("记住了 · +10 EXP");
  if (!dailyFinished) setTimeout(()=>{ currentCard=chooseBestCardIndex(); showCard(); },420);
}

function againCard() {
  if (dailyFinished) return;
  const card=cards[currentCard], s=card.study ||= {};
  s.seen=Number(s.seen||0)+1; s.wrong=Number(s.wrong||0)+1;
  recalcMastery(card); K.saveCards(cards);
  K.addStats({studyActions:1,wrong:1}); completeOneDailyStep();
  K.toast("已加入复习优先队列");
  if (!dailyFinished) setTimeout(()=>{ currentCard=chooseBestCardIndex(); showCard(); },420);
}

function recalcMastery(card) {
  const s=card.study ||= {}, c=Number(s.correct||0), w=Number(s.wrong||0), total=c+w;
  s.mastery=total?Math.max(0,Math.min(100,Math.round(c/total*100))):0;
}
function unlockNextCard(index) { if (cards[index+1]) cards[index+1].unlocked=true; }

function completeOneDailyStep() {
  const goal=K.settings().dailyGoal;
  dailyProgress=Math.min(goal,Number(localStorage.getItem(K.dailyKey())||0)+1);
  localStorage.setItem(K.dailyKey(),String(dailyProgress));
  refreshDailyBadge();
  if (dailyProgress>=goal) { dailyFinished=true; setTimeout(showDailyComplete,450); }
}

function showDailyComplete() {
  mode="complete"; updateButtons();
  document.getElementById("lesson-area").innerHTML=`
    <section class="complete-panel">
      <div class="complete-mark">✓</div><h2>今日学习完成</h2>
      <p>今天的基础任务已经完成。可以继续做听音辨字，或者明天再来。</p>
      <div class="start-actions">
        <button type="button" class="start-button secondary" id="complete-listen">🎧 听音辨字</button>
        <button type="button" class="start-button secondary" id="complete-collection">🎴 查看收藏</button>
      </div>
    </section>`;
  document.getElementById("complete-listen").addEventListener("click",startListeningQuiz);
  document.getElementById("complete-collection").addEventListener("click",()=>location.href="pages/collection.html");
  setAyano("今日もよく頑張りました。","今天完成得很好。短时、重复、稳定，比一次塞很多内容更有效。");
}

function renderListeningQuestion() {
  mode="listen"; updateButtons();
  const unlocked=cards.filter(c=>c.unlocked);
  const target=unlocked[Math.floor(Math.random()*unlocked.length)];
  const pool=cards.filter(c=>c.id!==target.id); shuffle(pool);
  const options=[target,...pool.slice(0,3)]; shuffle(options);
  quizState.target=target; quizState.options=options; quizState.answered=false;

  document.getElementById("lesson-area").innerHTML=`
    <section class="listening-panel">
      <div class="quiz-kicker">LISTENING ${quizState.number} / ${quizState.total}</div>
      <h2>听音辨字</h2><p>先听声音，再选择你听到的平假名。</p>
      <button type="button" class="listen-main-button" id="play-target">🔊 播放声音</button>
      <div class="listen-options">${options.map(c=>`<button type="button" class="listen-option" data-id="${attr(c.id)}">${esc(c.hiragana)}</button>`).join("")}</div>
      <div class="quiz-feedback" id="quiz-feedback" aria-live="polite"></div>
      <button type="button" class="quiz-exit" id="quiz-exit">返回学习</button>
    </section>`;
  document.getElementById("play-target").addEventListener("click",()=>K.speak(target.hiragana));
  document.querySelectorAll(".listen-option").forEach(btn=>btn.addEventListener("click",()=>answerListening(btn.dataset.id)));
  document.getElementById("quiz-exit").addEventListener("click",()=>{ mode="study"; currentCard=chooseBestCardIndex(); showCard(); });
  setAyano("音だけで分かるかな？","不要看答案，先让耳朵建立声音和假名之间的连接。");
  setTimeout(()=>K.speak(target.hiragana),180);
}

function answerListening(id) {
  if (!quizState || quizState.answered) return;
  quizState.answered=true;
  const correct=id===quizState.target.id;
  if (correct) quizState.correct+=1;
  K.addStats({listeningTotal:1,listeningCorrect:correct?1:0,exp:correct?5:0}); refreshTopExp();

  document.querySelectorAll(".listen-option").forEach(btn=>{
    btn.disabled=true;
    if (btn.dataset.id===quizState.target.id) btn.classList.add("correct");
    else if (btn.dataset.id===id && !correct) btn.classList.add("wrong");
  });

  const feedback=document.getElementById("quiz-feedback");
  feedback.innerHTML=correct?`✓ 正确：${esc(quizState.target.hiragana)} · ${esc(quizState.target.roma)}`:`答案是：<strong>${esc(quizState.target.hiragana)}</strong> · ${esc(quizState.target.roma)}`;
  const next=document.createElement("button");
  next.type="button"; next.className="study-action remember quiz-next";
  next.textContent=quizState.number>=quizState.total?"查看结果":"下一题";
  next.addEventListener("click",()=>{
    if (quizState.number>=quizState.total) showListeningResult();
    else { quizState.number+=1; renderListeningQuestion(); }
  });
  feedback.appendChild(next);
}

function showListeningResult() {
  document.getElementById("lesson-area").innerHTML=`
    <section class="complete-panel">
      <div class="complete-mark">🎧</div><h2>听音练习完成</h2>
      <p>本轮 ${quizState.correct} / ${quizState.total}。</p>
      <div class="start-actions">
        <button type="button" class="start-button" id="listen-again">再做一轮</button>
        <button type="button" class="start-button secondary" id="listen-back">返回学习</button>
      </div>
    </section>`;
  document.getElementById("listen-again").addEventListener("click",startListeningQuiz);
  document.getElementById("listen-back").addEventListener("click",()=>{ mode="study"; currentCard=chooseBestCardIndex(); showCard(); });
  setAyano("耳が少しずつ慣れてきます。",`这一轮答对 ${quizState.correct} 题。听力识别靠重复建立，不需要一次满分。`);
}

function updateAyanoDialogue(card) {
  const custom={
    kana_001:["今日は「あ」から始めましょう！","今天从「あ」开始。先把声音和字形连起来。"],
    kana_002:["次は「い」です。","「い」很常见。看到它时先直接想到声音 i。"],
    kana_003:["「う」を声に出してみましょう。","试着读一次「う」，注意不要把嘴唇收得太圆。"],
    kana_004:["「え」もゆっくり覚えましょう。","「え」先记住声音，再看例词「えき」。"],
    kana_005:["「お」まで来ましたね。","到「お」了。あ行很快就会形成整体感觉。"]
  };
  const [jp,cn]=custom[card.id]||[`今日は「${card.hiragana}」を覚えましょう。`,`今天练「${card.hiragana}」。先听、再看字形，最后用例词「${card.word}」固定记忆。`];
  setAyano(jp,cn);
}

function setAyano(jp,cn) {
  const a=document.getElementById("ayano-jp-text"), b=document.getElementById("ayano-cn-text");
  if (a) a.textContent=jp; if (b) b.textContent=cn;
}

function updateLearningTips(card) {
  const origin=card.origin?.note||"这一张暂不显示字源结论，避免把记忆联想误当成历史字源。";
  document.getElementById("tip-origin").textContent=origin;
  document.getElementById("tip-keyword").innerHTML=`<strong>关键词：</strong>${esc(card.memory?.keyword||"结合例词记忆。")}`;
  document.getElementById("tip-shape").innerHTML=`<strong>字形：</strong>${esc(card.memory?.shape||"观察整体轮廓。")}`;
  document.getElementById("tip-pronunciation").textContent=card.pronunciation?.tip||"听一次，模仿一次。";
  document.getElementById("tip-example").innerHTML=`<strong>${esc(card.word)}</strong> · ${esc(card.meaning)}`;
}

function showLoadError() {
  document.getElementById("lesson-area").innerHTML=`<section class="complete-panel"><h2>无法读取学习数据</h2><p>请用 VS Code Live Server 打开，或部署到 GitHub Pages 后访问。</p></section>`;
}
function shuffle(arr){ for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];} return arr; }
function esc(v){ return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;"); }
function attr(v){ return esc(v).replaceAll("'","&#39;"); }

window.startLesson=startLesson;
window.startListeningQuiz=startListeningQuiz;
window.previousCard=previousCard;
window.nextCard=nextCard;
