'use strict';

const $ = id => document.getElementById(id);
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const regularValues = [50, 100, 150, 200, 250, 300, 400, 500];
const wheelColors = ['#276c75', '#3a527f', '#78506b', '#8a5c29', '#3d6d58', '#684e8d', '#9b5249', '#315979'];
const passSector = 'Passe a vez';
const resetSector = 'Perde tudo';
const turnSounds = {
  pass: [[440, 0, .11], [330, .09, .19]],
  wrong: [[370, 0, .10], [247, .10, .24]],
  reset: [[392, 0, .15], [277, .13, .18], [196, .28, .35]]
};
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
const gameDialog = $('rouletteGame');
const mathDialog = $('rouletteMathDialog');
const resultDialog = $('rouletteResult');
let players = [], words = [], previousPanel = -1, year = '', active = 0;
let rotation = 0, stake = 0, phase = 'setup', spinTimer = null;
let guessed = new Set(), tiles = [], revealId = 0;
let outcomes = [], manualScoring = false, mixedOperations = false, tablesMode = false, pending = null;
let audio = null, spinSoundTimer = null;

for (const grade of Object.keys(panels)) $('rouletteYear').add(new Option(grade + 'º ano', grade));
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
  tiles = [];
  const panel = $('rouletteWords');
  panel.style.setProperty('--letters', Math.max(...words.map(word => [...word].length)));
  panel.replaceChildren(...words.map((word, index) => {
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
      tiles.push({tile, char, key});
    }
    row.setAttribute('aria-label', 'Palavra ' + (index + 1) + ': ' + spoken.join(', '));
    return row;
  }));
}

function setPhase(next) {
  phase = next;
  $('rouletteSpin').disabled = phase !== 'ready';
  $('rouletteReplay').hidden = phase !== 'over';
  $('rouletteKeyboard').hidden = phase === 'over';
  for (const [letter, button] of buttons) {
    button.disabled = phase !== 'letter' || guessed.has(letter);
    if (guessed.has(letter)) button.dataset.hit = String(tiles.some(item => item.key === letter));
    else delete button.dataset.hit;
  }
}

function updateScoringOptions() {
  const selected = Number($('rouletteYear').value);
  const manual = $('rouletteManual');
  const tables = $('rouletteTables');
  const showTables = selected >= 6;
  $('rouletteManualOption').hidden = showTables;
  manual.disabled = selected < 1 || selected > 5;
  if (manual.disabled) manual.checked = false;
  $('rouletteTablesOption').hidden = !showTables;
  tables.disabled = !showTables;
  if (!showTables) tables.checked = false;
  const showMixed = manual.checked && selected >= 3;
  $('rouletteMixedOption').hidden = !showMixed;
  $('rouletteMixed').disabled = !showMixed;
  if (!showMixed) $('rouletteMixed').checked = false;
  $('rouletteMathHint').textContent = showTables
    ? 'Com a tabuada, resolva uma multiplicação para confirmar os pontos.'
    : !selected ? 'Escolha o ano para ver as opções de pontuação.'
    : selected <= 2
      ? 'Na pontuação manual, some os valores em unidades para confirmar os pontos.'
      : 'Na pontuação manual, use dezenas. Com a segunda opção, o jogo sorteia entre adição e multiplicação.';
}

