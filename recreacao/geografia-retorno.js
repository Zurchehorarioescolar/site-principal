(function(root){
'use strict';
function init({next,restart,cancel}){
 const byId=id=>document.getElementById(id),dialog=byId('roundFeedbackModal'),actions=byId('feedbackActions');
 let timer=null;
 function close(){clearTimeout(timer);timer=null;if(dialog.open)dialog.close();}
 function act(callback){
  if(!dialog.open||actions.hidden)return;
  close();callback();
 }
 byId('feedbackNext').addEventListener('click',()=>act(next));
 byId('feedbackRestart').addEventListener('click',()=>act(restart));
 byId('feedbackCancel').addEventListener('click',()=>act(cancel));
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();cancel();});
 dialog.addEventListener('close',()=>{if(!dialog.open){clearTimeout(timer);timer=null;}});
 function show(round,result,{solo,hasNext}){
  if(dialog.open)return;
  clearTimeout(timer);actions.hidden=true;
  const correct=result==='Acertou',expired=result==='Tempo esgotado';
  dialog.className='geo-round-feedback '+(correct?'is-positive':'is-negative');
  byId('feedbackPlayer').textContent=round.name;byId('feedbackPlayer').title=round.name;
  byId('feedbackEmoji').textContent=correct?'👍':expired?'⏳':'😕';
  byId('feedbackTitle').textContent=correct?'Acertou!':expired?'O tempo acabou!':'Não foi desta vez!';
  byId('feedbackAnswer').textContent='Resposta correta: '+round.answer;
  byId('feedbackNext').textContent=hasNext?(solo?'Próxima →':'Próximo aluno →'):(solo?'Ver resultado →':'Ver resumo →');
  dialog.showModal();byId('feedbackTitle').focus({preventScroll:true});
  timer=setTimeout(()=>{
   timer=null;if(!dialog.open)return;
   actions.hidden=false;byId('feedbackNext').focus({preventScroll:true});
  },950);
 }
 return {show,close,isOpen:()=>dialog.open};
}
root.GeoRetorno={init};
})(globalThis);
