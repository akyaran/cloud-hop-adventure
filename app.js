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
let versionBadge = document.getElementById("version-badge");
const stageNumberEl = document.getElementById("stage-number");
const coinsEl = document.getElementById("coins");
const windLevelEl = document.getElementById("wind-level");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");

const playerSprite = new Image();
playerSprite.src = "./assets/hero.png";
const playerJumpSprite = new Image();
playerJumpSprite.src = "./assets/hero-jump.png";
const playerRunSprites = [
  "./assets/hero-run-1.png",
  "./assets/hero-run-2.png"
].map((src) => {
  const image = new Image();
  image.src = src;
  return image;
});
const enemySprite = new Image();
enemySprite.src = "./assets/moss-shell.png";
const terrainSprite = new Image();
terrainSprite.src = "./assets/terrain-tile.png";
const coinSprite = new Image();
coinSprite.src = "./assets/wind-coin.png";
const goalSprite = new Image();
goalSprite.src = "./assets/goal-flag.png";
const APP_VERSION = "v13";
const stageBackgrounds = [
  "./assets/background-hills.png",
  "./assets/background-sunset.png",
  "./assets/background-night.png"
].map((src) => {
  const image = new Image();
  image.src = src;
  return image;
});

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
const WIND_LEVEL_MIN = 1;
const WIND_LEVEL_MAX = 3;
const WIND_COINS_PER_LEVEL = 3;
const WIND_GRAVITY = [GRAVITY, 1320, 1040, 760];
const WIND_FALL_SPEED = [MAX_FALL, 760, 610, 470];
const WIND_AIR_ACCEL = [MOVE_ACCEL, 3350, 3950, 4550];
const WIND_COIN_RANGE = [0, 132, 178, 226];
const WIND_COIN_PULL = [0, 460, 650, 840];
const UPDRAFT_FORCE = 1420;
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
      "..........................#####...............o...........L............#####............",
      "......o.................................######..........................................",
      "...#####.............o...............L...........................o......................",
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
      "..................................o..............L...................o.......................",
      "...................E....#####....................E....#####..................#####............",
      ".....o...............................L......................................................",
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
      ".....o..........#####.....................L..............#####.................#####...........",
      "...#####........................o..................L...........................................",
      ".P...........E...............#####............E.................#####..........E............G",
      "..........#####.......###...................#####.........###................#####............#",
      "########...............###....##########.................###....##########..........##########",
      "########...............###....##########.................###....##########..........##########"
    ]
  }
];

