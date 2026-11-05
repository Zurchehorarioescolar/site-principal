'use strict';
const $=id=>document.getElementById(id),F=Fluencia,Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
let step=0,config=null,phase='setup',clock=null,ticker=null,rec=null,voiceVersion=0,paused=false,locked=false,transitionTimer=null,fallback=false,transcript='',originalTranscript='',revision=false,wordTest=null,questionIndex=0,questionAnswers=['','',''],resultAlignment=null,voiceRetryTimer=null,voiceRetries=0,decisionResolve=null,wordCandidate=null,voiceReady=false;
let profile=null, countdownTimer=null;
let textPreview='', textUsedProvisional=false, voiceStartTimer=null;
const active=()=>['text','words'].includes(phase),say=message=>$('status').textContent=message;
function showStep(n){if(step===2&&n!==2)window.FluenciaMicrofone?.stop();step=n;for(const el of document.querySelectorAll('[data-panel]'))el.hidden=Number(el.dataset.panel)!==n;for(const el of document.querySelectorAll('[data-step]'))el.classList.toggle('active',Number(el.dataset.step)===n);$('previous').hidden=n===0;$('next').hidden=n===3;$('setupMessage').textContent='';if(n===1)updateMaterialChoices();if(n===3)reviewSetup();}
function validateStep(n){
 const ids=n===0?['teacher','student','className','date']:n===1?['passage','q1','q2','q3','words',...(protocolSelected()?[]:['textSeconds','wordSeconds'])]:[];
 for(const id of ids){const el=$(id);if(!el.value.trim()||!el.reportValidity()){el.focus();throw Error('Preencha os campos desta etapa.');}}
 if(n===1){const count=F.tokens($('passage').value).length;if(!count||count>600)throw Error('O texto deve ter de 1 a 600 palavras.');const words=F.parseWords($('words').value);if(protocolSelected()){if(words.length!==12)throw Error('O percurso do protocolo precisa de exatamente 12 palavras.');return;}new F.Clock(Number($('textSeconds').value));new F.Clock(Number($('wordSeconds').value));}
 if(n===2&&$('mode').value==='auto'){if(!$('voiceConsent').checked)throw Error('Marque a autorização de voz ou escolha o modo sem microfone.');if(!Speech||!window.isSecureContext)throw Error('Reconhecimento indisponível. Use o modo sem microfone ou abra pelo portal HTTPS / iniciador local em navegador compatível.');}
}
function reviewSetup(){const list=document.createElement('dl');for(const [label,value] of [['Professor',$('teacher').value],['Estudante',$('student').value],['Ano/série / data',$('className').value+' · '+$('date').value],['Aplicação',protocolSelected()?'Cartela → encaminhamento pelo professor → perfil':'Texto → perguntas → palavras'],['Texto',F.tokens($('passage').value).length+' palavras · '+(protocolSelected()?'tempo medido':$('textSeconds').value+' s')],['Compreensão','3 perguntas avaliadas pelo professor'],['Lista',F.parseWords($('words').value).length+' palavras · '+(protocolSelected()?'cartela sem tempo limite':$('wordSeconds').value+' s no total')],['Modo',$('mode').selectedOptions[0].textContent]]){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;list.append(dt,dd);}$('reviewSetup').replaceChildren(list);}
$('next').addEventListener('click',()=>{try{validateStep(step);showStep(step+1);}catch(e){$('setupMessage').textContent=e.message;}});$('previous').addEventListener('click',()=>showStep(step-1));
function stopVoice(){
 if(textPreview){transcript=joinTranscript(transcript,textPreview);textUsedProvisional=true;textPreview='';}
 clearWordCandidate();voiceReady=false;clearTimeout(voiceRetryTimer);voiceRetryTimer=null;
 clearTimeout(voiceStartTimer);voiceStartTimer=null;voiceVersion++;
 if(rec){const old=rec;rec=null;old.onstart=old.onresult=old.onerror=old.onspeechstart=old.onend=null;try{old.abort();}catch{}}
}
function stopTimers(){clearTimeout(countdownTimer);countdownTimer=null;clearInterval(ticker);ticker=null;clearTimeout(transitionTimer);transitionTimer=null;}
function controls(){
 const live=active(),canUseVoiceControls=live&&config.mode==='auto'&&!fallback&&!paused&&!locked;
 $('testControls').hidden=!live;$('markReadingStart').hidden=phase!=='text'||!profile||clock.started||paused;$('pause').textContent=paused?'Continuar':'Pausar';$('pause').hidden=phase==='text';
 $('resumeVoice').hidden=!canUseVoiceControls;$('resumeVoice').textContent=rec?'Reiniciar escuta':'Retomar escuta';
 $('withoutVoice').hidden=!canUseVoiceControls||!!rec;
 $('teacherCorrect').hidden=phase!=='words';$('retry').hidden=phase!=='words'||!wordTest.waiting;
 $('teacherWrong').hidden=phase!=='words'||config.mode!=='manual'&&!fallback;
 for(const id of ['teacherCorrect','retry','teacherWrong'])$(id).disabled=paused||locked;
 if(phase==='words')updateWordVoiceState();
}
function displayClock(){if(!clock||!active()){$('clock').textContent='';return;}const elapsed=phase==='text'&&profile;const seconds=elapsed?Math.floor(clock.elapsed(performance.now())/1000):Math.ceil(clock.left(performance.now())/1000);$('clock').textContent=seconds+' s';if($('decisionDialog').open)$('decisionClock').textContent=seconds+' s';$('clock').classList.toggle('warning',!elapsed&&seconds<=5);}
function tick(){if(!active()||paused)return;displayClock();if(clock.expired(performance.now()))finishSegment('tempo');}
function runClock(){if(!profile||clock.started)clock.start(performance.now());clearInterval(ticker);ticker=setInterval(tick,100);displayClock();}
function pauseSegment(message='Etapa pausada. Clique em Continuar para retomar.'){
 if(!active())return;if(clock.expired(performance.now())){finishSegment('tempo');return;}clock.pause(performance.now());paused=true;$('textScreen').setAttribute('aria-pressed','true');stopVoice();stopTimers();locked=false;controls();displayClock();say(message);
}
function createVoiceRecognition(){
 if(!Speech||!window.isSecureContext)throw Error('Reconhecimento de voz indisponível neste navegador. Abra a atividade em um navegador compatível, pelo endereço HTTPS do portal.');
 const instance=new Speech();
 instance.lang='pt-BR';
 instance.continuous=true;
 instance.interimResults=true;
 instance.maxAlternatives=1;
 return instance;
}
function voiceErrorMessage(code){
 return ({
  'not-allowed':'Microfone não autorizado. Confira a permissão do site no navegador.',
  'service-not-allowed':'Serviço de reconhecimento bloqueado pelo navegador.',
  'audio-capture':'Microfone indisponível. Confira o dispositivo padrão do navegador.',
  'network':'Falha de rede no serviço de reconhecimento. Confira a conexão.',
  'no-speech':'Nenhuma fala reconhecida. Confira o microfone padrão e fale perto dele.',
  'language-not-supported':'Português indisponível no serviço de reconhecimento.'
 })[code]||'Escuta interrompida.';
}
function joinTranscript(previous,next){return [previous,next].filter(Boolean).join(' ').trim();}
function listen(){
 if(!active()||locked||rec||config.mode!=='auto'||fallback)return;
 let instance;
 try{instance=createVoiceRecognition();}catch(error){voiceInterrupted(error.message+' O tempo continua correndo.',false);return;}
 const token=++voiceVersion;rec=instance;
 let processed=0;const consumed=new Set(),provisionalRows=new Map();
 say('Ativando a escuta. A contagem já está em andamento.');controls();
 instance.onstart=()=>{
  if(token!==voiceVersion||paused)return;
  clearTimeout(voiceStartTimer);voiceStartTimer=null;voiceReady=true;
  say(profile?'Escuta ativa. O cronômetro começa quando a leitura for detectada ou marcada pelo professor.':'Escuta ativa. Pode começar a leitura.');controls();
 };
 instance.onresult=event=>{
  if(token!==voiceVersion||!active()||paused)return;
  if(clock.expired(performance.now())){finishSegment('tempo');return;}
  if(phase==='words'){handleWordSpeech(event,token,consumed,provisionalRows);return;}
  if(profile&&event.results.length)markReadingStart();
  const finals=[],provisional=[];
  for(let i=processed;i<event.results.length;i++){
   const result=event.results[i],chunk=result[0].transcript.trim();
   if(result.isFinal){processed=i+1;finals.push(chunk);}
   else provisional.push(chunk);
  }
  const next=joinTranscript(transcript,finals.join(' '));
  const preview=provisional.join(' ').trim();
  const received=joinTranscript(next,preview);
  if(F.tokens(received).length>1200){stopVoice();fallback=true;controls();say('A transcrição atingiu o limite de 1.200 palavras. O tempo continua correndo.');return;}
  transcript=next;textPreview=preview;$('liveTranscript').textContent=received;
  if(finals.length||preview){voiceRetries=0;say('Leitura recebida pelo reconhecimento de voz.');}
 };
 instance.onerror=event=>{if(token!==voiceVersion)return;voiceInterrupted(voiceErrorMessage(event.error)+' O tempo continua correndo.',!['not-allowed','service-not-allowed','language-not-supported'].includes(event.error));};
 instance.onspeechstart=()=>{if(token!==voiceVersion||paused)return;if(phase==='words')$('wordVoiceState').textContent='Recebendo voz…';else{markReadingStart();say('Voz detectada. Aguardando transcrição…');}};
 instance.onend=()=>{if(token!==voiceVersion)return;voiceInterrupted('O serviço de voz interrompeu a escuta. O tempo continua correndo.',true);};
 voiceStartTimer=setTimeout(()=>{if(token===voiceVersion)voiceInterrupted('A escuta demorou para iniciar. O tempo continua correndo.',true);},8000);
 try{instance.start();}catch{voiceInterrupted('Não foi possível abrir o microfone. O tempo continua; tente Retomar escuta.',true);}
}
function resumeSegment(){if(!active())return;paused=false;$('textScreen').setAttribute('aria-pressed','false');runClock();if(phase==='words')renderWord();controls();if(config.mode==='auto'&&!fallback)listen();else say(profile&&!clock.started?'Clique em Começou a ler ao ouvir a primeira palavra.':'Etapa em andamento, com acompanhamento do professor.');}
function hideScreens(){document.body.classList.remove('text-focus');for(const id of ['textScreen','questionScreen','wordScreen','transition','countdownScreen','protocolScreen'])$(id).hidden=true;$('transcriptDetails').hidden=true;$('heard').textContent='';}
function beginSegment(type){stopVoice();stopTimers();hideScreens();phase=type;voiceRetries=0;fallback=false;paused=false;locked=false;clock=profile&&type==='text'?new ReadingStopwatch():new F.Clock(type==='text'?config.textSeconds:config.wordSeconds);$('testStage').textContent=type==='text'?(profile?'2 · Leitura do texto':'1 · Leitura do texto'):'3 · Leitura das palavras';
 if(type==='text'){
  $('textScreen').hidden=false;
  $('passageDisplay').textContent=formatReadingLetters(config.passage.replace(/\n{3,}/g,'\n\n'));
  $('liveTranscript').textContent='';
  document.body.classList.add('text-focus');$('textScreen').setAttribute('aria-pressed','false');
  scheduleTextFit();$('transcriptDetails').hidden=config.mode!=='auto';
 }
 else{$('wordScreen').hidden=false;wordTest=new F.WordTest(config.words);renderWord();}
 displayClock();controls();resumeSegment();scheduleTextFit();
}
function formatReadingLetters(value){return config.letterCase==='upper'?value.toLocaleUpperCase('pt-BR'):value.toLocaleLowerCase('pt-BR');}
function renderWord(){if(!wordTest.word)return;$('wordProgress').textContent=`Palavra ${wordTest.index+1} de ${wordTest.words.length}`;$('wordDisplay').textContent=formatReadingLetters(wordTest.word);$('attemptInfo').textContent=wordTest.waiting?'Primeira tentativa sem correspondência. Leia novamente; o professor pode confirmar a primeira leitura.':'Leia a palavra. Até duas tentativas de reconhecimento.';controls();}
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
 if(previous==='text'){
  originalTranscript=transcript;resultAlignment=F.align(config.passage,transcript);phase='textDone';
  if(profile){profile.textRead=true;profile.elapsed=clock.started?Math.ceil(clock.elapsed(performance.now())/1000):null;showProfileReview();return;}
  const ending=reason==='tempo'?'O tempo terminou.':'A etapa foi encerrada pelo professor.';
  let capture='';
  if(config.mode==='auto')capture=transcript
   ? textUsedProvisional?' A transcrição inclui trechos provisórios para revisão no relatório.':' A transcrição recebida foi preservada.'
   : ' O navegador não retornou uma transcrição. O professor poderá registrar a leitura no relatório.';
  showTransition('Leitura do texto encerrada',ending+capture+' A seguir vêm as três perguntas.','Ir para as perguntas →');
 }
 else{wordTest.finish();phase='wordsDone';showTransition('Leitura das palavras encerrada','Os registros foram preservados, incluindo a palavra interrompida e as não apresentadas. Agora revise o relatório.','Ver relatório →');}
}
function showTransition(title,info,button){hideScreens();$('transition').hidden=false;$('transitionTitle').textContent=title;$('transitionInfo').textContent=info;$('transitionNext').textContent=button;$('clock').textContent='';$('heard').textContent='';say('');controls();}
$('transitionNext').addEventListener('click',()=>{if(phase==='textDone'){phase='questions';questionIndex=0;showQuestion();}else if(phase==='questionsDone')prepareReading(()=>beginSegment('words'));else if(phase==='wordsDone')showReport();});
function showQuestion(){hideScreens();$('questionScreen').hidden=false;$('testStage').textContent=profile?'3 · Compreensão do texto':'2 · Compreensão do texto';$('clock').textContent='';$('questionNumber').textContent=`Pergunta ${questionIndex+1} de 3`;$('questionText').textContent=config.questions[questionIndex];$('questionStatus').textContent=questionAnswers[questionIndex]?'Registro: '+questionAnswers[questionIndex]:'';$('questionNext').disabled=!questionAnswers[questionIndex];$('questionNext').textContent=questionIndex===2?(profile?'Ver relatório →':'Avançar para palavras →'):'Próxima pergunta →';for(const button of document.querySelectorAll('[data-question-answer]'))button.classList.toggle('selected',button.dataset.questionAnswer===questionAnswers[questionIndex]);controls();}
for(const button of document.querySelectorAll('[data-question-answer]'))button.addEventListener('click',()=>{questionAnswers[questionIndex]=button.dataset.questionAnswer;showQuestion();});
$('questionNext').addEventListener('click',()=>{if(!questionAnswers[questionIndex])return;if(questionIndex<2){questionIndex++;showQuestion();}else if(profile)showReport();else{phase='questionsDone';showTransition('Perguntas registradas','A próxima etapa apresenta uma palavra por vez. O tempo vale para toda a lista. Na primeira tentativa sem correspondência, o professor pode corrigir ou o estudante pode ler novamente.','Iniciar leitura das palavras →');}});
$('pause').addEventListener('click',()=>paused?resumeSegment():pauseSegment());
$('resumeVoice').addEventListener('click',()=>{
 if($('resumeVoice').hidden)return;
 if(clock.expired(performance.now())){finishSegment('tempo');return;}
 stopVoice();voiceRetries=0;listen();
});
$('withoutVoice').addEventListener('click',()=>{stopVoice();fallback=true;paused=false;runClock();say('Modo sem microfone. O professor acompanha e poderá revisar os registros no relatório.');controls();});
$('retry').addEventListener('click',()=>{if(phase!=='words'||paused||locked)return;wordTest.retry();renderWord();say('Segunda tentativa liberada. Leia novamente.');if(!rec&&config.mode==='auto'&&!fallback)listen();});
$('teacherCorrect').addEventListener('click',()=>{if(phase!=='words'||paused||locked||clock.expired(performance.now())){tick();return;}wordTest.record('Confirmada pelo professor');afterWord('Leitura confirmada pelo professor.');});
$('teacherWrong').addEventListener('click',()=>{if(phase!=='words'||paused||locked)return;if(clock.expired(performance.now())){finishSegment('tempo');return;}wordTest.attempts.push('[Tentativa registrada pelo professor]');if(wordTest.attempts.length>=2){wordTest.record('Sem correspondência após 2 tentativas');afterWord('Segunda tentativa registrada.');}else{wordTest.waiting=true;renderWord();say('Primeira tentativa registrada. Confirme ou libere a segunda tentativa.');}});
$('endStage').addEventListener('click',async()=>{
 if(!active())return;const expectedPhase=phase;
 const accepted=await askDecision({title:'Encerrar esta etapa?',context:phase==='text'?'Leitura do texto':'Leitura das palavras',message:'Tudo o que já foi registrado será preservado. '+(phase==='text'?'Em seguida, você poderá fazer as três perguntas de compreensão.':'Em seguida, você poderá revisar o relatório da sessão.'),confirm:'Encerrar etapa',cancel:phase==='text'?'Continuar leitura':'Voltar à atividade',timed:!profile});
 if(accepted&&phase===expectedPhase&&active())finishSegment('professor');
});
$('setup').addEventListener('submit',event=>{event.preventDefault();try{for(let n=0;n<3;n++)validateStep(n);stopVoice();stopTimers();config={teacher:$('teacher').value.trim(),student:$('student').value.trim(),className:$('className').value.trim(),date:$('date').value,passage:$('passage').value.trim(),questions:['q1','q2','q3'].map(id=>$(id).value.trim()),words:F.parseWords($('words').value),textSeconds:Number($('textSeconds').value),wordSeconds:Number($('wordSeconds').value),mode:$('mode').value,letterCase:$('letterCase').value};transcript='';originalTranscript='';textUsedProvisional=false;revision=false;questionAnswers=['','',''];profile=protocolSelected()?{textRead:false,correct:0,label:'Evidências insuficientes',evidence:''}:null;resultAlignment=F.align(config.passage,'');$('notes').value='';$('setup').hidden=true;$('report').hidden=true;$('test').hidden=false;if(profile)prepareReading(showWordCard);else prepareReading(()=>beginSegment('text'));}catch(e){$('setupMessage').textContent=e.message;}});
function metric(value,label){const div=document.createElement('div');div.className='metric';const strong=document.createElement('strong'),span=document.createElement('span');strong.textContent=value;span.textContent=label;div.append(strong,span);return div;}
function drawAlignment(){const {counts,ops}=resultAlignment;$('metrics').replaceChildren(metric(counts.match,'Correspondências no texto'),metric(counts.different,'Palavras diferentes'),metric(counts.missing,'Ausentes no meio do texto'),metric(counts.notRead,'Palavras finais sem registro'),metric(counts.extra,'Palavras extras na transcrição'));$('aligned').replaceChildren();for(const op of ops){const span=document.createElement('span');span.className='mark-'+op.type;span.textContent=op.expected||'['+op.heard+']';span.title=op.type==='different'?`Transcrito: ${op.heard}`:op.type==='extra'?'Palavra extra na transcrição':op.type==='match'?'Correspondência na transcrição':'Não consta na transcrição';$('aligned').append(span);}}
function select(options,value,onChange){const select=document.createElement('select');for(const [v,label] of options){const option=document.createElement('option');option.value=v;option.textContent=label;select.append(option);}select.value=value;select.addEventListener('change',()=>onChange(select.value));return select;}
function showReport(){stopVoice();stopTimers();phase='report';$('profileReport').hidden=!profile;$('profileReport').textContent=profile?profileSummary():'';$('textReport').hidden=!!profile&&!profile.textRead;$('test').hidden=true;$('report').hidden=false;$('reportStudent').textContent=`Professor: ${config.teacher} · Estudante: ${config.student} · Ano/série: ${config.className} · Data: ${config.date}`;$('editTranscript').value=transcript;$('revisionMessage').textContent=revision?'Comparação baseada na revisão do professor.':textUsedProvisional?'A transcrição inclui trechos provisórios do navegador. Revise o texto antes de concluir a avaliação.':'Comparação automática da transcrição recebida. O professor pode corrigir o texto abaixo.';drawAlignment();$('questionReport').replaceChildren();config.questions.forEach((q,i)=>{const div=document.createElement('div');div.className='question-review';const p=document.createElement('p');p.textContent=`${i+1}. ${q}`;const chooser=select(['Correta','Incorreta','Sem resposta'].map(s=>[s,s]),questionAnswers[i],value=>questionAnswers[i]=value);chooser.setAttribute('aria-label','Revisão da pergunta '+(i+1));div.append(p,chooser);$('questionReport').append(div);});$('wordReport').replaceChildren();for(const row of wordTest.rows){const tr=document.createElement('tr');for(const text of [row.word,row.result+(row.source?' — '+row.source:''),row.attempts.join(' | ')||'—']){const td=document.createElement('td');td.textContent=text;tr.append(td);}const td=document.createElement('td'),chooser=select([['','Sem revisão'],['Certa','Certa'],['Errada','Errada'],['Não avaliada','Não avaliada']],row.review,value=>row.review=value);chooser.disabled=!!profile;chooser.setAttribute('aria-label','Revisão da palavra '+row.word);td.append(chooser);tr.append(td);$('wordReport').append(tr);}window.scrollTo({top:0,behavior:'smooth'});}
$('applyTranscript').addEventListener('click',()=>{try{const revised=$('editTranscript').value;const result=F.align(config.passage,revised);transcript=revised;resultAlignment=result;revision=true;drawAlignment();$('revisionMessage').textContent='Revisão aplicada pelo professor. A transcrição original continua preservada no relatório TXT.';}catch(e){$('revisionMessage').textContent=e.message;}});
function reportText(){const c=resultAlignment.counts;return `ZURCHE — ATIVIDADES / FLUÊNCIA LEITORA\nProfessor: ${config.teacher}\nEstudante: ${config.student}\nAno/série: ${config.className}\nData: ${config.date}${profile?'\n'+profileSummary():`\nModo inicial: ${config.mode==='auto'?'Voz + professor':'Sem microfone'}\nTempos configurados: texto ${config.textSeconds}s; lista de palavras ${config.wordSeconds}s`}${profile&&!profile.textRead?'\n\nTexto e compreensão não aplicados.':`\n\nCOMPARAÇÃO DO TEXTO (${revision?'REVISTA PELO PROFESSOR':'ESTIMATIVA AUTOMÁTICA'})\nCorrespondências: ${c.match}\nDiferentes: ${c.different}\nAusentes no meio: ${c.missing}\nFinal sem registro: ${c.notRead}\nExtras: ${c.extra}\nTexto completo na transcrição: ${resultAlignment.incomplete?'Não':'Sim, segundo a comparação'}\nSem transcrição não significa que o estudante não leu.\n\nTEXTO PROPOSTO\n${config.passage}\n\nTRANSCRIÇÃO ORIGINAL RECEBIDA\n${textUsedProvisional?'Inclui trechos provisórios recebidos pelo navegador. Confira a leitura com o estudante.\n':''}${originalTranscript||'[Nenhuma transcrição]'}\n\nTRANSCRIÇÃO USADA NA COMPARAÇÃO\n${transcript||'[Nenhuma transcrição]'}\n\nDETALHES\n${resultAlignment.ops.map(op=>`${op.expected||'[extra]'} | transcrito: ${op.heard||'—'} | ${op.type}`).join('\n')}\n\nCOMPREENSÃO\n${config.questions.map((q,i)=>`${i+1}. ${q}\n${questionAnswers[i]}`).join('\n\n')}`}\n\nPALAVRAS\n${wordTest.rows.map((r,i)=>`${i+1}. ${r.word}\nRegistro: ${r.result}\nOrigem: ${r.source||'Transcrição final ou confirmação do professor'}\nTranscrições: ${r.attempts.join(' | ')||'Nenhuma'}\nRevisão do professor: ${r.review||'Sem revisão'}`).join('\n\n')}\n\nOBSERVAÇÕES\n${$('notes').value}\n\nEste é um registro pedagógico assistido por reconhecimento de voz, não uma avaliação validada de fluência ou pronúncia. Os registros de ausência/correspondência podem refletir falhas do reconhecedor.`;}
$('downloadReport').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob(['\uFEFF'+reportText()],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='zurche-fluencia-relatorio.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);});$('printReport').addEventListener('click',async()=>{
 const button=$('printReport'),label=button.textContent;button.disabled=true;button.textContent='Gerando PDF…';$('pdfStatus').textContent='Preparando o relatório, com as revisões atuais.';
 try{await FluenciaReport.download(reportData());$('pdfStatus').textContent='PDF gerado. Confira o arquivo baixado.';}catch(error){$('pdfStatus').textContent=error.message||'Não foi possível gerar o PDF. Confira os arquivos da pasta vendor.';}finally{button.disabled=false;button.textContent=label;}
});
$('newSession').addEventListener('click',async()=>{if(!(await askDecision({title:'Preparar um novo teste?',context:'Relatório da sessão',message:'Baixe o relatório antes de começar outro teste. Professor, ano/série, materiais e tempos serão mantidos. Você informará o nome do próximo estudante.',confirm:'Preparar novo teste',cancel:'Voltar ao relatório'})))return;stopVoice();stopTimers();phase='setup';$('student').value='';$('voiceConsent').checked=false;$('report').hidden=true;$('setup').hidden=false;showStep(0);$('student').focus();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&active()){tick();if(active()&&!paused&&!rec)queueVoiceRetry();scheduleTextFit();}});window.addEventListener('pagehide',()=>{stopVoice();stopTimers();});$('voiceConsent').addEventListener('change',()=>{if(!$('voiceConsent').checked&&active())pauseSegment('Reconhecimento pausado: autorização desmarcada.');});
function updateSupport(){$('voiceInfo').hidden=$('mode').value!=='auto';$('compatibility').textContent=Speech&&window.isSecureContext?'O navegador oferece reconhecimento de voz. Use o teste de transcrição abaixo para conferir a escuta antes de começar.':'Reconhecimento indisponível neste contexto. Você pode usar o modo sem microfone e revisar os registros.';}$('mode').addEventListener('change',updateSupport);
function protocolSelected(){return $('readingFlow').value==='protocol';}
function updateReadingFlow(){
 for(const section of document.querySelectorAll('[data-practice-time]'))section.hidden=protocolSelected();
 $('protocolHelp').hidden=!protocolSelected();
}
$('readingFlow').addEventListener('change',updateReadingFlow);
updateReadingFlow();

