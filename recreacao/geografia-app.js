'use strict';
const $=id=>document.getElementById(id),KEY='zurche.recreacao.geografia.v1';
let roster=[],queue=[],cfg=null,current=null,rows=[],ticker=null,deadline=0,remaining=0,running=false;
const notice=text=>$('notice').textContent=text;
let audio=null,voice=null,alerted=new Set(),questionQueue=[],lastQuestion=null,loadVersion=0;
function enableAudio(){
 try{const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return;
 if(!audio)audio=new Audio();if(audio.state==='suspended')audio.resume().catch(()=>{});
 }catch{/* A atividade continua mesmo sem áudio disponível. */}
}
function beep(){
 if(!audio||audio.state!=='running')return;
 try{const oscillator=audio.createOscillator(),gain=audio.createGain(),t=audio.currentTime;
 oscillator.type='sine';oscillator.frequency.setValueAtTime(880,t);
 gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.18,t+.015);gain.gain.exponentialRampToValueAtTime(.001,t+.18);
 oscillator.connect(gain);gain.connect(audio.destination);voice=oscillator;
 oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();if(voice===oscillator)voice=null;};
 oscillator.start(t);oscillator.stop(t+.2);
 }catch{}
}
function stop(){clearInterval(ticker);ticker=null;running=false;$('stage').classList.remove('urgent');if(voice){try{voice.stop();}catch{}voice=null;}}
function displayTime(){const s=Math.max(0,Math.ceil(remaining/1000));$('clock').textContent=s;$('bar').style.width=`${cfg?Math.max(0,remaining/(cfg.seconds*1000)*100):100}%`;}
function tick(){remaining=Math.max(0,deadline-performance.now());displayTime();
 const second=Math.ceil(remaining/1000);
 if(second>=1&&second<=5){$('stage').classList.add('urgent');if(!alerted.has(second)){alerted.add(second);beep();} }
 if(remaining<=0){stop();$('stage').classList.add('expired');$('pause').disabled=true;$('status').textContent='Tempo esgotado! Revele a resposta ou marque o resultado.';}}
