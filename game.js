const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const smokeCanvas = document.createElement("canvas");
const smokeCtx = smokeCanvas.getContext("2d");
const startScreen = document.getElementById("startScreen");
const endScreen = document.getElementById("endScreen");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const finalRepairs = document.getElementById("finalRepairs");
const finalBest = document.getElementById("finalBest");

const machineImage = new Image();
machineImage.src = "assets/madrog-machine-model.png?v=2";

const BEST_KEY = "madrog-road-repair-best-score";
const MACHINE_ASPECT = 826 / 1325;
const SMOKE_PIXEL_SCALE = 4;
const view = { width: 960, height: 540, dpr: 1 };

let state = "start";
let lastTime = 0;
let score = 0;
let repairs = 0;
let lives = 3;
let streak = 0;
let bestScore = readBestScore();
let speed = 160;
let spawnTimer = 0;
let roadOffset = 0;
let inputLock = 0;
let repairPulse = 0;
let screenShake = 0;
let gameTime = 0;
let holes = [];
let particles = [];
let floaters = [];
let smokePuffs = [];
let smokeTimer = 0;
let audioContext = null;

function readBestScore() {
  try {
    return Number(localStorage.getItem(BEST_KEY) || 0);
  } catch {
    return 0;
  }
}

function saveBestScore(value) {
  bestScore = Math.max(bestScore, value);
  try {
    localStorage.setItem(BEST_KEY, String(bestScore));
  } catch {
    // Gra działa dalej nawet wtedy, gdy przeglądarka blokuje localStorage.
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function random(min, max) {
  return min + Math.random() * (max - min);
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  view.width = Math.max(320, rect.width);
  view.height = Math.max(240, rect.height);
  view.dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.round(view.width * view.dpr);
  canvas.height = Math.round(view.height * view.dpr);
  smokeCanvas.width = Math.ceil(view.width / SMOKE_PIXEL_SCALE);
  smokeCanvas.height = Math.ceil(view.height / SMOKE_PIXEL_SCALE);
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
}

function showScreen(screen) {
  startScreen.classList.toggle("is-active", screen === "start");
  endScreen.classList.toggle("is-active", screen === "end");
}

function getRoad() {
  const portrait = view.height / view.width > 1.12;
  const top = portrait ? view.height * 0.62 : view.height * 0.58;
  const height = view.height - top;
  return {
    top,
    height,
    laneY: top + height * 0.56,
    frontLine: top + height * 0.16
  };
}

function getMachineBox() {
  const portrait = view.height / view.width > 1.12;
  const road = getRoad();
  const width = portrait
    ? clamp(view.width * 0.54, 190, 280)
    : clamp(view.width * 0.34, 270, 395);
  const height = width * MACHINE_ASPECT;
  const x = portrait ? view.width * 0.06 : view.width * 0.07;
  const bottom = road.top + road.height * (portrait ? 0.48 : 0.54);
  return { x, y: bottom - height, width, height, bottom };
}

function getMachineBobOffset() {
  const pace = state === "playing" ? 4.2 + speed / 190 : 2.1;
  const lift = state === "playing" ? 3.8 : 1.8;
  return Math.sin(gameTime * pace) * lift;
}

function getMachineDrawBox() {
  const box = getMachineBox();
  const bob = getMachineBobOffset();
  return {
    ...box,
    y: box.y + bob,
    bottom: box.bottom + bob,
    bob
  };
}

function getRepairPoint() {
  const box = getMachineDrawBox();
  const road = getRoad();
  return {
    x: box.x + box.width * 0.18,
    y: road.laneY,
    nozzleY: box.bottom - box.height * 0.1
  };
}

function getSmokeOrigin() {
  const box = getMachineDrawBox();
  return {
    x: box.x + box.width * 0.22,
    y: box.y + box.height * 0.2
  };
}

function getHitWindow() {
  const ratio = clamp(0.1 - score * 0.0009, 0.064, 0.1);
  return Math.max(44, view.width * ratio);
}

function getSpawnDelay() {
  const speedRatio = speed / Math.max(1, view.width);

  if (score < 10) {
    return clamp(random(1.35, 2.05) - speedRatio * 0.1, 1.08, 2.05);
  }

  if (score < 15) {
    return clamp(random(1.16, 1.76) - speedRatio * 0.1, 0.9, 1.72);
  }

  if (score < 25) {
    return clamp(random(0.92, 1.42) - speedRatio * 0.11, 0.68, 1.36);
  }

  return clamp(random(0.78, 1.2) - speedRatio * 0.1, 0.56, 1.15);
}

function resetGame() {
  score = 0;
  repairs = 0;
  lives = 3;
  streak = 0;
  holes = [];
  particles = [];
  floaters = [];
  smokePuffs = [];
  gameTime = 0;
  smokeTimer = 0;
  speed = clamp(view.width * 0.28, 185, 290);
  spawnTimer = 1.05;
  inputLock = 0.18;
  repairPulse = 0;
  screenShake = 0;
  state = "playing";
  showScreen(null);
}

function endGame() {
  state = "end";
  saveBestScore(score);
  finalRepairs.textContent = String(repairs);
  finalBest.textContent = String(bestScore);
  showScreen("end");
}

function spawnHole(extraOffset = 0, sizeScale = 1) {
  const road = getRoad();
  const width = clamp(random(view.width * 0.068, view.width * 0.112) * sizeScale, 50, 110);
  const height = random(17, 29) * sizeScale;
  holes.push({
    x: view.width + width + extraOffset,
    y: road.laneY + random(-road.height * 0.05, road.height * 0.05),
    width,
    height,
    seed: Math.random() * 1000,
    patched: false,
    missed: false,
    patchAge: 0
  });
}

function handleAction(event) {
  if (event) {
    event.preventDefault();
  }

  if (state === "start") {
    resetGame();
    return;
  }

  if (state === "end") {
    resetGame();
    return;
  }

  if (state === "playing") {
    tryRepair();
  }
}

function tryRepair() {
  if (inputLock > 0) {
    return;
  }

  inputLock = 0.16;
  repairPulse = 0.25;
  const point = getRepairPoint();
  const hitWindow = getHitWindow();
  let target = null;
  let targetDistance = Infinity;

  for (const hole of holes) {
    if (hole.patched || hole.missed) {
      continue;
    }
    const distance = Math.abs(hole.x - point.x);
    if (distance < hitWindow && distance < targetDistance) {
      target = hole;
      targetDistance = distance;
    }
  }

  emitSpray(point.x, point.nozzleY, point.y, Boolean(target));

  if (target) {
    patchHole(target);
    playRepairSound(true);
  } else {
    loseLife(point.x, point.y, "Pudło");
    playRepairSound(false);
  }
}

function patchHole(hole) {
  hole.patched = true;
  hole.patchAge = 0;
  repairs += 1;
  streak += 1;
  score += 1;

  let label = "+1";
  if (streak % 5 === 0) {
    score += 1;
    label = "+2 seria";
  }

  saveBestScore(score);
  addFloater(label, hole.x, hole.y - 34, "#f8d850");
  emitPatchBurst(hole.x, hole.y);
}

function loseLife(x, y, label) {
  if (state !== "playing") {
    return;
  }
  lives -= 1;
  streak = 0;
  screenShake = 0.18;
  addFloater(label, x, y - 28, "#ff756e");
  if (lives <= 0) {
    endGame();
  }
}

function missHole(hole) {
  hole.missed = true;
  loseLife(hole.x, hole.y, "-1 życie");
}

function addFloater(text, x, y, color) {
  floaters.push({
    text,
    x,
    y,
    color,
    life: 0.95,
    maxLife: 0.95
  });
}

function emitSpray(x, fromY, toY, strong) {
  const count = strong ? 22 : 12;
  for (let i = 0; i < count; i += 1) {
    particles.push({
      x: x + random(-8, 8),
      y: random(fromY, toY),
      vx: random(-22, 30),
      vy: random(95, 175),
      size: random(3, 7),
      color: Math.random() > 0.45 ? "#f0b21a" : "#2a2520",
      life: random(0.22, 0.45),
      maxLife: 0.45
    });
  }
}

function emitPatchBurst(x, y) {
  for (let i = 0; i < 18; i += 1) {
    particles.push({
      x: x + random(-22, 22),
      y: y + random(-8, 10),
      vx: random(-70, 70),
      vy: random(-80, -15),
      size: random(2, 5),
      color: Math.random() > 0.35 ? "#2f302d" : "#f3b71f",
      life: random(0.32, 0.65),
      maxLife: 0.65
    });
  }
}

function emitSmokePuff() {
  const origin = getSmokeOrigin();
  const maxLife = random(0.85, 1.2);
  const lobeCount = Math.floor(random(3, 6));
  const lobes = [];
  for (let i = 0; i < lobeCount; i += 1) {
    lobes.push({
      dx: random(-0.62, 0.62),
      dy: random(-0.52, 0.42),
      sx: random(0.58, 1.08),
      sy: random(0.5, 1.05),
      shade: Math.floor(random(0, 4))
    });
  }

  smokePuffs.push({
    x: origin.x + random(-5, 5),
    y: origin.y + random(-8, 1),
    vx: random(-16, 8),
    vy: random(-50, -34),
    size: random(16, 25),
    life: maxLife,
    maxLife,
    wave: random(0, Math.PI * 2),
    lobes
  });
}

function updateSmoke(dt) {
  smokeTimer -= dt;
  const interval = state === "playing"
    ? clamp(0.34 - speed / Math.max(view.width, 1) * 0.06, 0.18, 0.34)
    : 0.42;

  while (smokeTimer <= 0) {
    emitSmokePuff();
    smokeTimer += random(interval, interval + 0.12);
  }

  smokePuffs = smokePuffs.filter((puff) => {
    puff.life -= dt;
    puff.wave += dt * 4.6;
    puff.x += (puff.vx + Math.sin(puff.wave) * 12) * dt;
    puff.y += puff.vy * dt;
    puff.vy -= 7 * dt;
    puff.size += 10 * dt;
    return puff.life > 0;
  });
}

function playRepairSound(success) {
  try {
    const AudioEngine = window.AudioContext || window.webkitAudioContext;
    if (!AudioEngine) {
      return;
    }
    audioContext = audioContext || new AudioEngine();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "square";
    oscillator.frequency.value = success ? 160 : 92;
    gain.gain.value = 0.045;
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.12);
    oscillator.stop(audioContext.currentTime + 0.13);
  } catch {
    // Audio jest tylko dodatkiem. Bez niego gra nadal działa normalnie.
  }
}

function update(dt) {
  gameTime += dt;
  const road = getRoad();
  const runningSpeed = state === "playing" ? speed : Math.max(70, view.width * 0.08);
  roadOffset = (roadOffset + runningSpeed * dt) % 140;

  inputLock = Math.max(0, inputLock - dt);
  repairPulse = Math.max(0, repairPulse - dt);
  screenShake = Math.max(0, screenShake - dt);

  particles = particles.filter((particle) => {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 135 * dt;
    return particle.life > 0 && particle.y < view.height + 80;
  });

  floaters = floaters.filter((floater) => {
    floater.life -= dt;
    floater.y -= 42 * dt;
    return floater.life > 0;
  });

  updateSmoke(dt);

  if (state !== "playing") {
    return;
  }

  const speedLimit = Math.max(240, view.width * (0.5 + Math.min(score, 34) * 0.008));
  speed = Math.min(speedLimit, speed + (13 + score * 0.48) * dt);
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnHole();
    if (score >= 10 && Math.random() < clamp((score - 10) * 0.032, 0, 0.3)) {
      spawnHole(random(view.width * 0.65, view.width * 0.95), 0.92);
    }
    if (score >= 15 && Math.random() < clamp((score - 15) * 0.024, 0, 0.24)) {
      spawnHole(random(view.width * 1.05, view.width * 1.38), 0.84);
    }
    spawnTimer = getSpawnDelay();
  }

  const point = getRepairPoint();
  const hitWindow = getHitWindow();
  holes.forEach((hole) => {
    hole.x -= speed * dt;
    if (hole.patched) {
      hole.patchAge += dt;
    } else if (!hole.missed && hole.x < point.x - hitWindow) {
      missHole(hole);
    }
  });

  holes = holes.filter((hole) => hole.x > -hole.width - 90);
}

