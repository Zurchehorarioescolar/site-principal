'use strict';

const $ = id => document.getElementById(id);
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const values = [50, 100, 150, 200, 250, 300, 400, 500];
const normalize = text => text.toLocaleUpperCase('pt-BR').normalize('NFD').replace(/\p{M}/gu, '');
const panels = {
  1: [
    ['Animais que podemos ter em casa', ['gato', 'cão', 'pato']],
    ['Frutas', ['uva', 'banana', 'mamão']],
    ['Coisas que usamos para escrever ou desenhar', ['lápis', 'giz', 'caneta']]
  ],
  2: [
    ['Coisas que usamos para preparar a comida', ['panela', 'colher', 'fogão']],
    ['O que podemos ver no céu', ['nuvem', 'estrela', 'lua']],
    ['Animais com penas', ['galinha', 'pinguim', 'papagaio']]
  ],
  3: [
    ['Meios de transporte', ['bicicleta', 'metrô', 'caminhão']],
    ['Insetos que encontramos na natureza', ['borboleta', 'formiga', 'joaninha']],
    ['Instrumentos musicais', ['violão', 'tambor', 'flauta']]
  ],
  4: [
    ['Formas de preparar alimentos', ['cozinhar', 'grelhar', 'refogar']],
    ['Coisas que usamos para observar ou registrar imagens', ['binóculo', 'câmera', 'telescópio']],
    ['Pessoas que trabalham em uma escola', ['professora', 'bibliotecário', 'diretora']]
  ],
  5: [
    ['Atividades e recursos de uma biblioteca', ['empréstimo', 'catálogo', 'pesquisa']],
    ['O que pode acontecer em uma apresentação de teatro', ['ensaio', 'improviso', 'aplauso']],
    ['Ações para cuidar dos materiais e reduzir o lixo', ['reciclagem', 'reutilização', 'compostagem']]
  ],
  6: [
    ['Partes de uma notícia', ['manchete', 'legenda', 'entrevista']],
    ['Fenômenos do tempo atmosférico', ['precipitação', 'neblina', 'tempestade']],
    ['Tipos de texto que contam uma história', ['crônica', 'romance', 'biografia']]
  ],
  7: [
    ['Etapas do ciclo da água', ['evaporação', 'condensação', 'precipitação']],
    ['Elementos de um mapa', ['legenda', 'escala', 'coordenadas']],
    ['Recursos usados para defender uma ideia', ['argumento', 'evidência', 'comparação']]
  ],
  8: [
    ['Etapas e recursos de uma investigação científica', ['hipótese', 'experimento', 'variável']],
    ['Ações para conferir uma notícia antes de repassá-la', ['verificação', 'contextualização', 'checagem']],
    ['Processos que modificam o relevo', ['erosão', 'sedimentação', 'intemperismo']]
  ],
  9: [
    ['Conceitos usados em discussões sobre cidadania', ['representatividade', 'participação', 'transparência']],
    ['Estratégias que ajudam a interpretar um texto', ['inferência', 'contextualização', 'comparação']],
    ['Formas de dialogar para resolver um conflito', ['mediação', 'negociação', 'conciliação']]
  ]
};

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const formatter = new Intl.NumberFormat('pt-BR');
const buttons = new Map();
let players = [], words = [], previousPanel = -1, year = '', active = 0;
let rotation = 0, stake = 0, phase = 'setup', spinTimer = null;
let guessed = new Set();

for (const grade of Object.keys(panels)) $('rouletteYear').add(new Option(grade + 'º ano', grade));
for (const [index, value] of values.entries()) {
  const angle = index * Math.PI / 4;
  const label = document.createElement('span');
  label.textContent = value;
  label.style.left = (50 + 34 * Math.sin(angle)) + '%';
  label.style.top = (50 - 34 * Math.cos(angle)) + '%';
  $('rouletteWheel').append(label);
}
for (const letter of alphabet) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = letter;
  button.addEventListener('click', () => guess(letter));
  buttons.set(letter, button);
  $('rouletteKeyboard').append(button);
}

function renderScores() {
  const cards = players.map((player, index) => {
    const card = document.createElement('div');
    card.className = 'roulette-score';
    if (index === active && phase !== 'over') card.setAttribute('aria-current', 'true');
    const name = document.createElement('strong');
    name.textContent = player.name;
    const score = document.createElement('span');
    score.textContent = formatter.format(player.score) + ' pontos';
    card.append(name, score);
    return card;
  });
  $('rouletteScores').replaceChildren(...cards);
  $('rouletteTurn').textContent = phase === 'over' ? 'Painel completo' : 'Vez de ' + players[active].name;
}

function renderWords() {
  $('rouletteWords').replaceChildren(...words.map((word, index) => {
    const row = document.createElement('div');
    row.className = 'roulette-row';
    row.setAttribute('role', 'group');
    const spoken = [];
    for (const char of word.toLocaleUpperCase('pt-BR')) {
      const tile = document.createElement('span');
      const key = normalize(char);
      const visible = guessed.has(key);
      tile.textContent = visible ? char : '';
      tile.dataset.visible = String(visible);
      tile.setAttribute('aria-hidden', 'true');
      spoken.push(visible ? char : 'em branco');
      row.append(tile);
    }
    row.setAttribute('aria-label', 'Palavra ' + (index + 1) + ': ' + spoken.join(', '));
    return row;
  }));
}