function configureWheel() {
  const unit = Number(year) <= 2 ? 1 : 10;
  const points = tablesMode ? [2, 3, 4, 5, 6, 7, 8, 9]
    : manualScoring ? Array.from({length: 6}, (_, index) => (index + 1) * unit) : regularValues;
  outcomes = [...points.slice(0, 3), passSector, ...points.slice(3), resetSector];
  const degrees = 360 / outcomes.length;
  const wheel = $('rouletteWheel');
  const sectors = outcomes.map((value, index) => {
    const color = value === passSector ? '#67502d' : value === resetSector ? '#982f44' : wheelColors[index % wheelColors.length];
    return color + ' ' + index * degrees + 'deg ' + (index + 1) * degrees + 'deg';
  });
  wheel.style.background = 'conic-gradient(from ' + (-degrees / 2) + 'deg, ' + sectors.join(', ') + ')';
  wheel.replaceChildren(...outcomes.map((value, index) => {
    const angle = index * 2 * Math.PI / outcomes.length;
    const label = document.createElement('span');
    if (typeof value === 'number') label.textContent = value;
    else {
      label.className = 'roulette-special';
      label.textContent = value === passSector ? 'Passe\na vez' : 'Perde\ntudo';
    }
    label.style.left = (50 + 34 * Math.sin(angle)) + '%';
    label.style.top = (50 - 34 * Math.cos(angle)) + '%';
    return label;
  }));
}

function newGame() {
  revealId++;
  if (resultDialog.open) resultDialog.close();
  const choices = panels[year];
  const indices = choices.map((_, index) => index).filter(index => index !== previousPanel);
  previousPanel = indices[Math.floor(Math.random() * indices.length)];
  const [clue, answers] = choices[previousPanel];
  words = answers;
  guessed = new Set();
  for (const player of players) player.score = 0;
  active = 0;
  stake = 0;
  pending = null;
  $('rouletteClue').textContent = clue;
  $('rouletteGrade').textContent = year + 'º ano';
  $('rouletteValue').textContent = 'Pronta para girar';
  $('rouletteStatus').textContent = 'Gire a roleta para escolher uma letra.';
  renderWords();
  setPhase('ready');
  renderScores();
  $('rouletteSpin').focus();
}

function spin() {
  if (phase !== 'ready') return;
  enableAudio();
  const index = Math.floor(Math.random() * outcomes.length);
  const destination = (360 - index * (360 / outcomes.length)) % 360;
  const advance = (destination - rotation % 360 + 360) % 360;
  rotation += 4 * 360 + advance;
  setPhase('spinning');
  $('rouletteValue').textContent = 'Girando…';
  $('rouletteWheel').style.transform = 'rotate(' + rotation + 'deg)';
  const duration = reducedMotion.matches ? 0 : 1320;
  playSpinSound(duration);
  spinTimer = setTimeout(() => {
    spinTimer = null;
    stopSpinSound();
    const outcome = outcomes[index];
    if (outcome === passSector) {
      $('rouletteValue').textContent = passSector;
      passTurn('Passe a vez.');
      return;
    }
    if (outcome === resetSector) {
      const player = players[active];
      player.score = 0;
      $('rouletteValue').textContent = resetSector;
      passTurn(player.name + ' perdeu todos os pontos.', turnSounds.reset);
      return;
    }
    stake = outcome;
    $('rouletteValue').textContent = stake + ' pontos por letra';
    $('rouletteStatus').textContent = 'A roleta parou em ' + stake + '. Escolha uma letra.';
    setPhase('letter');
    for (const button of buttons.values()) {
      if (!button.disabled) { button.focus(); break; }
    }
  }, duration);
}

function passTurn(message, sound = turnSounds.pass) {
  stake = 0;
  pending = null;
  active = (active + 1) % players.length;
  setPhase('ready');
  renderScores();
  $('rouletteStatus').textContent = message + ' Vez de ' + players[active].name + '.';
  chime(sound, .055);
  $('rouletteSpin').focus();
}

