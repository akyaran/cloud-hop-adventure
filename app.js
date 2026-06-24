"use strict";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const stageWrap = document.getElementById("stage-wrap");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayText = document.getElementById("overlay-text");
const startButton = document.getElementById("start-button");
const pauseButton = document.getElementById("pause-button");
const stagePicker = document.getElementById("stage-picker");
const soundToggle = document.getElementById("sound-toggle");
const musicToggle = document.getElementById("music-toggle");
const stageNumberEl = document.getElementById("stage-number");
const coinsEl = document.getElementById("coins");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");

const WIDTH = 960;
const HEIGHT = 540;
const TILE = 48;
const GRAVITY = 2100;
const HOLD_GRAVITY = 960;
const MAX_FALL = 980;
const MOVE_ACCEL = 3100;
const GROUND_FRICTION = 2600;
const AIR_FRICTION = 760;
const MAX_SPEED = 285;
const JUMP_SPEED = -720;
const COYOTE_TIME = 0.1;
const JUMP_BUFFER = 0.12;
const FIXED_DT = 1 / 60;
const SAVE_KEY = "cloud-hop-save-v2";

const STAGES = [
  {
    name: "そよ風の丘",
    sky: ["#5fbce9", "#a9e7fb", "#e2f8e9"],
    hills: ["#72cf78", "#48ad64"],
    rows: [
      "........................................................................................",
      "........................................................................................",
      "........................................................................................",
      "..............o...........................................o.............................",
      "............#####..................o....................#####.............o..............",
      "..........................#####...............o........................#####............",
      "......o.................................######..........................................",
      "...#####.............o...........................................o......................",
      ".P.................#####.........E......................#####.........E................G",
      "................................#####................................#####..............#",
      "##########...################.............#########...########################...########",
      "##########...################.............#########...########################...########"
    ]
  },
  {
    name: "夕焼けの谷",
    sky: ["#4a83bb", "#efaa83", "#ffe2a6"],
    hills: ["#6bb678", "#3d8e67"],
    rows: [
      "............................................................................................",
      "............................................................................................",
      "........................................o...................................................",
      ".........o.................o..........#####................o.................................",
      ".......#####.............#####.........................########..............................",
      "..................................o..................................o.......................",
      "...................E....#####....................E....#####..................#####............",
      ".....o......................................................................................",
      ".P.#####..........#####.............#####......................#####........E...............G",
      ".............###...............###..............###.....................########............#",
      "#########....###....########...###....#######...###....###########..............#############",
      "#########....###....########...###....#######...###....###########..............#############"
    ]
  },
  {
    name: "星明かりの峰",
    sky: ["#243d72", "#5d74a7", "#b4b9d9"],
    hills: ["#507c75", "#31585d"],
    rows: [
      "..............................................................................................",
      "..............................................................................................",
      ".............................o..........................................o.....................",
      "............o..............#####...............o......................#####...................",
      "..........#####...............................#####...........................................",
      "........................E...........#####...................E....................o.............",
      ".....o..........#####....................................#####.................#####...........",
      "...#####........................o..............................................................",
      ".P...........E...............#####............E.................#####..........E............G",
      "..........#####.......###...................#####.........###................#####............#",
      "########...............###....##########.................###....##########..........##########",
      "########...............###....##########.................###....##########..........##########"
    ]
  }
];

function loadSave() {
  const fallback = {
    unlocked: 1,
    selectedStage: 0,
    bestScores: [0, 0, 0],
    sound: true,
    music: true
  };

  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    if (!saved || typeof saved !== "object") return fallback;
    return {
      unlocked: clamp(Number(saved.unlocked) || 1, 1, STAGES.length),
      selectedStage: clamp(Number(saved.selectedStage) || 0, 0, STAGES.length - 1),
      bestScores: Array.from({ length: STAGES.length }, (_, index) => Number(saved.bestScores?.[index]) || 0),
      sound: saved.sound !== false,
      music: saved.music !== false
    };
  } catch {
    return fallback;
  }
}

function saveProgress() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
  } catch {
    // Storage can be unavailable in private browsing; gameplay should continue.
  }
}

const progress = loadSave();

