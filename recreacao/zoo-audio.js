(()=>{
 const audio=new Audio();let active=null;
 function stop(){
  audio.pause();audio.currentTime=0;
  if(active){active.textContent='🔊';active.setAttribute('aria-label','OUVIR');}
  active=null;window.dispatchEvent(new Event('zooAudioStop'));
 }
 document.addEventListener('click',event=>{
  const button=event.target.closest('[data-zoo-audio]');
  if(!button)return;
  if(active===button&&!audio.ended){
   if(audio.paused){audio.play().catch(stop);button.textContent='⏸';button.setAttribute('aria-label','PAUSAR');}
   else{audio.pause();button.textContent='▶';button.setAttribute('aria-label','RETOMAR');}
   return;
  }
  stop();active=button;audio.src=button.dataset.zooAudio;
  button.textContent='⏸';button.setAttribute('aria-label','PAUSAR');
  window.dispatchEvent(new CustomEvent('zooAudioStart',{detail:audio.src}));
  audio.play().catch(stop);
 });
 audio.addEventListener('timeupdate',()=>window.dispatchEvent(new CustomEvent('zooAudioTime',{detail:audio.currentTime})));
 audio.addEventListener('ended',stop);
 window.addEventListener('zooStopAudio',stop);
})();