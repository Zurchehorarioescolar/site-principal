'use strict';
const $=id=>document.getElementById(id),KEY='zurche.recreacao.tabuada.v1';
let roster=[],queue=[],cfg=null,current=null,rows=[],ticker=null,deadline=0,remaining=0,running=false;
const notice=text=>$('notice').textContent=text;
let audio=null,voice=null,alerted=new Set();
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
  name.textContent=row.name;detail.textContent=`${row.a} × ${row.b} = ${row.a*row.b} · ${row.result}`;li.append(name,detail);$('history').append(li);
 }
 $('totals').textContent=rows.length?`${rows.filter(r=>r.result==='Acertou').length} acertos · ${rows.length} rodadas`:'Nenhuma rodada ainda';
}
function record(result){if(!current||current.recorded)return;current.recorded=true;rows.push({...current,result});updateHistory();mathFeedback(result);}
function reveal(){if(!current)return;$('answer').hidden=false;$('answer').textContent=`= ${current.a*current.b}`;}
function progress(){const drawn=(mathMode==='solo'?Number($('mathCount').value):roster.length)-queue.length;$('progress').textContent=`● ${drawn} de ${mathMode==='solo'?$('mathCount').value:roster.length} ${mathMode==='solo'?'perguntas':'alunos chamados'}`;}
function resetRound(){stop();current=null;$('stage').classList.remove('expired');$('student').textContent='Turma preparada!';$('prompt').textContent='Quem será o primeiro a encarar o desafio?';$('question').textContent='? × ?';$('answer').hidden=true;remaining=cfg.seconds*1000;displayTime();for(const id of ['pause','reveal','correct','wrong'])$(id).disabled=true;$('draw').disabled=false;$('draw').textContent='Sortear e iniciar →';$('restart').hidden=true;progress();$('status').textContent='Todos participam uma vez antes de repetir.';}
$('settings').addEventListener('submit',e=>{e.preventDefault();try{
 const next=Tabuada.config(Number($('min').value),Number($('max').value),Number($('seconds').value));
 const names=Tabuada.parseNames($('names').value);if(!names.length)throw Error('Inclua pelo menos um aluno.');
 if(current&&!current.recorded)record('Sem avaliação');cfg=next;roster=names;queue=mathQueue(roster);resetRound();notice(`Turma pronta: ${names.length} alunos. Vamos começar!`);save();$('gameModal').showModal();$('resumeGame').hidden=false;
}catch(err){notice(err.message);}});
$('draw').addEventListener('click',()=>{if(!cfg||!queue.length)return;enableAudio();stop();alerted=new Set();record('Sem avaliação');
 current={name:queue.pop(),a:Tabuada.factor(cfg.min,cfg.max),b:Tabuada.factor(cfg.min,cfg.max),recorded:false};
 $('student').textContent=current.name;$('prompt').textContent='Quanto é? Responda antes que o tempo acabe.';$('question').textContent=`${current.a} × ${current.b}`;$('stage').style.setProperty('--urgent-size',`${Math.min(16,130/$('question').textContent.length)}vw`);$('answer').hidden=true;$('stage').classList.remove('expired');
 for(const id of ['pause','reveal','correct','wrong'])$(id).disabled=false;
 $('draw').textContent='Próximo aluno →';$('draw').disabled=!queue.length;$('restart').hidden=!!queue.length;progress();remaining=cfg.seconds*1000;$('status').textContent='Valendo!';startTimer();mathQuestion();
});
$('pause').addEventListener('click',()=>{if(!current)return;if(running){remaining=Math.max(0,deadline-performance.now());stop();displayTime();$('pause').textContent='Continuar';$('status').textContent='Cronômetro pausado.';}else{enableAudio();startTimer();$('status').textContent='Valendo!';}});
$('reveal').addEventListener('click',()=>{if(running)remaining=Math.max(0,deadline-performance.now());stop();displayTime();reveal();$('pause').disabled=true;$('status').textContent='Resposta revelada. Marque o resultado ou passe ao próximo aluno.';});
for(const [id,result] of [['correct','Acertou'],['wrong','Errou']])$(id).addEventListener('click',()=>{if(!current||current.recorded)return;if(running)remaining=Math.max(0,deadline-performance.now());stop();displayTime();reveal();record(result);for(const key of ['correct','wrong','pause'])$(key).disabled=true;$('status').textContent=queue.length?'Resultado registrado. Vamos ao próximo aluno?':'Todos participaram! Reinicie a turma para uma nova sequência.';});
$('restart').addEventListener('click',()=>{record('Sem avaliação');queue=mathQueue(roster);resetRound();notice('Nova sequência pronta. O histórico da sessão foi mantido.');});
$('file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>1024*1024)throw Error('Use um arquivo de até 1 MB.');const names=Tabuada.parseNames(await file.text());if(!names.length)throw Error('O arquivo não contém nomes.');$('names').value=names.join('\n');notice(`${names.length} nomes importados. Clique em Iniciar game.`);}catch(err){notice(err.message);}finally{e.target.value='';}});
$('remember').addEventListener('change',()=>{if(!$('remember').checked){try{localStorage.removeItem(KEY);}catch{}notice('Dados salvos removidos deste navegador.');}});
$('erase').addEventListener('click',()=>{if(!confirm('Apagar a lista, a configuração salva e o histórico desta sessão?'))return;stop();try{localStorage.removeItem(KEY);}catch{}roster=[];queue=[];cfg=null;current=null;rows=[];$('resumeGame').hidden=true;$('settings').reset();$('student').textContent='Vamos jogar?';$('prompt').textContent='Prepare a lista ao lado para começar.';$('question').textContent='? × ?';$('answer').hidden=true;$('clock').textContent='15';$('bar').style.width='100%';$('stage').classList.remove('expired');$('progress').textContent='● Aguardando a turma';for(const id of ['draw','pause','reveal','correct','wrong'])$(id).disabled=true;$('restart').hidden=true;updateHistory();notice('Dados apagados.');$('status').textContent='Todos participam uma vez antes de repetir.';});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('gameModal').requestFullscreen();}catch{$('status').textContent='Tela cheia indisponível neste navegador. Você pode continuar em tela normal.';}});
function pauseOnClose(){if(running){remaining=Math.max(0,deadline-performance.now());stop();displayTime();if(remaining>0){$('pause').textContent='Continuar';$('status').textContent='Cronômetro pausado. Clique em Continuar para retomar.';}else{$('pause').disabled=true;$('status').textContent='Tempo esgotado!';}}}
$('closeGame').addEventListener('click',async()=>{pauseOnClose();if(document.fullscreenElement){try{await document.exitFullscreen();}catch{}}$('gameModal').close();});
$('gameModal').addEventListener('cancel',pauseOnClose);
$('gameModal').addEventListener('close',pauseOnClose);
$('resumeGame').addEventListener('click',()=>{if(cfg)$('gameModal').showModal();});
document.addEventListener('fullscreenchange',()=>{$('fullscreen').textContent=document.fullscreenElement?'⛶ Sair da tela cheia':'⛶ Tela cheia';});
try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved&&typeof saved.names==='string'){Tabuada.config(saved.min,saved.max,saved.seconds);$('names').value=saved.names;$('min').value=saved.min;$('max').value=saved.max;$('seconds').value=saved.seconds;$('remember').checked=true;notice('Lista recuperada. Salve para preparar a turma.');}}catch{}

SessionReport.init({activity:'Desafio da tabuada',getRows:()=>rows,describe:row=>`${row.a} × ${row.b} = ${row.a*row.b}`});
