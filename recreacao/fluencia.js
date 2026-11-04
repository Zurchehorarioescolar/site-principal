'use strict';
const $=id=>document.getElementById(id),F=Fluencia,Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
let step=0,config=null,phase='setup',clock=null,ticker=null,rec=null,voiceVersion=0,paused=false,locked=false,transitionTimer=null,fallback=false,transcript='',originalTranscript='',revision=false,wordTest=null,questionIndex=0,questionAnswers=['','',''],resultAlignment=null,voiceRetryTimer=null,voiceRetries=0,decisionResolve=null,wordCandidate=null,voiceReady=false;
const active=()=>['text','words'].includes(phase),say=message=>$('status').textContent=message;
function showStep(n){step=n;for(const el of document.querySelectorAll('[data-panel]'))el.hidden=Number(el.dataset.panel)!==n;for(const el of document.querySelectorAll('[data-step]'))el.classList.toggle('active',Number(el.dataset.step)===n);$('previous').hidden=n===0;$('next').hidden=n===3;$('setupMessage').textContent='';if(n===3)reviewSetup();}
function validateStep(n){
 const ids=n===0?['teacher','student','className','date']:n===1?['passage','textSeconds','q1','q2','q3','words','wordSeconds']:[];
 for(const id of ids){const el=$(id);if(!el.value.trim()||!el.reportValidity()){el.focus();throw Error('Preencha os campos desta etapa.');}}
 if(n===1){const count=F.tokens($('passage').value).length;if(!count||count>600)throw Error('O texto deve ter de 1 a 600 palavras.');F.parseWords($('words').value);new F.Clock(Number($('textSeconds').value));new F.Clock(Number($('wordSeconds').value));}
 if(n===2&&$('mode').value==='auto'){if(!$('voiceConsent').checked)throw Error('Marque a autorização de voz ou escolha o modo sem microfone.');if(!Speech||!window.isSecureContext)throw Error('Reconhecimento indisponível. Use o modo sem microfone ou abra pelo portal HTTPS / iniciador local em navegador compatível.');}
}
function reviewSetup(){const list=document.createElement('dl');for(const [label,value] of [['Professor',$('teacher').value],['Estudante',$('student').value],['Turma / data',$('className').value+' · '+$('date').value],['Texto',F.tokens($('passage').value).length+' palavras · '+$('textSeconds').value+' s'],['Compreensão','3 perguntas avaliadas pelo professor'],['Lista',F.parseWords($('words').value).length+' palavras · '+$('wordSeconds').value+' s no total'],['Modo',$('mode').selectedOptions[0].textContent]]){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;list.append(dt,dd);}$('reviewSetup').replaceChildren(list);}
$('next').addEventListener('click',()=>{try{validateStep(step);showStep(step+1);}catch(e){$('setupMessage').textContent=e.message;}});$('previous').addEventListener('click',()=>showStep(step-1));
function stopVoice(){clearWordCandidate();voiceReady=false;clearTimeout(voiceRetryTimer);voiceRetryTimer=null;voiceVersion++;if(rec){const old=rec;rec=null;old.onstart=old.onresult=old.onerror=old.onend=null;try{old.abort();}catch{}}}
function stopTimers(){clearInterval(ticker);ticker=null;clearTimeout(transitionTimer);transitionTimer=null;}
function controls(){const live=active();$('testControls').hidden=!live;$('pause').textContent=paused?'Continuar':'Pausar';$('pause').hidden=phase==='text';$('resumeVoice').hidden=!live||config.mode!=='auto'||fallback||!!rec||locked;$('withoutVoice').hidden=!live||config.mode!=='auto'||fallback||!!rec;$('teacherCorrect').hidden=phase!=='words';$('retry').hidden=phase!=='words'||!wordTest.waiting;$('teacherWrong').hidden=phase!=='words'||config.mode!=='manual'&&!fallback;for(const id of ['teacherCorrect','retry','teacherWrong'])$(id).disabled=paused||locked;if(phase==='words')updateWordVoiceState();}
function displayClock(){if(!clock||!active()){$('clock').textContent='';return;}const seconds=Math.ceil(clock.left(performance.now())/1000);$('clock').textContent=seconds+' s';if($('decisionDialog').open)$('decisionClock').textContent=seconds+' s';$('clock').classList.toggle('warning',seconds<=5);}
function tick(){if(!active()||paused)return;displayClock();if(clock.expired(performance.now()))finishSegment('tempo');}
function runClock(){clock.start(performance.now());clearInterval(ticker);ticker=setInterval(tick,100);displayClock();}
function pauseSegment(message='Etapa pausada. Clique em Continuar para retomar.'){
 if(!active())return;if(clock.expired(performance.now())){finishSegment('tempo');return;}clock.pause(performance.now());paused=true;$('textScreen').setAttribute('aria-pressed','true');stopVoice();stopTimers();locked=false;controls();displayClock();say(message);
}
function listen(){
 if(!active()||locked||rec||config.mode!=='auto'||fallback)return;
 if(!Speech){voiceInterrupted('Reconhecimento indisponível. A contagem continua; o professor pode encerrar a etapa.',false);return;}
 const token=++voiceVersion,instance=new Speech();rec=instance;let processed=0;const consumed=new Set(),provisionalRows=new Map();
 instance.lang='pt-BR';instance.continuous=true;instance.interimResults=phase==='words';instance.maxAlternatives=1;say('Ativando o microfone. A contagem já está em andamento.');controls();
 instance.onstart=()=>{if(token!==voiceVersion||paused)return;voiceReady=true;runClock();say('Microfone ativo. Pode começar a leitura.');controls();};
 instance.onresult=event=>{
  if(token!==voiceVersion)return;if(phase==='words'){handleWordSpeech(event,token,consumed,provisionalRows);return;}const chunks=[];
  for(let i=Math.max(processed,event.resultIndex||0);i<event.results.length;i++){const r=event.results[i];if(!r?.isFinal)break;processed=i+1;chunks.push(r[0].transcript);}
  if(!active()||paused||locked||!chunks.length)return;voiceRetries=0;
  if(clock.expired(performance.now())){finishSegment('tempo');return;}
  if(phase==='text'){const next=(transcript+' '+chunks.join(' ')).trim();if(F.tokens(next).length>1200){stopVoice();fallback=true;controls();say('A transcrição atingiu o limite de 1.200 palavras. O tempo continua; encerre quando desejar.');return;}transcript=next;$('liveTranscript').textContent=transcript;say('Leitura em andamento.');}
  else if(phase==='words')processWord(chunks[0]);
 };
 instance.onerror=event=>{if(token!==voiceVersion)return;const messages={'not-allowed':'Microfone não autorizado. Confira a permissão do navegador.','service-not-allowed':'Serviço de reconhecimento bloqueado.','audio-capture':'Microfone indisponível.','network':'Falha de rede no serviço de voz.','no-speech':'Nenhuma fala detectada. Isso não conta como tentativa.','language-not-supported':'Português indisponível no serviço de voz.'};voiceInterrupted((messages[event.error]||'Escuta interrompida.')+' O tempo continua correndo.',!['not-allowed','service-not-allowed','audio-capture','language-not-supported'].includes(event.error));};
 instance.onspeechstart=()=>{if(token===voiceVersion&&phase==='words'&&!paused)$('wordVoiceState').textContent='Recebendo voz…';};
 instance.onend=()=>{if(token!==voiceVersion)return;voiceInterrupted('O serviço de voz interrompeu a escuta. O tempo continua correndo.',true);};
 try{instance.start();}catch{voiceInterrupted('Não foi possível abrir o microfone. O tempo continua; tente Retomar escuta.',false);}
}
function resumeSegment(){if(!active())return;paused=false;$('textScreen').setAttribute('aria-pressed','false');runClock();if(phase==='words')renderWord();controls();if(config.mode==='auto'&&!fallback)listen();else{runClock();say('Etapa em andamento, com acompanhamento do professor.');}}
function hideScreens(){document.body.classList.remove('text-focus');for(const id of ['textScreen','questionScreen','wordScreen','transition'])$(id).hidden=true;$('transcriptDetails').hidden=true;$('heard').textContent='';}
function beginSegment(type){stopVoice();stopTimers();hideScreens();phase=type;voiceRetries=0;fallback=false;paused=false;locked=false;clock=new F.Clock(type==='text'?config.textSeconds:config.wordSeconds);$('testStage').textContent=type==='text'?'1 · Leitura do texto':'3 · Leitura das palavras';
 if(type==='text'){$('textScreen').hidden=false;$('passageDisplay').textContent=config.passage.replace(/\n{3,}/g,'\n\n');document.body.classList.add('text-focus');$('textScreen').setAttribute('aria-pressed','false');scheduleTextFit();$('transcriptDetails').hidden=config.mode!=='auto';}
 else{$('wordScreen').hidden=false;wordTest=new F.WordTest(config.words);renderWord();}
 displayClock();controls();resumeSegment();scheduleTextFit();
}
function renderWord(){if(!wordTest.word)return;$('wordProgress').textContent=`Palavra ${wordTest.index+1} de ${wordTest.words.length}`;$('wordDisplay').textContent=config.letterCase==='upper'?wordTest.word.toLocaleUpperCase('pt-BR'):wordTest.word.toLocaleLowerCase('pt-BR');$('attemptInfo').textContent=wordTest.waiting?'Primeira tentativa sem correspondência. Leia novamente; o professor pode confirmar a primeira leitura.':'Leia a palavra. Até duas tentativas de reconhecimento.';controls();}
function processWord(text,provisional=false){
 if(phase!=='words'||paused||locked)return;clearWordCandidate();if(wordTest.waiting)wordTest.retry();const outcome=wordTest.hear(text);if(outcome==='correct'&&provisional)wordTest.rows[wordTest.rows.length-1].source='Fala provisória estável: revisar com o professor';$('heard').textContent=`Transcrição: “${text}”`;
 if(outcome==='retry'){renderWord();say('Primeira tentativa sem correspondência. O estudante pode ler novamente; o professor também pode confirmar se o sistema entendeu errado.');}
 else if(outcome==='correct'||outcome==='advance')afterWord(outcome==='correct'?'Correspondência registrada.':'Segunda tentativa sem correspondência registrada. O professor poderá revisar.');
}
function afterWord(message){
 clearWordCandidate();
 if(!wordTest.word){finishSegment('concluido');return;}locked=true;controls();say(message);transitionTimer=setTimeout(()=>{transitionTimer=null;locked=false;if(phase==='words'&&!paused){if(clock.expired(performance.now()))finishSegment('tempo');else{$('heard').textContent='';renderWord();say('Próxima palavra.');}}},650);
}
function finishSegment(reason){
 if(!active())return;closeDecision(false);const previous=phase;clock.pause(performance.now());stopTimers();stopVoice();paused=false;locked=false;
 if(previous==='text'){originalTranscript=transcript;resultAlignment=F.align(config.passage,transcript);phase='textDone';showTransition('Leitura do texto encerrada',reason==='tempo'?'O tempo terminou. A transcrição recebida foi preservada. A seguir, o professor fará as três perguntas.':'A etapa foi encerrada pelo professor. A seguir vêm as três perguntas.','Ir para as perguntas →');}
 else{wordTest.finish();phase='wordsDone';showTransition('Leitura das palavras encerrada','Os registros foram preservados, incluindo a palavra interrompida e as não apresentadas. Agora revise o relatório.','Ver relatório →');}
}
function showTransition(title,info,button){hideScreens();$('transition').hidden=false;$('transitionTitle').textContent=title;$('transitionInfo').textContent=info;$('transitionNext').textContent=button;$('clock').textContent='';$('heard').textContent='';say('');controls();}
$('transitionNext').addEventListener('click',()=>{if(phase==='textDone'){phase='questions';questionIndex=0;showQuestion();}else if(phase==='questionsDone')beginSegment('words');else if(phase==='wordsDone')showReport();});
function showQuestion(){hideScreens();$('questionScreen').hidden=false;$('testStage').textContent='2 · Compreensão do texto';$('clock').textContent='';$('questionNumber').textContent=`Pergunta ${questionIndex+1} de 3`;$('questionText').textContent=config.questions[questionIndex];$('questionStatus').textContent=questionAnswers[questionIndex]?'Registro: '+questionAnswers[questionIndex]:'';$('questionNext').disabled=!questionAnswers[questionIndex];$('questionNext').textContent=questionIndex===2?'Avançar para palavras →':'Próxima pergunta →';for(const button of document.querySelectorAll('[data-question-answer]'))button.classList.toggle('selected',button.dataset.questionAnswer===questionAnswers[questionIndex]);controls();}
for(const button of document.querySelectorAll('[data-question-answer]'))button.addEventListener('click',()=>{questionAnswers[questionIndex]=button.dataset.questionAnswer;showQuestion();});
$('questionNext').addEventListener('click',()=>{if(!questionAnswers[questionIndex])return;if(questionIndex<2){questionIndex++;showQuestion();}else{phase='questionsDone';showTransition('Perguntas registradas','A próxima etapa apresenta uma palavra por vez. O tempo vale para toda a lista. Na primeira tentativa sem correspondência, o professor pode corrigir ou o estudante pode ler novamente.','Iniciar leitura das palavras →');}});
$('pause').addEventListener('click',()=>paused?resumeSegment():pauseSegment());$('resumeVoice').addEventListener('click',()=>{voiceRetries=0;resumeSegment();});
$('withoutVoice').addEventListener('click',()=>{stopVoice();fallback=true;paused=false;runClock();say('Modo sem microfone. O professor acompanha e poderá revisar os registros no relatório.');controls();});
$('retry').addEventListener('click',()=>{if(phase!=='words'||paused||locked)return;wordTest.retry();renderWord();say('Segunda tentativa liberada. Leia novamente.');if(!rec&&config.mode==='auto'&&!fallback)listen();});
$('teacherCorrect').addEventListener('click',()=>{if(phase!=='words'||paused||locked||clock.expired(performance.now())){tick();return;}wordTest.record('Confirmada pelo professor');afterWord('Leitura confirmada pelo professor.');});
$('teacherWrong').addEventListener('click',()=>{if(phase!=='words'||paused||locked)return;if(clock.expired(performance.now())){finishSegment('tempo');return;}wordTest.attempts.push('[Tentativa registrada pelo professor]');if(wordTest.attempts.length>=2){wordTest.record('Sem correspondência após 2 tentativas');afterWord('Segunda tentativa registrada.');}else{wordTest.waiting=true;renderWord();say('Primeira tentativa registrada. Confirme ou libere a segunda tentativa.');}});
$('endStage').addEventListener('click',async()=>{
 if(!active())return;const expectedPhase=phase;
 const accepted=await askDecision({title:'Encerrar esta etapa?',context:phase==='text'?'Leitura do texto':'Leitura das palavras',message:'Tudo o que já foi registrado será preservado. '+(phase==='text'?'Em seguida, você poderá fazer as três perguntas de compreensão.':'Em seguida, você poderá revisar o relatório da sessão.'),confirm:'Encerrar etapa',cancel:phase==='text'?'Continuar leitura':'Voltar à atividade',timed:true});
 if(accepted&&phase===expectedPhase&&active())finishSegment('professor');
});
$('setup').addEventListener('submit',event=>{event.preventDefault();try{for(let n=0;n<3;n++)validateStep(n);stopVoice();stopTimers();config={teacher:$('teacher').value.trim(),student:$('student').value.trim(),className:$('className').value.trim(),date:$('date').value,passage:$('passage').value.trim(),questions:['q1','q2','q3'].map(id=>$(id).value.trim()),words:F.parseWords($('words').value),textSeconds:Number($('textSeconds').value),wordSeconds:Number($('wordSeconds').value),mode:$('mode').value,letterCase:$('letterCase').value};transcript='';originalTranscript='';revision=false;questionAnswers=['','',''];$('notes').value='';$('setup').hidden=true;$('report').hidden=true;$('test').hidden=false;beginSegment('text');}catch(e){$('setupMessage').textContent=e.message;}});
function metric(value,label){const div=document.createElement('div');div.className='metric';const strong=document.createElement('strong'),span=document.createElement('span');strong.textContent=value;span.textContent=label;div.append(strong,span);return div;}
function drawAlignment(){const {counts,ops}=resultAlignment;$('metrics').replaceChildren(metric(counts.match,'Correspondências no texto'),metric(counts.different,'Palavras diferentes'),metric(counts.missing,'Ausentes no meio do texto'),metric(counts.notRead,'Palavras finais sem registro'),metric(counts.extra,'Palavras extras na transcrição'));$('aligned').replaceChildren();for(const op of ops){const span=document.createElement('span');span.className='mark-'+op.type;span.textContent=op.expected||'['+op.heard+']';span.title=op.type==='different'?`Transcrito: ${op.heard}`:op.type==='extra'?'Palavra extra na transcrição':op.type==='match'?'Correspondência na transcrição':'Não consta na transcrição';$('aligned').append(span);}}
function select(options,value,onChange){const select=document.createElement('select');for(const [v,label] of options){const option=document.createElement('option');option.value=v;option.textContent=label;select.append(option);}select.value=value;select.addEventListener('change',()=>onChange(select.value));return select;}
function showReport(){stopVoice();stopTimers();phase='report';$('test').hidden=true;$('report').hidden=false;$('reportStudent').textContent=`Professor: ${config.teacher} · Estudante: ${config.student} · Turma: ${config.className} · Data: ${config.date}`;$('editTranscript').value=transcript;$('revisionMessage').textContent=revision?'Comparação baseada na revisão do professor.':'Comparação automática da transcrição recebida. O professor pode corrigir o texto abaixo.';drawAlignment();$('questionReport').replaceChildren();config.questions.forEach((q,i)=>{const div=document.createElement('div');div.className='question-review';const p=document.createElement('p');p.textContent=`${i+1}. ${q}`;const chooser=select(['Correta','Incorreta','Sem resposta'].map(s=>[s,s]),questionAnswers[i],value=>questionAnswers[i]=value);chooser.setAttribute('aria-label','Revisão da pergunta '+(i+1));div.append(p,chooser);$('questionReport').append(div);});$('wordReport').replaceChildren();for(const row of wordTest.rows){const tr=document.createElement('tr');for(const text of [row.word,row.result+(row.source?' — '+row.source:''),row.attempts.join(' | ')||'—']){const td=document.createElement('td');td.textContent=text;tr.append(td);}const td=document.createElement('td'),chooser=select([['','Sem revisão'],['Certa','Certa'],['Errada','Errada'],['Não avaliada','Não avaliada']],row.review,value=>row.review=value);chooser.setAttribute('aria-label','Revisão da palavra '+row.word);td.append(chooser);tr.append(td);$('wordReport').append(tr);}window.scrollTo({top:0,behavior:'smooth'});}
$('applyTranscript').addEventListener('click',()=>{try{const revised=$('editTranscript').value;const result=F.align(config.passage,revised);transcript=revised;resultAlignment=result;revision=true;drawAlignment();$('revisionMessage').textContent='Revisão aplicada pelo professor. A transcrição original continua preservada no relatório TXT.';}catch(e){$('revisionMessage').textContent=e.message;}});
function reportText(){const c=resultAlignment.counts;return `ZURCHE — ATIVIDADES / FLUÊNCIA LEITORA\nProfessor: ${config.teacher}\nEstudante: ${config.student}\nTurma: ${config.className}\nData: ${config.date}\nModo inicial: ${config.mode==='auto'?'Voz + professor':'Sem microfone'}\nTempos configurados: texto ${config.textSeconds}s; lista de palavras ${config.wordSeconds}s\n\nCOMPARAÇÃO DO TEXTO (${revision?'REVISTA PELO PROFESSOR':'ESTIMATIVA AUTOMÁTICA'})\nCorrespondências: ${c.match}\nDiferentes: ${c.different}\nAusentes no meio: ${c.missing}\nFinal sem registro: ${c.notRead}\nExtras: ${c.extra}\nTexto completo na transcrição: ${resultAlignment.incomplete?'Não':'Sim, segundo a comparação'}\nSem transcrição não significa que o estudante não leu.\n\nTEXTO PROPOSTO\n${config.passage}\n\nTRANSCRIÇÃO ORIGINAL RECEBIDA\n${originalTranscript||'[Nenhuma transcrição]'}\n\nTRANSCRIÇÃO USADA NA COMPARAÇÃO\n${transcript||'[Nenhuma transcrição]'}\n\nDETALHES\n${resultAlignment.ops.map(op=>`${op.expected||'[extra]'} | transcrito: ${op.heard||'—'} | ${op.type}`).join('\n')}\n\nCOMPREENSÃO\n${config.questions.map((q,i)=>`${i+1}. ${q}\n${questionAnswers[i]}`).join('\n\n')}\n\nPALAVRAS\n${wordTest.rows.map((r,i)=>`${i+1}. ${r.word}\nRegistro: ${r.result}\nOrigem: ${r.source||'Transcrição final ou confirmação do professor'}\nTranscrições: ${r.attempts.join(' | ')||'Nenhuma'}\nRevisão do professor: ${r.review||'Sem revisão'}`).join('\n\n')}\n\nOBSERVAÇÕES\n${$('notes').value}\n\nEste é um registro pedagógico assistido por reconhecimento de voz, não uma avaliação validada de fluência ou pronúncia. Os registros de ausência/correspondência podem refletir falhas do reconhecedor.`;}
$('downloadReport').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob(['\uFEFF'+reportText()],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='zurche-fluencia-relatorio.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);});$('printReport').addEventListener('click',async()=>{
 const button=$('printReport'),label=button.textContent;button.disabled=true;button.textContent='Gerando PDF…';$('pdfStatus').textContent='Preparando o relatório, com as revisões atuais.';
 try{await FluenciaReport.download(reportData());$('pdfStatus').textContent='PDF gerado. Confira o arquivo baixado.';}catch(error){$('pdfStatus').textContent=error.message||'Não foi possível gerar o PDF. Confira os arquivos da pasta vendor.';}finally{button.disabled=false;button.textContent=label;}
});
$('newSession').addEventListener('click',async()=>{if(!(await askDecision({title:'Preparar um novo teste?',context:'Relatório da sessão',message:'Baixe o relatório antes de começar outro teste. Professor, turma, materiais e tempos serão mantidos. Você informará o nome do próximo estudante.',confirm:'Preparar novo teste',cancel:'Voltar ao relatório'})))return;stopVoice();stopTimers();phase='setup';$('student').value='';$('voiceConsent').checked=false;$('report').hidden=true;$('setup').hidden=false;showStep(0);$('student').focus();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&active()){tick();if(active()&&!paused&&!rec)queueVoiceRetry();scheduleTextFit();}});window.addEventListener('pagehide',()=>{stopVoice();stopTimers();});$('voiceConsent').addEventListener('change',()=>{if(!$('voiceConsent').checked&&active())pauseSegment('Reconhecimento pausado: autorização desmarcada.');});
function updateSupport(){$('voiceInfo').hidden=$('mode').value!=='auto';$('compatibility').textContent=Speech&&window.isSecureContext?'Reconhecimento disponível neste navegador. O microfone só será ativado ao iniciar o teste.':'Reconhecimento indisponível neste contexto. Você pode usar o modo sem microfone e revisar os registros.';}$('mode').addEventListener('change',updateSupport);
$('example').addEventListener('click',async()=>{if(($('passage').value||$('words').value)&&!(await askDecision({title:'Usar o material de exemplo?',context:'Preparação do material',message:'O texto, as três perguntas e a lista de palavras que você preencheu serão substituídos pelo exemplo. Os dados do professor e do estudante serão mantidos.',confirm:'Usar exemplo',cancel:'Manter meu material'})))return;$('passage').value='Lia tem um gato. O gato se chama Tico. De manhã, Lia coloca água para Tico. Depois, os dois brincam com uma bola no quintal.';$('q1').value='Como se chama o gato de Lia?';$('q2').value='O que Lia coloca para Tico de manhã?';$('q3').value='Onde Lia e Tico brincam?';$('words').value='gato\nbola\ncasa\npato\njanela\nmenina\nágua\nmanhã';});
const dateParts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());$('date').value=['year','month','day'].map(t=>dateParts.find(p=>p.type===t).value).join('-');showStep(0);updateSupport();