function draw() {
  ctx.save();
  ctx.clearRect(0, 0, view.width, view.height);
  ctx.imageSmoothingEnabled = false;

  if (screenShake > 0) {
    ctx.translate(random(-4, 4), random(-3, 3));
  }

  drawBackground();
  drawRoad();
  drawHoles();
  drawMachine();
  drawSmokePuffs();
  drawRepairEffect();
  drawParticles();
  drawFloaters();
  drawHud();

  ctx.restore();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, view.height);
  gradient.addColorStop(0, "#3a3c3f");
  gradient.addColorStop(0.58, "#4b4d4f");
  gradient.addColorStop(1, "#27292d");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, view.width, view.height);

  const road = getRoad();
  ctx.fillStyle = "rgba(25, 27, 30, 0.42)";
  for (let x = -((roadOffset * 0.28) % 90); x < view.width + 120; x += 90) {
    const height = 26 + ((x / 90) % 3) * 12;
    ctx.fillRect(x, road.top - height - 18, 44, height);
    ctx.fillRect(x + 54, road.top - height - 4, 26, height - 14);
  }

  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  for (let y = 20; y < road.top - 20; y += 34) {
    ctx.fillRect(0, y, view.width, 1);
  }
}

function drawRoad() {
  const road = getRoad();
  ctx.fillStyle = "#24262a";
  ctx.fillRect(0, road.top, view.width, road.height);

  ctx.fillStyle = "#191b1f";
  ctx.fillRect(0, road.top + road.height * 0.62, view.width, road.height * 0.38);

  ctx.fillStyle = "#34373b";
  for (let x = -roadOffset; x < view.width + 160; x += 28) {
    ctx.fillRect(x, road.top + road.height * 0.17, 12, 2);
    ctx.fillRect(x + 8, road.top + road.height * 0.78, 18, 2);
  }

  ctx.fillStyle = "#d9c26a";
  for (let x = -((roadOffset * 1.2) % 140); x < view.width + 160; x += 140) {
    ctx.fillRect(x, road.frontLine, 66, 6);
  }

  ctx.fillStyle = "#575b61";
  ctx.fillRect(0, road.top, view.width, 4);
  ctx.fillStyle = "#111316";
  ctx.fillRect(0, view.height - 5, view.width, 5);
}

