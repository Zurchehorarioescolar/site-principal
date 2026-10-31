/* Pure rules, also loadable by Node for validation. */
(function(root){
function parseNames(text){
 const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 const result=[];
 for(let i=0;i<lines.length;i++){
  let line=lines[i];
  if(line.startsWith('"')&&line.endsWith('"'))line=line.slice(1,-1).replace(/""/g,'"');
  else if(/[;,\t]/.test(line))throw Error('Importe somente uma coluna de nomes ou cole um aluno por linha.');
  if(i===0&&/^(nome|nomes|aluno|alunos|nome do aluno)$/i.test(line))continue;
  if(line.length>120)throw Error('Um nome excede 120 caracteres. Confira a lista.');
  result.push(line);
 }
 if(result.length>1000)throw Error('Use no máximo 1.000 alunos por turma.');
 return result;
}
function config(min,max,seconds){
 if(![min,max,seconds].every(Number.isInteger)||min<0||max>1000||min>max||seconds<1||seconds>600)throw Error('Use números inteiros: intervalo de 0 a 1.000, início menor ou igual ao fim e tempo de 1 a 600 segundos.');
 return {min,max,seconds};
}
function shuffle(values,rng=Math.random){const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function factor(min,max,rng=Math.random){return min+Math.floor(rng()*(max-min+1));}
root.Tabuada={parseNames,config,shuffle,factor};
})(typeof module!=='undefined'?module.exports:globalThis);
