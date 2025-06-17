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

function init() {
  const overlay = document.getElementById('overlay');
  const nameInput = document.getElementById('nameInput');
  const startBtn = document.getElementById('startBtn');
  const hsDiv = document.getElementById('hs');
  const hsList = document.getElementById('overlayHSList');

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
  target.innerText = '🏆 Highscore:\n' +
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
  this.load.image('bg', 'assets/background_grass.png?v=2');
  this.load.image('mm', 'assets/mm.png?v=2');
  this.load.image('mf', 'assets/mf.png?v=2');
  this.load.image('fm', 'assets/fm.png?v=2');
  this.load.image('ff', 'assets/ff.png?v=2');

  this.load.image('obst_barnevogn', 'assets/obst_barnevogn.png?v=2');
  this.load.image('obst_hundemann', 'assets/obst_hundemann.png?v=2');
  this.load.image('obst_skater', 'assets/obst_skater.png?v=2');

  this.load.audio('bgmusic', 'assets/B22soundscape.ogg?v=2');
}

function create() {
  background = this.add.tileSprite(0, 0, this.cameras.main.width, this.cameras.main.height, 'bg');
  background.setOrigin(0, 0);
  background.setDepth(0);

  const centerX = this.cameras.main.width / 2;
  const centerY = this.cameras.main.height * 0.8;

  music = this.sound.add('bgmusic', { loop: true });
  music.play();
  music.setRate(1);

  character = this.physics.add.sprite(centerX, centerY, texture);
  character.setCollideWorldBounds(true);

  cursors = this.input.keyboard.createCursorKeys();
  this.input.on('pointerdown', pointer => {
    if (pointer.x < centerX) character.x -= centerX / 2;
    else character.x += centerX / 2;
  });

  obstacles = this.physics.add.group();
  this.time.addEvent({
    delay: SPAWN_INTERVAL,
    callback: spawnObstacle,
    callbackScope: this,
    loop: true
  });

  scoreText = this.add.text(10, 10, 'Poeng: 0', {
    font: '24px sans-serif',
    fill: '#000'
  }).setDepth(10);

  speedText = this.add.text(10, this.cameras.main.height - 30, 'Fart: 0', {
    font: '20px sans-serif',
    fill: '#00aa00'
  }).setDepth(10);
}

function spawnObstacle() {
  if (gameOverFlag || obstacles.getChildren().length >= MAX_OBSTACLES) return;

  const screenWidth = game.config.width;
  const x = Phaser.Math.Between(screenWidth * 0.2, screenWidth * 0.8);

  const types = ['obst_barnevogn', 'obst_hundemann', 'obst_skater'];
  const type = Phaser.Utils.Array.GetRandom(types);
  const o = obstacles.create(x, -100, type);
  o.setData('type', type);

  const scaleMap = {
    obst_hundemann: 1.0,
    obst_barnevogn: 1.0,
    obst_skater: 1.0
  };
  o.setScale(scaleMap[type] || 1.0);
  o.setVelocityY(obstacleSpeed);
  o.setDepth(1);
}

function update(time, delta) {
  if (!this.obstacleTimer) {
    this.obstacleTimer = 0;
  }
  this.obstacleTimer += delta;
  if (this.obstacleTimer > 15000 && MAX_OBSTACLES < 7) {
    MAX_OBSTACLES++;
    this.obstacleTimer = 0;
  }

  if (gameOverFlag || !character) return;

  if (background) {
    background.tilePositionY -= obstacleSpeed * delta / 1000;
  }

  const left = cursors.left.isDown || (this.input.activePointer.isDown && this.input.activePointer.x < game.config.width / 2);
  const right = cursors.right.isDown || (this.input.activePointer.isDown && this.input.activePointer.x > game.config.width / 2);

  const moveAmount = playerSpeed * delta / 1000;
  const minX = game.config.width * 0.2 + 40;
  const maxX = game.config.width * 0.8 - 40;

  if (left) {
    character.x = Math.max(minX, character.x - moveAmount);
  } else if (right) {
    character.x = Math.min(maxX, character.x + moveAmount);
  }

  const obs = obstacles.getChildren();
  for (let i = obs.length - 1; i >= 0; i--) {
    const o = obs[i];
    if (!o || !o.active || !o.body || typeof o.getBounds !== 'function') continue;

    if (o.y > game.config.height + 50) {
      obstacles.remove(o, true, true);
      score += 10;
      scoreText.setText(`Poeng: ${Math.floor(score)}`);
      continue;
    }

    o.setVelocityY(obstacleSpeed);

    const userBounds = character.getBounds();
    const oBounds = o.getBounds();

    if (Phaser.Geom.Intersects.RectangleToRectangle(userBounds, oBounds)) {
      gameOver(this);
      break;
    }
  }

  obstacleSpeed = Math.min(obstacleSpeed + delta * 0.01, 600);

  const rate = Math.min(1 + (obstacleSpeed - BASE_SPEED) / 500, 2.0);
  if (music) music.setRate(rate);

  if (speedText) {
    speedText.setText(`Fart: ${Math.floor(obstacleSpeed)}`);
    if (obstacleSpeed < 300) speedText.setColor('#00aa00');
    else if (obstacleSpeed < 450) speedText.setColor('#ffaa00');
    else speedText.setColor('#ff0000');
  }

  score += delta / 1000;
  scoreText.setText(`Poeng: ${Math.floor(score)}`);
}

function gameOver(scene) {
  gameOverFlag = true;
  scene.physics.pause();
  if (music) music.stop();

  scene.add.rectangle(
    scene.cameras.main.centerX,
    scene.cameras.main.centerY,
    scene.cameras.main.width,
    scene.cameras.main.height,
    0x000000,
    0.5
  ).setDepth(9);

  scene.add.text(scene.cameras.main.width / 2, scene.cameras.main.height / 2 - 30, 'GAME OVER', {
    font: '48px sans-serif',
    fill: '#f00'
  }).setOrigin(0.5).setDepth(10);

  const detail = `Du fikk ${Math.floor(score)} poeng`;
  scene.add.text(scene.cameras.main.width / 2, scene.cameras.main.height / 2 + 10, detail, {
    font: '24px sans-serif',
    fill: '#fff'
  }).setOrigin(0.5).setDepth(10);

  const btn = scene.add.text(scene.cameras.main.width / 2, scene.cameras.main.height / 2 + 60, 'Gratulerer! Vil du lagre din score?', {
    font: '24px sans-serif',
    fill: '#0f0'
  }).setOrigin(0.5).setDepth(10).setInteractive();

  btn.on('pointerdown', () => submitScore(Math.floor(score)));

  const retryBtn = scene.add.text(scene.cameras.main.width / 2, scene.cameras.main.height / 2 + 110, 'Try Again?', {
    font: '28px Courier',
    fill: '#00ffff',
    backgroundColor: '#000',
    padding: { x: 10, y: 5 }
  }).setOrigin(0.5).setDepth(10).setInteractive();

  retryBtn.on('pointerdown', () => {
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.style.display = 'flex';
    game.destroy(true);
  });
}

function submitScore(val) {
  fetch('highscore.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: playerName, score: val })
  })
    .then(r => r.json())
    .then(res => alert(res.success ? 'Highscore lagret!' : 'Kunne ikke lagre.'))
    .then(() => window.location.reload())
    .catch(() => alert('Feilet ved sending av highscore.'));
}
