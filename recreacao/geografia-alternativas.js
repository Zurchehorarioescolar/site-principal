(function(root){
'use strict';
function shuffle(values,rng){
 const list=[...values];
 for(let i=list.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[list[i],list[j]]=[list[j],list[i]];}
 return list;
}
function key(value){
 const normalized=value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 const aliases={mandarim:'chines','chines mandarim':'chines',farsi:'persa',castelhano:'espanhol',neerlandes:'holandes'};
 return aliases[normalized]||normalized;
}
function prepare(q,preferred,all,rng=Math.random){
 if(q.topic==='escolha')return q;
 let values,valid,correct,prompt=q.prompt;
 const country=q.state;
 if(q.topic==='continente'){
  const continents=['África','América','Ásia','Europa','Oceania'];
  correct=country.continents.join(' e ');valid=[correct];
  // Match the number of continents so the wording does not give away the answer.
  values=()=>country.continents.length===1?continents:continents.flatMap((first,index)=>continents.slice(index+1).filter(second=>!country.continents.every(continent=>[first,second].includes(continent))).map(second=>first+' e '+second));
 }else{
  if(q.topic==='capital'&&q.direction!=='inverso')values=state=>state.capitals||[state.capital];
  else if(q.topic==='sigla'&&q.direction!=='inverso')values=state=>[state.uf];
  else if(q.topic==='idioma'){
   values=state=>state.languages;
   prompt='Qual destes idiomas é usado neste país?';
  }else values=state=>[state.name];
  valid=values(country);
  correct=valid[0];
 }
 const excluded=new Set([...valid,correct].map(key));
 const candidates=q.topic==='continente'?shuffle(values(),rng):[
  ...shuffle(preferred,rng).flatMap(values),...shuffle(all,rng).flatMap(values)
 ];
 const wrong=[];
 for(const label of candidates){
  const normalized=key(label);
  if(excluded.has(normalized))continue;
  excluded.add(normalized);wrong.push(label);
  if(wrong.length===3)break;
 }
 if(wrong.length!==3)throw Error('Não foi possível montar quatro alternativas para esta pergunta.');
 const textChoices=shuffle([correct,...wrong],rng),correctIndex=textChoices.indexOf(correct);
 return {...q,prompt,textChoices,correctIndex,answer:'ABCD'[correctIndex]+' — '+correct};
}
function render(round,container,onSelect){
 container.replaceChildren();container.hidden=false;
 round.textChoices.forEach((text,index)=>{
  const button=document.createElement('button'),letter=document.createElement('span'),label=document.createElement('span');
  button.type='button';button.className='text-option';
  letter.className='option-letter';letter.textContent='ABCD'[index];label.textContent=text;
  button.append(letter,label);button.setAttribute('aria-label','ABCD'[index]+': '+text);
  button.addEventListener('click',()=>onSelect(round,index));container.append(button);
 });
}
function mark(round,container){
 for(const [index,button] of [...container.children].entries()){
  const correct=index===round.correctIndex,selected=index===round.selectedIndex;
  button.classList.toggle('is-correct',correct);button.classList.toggle('is-wrong',selected&&!correct);
  button.disabled=true;
  button.setAttribute('aria-label','ABCD'[index]+': '+round.textChoices[index]+(correct?' — resposta correta':selected?' — sua resposta, incorreta':''));
 }
}
function soloResult(correct,total){
 const percentage=correct/total*100;
 const message=percentage===100?'É o professor aqui? 😎':percentage>90?'Sabe muito!!! 🤩':percentage>=70?'É fera! 🔥':percentage>=50?'Está bom! 👍':'Você precisa estudar mais! 📚';
 return {correct,total,percentage,message};
}
root.GeoAlternativas={prepare,render,mark,soloResult};
})(typeof module!=='undefined'?module.exports:globalThis);