function drawHoles() {
  for (const hole of holes) {
    if (hole.patched) {
      drawPatch(hole);
    } else {
      drawPothole(hole);
    }
  }
}

function drawPothole(hole) {
  ctx.save();
  ctx.translate(hole.x, hole.y);
  const wobble = Math.sin(hole.seed) * 4;

  ctx.fillStyle = hole.missed ? "#2d1716" : "#0e0f10";
  ctx.beginPath();
  ctx.ellipse(0, 0, hole.width * 0.52, hole.height, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = hole.missed ? "#5b2a27" : "#2f3234";
  ctx.beginPath();
  ctx.ellipse(wobble, -2, hole.width * 0.34, hole.height * 0.55, 0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = hole.missed ? "#ff756e" : "#111214";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-hole.width * 0.64, -2);
  ctx.lineTo(-hole.width * 0.38, -hole.height * 1.15);
  ctx.lineTo(-hole.width * 0.18, -hole.height * 0.42);
  ctx.moveTo(hole.width * 0.18, -hole.height * 0.18);
  ctx.lineTo(hole.width * 0.48, -hole.height * 1.1);
  ctx.moveTo(-hole.width * 0.06, hole.height * 0.38);
  ctx.lineTo(hole.width * 0.38, hole.height * 0.95);
  ctx.stroke();

  ctx.restore();
}

function drawPatch(hole) {
  ctx.save();
  ctx.translate(hole.x, hole.y);
  const settle = clamp(hole.patchAge * 5, 0, 1);
  const width = hole.width * (0.72 + settle * 0.18);
  const height = hole.height * (0.9 + settle * 0.15);

  ctx.fillStyle = "#161819";
  roundRect(-width * 0.55, -height * 0.68, width * 1.1, height * 1.36, 6);
  ctx.fill();

  ctx.fillStyle = "#2f302d";
  for (let i = 0; i < 7; i += 1) {
    const px = -width * 0.4 + i * (width / 7);
    const py = Math.sin(hole.seed + i * 1.7) * height * 0.24;
    ctx.fillRect(px, py, 8, 2);
  }

  ctx.strokeStyle = "rgba(245, 181, 27, 0.28)";
  ctx.lineWidth = 2;
  ctx.strokeRect(-width * 0.55, -height * 0.68, width * 1.1, height * 1.36);
  ctx.restore();
}

function drawMachine() {
  const baseBox = getMachineBox();
  const box = getMachineDrawBox();
  const shadowScale = clamp(1 - Math.abs(box.bob) * 0.018, 0.9, 1);

  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.26)";
  ctx.beginPath();
  ctx.ellipse(baseBox.x + baseBox.width * 0.5, baseBox.bottom - 4, baseBox.width * 0.44 * shadowScale, 12 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();

  if (machineImage.complete && machineImage.naturalWidth > 0) {
    ctx.drawImage(machineImage, box.x, box.y, box.width, box.height);
  } else {
    drawLoadingMachine(box);
  }

  ctx.restore();
}

function drawSmokePuffs() {
  const colors = ["#4c4d49", "#696a62", "#8b846b", "#b49a62"];
  smokeCtx.save();
  smokeCtx.clearRect(0, 0, smokeCanvas.width, smokeCanvas.height);
  smokeCtx.imageSmoothingEnabled = false;

  for (const puff of smokePuffs) {
    const age = 1 - puff.life / puff.maxLife;
    const alpha = clamp((1 - age) * 0.48, 0, 0.48);
    const spread = puff.size * (0.46 + age * 0.72) / SMOKE_PIXEL_SCALE;
    const baseSize = puff.size * (0.32 + age * 0.42) / SMOKE_PIXEL_SCALE;
    const cx = puff.x / SMOKE_PIXEL_SCALE;
    const cy = puff.y / SMOKE_PIXEL_SCALE;

    smokeCtx.globalAlpha = alpha;
    for (const lobe of puff.lobes) {
      const x = Math.round(cx + lobe.dx * spread);
      const y = Math.round(cy + lobe.dy * spread);
      const rx = Math.max(2, Math.round(baseSize * lobe.sx));
      const ry = Math.max(2, Math.round(baseSize * lobe.sy));

      smokeCtx.fillStyle = "rgba(20, 20, 18, 0.35)";
      smokeCtx.beginPath();
      smokeCtx.ellipse(x + 1, y + 1, rx + 1, ry + 1, 0, 0, Math.PI * 2);
      smokeCtx.fill();

      smokeCtx.fillStyle = colors[lobe.shade] || colors[0];
      smokeCtx.beginPath();
      smokeCtx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      smokeCtx.fill();
    }
  }

  smokeCtx.restore();
  ctx.globalAlpha = 1;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(smokeCanvas, 0, 0, view.width, view.height);
  ctx.restore();
}

function drawLoadingMachine(box) {
  ctx.fillStyle = "#f5b51b";
  roundRect(box.x + box.width * 0.1, box.y + box.height * 0.45, box.width * 0.75, box.height * 0.28, 6);
  ctx.fill();
  ctx.fillStyle = "#111";
  ctx.fillRect(box.x + box.width * 0.18, box.y + box.height * 0.42, box.width * 0.65, 12);
  ctx.fillStyle = "#f2f4f0";
  ctx.font = "700 16px Arial, sans-serif";
  ctx.fillText("Ładowanie maszyny", box.x + box.width * 0.16, box.y + box.height * 0.83);
}

function drawRepairEffect() {
  if (repairPulse <= 0) {
    return;
  }

  const point = getRepairPoint();
  const alpha = repairPulse / 0.25;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "#f5b51b";
  ctx.lineWidth = 4;
  ctx.setLineDash([8, 7]);
  ctx.beginPath();
  ctx.moveTo(point.x, point.nozzleY);
  ctx.lineTo(point.x, point.y + 18);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "rgba(245, 181, 27, 0.22)";
  ctx.beginPath();
  ctx.ellipse(point.x, point.y, 54 * alpha + 18, 18 * alpha + 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawParticles() {
  for (const particle of particles) {
    const alpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
  }
  ctx.globalAlpha = 1;
}

function drawFloaters() {
  ctx.save();
  ctx.font = "900 22px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const floater of floaters) {
    const alpha = clamp(floater.life / floater.maxLife, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#101114";
    ctx.strokeText(floater.text, floater.x, floater.y);
    ctx.fillStyle = floater.color;
    ctx.fillText(floater.text, floater.x, floater.y);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawHud() {
  const padding = 16;
  const lineHeight = 28;
  const hudWidth = 246;

  ctx.save();
  ctx.fillStyle = "rgba(17, 18, 20, 0.72)";
  roundRect(padding, padding, hudWidth, 96, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
  ctx.stroke();

  ctx.font = "800 18px Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#f2f4f0";
  ctx.fillText(`Wynik: ${score}`, padding + 14, padding + 12);
  ctx.fillStyle = "#f5b51b";
  ctx.fillText(`Najlepszy: ${bestScore}`, padding + 14, padding + 12 + lineHeight);
  ctx.fillStyle = lives > 1 ? "#4fd08a" : "#ff756e";
  ctx.fillText(`Życia: ${lives}`, padding + 14, padding + 12 + lineHeight * 2);

  if (state === "playing") {
    const point = getRepairPoint();
    ctx.strokeStyle = "rgba(245, 181, 27, 0.32)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y - 30);
    ctx.lineTo(point.x, point.y + 28);
    ctx.stroke();
  }
  ctx.restore();
}

function roundRect(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function gameLoop(timestamp) {
  if (!lastTime) {
    lastTime = timestamp;
  }
  const dt = Math.min(0.034, (timestamp - lastTime) / 1000);
  lastTime = timestamp;
  update(dt);
  draw();
  requestAnimationFrame(gameLoop);
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("orientationchange", resizeCanvas);

canvas.addEventListener("pointerdown", handleAction);
startScreen.addEventListener("pointerdown", handleAction);
endScreen.addEventListener("pointerdown", handleAction);

document.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    handleAction(event);
  }
});

startButton.addEventListener("click", (event) => {
  event.stopPropagation();
  resetGame();
});

startButton.addEventListener("pointerdown", (event) => {
  event.stopPropagation();
});

restartButton.addEventListener("click", (event) => {
  event.stopPropagation();
  resetGame();
});

restartButton.addEventListener("pointerdown", (event) => {
  event.stopPropagation();
});

resizeCanvas();
showScreen("start");
requestAnimationFrame(gameLoop);