// Speech availability never controls the assessment clock.
function voiceInterrupted(message,retry){
 stopVoice();if(!active()||paused)return;if(clock.expired(performance.now())){finishSegment('tempo');return;}
 say(message);controls();scheduleTextFit();if(retry)queueVoiceRetry();
}
function queueVoiceRetry(){
 if(!active()||paused||fallback||config.mode!=='auto'||rec||document.hidden||voiceRetryTimer!==null||voiceRetries>=3)return;
 const expectedPhase=phase;voiceRetries++;
 voiceRetryTimer=setTimeout(()=>{voiceRetryTimer=null;if(phase===expectedPhase&&active()&&!paused&&!rec){if(clock.expired(performance.now()))finishSegment('tempo');else listen();}},500);
}
function fitReadingText(){
 if(phase!=='text')return;const el=$('passageDisplay');if(!el.clientWidth||!el.clientHeight)return;
 let low=.5,high=40,best=.5;
 for(let i=0;i<12;i++){const size=(low+high)/2;el.style.fontSize=size+'px';if(el.scrollHeight<=el.clientHeight&&el.scrollWidth<=el.clientWidth){best=size;low=size;}else high=size;}
 el.style.fontSize=(Math.floor(best*10)/10)+'px';
}
function scheduleTextFit(){if(typeof requestAnimationFrame==='function')requestAnimationFrame(fitReadingText);}
$('textScreen').addEventListener('click',()=>{if(phase==='text'){paused?resumeSegment():pauseSegment('Leitura pausada. Clique novamente no texto para continuar.');scheduleTextFit();}});
$('textScreen').addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&phase==='text'){event.preventDefault();$('textScreen').click();}});
window.addEventListener('resize',scheduleTextFit);window.visualViewport?.addEventListener('resize',scheduleTextFit);
if(typeof ResizeObserver!=='undefined')new ResizeObserver(scheduleTextFit).observe($('passageDisplay'));

