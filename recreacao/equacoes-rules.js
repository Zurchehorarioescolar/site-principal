(function(root){
'use strict';
const integer=(min,max,rng)=>min+Math.floor(rng()*(max-min+1));
const number=n=>String(n).replace('-','−');
const term=b=>b<0?` − ${number(-b)}`:` + ${number(b)}`;
function config(min,max,seconds,levels){
 if(![min,max,seconds].every(Number.isInteger)||min< -100||max>100||min>max||seconds<1||seconds>600)throw Error('Use soluções inteiras de −100 a 100, início menor ou igual ao fim e tempo de 1 a 600 segundos.');
 if(!Array.isArray(levels)||!levels.length||levels.some(v=>![1,2,3].includes(v)))throw Error('Selecione pelo menos um nível.');
 if(levels.includes(1)&&max<0)throw Error('O nível 1 precisa incluir soluções a partir de zero. Ajuste o intervalo ou desmarque esse nível.');
 return {min,max,seconds,levels:[...new Set(levels)]};
}
function generate(cfg,rng=Math.random){
 const level=cfg.levels[integer(0,cfg.levels.length-1,rng)];
 const x=integer(level===1?Math.max(0,cfg.min):cfg.min,cfg.max,rng);
 const a=level===3?integer(2,9,rng):1;
 let b=integer(1,12,rng)*(rng()<.5?-1:1);
 if(level===1&&x+b<0)b=Math.abs(b);
 const c=a*x+b,lhs=(a===1?'x':`${a}x`)+term(b);
 const question=`${lhs} = ${number(c)}`,steps=[question];
 const ax=a===1?'x':`${a}x`;
 steps.push(`${ax} = ${number(c)}${b<0?' + ':' − '}${number(Math.abs(b))}`);
 if(a!==1){steps.push(`${ax} = ${number(a*x)}`);steps.push(`x = ${number(a*x)} ÷ ${a}`);}
 steps.push(`x = ${number(x)}`);
 return {level,a,b,c,x,question,steps};
}
root.Equacoes={config,generate,number};
})(typeof module!=='undefined'?module.exports:globalThis);