class ReadingStopwatch {
 started=false;
 since=null;
 duration=0;
 start(now){this.started=true;this.since??=now;}
 elapsed(now){return this.duration+(this.since===null?0:now-this.since);}
 pause(now){this.duration=this.elapsed(now);this.since=null;}
 expired(){return false;}
 left(now){return this.elapsed(now);}
}

function markReadingStart(){
 if(!profile||phase!=='text'||paused||clock.started)return;
 clock.start(performance.now());displayClock();controls();
}
$('markReadingStart').addEventListener('click',markReadingStart);

function prepareReading(begin){
 // Older embeds without a mode field keep their immediate start.
 if(!$('readingFlow').value){begin();return;}
 stopVoice();stopTimers();hideScreens();phase='countdown';controls();say('');
 $('clock').textContent='';$('testStage').textContent='Preparação';
 $('countdownScreen').hidden=false;
 const ends=performance.now()+3000;
 const step=()=>{
  if(phase!=='countdown')return;
  const remaining=ends-performance.now();
  if(remaining<=0){countdownTimer=null;begin();return;}
  const digit=Math.ceil(remaining/1000);
  $('readingCountdown').textContent=digit;
  countdownTimer=setTimeout(step,remaining-(digit-1)*1000);
 };
 step();
}

function protocolPanel(stage,title,instructions,button){
 hideScreens();phase=stage;controls();say('');
 $('clock').textContent='';$('testStage').textContent='Percurso do protocolo';
 $('protocolTitle').textContent=title;$('protocolInstructions').textContent=instructions;
 $('protocolItems').replaceChildren();$('protocolItems').className='';
 $('protocolMessage').textContent='';$('protocolNext').textContent=button;
 $('protocolScreen').hidden=false;
}

