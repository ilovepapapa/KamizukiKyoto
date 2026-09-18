"use strict";
const GROUP_ORDER=["あ行","か行","さ行","た行","な行","は行","ま行","や行","ら行","わ行","ん"];

document.addEventListener("DOMContentLoaded",async()=>{
  const root=document.getElementById("collection-grid");
  try{
    const cards=await Kamizuki.loadCards("../data/cards.json");
    root.innerHTML="";
    for(const group of GROUP_ORDER){
      const items=cards.filter(c=>c.group===group);
      if(!items.length) continue;
      const unlocked=items.filter(c=>c.unlocked).length;
      const section=document.createElement("section");
      section.className="kana-group-section";
      section.innerHTML=`
        <div class="kana-group-header">
          <div class="kana-group-title">${esc(group)}</div>
          <div class="kana-group-progress">${unlocked} / ${items.length}</div>
        </div>
        <div class="kana-group-grid">${items.map(renderCard).join("")}</div>`;
      root.appendChild(section);
    }
    root.querySelectorAll(".collection-card.active").forEach(card=>{
      card.addEventListener("click",()=>location.href=`card-detail.html?id=${encodeURIComponent(card.dataset.id)}`);
    });
  }catch(err){
    console.error(err);
    root.innerHTML=`<div class="page-message">无法读取 cards.json。请使用 Live Server 或 GitHub Pages 打开。</div>`;
  }
});

function renderCard(card){
  if(!card.unlocked) return `
    <article class="collection-card locked">
      <div class="collection-card-group">${esc(card.group)}</div><div class="collection-lock">🔒</div>
      <div class="collection-hiragana">${esc(card.hiragana)}</div><div class="collection-katakana">${esc(card.katakana)}</div>
      <div class="collection-romaji">???</div><div class="collection-word">继续学习以解锁</div>
    </article>`;
  return `
    <article class="collection-card active" data-id="${esc(card.id)}" tabindex="0">
      <div class="collection-card-group">${esc(card.group)}</div>
      <div class="collection-hiragana">${esc(card.hiragana)}</div><div class="collection-katakana">${esc(card.katakana)}</div>
      <div class="collection-romaji">${esc(card.roma)}</div>
      <div class="collection-word">${esc(card.word)} · ${esc(card.meaning)}</div>
      <div class="collection-exp">Lv.${Number(card.level||1)} · EXP ${Number(card.exp||0)}/100</div>
    </article>`;
}
function esc(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");}
