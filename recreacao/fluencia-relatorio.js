(function(root){
'use strict';
const colors={ink:'#173248',muted:'#627587',accent:'#147C67',line:'#DBE4EB',pale:'#F1F6F8',warn:'#924D20'};
const dateBR=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)?value.split('-').reverse().join('/'):value;
const statusLabels={match:'Correspondência',different:'Diferente',missing:'Ausente',notRead:'Final sem registro',extra:'Extra'};
function definition(data){
 const {config:c,alignment:a,questions,rows,transcript,originalTranscript,textUsedProvisional,revision,notes}=data;
 const meta=(label,value)=>({stack:[{text:label,style:'label'},{text:String(value||'Não informado'),style:'metaValue'}],margin:[0,2,12,9]});
 const heading=(n,title)=>({text:n+'. '+title,style:'section',headlineLevel:1,...(n===2?{pageBreak:'before'}:{}),margin:[0,20,0,10]});
 const headerCell=text=>({text,style:'tableHeader'});
 const content=[
  {text:'ZURCHE  /  ATIVIDADES',style:'brand'},
  {text:'Relatório de\nfluência leitora',style:'title',margin:[0,10,0,8]},
  {text:'Acompanhamento individual • Texto, compreensão e palavras',style:'subtitle',margin:[0,0,0,14]},
  {canvas:[{type:'rect',x:0,y:0,w:515,h:3,color:colors.accent}],margin:[0,0,0,18]},
  {table:{widths:['*','*'],body:[[meta('ESTUDANTE',c.student),meta('PROFESSOR',c.teacher)],[meta('ANO/SÉRIE',c.className),meta('DATA DA SESSÃO',dateBR(c.date))]]},layout:'noBorders'},
  {text:'Registro assistido por reconhecimento de voz, com revisão do professor. Correspondências e ausências na transcrição não comprovam, sozinhas, acertos ou erros de leitura. Não é uma avaliação padronizada de fluência ou diagnóstico.',style:'notice',margin:[0,6,0,0]},
  heading(1,'Leitura do texto'),
  {text:`Tempo disponível: ${c.textSeconds} segundos  •  Texto proposto: ${a.total} palavras`,style:'small',margin:[0,0,0,8]},
  {table:{widths:['*','*','*','*','*'],body:[['Correspondências','Diferentes','Ausentes no meio','Final sem registro','Extras'].map(headerCell),[a.counts.match,a.counts.different,a.counts.missing,a.counts.notRead,a.counts.extra].map(v=>({text:String(v),fontSize:18,bold:true,color:colors.ink,margin:[0,6,0,4]}))]},layout:'lightHorizontalLines'},
  {text:revision?'Comparação recalculada após revisão da transcrição pelo professor.':'Comparação estimada da transcrição automática recebida.',style:'small',margin:[0,8,0,10]},
  {text:'Texto proposto',style:'subheading'},
  {text:c.passage,style:'body',margin:[0,4,0,12]},
  {text:'Leitura registrada e correspondências',style:'subheading'},
  {text:a.ops.flatMap(op=>[{text:(op.expected||'['+op.heard+']')+' ',color:op.type==='match'?colors.accent:op.type==='different'?'#AA334B':op.type==='extra'?'#695395':op.type==='missing'?colors.warn:colors.muted,bold:op.type==='different',decoration:op.type==='missing'?'underline':undefined}]),style:'body',margin:[0,4,0,6]},
  {text:'Verde: correspondência • Vermelho: palavra diferente • Sublinhado: ausente no meio • Cinza: final sem registro • Roxo: palavra extra',style:'tiny',margin:[0,0,0,12]},
  {text:'Transcrição recebida pelo navegador',style:'subheading'},
  ...(textUsedProvisional?[{text:'Inclui trechos provisórios recebidos pelo navegador. Revise a transcrição com o estudante.',style:'notice',margin:[0,4,0,0]}]:[]),
  {text:originalTranscript||'Nenhuma transcrição recebida. Isso não significa que o estudante não realizou a leitura.',style:'body',margin:[0,4,0,10]},
 ];
 if(revision)content.push({text:'Transcrição revisada pelo professor',style:'subheading'},{text:transcript||'Transcrição vazia após a revisão.',style:'body',margin:[0,4,0,10]});
 const issues=a.ops.filter(op=>op.type==='different'||op.type==='extra'||op.type==='missing');
 if(issues.length)content.push({text:'Detalhes para conferência',style:'subheading',margin:[0,8,0,6]},{table:{headerRows:1,widths:['*','*',95],body:[[headerCell('No texto'),headerCell('Na transcrição'),headerCell('Comparação')],...issues.map(op=>[{text:op.expected||'—',style:'tableCell'},{text:op.heard||'—',style:'tableCell'},{text:statusLabels[op.type],style:'tableCell'}])]},layout:'lightHorizontalLines'});
 content.push(heading(2,'Compreensão do texto'),{text:`${questions.filter(x=>x==='Correta').length} resposta(s) correta(s), ${questions.filter(x=>x==='Incorreta').length} incorreta(s) e ${questions.filter(x=>x==='Sem resposta').length} sem resposta, segundo o professor.`,style:'small',margin:[0,0,0,10]},
 {table:{headerRows:1,widths:[18,'*',85],body:[[headerCell('Nº'),headerCell('Pergunta feita pelo professor'),headerCell('Resultado')],...c.questions.map((q,i)=>[{text:String(i+1),style:'tableCell'},{text:q,style:'tableCell'},{text:questions[i]||'Sem registro',style:'tableCell',bold:true}])]},layout:'lightHorizontalLines'});
 content.push(heading(3,'Leitura de palavras'),{text:`Tempo disponível para a lista inteira: ${c.wordSeconds} segundos  •  Palavras previstas: ${c.words.length}`,style:'small',margin:[0,0,0,8]},
 {text:`Registros: ${rows.filter(r=>r.result==='Correspondência automática').length} correspondência(s) automática(s); ${rows.filter(r=>r.result==='Confirmada pelo professor').length} confirmação(ões) do professor; ${rows.filter(r=>r.result==='Sem correspondência após 2 tentativas').length} sem correspondência após duas tentativas.`,style:'small',margin:[0,0,0,8]},
 {text:`Revisão do professor: ${rows.filter(r=>r.review==='Certa').length} certa(s), ${rows.filter(r=>r.review==='Errada').length} errada(s), ${rows.filter(r=>r.review==='Não avaliada').length} não avaliada(s) e ${rows.filter(r=>!r.review).length} sem revisão.`,style:'small',margin:[0,0,0,10]},
 {table:{headerRows:1,dontBreakRows:true,widths:[16,60,119,'*',65],body:[[headerCell('Nº'),headerCell('Palavra'),headerCell('Registro'),headerCell('Transcrição / tentativas'),headerCell('Revisão')],...rows.map((r,i)=>[{text:String(i+1),style:'tableCell'},{text:r.word,style:'tableCell',bold:true},{text:r.result+(r.source?'\n'+r.source:''),style:'tableCell'},{text:r.attempts.length?r.attempts.map((t,j)=>(j+1)+'. '+t).join('\n'):'Sem transcrição',style:'tableCell'},{text:r.review||'Sem revisão',style:'tableCell',bold:!!r.review}])]},layout:'lightHorizontalLines'},
 {text:'Falas provisórias estáveis são identificadas no registro quando usadas para avançar uma palavra. Confira a leitura com o estudante; o reconhecimento pode revisar o que ouviu.',style:'tiny',margin:[0,8,0,0]},
 heading(4,'Observações e acompanhamento'),
 {text:notes?.trim()||'Sem observações registradas pelo professor.',style:'body',margin:[0,0,0,22]},
 {canvas:[{type:'line',x1:0,y1:0,x2:250,y2:0,lineWidth:.6,lineColor:colors.line}],margin:[0,14,0,6]},
 {text:c.teacher,style:'small'},{text:'Professor(a) responsável pelo acompanhamento',style:'tiny'});
 return {pageSize:'A4',pageMargins:[40,42,40,48],pageBreakBefore:(node,following)=>node.headlineLevel===1&&following.length===0,info:{title:'Relatório de fluência leitora',author:'Zurche — Atividades',subject:'Acompanhamento pedagógico individual'},defaultStyle:{font:'Roboto',fontSize:9.5,color:colors.ink,lineHeight:1.25},
  footer:(page,total)=>({margin:[40,10,40,0],columns:[{text:'Zurche — Atividades | Registro pedagógico',fontSize:8,color:colors.muted},{text:`Página ${page} de ${total}`,alignment:'right',fontSize:8,color:colors.muted}]}),
  styles:{brand:{fontSize:9,bold:true,color:colors.accent,characterSpacing:1.5},title:{fontSize:27,bold:true,color:colors.ink,lineHeight:1.02},subtitle:{fontSize:10,color:colors.muted},section:{fontSize:14,bold:true,color:colors.ink},subheading:{fontSize:10,bold:true,color:colors.ink},label:{fontSize:7.5,color:colors.muted,bold:true},metaValue:{fontSize:11,bold:true,color:colors.ink},body:{fontSize:10,lineHeight:1.45},small:{fontSize:9,color:colors.muted},tiny:{fontSize:7.5,color:colors.muted},notice:{fontSize:8,color:colors.muted,lineHeight:1.3},tableHeader:{fontSize:8,bold:true,color:colors.accent,fillColor:colors.pale,margin:[0,5,0,5]},tableCell:{fontSize:8,margin:[0,4,0,4]}},
  content};
}
function download(data){
 if(!root.pdfMake)throw Error('A biblioteca do PDF não carregou. Confira se a pasta vendor foi enviada ao site.');
 return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('O PDF demorou para ser gerado. Tente novamente.')),45000);
 try{root.pdfMake.createPdf(definition(data)).getBlob(blob=>{clearTimeout(timer);const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='relatorio-fluencia-'+(data.config.date||'sessao')+'.pdf';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);resolve();});}catch(error){clearTimeout(timer);reject(error);}});
}
root.FluenciaReport={definition,download};
})(typeof module!=='undefined'?module.exports:globalThis);