function renderCard(items){
 $('protocolItems').className='reading-card';
 for(const item of items){const word=document.createElement('span');word.textContent=formatReadingLetters(item);$('protocolItems').append(word);}
}
function showWordCard(){
 protocolPanel('wordCard','Leitura da cartela','Peça ao estudante que leia as palavras no próprio ritmo, sem dicas. Acompanhe os acertos para registrá-los ao final.','Registrar leitura →');
 renderCard(config.words);
}
function showCardReview(){
 protocolPanel('cardReview','Revisão da cartela','Marque cada palavra. Considere correta a leitura silabada quando o estudante também disser a palavra inteira.','Ver próxima etapa →');
 $('protocolItems').className='reading-review';
 for(const [index,word] of config.words.entries()){
  const label=document.createElement('label');
  label.textContent=word;
  const input=select([['','Selecione'],['Certa','Certa'],['Errada','Errada'],['Não avaliada','Não avaliada']],'',()=>{});
  input.id='cardResult'+index;label.append(input);$('protocolItems').append(label);
 }
}
function checkWordCard(){
 const results=config.words.map((_,index)=>$('cardResult'+index).value);
 if(results.includes('')){$('protocolMessage').textContent='Registre cada palavra antes de avançar.';return;}
 wordTest=new F.WordTest(config.words);
 for(const result of results){
  wordTest.record(result);
  Object.assign(wordTest.rows.at(-1),{review:result,source:'Observação do professor'});
 }
 profile.correct=results.filter(result=>result==='Certa').length;
 profile.evidence=profile.correct+' de 12 palavras corretas na cartela.';
 if(results.includes('Não avaliada')){profile.evidence+=' A cartela ficou incompleta.';showReport();return;}
 if(profile.correct<=4){
  protocolPanel('syllableReady','Leitura de sílabas','Peça ao estudante que leia algumas sílabas simples.','Apresentar sílabas →');
 }else if(profile.correct<=8){
  profile.label='Leitor de palavras';showReport();
 }else{
  protocolPanel('textReady','Leitura do texto','Inicie quando o estudante estiver pronto. Marque o início ao ouvir a primeira palavra e encerre na última. O microfone também pode detectar o início.','Apresentar texto →');
 }
}
function showSyllables(){
 protocolPanel('syllables','Leitura de sílabas','Observe a leitura das sílabas.','Registrar observação →');
 renderCard(['ma','pa','la','ta']);
}
function showSyllableReview(){
 protocolPanel('syllableReview','Observação das sílabas','O estudante conseguiu ler sílabas?','Ver relatório →');
 $('protocolItems').innerHTML='<label for="syllableResult">Leitura de sílabas</label><select id="syllableResult"><option value="">Selecione</option><option value="yes">Sim</option><option value="no">Não</option><option value="unknown">Evidência insuficiente</option></select>';
}
function showProfileReview(){
 protocolPanel('profileReview','Observação da leitura do texto','Compare a leitura observada com os critérios da cartela usada. Registre apenas os critérios que puder confirmar.','Ir para as perguntas →');
 $('protocolItems').innerHTML=`<p>Tempo registrado: ${profile.elapsed===null?'não medido':profile.elapsed+' s'}.</p>
 <label for="readingProsody">Prosódia (ritmo, pausas e entonação)</label><select id="readingProsody"><option value="">Sem observação</option><option value="boa">Boa</option><option value="média">Média</option><option value="baixa">Baixa</option></select>
 <label for="readingAccuracy">Precisão conforme o limite de erros da cartela</label><select id="readingAccuracy"><option value="">Sem referência ou observação</option><option value="sim">Dentro do limite</option><option value="não">Acima do limite de erros</option></select>
 <label for="readingPace">Tempo conforme a referência da cartela</label><select id="readingPace"><option value="">Sem referência ou medição</option><option value="sim">Dentro da referência</option><option value="não">Acima do tempo de referência</option></select>`;
}
function classifyText(){
 const prosody=$('readingProsody').value,accuracy=$('readingAccuracy').value,pace=$('readingPace').value;
 profile.evidence+=` Tempo registrado: ${profile.elapsed===null?'não medido':profile.elapsed+' s'}. Prosódia: ${prosody||'sem observação'}. Precisão dentro do limite: ${accuracy||'sem registro'}. Tempo dentro da referência: ${pace||'sem registro'}.`;
 if(!prosody||!accuracy||!pace)return;
 const met=accuracy==='sim'&&pace==='sim';
 if(prosody==='boa')profile.label=met?'Leitor de texto com fluência':'Leitor de texto sem fluência';
 if(prosody==='média')profile.label=met?'Leitor de texto sem fluência':'Leitor de frases';
}
function profileSummary(){return 'Perfil de leitura — '+profile.label+'. '+profile.evidence;}
$('protocolNext').addEventListener('click',()=>{
 if(phase==='wordCard')showCardReview();
 else if(phase==='cardReview')checkWordCard();
 else if(phase==='syllableReady')prepareReading(showSyllables);
 else if(phase==='syllables')showSyllableReview();
 else if(phase==='syllableReview'){
  const result=$('syllableResult').value;
  if(!result){$('protocolMessage').textContent='Registre a observação das sílabas.';return;}
  if(result==='yes')profile.label='Leitor de sílabas';
  if(result==='no')profile.label='Não leitor';
  profile.evidence+=' Leitura de sílabas: '+$('syllableResult').selectedOptions[0].textContent+'.';
  showReport();
 }else if(phase==='textReady')prepareReading(()=>beginSegment('text'));
 else if(phase==='profileReview'){classifyText();phase='questions';questionIndex=0;showQuestion();}
});

