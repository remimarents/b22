let game;
let character, cursors,
    score = 0,
    playerSpeed = 400,
    obstacleSpeed = 200;
let scoreText, obstacles, gameOverFlag = false, playerName = '', charVariant = 1;
let music;
const BASE_SPEED = 200;
const MAX_OBSTACLES = 3, SPAWN_INTERVAL = 1500;

function init() {
  const overlay = document.getElementById('overlay');
  const nameInput = document.getElementById('nameInput');
  const startBtn = document.getElementById('startBtn');
  const hsDiv = document.getElementById('hs');

  loadHighscores(hsDiv);

  startBtn.onclick = () => {
    const n = nameInput.value.trim();
    if (!n) return alert('Skriv inn navn');

    const pg = document.querySelector('input[name="playerGender"]:checked').value;
    const ug = document.querySelector('input[name="userGender"]:checked').value;
    if (pg === 'm' && ug === 'm') charVariant = 1;
    else if (pg === 'f' && ug === 'm') charVariant = 2;
    else if (pg === 'm' && ug === 'f') charVariant = 3;
    else charVariant = 4;

    playerName = n;
    overlay.style.display = 'none';
    startGame();
  };
}

async function loadHighscores(target) {
  try {
    let r = await fetch('highscore.php', { cache: 'no-store' });
    if (!r.ok) throw new Error('php failed');
    let data = await r.json();
    target.innerText = '🏆 Highscore:\n' +
      data.map((e, i) => `${i + 1}. ${e.name} – ${e.score}`).join('\n');
  } catch (e) {
    console.warn('highscore.php failed, trying scores.json', e);
    try {
      const r = await fetch('scores.json', { cache: 'no-store' });
      const data = await r.json();
      target.innerText = '🏆 Highscore:\n' +
        data.map((e, i) => `${i + 1}. ${e.name} – ${e.score}`).join('\n');
    } catch (err) {
      console.error('Could not load highscores', err);
      target.innerText = 'Kunne ikke laste highscore.';
    }
  }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  init();
} else {
  window.addEventListener('load', init);
}

function startGame() {
  score = 0;
  playerSpeed = 400;
  obstacleSpeed = BASE_SPEED;
  gameOverFlag = false;
  if (music) {
    music.stop();
  }

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
  for (let i = 1; i <= 4; i++) {
    this.load.image(`right_${i}`, `assets/right_${i}.png`);
    this.load.image(`left_${i}`, `assets/left_${i}.png`);
  }
  this.load.image('obst_barnevogn', 'assets/obst_barnevogn.png');
  this.load.image('obst_hundemann', 'assets/obst_hundemann.png');
  this.load.image('obst_skater', 'assets/obst_skater.png');
  this.load.audio('bgmusic', 'assets/b22soundscape.ogg');
}

function create() {
  const centerX = this.cameras.main.width / 2;
  const centerY = this.cameras.main.height * 0.8;

  music = this.sound.add('bgmusic', { loop: true });
  music.play();
  music.setRate(1);

  character = this.physics.add.sprite(centerX, centerY, `right_${charVariant}`);
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
}

function spawnObstacle() {
  if (gameOverFlag || obstacles.getChildren().length >= MAX_OBSTACLES) return;

  const x = Phaser.Math.Between(50, game.config.width - 50);
  const types = ['obst_barnevogn', 'obst_hundemann', 'obst_skater'];
  const type = Phaser.Utils.Array.GetRandom(types);
  const o = obstacles.create(x, -100, type);
  o.setData('type', type);
  const scaleMap = {
    obst_hundemann: 0.25,
    obst_barnevogn: 0.4,
    obst_skater: 0.4
  };
  o.setScale(scaleMap[type] || 0.4);
  o.setVelocityY(obstacleSpeed);
  o.setDepth(1);
}

function update(time, delta) {
  if (gameOverFlag || !character) return;

  const left = cursors.left.isDown || (this.input.activePointer.isDown && this.input.activePointer.x < game.config.width / 2);
  const right = cursors.right.isDown || (this.input.activePointer.isDown && this.input.activePointer.x > game.config.width / 2);

  if (left) {
    character.x -= playerSpeed * delta / 1000;
    character.setTexture(`left_${charVariant}`);
  } else if (right) {
    character.x += playerSpeed * delta / 1000;
    character.setTexture(`right_${charVariant}`);
  } else {
    character.setTexture(`right_${charVariant}`);
  }

  const obs = obstacles.getChildren();
  for (let i = obs.length - 1; i >= 0; i--) {
    const o = obs[i];
    if (!o || !o.active || typeof o.getBounds !== 'function') continue;

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

  score += delta / 1000;
  scoreText.setText(`Poeng: ${Math.floor(score)}`);
  obstacleSpeed += delta / 10000;
  if (music) {
    music.setRate(obstacleSpeed / BASE_SPEED);
  }
}

function gameOver(scene) {
  gameOverFlag = true;
  scene.physics.pause();
  if (music) {
    music.stop();
  }

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

  const btn = scene.add.text(scene.cameras.main.width / 2, scene.cameras.main.height / 2 + 60, 'Send highscore', {
    font: '24px sans-serif',
    fill: '#0f0'
  }).setOrigin(0.5).setDepth(10).setInteractive();

  btn.on('pointerdown', () => submitScore(Math.floor(score)));
}

async function submitScore(val) {
  try {
    const r = await fetch('highscore.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: playerName, score: val })
    });
    const res = await r.json();
    alert(res.success ? 'Highscore lagret!' : 'Kunne ikke lagre.');
    window.location.reload();
  } catch (e) {
    alert('Feilet ved sending av highscore.');
  }
}
