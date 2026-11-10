(function(){
'use strict';
const byId=id=>document.getElementById(id);
const game=byId('gameModal'),main=byId('stageMain'),stage=byId('stage');
const student=byId('student');
const facts=byId('facts'),details=byId('geoDetailsModal'),detailsButton=byId('showGeoDetails');
let frame=null;
function contentFits(){
 return main.scrollHeight<=main.clientHeight&&main.scrollWidth<=main.clientWidth;
}
function fitProperty(name,low,high){
 let best=low;
 for(let index=0;index<10;index++){
  const value=(low+high)/2;
  stage.style.setProperty(name,String(value));
  if(contentFits()){best=value;low=value;}
  else high=value;
 }
 stage.style.setProperty(name,String(Math.floor(best*1000)/1000));
}
function fit(){
 frame=null;
 if(detailsButton.hidden!==facts.hidden)detailsButton.hidden=facts.hidden;
 if(!game.open)return;
 // Keep long student names from taking the question's space.
 student.style.fontSize='';
 const maximum=parseFloat(getComputedStyle(student).fontSize);
 const nameHeight=Math.max(24,Math.min(50,game.clientHeight*.075));
 for(let size=maximum;size>=10&&student.offsetHeight>nameHeight;size--){
  student.style.fontSize=size+'px';
 }
 if(!main.clientHeight)return;
 const hasFlags=!byId('flagArea').hidden||!byId('choices').hidden;
 const maximumScale=hasFlags||!byId('textChoices').hidden?1:1.5;
 stage.style.setProperty('--geo-scale',String(maximumScale));
 stage.style.setProperty('--geo-flag-scale','1');
 if(contentFits())return;
 // Reduce flag height before reducing the question.
 stage.style.setProperty('--geo-flag-scale','.2');
 if(contentFits()){fitProperty('--geo-flag-scale',.2,1);return;}
 fitProperty('--geo-scale',.2,maximumScale);
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