function startTimer(){stop();running=true;deadline=performance.now()+remaining;$('pause').textContent='Pausar';ticker=setInterval(tick,100);tick();}
function save(){try{if($('remember').checked)localStorage.setItem(KEY,JSON.stringify({names:$('names').value,...cfg}));else localStorage.removeItem(KEY);}catch{notice('Turma pronta. Não foi possível salvar neste navegador.');}}
function updateHistory(){
 $('history').replaceChildren();
 for(const row of [...rows].reverse()){
  const li=document.createElement('li'),name=document.createElement('span'),detail=document.createElement('small');
  name.textContent=row.name;detail.textContent=`${row.summary} · ${row.answer} · ${row.result}`;li.append(name,detail);$('history').append(li);
 }
 $('totals').textContent=rows.length?`${rows.filter(r=>r.result==='Acertou').length} acertos · ${rows.length} rodadas`:'Nenhuma rodada ainda';
}
function record(result){if(!current||current.recorded)return;current.recorded=true;rows.push({...current,result});updateHistory();}
function reveal(){if(!current)return;$('answer').hidden=false;$('answer').textContent=current.answer;$('facts').hidden=false;$('facts').textContent=`${current.state.name} (${current.state.uf}) · ${current.state.uf==='DF'?'Sede do governo federal':'Capital'}: ${current.state.capital} · Região ${current.state.region}`;if(current.topic==='escolha'){for(const [i,button] of [...$('choices').children].entries()){button.classList.toggle('is-correct',i===current.correctIndex);button.classList.toggle('is-wrong',i===current.selectedIndex&&i!==current.correctIndex);button.disabled=true;button.setAttribute('aria-label',`${'ABCD'[i]}: ${current.choices[i].name}${i===current.correctIndex?' — resposta correta':''}`);}}if(current.topic==='bandeira'){$('flagImage').alt=`Bandeira: ${current.state.name}`;$('flagCaption').textContent=current.state.name;}}
function progress(){const drawn=roster.length-queue.length;$('progress').textContent=`● ${drawn} de ${roster.length} alunos chamados`;}
function resetRound(){stop();current=null;$('stage').classList.remove('expired');$('student').textContent='Turma preparada!';$('prompt').textContent='Quem será o primeiro a encarar o desafio?';$('question').textContent='Conhece o Brasil?';$('answer').hidden=true;$('facts').hidden=true;$('flagArea').hidden=true;$('choices').hidden=true;$('choices').replaceChildren();$('stage').classList.remove('has-choices');$('retryFlag').hidden=true;remaining=cfg.seconds*1000;displayTime();for(const id of ['pause','reveal','correct','wrong'])$(id).disabled=true;$('draw').disabled=false;$('draw').textContent='Sortear e iniciar →';$('restart').hidden=true;progress();$('status').textContent='Todos participam uma vez antes de repetir.';}
$('settings').addEventListener('submit',e=>{e.preventDefault();try{
 const next=Geografia.config(Number($('seconds').value),['capital','sigla','bandeira','escolha'].filter(t=>$(t).checked),$('region').value,$('includeDF').checked,$('direction').value);
 const names=Tabuada.parseNames($('names').value);if(!names.length)throw Error('Inclua pelo menos um aluno.');
 if(current&&!current.recorded)record('Sem avaliação');cfg=next;questionQueue=[];loadVersion++;roster=names;queue=Tabuada.shuffle(roster);resetRound();notice(`Turma pronta: ${names.length} alunos. Vamos começar!`);save();$('gameModal').showModal();$('resumeGame').hidden=false;
}catch(err){notice(err.message);}});
$('draw').addEventListener('click',()=>{if(!cfg||!queue.length)return;enableAudio();stop();alerted=new Set();record('Sem avaliação');
 loadVersion++;current={name:queue.pop(),...nextQuestion(),recorded:false};
 $('student').textContent=current.name;$('prompt').textContent=current.prompt;$('question').textContent=current.question;$('stage').style.setProperty('--urgent-size',`${Math.min(16,130/$('question').textContent.length)}vw`);$('answer').hidden=true;$('facts').hidden=true;$('flagArea').hidden=true;$('choices').hidden=true;$('choices').replaceChildren();$('stage').classList.remove('has-choices');$('retryFlag').hidden=true;$('stage').classList.remove('expired');
 for(const id of ['pause','reveal','correct','wrong'])$(id).disabled=false;
 $('draw').textContent='Próximo aluno →';$('draw').disabled=!queue.length;$('restart').hidden=!!queue.length;progress();remaining=cfg.seconds*1000;$('status').textContent='Valendo!';if(hasFlags(current))loadFlag();else startTimer();
});
$('pause').addEventListener('click',()=>{if(!current)return;if(running){remaining=Math.max(0,deadline-performance.now());stop();displayTime();$('pause').textContent='Continuar';$('status').textContent='Cronômetro pausado.';}else{enableAudio();startTimer();$('status').textContent='Valendo!';}});
$('reveal').addEventListener('click',()=>{if(running)remaining=Math.max(0,deadline-performance.now());stop();displayTime();reveal();$('pause').disabled=true;$('status').textContent='Resposta revelada. Marque o resultado ou passe ao próximo aluno.';});
for(const [id,result] of [['correct','Acertou'],['wrong','Errou']])$(id).addEventListener('click',()=>{if(!current||current.recorded)return;if(running)remaining=Math.max(0,deadline-performance.now());stop();displayTime();reveal();record(result);for(const key of ['correct','wrong','pause'])$(key).disabled=true;$('status').textContent=queue.length?'Resultado registrado. Vamos ao próximo aluno?':'Todos participaram! Reinicie a turma para uma nova sequência.';});
$('restart').addEventListener('click',()=>{record('Sem avaliação');queue=Tabuada.shuffle(roster);resetRound();notice('Nova sequência pronta. O histórico da sessão foi mantido.');});
$('file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>1024*1024)throw Error('Use um arquivo de até 1 MB.');const names=Tabuada.parseNames(await file.text());if(!names.length)throw Error('O arquivo não contém nomes.');$('names').value=names.join('\n');notice(`${names.length} nomes importados. Clique em Iniciar game.`);}catch(err){notice(err.message);}finally{e.target.value='';}});
$('remember').addEventListener('change',()=>{if(!$('remember').checked){try{localStorage.removeItem(KEY);}catch{}notice('Dados salvos removidos deste navegador.');}});
$('erase').addEventListener('click',()=>{if(!confirm('Apagar a lista, a configuração salva e o histórico desta sessão?'))return;stop();try{localStorage.removeItem(KEY);}catch{}loadVersion++;questionQueue=[];roster=[];queue=[];cfg=null;current=null;rows=[];$('resumeGame').hidden=true;$('settings').reset();$('student').textContent='Vamos jogar?';$('prompt').textContent='Prepare a lista ao lado para começar.';$('question').textContent='Conhece o Brasil?';$('answer').hidden=true;$('facts').hidden=true;$('flagArea').hidden=true;$('choices').hidden=true;$('choices').replaceChildren();$('stage').classList.remove('has-choices');$('retryFlag').hidden=true;$('clock').textContent='20';$('bar').style.width='100%';$('stage').classList.remove('expired');$('progress').textContent='● Aguardando a turma';for(const id of ['draw','pause','reveal','correct','wrong'])$(id).disabled=true;$('restart').hidden=true;updateHistory();notice('Dados apagados.');$('status').textContent='Todos participam uma vez antes de repetir.';});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('gameModal').requestFullscreen();}catch{$('status').textContent='Tela cheia indisponível neste navegador. Você pode continuar em tela normal.';}});
function pauseOnClose(){loadVersion++;if(current&&hasFlags(current)&&$('pause').disabled&&remaining>0&&!current.recorded&&$('answer').hidden){$('retryFlag').hidden=false;}if(running){remaining=Math.max(0,deadline-performance.now());stop();displayTime();if(remaining>0){$('pause').textContent='Continuar';$('status').textContent='Cronômetro pausado. Clique em Continuar para retomar.';}else{$('pause').disabled=true;$('status').textContent='Tempo esgotado!';}}}
$('closeGame').addEventListener('click',async()=>{pauseOnClose();if(document.fullscreenElement){try{await document.exitFullscreen();}catch{}}$('gameModal').close();});
$('gameModal').addEventListener('cancel',pauseOnClose);
$('gameModal').addEventListener('close',pauseOnClose);
$('resumeGame').addEventListener('click',()=>{if(cfg)$('gameModal').showModal();});
document.addEventListener('fullscreenchange',()=>{$('fullscreen').textContent=document.fullscreenElement?'⛶ Sair da tela cheia':'⛶ Tela cheia';});
try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved&&typeof saved.names==='string'){Geografia.config(saved.seconds,saved.topics,saved.region,saved.includeDF,saved.direction||'ambos');$('direction').value=saved.direction||'ambos';for(const t of ['capital','sigla','bandeira','escolha'])$(t).checked=saved.topics.includes(t);$('region').value=saved.region;$('includeDF').checked=saved.includeDF;$('names').value=saved.names;$('seconds').value=saved.seconds;$('remember').checked=true;notice('Lista recuperada. Clique em Iniciar game quando estiver pronto.');}}catch{}

