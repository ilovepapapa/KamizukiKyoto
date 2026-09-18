"use strict";
document.addEventListener("DOMContentLoaded",async()=>{
  const id=new URLSearchParams(location.search).get("id");
  const root=document.getElementById("card-detail-root");
  try{
    const cards=await Kamizuki.loadCards("../data/cards.json");
    const card=cards.find(c=>c.id===id)||cards[0], study=card.study||{};
    root.innerHTML=`
      <section class="detail-card">
        <div class="detail-kicker">${esc(card.group)}</div>
        <div class="detail-kana">${esc(card.hiragana)}</div>
        <div class="detail-katakana">${esc(card.katakana)}</div>
        <div class="detail-roma">${esc(card.roma)}</div>
        <div class="detail-audio">
          <button type="button" data-speak="${esc(card.hiragana)}">🔊 假名发音</button>
          <button type="button" data-speak="${esc(card.word)}">🔊 例词发音</button>
        </div>
        <div class="detail-grid">
          <article><h3>字源</h3><p>${esc(card.origin?.note||"这张卡暂不显示未经核实的字源结论。")}</p></article>
          <article><h3>记忆关键词</h3><p>${esc(card.memory?.keyword||"")}</p></article>
          <article><h3>字形联想</h3><p>${esc(card.memory?.shape||"")}</p></article>
          <article><h3>发音</h3><p>${esc(card.pronunciation?.tip||"")}</p></article>
          <article><h3>例词</h3><p><strong>${esc(card.word)}</strong> · ${esc(card.meaning)}</p></article>
          <article><h3>学习记录</h3><p>见过 ${Number(study.seen||0)} 次 · 记住 ${Number(study.correct||0)} 次 · 再来 ${Number(study.wrong||0)} 次</p></article>
        </div>
      </section>`;
    root.querySelectorAll("[data-speak]").forEach(btn=>btn.addEventListener("click",()=>Kamizuki.speak(btn.dataset.speak)));
  }catch(err){
    console.error(err);
    root.innerHTML=`<div class="page-message">无法读取卡牌数据。</div>`;
  }
});
function esc(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");}