const materialFieldIds = ['passage', 'q1', 'q2', 'q3', 'words'];

function materialsForYear() {
 const year = Number.parseInt($('className').value, 10);
 return typeof fluenciaMateriais === 'undefined' ? [] : fluenciaMateriais[year] || [];
}

function updateMaterialChoices() {
 const year = $('className').value;
 const chooser = $('materialChoice');
 if (chooser.dataset.year === year) return;

 const materials = materialsForYear();
 const placeholder = document.createElement('option');
 placeholder.value = '';
 placeholder.textContent = materials.length ? 'Selecione uma sugestão' : 'Nenhuma sugestão disponível';
 const options = materials.map((material, index) => {
  const option = document.createElement('option');
  option.value = String(index);
  option.textContent = material.title;
  return option;
 });

 chooser.replaceChildren(placeholder, ...options);
 chooser.dataset.year = year;
 chooser.value = '';
 chooser.disabled = !materials.length;
 $('applyMaterial').disabled = true;
 $('materialStatus').textContent = '';
 $('materialSource').textContent = !materials.length
  ? 'Você pode preencher os campos com seu próprio material.'
  : Number.parseInt(year, 10) <= 5
   ? `${year} · Exemplos originais inspirados nos critérios do Protocolo Pedagógico do Programa Educar pra Valer.`
   : `${year} · Exemplos originais complementares do Zurche.`;
}

