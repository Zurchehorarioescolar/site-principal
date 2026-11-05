'use strict';

const byId = id => document.getElementById(id);
const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const maxErrors = 6;
const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
const normalize = text => text.trim().toLocaleUpperCase('pt-BR').normalize('NFD').replace(/\p{M}/gu, '');
const bank = typeof fluenciaMateriais === 'undefined' ? {} : fluenciaMateriais;
let grade = '', queue = [], word = '', guesses = new Set(), wrongWords = new Set();
let errors = 0, ended = true, recognizer = null;

for (const year of Object.keys(bank)) byId('forcaYear').add(new Option(year + 'º ano', year));
if (!Object.keys(bank).length) byId('setupHint').textContent = 'O banco de palavras não carregou. Atualize a página.';

const buttons = new Map();
for (const letter of letters) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = letter;
  button.addEventListener('click', () => guessLetter(letter));
  buttons.set(letter, button);
  byId('forcaKeyboard').append(button);
}
const drawing = document.querySelectorAll('[data-error]');

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [items[index], items[other]] = [items[other], items[index]];
  }
  return items;
}

function startRound() {
  stopVoice();
  if (!queue.length) {
    const distinct = new Map(bank[grade].flatMap(set => set.words).map(value => [normalize(value), value]));
    queue = shuffle([...distinct.values()]);
    if (queue.length > 1 && queue.at(-1) === word) queue.unshift(queue.pop());
  }
  word = queue.pop();
  guesses = new Set();
  wrongWords = new Set();
  errors = 0;
  ended = false;
  byId('forcaGrade').textContent = grade + 'º ano';
  byId('guessWord').value = '';
  byId('voiceGuessStatus').textContent = '';
  render('Escolha uma letra ou tente a palavra inteira.');
  byId('forcaWord').focus();
}

function render(message) {
  const key = normalize(word);
  const cells = Array.from(word.toLocaleUpperCase('pt-BR'), char => {
    const tile = document.createElement('span');
    const letter = normalize(char);
    const visible = ended || !letters.includes(letter) || guesses.has(letter);
    tile.textContent = visible ? char : ' ';
    return { tile, label: visible ? char : 'em branco' };
  });
  byId('forcaWord').replaceChildren(...cells.map(cell => cell.tile));
  byId('forcaWord').setAttribute('aria-label', 'Palavra: ' + cells.map(cell => cell.label).join(', '));
  const left = maxErrors - errors;
  byId('forcaLeft').textContent = left === 1 ? '1 tentativa restante' : left + ' tentativas restantes';
  byId('forcaStatus').textContent = message;
  for (const piece of drawing) piece.toggleAttribute('hidden', Number(piece.dataset.error) > errors);
  for (const [letter, button] of buttons) {
    button.disabled = ended || guesses.has(letter);
    button.dataset.result = guesses.has(letter) ? (key.includes(letter) ? 'right' : 'wrong') : '';
  }
  byId('guessForm').hidden = ended;
  byId('nextWord').hidden = !ended;
  if (ended) byId('nextWord').focus();
}

function finishGuess(message) {
  if (errors === maxErrors) {
    ended = true;
    message = 'Fim da rodada! A palavra era ' + word.toLocaleUpperCase('pt-BR') + '.';
  } else if ([...normalize(word)].every(letter => !letters.includes(letter) || guesses.has(letter))) {
    ended = true;
    message = 'Você acertou! A palavra é ' + word.toLocaleUpperCase('pt-BR') + '.';
  }
  if (ended) stopVoice();
  render(message);
}

function guessLetter(letter) {
  if (ended || guesses.has(letter)) return;
  guesses.add(letter);
  const correct = normalize(word).includes(letter);
  if (!correct) errors++;
  finishGuess(correct ? 'A letra ' + letter + ' está na palavra.' : 'A palavra não tem a letra ' + letter + '.');
}

byId('guessForm').addEventListener('submit', event => {
  event.preventDefault();
  if (ended) return;
  const input = byId('guessWord');
  const candidate = normalize(input.value);
  if (!/^[A-Z]+(?:-[A-Z]+)*$/.test(candidate)) {
    render('Digite somente uma palavra.');
    return;
  }
  stopVoice();
  byId('voiceGuessStatus').textContent = '';
  input.value = '';
  if (candidate === normalize(word)) {
    for (const letter of candidate) guesses.add(letter);
    finishGuess('');
  } else if (wrongWords.has(candidate)) {
    render('Você já tentou essa palavra. Tente outra.');
  } else {
    wrongWords.add(candidate);
    errors++;
    finishGuess('Essa não é a palavra. Tente novamente.');
  }
});

byId('forcaSetup').addEventListener('submit', event => {
  event.preventDefault();
  const next = byId('forcaYear').value;
  if (!bank[next]) return;
  if (grade !== next) { grade = next; queue = []; word = ''; }
  byId('forcaSetup').hidden = true;
  byId('forcaGame').hidden = false;
  startRound();
});
byId('nextWord').addEventListener('click', startRound);
byId('changeYear').addEventListener('click', () => {
  stopVoice();
  ended = true;
  byId('forcaGame').hidden = true;
  byId('forcaSetup').hidden = false;
  byId('forcaYear').focus();
});
document.addEventListener('keydown', event => {
  if (ended || event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.isComposing ||
      event.target.closest('input, select, textarea, [contenteditable]')) return;
  const key = normalize(event.key);
  if (key.length !== 1 || !letters.includes(key)) return;
  event.preventDefault();
  guessLetter(key);
});

const voiceButton = byId('voiceGuess');
voiceButton.hidden = !Speech || !window.isSecureContext;
function stopVoice() {
  if (!recognizer) return;
  const old = recognizer;
  recognizer = null;
  old.onstart = old.onresult = old.onerror = old.onend = null;
  try { old.abort(); } catch {}
  voiceButton.disabled = false;
}
voiceButton.addEventListener('click', () => {
  if (ended || recognizer) return;
  const status = byId('voiceGuessStatus');
  try {
    const speech = new Speech();
    recognizer = speech;
    speech.lang = 'pt-BR';
    voiceButton.disabled = true;
    status.textContent = 'Ativando o microfone…';
    speech.onstart = () => { status.textContent = 'Diga só a palavra que quer tentar.'; };
    speech.onresult = event => {
      const heard = event.results[0][0].transcript.trim().replace(/[.!?]+$/, '');
      stopVoice();
      const input = byId('guessWord');
      input.value = heard;
      status.textContent = 'Confira a palavra ou corrija antes de enviar.';
      input.focus();
    };
    speech.onerror = () => {
      stopVoice();
      status.textContent = 'A escuta foi interrompida. Você pode digitar a palavra.';
    };
    speech.onend = () => {
      stopVoice();
      status.textContent = 'Nenhuma palavra foi registrada. Tente novamente ou digite.';
    };
    speech.start();
  } catch {
    stopVoice();
    status.textContent = 'O microfone está indisponível. Você pode digitar a palavra.';
  }
});
window.addEventListener('pagehide', stopVoice);