const state = {
  mode: "title",
  resumeMode: "playing",
  selectedStage: Math.min(progress.selectedStage, progress.unlocked - 1),
  stageIndex: 0,
  cameraX: 0,
  coins: 0,
  score: 0,
  lives: 3,
  time: 0,
  enemies: [],
  particles: [],
  solids: [],
  collectibles: [],
  goal: { x: 0, y: 0, w: 34, h: 104 },
  spawnX: 92,
  spawnY: 320,
  worldWidth: WIDTH,
  shake: 0,
  lastPauseWasAutomatic: false
};

const input = {
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,
  jumpReleased: false
};

const player = {
  x: 92,
  y: 320,
  w: 34,
  h: 42,
  vx: 0,
  vy: 0,
  onGround: false,
  coyote: 0,
  jumpBuffer: 0,
  facing: 1,
  invuln: 0
};

const audio = {
  context: null,
  master: null,
  unlocked: false,
  nextBeat: 0,
  beat: 0
};

const MUSIC_NOTES = [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 349.23];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function approach(value, target, amount) {
  if (value < target) return Math.min(target, value + amount);
  if (value > target) return Math.max(target, value - amount);
  return target;
}

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const nextWidth = Math.round(WIDTH * dpr);
  const nextHeight = Math.round(HEIGHT * dpr);
  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth;
    canvas.height = nextHeight;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
}

function parseStage(index) {
  const stage = STAGES[index];
  const width = Math.max(...stage.rows.map((row) => row.length));
  state.solids = [];
  state.collectibles = [];
  state.enemies = [];
  state.goal = { x: 0, y: 0, w: 34, h: 104 };

  for (let y = 0; y < stage.rows.length; y += 1) {
    const row = stage.rows[y].padEnd(width, ".");
    for (let x = 0; x < row.length; x += 1) {
      const tile = row[x];
      const px = x * TILE;
      const py = y * TILE;
      if (tile === "#") {
        state.solids.push({ x: px, y: py, w: TILE, h: TILE });
      } else if (tile === "o") {
        state.collectibles.push({
          x: px + 14,
          y: py + 12,
          w: 20,
          h: 20,
          taken: false,
          bob: (x + y) * 0.4
        });
      } else if (tile === "E") {
        state.enemies.push({
          x: px + 6,
          y: py + 8,
          w: 36,
          h: 32,
          vx: x % 2 ? -72 : 72,
          vy: 0,
          minX: Math.max(0, px - 120),
          maxX: Math.min(width * TILE, px + 170),
          alive: true,
          onGround: false
        });
      } else if (tile === "G") {
        state.goal = { x: px + 7, y: py - 56, w: 34, h: 104 };
      } else if (tile === "P") {
        state.spawnX = px + 7;
        state.spawnY = py + 4;
      }
    }
  }

  state.worldWidth = width * TILE;
}

function resetInput() {
  input.left = false;
  input.right = false;
  input.jump = false;
  input.jumpPressed = false;
  input.jumpReleased = false;
  for (const button of document.querySelectorAll("[data-touch]")) {
    button.classList.remove("is-down");
  }
}

function resetPlayer() {
  player.x = state.spawnX;
  player.y = state.spawnY;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
  player.coyote = 0;
  player.jumpBuffer = 0;
  player.invuln = 1.1;
}

function resetLevel(index = state.selectedStage) {
  state.stageIndex = index;
  parseStage(index);
  state.particles = [];
  state.coins = 0;
  state.score = 0;
  state.lives = 3;
  state.time = 0;
  state.cameraX = 0;
  state.shake = 0;
  resetInput();
  resetPlayer();
  updateHud();
}

function startGame() {
  unlockAudio();
  resetLevel(state.selectedStage);
  state.mode = "playing";
  state.lastPauseWasAutomatic = false;
  overlay.hidden = true;
  stageWrap.classList.add("is-playing");
  audio.nextBeat = performance.now() / 1000;
}

function pauseGame(automatic = false) {
  if (state.mode !== "playing") return;
  state.resumeMode = "playing";
  state.mode = "paused";
  state.lastPauseWasAutomatic = automatic;
  resetInput();
  suspendAudio();
  showOverlay(
    automatic ? "ゲームを一時停止しました" : "一時停止",
    automatic ? "画面に戻りました。準備ができたら再開してください。" : "ひと休み。続きから再開できます。",
    "再開",
    false
  );
}