$('className').addEventListener('change', updateMaterialChoices);
$('materialChoice').addEventListener('change', () => {
 $('applyMaterial').disabled = !$('materialChoice').value;
 $('materialStatus').textContent = '';
});
$('applyMaterial').addEventListener('click', async () => {
 const choice = $('materialChoice').value;
 if (!choice) return;
 const material = materialsForYear()[Number(choice)];
 if (!material) return;

 const values = [material.passage, ...material.questions, material.words.join('\n')];
 const fields = materialFieldIds.map($);
 const replacesContent = fields.some((field, index) => field.value.trim() && field.value.trim() !== values[index]);
 if (replacesContent && !(await askDecision({
  title: 'Substituir o material preenchido?',
  context: 'Preparação do material',
  message: 'A sugestão preenche o texto, as três perguntas e a lista de palavras. Os tempos configurados serão mantidos.',
  confirm: 'Inserir sugestão',
  cancel: 'Manter meu material'
 }))) return;

 fields.forEach((field, index) => { field.value = values[index]; });
 $('materialStatus').textContent = 'Sugestão inserida. Você pode revisar e editar o material abaixo.';
});
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

function reportData(){return {config,alignment:resultAlignment,profile,questions:[...questionAnswers],rows:wordTest.rows,transcript,originalTranscript,textUsedProvisional,revision,notes:$('notes').value};}
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
