
let game;
let character, cursors,
    score = 0,
    playerSpeed = 650,
    obstacleSpeed = 200;
let scoreText, speedText, obstacles, gameOverFlag = false, playerName = '', charVariant = 1;
let music;
let background;
const BASE_SPEED = 200;
let MAX_OBSTACLES = 3;
const SPAWN_INTERVAL = 1500;
let texture = 'mm';
let spawnTimer = 0;

function init() {
  const overlay = document.getElementById('overlay');
  const splash = document.getElementById('splash');
  const nameInput = document.getElementById('nameInput');
  const startBtn = document.getElementById('startBtn');
  const hsDiv = document.getElementById('hs');
  const hsList = document.getElementById('overlayHSList');

  setTimeout(() => {
    if (splash) splash.style.display = 'none';
    if (overlay) overlay.style.display = 'flex';
  }, 3000);

  loadHighscores(hsDiv, hsList);

  startBtn.onclick = () => {
    const n = nameInput.value.trim();
    if (!n) return alert('Skriv inn navn');

    const pg = document.querySelector('input[name="playerGender"]:checked').value;
    const ug = document.querySelector('input[name="userGender"]:checked').value;
    if (pg === 'm' && ug === 'm') charVariant = 1;
    else if (pg === 'f' && ug === 'm') charVariant = 2;
    else if (pg === 'm' && ug === 'f') charVariant = 3;
    else charVariant = 4;

    const charMap = { 1: 'mm', 2: 'fm', 3: 'mf', 4: 'ff' };
    texture = charMap[charVariant] || 'mm';

    playerName = n;
    overlay.style.display = 'none';
    startGame();
  };
}

async function loadHighscores(target, listEl) {
  try {
    const r = await fetch('highscore.php', { cache: 'no-store' });
    if (!r.ok) throw new Error('php failed');
    const data = await r.json();
    renderScores(data, target, listEl);
  } catch (e) {
    try {
      const r = await fetch('scores.json', { cache: 'no-store' });
      const data = await r.json();
      renderScores(data, target, listEl);
    } catch (err) {
      console.error('Highscore-feil:', err);
      target.innerText = 'Kunne ikke laste highscore.';
      if (listEl) listEl.innerHTML = '<li>Feil ved lasting</li>';
    }
  }
}

function renderScores(data, target, listEl) {
  const sorted = data.sort((a, b) => b.score - a.score);
  const top10 = sorted.slice(0, 10);
  target.innerText = '🏆 Highscore:
' +
    top10.map((e, i) => `${i + 1}. ${e.name} – ${e.score}`).join('\n');

  if (listEl) {
    listEl.innerHTML = '';
    sorted.slice(0, 5).forEach((e, i) => {
      const li = document.createElement('li');
      li.textContent = `${i + 1}. ${e.name} – ${e.score}`;
      listEl.appendChild(li);
    });
  }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  init();
} else {
  window.addEventListener('load', init);
}

function startGame() {
  score = 0;
  playerSpeed = 650;
  obstacleSpeed = BASE_SPEED;
  gameOverFlag = false;
  spawnTimer = 0;
  if (music) music.stop();

  const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    scene: { preload, create, update },
    physics: {
      default: 'arcade',
      arcade: { gravity: { y: 0 } }
    }
  };
  if (game) game.destroy(true);
  game = new Phaser.Game(config);
  window.addEventListener('resize', () => {
    if (game && game.scale) {
      game.scale.resize(window.innerWidth, window.innerHeight);
    }
  });
}

function preload() {
  this.load.image('bg', 'https://terapisomvirker.no/b22/assets/background_grass.png');
  this.load.image('mm', 'assets/mm.png?v=2');
  this.load.image('mf', 'assets/mf.png?v=2');
  this.load.image('fm', 'assets/fm.png?v=2');
  this.load.image('ff', 'assets/ff.png?v=2');

  this.load.image('obst_barnevogn', 'assets/obst_barnevogn.png?v=2');
  this.load.image('obst_hundemann', 'assets/obst_hundemann.png?v=2');
  this.load.image('obst_skater', 'assets/obst_skater.png?v=2');

  this.load.audio('bgmusic', 'assets/B22soundscape.ogg?v=2');
}