function resumeGame() {
  unlockAudio();
  state.mode = state.resumeMode;
  state.lastPauseWasAutomatic = false;
  overlay.hidden = true;
  stageWrap.classList.add("is-playing");
  lastTime = performance.now();
  accumulator = 0;
}

function showOverlay(title, text, buttonText, showMenu = true) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  startButton.textContent = buttonText;
  stagePicker.hidden = !showMenu;
  document.getElementById("settings").hidden = !showMenu;
  overlay.hidden = false;
  stageWrap.classList.toggle("is-playing", state.mode === "paused");
}

function updateHud() {
  stageNumberEl.textContent = String(state.stageIndex + 1);
  coinsEl.textContent = String(state.coins);
  scoreEl.textContent = String(state.score);
  livesEl.textContent = String(state.lives);
}

function updateStagePicker() {
  for (const button of document.querySelectorAll("[data-stage]")) {
    const index = Number(button.dataset.stage);
    button.disabled = index >= progress.unlocked;
    button.classList.toggle("is-selected", index === state.selectedStage);
    const best = progress.bestScores[index];
    button.title = best ? `${STAGES[index].name} ベスト ${best}` : STAGES[index].name;
  }
}

function unlockAudio() {
  if (!audio.context) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    audio.context = new AudioContextClass();
    audio.master = audio.context.createGain();
    audio.master.gain.value = 0.18;
    audio.master.connect(audio.context.destination);
  }
  if (audio.context.state === "suspended") audio.context.resume().catch(() => {});
  audio.unlocked = true;
}

function suspendAudio() {
  if (audio.context?.state === "running") audio.context.suspend().catch(() => {});
}

function playTone(frequency, duration, type = "sine", volume = 0.18, delay = 0) {
  if (!progress.sound || !audio.context || audio.context.state !== "running") return;
  const start = audio.context.currentTime + delay;
  const oscillator = audio.context.createOscillator();
  const gain = audio.context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(audio.master);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}

function playSound(name) {
  if (name === "jump") playTone(420, 0.12, "square", 0.11);
  if (name === "coin") {
    playTone(740, 0.1, "sine", 0.15);
    playTone(990, 0.12, "sine", 0.12, 0.07);
  }
  if (name === "stomp") playTone(155, 0.16, "square", 0.15);
  if (name === "hurt") playTone(105, 0.3, "sawtooth", 0.12);
  if (name === "clear") {
    playTone(523.25, 0.2, "triangle", 0.16);
    playTone(659.25, 0.2, "triangle", 0.16, 0.16);
    playTone(783.99, 0.35, "triangle", 0.17, 0.32);
  }
}

function updateMusic(nowSeconds) {
  if (!progress.music || state.mode !== "playing" || !audio.context || audio.context.state !== "running") return;
  if (nowSeconds < audio.nextBeat) return;
  const note = MUSIC_NOTES[audio.beat % MUSIC_NOTES.length];
  const originalSoundSetting = progress.sound;
  progress.sound = true;
  playTone(note, 0.18, "triangle", 0.035);
  progress.sound = originalSoundSetting;
  audio.beat += 1;
  audio.nextBeat = nowSeconds + 0.34;
}

function addParticles(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    state.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 260,
      vy: -80 - Math.random() * 220,
      life: 0.45 + Math.random() * 0.35,
      size: 3 + Math.random() * 5,
      color
    });
  }
}

function playerHurt() {
  if (player.invuln > 0 || state.mode !== "playing") return;
  state.lives -= 1;
  state.shake = 0.24;
  playSound("hurt");
  updateHud();

  if (state.lives <= 0) {
    state.mode = "gameover";
    stageWrap.classList.remove("is-playing");
    showOverlay("ゲームオーバー", "もう一度、星の実を集めに行こう。", "リトライ", true);
    return;
  }

  resetPlayer();
}

function collectCoin(coin) {
  coin.taken = true;
  state.coins += 1;
  state.score += 100;
  playSound("coin");
  addParticles(coin.x + coin.w / 2, coin.y + coin.h / 2, "#ffcf4f", 8);
  updateHud();
}

