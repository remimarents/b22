// version: 1.3.24
let game;
let character, cursors,
    score = 0,
    playerSpeed = 650,
    obstacleSpeed = 200;
let scoreText, speedText, obstacles, gameOverFlag = false, playerName = '', charVariant = 1;
let music;
let background;
let latestScores = [];
let scoresLoaded = false;
let isMuted = false;
let redbullCan = null;
let redbullUntil = 0;
let boostText;
let soundBtn;
const BASE_SPEED = 200;
const MAX_OBSTACLES = 3, SPAWN_INTERVAL = 1500;
let texture = 'mm';

function getHitRect(sprite, insetRatio = 0.22) {
  const b = sprite.getBounds();
  const insetX = b.width * insetRatio;
  const insetY = b.height * insetRatio;
  return new Phaser.Geom.Rectangle(
    b.x + insetX,
    b.y + insetY,
    b.width - insetX * 2,
    b.height - insetY * 2
  );
}

function getScreenScale(width) {
  if (width <= 390) return 0.92; // small phones
  if (width <= 480) return 1.0;  // regular phones
  if (width <= 768) return 0.9;  // tablets
  return 0.8;                    // desktop
}

function init() {
  const overlay = document.getElementById('overlay');
  const startBtn = document.getElementById('startBtn');
  const hsDiv = document.getElementById('hs');
  const hsList = document.getElementById('overlayHSList');

  fetch('highscore.php?v=' + Date.now())
    .then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(data => {
      const sortedScores = data.sort((a, b) => b.score - a.score);
      latestScores = sortedScores.slice();
      scoresLoaded = true;
      const inGameCount = window.innerWidth <= 480 ? 5 : 7;
      const compact = sortedScores.slice(0, inGameCount);
      hsDiv.innerText = '🏆 Highscore:\n' +
        compact.map((e, i) => `${i + 1}. ${e.name} – ${e.score}`).join('\n');

      if (hsList) {
        hsList.innerHTML = '';
        const top5 = sortedScores.slice(0, 5);
        top5.forEach((e, i) => {
          const li = document.createElement('li');
          li.textContent = `${i + 1}. ${e.name} – ${e.score}`;
          hsList.appendChild(li);
        });
      }
    })
    .catch(e => {
      // Fallback for hosts where PHP endpoint is unavailable.
      fetch('scores.json?v=' + Date.now())
        .then(r => r.json())
        .then(data => {
          const sortedScores = data.sort((a, b) => b.score - a.score);
          latestScores = sortedScores.slice();
          scoresLoaded = true;
          const inGameCount = window.innerWidth <= 480 ? 5 : 7;
          const compact = sortedScores.slice(0, inGameCount);
          hsDiv.innerText = '🏆 Highscore:\n' +
            compact.map((entry, i) => `${i + 1}. ${entry.name} – ${entry.score}`).join('\n');
          if (hsList) {
            hsList.innerHTML = '';
            sortedScores.slice(0, 5).forEach((entry, i) => {
              const li = document.createElement('li');
              li.textContent = `${i + 1}. ${entry.name} – ${entry.score}`;
              hsList.appendChild(li);
            });
          }
        })
        .catch(() => {
          scoresLoaded = false;
          hsDiv.innerText = 'Kunne ikke laste highscore.';
          if (hsList) hsList.innerHTML = '<li>Ingen tilgjengelig highscore</li>';
        });
      console.error('Highscore-feil:', e);
    });

  startBtn.onclick = () => {
    const pg = document.querySelector('input[name="playerGender"]:checked').value;
    const ug = document.querySelector('input[name="userGender"]:checked').value;
    if (pg === 'm' && ug === 'm') charVariant = 1;
    else if (pg === 'f' && ug === 'm') charVariant = 2;
    else if (pg === 'm' && ug === 'f') charVariant = 3;
    else charVariant = 4;

    const charMap = { 1: 'mm', 2: 'fm', 3: 'mf', 4: 'ff' };
    texture = charMap[charVariant] || 'mm';

    playerName = '';
    overlay.style.display = 'none';
    document.getElementById('hs').style.display = 'none';
    startGame();
  };
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
}

