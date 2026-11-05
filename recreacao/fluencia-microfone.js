(function(){
'use strict';
const box=document.createElement('section');box.className='voice-info';box.setAttribute('aria-labelledby','micTitle');
box.innerHTML=`
 <h3 id="micTitle">Confira a transcrição</h3>
 <p>Marque a autorização de voz acima. Clique em testar e diga uma frase curta, por exemplo: “Hoje eu vou ler um texto”.</p>
 <p>Este teste e a avaliação usam o microfone padrão do navegador. Confira se as palavras que você falou aparecem abaixo.</p>
 <div class="mic-actions"><button type="button" id="speechTest">Testar transcrição</button><button type="button" id="speechStop" disabled>Parar transcrição</button></div>
 <p id="speechTestStatus" role="status">Aguardando o teste de transcrição.</p>
 <details>
  <summary>Volume e configurações do microfone</summary>
  <p>Use o medidor para conferir o sinal de um dispositivo. Para usá-lo na avaliação, selecione o mesmo microfone nas configurações do navegador.</p>
  <button type="button" id="micList">Listar microfones</button>
  <label for="micDevice">Microfone para testar o volume</label>
  <select id="micDevice"><option value="">Padrão do navegador</option></select>
  <div class="mic-actions"><button type="button" id="micTest">Testar volume por 20 segundos</button><button type="button" id="micStop" disabled>Parar teste de volume</button></div>
  <label for="micMeter">Sinal de áudio recebido</label><meter id="micMeter" min="0" max="100" value="0">0</meter>
  <p id="micStatus" role="status">Microfone desligado.</p>
  <p><strong>Chrome</strong> → Configurações → Privacidade e segurança → Configurações do site → Microfone.</p>
  <code class="mic-address">chrome://settings/content/microphone</code>
  <p><strong>Edge</strong> → Configurações → pesquise por “Microfone” e abra as permissões do site.</p>
  <p>Confira a permissão do site no ícone ao lado do endereço da atividade. Ao voltar, teste a transcrição com o dispositivo padrão do navegador.</p>
 </details>`;
const voiceInfo=document.getElementById('voiceInfo');voiceInfo.after(box);
const style=document.createElement('style');style.textContent='.mic-actions{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}#micMeter{display:block;width:100%;height:26px}.mic-address{display:block;padding:10px;border-radius:8px;background:#0c1424;overflow-wrap:anywhere;color:#83edc2;font-size:12px}#micTitle{font-size:19px;letter-spacing:0;margin:0 0 12px}';document.head.append(style);
const $=id=>document.getElementById(id);
let stream=null,ctx=null,source=null,analyser=null,frame=null,timer=null,token=0,heard=false,lastAnnounce=0;
let speechTest=null,speechTimer=null,speechPreview='';
function stopVolume(message){
 token++;if(frame!==null)cancelAnimationFrame(frame);frame=null;clearTimeout(timer);timer=null;
 if(stream)for(const track of stream.getTracks())track.stop();stream=null;
 try{source?.disconnect();analyser?.disconnect();}catch{}source=null;analyser=null;
 if(ctx){ctx.close().catch(()=>{});ctx=null;}
 $('micMeter').value=0;$('micStop').disabled=true;$('micTest').disabled=false;$('micList').disabled=false;
 if(message)$('micStatus').textContent=message;
}
function stopRecognition(message){
 if(!speechTest)return;
 const instance=speechTest;speechTest=null;
 clearTimeout(speechTimer);speechTimer=null;
 instance.onstart=instance.onresult=instance.onerror=instance.onend=null;
 try{instance.abort();}catch{}
 $('speechTest').disabled=false;$('speechStop').disabled=true;
 $('speechTestStatus').textContent=message||(speechPreview?`Transcrição de teste: “${speechPreview}”`:'Teste de transcrição encerrado.');
}
function stop(){
 stopVolume(stream||$('micList').disabled||!$('micStop').disabled?'Teste de volume encerrado.':'');
 stopRecognition();
}
function requireConsent(){
 if(!$('voiceConsent').checked)throw Error('Marque a autorização de voz antes de testar o microfone.');
}
function validateVolume(){
 requireConsent();
 if(!navigator.mediaDevices?.getUserMedia)throw Error('Teste de áudio indisponível. Abra a atividade pelo endereço HTTPS do portal, em um navegador compatível.');
}
$('speechTest').addEventListener('click',()=>{
 stop();
 try{
  requireConsent();
  const instance=createVoiceRecognition();speechTest=instance;speechPreview='';
  $('speechTest').disabled=true;$('speechStop').disabled=false;
  $('speechTestStatus').textContent='Ativando o reconhecimento de voz…';
  instance.onstart=()=>{if(speechTest===instance)$('speechTestStatus').textContent='Escuta ativa. Diga a frase de teste.';};
  instance.onresult=event=>{
   if(speechTest!==instance)return;
   const results=Array.from(event.results);
   speechPreview=results.map(result=>result[0].transcript.trim()).join(' ').trim();
   if(!speechPreview)return;
   $('speechTestStatus').textContent=`Transcrição de teste: “${speechPreview}”`;
   if(results.some(result=>result.isFinal))stopRecognition();
  };
  instance.onerror=event=>{if(speechTest===instance)stopRecognition(voiceErrorMessage(event.error));};
  instance.onend=()=>{if(speechTest===instance)stopRecognition(speechPreview?'':'O navegador encerrou o teste sem transcrever. Confira o dispositivo padrão e tente novamente.');};
  speechTimer=setTimeout(()=>stopRecognition(speechPreview?'':'O navegador ainda não transcreveu a fala. Confira o dispositivo padrão e a conexão e tente novamente.'),15000);
  instance.start();
 }catch(error){
  stopRecognition(error.message);
  $('speechTestStatus').textContent=error.message;
 }
});
$('speechStop').addEventListener('click',()=>stopRecognition());
function explain(error){return ({NotAllowedError:'O microfone não foi autorizado. Confira as permissões do navegador e do Windows.',NotFoundError:'Nenhum microfone foi encontrado. Conecte um dispositivo e tente novamente.',NotReadableError:'O microfone está indisponível ou em uso por outro programa. Feche o programa e tente novamente.',OverconstrainedError:'O dispositivo selecionado não está disponível. Liste novamente os microfones.'})[error.name]||error.message||'Não foi possível testar o microfone.';}
async function devices(run){
 const items=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='audioinput'),selected=$('micDevice').value;
 if(run!==token)return [];
 $('micDevice').replaceChildren();const standard=document.createElement('option');standard.value='';standard.textContent='Padrão do navegador';$('micDevice').append(standard);
 for(const [i,d] of items.entries()){const option=document.createElement('option');option.value=d.deviceId;option.textContent=d.label||`Microfone ${i+1}`;$('micDevice').append(option);}
 if(items.some(d=>d.deviceId===selected))$('micDevice').value=selected;
 return items;
}
$('micList').addEventListener('click',async()=>{
 stop();const run=token;let probe=null;
 try{validateVolume();$('micList').disabled=true;$('micStatus').textContent='Solicitando permissão para identificar os microfones…';
  probe=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
  if(run!==token)return;stream=probe;const items=await devices(run);if(run!==token)return;
  $('micStatus').textContent=items.length?`${items.length} dispositivo(s) de entrada encontrado(s). Escolha um e clique em Testar.`:'Nenhum microfone listado.';
 }catch(error){if(run===token)$('micStatus').textContent=explain(error);}
 finally{if(probe)for(const track of probe.getTracks())track.stop();if(stream===probe)stream=null;if(run===token)$('micList').disabled=false;}
});
$('micTest').addEventListener('click',async()=>{
 stop();const run=token;heard=false;lastAnnounce=0;
 try{validateVolume();$('micTest').disabled=true;$('micList').disabled=true;$('micStop').disabled=false;$('micStatus').textContent='Abrindo o microfone selecionado…';
  const chosen=$('micDevice').value;
  const captured=await navigator.mediaDevices.getUserMedia({audio:chosen?{deviceId:{exact:chosen}}:true,video:false});
  if(run!==token){captured.getTracks().forEach(t=>t.stop());return;}stream=captured;
  const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('O medidor de volume não é suportado neste navegador.');
  ctx=new Audio();await ctx.resume();if(run!==token)return;
  source=ctx.createMediaStreamSource(stream);analyser=ctx.createAnalyser();analyser.fftSize=1024;source.connect(analyser);
  const samples=new Uint8Array(analyser.fftSize),label=stream.getAudioTracks()[0]?.label||'microfone selecionado';
  $('micStatus').textContent=`Teste local: ${label}. Fale perto do microfone.`;
  function draw(now){
   if(run!==token||!analyser)return;analyser.getByteTimeDomainData(samples);
   let sum=0;for(const value of samples){const v=(value-128)/128;sum+=v*v;}
   const rms=Math.sqrt(sum/samples.length);$('micMeter').value=Math.min(100,Math.round(rms*500));if(rms>.012)heard=true;
   if(now-lastAnnounce>1800){lastAnnounce=now;$('micStatus').textContent=rms>.012?`Sinal detectado em: ${label}.`:`Ouvindo ${label}. Fale para testar o volume.`;}
   frame=requestAnimationFrame(draw);
  }
  frame=requestAnimationFrame(draw);
  timer=setTimeout(()=>stopVolume(heard?'Teste encerrado: sinal de áudio detectado. Use o teste de transcrição para conferir a leitura.':'Teste encerrado sem sinal perceptível. Confira o volume e tente outro microfone.'),20000);
 }catch(error){if(run===token)stopVolume(explain(error));}
});
$('micStop').addEventListener('click',()=>stopVolume(heard?'Teste encerrado: sinal detectado.':'Teste interrompido.'));
$('micDevice').addEventListener('change',()=>stopVolume('Dispositivo alterado. Clique em Testar volume para conferir.'));
$('voiceConsent').addEventListener('change',()=>{if(!$('voiceConsent').checked)stop();});
$('mode').addEventListener('change',()=>{
 box.hidden=$('mode').value!=='auto';
 if(box.hidden)stop();
});
box.hidden=$('mode').value!=='auto';
$('setup').addEventListener('submit',stop,true);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
window.addEventListener('pagehide',stop);
window.FluenciaMicrofone={stop};
})();