function finishLevel() {
  if (state.mode !== "playing") return;
  state.mode = "clear";
  state.score += 1000 + state.lives * 250;
  progress.bestScores[state.stageIndex] = Math.max(progress.bestScores[state.stageIndex], state.score);
  progress.unlocked = Math.min(STAGES.length, Math.max(progress.unlocked, state.stageIndex + 2));
  if (state.stageIndex + 1 < progress.unlocked) {
    state.selectedStage = Math.min(state.stageIndex + 1, STAGES.length - 1);
  }
  progress.selectedStage = state.selectedStage;
  saveProgress();
  updateHud();
  updateStagePicker();
  playSound("clear");
  stageWrap.classList.remove("is-playing");
  const allClear = state.stageIndex === STAGES.length - 1;
  showOverlay(
    allClear ? "全ステージクリア！" : "ステージクリア！",
    allClear ? "星明かりの峰を越えました。全ステージ制覇です。" : `次の「${STAGES[state.selectedStage].name}」が開きました。`,
    allClear ? "もう一度遊ぶ" : "次のステージ",
    true
  );
}

function collideWithSolids(entity, axis) {
  for (const solid of state.solids) {
    if (!rectsOverlap(entity, solid)) continue;
    if (axis === "x") {
      if (entity.vx > 0) entity.x = solid.x - entity.w;
      if (entity.vx < 0) entity.x = solid.x + solid.w;
      entity.vx = 0;
    } else {
      if (entity.vy > 0) {
        entity.y = solid.y - entity.h;
        entity.onGround = true;
        if ("coyote" in entity) entity.coyote = COYOTE_TIME;
      } else if (entity.vy < 0) {
        entity.y = solid.y + solid.h;
      }
      entity.vy = 0;
    }
  }
}

function updatePlayer(dt) {
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (dir !== 0) {
    player.vx += dir * MOVE_ACCEL * dt;
    player.facing = dir;
  } else {
    player.vx = approach(player.vx, 0, (player.onGround ? GROUND_FRICTION : AIR_FRICTION) * dt);
  }
  player.vx = clamp(player.vx, -MAX_SPEED, MAX_SPEED);

  if (input.jumpPressed) player.jumpBuffer = JUMP_BUFFER;
  else player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);

  if (player.onGround) player.coyote = COYOTE_TIME;
  else player.coyote = Math.max(0, player.coyote - dt);

  if (player.jumpBuffer > 0 && player.coyote > 0) {
    player.vy = JUMP_SPEED;
    player.onGround = false;
    player.coyote = 0;
    player.jumpBuffer = 0;
    playSound("jump");
    addParticles(player.x + player.w / 2, player.y + player.h, "#ffffff", 5);
  }

  if (input.jumpReleased && player.vy < -170) player.vy *= 0.55;
  const gravity = input.jump && player.vy < 0 ? HOLD_GRAVITY : GRAVITY;
  player.vy = Math.min(MAX_FALL, player.vy + gravity * dt);
  player.invuln = Math.max(0, player.invuln - dt);

  player.x += player.vx * dt;
  collideWithSolids(player, "x");
  player.onGround = false;
  player.y += player.vy * dt;
  collideWithSolids(player, "y");

  if (player.y > HEIGHT + 260) playerHurt();
}

function updateEnemies(dt) {
  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;
    enemy.x += enemy.vx * dt;
    if (enemy.x < enemy.minX || enemy.x + enemy.w > enemy.maxX) {
      enemy.vx *= -1;
      enemy.x = clamp(enemy.x, enemy.minX, enemy.maxX - enemy.w);
    }

    enemy.vy = Math.min(MAX_FALL, enemy.vy + GRAVITY * dt);
    enemy.y += enemy.vy * dt;
    enemy.onGround = false;
    collideWithSolids(enemy, "y");

    if (!rectsOverlap(player, enemy)) continue;
    const stomp = player.vy > 130 && player.y + player.h - enemy.y < 22;
    if (stomp) {
      enemy.alive = false;
      player.vy = -430;
      state.score += 250;
      playSound("stomp");
      addParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "#79d66b", 12);
      updateHud();
    } else {
      playerHurt();
    }
  }
}