window.addEventListener('resize', () => {
  if (game && game.scale) {
    game.scale.resize(window.innerWidth, window.innerHeight);
  }
});

function preload() {
  this.load.image('bg', 'assets/background_grass.png');
  this.load.image('mm', 'assets/mm.png?v=2');
  this.load.image('mf', 'assets/mf.png?v=2');
  this.load.image('fm', 'assets/fm.png?v=2');
  this.load.image('ff', 'assets/ff.png?v=2');

  this.load.image('obst_barnevogn', 'assets/obst_barnevogn.png?v=2');
  this.load.image('obst_hundemann', 'assets/obst_hundemann.png?v=2');
  this.load.image('obst_skater', 'assets/obst_skater.png?v=2');
  this.load.image('share_qr_icon', 'assets/share_qr_icon.png?v=1');
  this.load.image('redbull_can', 'assets/redbull_can.png?v=3');

  this.load.audio('bgmusic', 'assets/B22soundscape.ogg?v=2');
}

function create() {
  const screenWidth = this.cameras.main.width;
  const screenHeight = this.cameras.main.height;
  const scaleFactor = getScreenScale(screenWidth);
  const playerScale = screenWidth <= 480 ? 0.82 : scaleFactor;

  background = this.add.tileSprite(0, 0, screenWidth, screenHeight, 'bg');
  background.setOrigin(0, 0);
  background.setDepth(0);

  const centerX = screenWidth / 2;
  const centerY = screenHeight * 0.84;

  music = this.sound.add('bgmusic', { loop: true, volume: 0.65 });
  // iOS/Safari may keep audio context suspended until a direct user gesture.
  this.sound.context.resume().finally(() => {
    if (music && !music.isPlaying && !isMuted) music.play();
    if (music) music.setRate(1);
  });

  character = this.physics.add.sprite(centerX, centerY, texture);
  character.setCollideWorldBounds(true);
  character.setScale(playerScale);


  cursors = this.input.keyboard.createCursorKeys();
  this.input.on('pointerdown', pointer => {
    if (this.sound.context.state !== 'running') {
      this.sound.context.resume().finally(() => {
        if (music && !music.isPlaying && !isMuted) music.play();
      });
    } else if (music && !music.isPlaying && !isMuted) {
      music.play();
    }
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
  }).setOrigin(0, 0).setDepth(10).setScrollFactor(0);

  speedText = this.add.text(10, screenHeight - 36, 'Fart: 0', {
    font: '20px sans-serif',
    fill: '#00aa00'
  }).setOrigin(0, 0).setDepth(10).setScrollFactor(0);

  boostText = this.add.text(10, 40, '', {
    font: '18px sans-serif',
    fill: '#38bdf8'
  }).setDepth(10);

  soundBtn = this.add.text(screenWidth - 12, 10, '🔊', {
    font: `${screenWidth <= 480 ? 22 : 20}px sans-serif`,
    fill: '#fff',
    backgroundColor: '#00000099',
    padding: { x: 8, y: 4 }
  }).setOrigin(1, 0).setDepth(12).setInteractive();

  soundBtn.on('pointerdown', () => {
    isMuted = !isMuted;
    this.sound.mute = isMuted;
    soundBtn.setText(isMuted ? '🔇' : '🔊');
    if (!isMuted && music && !music.isPlaying) music.play();
  });

  this.time.addEvent({
    delay: 12000,
    callback: () => spawnRedbull(this),
    callbackScope: this,
    loop: true
  });
}

function spawnRedbull(scene) {
  if (gameOverFlag || redbullCan) return;
  const x = Phaser.Math.Between(60, Number(game.config.width) - 60);
  const isMobile = Number(game.config.width) <= 480;
  redbullCan = scene.add.image(x, -40, 'redbull_can')
    .setScale(isMobile ? 0.06 : 0.05)
    .setDepth(6)
    .setInteractive({ useHandCursor: true });
  // Make tapping easier on mobile by enlarging the interactive hit area.
  const tapW = isMobile ? 110 : 90;
  const tapH = isMobile ? 150 : 130;
  redbullCan.setInteractive(
    new Phaser.Geom.Rectangle(-tapW / 2, -tapH / 2, tapW, tapH),
    Phaser.Geom.Rectangle.Contains
  );
  scene.physics.add.existing(redbullCan);
  redbullCan.body.setVelocityY(170);
  redbullCan.on('pointerdown', () => {
    redbullUntil = scene.time.now + 10000;
    if (redbullCan) {
      redbullCan.destroy();
      redbullCan = null;
    }
  });
}

