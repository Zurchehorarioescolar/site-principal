(function(){
'use strict';
const box=document.createElement('section');box.className='voice-info';box.setAttribute('aria-labelledby','micTitle');
box.innerHTML=`<h3 id="micTitle">1. Confira o microfone</h3><p>Primeiro marque a autorização de voz acima. Depois liste os dispositivos e fale para conferir o volume.</p><button type="button" id="micList">Listar microfones</button><label for="micDevice">Microfone para testar o volume</label><select id="micDevice"><option value="">Padrão do navegador</option></select><div class="mic-actions"><button type="button" id="micTest">Testar por 20 segundos</button><button type="button" id="micStop" disabled>Parar teste</button></div><label for="micMeter">Sinal de áudio recebido</label><meter id="micMeter" min="0" max="100" value="0">0</meter><p id="micStatus" role="status" aria-live="polite">Microfone desligado.</p><h3>2. Configure o mesmo microfone no navegador</h3><p><strong>A seleção acima vale para o teste de volume.</strong> O reconhecimento de palavras usa o microfone padrão do navegador. Para usar o dispositivo que funcionou no teste, selecione-o também nas configurações:</p><p><strong>Chrome:</strong> Configurações → Privacidade e segurança → Configurações do site → Microfone. Escolha o dispositivo. Você também pode copiar este endereço para a barra do Chrome:</p><code class="mic-address">chrome://settings/content/microphone</code><p><strong>Edge:</strong> Configurações → Permissões do site → Microfone. Procure “Microfone” na busca das configurações, se necessário.</p><p>Confira também o ícone de permissões ao lado do endereço da atividade e permita o microfone. Volte à atividade e inicie a leitura; não é preciso recarregar e perder os registros.</p><p><strong>O medidor se mexe, mas as palavras não aparecem?</strong> Se o mesmo microfone estiver selecionado no navegador, pode ser uma falha do serviço de voz ou da internet. O teste de volume não depende desse serviço; o reconhecimento de palavras pode depender.</p>`;
const voiceInfo=document.getElementById('voiceInfo');voiceInfo.after(box);
const style=document.createElement('style');style.textContent='.mic-actions{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}#micMeter{display:block;width:100%;height:26px}.mic-address{display:block;padding:10px;border-radius:8px;background:#0c1424;overflow-wrap:anywhere;color:#83edc2;font-size:12px}#micTitle{font-size:19px;letter-spacing:0;margin:0 0 12px}';document.head.append(style);
const $=id=>document.getElementById(id);
let stream=null,ctx=null,source=null,analyser=null,frame=null,timer=null,token=0,heard=false,lastAnnounce=0;
function stop(message){
 token++;if(frame!==null)cancelAnimationFrame(frame);frame=null;clearTimeout(timer);timer=null;
 if(stream)for(const track of stream.getTracks())track.stop();stream=null;
 try{source?.disconnect();analyser?.disconnect();}catch{}source=null;analyser=null;
 if(ctx){ctx.close().catch(()=>{});ctx=null;}
 $('micMeter').value=0;$('micStop').disabled=true;$('micTest').disabled=false;$('micList').disabled=false;
 if(message)$('micStatus').textContent=message;
}
function validate(){
 if(!$('voiceConsent').checked)throw Error('Marque a autorização de voz antes de testar o microfone.');
 if(!navigator.mediaDevices?.getUserMedia)throw Error('Teste de áudio indisponível. Abra a atividade pelo INICIAR-TESTE.bat, em um navegador com suporte.');
}
function explain(error){return ({NotAllowedError:'O microfone não foi autorizado. Confira as permissões do navegador e do Windows.',NotFoundError:'Nenhum microfone foi encontrado. Conecte um dispositivo e tente novamente.',NotReadableError:'O microfone está indisponível ou em uso por outro programa. Feche o programa e tente novamente.',OverconstrainedError:'O dispositivo selecionado não está disponível. Liste novamente os microfones.'})[error.name]||error.message||'Não foi possível testar o microfone.';}
async function devices(){
 const items=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='audioinput'),selected=$('micDevice').value;
 $('micDevice').replaceChildren();const standard=document.createElement('option');standard.value='';standard.textContent='Padrão do navegador';$('micDevice').append(standard);
 for(const [i,d] of items.entries()){const option=document.createElement('option');option.value=d.deviceId;option.textContent=d.label||`Microfone ${i+1}`;$('micDevice').append(option);}
 if(items.some(d=>d.deviceId===selected))$('micDevice').value=selected;
 return items;
}
$('micList').addEventListener('click',async()=>{
 stop();const run=token;let probe=null;
 try{validate();$('micList').disabled=true;$('micStatus').textContent='Solicitando permissão para identificar os microfones…';
  probe=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
  if(run!==token)return;const items=await devices();if(run!==token)return;
  $('micStatus').textContent=items.length?`${items.length} dispositivo(s) de entrada encontrado(s). Escolha um e clique em Testar.`:'Nenhum microfone listado.';
 }catch(error){if(run===token)$('micStatus').textContent=explain(error);}
 finally{if(probe)for(const track of probe.getTracks())track.stop();if(run===token)$('micList').disabled=false;}
});
$('micTest').addEventListener('click',async()=>{
 stop();const run=token;heard=false;lastAnnounce=0;
 try{validate();$('micTest').disabled=true;$('micList').disabled=true;$('micStop').disabled=false;$('micStatus').textContent='Abrindo o microfone selecionado…';
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
  timer=setTimeout(()=>stop(heard?'Teste encerrado: foi detectado sinal de áudio. Configure o mesmo dispositivo no navegador para a leitura.':'Teste encerrado sem sinal perceptível. Confira o mute, o volume e tente outro microfone.'),20000);
 }catch(error){if(run===token)stop(explain(error));}
});
$('micStop').addEventListener('click',()=>stop(heard?'Teste encerrado: sinal detectado.':'Teste interrompido.'));
$('micDevice').addEventListener('change',()=>stop('Dispositivo alterado. Clique em Testar para conferir.'));
$('voiceConsent').addEventListener('change',()=>{if(!$('voiceConsent').checked)stop('Teste interrompido: autorização desmarcada.');});
document.getElementById('setup').addEventListener('submit',()=>stop('Teste encerrado para iniciar a leitura.'),true);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop('Teste interrompido ao sair da aba.');});window.addEventListener('pagehide',()=>stop());
})();
