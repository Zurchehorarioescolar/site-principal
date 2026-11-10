'use strict';
const $=id=>document.getElementById(id),KEY='zurche.atividades.mundo.v1';
$('clickAnswers').defaultChecked=matchMedia('(max-width: 740px), (pointer: coarse)').matches;
$('clickAnswers').checked=$('clickAnswers').defaultChecked;
let soloStart=0;
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
 if(remaining<=0){stop();$('stage').classList.add('expired');$('pause').disabled=true;if(cfg.clickAnswers)finishClickAnswer(current,null);else $('status').textContent='Tempo esgotado! Revele a resposta ou marque o resultado.';}}
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
function reveal(){if(!current)return;if(current.textChoices)GeoAlternativas.mark(current,$('textChoices'));$('answer').hidden=false;$('answer').textContent=current.answer;$('facts').hidden=false;const country=current.state;$('facts').textContent=country.name+' · Capitais / sede: '+country.capitals.join(' / ')+' · Idiomas de referência: '+country.languages.join(', ')+' · Continente: '+country.continents.join(' e ')+(country.note?' · '+country.note:'');if(current.topic==='escolha'){for(const [i,button] of [...$('choices').children].entries()){button.classList.toggle('is-correct',i===current.correctIndex);button.classList.toggle('is-wrong',i===current.selectedIndex&&i!==current.correctIndex);button.disabled=true;button.setAttribute('aria-label',`${'ABCD'[i]}: ${current.choices[i].name}${i===current.correctIndex?' — resposta correta':''}`);}}if(current.topic==='bandeira'){$('flagImage').alt=`Bandeira: ${current.state.name}`;$('flagCaption').textContent=current.state.name;}}
function progress(){
 const total=cfg.solo?cfg.questionCount:roster.length,drawn=total-queue.length;
 $('progress').textContent=cfg.solo?`● Pergunta ${drawn} de ${total}`:`● ${drawn} de ${total} alunos chamados`;
}
function createQueue(){return cfg.solo?Array(cfg.questionCount).fill(roster[0]):Tabuada.shuffle(roster);}
function updateSoloSettings(){
 const solo=Tabuada.parseNames($('names').value).length===1;
 $('soloSettings').hidden=!solo;$('clickAnswers').disabled=solo;
 if(solo)$('clickAnswers').checked=true;
}
function showSoloResult(){
 if(!cfg.solo||queue.length||!current?.recorded)return;
 const answers=rows.slice(soloStart),correct=answers.filter(row=>row.result==='Acertou').length;
 const score=GeoAlternativas.soloResult(correct,cfg.questionCount);
 $('soloResultTitle').textContent=roster[0];
 $('soloPercentage').textContent=score.percentage.toLocaleString('pt-BR',{maximumFractionDigits:1})+'%';
 $('soloSummary').textContent=`${correct} de ${cfg.questionCount} respostas corretas`;
 $('soloMessage').textContent=score.message;
 $('soloResultModal').showModal();$('soloNewGame').focus();
}
function resetRound(){stop();current=null;$('stage').classList.remove('expired');$('student').textContent='Turma preparada!';$('prompt').textContent='Quem será o primeiro a encarar o desafio?';$('question').textContent='Conhece o mundo?';$('answer').hidden=true;$('facts').hidden=true;$('flagArea').hidden=true;$('choices').hidden=true;$('choices').replaceChildren();$('textChoices').hidden=true;$('textChoices').replaceChildren();$('stage').classList.remove('has-choices');$('retryFlag').hidden=true;remaining=cfg.seconds*1000;displayTime();for(const id of ['pause','reveal','correct','wrong'])$(id).disabled=true;$('draw').disabled=false;$('draw').textContent=cfg.solo?'Começar perguntas →':'Sortear e iniciar →';$('restart').hidden=true;progress();$('status').textContent=cfg.solo?`Uma partida com ${cfg.questionCount} perguntas. Boa sorte!`:'Todos participam uma vez antes de repetir.';}
$('settings').addEventListener('submit',e=>{e.preventDefault();try{
 const next=GeografiaMundo.config(Number($('seconds').value),['capital','idioma','continente','bandeira','escolha'].filter(t=>$(t).checked),$('region').value,$('direction').value);
 next.clickAnswers=$('clickAnswers').checked;
 const names=Tabuada.parseNames($('names').value);if(!names.length)throw Error('Inclua pelo menos um aluno.');
 next.solo=names.length===1;next.questionCount=Number($('questionCount').value);
 if(![5,10,15,20].includes(next.questionCount))throw Error('Escolha 5, 10, 15 ou 20 perguntas.');
 if(next.solo)next.clickAnswers=true;
 if(current&&!current.recorded)record('Sem avaliação');cfg=next;$('stage').classList.toggle('solo-game',cfg.solo);soloStart=rows.length;$('stage').classList.toggle('click-answers',cfg.clickAnswers);questionQueue=[];loadVersion++;roster=names;queue=createQueue();resetRound();notice(`Turma pronta: ${names.length} alunos. Vamos começar!`);save();$('gameModal').showModal();$('resumeGame').hidden=false;
}catch(err){notice(err.message);}});
$('draw').addEventListener('click',()=>{if(!cfg||!queue.length)return;enableAudio();stop();alerted=new Set();record('Sem avaliação');
 loadVersion++;current={name:queue.pop(),...nextQuestion(),recorded:false};
 $('student').textContent=current.name;$('prompt').textContent=current.prompt;$('question').textContent=current.question;$('stage').style.setProperty('--urgent-size',`${Math.min(16,130/$('question').textContent.length)}vw`);$('answer').hidden=true;$('facts').hidden=true;$('flagArea').hidden=true;$('choices').hidden=true;$('choices').replaceChildren();$('textChoices').hidden=true;$('textChoices').replaceChildren();$('stage').classList.remove('has-choices');$('retryFlag').hidden=true;$('stage').classList.remove('expired');
 for(const id of ['pause','reveal','correct','wrong'])$(id).disabled=false;
 $('draw').textContent=cfg.solo?'Próxima pergunta →':'Próximo aluno →';$('draw').disabled=cfg.solo||!queue.length;$('restart').hidden=cfg.solo||!!queue.length;progress();remaining=cfg.seconds*1000;$('status').textContent='Valendo!';if(hasFlags(current))loadFlag();else{if(current.textChoices)GeoAlternativas.render(current,$('textChoices'),finishClickAnswer);startTimer();if(cfg.clickAnswers)$('status').textContent='Toque em uma alternativa.';}
});
$('pause').addEventListener('click',()=>{if(!current)return;if(running){remaining=Math.max(0,deadline-performance.now());stop();displayTime();$('pause').textContent='Continuar';$('status').textContent='Cronômetro pausado.';}else{enableAudio();startTimer();$('status').textContent='Valendo!';}});
$('reveal').addEventListener('click',()=>{if(running)remaining=Math.max(0,deadline-performance.now());stop();displayTime();reveal();$('pause').disabled=true;$('status').textContent='Resposta revelada. Marque o resultado ou passe ao próximo aluno.';});
for(const [id,result] of [['correct','Acertou'],['wrong','Errou']])$(id).addEventListener('click',()=>{if(!current||current.recorded)return;if(running)remaining=Math.max(0,deadline-performance.now());stop();displayTime();reveal();record(result);for(const key of ['correct','wrong','pause'])$(key).disabled=true;$('status').textContent=queue.length?'Resultado registrado. Vamos ao próximo aluno?':'Todos participaram! Reinicie a turma para uma nova sequência.';});
$('restart').addEventListener('click',()=>{record('Sem avaliação');queue=createQueue();soloStart=rows.length;resetRound();notice(cfg.solo?'Nova partida pronta!':'Nova sequência pronta. O histórico da sessão foi mantido.');});
$('file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>1024*1024)throw Error('Use um arquivo de até 1 MB.');const names=Tabuada.parseNames(await file.text());if(!names.length)throw Error('O arquivo não contém nomes.');$('names').value=names.join('\n');updateSoloSettings();notice(`${names.length} nomes importados. Clique em Iniciar game.`);}catch(err){notice(err.message);}finally{e.target.value='';}});
$('remember').addEventListener('change',()=>{if(!$('remember').checked){try{localStorage.removeItem(KEY);}catch{}notice('Dados salvos removidos deste navegador.');}});
$('erase').addEventListener('click',()=>{if(!confirm('Apagar a lista, a configuração salva e o histórico desta sessão?'))return;stop();try{localStorage.removeItem(KEY);}catch{}loadVersion++;questionQueue=[];roster=[];queue=[];cfg=null;current=null;rows=[];$('resumeGame').hidden=true;$('settings').reset();updateSoloSettings();$('student').textContent='Vamos jogar?';$('prompt').textContent='Prepare a lista ao lado para começar.';$('question').textContent='Conhece o mundo?';$('answer').hidden=true;$('facts').hidden=true;$('flagArea').hidden=true;$('choices').hidden=true;$('choices').replaceChildren();$('textChoices').hidden=true;$('textChoices').replaceChildren();$('stage').classList.remove('has-choices');$('retryFlag').hidden=true;$('clock').textContent='20';$('bar').style.width='100%';$('stage').classList.remove('expired');$('progress').textContent='● Aguardando a turma';for(const id of ['draw','pause','reveal','correct','wrong'])$(id).disabled=true;$('restart').hidden=true;updateHistory();notice('Dados apagados.');$('status').textContent='Todos participam uma vez antes de repetir.';});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('gameModal').requestFullscreen();}catch{$('status').textContent='Tela cheia indisponível neste navegador. Você pode continuar em tela normal.';}});
function pauseOnClose(){loadVersion++;if(current&&hasFlags(current)&&$('pause').disabled&&remaining>0&&!current.recorded&&$('answer').hidden){$('retryFlag').hidden=false;}if(running){remaining=Math.max(0,deadline-performance.now());stop();displayTime();if(remaining>0){$('pause').textContent='Continuar';$('status').textContent='Cronômetro pausado. Clique em Continuar para retomar.';}else{$('pause').disabled=true;$('status').textContent='Tempo esgotado!';}}}
$('closeGame').addEventListener('click',async()=>{pauseOnClose();if(document.fullscreenElement){try{await document.exitFullscreen();}catch{}}$('gameModal').close();});
$('gameModal').addEventListener('cancel',pauseOnClose);
$('gameModal').addEventListener('close',pauseOnClose);
$('resumeGame').addEventListener('click',()=>{if(cfg)$('gameModal').showModal();});
document.addEventListener('fullscreenchange',()=>{$('fullscreen').textContent=document.fullscreenElement?'⛶ Sair da tela cheia':'⛶ Tela cheia';});
try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved&&typeof saved.names==='string'){GeografiaMundo.config(saved.seconds,saved.topics,saved.region,saved.direction||'ambos');$('direction').value=saved.direction||'ambos';for(const t of ['capital','idioma','continente','bandeira','escolha'])$(t).checked=saved.topics.includes(t);$('region').value=saved.region;$('names').value=saved.names;$('seconds').value=saved.seconds;if([5,10,15,20].includes(saved.questionCount))$('questionCount').value=saved.questionCount;if(typeof saved.clickAnswers==='boolean')$('clickAnswers').checked=saved.clickAnswers;$('remember').checked=true;notice('Lista recuperada. Clique em Iniciar game quando estiver pronto.');}}catch{}