function spawnObstacle() {
  if (gameOverFlag || obstacles.getChildren().length >= MAX_OBSTACLES) return;

  const screenWidth = Number(game.config.width);
  const edgeMargin = Math.max(22, Math.floor(screenWidth * 0.06));
  const x = Phaser.Math.Between(edgeMargin, screenWidth - edgeMargin);

  const types = ['obst_barnevogn', 'obst_hundemann', 'obst_skater'];
  const type = Phaser.Utils.Array.GetRandom(types);
  const o = obstacles.create(x, -100, type);
  o.setData('type', type);

  const scaleMap = {
    obst_hundemann: 0.92,
    obst_barnevogn: 0.9,
    obst_skater: 0.9
  };
  const scaleFactor = getScreenScale(screenWidth);
  const obstacleScale = screenWidth <= 480 ? 0.82 : scaleFactor;
  o.setScale((scaleMap[type] || 1.0) * obstacleScale);
  o.setVelocityY(obstacleSpeed);
  o.setDepth(1);
}

function update(time, delta) {
  if (gameOverFlag || !character) return;

  if (redbullCan && redbullCan.y > game.config.height + 40) {
    redbullCan.destroy();
    redbullCan = null;
  }

  const redbullActive = time < redbullUntil;
  const speedFactor = redbullActive ? 0.55 : 1;
  if (boostText) {
    if (redbullActive) {
      const secLeft = Math.ceil((redbullUntil - time) / 1000);
      boostText.setText(`REDBULL AKTIV: ${secLeft}s`);
    } else {
      boostText.setText('');
    }
    boostText.setColor(redbullActive ? '#22d3ee' : '#38bdf8');
  }
  if (background) {
    background.tilePositionY -= obstacleSpeed * speedFactor * delta / 1000;
  }

  const left = cursors.left.isDown || (this.input.activePointer.isDown && this.input.activePointer.x < game.config.width / 2);
  const right = cursors.right.isDown || (this.input.activePointer.isDown && this.input.activePointer.x > game.config.width / 2);

  const fullWidth = game.config.width;
  const moveAmount = playerSpeed * getScreenScale(fullWidth) * delta / 1000;
  const isWide = fullWidth > 1000;
  const fieldWidth = isWide ? fullWidth * 0.6 : fullWidth * 0.9;
  const center = fullWidth / 2;
  const edgePadding = Math.max(18, Math.floor(character.displayWidth * 0.32));
  const minX = center - fieldWidth / 2 + edgePadding;
  const maxX = center + fieldWidth / 2 - edgePadding;

  if (left) {
    character.x = Math.max(minX, character.x - moveAmount);
  } else if (right) {
    character.x = Math.min(maxX, character.x + moveAmount);
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

    o.setVelocityY(obstacleSpeed * speedFactor);

    const userBounds = getHitRect(character, 0.22);
    const oBounds = getHitRect(o, 0.2);

    if (Phaser.Geom.Intersects.RectangleToRectangle(userBounds, oBounds)) {
      gameOver(this);
      break;
    }
  }

  obstacleSpeed += delta * 0.01 * (redbullActive ? 0.6 : 1);

  const rate = Math.min(1 + (obstacleSpeed - BASE_SPEED) / 500, 2.0);
  if (music) music.setRate(rate);

  if (speedText) {
    // Keep HUD labels pinned to screen corners at all times.
    scoreText.setPosition(10, 10);
    speedText.setPosition(10, game.config.height - 36);
    speedText.setText(`Fart: ${Math.floor(obstacleSpeed)}`);
    if (obstacleSpeed < 300) speedText.setColor('#00aa00');
    else if (obstacleSpeed < 450) speedText.setColor('#ffaa00');
    else speedText.setColor('#ff0000');
  }

  score += delta / 1000;
  scoreText.setText(`Poeng: ${Math.floor(score)}`);
}