STAGES.length = 0;
STAGES.push(
  {
    name: "そよ風の丘",
    sky: ["#5fbce9", "#a9e7fb", "#e2f8e9"],
    hills: ["#72cf78", "#48ad64"],
    rows: [
      "....................................................................................................................",
      "....................................................................................................................",
      "................o.............o................................o........................o..........................",
      "..............#####.........#####.............o..............#####..............o......#####.......................",
      "...........................................#####.................................................................",
      "........o.........................F..................o...........L...........F...............o....................",
      "......#####...........o..................#####.....#####...................#####............#####.................",
      "...P...............#####......E.........................B...........L...............E.........................G...",
      "...........#####....................#####....................#####......................#####...................#",
      "..................................................###...................###............................########",
      "##############...################......##################...###################...##################...#########",
      "##############...################......##################...###################...##################...#########"
    ]
  },
  {
    name: "夕焼けの谷",
    sky: ["#4a83bb", "#efaa83", "#ffe2a6"],
    hills: ["#6bb678", "#3d8e67"],
    rows: [
      "........................................................................................................................",
      "........................................................................................................................",
      ".......................o........................o............................o...........................o............",
      "...........o.........#####.........o..........#####..............o..........#####.......................#####..........",
      ".........#####...................#####.........................#####...................................................",
      "..................A.................................F....................A...................F.......................",
      ".....o.....................L...........o........................L..................o.....................L............",
      "...#####..........E......#####.......#####......B..............#####........E.....#####......A..........#####.........",
      ".P...........#####.........................#####...........#####........................#####......................G.",
      ".................###..............###...............................###.........................###................#",
      "###########......###...###############...################......#####...#############......######...################",
      "###########......###...###############...################......#####...#############......######...################"
    ]
  },
  {
    name: "星明かりの峰",
    sky: ["#243d72", "#5d74a7", "#b4b9d9"],
    hills: ["#507c75", "#31585d"],
    rows: [
      "............................................................................................................................",
      "............................................................................................................................",
      "................o......................o......................o........................o......................o............",
      "..............#####..................#####..................#####....................#####..................#####..........",
      ".....o........................A....................o.....................A.................................................",
      "...#####.............F....................L......#####.........F..................L...........o..............F............",
      ".............E....#####.......B........#####................#####......E........#####.......#####....B.....#####..........",
      ".P.........................#####........................A.............................#####.........................G.....",
      "..........#####....................#####..........E....................#####......................#####.................#",
      "...................###.......................###..................###.......................###................########",
      "########...........###....##############.....###....##########....###....###############....###....###################",
      "########...........###....##############.....###....##########....###....###############....###....###################"
    ]
  },
  {
    name: "プロペラ雲の森",
    sky: ["#5bbdd6", "#b7f0df", "#f5ffe8"],
    hills: ["#7ed487", "#3e9b70"],
    rows: [
      "..............................................................................................................................",
      "..............................................................................................................................",
      "..................o................o..................o..................o..................o..................o............",
      "................#####............#####..............#####..............#####..............#####..............#####..........",
      ".......o..................................A.....................................A.............................................",
      ".....#####...........F........L................F...........L................F...........L................F.................",
      "..............E....#####....#####......B.....#####.......#####......E.....#####.......#####......B.....#####..............",
      ".P.........................o..........................o..........................o.................................G.......",
      "...........#####.........#####...............#####..........A..........#####...............#####..............#####......#",
      "....................###..................###......................###..................###.........................#######",
      "##############......###...###################...################...###...###################...################...########",
      "##############......###...###################...################...###...###################...################...########"
    ]
  },
  {
    name: "風渡りの空橋",
    sky: ["#2f5892", "#7fb7d8", "#ffd89f"],
    hills: ["#5c987e", "#2e5d62"],
    rows: [
      "................................................................................................................................",
      "................................................................................................................................",
      "............o................o................o................o................o................o................o............",
      "..........#####............#####............#####............#####............#####............#####............#####..........",
      "....................A................A................F................A................F................A....................",
      "......F........L...........F........L...........F........L...........F........L...........F........L...........F.............",
      "....#####....#####..E....#####....#####..B....#####....#####..E....#####....#####..B....#####....#####..E....#####..........",
      ".P.......................o....................o....................o....................o....................o............G..",
      "..........#####........#####........A.......#####........#####........A.......#####........#####........A.......#####.......#",
      ".................###...................###...................###...................###...................###............####",
      "##########.......###....############....###....############....###....############....###....############....###############",
      "##########.......###....############....###....############....###....############....###....############....###############"
    ]
  }
);