function setPhase(next) {
  phase = next;
  $('rouletteSpin').disabled = phase !== 'ready';
  $('rouletteReplay').hidden = phase !== 'over';
  for (const [letter, button] of buttons) {
    button.disabled = phase !== 'letter' || guessed.has(letter);
    button.dataset.hit = String(guessed.has(letter) && words.some(word => normalize(word).includes(letter)));
  }
}

function newGame() {
  const choices = panels[year];
  const indices = choices.map((_, index) => index).filter(index => index !== previousPanel);
  previousPanel = indices[Math.floor(Math.random() * indices.length)];
  const [clue, answers] = choices[previousPanel];
  words = answers;
  guessed = new Set();
  for (const player of players) player.score = 0;
  active = 0;
  stake = 0;
  $('rouletteClue').textContent = clue;
  $('rouletteGrade').textContent = year + 'º ano';
  $('rouletteValue').textContent = 'Pronta para girar';
  $('rouletteStatus').textContent = 'Gire a roleta para escolher uma letra.';
  setPhase('ready');
  renderWords();
  renderScores();
  $('rouletteSpin').focus();
}

function spin() {
  if (phase !== 'ready') return;
  const index = Math.floor(Math.random() * values.length);
  const destination = (360 - index * 45) % 360;
  const advance = (destination - rotation % 360 + 360) % 360;
  rotation += 4 * 360 + advance;
  setPhase('spinning');
  $('rouletteValue').textContent = 'Girando…';
  $('rouletteWheel').style.transform = 'rotate(' + rotation + 'deg)';
  spinTimer = setTimeout(() => {
    spinTimer = null;
    stake = values[index];
    $('rouletteValue').textContent = stake + ' pontos por letra';
    $('rouletteStatus').textContent = 'A roleta parou em ' + stake + '. Escolha uma letra.';
    setPhase('letter');
    for (const button of buttons.values()) {
      if (!button.disabled) { button.focus(); break; }
    }
  }, reducedMotion.matches ? 0 : 1320);
}

function guess(letter) {
  if (phase !== 'letter' || guessed.has(letter)) return;
  guessed.add(letter);
  const occurrences = words.reduce((total, word) => total + [...normalize(word)].filter(char => char === letter).length, 0);
  const player = players[active];
  const earned = occurrences * stake;
  player.score += earned;
  const done = words.every(word => [...normalize(word)].every(char => guessed.has(char)));
  let message;
  if (occurrences) {
    message = letter + ' aparece ' + occurrences + (occurrences === 1 ? ' vez' : ' vezes') + '. ' +
      occurrences + ' × ' + stake + ' = ' + formatter.format(earned) + ' pontos para ' + player.name + '.';
  } else {
    active = (active + 1) % players.length;
    message = 'O painel não tem a letra ' + letter + '. Vez de ' + players[active].name + '.';
  }
  setPhase(done ? 'over' : 'ready');
  renderWords();
  renderScores();
  if (done) {
    const highScore = Math.max(...players.map(entry => entry.score));
    const winners = players.filter(entry => entry.score === highScore).map(entry => entry.name);
    message += players.length === 1 ? ' Você completou o painel!' :
      winners.length === 1 ? ' Vitória de ' + winners[0] + '!' : ' Empate entre ' + winners.join(', ') + '!';
    $('rouletteReplay').focus();
  } else {
    $('rouletteSpin').focus();
  }
  $('rouletteStatus').textContent = message;
}

$('rouletteSetup').addEventListener('submit', event => {
  event.preventDefault();
  const next = $('rouletteYear').value;
  const names = [1, 2, 3].map(index => $('rouletteName' + index).value.trim());
  if (!panels[next] || !names[0]) {
    $('rouletteSetupStatus').textContent = 'Escolha o ano e informe o nome do primeiro participante.';
    return;
  }
  if (year !== next) previousPanel = -1;
  year = next;
  players = names.filter(Boolean).map(name => ({name, score: 0}));
  $('rouletteSetupStatus').textContent = '';
  $('rouletteSetup').hidden = true;
  $('rouletteGame').hidden = false;
  newGame();
});
$('rouletteSpin').addEventListener('click', spin);
$('rouletteReplay').addEventListener('click', newGame);
$('rouletteSettings').addEventListener('click', () => {
  clearTimeout(spinTimer);
  spinTimer = null;
  setPhase('setup');
  $('rouletteGame').hidden = true;
  $('rouletteSetup').hidden = false;
  $('rouletteYear').focus();
});
document.addEventListener('keydown', event => {
  if (phase !== 'letter' || event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.isComposing ||
      event.target.closest('input, select, textarea, [contenteditable]')) return;
  const letter = normalize(event.key);
  if (letter.length !== 1 || !alphabet.includes(letter)) return;
  event.preventDefault();
  guess(letter);
});