function gameOver(scene) {
  const isMobile = scene.cameras.main.width <= 480;
  const titleSize = isMobile ? 48 : 48;
  const detailSize = isMobile ? 24 : 24;
  const saveSize = isMobile ? 24 : 24;
  const retrySize = isMobile ? 28 : 28;
  const yBase = scene.cameras.main.height / 2;

  gameOverFlag = true;
  scene.physics.pause();
  document.getElementById('hs').style.display = 'block';
  if (music) music.stop();

  scene.add.rectangle(
    scene.cameras.main.centerX,
    scene.cameras.main.centerY,
    scene.cameras.main.width,
    scene.cameras.main.height,
    0x000000,
    0.5
  ).setDepth(9);

  scene.add.text(scene.cameras.main.width / 2, yBase - (isMobile ? 64 : 30), 'GAME OVER', {
    font: `${titleSize}px sans-serif`,
    fill: '#f00'
  }).setOrigin(0.5).setDepth(10);

  const detail = `Du fikk ${Math.floor(score)} poeng`;
  scene.add.text(scene.cameras.main.width / 2, yBase + (isMobile ? 6 : 10), detail, {
    font: `${detailSize}px sans-serif`,
    fill: '#fff'
  }).setOrigin(0.5).setDepth(10);

  const finalScore = Math.floor(score);
  const cutoff = latestScores.length >= 10 ? latestScores[9].score : -1;
  const qualifies = scoresLoaded && (latestScores.length < 10 || finalScore > cutoff);

  const btn = scene.add.text(
    scene.cameras.main.width / 2,
    yBase + (isMobile ? 70 : 60),
    qualifies ? 'Lagre score (du kan endre navn)' : 'Scoren kom ikke på highscore',
    {
    font: `${saveSize}px sans-serif`,
    fill: qualifies ? '#0f0' : '#ffcc00'
  }).setOrigin(0.5).setDepth(10);

  if (qualifies) {
    btn.setInteractive();
    btn.on('pointerdown', () => {
    const typed = window.prompt('Skriv navn til highscore:', playerName || '');
    if (typed === null) return;
    const cleaned = typed.trim().slice(0, 12);
    if (!cleaned) {
      alert('Navn kan ikke være tomt.');
      return;
    }
    playerName = cleaned;
    submitScore(Math.floor(score));
    });
  }

  const retryLabel = 'Vil du prøve igjen?';
  const retryBtn = scene.add.text(scene.cameras.main.width / 2, yBase + (isMobile ? 138 : 110), retryLabel, {
    font: `${retrySize}px Courier`,
    fill: '#00ffff',
    backgroundColor: '#000',
    padding: { x: isMobile ? 14 : 10, y: isMobile ? 8 : 5 },
    align: 'center',
    wordWrap: { width: Math.min(scene.cameras.main.width * 0.78, 420), useAdvancedWrap: true }
  }).setOrigin(0.5).setDepth(10).setInteractive();

  const shareX = scene.cameras.main.width - (isMobile ? 86 : 102);
  const shareY = isMobile ? 620 : 360;
  scene.add.text(shareX, shareY - (isMobile ? 54 : 56), 'Del spillet', {
    font: `${isMobile ? 18 : 16}px sans-serif`,
    fill: '#ffffff',
    backgroundColor: '#000000aa',
    padding: { x: 8, y: 4 }
  }).setOrigin(0.5).setDepth(10);

  const shareBtn = scene.add.image(shareX, shareY, 'share_qr_icon')
    .setScale(isMobile ? 0.12 : 0.1)
    .setDepth(10)
    .setInteractive({ useHandCursor: true });

  retryBtn.on('pointerdown', () => {
    const shareModal = document.getElementById('shareModal');
    if (shareModal) shareModal.style.display = 'none';
    if (game) game.destroy(true);
    startGame();
  });

  shareBtn.on('pointerdown', () => {
    if (typeof window.showShareQr === 'function') window.showShareQr();
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
