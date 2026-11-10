(function(root) {
'use strict';
const countries = (typeof module !== 'undefined' ? require('./mundo-dados.js').MundoData : root.MundoData);
const regions = ['África','América','América do Norte','América Central e Caribe','América do Sul','Ásia','Europa','Oceania'];
const topicsAvailable = ['capital','idioma','continente','bandeira','escolha'];
function config(seconds, topics, region, direction = 'ambos') {
 if(!Number.isInteger(seconds)||seconds<1||seconds>600)throw Error('Escolha um tempo inteiro de 1 a 600 segundos.');
 if(!Array.isArray(topics)||!topics.length||topics.some(topic=>!topicsAvailable.includes(topic)))throw Error('Marque pelo menos um tipo de pergunta.');
 if(region!=='Todas'&&!regions.includes(region))throw Error('Selecione um continente válido.');
 if(!['ambos','direto','inverso'].includes(direction))throw Error('Selecione um sentido válido.');
 const result={seconds,topics:[...new Set(topics)],region,direction};
 if(!questions(result).length)throw Error('Não há perguntas para essa seleção. Escolha outro tema ou continente.');
 return result;
}
function pool(cfg) {
 return countries.filter(country=>cfg.region==='Todas'||country.continents.includes(cfg.region)||country.subregion===cfg.region);
}
function questions(cfg) {
 const result=[];
 for(const country of pool(cfg)) {
  for(const topic of cfg.topics) {
   if((topic==='bandeira'||topic==='escolha')&&!country.flag)continue;
   const canReverse=topic==='capital'&&!country.capitalPrompt&&country.capitals.length===1;
   const directions=canReverse?(cfg.direction==='ambos'?['direto','inverso']:[cfg.direction]):['direto'];
   for(const direction of directions) {
    let prompt,question=country.name,answer;
    if(topic==='capital') {
     prompt=country.capitalPrompt||(country.capitals.length>1?'Cite uma das capitais ou sedes de governo deste país.':'Qual é a capital deste país?');
     answer=country.capitals.join(' / ');
     if(direction==='inverso'){prompt='Esta cidade é a capital de qual país?';question=country.capitals[0];answer=country.name;}
    }else if(topic==='idioma') {
     prompt='Cite um idioma usado neste país.';
     answer=country.languages.join(' / ');
    }else if(topic==='continente') {
     prompt=country.continents.length>1?'Em quais continentes este país tem território?':'Em qual continente fica este país?';
     answer=country.continents.join(' e ')+(country.continents.includes('América')?' — '+country.subregion:'');
    }else if(topic==='bandeira') {
     prompt='A qual país pertence esta bandeira?';question='Que país é este?';answer=country.name;
    }else {
     prompt='Qual é a bandeira deste país?';answer=country.name;
    }
    result.push({key:country.code+':'+topic+':'+direction,state:country,topic,direction,prompt,question,answer,summary:(prompt+' '+(topic==='bandeira'?'':question)).trim()});
   }
  }
 }
 return result;
}
function shuffle(values,rng=Math.random) {
 const list=[...values];
 for(let index=list.length-1;index>0;index--){const other=Math.floor(rng()*(index+1));[list[index],list[other]]=[list[other],list[index]];}
 return list;
}
// These flags are very similar at classroom display sizes.
const similarFlags=[['MC','ID'],['RO','TD']];
function alternatives(q,cfg,rng=Math.random) {
 const similar=new Set(similarFlags.find(group=>group.includes(q.state.code))||[]);
 const eligible=country=>country.flag&&country.code!==q.state.code&&!similar.has(country.code);
 const preferred=shuffle(pool(cfg).filter(eligible),rng);
 const seen=new Set(preferred.map(country=>country.code));
 const others=shuffle(countries.filter(country=>eligible(country)&&!seen.has(country.code)),rng);
 const choices=shuffle([q.state,...preferred.concat(others).slice(0,3)],rng);
 const correctIndex=choices.findIndex(country=>country.code===q.state.code);
 return {...q,choices,correctIndex,answer:'ABCD'[correctIndex]+' — '+q.state.name};
}
root.GeografiaMundo={countries,regions,config,pool,questions,alternatives};
})(typeof module!=='undefined'?module.exports:globalThis);
