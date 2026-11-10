(function(){
'use strict';
const byId=id=>document.getElementById(id);
const game=byId('gameModal'),main=byId('stageMain'),stage=byId('stage');
const facts=byId('facts'),details=byId('geoDetailsModal'),detailsButton=byId('showGeoDetails');
let frame=null;
function fit(){
 frame=null;
 if(detailsButton.hidden!==facts.hidden)detailsButton.hidden=facts.hidden;
 if(!game.open||!main.clientHeight)return;
 // Reserve the controls and shrink only the question, answer and flags.
 let low=.2,high=1,best=.2;
 stage.style.setProperty('--geo-scale','1');
 if(main.scrollHeight<=main.clientHeight&&main.scrollWidth<=main.clientWidth)return;
 for(let index=0;index<10;index++){
  const scale=(low+high)/2;
  stage.style.setProperty('--geo-scale',String(scale));
  if(main.scrollHeight<=main.clientHeight&&main.scrollWidth<=main.clientWidth){best=scale;low=scale;}
  else high=scale;
 }
 stage.style.setProperty('--geo-scale',String(Math.floor(best*1000)/1000));
}
function schedule(){
 if(frame===null)frame=requestAnimationFrame(fit);
}
const observer=new MutationObserver(schedule);
observer.observe(stage,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','class']});
observer.observe(facts,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});
observer.observe(game,{attributes:true,attributeFilter:['open']});
new ResizeObserver(schedule).observe(main);
window.addEventListener('resize',schedule);
window.visualViewport?.addEventListener('resize',schedule);
for(const image of game.querySelectorAll('img'))image.addEventListener('load',schedule);
detailsButton.addEventListener('click',()=>{
 if(facts.hidden)return;
 details.showModal();
 byId('closeGeoDetails').focus();
});
byId('closeGeoDetails').addEventListener('click',()=>details.close());
details.addEventListener('close',()=>{if(game.open)detailsButton.focus();});
})();