function nextQuestion(){
 if(!questionQueue.length){questionQueue=Tabuada.shuffle(GeografiaMundo.questions(cfg));if(questionQueue.length>1&&questionQueue[questionQueue.length-1].key===lastQuestion){[questionQueue[0],questionQueue[questionQueue.length-1]]=[questionQueue[questionQueue.length-1],questionQueue[0]];}}
 const q=questionQueue.pop();lastQuestion=q.key;return q.topic==='escolha'?GeografiaMundo.alternatives(q,cfg):cfg.clickAnswers?GeoAlternativas.prepare(q,GeografiaMundo.pool(cfg),GeografiaMundo.countries):q;
}
function finishClickAnswer(round,index){
 if(current!==round||!round||round.recorded||!$('answer').hidden||!$('gameModal').open)return;
 // Ignore taps while paused or while the flag is still loading.
 if(index!==null&&!running)return;
 if(running)remaining=Math.max(0,deadline-performance.now());
 const timedOut=index===null||remaining<=0;
 if(!timedOut)round.selectedIndex=index;
 stop();displayTime();reveal();
 const result=timedOut?'Tempo esgotado':index===round.correctIndex?'Acertou':'Errou';
 record(result);
 for(const id of ['pause','reveal','correct','wrong'])$(id).disabled=true;
 const next=cfg.solo?(queue.length?'Próxima pergunta para continuar.':'Partida concluída!'):queue.length?'Próximo aluno para continuar.':'Todos participaram! Você pode reiniciar a turma.';
 $('status').textContent=(timedOut?'Tempo esgotado.':result==='Acertou'?'✓ Resposta correta!':'✕ Resposta incorreta. Confira a opção verde.')+' '+next;
 if(cfg.solo){$('draw').disabled=!queue.length;$('restart').hidden=!!queue.length;showSoloResult();}
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
  button.addEventListener('click',()=>{if(cfg.clickAnswers){finishClickAnswer(round,i);return;}if(current!==round||!$('answer').hidden)return;round.selectedIndex=i;if(running)remaining=Math.max(0,deadline-performance.now());stop();displayTime();$('pause').disabled=true;
   for(const [j,option] of [...$('choices').children].entries()){option.classList.toggle('is-selected',j===i);option.setAttribute('aria-pressed',j===i?'true':'false');}
   $('status').textContent=`Alternativa ${'ABCD'[i]} selecionada. Clique em Mostrar resposta para conferir.`;
  });$('choices').append(button);
 });
}
async function loadFlag(){
 const version=++loadVersion,round=current;if(!round)return;
 stop();$('retryFlag').hidden=true;
 if(round.topic==='escolha'){$('choices').hidden=true;$('stage').classList.add('has-choices');}else{$('flagArea').hidden=false;$('flagImage').hidden=true;$('flagCaption').textContent='Carregando bandeira…';$('flagImage').alt='Bandeira do país a identificar';}
 for(const id of ['pause','reveal','correct','wrong'])$(id).disabled=true;
 $('status').textContent='Carregando imagens. O tempo ainda não está correndo.';
 try{
  await Promise.all((round.topic==='escolha'?round.choices:[round.state]).map(state=>preloadFlag(state.flag)));
  if(version!==loadVersion||current!==round||!$('gameModal').open)return;
  if(round.topic==='escolha')renderChoices(round);else{$('flagImage').src=round.state.flag;$('flagImage').hidden=false;$('flagCaption').textContent='Identifique a bandeira';}
  if(round.textChoices)GeoAlternativas.render(round,$('textChoices'),finishClickAnswer);
  for(const id of ['pause','reveal','correct','wrong'])$(id).disabled=false;
  if(round.selectedIndex!==undefined){$('pause').disabled=true;$('status').textContent='Alternativa selecionada. Revele a resposta para conferir.';}else{$('status').textContent=cfg.clickAnswers?'Toque em uma alternativa.':'Valendo!';startTimer();}
 }catch{
  if(version!==loadVersion||current!==round||!$('gameModal').open)return;
  if(round.topic==='bandeira')$('flagCaption').textContent='Não foi possível carregar a bandeira.';
  $('retryFlag').hidden=false;$('status').textContent='Não foi possível carregar as imagens. Tente novamente; o tempo não está correndo.';
 }
}
$('retryFlag').addEventListener('click',()=>{enableAudio();loadFlag();});

SessionReport.init({activity:'Países do mundo',getRows:()=>rows,describe:row=>`${row.summary} · Resposta: ${row.answer}`});

function updateCoverage(){
 const countryPool=GeografiaMundo.pool({region:$('region').value});
 const flags=countryPool.filter(country=>country.flag).length;
 $('countryCoverage').textContent=countryPool.length+' países · '+flags+' bandeiras disponíveis.';
}
$('region').addEventListener('change',updateCoverage);
$('erase').addEventListener('click',updateCoverage);
updateCoverage();

$('names').addEventListener('input',updateSoloSettings);
$('soloNewGame').addEventListener('click',()=>{$('soloResultModal').close();$('restart').click();});
$('soloExit').addEventListener('click',()=>{$('soloResultModal').close();$('closeGame').click();});
updateSoloSettings();