function guess(letter) {
  if (phase !== 'letter' || guessed.has(letter)) return;
  const occurrences = tiles.filter(item => item.key === letter).length;
  if (!occurrences) {
    guessed.add(letter);
    passTurn('O painel não tem a letra ' + letter + '.');
    return;
  }
  const count = letter + ' aparece ' + occurrences + (occurrences === 1 ? ' vez' : ' vezes') + '. ';
  const multiplication = occurrences + ' × ' + stake;
  const equation = !manualScoring || tablesMode || (mixedOperations && Math.random() < .5)
    ? multiplication : Array(occurrences).fill(stake).join(' + ');
  const play = {letter, count, equation, earned: occurrences * stake};
  if (!manualScoring) {
    awardPoints(play);
    return;
  }
  pending = play;
  $('rouletteMathClue').textContent = count.trim();
  $('rouletteEquation').textContent = equation + ' = ?';
  $('rouletteAnswer').value = '';
  $('rouletteStatus').textContent = count + 'Resolva a conta para confirmar os pontos.';
  setPhase('math');
  mathDialog.showModal();
  $('rouletteAnswer').focus();
}

function enableAudio() {
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!audio && Audio) audio = new Audio();
    if (audio?.state === 'suspended') audio.resume().catch(() => {});
  } catch {}
}

function chime(notes, peak = .07) {
  if (audio?.state !== 'running') return;
  try {
    const now = audio.currentTime;
    for (const [frequency, delay, duration] of notes) {
      const tone = audio.createOscillator();
      const volume = audio.createGain();
      const start = now + delay;
      tone.frequency.value = frequency;
      volume.gain.setValueAtTime(.001, start);
      volume.gain.exponentialRampToValueAtTime(peak, start + .012);
      volume.gain.exponentialRampToValueAtTime(.001, start + duration);
      tone.connect(volume).connect(audio.destination);
      tone.onended = () => { tone.disconnect(); volume.disconnect(); };
      tone.start(start);
      tone.stop(start + duration);
    }
  } catch {}
}

function stopSpinSound() {
  clearTimeout(spinSoundTimer);
  spinSoundTimer = null;
}

