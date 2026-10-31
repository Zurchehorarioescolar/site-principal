(function(root){
'use strict';
const source='https://www.gov.br/casacivil/pt-br/composicao/secretaria-especial-para-assunto-juridicos/listas-de-indicacao-em-tramite-na-presidencia-da-republica/tribunais-regionais-eleitorais/bandeiras/';
const raw=[
['AC','Acre','Rio Branco','Norte','bandeira_do_acre'],
['AL','Alagoas','Maceió','Nordeste','bandeira_de_alagoas'],
['AP','Amapá','Macapá','Norte','bandeira_do_amapa'],
['AM','Amazonas','Manaus','Norte','bandeira_do_amazonas'],
['BA','Bahia','Salvador','Nordeste','bandeira_da_bahia'],
['CE','Ceará','Fortaleza','Nordeste','bandeira_estado_ceara'],
['DF','Distrito Federal','Brasília','Centro-Oeste','bandeira_do_distrito_federal'],
['ES','Espírito Santo','Vitória','Sudeste','bandeira_do_espirito'],
['GO','Goiás','Goiânia','Centro-Oeste','bandeira_de_goias'],
['MA','Maranhão','São Luís','Nordeste','bandeira_do_maranhao'],
['MT','Mato Grosso','Cuiabá','Centro-Oeste','bandeira_de_mato_grosso'],
['MS','Mato Grosso do Sul','Campo Grande','Centro-Oeste','bandeira_de_mato_gros_sul'],
['MG','Minas Gerais','Belo Horizonte','Sudeste','bandeira_de_minas_ger'],
['PA','Pará','Belém','Norte','bandeira_do_para'],
['PB','Paraíba','João Pessoa','Nordeste','bandeira_da_paraiba'],
['PR','Paraná','Curitiba','Sul','bandeira_do_parana'],
['PE','Pernambuco','Recife','Nordeste','bandeira_de_pernambuc'],
['PI','Piauí','Teresina','Nordeste','bandeira_do_piaui'],
['RJ','Rio de Janeiro','Rio de Janeiro','Sudeste','bandeira_estado_riode_janeiro'],
['RN','Rio Grande do Norte','Natal','Nordeste','bandeira_do_rio_grand_norte'],
['RS','Rio Grande do Sul','Porto Alegre','Sul','bandeira_estado_riogr_sul'],
['RO','Rondônia','Porto Velho','Norte','bandeira_de_rondonia'],
['RR','Roraima','Boa Vista','Norte','bandeira_de_roraima'],
['SC','Santa Catarina','Florianópolis','Sul','bandeira_santa_catari'],
['SP','São Paulo','São Paulo','Sudeste','bandeira_do_estado_sao_paulo'],
['SE','Sergipe','Aracaju','Nordeste','bandeira_de_sergipe'],
['TO','Tocantins','Palmas','Norte','bandeira_do_tocantins']];
const states=raw.map(([uf,name,capital,region,file])=>({uf,name,capital,region,flag:`bandeiras/${uf}.svg`}));
const regions=['Norte','Nordeste','Centro-Oeste','Sudeste','Sul'];
function config(seconds,topics,region,includeDF){
 if(!Number.isInteger(seconds)||seconds<1||seconds>600)throw Error('Escolha um tempo inteiro de 1 a 600 segundos.');
 if(!Array.isArray(topics)||!topics.length||topics.some(t=>!['capital','sigla','bandeira'].includes(t)))throw Error('Marque pelo menos um tipo de pergunta.');
 if(region!=='Todas'&&!regions.includes(region))throw Error('Selecione uma região válida.');
 return {seconds,topics:[...new Set(topics)],region,includeDF:!!includeDF};
}
function pool(cfg){return states.filter(s=>(cfg.region==='Todas'||s.region===cfg.region)&&(cfg.includeDF||s.uf!=='DF'));}
function questions(cfg){return pool(cfg).flatMap(state=>cfg.topics.map(topic=>{
 const prompt=topic==='capital'?(state.uf==='DF'?'Qual é a sede do governo federal?':'Qual é a capital desta UF?'):topic==='sigla'?'Qual é a sigla desta UF?':'A qual UF pertence esta bandeira?';
 const answer=topic==='capital'?state.capital:topic==='sigla'?state.uf:state.name;
 return {key:state.uf+':'+topic,state,topic,prompt,question:topic==='bandeira'?'Que UF é esta?':state.name,answer,summary:`${prompt} ${topic==='bandeira'?'':state.name}`.trim()};
}));}
root.Geografia={states,regions,config,pool,questions};
})(typeof module!=='undefined'?module.exports:globalThis);