function askDecision({title,context,message,confirm,cancel,timed=false}){
 if(decisionResolve)return Promise.resolve(false);
 $('decisionTitle').textContent=title;$('decisionContext').textContent=context;$('decisionMessage').textContent=message;
 $('decisionConfirm').textContent=confirm;$('decisionCancel').textContent=cancel;
 $('decisionHint').hidden=!timed;$('decisionHint').textContent=paused?'A leitura já está pausada. Voltar mantém a pausa.':'O cronômetro continua enquanto você decide. Se o tempo acabar, a etapa será encerrada automaticamente.';
 $('decisionTime').hidden=!timed;$('decisionClock').textContent=timed&&clock?Math.ceil(clock.left(performance.now())/1000)+' s':'';
 return new Promise(resolve=>{decisionResolve=resolve;$('decisionDialog').showModal();$('decisionCancel').focus();});
}
function closeDecision(accepted){
 const resolve=decisionResolve;decisionResolve=null;
 if($('decisionDialog').open)$('decisionDialog').close();
 if(resolve)resolve(accepted);
}
$('decisionConfirm').addEventListener('click',()=>closeDecision(true));
$('decisionCancel').addEventListener('click',()=>closeDecision(false));
$('decisionClose').addEventListener('click',()=>closeDecision(false));
$('decisionDialog').addEventListener('cancel',event=>{event.preventDefault();closeDecision(false);});
$('decisionDialog').addEventListener('close',()=>{if(decisionResolve)closeDecision(false);});