function loadSave() {
  const fallback = {
    unlocked: STAGES.length,
    selectedStage: 0,
    bestScores: [0, 0, 0],
    sound: true,
    music: true
  };

  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    if (!saved || typeof saved !== "object") return fallback;
    return {
      unlocked: STAGES.length,
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
  flowers: [],
  particles: [],
  solids: [],
  leafPlatforms: [],
  collectibles: [],
  goal: { x: 0, y: 0, w: 34, h: 104 },
  totalCoins: 0,
  windLevel: WIND_LEVEL_MIN,
  windPower: 0,
  windCharge: 0,
  windFlash: 0,
  windTrailCooldown: 0,
  combo: 0,
  comboTimer: 0,
  comboFlash: 0,
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

function getWindLevelForCoins(coins, totalCoins) {
  if (totalCoins <= 0) return WIND_LEVEL_MIN;
  return clamp(
    WIND_LEVEL_MIN + Math.floor(coins / WIND_COINS_PER_LEVEL),
    WIND_LEVEL_MIN,
    WIND_LEVEL_MAX
  );
}

function isWindActive() {
  return state.windLevel > WIND_LEVEL_MIN - 1 && input.jump && !player.onGround;
}

function updateWindLevel() {
  const nextLevel = clamp(
    WIND_LEVEL_MIN + Math.floor(state.windCharge / WIND_COINS_PER_LEVEL),
    WIND_LEVEL_MIN,
    WIND_LEVEL_MAX
  );
  if (nextLevel === state.windLevel) {
    state.windPower = state.windLevel / WIND_LEVEL_MAX;
    return;
  }

  state.windLevel = nextLevel;
  state.windPower = state.windLevel / WIND_LEVEL_MAX;
  state.windFlash = 0.75;
  playSound("wind");
  addWindBurst(player.x + player.w / 2, player.y + player.h / 2, 22 + state.windLevel * 8);
  addScreenWindBurst(18 + state.windLevel * 8);
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

function ensureVersionBadge() {
  if (!versionBadge) {
    versionBadge = document.createElement("div");
    versionBadge.id = "version-badge";
    versionBadge.className = "version-badge";
    stageWrap.appendChild(versionBadge);
  }
  versionBadge.textContent = `${APP_VERSION} S${state.selectedStage + 1}/${STAGES.length}`;
}

function parseStage(index) {
  const stage = STAGES[index];
  const width = Math.max(...stage.rows.map((row) => row.length));
  state.solids = [];
  state.leafPlatforms = [];
  state.collectibles = [];
  state.enemies = [];
  state.flowers = [];
  state.goal = { x: 0, y: 0, w: 34, h: 104 };
  state.totalCoins = 0;

  for (let y = 0; y < stage.rows.length; y += 1) {
    const row = stage.rows[y].padEnd(width, ".");
    for (let x = 0; x < row.length; x += 1) {
      const tile = row[x];
      const px = x * TILE;
      const py = y * TILE;
      if (tile === "#") {
        state.solids.push({ x: px, y: py, w: TILE, h: TILE });
      } else if (tile === "o") {
        state.totalCoins += 1;
        state.collectibles.push({
          x: px + 14,
          y: py + 12,
          w: 20,
          h: 20,
          taken: false,
          bob: (x + y) * 0.4
        });
      } else if (tile === "L") {
        state.leafPlatforms.push({
          x: px,
          y: py + 26,
          w: TILE,
          h: 14,
          bob: (x + y) * 0.37
        });
      } else if (tile === "F") {
        state.flowers.push({
          x: px + 6,
          y: py + 3,
          w: 36,
          h: 44,
          spin: 0,
          active: 0,
          bob: (x + y) * 0.2
        });
      } else if (tile === "E" || tile === "B" || tile === "A") {
        const flying = tile === "A";
        state.enemies.push({
          x: px + 6,
          y: flying ? py + 4 : py + 8,
          baseY: flying ? py + 4 : py + 8,
          w: flying ? 34 : 36,
          h: flying ? 28 : 32,
          vx: tile === "B" ? (x % 2 ? -58 : 58) : (x % 2 ? -72 : 72),
          vy: 0,
          type: tile === "B" ? "hopper" : flying ? "drifter" : "walker",
          minX: Math.max(0, px - 120),
          maxX: Math.min(width * TILE, px + (flying ? 220 : 170)),
          alive: true,
          onGround: false,
          jumpCooldown: 0.45 + ((x + y) % 5) * 0.16,
          phase: (x + y) * 0.7
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

function resetWindToMinimum() {
  state.windLevel = WIND_LEVEL_MIN;
  state.windPower = state.windLevel / WIND_LEVEL_MAX;
  state.windCharge = 0;
  state.windFlash = 0;
  state.combo = 0;
  state.comboTimer = 0;
  state.comboFlash = 0;
}

function resetLevel(index = state.selectedStage, options = {}) {
  const preserveWind = options.preserveWind === true;
  state.stageIndex = index;
  parseStage(index);
  state.particles = [];
  state.coins = 0;
  state.score = 0;
  state.lives = 3;
  if (!preserveWind) resetWindToMinimum();
  else {
    state.windLevel = clamp(state.windLevel, WIND_LEVEL_MIN, WIND_LEVEL_MAX);
    state.windPower = state.windLevel / WIND_LEVEL_MAX;
  }
  state.windFlash = 0;
  state.windTrailCooldown = 0;
  state.combo = 0;
  state.comboTimer = 0;
  state.comboFlash = 0;
  state.time = 0;
  state.cameraX = 0;
  state.shake = 0;
  resetInput();
  resetPlayer();
  updateHud();
}

function startGame() {
  unlockAudio();
  const preserveWind = state.mode === "clear";
  resetLevel(state.selectedStage, { preserveWind });
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
  windLevelEl.textContent = `Lv.${state.windLevel}`;
  scoreEl.textContent = String(state.score);
  livesEl.textContent = String(state.lives);
  ensureVersionBadge();
}

function ensureStageButtons() {
  const existing = new Set([...document.querySelectorAll("[data-stage]")].map((button) => Number(button.dataset.stage)));
  for (let index = 0; index < STAGES.length; index += 1) {
    if (existing.has(index)) continue;
    const button = document.createElement("button");
    button.className = "stage-option";
    button.type = "button";
    button.dataset.stage = String(index);
    button.textContent = String(index + 1);
    stagePicker.appendChild(button);
  }
}

function updateStagePicker() {
  ensureStageButtons();
  for (const button of document.querySelectorAll("[data-stage]")) {
    const index = Number(button.dataset.stage);
    button.disabled = false;
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
  if (name === "wind") {
    playTone(587.33, 0.14, "triangle", 0.11);
    playTone(880, 0.18, "sine", 0.09, 0.08);
  }
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
      color,
      gravity: 720
    });
  }
}

function addWindBurst(x, y, count) {
  for (let i = 0; i < count; i += 1) {
    state.particles.push({
      x: x + (Math.random() - 0.5) * 70,
      y: y + (Math.random() - 0.5) * 48,
      vx: -260 - Math.random() * 220,
      vy: -80 + (Math.random() - 0.5) * 180,
      life: 0.35 + Math.random() * 0.35,
      size: 2 + Math.random() * 5,
      color: Math.random() > 0.45 ? "#e2fbff" : "#8be8ff",
      gravity: -80
    });
  }
}

function addScreenWindBurst(count) {
  for (let i = 0; i < count; i += 1) {
    state.particles.push({
      x: state.cameraX + Math.random() * WIDTH,
      y: HEIGHT - Math.random() * 84,
      vx: -120 - Math.random() * 260,
      vy: -180 - Math.random() * 180,
      life: 0.45 + Math.random() * 0.38,
      size: 2 + Math.random() * 6,
      color: Math.random() > 0.5 ? "#f7ffff" : "#95edff",
      gravity: -110
    });
  }
}

function playerHurt(source = "enemy", hazard = null) {
  if (player.invuln > 0 || state.mode !== "playing") return;

  if (source === "enemy" && state.windLevel > WIND_LEVEL_MIN) {
    state.windLevel -= 1;
    state.windCharge = Math.max(0, (state.windLevel - WIND_LEVEL_MIN) * WIND_COINS_PER_LEVEL);
    state.windPower = state.windLevel / WIND_LEVEL_MAX;
    state.windFlash = 0.45;
    state.shake = 0.14;
    player.invuln = 1.15;
    player.vy = -360;
    if (hazard) {
      const playerCx = player.x + player.w / 2;
      const hazardCx = hazard.x + hazard.w / 2;
      player.vx = playerCx < hazardCx ? -320 : 320;
      player.facing = player.vx < 0 ? -1 : 1;
    }
    playSound("wind");
    addWindBurst(player.x + player.w / 2, player.y + player.h / 2, 30);
    updateHud();
    return;
  }

  if (source === "fall") resetWindToMinimum();
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
  state.windCharge += 1;
  if (isWindActive()) {
    state.combo = state.comboTimer > 0 ? state.combo + 1 : 1;
    state.comboTimer = 1.25;
    state.comboFlash = 0.7;
  } else {
    state.combo = 0;
    state.comboTimer = 0;
  }
  state.score += 100 + Math.min(state.combo, 8) * 25;
  playSound("coin");
  addParticles(coin.x + coin.w / 2, coin.y + coin.h / 2, state.combo > 1 ? "#8be8ff" : "#ffcf4f", 8 + Math.min(state.combo, 6));
  updateWindLevel();
  updateHud();
}

function finishLevel() {
  if (state.mode !== "playing") return;
  state.mode = "clear";
  state.score += 1000 + state.lives * 250;
  const allClear = state.stageIndex >= STAGES.length - 1;
  const nextStage = Math.min(state.stageIndex + 1, STAGES.length - 1);
  progress.bestScores[state.stageIndex] = Math.max(progress.bestScores[state.stageIndex], state.score);
  progress.unlocked = Math.min(STAGES.length, Math.max(progress.unlocked, nextStage + 1));
  if (!allClear) {
    state.selectedStage = nextStage;
  }
  progress.selectedStage = state.selectedStage;
  saveProgress();
  updateHud();
  updateStagePicker();
  playSound("clear");
  stageWrap.classList.remove("is-playing");
  showOverlay(
    allClear ? "全ステージクリア！" : "ステージクリア！",
    allClear ? "星明かりの峰を越えました。全ステージ制覇です。" : `次の「${STAGES[state.selectedStage].name}」が開きました。`,
    allClear ? "もう一度遊ぶ" : "次のステージ",
    true
  );
}

function getActiveSolids() {
  if (state.windLevel < 2) return state.solids;
  return state.solids.concat(state.leafPlatforms);
}

function collideWithSolids(entity, axis) {
  for (const solid of getActiveSolids()) {
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
  const windActive = isWindActive();
  const moveAccel = !player.onGround && windActive && state.windLevel >= 2
    ? WIND_AIR_ACCEL[state.windLevel]
    : MOVE_ACCEL;
  if (dir !== 0) {
    player.vx += dir * moveAccel * dt;
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
  let gravity = input.jump && player.vy < 0 ? HOLD_GRAVITY : GRAVITY;
  let maxFall = MAX_FALL;
  if (windActive) {
    gravity = player.vy < 0 ? Math.min(HOLD_GRAVITY, WIND_GRAVITY[state.windLevel]) : WIND_GRAVITY[state.windLevel];
    maxFall = WIND_FALL_SPEED[state.windLevel];
    if (state.windLevel >= 3 && player.vy > 120) {
      player.vy = Math.max(120, player.vy - 1200 * dt);
    }
    state.windTrailCooldown -= dt;
    if (state.windTrailCooldown <= 0) {
      addWindBurst(player.x + player.w / 2, player.y + player.h / 2, 4 + state.windLevel * 2);
      state.windTrailCooldown = 0.055;
    }
  } else {
    state.windTrailCooldown = Math.min(state.windTrailCooldown, 0);
  }
  player.vy = Math.min(maxFall, player.vy + gravity * dt);
  player.invuln = Math.max(0, player.invuln - dt);

  player.x += player.vx * dt;
  collideWithSolids(player, "x");
  player.onGround = false;
  player.y += player.vy * dt;
  collideWithSolids(player, "y");

  if (player.y > HEIGHT + 260) playerHurt("fall");
}

function updateEnemies(dt) {
  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;
    enemy.x += enemy.vx * dt;
    if (enemy.x < enemy.minX || enemy.x + enemy.w > enemy.maxX) {
      enemy.vx *= -1;
      enemy.x = clamp(enemy.x, enemy.minX, enemy.maxX - enemy.w);
    }

    if (enemy.type === "drifter") {
      enemy.phase += dt * 3.2;
      enemy.y = enemy.baseY + Math.sin(enemy.phase) * 20;
    } else {
      enemy.jumpCooldown -= dt;
      if (enemy.type === "hopper" && enemy.onGround && enemy.jumpCooldown <= 0) {
        enemy.vy = -520;
        enemy.onGround = false;
        enemy.jumpCooldown = 1.1 + Math.random() * 0.55;
      }
      enemy.vy = Math.min(MAX_FALL, enemy.vy + GRAVITY * dt);
      enemy.y += enemy.vy * dt;
      enemy.onGround = false;
      collideWithSolids(enemy, "y");
    }

    if (!rectsOverlap(player, enemy)) continue;
    const stompWindow = enemy.type === "drifter" ? 18 : 22;
    const stomp = player.vy > 130 && player.y + player.h - enemy.y < stompWindow;
    if (stomp) {
      enemy.alive = false;
      player.vy = enemy.type === "hopper" ? -520 : -430;
      state.score += enemy.type === "drifter" ? 350 : enemy.type === "hopper" ? 300 : 250;
      playSound("stomp");
      addParticles(
        enemy.x + enemy.w / 2,
        enemy.y + enemy.h / 2,
        enemy.type === "drifter" ? "#8be8ff" : enemy.type === "hopper" ? "#ffb25f" : "#79d66b",
        12
      );
      updateHud();
    } else {
      playerHurt("enemy", enemy);
    }
  }
}

function updateFlowers(dt) {
  const windActive = isWindActive();
  const playerCx = player.x + player.w / 2;
  const playerCy = player.y + player.h / 2;

  for (const flower of state.flowers) {
    const flowerCx = flower.x + flower.w / 2;
    const flowerCy = flower.y + flower.h / 2;
    const dx = playerCx - flowerCx;
    const dy = playerCy - flowerCy;
    const nearWind = windActive && Math.abs(dx) < 86 && Math.abs(dy) < 150;
    flower.active = approach(flower.active, nearWind ? 1 : 0, dt * 3.8);
    flower.spin += dt * (2.2 + flower.active * 18);

    const inColumn = flower.active > 0.45
      && Math.abs(dx) < 62
      && playerCy < flower.y + flower.h + 12
      && playerCy > flower.y - 230;
    if (!inColumn) continue;
    player.vy = Math.min(player.vy, -130 - flower.active * 170);
    player.vy -= UPDRAFT_FORCE * flower.active * dt;
    addWindBurst(player.x + player.w / 2, player.y + player.h / 2, 2);
  }
}

function updateCoinAttraction(dt) {
  if (!isWindActive()) return;
  const range = WIND_COIN_RANGE[state.windLevel];
  const pull = WIND_COIN_PULL[state.windLevel] * dt;
  const playerCx = player.x + player.w / 2;
  const playerCy = player.y + player.h / 2;

  for (const coin of state.collectibles) {
    if (coin.taken) continue;
    const coinCx = coin.x + coin.w / 2;
    const coinCy = coin.y + coin.h / 2;
    const dx = playerCx - coinCx;
    const dy = playerCy - coinCy;
    const distance = Math.hypot(dx, dy);
    if (distance <= 1 || distance > range) continue;
    const strength = (1 - distance / range) * pull;
    coin.x += (dx / distance) * strength;
    coin.y += (dy / distance) * strength;
  }
}

function updateCollectibles(dt) {
  updateCoinAttraction(dt);
  for (const coin of state.collectibles) {
    if (!coin.taken && rectsOverlap(player, coin)) collectCoin(coin);
  }
  if (rectsOverlap(player, state.goal)) finishLevel();
}

function updateParticles(dt) {
  for (const particle of state.particles) {
    particle.life -= dt;
    particle.vy += (particle.gravity ?? 720) * dt;
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
  state.windFlash = Math.max(0, state.windFlash - dt);
  state.comboTimer = Math.max(0, state.comboTimer - dt);
  if (state.comboTimer <= 0) state.combo = 0;
  state.comboFlash = Math.max(0, state.comboFlash - dt);
  updatePlayer(dt);
  updateFlowers(dt);
  updateEnemies(dt);
  updateCollectibles(dt);
  updateParticles(dt);
  updateCamera();
  input.jumpPressed = false;
  input.jumpReleased = false;
}

function drawBackground() {
  const stage = STAGES[state.stageIndex];
  const background = stageBackgrounds[state.stageIndex % stageBackgrounds.length];
  if (background.complete && background.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(background, 0, 0, WIDTH, HEIGHT);
    ctx.restore();
    return;
  }
  ctx.fillStyle = stage.sky[0];
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawTile(tile) {
  const x = Math.round(tile.x - state.cameraX);
  const y = tile.y;
  if (terrainSprite.complete && terrainSprite.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(terrainSprite, x, y, tile.w, tile.h);
    ctx.restore();
    return;
  }
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

function drawLeafPlatform(platform) {
  const x = Math.round(platform.x - state.cameraX);
  const y = Math.round(platform.y + Math.sin(state.time * 3 + platform.bob) * 3);
  const active = state.windLevel >= 2;

  ctx.save();
  ctx.globalAlpha = active ? 1 : 0.38;
  ctx.fillStyle = active ? "#7fe07e" : "#b7f3df";
  ctx.strokeStyle = active ? "#2d7f55" : "#79bfa9";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x + platform.w / 2, y + platform.h / 2, platform.w / 2, platform.h, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = active ? "#f7fff1" : "#e7fff8";
  ctx.fillRect(x + 9, y + 6, platform.w - 18, 3);
  ctx.fillStyle = active ? "#3ba464" : "#94d8c5";
  ctx.fillRect(x + platform.w / 2 - 2, y + 3, 4, platform.h + 4);
  ctx.restore();
}

function drawFlower(flower) {
  const x = Math.round(flower.x - state.cameraX);
  const y = Math.round(flower.y + Math.sin(state.time * 2.5 + flower.bob) * 2);
  const cx = x + flower.w / 2;
  const cy = y + 15;

  ctx.save();
  if (flower.active > 0.08) {
    ctx.globalAlpha = 0.18 + flower.active * 0.22;
    ctx.fillStyle = "#dffbff";
    for (let i = 0; i < 4; i += 1) {
      ctx.fillRect(cx - 28 + i * 18, y - 150 + i * 18, 8, 120 - i * 16);
    }
    ctx.globalAlpha = 1;
  }

  ctx.strokeStyle = "#2d7f55";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx, y + 24);
  ctx.lineTo(cx, y + flower.h);
  ctx.stroke();
  ctx.fillStyle = "#5fcf6a";
  ctx.fillRect(cx - 12, y + flower.h - 12, 24, 8);

  ctx.translate(cx, cy);
  ctx.rotate(flower.spin);
  ctx.fillStyle = flower.active > 0.4 ? "#fff2a8" : "#ffd36b";
  for (let i = 0; i < 4; i += 1) {
    ctx.rotate(Math.PI / 2);
    ctx.fillRect(0, -5, 22, 10);
  }
  ctx.fillStyle = "#f26f52";
  ctx.fillRect(-6, -6, 12, 12);
  ctx.restore();
}

function drawCoin(coin) {
  if (coin.taken) return;
  const bob = Math.sin(state.time * 5 + coin.bob) * 4;
  const x = coin.x - state.cameraX + coin.w / 2;
  const y = coin.y + coin.h / 2 + bob;
  if (coinSprite.complete && coinSprite.naturalWidth > 0) {
    const turn = Math.max(0.22, Math.abs(Math.cos(state.time * 4 + coin.bob)));
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(turn, 1);
    ctx.drawImage(coinSprite, -15, -15, 30, 30);
    ctx.restore();
    return;
  }
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

  if (enemy.type === "walker" && enemySprite.complete && enemySprite.naturalWidth > 0) {
    const spriteWidth = 52;
    const spriteHeight = 38;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(x + enemy.w / 2, y + enemy.h);
    ctx.scale(enemy.vx < 0 ? 1 : -1, 1);
    ctx.drawImage(enemySprite, -spriteWidth / 2, -spriteHeight, spriteWidth, spriteHeight);
    ctx.restore();
    return;
  }

  if (enemy.type === "drifter") {
    ctx.save();
    ctx.fillStyle = "#82e8ff";
    ctx.strokeStyle = "#2f78a8";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x + enemy.w / 2, y + enemy.h / 2, enemy.w / 2, enemy.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + 8, y + 8, 6, 5);
    ctx.fillStyle = "#102033";
    ctx.fillRect(x + 20, y + 11, 4, 4);
    ctx.fillRect(x + 27, y + 11, 4, 4);
    ctx.fillStyle = "#57badb";
    ctx.fillRect(x + 4, y + enemy.h - 4, enemy.w - 8, 4);
    ctx.restore();
    return;
  }

  ctx.fillStyle = enemy.type === "hopper" ? "#ffb25f" : "#79d66b";
  ctx.beginPath();
  ctx.roundRect(x, y + 4, enemy.w, enemy.h - 4, 8);
  ctx.fill();
  ctx.fillStyle = enemy.type === "hopper" ? "#853f2a" : "#326a3b";
  ctx.fillRect(x + 7, y + 14, 5, 5);
  ctx.fillRect(x + enemy.w - 12, y + 14, 5, 5);
  ctx.fillStyle = enemy.type === "hopper" ? "#513020" : "#2f5b33";
  ctx.fillRect(x + 8, y + enemy.h - 4, 8, 5);
  ctx.fillRect(x + enemy.w - 16, y + enemy.h - 4, 8, 5);
  if (enemy.type === "hopper") {
    ctx.fillStyle = "#fff1b8";
    ctx.fillRect(x + 13, y + 5, 10, 4);
  }
}

function drawPlayer() {
  const x = player.x - state.cameraX;
  const y = player.y;
  if (player.invuln > 0 && Math.floor(state.time * 18) % 2 === 0) return;

  const isRunning = player.onGround && Math.abs(player.vx) > 80;
  const runSprite = playerRunSprites[Math.floor(state.time * 12) % playerRunSprites.length];
  let activeSprite = playerSprite;

  if (!player.onGround && playerJumpSprite.complete && playerJumpSprite.naturalWidth > 0) {
    activeSprite = playerJumpSprite;
  } else if (isRunning && runSprite.complete && runSprite.naturalWidth > 0) {
    activeSprite = runSprite;
  }

  if (activeSprite.complete && activeSprite.naturalWidth > 0) {
    const spriteSize = 62;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(x + player.w / 2, y + player.h);
    ctx.scale(player.facing, 1);
    ctx.drawImage(activeSprite, -spriteSize / 2, -spriteSize, spriteSize, spriteSize);
    ctx.restore();
    return;
  }

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
  if (goalSprite.complete && goalSprite.naturalWidth > 0) {
    const width = 88;
    const height = 118;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      goalSprite,
      Math.round(x - 24),
      Math.round(y + state.goal.h - height),
      width,
      height
    );
    ctx.restore();
    return;
  }
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

function drawWindFlash() {
  if (state.windFlash <= 0) return;
  ctx.save();
  ctx.globalAlpha = clamp(state.windFlash, 0, 0.42);
  ctx.fillStyle = "#e8fbff";
  for (let i = 0; i < 10; i += 1) {
    const y = HEIGHT - 28 - i * 15;
    const width = 100 + i * 34;
    const x = ((state.time * 220 + i * 83) % (WIDTH + width)) - width;
    ctx.fillRect(x, y, width, 4);
  }
  ctx.restore();
}

function drawCombo() {
  if (state.combo <= 1 || state.comboFlash <= 0) return;
  ctx.save();
  ctx.globalAlpha = clamp(state.comboFlash * 1.8, 0, 1);
  ctx.fillStyle = "#102033";
  ctx.fillRect(WIDTH / 2 - 92, 70, 184, 34);
  ctx.fillStyle = "#8be8ff";
  ctx.font = "900 18px Courier New, monospace";
  ctx.textAlign = "center";
  ctx.fillText(`BREEZE x${state.combo}`, WIDTH / 2, 93);
  ctx.restore();
}

function draw() {
  ctx.save();
  if (state.shake > 0) ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 6);
  drawBackground();
  const left = state.cameraX - TILE;
  const right = state.cameraX + WIDTH + TILE;
  for (const platform of state.leafPlatforms) {
    if (platform.x + platform.w > left && platform.x < right) drawLeafPlatform(platform);
  }
  for (const flower of state.flowers) {
    if (flower.x + flower.w > left && flower.x < right) drawFlower(flower);
  }
  for (const solid of state.solids) {
    if (solid.x + solid.w > left && solid.x < right) drawTile(solid);
  }
  for (const coin of state.collectibles) {
    if (coin.x + coin.w > left && coin.x < right) drawCoin(coin);
  }
  for (const enemy of state.enemies) {
    if (enemy.x + enemy.w > left && enemy.x < right) drawEnemy(enemy);
  }
  drawGoal();
  drawPlayer();
  drawParticles();
  drawWindFlash();
  drawCombo();
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
  const preserveWind = state.mode === "clear";
  state.selectedStage = Number(button.dataset.stage);
  progress.selectedStage = state.selectedStage;
  saveProgress();
  updateStagePicker();
  resetLevel(state.selectedStage, { preserveWind });
  if (state.mode !== "playing") startGame();
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

ensureVersionBadge();
resizeCanvas();
updateStagePicker();
resetLevel(state.selectedStage);
showOverlay("Cloud Hop Adventure", "星の実を集めて、雲の門まで走り抜けよう。", "スタート", true);
requestAnimationFrame(frame);
