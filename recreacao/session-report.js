(function(root){
'use strict';
function buildReport(activity,rows,describe,now=new Date()){
 const total=rows.length,correct=rows.filter(r=>r.result==='Acertou').length,wrong=rows.filter(r=>r.result==='Errou').length;
 const pending=total-correct-wrong;
 const date=now.toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'});
 const summary=`Zurche — ${activity}\nRelatório gerado em ${date} (horário de Brasília)\n\nRodadas registradas: ${total}\nAcertos: ${correct}\nErros: ${wrong}\nSem avaliação: ${pending}`;
 const details=rows.map((row,i)=>`${i+1}. ${row.name}\n${describe(row)}\nResultado: ${row.result}`).join('\n\n');
 return {summary,text:summary+'\n\nRODADAS DA SESSÃO\n\n'+details,subject:`Zurche — Relatório: ${activity}`,total};
}
function compose(report,recipient=''){
 const prefix='mailto:'+encodeURIComponent(recipient)+'?subject='+encodeURIComponent(report.subject)+'&body=';
 const full=prefix+encodeURIComponent(report.text);
 const shortened=full.length>1800;
 const body=shortened?report.summary+'\n\nO relatório completo deve ser anexado em TXT ou colado pelo remetente.':report.text;
 return {url:prefix+encodeURIComponent(body),shortened};
}
function init({activity,getRows,describe}){
 const history=document.getElementById('history');if(!history)return;
 const style=document.createElement('style');style.textContent=`
 .session-export{margin-top:18px;padding-top:16px;border-top:1px solid var(--line)}.session-export p{font-size:12px;color:var(--muted);margin:8px 0}
 .session-report-modal{width:min(720px,calc(100% - 24px));max-height:90dvh;padding:24px;border:1px solid var(--line);border-radius:20px;background:#111c30;color:#f4f7fc;overflow:auto}.session-report-modal::backdrop{background:#050b18cc}
 .session-report-modal h2{font-size:24px}.session-report-modal p{font-size:13px;color:var(--muted)}.session-report-modal label{display:block;font-size:14px;margin:14px 0 6px}.session-report-modal input,.session-report-modal textarea{width:100%;padding:12px;border:1px solid #34415a;border-radius:10px;color:#f4f7fc;background:#0c1424;font:inherit}.session-report-modal textarea{min-height:240px;font-size:13px;resize:vertical}.session-report-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}.session-report-actions a{font:700 14px 'DM Sans',sans-serif}.session-report-message{font-size:13px;color:#ffbd77!important}.session-report-modal .report-close{float:right}
 `;document.head.append(style);
 const actions=document.createElement('div');actions.className='session-export';
 actions.innerHTML='<button type="button" class="quiet">✉ Enviar relatório por e-mail</button><p>Confira o relatório e escolha para quem enviar. Apenas rodadas já registradas são incluídas.</p><p class="session-export-message" role="status"></p>';
 history.parentElement.append(actions);
 const dialog=document.createElement('dialog');dialog.className='session-report-modal';dialog.setAttribute('aria-label','Enviar relatório da sessão');
 dialog.innerHTML=`<button type="button" class="quiet report-close" aria-label="Fechar relatório">✕ Fechar</button><h2>Relatório da sessão</h2><p>O relatório contém os nomes dos alunos e os resultados. Confira antes de compartilhar.</p><label for="reportRecipient">Enviar para (opcional)</label><input id="reportRecipient" type="email" placeholder="professor@exemplo.com" autocomplete="email"><label for="reportText">Prévia — você pode selecionar e copiar o texto</label><textarea id="reportText" readonly></textarea><p class="session-report-message" role="status"></p><div class="session-report-actions"><button type="button" class="primary report-email">Abrir e-mail</button><button type="button" class="quiet report-download">Baixar relatório (.txt)</button></div><p>Abre o aplicativo de e-mail configurado neste dispositivo. Você revisa e envia. Se não abrir, baixe o TXT e anexe pelo seu webmail.</p>`;
 document.body.append(dialog);
 let report=null;
 const text=dialog.querySelector('textarea'),recipient=dialog.querySelector('input'),message=dialog.querySelector('.session-report-message');
 actions.querySelector('button').addEventListener('click',()=>{
  const rows=getRows();if(!rows.length){actions.querySelector('.session-export-message').textContent='Ainda não há rodadas registradas para enviar.';return;}
  actions.querySelector('.session-export-message').textContent='';report=buildReport(activity,rows,describe);text.value=report.text;
  message.textContent=compose(report).shortened?'Este relatório é longo: baixe o TXT e anexe ao e-mail, ou copie e cole o texto completo. O botão Abrir e-mail levará apenas o resumo.':'';
  dialog.showModal();
 });
 dialog.querySelector('.report-close').addEventListener('click',()=>dialog.close());
 dialog.querySelector('.report-email').addEventListener('click',()=>{
  if(!recipient.reportValidity()||!report)return;
  const draft=compose(report,recipient.value.trim());
  if(draft.shortened)message.textContent='O e-mail levará apenas o resumo. Baixe e anexe o TXT ou copie e cole o relatório completo antes de enviar.';
  const link=document.createElement('a');link.href=draft.url;document.body.append(link);link.click();link.remove();
 });
 dialog.querySelector('.report-download').addEventListener('click',()=>{
  if(!report)return;const url=URL.createObjectURL(new Blob(['\uFEFF'+report.text],{type:'text/plain;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download='zurche-relatorio-sessao.txt';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
 });
}
root.SessionReport={buildReport,compose,init};
})(typeof module!=='undefined'?module.exports:globalThis);