function reportData(){return {config,alignment:resultAlignment,questions:[...questionAnswers],rows:wordTest.rows,transcript,originalTranscript,revision,notes:$('notes').value};}
function clearWordCandidate(){if(wordCandidate){clearTimeout(wordCandidate.timer);wordCandidate=null;}}
function updateWordVoiceState(){
 const el=$('wordVoiceState');
 el.textContent=paused?'Leitura pausada':config.mode==='manual'||fallback?'Acompanhamento sem microfone':rec?(voiceReady?'Microfone ativo · aguardando a palavra':'Ativando o microfone…'):'Microfone interrompido · use Retomar escuta';
 el.dataset.listening=!!rec&&voiceReady&&!paused?'true':'false';
}
function handleWordSpeech(event,token,consumed,provisionalRows){
 const finals=[];let interim=null;
 for(let i=event.resultIndex||0;i<event.results.length;i++){
  const result=event.results[i];if(consumed.has(i)){if(result.isFinal&&provisionalRows.has(i)){const row=provisionalRows.get(i);row.finalTranscript=result[0].transcript;row.source=F.matchWord(row.word,row.finalTranscript)?'Fala provisória confirmada na transcrição final':'Fala provisória; transcrição final diferente: “'+row.finalTranscript+'” — revisar';provisionalRows.delete(i);}continue;}
  if(result.isFinal){consumed.add(i);if(F.tokens(result[0].transcript).length)finals.push({index:i,text:result[0].transcript});}
  else interim={index:i,text:result[0].transcript};
 }
 if(phase!=='words'||paused||locked||!wordTest?.word)return;
 if(clock.expired(performance.now())){finishSegment('tempo');return;}
 if(finals.length){voiceRetries=0;clearWordCandidate();processWord(finals[0].text);return;}
 if(!interim)return;
 $('heard').textContent=`Ouvindo: “${interim.text}”`;$('wordVoiceState').textContent='Voz detectada · reconhecendo a palavra…';
 if(!F.matchWord(wordTest.word,interim.text)){clearWordCandidate();return;}
 const index=wordTest.index,phrase=F.norm(F.tokens(interim.text).join(' '));
 if(wordCandidate&&wordCandidate.index===index&&wordCandidate.resultIndex===interim.index&&wordCandidate.phrase===phrase)return;
 clearWordCandidate();
 const candidate={index,resultIndex:interim.index,phrase,text:interim.text,timer:null};wordCandidate=candidate;
 candidate.timer=setTimeout(()=>{
  if(wordCandidate!==candidate)return;wordCandidate=null;
  if(token!==voiceVersion||phase!=='words'||paused||locked||wordTest.index!==index||consumed.has(candidate.resultIndex))return;
  if(clock.expired(performance.now())){finishSegment('tempo');return;}
  consumed.add(candidate.resultIndex);voiceRetries=0;const rowIndex=wordTest.rows.length;processWord(candidate.text,true);if(wordTest.rows.length>rowIndex)provisionalRows.set(candidate.resultIndex,wordTest.rows[rowIndex]);
 },550);
}
