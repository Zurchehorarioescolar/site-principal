(function(root){
'use strict';
const norm=s=>String(s).normalize('NFC').toLocaleLowerCase('pt-BR').trim();
const tokens=s=>String(s).normalize('NFC').match(/[\p{L}\p{N}]+(?:[-’'][\p{L}\p{N}]+)*/gu)||[];
function matchWord(expected,heard){const words=tokens(heard);return words.length===1&&norm(expected)===norm(words[0]);}
function parseWords(text){const seen=new Set(),words=[];for(const line of text.split(/\r?\n/)){const w=line.trim().normalize('NFC');if(!w)continue;if(w.length>40||!/^\p{L}+(?:-\p{L}+)*$/u.test(w))throw Error('Use uma palavra por linha, somente letras e hífen, com até 40 caracteres.');if(!seen.has(norm(w))){seen.add(norm(w));words.push(w);}}if(!words.length||words.length>100)throw Error('Inclua de 1 a 100 palavras diferentes.');return words;}
function align(reference,transcript){
 const e=tokens(reference),h=tokens(transcript);if(e.length>600||h.length>1200)throw Error('A comparação aceita até 600 palavras no texto e 1.200 na transcrição.');
 const dp=Array.from({length:e.length+1},()=>new Uint16Array(h.length+1));
 for(let i=0;i<=e.length;i++)dp[i][0]=i;for(let j=0;j<=h.length;j++)dp[0][j]=j;
 for(let i=1;i<=e.length;i++)for(let j=1;j<=h.length;j++)dp[i][j]=Math.min(dp[i-1][j-1]+(norm(e[i-1])===norm(h[j-1])?0:1),dp[i-1][j]+1,dp[i][j-1]+1);
 // Reading starts at the beginning; an unread suffix has no edit penalty.
 // This avoids matching a repeated word farther ahead after a timed partial reading.
 let endpoint=0,best=dp[0][h.length];for(let k=1;k<=e.length;k++)if(dp[k][h.length]<=best){best=dp[k][h.length];endpoint=k;}
 let i=endpoint,j=h.length;const ops=[];
 while(i||j){if(i&&j&&dp[i][j]===dp[i-1][j-1]+(norm(e[i-1])===norm(h[j-1])?0:1)){ops.push({type:norm(e[i-1])===norm(h[j-1])?'match':'different',expected:e[i-1],heard:h[j-1],index:i-1});i--;j--;}else if(i&&dp[i][j]===dp[i-1][j]+1){ops.push({type:'missing',expected:e[i-1],heard:'',index:i-1});i--;}else{ops.push({type:'extra',expected:'',heard:h[j-1],index:null});j--;}}
 ops.reverse();for(let k=endpoint;k<e.length;k++)ops.push({type:'notRead',expected:e[k],heard:'',index:k});
 const counts={match:0,different:0,missing:0,notRead:0,extra:0};for(const op of ops)counts[op.type]++;
 return {ops,counts,total:e.length,incomplete:counts.missing+counts.notRead>0};
}
class Clock{
 constructor(seconds){if(!Number.isInteger(seconds)||seconds<5||seconds>1800)throw Error('O tempo deve ser inteiro, de 5 a 1.800 segundos.');this.remaining=seconds*1000;this.deadline=null;}
 start(now){if(this.deadline===null&&this.remaining>0)this.deadline=now+this.remaining;}
 left(now){return this.deadline===null?this.remaining:Math.max(0,this.deadline-now);}
 pause(now){this.remaining=this.left(now);this.deadline=null;}
 expired(now){return this.left(now)<=0;}
}
class WordTest{
 constructor(words){this.words=[...words];this.rows=[];this.index=0;this.attempts=[];this.waiting=false;}
 get word(){return this.words[this.index]||null;}
 hear(text){if(!this.word||this.waiting)return 'ignored';this.attempts.push(String(text).slice(0,250));if(matchWord(this.word,text)){this.record('Correspondência automática');return 'correct';}if(this.attempts.length>=2){this.record('Sem correspondência após 2 tentativas');return 'advance';}this.waiting=true;return 'retry';}
 retry(){this.waiting=false;}
 record(result){if(!this.word)return;this.rows.push({word:this.word,result,attempts:[...this.attempts],review:''});this.index++;this.attempts=[];this.waiting=false;}
 finish(){if(this.word)this.record('Tempo encerrado nesta palavra');while(this.word)this.record('Não apresentada');}
}
root.Fluencia={norm,tokens,matchWord,parseWords,align,Clock,WordTest};
})(typeof module!=='undefined'?module.exports:globalThis);