function updateCollectibles() {
  for (const coin of state.collectibles) {
    if (!coin.taken && rectsOverlap(player, coin)) collectCoin(coin);
  }
  if (rectsOverlap(player, state.goal)) finishLevel();
}

function updateParticles(dt) {
  for (const particle of state.particles) {
    particle.life -= dt;
    particle.vy += 720 * dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
  }
  state.particles = state.particles.filter((particle) => particle.life > 0);
}

function updateCamera() {
  const target = player.x + player.w / 2 - WIDTH * 0.38;
  state.cameraX = approach(state.cameraX, clamp(target, 0, Math.max(0, state.worldWidth - WIDTH)), 900 * FIXED_DT);
}

function step(dt) {
  if (state.mode !== "playing") {
    input.jumpPressed = false;
    input.jumpReleased = false;
    return;
  }
  state.time += dt;
  state.shake = Math.max(0, state.shake - dt);
  updatePlayer(dt);
  updateEnemies(dt);
  updateCollectibles();
  updateParticles(dt);
  updateCamera();
  input.jumpPressed = false;
  input.jumpReleased = false;
}

function drawBackground() {
  const stage = STAGES[state.stageIndex];
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, stage.sky[0]);
  sky.addColorStop(0.62, stage.sky[1]);
  sky.addColorStop(1, stage.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.save();
  ctx.translate(-state.cameraX * 0.22, 0);
  drawCloud(140, 92, 1.1);
  drawCloud(520, 132, 0.82);
  drawCloud(970, 82, 1.18);
  drawCloud(1460, 126, 0.92);
  drawCloud(2060, 72, 1.1);
  drawCloud(2800, 110, 0.88);
  ctx.restore();

  ctx.save();
  ctx.translate(-state.cameraX * 0.42, 0);
  drawHill(120, 470, 260, stage.hills[0]);
  drawHill(580, 485, 340, stage.hills[1]);
  drawHill(1100, 476, 290, stage.hills[0]);
  drawHill(1720, 488, 360, stage.hills[1]);
  drawHill(2360, 476, 300, stage.hills[0]);
  drawHill(3100, 488, 360, stage.hills[1]);
  ctx.restore();
}