function playSpinSound(duration) {
  stopSpinSound();
  const started = performance.now();
  const tick = () => {
    if (phase !== 'spinning') return;
    const progress = duration ? Math.min(1, (performance.now() - started) / duration) : 1;
    chime([[960 - 270 * progress, 0, .038]], .028);
    if (progress < 1) {
      const interval = 50 + 135 * progress ** 2;
      if (interval + 38 < duration * (1 - progress)) spinSoundTimer = setTimeout(tick, interval);
    }
  };
  tick();
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function awardPoints({letter, count, equation, earned}) {
  const run = ++revealId;
  setPhase('revealing');
  $('rouletteStatus').textContent = count + 'Revelando as letras…';
  const slow = !reducedMotion.matches;
  for (const {tile, char} of tiles.filter(item => item.key === letter)) {
    tile.classList.add('roulette-primed');
    await wait(slow ? 160 : 70);
    if (run !== revealId) return;
    if (slow) {
      tile.classList.add('roulette-turning');
      await wait(110);
      if (run !== revealId) return;
    }
    tile.textContent = char;
    tile.dataset.visible = 'true';
    tile.classList.remove('roulette-primed', 'roulette-turning');
    chime([[1480, 0, .095], [1110, .085, .13]]);
    await wait(slow ? 150 : 110);
    if (run !== revealId) return;
  }
  guessed.add(letter);
  const player = players[active];
  player.score += earned;
  const done = tiles.every(item => guessed.has(item.key));
  let message = count + equation + ' = ' + formatter.format(earned) + ' pontos para ' + player.name + '.';
  setPhase(done ? 'over' : 'ready');
  renderWords();
  renderScores();
  if (done) {
    const highScore = Math.max(...players.map(entry => entry.score));
    const winners = players.filter(entry => entry.score === highScore).map(entry => entry.name);
    message += players.length === 1 ? ' Você completou o painel!' :
      winners.length === 1 ? ' Vitória de ' + winners[0] + '!' : ' Empate entre ' + winners.join(', ') + '!';
    celebrate(winners, highScore);
  } else {
    $('rouletteSpin').focus();
  }
  $('rouletteStatus').textContent = message;
}

function celebrate(winners, score) {
  $('rouletteResultTitle').textContent = players.length === 1 ? 'Parabéns!' : winners.length === 1 ? 'Vitória!' : 'Empate!';
  $('rouletteWinner').textContent = winners.join(' e ');
  $('rouletteFinalScore').textContent = formatter.format(score) + ' pontos';
  const colors = ['#ffda76', '#83edc2', '#7dbaff', '#ff94ac'];
  const pieces = reducedMotion.matches ? [] : Array.from({length: 24}, (_, index) => {
    const piece = document.createElement('span');
    piece.style.setProperty('--left', (index * 37 % 100) + '%');
    piece.style.setProperty('--drift', (index % 2 ? 38 : -38) + 'px');
    piece.style.setProperty('--delay', (index % 6) * 65 + 'ms');
    piece.style.setProperty('--color', colors[index % colors.length]);
    return piece;
  });
  $('rouletteConfetti').replaceChildren(...pieces);
  resultDialog.showModal();
  $('rouletteResultReplay').focus();
  chime([[523, 0, .23], [659, .16, .23], [784, .32, .24], [1047, .49, .42]]);
}

function resolveMath(verdict) {
  if (phase !== 'math' || !pending) return;
  const play = pending;
  pending = null;
  mathDialog.close();
  if (verdict === 'correct') awardPoints(play);
  else if (verdict === 'wrong') passTurn('A conta não confere.', turnSounds.wrong);
  else {
    $('rouletteStatus').textContent = 'Conta cancelada. Escolha uma letra para esta mesma jogada.';
    setPhase('letter');
    buttons.get(play.letter).focus();
  }
}

$('rouletteMath').addEventListener('submit', event => {
  event.preventDefault();
  if (phase !== 'math' || !pending) return;
  const answer = $('rouletteAnswer').valueAsNumber;
  if (Number.isInteger(answer) && answer >= 0) resolveMath(answer === pending.earned ? 'correct' : 'wrong');
});
$('rouletteCorrect').addEventListener('click', () => resolveMath('correct'));
$('rouletteWrong').addEventListener('click', () => resolveMath('wrong'));
$('rouletteCancel').addEventListener('click', () => resolveMath('cancel'));
mathDialog.addEventListener('cancel', event => {
  event.preventDefault();
  resolveMath('cancel');
});

$('rouletteYear').addEventListener('change', updateScoringOptions);
$('rouletteManual').addEventListener('change', updateScoringOptions);
updateScoringOptions();
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
  updateScoringOptions();
  tablesMode = $('rouletteTables').checked;
  manualScoring = $('rouletteManual').checked || tablesMode;
  mixedOperations = $('rouletteMixed').checked;
  configureWheel();
  players = names.filter(Boolean).map(name => ({name, score: 0}));
  $('rouletteSetupStatus').textContent = '';
  $('rouletteSetup').hidden = true;
  gameDialog.showModal();
  newGame();
});
$('rouletteSpin').addEventListener('click', spin);
$('rouletteReplay').addEventListener('click', newGame);
$('rouletteResultReplay').addEventListener('click', newGame);
resultDialog.addEventListener('close', () => { if (phase === 'over') $('rouletteReplay').focus(); });
function leaveGame() {
  clearTimeout(spinTimer);
  spinTimer = null;
  stopSpinSound();
  revealId++;
  pending = null;
  setPhase('setup');
  $('rouletteSetup').hidden = false;
  gameDialog.close();
  $('rouletteYear').focus();
}
$('rouletteSettings').addEventListener('click', leaveGame);
gameDialog.addEventListener('cancel', event => {
  event.preventDefault();
  leaveGame();
});
window.addEventListener('pagehide', stopSpinSound);
document.addEventListener('keydown', event => {
  if (phase !== 'letter' || event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.isComposing ||
      event.target.closest('input, select, textarea, [contenteditable]')) return;
  const letter = normalize(event.key);
  if (letter.length !== 1 || !alphabet.includes(letter)) return;
  event.preventDefault();
  guess(letter);
});