function nextQuestion(){
 if(!questionQueue.length){questionQueue=Tabuada.shuffle(Geografia.questions(cfg));if(questionQueue.length>1&&questionQueue[questionQueue.length-1].key===lastQuestion){[questionQueue[0],questionQueue[questionQueue.length-1]]=[questionQueue[questionQueue.length-1],questionQueue[0]];}}
 const q=questionQueue.pop();lastQuestion=q.key;return q.topic==='escolha'?Geografia.alternatives(q,cfg):q;
}
function hasFlags(round){return round&&['bandeira','escolha'].includes(round.topic);}
function preloadFlag(url){return new Promise((resolve,reject)=>{const image=new Image(),timer=setTimeout(()=>{image.onload=image.onerror=null;reject(Error('timeout'));},12000);image.onload=()=>{clearTimeout(timer);resolve();};image.onerror=()=>{clearTimeout(timer);reject(Error('load'));};image.src=url;});}
function renderChoices(round){
 $('choices').replaceChildren();$('choices').hidden=false;$('stage').classList.add('has-choices');
 round.choices.forEach((state,i)=>{
  const button=document.createElement('button'),label=document.createElement('span'),image=document.createElement('img');
  button.type='button';button.className='flag-option';button.setAttribute('aria-label','Alternativa '+'ABCD'[i]);button.setAttribute('aria-pressed',round.selectedIndex===i?'true':'false');
  label.className='option-letter';label.textContent='ABCD'[i];image.src=state.flag;image.alt='Bandeira da alternativa '+'ABCD'[i];button.append(label,image);
  button.classList.toggle('is-selected',round.selectedIndex===i);
  button.addEventListener('click',()=>{if(current!==round||!$('answer').hidden)return;round.selectedIndex=i;if(running)remaining=Math.max(0,deadline-performance.now());stop();displayTime();$('pause').disabled=true;
   for(const [j,option] of [...$('choices').children].entries()){option.classList.toggle('is-selected',j===i);option.setAttribute('aria-pressed',j===i?'true':'false');}
   $('status').textContent=`Alternativa ${'ABCD'[i]} selecionada. Clique em Mostrar resposta para conferir.`;
  });$('choices').append(button);
 });
}
async function loadFlag(){
 const version=++loadVersion,round=current;if(!round)return;
 stop();$('retryFlag').hidden=true;
 if(round.topic==='escolha'){$('choices').hidden=true;$('stage').classList.add('has-choices');}else{$('flagArea').hidden=false;$('flagImage').hidden=true;$('flagCaption').textContent='Carregando bandeira…';$('flagImage').alt='Bandeira da unidade federativa a identificar';}
 for(const id of ['pause','reveal','correct','wrong'])$(id).disabled=true;
 $('status').textContent='Carregando imagens. O tempo ainda não está correndo.';
 try{
  await Promise.all((round.topic==='escolha'?round.choices:[round.state]).map(state=>preloadFlag(state.flag)));
  if(version!==loadVersion||current!==round||!$('gameModal').open)return;
  if(round.topic==='escolha')renderChoices(round);else{$('flagImage').src=round.state.flag;$('flagImage').hidden=false;$('flagCaption').textContent='Identifique a bandeira';}
  for(const id of ['pause','reveal','correct','wrong'])$(id).disabled=false;
  if(round.selectedIndex!==undefined){$('pause').disabled=true;$('status').textContent='Alternativa selecionada. Revele a resposta para conferir.';}else{$('status').textContent='Valendo!';startTimer();}
 }catch{
  if(version!==loadVersion||current!==round||!$('gameModal').open)return;
  if(round.topic==='bandeira')$('flagCaption').textContent='Não foi possível carregar a bandeira.';
  $('retryFlag').hidden=false;$('status').textContent='Não foi possível carregar as imagens. Tente novamente; o tempo não está correndo.';
 }
}
$('retryFlag').addEventListener('click',()=>{enableAudio();loadFlag();});