function drawCloud(x, y, scale) {
  ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
  ctx.beginPath();
  ctx.ellipse(x, y + 18 * scale, 44 * scale, 24 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 42 * scale, y + 12 * scale, 38 * scale, 30 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 84 * scale, y + 21 * scale, 46 * scale, 22 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawHill(x, y, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, Math.PI, Math.PI * 2);
  ctx.lineTo(x + radius, HEIGHT);
  ctx.lineTo(x - radius, HEIGHT);
  ctx.closePath();
  ctx.fill();
}

function drawTile(tile) {
  const x = Math.round(tile.x - state.cameraX);
  const y = tile.y;
  ctx.fillStyle = "#8f6b3f";
  ctx.fillRect(x, y, tile.w, tile.h);
  ctx.fillStyle = "#5fc85f";
  ctx.fillRect(x, y, tile.w, 13);
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fillRect(x + 6, y + 18, 13, 6);
  ctx.fillStyle = "rgba(48, 28, 18, 0.18)";
  ctx.fillRect(x + 28, y + 32, 15, 7);
  ctx.strokeStyle = "rgba(16, 32, 51, 0.16)";
  ctx.strokeRect(x + 0.5, y + 0.5, tile.w - 1, tile.h - 1);
}

function drawCoin(coin) {
  if (coin.taken) return;
  const bob = Math.sin(state.time * 5 + coin.bob) * 4;
  const x = coin.x - state.cameraX + coin.w / 2;
  const y = coin.y + coin.h / 2 + bob;
  ctx.fillStyle = "#ffcf4f";
  ctx.beginPath();
  ctx.ellipse(x, y, 11, 14, Math.sin(state.time * 4 + coin.bob) * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#b87822";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#fff4a8";
  ctx.fillRect(x - 3, y - 8, 5, 10);
}

function drawEnemy(enemy) {
  if (!enemy.alive) return;
  const x = enemy.x - state.cameraX;
  const y = enemy.y;
  ctx.fillStyle = "#79d66b";
  ctx.beginPath();
  ctx.roundRect(x, y + 4, enemy.w, enemy.h - 4, 8);
  ctx.fill();
  ctx.fillStyle = "#326a3b";
  ctx.fillRect(x + 7, y + 14, 5, 5);
  ctx.fillRect(x + enemy.w - 12, y + 14, 5, 5);
  ctx.fillStyle = "#2f5b33";
  ctx.fillRect(x + 8, y + enemy.h - 4, 8, 5);
  ctx.fillRect(x + enemy.w - 16, y + enemy.h - 4, 8, 5);
}

function drawPlayer() {
  const x = player.x - state.cameraX;
  const y = player.y;
  if (player.invuln > 0 && Math.floor(state.time * 18) % 2 === 0) return;
  ctx.save();
  ctx.translate(x + player.w / 2, y + player.h / 2);
  ctx.scale(player.facing, 1);
  ctx.translate(-player.w / 2, -player.h / 2);
  ctx.fillStyle = "#ff7a59";
  ctx.beginPath();
  ctx.roundRect(2, 8, player.w - 4, player.h - 6, 10);
  ctx.fill();
  ctx.fillStyle = "#ffd6a7";
  ctx.beginPath();
  ctx.roundRect(6, 0, player.w - 12, 20, 8);
  ctx.fill();
  ctx.fillStyle = "#102033";
  ctx.fillRect(19, 8, 4, 5);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(20, 8, 1, 1);
  ctx.fillStyle = "#2e7ad8";
  ctx.fillRect(7, 30, 8, 10);
  ctx.fillRect(player.w - 15, 30, 8, 10);
  ctx.fillStyle = "#fff2c8";
  ctx.fillRect(4, 19, 7, 8);
  ctx.fillRect(player.w - 11, 19, 7, 8);
  ctx.restore();
}

function drawGoal() {
  const x = state.goal.x - state.cameraX;
  const y = state.goal.y;
  ctx.fillStyle = "#dcbf8f";
  ctx.fillRect(x, y + 4, 10, state.goal.h);
  ctx.fillStyle = "#ffcf4f";
  ctx.beginPath();
  ctx.moveTo(x + 10, y + 8);
  ctx.lineTo(x + 58, y + 26);
  ctx.lineTo(x + 10, y + 45);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#b87822";
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawParticles() {
  for (const particle of state.particles) {
    ctx.globalAlpha = clamp(particle.life * 2.4, 0, 1);
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x - state.cameraX, particle.y, particle.size, particle.size);
  }
  ctx.globalAlpha = 1;
}

function draw() {
  ctx.save();
  if (state.shake > 0) ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 6);
  drawBackground();
  drawGoal();
  const left = state.cameraX - TILE;
  const right = state.cameraX + WIDTH + TILE;
  for (const solid of state.solids) {
    if (solid.x + solid.w > left && solid.x < right) drawTile(solid);
  }
  for (const coin of state.collectibles) {
    if (coin.x + coin.w > left && coin.x < right) drawCoin(coin);
  }
  for (const enemy of state.enemies) {
    if (enemy.x + enemy.w > left && enemy.x < right) drawEnemy(enemy);
  }
  drawParticles();
  drawPlayer();
  ctx.restore();
}

let accumulator = 0;
let lastTime = performance.now();

function frame(now) {
  const elapsed = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;
  accumulator += elapsed;
  while (accumulator >= FIXED_DT) {
    step(FIXED_DT);
    accumulator -= FIXED_DT;
  }
  updateMusic(now / 1000);
  draw();
  requestAnimationFrame(frame);
}

function setKey(key, down) {
  if (key === "ArrowLeft" || key === "a" || key === "A") input.left = down;
  if (key === "ArrowRight" || key === "d" || key === "D") input.right = down;
  if (key === "ArrowUp" || key === "w" || key === "W" || key === " ") {
    if (down && !input.jump) input.jumpPressed = true;
    if (!down && input.jump) input.jumpReleased = true;
    input.jump = down;
  }
}

window.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", " ", "a", "A", "d", "D", "w", "W"].includes(event.key)) {
    event.preventDefault();
  }
  if (event.key === "Escape" && state.mode === "playing") {
    pauseGame(false);
    return;
  }
  if (state.mode !== "playing" && (event.key === "Enter" || event.key === " ")) {
    if (state.mode === "paused") resumeGame();
    else startGame();
    return;
  }
  setKey(event.key, true);
});

