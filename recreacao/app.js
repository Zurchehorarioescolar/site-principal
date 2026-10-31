'use strict';
const $=id=>document.getElementById(id),KEY='zurche.recreacao.tabuada.v1';
let roster=[],queue=[],cfg=null,current=null,rows=[],ticker=null,deadline=0,remaining=0,running=false;
const notice=text=>$('notice').textContent=text;
function stop(){clearInterval(ticker);ticker=null;running=false;}
function displayTime(){const s=Math.max(0,Math.ceil(remaining/1000));$('clock').textContent=s;$('bar').style.width=`${cfg?Math.max(0,remaining/(cfg.seconds*1000)*100):100}%`;}
function tick(){remaining=Math.max(0,deadline-performance.now());displayTime();if(remaining<=0){stop();$('stage').classList.add('expired');$('pause').disabled=true;$('status').textContent='Tempo esgotado! Revele a resposta ou marque o resultado.';}}
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
function record(result){if(!current||current.recorded)return;current.recorded=true;rows.push({...current,result});updateHistory();}
function reveal(){if(!current)return;$('answer').hidden=false;$('answer').textContent=`= ${current.a*current.b}`;}
function progress(){const drawn=roster.length-queue.length;$('progress').textContent=`● ${drawn} de ${roster.length} alunos chamados`;}
function resetRound(){stop();current=null;$('stage').classList.remove('expired');$('student').textContent='Turma preparada!';$('prompt').textContent='Quem será o primeiro a encarar o desafio?';$('question').textContent='? × ?';$('answer').hidden=true;remaining=cfg.seconds*1000;displayTime();for(const id of ['pause','reveal','correct','wrong'])$(id).disabled=true;$('draw').disabled=false;$('draw').textContent='Sortear e iniciar →';$('restart').hidden=true;progress();$('status').textContent='Todos participam uma vez antes de repetir.';}
$('settings').addEventListener('submit',e=>{e.preventDefault();try{
 const next=Tabuada.config(Number($('min').value),Number($('max').value),Number($('seconds').value));
 const names=Tabuada.parseNames($('names').value);if(!names.length)throw Error('Inclua pelo menos um aluno.');
 if(current&&!current.recorded)record('Sem avaliação');cfg=next;roster=names;queue=Tabuada.shuffle(roster);resetRound();notice(`Turma pronta: ${names.length} alunos. Vamos começar!`);save();
}catch(err){notice(err.message);}});
$('draw').addEventListener('click',()=>{if(!cfg||!queue.length)return;stop();record('Sem avaliação');
 current={name:queue.pop(),a:Tabuada.factor(cfg.min,cfg.max),b:Tabuada.factor(cfg.min,cfg.max),recorded:false};
 $('student').textContent=current.name;$('prompt').textContent='Quanto é? Responda antes que o tempo acabe.';$('question').textContent=`${current.a} × ${current.b}`;$('answer').hidden=true;$('stage').classList.remove('expired');
 for(const id of ['pause','reveal','correct','wrong'])$(id).disabled=false;
 $('draw').textContent='Próximo aluno →';$('draw').disabled=!queue.length;$('restart').hidden=!!queue.length;progress();remaining=cfg.seconds*1000;$('status').textContent='Valendo!';startTimer();
});
$('pause').addEventListener('click',()=>{if(!current)return;if(running){remaining=Math.max(0,deadline-performance.now());stop();displayTime();$('pause').textContent='Continuar';$('status').textContent='Cronômetro pausado.';}else{startTimer();$('status').textContent='Valendo!';}});
$('reveal').addEventListener('click',()=>{if(running)remaining=Math.max(0,deadline-performance.now());stop();displayTime();reveal();$('pause').disabled=true;$('status').textContent='Resposta revelada. Marque o resultado ou passe ao próximo aluno.';});
for(const [id,result] of [['correct','Acertou'],['wrong','Errou']])$(id).addEventListener('click',()=>{if(!current||current.recorded)return;if(running)remaining=Math.max(0,deadline-performance.now());stop();displayTime();reveal();record(result);for(const key of ['correct','wrong','pause'])$(key).disabled=true;$('status').textContent=queue.length?'Resultado registrado. Vamos ao próximo aluno?':'Todos participaram! Reinicie a turma para uma nova sequência.';});
$('restart').addEventListener('click',()=>{record('Sem avaliação');queue=Tabuada.shuffle(roster);resetRound();notice('Nova sequência pronta. O histórico da sessão foi mantido.');});
$('file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>1024*1024)throw Error('Use um arquivo de até 1 MB.');const names=Tabuada.parseNames(await file.text());if(!names.length)throw Error('O arquivo não contém nomes.');$('names').value=names.join('\n');notice(`${names.length} nomes importados. Clique em Salvar e preparar turma.`);}catch(err){notice(err.message);}finally{e.target.value='';}});
$('remember').addEventListener('change',()=>{if(!$('remember').checked){try{localStorage.removeItem(KEY);}catch{}notice('Dados salvos removidos deste navegador.');}});
$('erase').addEventListener('click',()=>{if(!confirm('Apagar a lista, a configuração salva e o histórico desta sessão?'))return;stop();try{localStorage.removeItem(KEY);}catch{}roster=[];queue=[];cfg=null;current=null;rows=[];$('settings').reset();$('student').textContent='Vamos jogar?';$('prompt').textContent='Prepare a lista ao lado para começar.';$('question').textContent='? × ?';$('answer').hidden=true;$('clock').textContent='15';$('bar').style.width='100%';$('stage').classList.remove('expired');$('progress').textContent='● Aguardando a turma';for(const id of ['draw','pause','reveal','correct','wrong'])$(id).disabled=true;$('restart').hidden=true;updateHistory();notice('Dados apagados.');$('status').textContent='Todos participam uma vez antes de repetir.';});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('stage').requestFullscreen();}catch{$('status').textContent='Tela cheia indisponível neste navegador. Você pode continuar em tela normal.';}});
document.addEventListener('fullscreenchange',()=>{$('fullscreen').textContent=document.fullscreenElement?'⛶ Sair da tela cheia':'⛶ Tela cheia';});
try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved&&typeof saved.names==='string'){Tabuada.config(saved.min,saved.max,saved.seconds);$('names').value=saved.names;$('min').value=saved.min;$('max').value=saved.max;$('seconds').value=saved.seconds;$('remember').checked=true;notice('Lista recuperada. Salve para preparar a turma.');}}catch{}