window.addEventListener("keyup", (event) => setKey(event.key, false));
window.addEventListener("blur", () => {
  resetInput();
  pauseGame(true);
});

const activePointers = new Map();
const touchButtons = [...document.querySelectorAll("[data-touch]")];

function syncTouchInput() {
  const actions = new Set(activePointers.values());
  const previousJump = input.jump;
  input.left = actions.has("left");
  input.right = actions.has("right");
  input.jump = actions.has("jump");
  if (input.jump && !previousJump) input.jumpPressed = true;
  if (!input.jump && previousJump) input.jumpReleased = true;
  for (const button of touchButtons) {
    button.classList.toggle("is-down", actions.has(button.dataset.touch));
  }
}

function actionAtPoint(clientX, clientY) {
  for (const button of touchButtons) {
    const rect = button.getBoundingClientRect();
    if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
      return button.dataset.touch;
    }
  }
  return null;
}

function updatePointer(event) {
  const action = actionAtPoint(event.clientX, event.clientY);
  if (action) activePointers.set(event.pointerId, action);
  else activePointers.delete(event.pointerId);
  syncTouchInput();
}

for (const button of touchButtons) {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    unlockAudio();
    stageWrap.setPointerCapture?.(event.pointerId);
    updatePointer(event);
  });
}

stageWrap.addEventListener("pointermove", (event) => {
  if (activePointers.has(event.pointerId) || event.buttons > 0) {
    event.preventDefault();
    updatePointer(event);
  }
});

function releasePointer(event) {
  activePointers.delete(event.pointerId);
  syncTouchInput();
}

stageWrap.addEventListener("pointerup", releasePointer);
stageWrap.addEventListener("pointercancel", releasePointer);
stageWrap.addEventListener("lostpointercapture", releasePointer);

stagePicker.addEventListener("click", (event) => {
  const button = event.target.closest("[data-stage]");
  if (!button || button.disabled) return;
  state.selectedStage = Number(button.dataset.stage);
  progress.selectedStage = state.selectedStage;
  saveProgress();
  updateStagePicker();
  resetLevel(state.selectedStage);
});

soundToggle.checked = progress.sound;
musicToggle.checked = progress.music;

soundToggle.addEventListener("change", () => {
  progress.sound = soundToggle.checked;
  saveProgress();
  if (progress.sound) {
    unlockAudio();
    playSound("coin");
  }
});

musicToggle.addEventListener("change", () => {
  progress.music = musicToggle.checked;
  saveProgress();
  unlockAudio();
  audio.nextBeat = performance.now() / 1000;
});

startButton.addEventListener("click", () => {
  if (state.mode === "paused") resumeGame();
  else startGame();
});

pauseButton.addEventListener("click", () => pauseGame(false));

document.addEventListener("visibilitychange", () => {
  if (document.hidden) pauseGame(true);
});

for (const eventName of ["contextmenu", "gesturestart", "gesturechange", "gestureend", "dblclick", "dragstart"]) {
  document.addEventListener(eventName, (event) => event.preventDefault(), { passive: false });
}

window.addEventListener("resize", resizeCanvas);
window.visualViewport?.addEventListener("resize", resizeCanvas);
window.addEventListener("orientationchange", () => setTimeout(resizeCanvas, 100));

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}

if (!("roundRect" in CanvasRenderingContext2D.prototype)) {
  CanvasRenderingContext2D.prototype.roundRect = function roundRect(x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    this.moveTo(x + radius, y);
    this.arcTo(x + w, y, x + w, y + h, radius);
    this.arcTo(x + w, y + h, x, y + h, radius);
    this.arcTo(x, y + h, x, y, radius);
    this.arcTo(x, y, x + w, y, radius);
    return this;
  };
}

resizeCanvas();
updateStagePicker();
resetLevel(state.selectedStage);
showOverlay("Cloud Hop Adventure", "星の実を集めて、雲の門まで走り抜けよう。", "スタート", true);
requestAnimationFrame(frame);
