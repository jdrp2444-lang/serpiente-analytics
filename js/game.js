(function () {
  "use strict";

  var COLS = 17;
  var BASE_SPEED = 135;   // ms por paso
  var MIN_SPEED = 68;
  var SPEED_STEP = 3;

  var canvas = document.getElementById("cv");
  var ctx = canvas.getContext("2d");

  var scoreEl = document.getElementById("score");
  var bestEl = document.getElementById("best");
  var finalEl = document.getElementById("finalScore");
  var overMsg = document.getElementById("overMsg");

  var startScreen = document.getElementById("startScreen");
  var pauseScreen = document.getElementById("pauseScreen");
  var overScreen = document.getElementById("overScreen");

  var css = getComputedStyle(document.documentElement);
  var C = {
    grid: css.getPropertyValue("--grid").trim() || "rgba(160,175,255,.055)",
    snake: css.getPropertyValue("--snake").trim() || "#6FE3C4",
    head: css.getPropertyValue("--snake-head").trim() || "#B6F7E4",
    food: css.getPropertyValue("--food").trim() || "#FFB454"
  };

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Estado ----------
  var state = "start";          // start | playing | paused | over
  var snake, dir, queue, food, score, best, speed, ghostTail, growing;
  var acc = 0, last = 0, cell = 20;

  best = 0;
  try {
    var saved = localStorage.getItem("serpiente.best");
    if (saved) best = parseInt(saved, 10) || 0;
  } catch (e) { /* almacenamiento no disponible */ }
  bestEl.textContent = best;

  function reset() {
    var mid = Math.floor(COLS / 2);
    snake = [{x: mid, y: mid}, {x: mid - 1, y: mid}, {x: mid - 2, y: mid}];
    dir = {x: 1, y: 0};
    queue = [];
    score = 0;
    speed = BASE_SPEED;
    ghostTail = null;
    growing = false;
    acc = 0;
    scoreEl.textContent = "0";
    placeFood();
  }

  function placeFood() {
    var free = [];
    for (var y = 0; y < COLS; y++) {
      for (var x = 0; x < COLS; x++) {
        var taken = false;
        for (var i = 0; i < snake.length; i++) {
          if (snake[i].x === x && snake[i].y === y) { taken = true; break; }
        }
        if (!taken) free.push({x: x, y: y});
      }
    }
    food = free.length ? free[Math.floor(Math.random() * free.length)] : null;
  }

  // ---------- Lógica ----------
  function step() {
    if (queue.length) {
      var next = queue.shift();
      if (next.x !== -dir.x || next.y !== -dir.y) dir = next;
    }

    var head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};

    if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= COLS) {
      return gameOver("Chocaste contra el muro.");
    }
    // la cola se mueve, así que el último segmento no cuenta salvo que crezca
    var limit = growing ? snake.length : snake.length - 1;
    for (var i = 0; i < limit; i++) {
      if (snake[i].x === head.x && snake[i].y === head.y) {
        return gameOver("Te mordiste la cola.");
      }
    }

    snake.unshift(head);

    if (food && head.x === food.x && head.y === food.y) {
      growing = true;
      ghostTail = null;
      score++;
      scoreEl.textContent = score;
      speed = Math.max(MIN_SPEED, speed - SPEED_STEP);
      placeFood();
      if (!food) return win();
    } else {
      growing = false;
      ghostTail = snake.pop();
    }
  }

  function gameOver(reason) {
    state = "over";
    if (score > best) {
      best = score;
      bestEl.textContent = best;
      try { localStorage.setItem("serpiente.best", String(best)); } catch (e) {}
    }
    finalEl.textContent = score;
    overMsg.textContent = reason + " Récord actual: " + best + ".";
    document.getElementById("overTitle").textContent = "Fin de la partida";
    show(overScreen);
  }

  function win() {
    state = "over";
    if (score > best) {
      best = score;
      bestEl.textContent = best;
      try { localStorage.setItem("serpiente.best", String(best)); } catch (e) {}
    }
    finalEl.textContent = score;
    document.getElementById("overTitle").textContent = "¡Tablero completo!";
    overMsg.textContent = "Llenaste toda la cuadrícula. No queda sitio para más fruta.";
    show(overScreen);
  }

  // ---------- Dibujo ----------
  function resize() {
    var rect = canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var size = Math.max(1, Math.round(rect.width));
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cell = size / COLS;
    draw(0);
  }

  function roundRect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    if (r < 0) r = 0;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function segment(gx, gy, shrink, color) {
    var pad = cell * (0.11 + shrink * 0.32);
    var s = cell - pad * 2;
    if (s <= 0) return;
    ctx.fillStyle = color;
    roundRect(gx * cell + pad, gy * cell + pad, s, s, cell * 0.3);
    ctx.fill();
  }

  function draw(t) {
    var size = COLS * cell;
    ctx.clearRect(0, 0, size, size);

    // cuadrícula
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var i = 1; i < COLS; i++) {
      var p = Math.round(i * cell) + 0.5;
      ctx.moveTo(p, 0); ctx.lineTo(p, size);
      ctx.moveTo(0, p); ctx.lineTo(size, p);
    }
    ctx.stroke();

    // fruta
    if (food) {
      var pulse = reduceMotion ? 0 : Math.sin(performance.now() / 260) * 0.05;
      var r = cell * (0.3 + pulse);
      var cx = food.x * cell + cell / 2;
      var cy = food.y * cell + cell / 2;
      ctx.fillStyle = C.food;
      ctx.globalAlpha = 0.18;
      ctx.beginPath(); ctx.arc(cx, cy, r * 2, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }

    if (!snake) return;

    // cola que se desvanece: da sensación de movimiento continuo
    if (ghostTail && state === "playing") {
      ctx.globalAlpha = Math.max(0, 1 - t);
      segment(ghostTail.x, ghostTail.y, t * 0.5, C.snake);
      ctx.globalAlpha = 1;
    }

    // cuerpo
    for (var j = snake.length - 1; j >= 1; j--) {
      var fade = 0.55 + 0.45 * (1 - j / snake.length);
      ctx.globalAlpha = fade;
      segment(snake[j].x, snake[j].y, 0, C.snake);
    }
    ctx.globalAlpha = 1;

    // cabeza interpolada entre la casilla anterior y la actual
    var h = snake[0];
    var prev = snake[1] || h;
    var k = state === "playing" ? t : 1;
    var hx = prev.x + (h.x - prev.x) * k;
    var hy = prev.y + (h.y - prev.y) * k;
    var pad = cell * 0.08;
    var s = cell - pad * 2;
    ctx.fillStyle = C.head;
    ctx.shadowColor = C.snake;
    ctx.shadowBlur = cell * 0.7;
    roundRect(hx * cell + pad, hy * cell + pad, s, s, cell * 0.34);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // ---------- Bucle ----------
  function loop(now) {
    requestAnimationFrame(loop);
    var dt = Math.min(now - last, 100);
    last = now;

    if (state === "playing") {
      acc += dt;
      while (acc >= speed) {
        acc -= speed;
        step();
        if (state !== "playing") { acc = 0; break; }
      }
    }
    draw(state === "playing" ? acc / speed : 1);
  }

  // ---------- Pantallas ----------
  function show(el) {
    [startScreen, pauseScreen, overScreen].forEach(function (s) {
      s.hidden = (s !== el);
    });
  }

  function hideAll() { show(null); }

  function play() {
    reset();
    state = "playing";
    last = performance.now();
    hideAll();
  }

  function togglePause() {
    if (state === "playing") { state = "paused"; show(pauseScreen); }
    else if (state === "paused") { state = "playing"; last = performance.now(); hideAll(); }
  }

  // ---------- Controles ----------
  var KEYS = {
    ArrowUp: {x: 0, y: -1}, ArrowDown: {x: 0, y: 1},
    ArrowLeft: {x: -1, y: 0}, ArrowRight: {x: 1, y: 0},
    w: {x: 0, y: -1}, s: {x: 0, y: 1}, a: {x: -1, y: 0}, d: {x: 1, y: 0}
  };

  function turn(v) {
    if (state !== "playing" || !v) return;
    var ref = queue.length ? queue[queue.length - 1] : dir;
    if (v.x === -ref.x && v.y === -ref.y) return;
    if (v.x === ref.x && v.y === ref.y) return;
    if (queue.length < 2) queue.push(v);
  }

  document.addEventListener("keydown", function (e) {
    var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;

    if (k === " " || k === "Spacebar") {
      e.preventDefault();
      if (state === "start" || state === "over") play();
      else togglePause();
      return;
    }
    if (k === "Escape" || k === "p") { togglePause(); return; }

    var v = KEYS[k];
    if (v) { e.preventDefault(); turn(v); }
  });

  document.getElementById("startBtn").addEventListener("click", play);
  document.getElementById("againBtn").addEventListener("click", play);
  document.getElementById("resumeBtn").addEventListener("click", togglePause);

  document.getElementById("pad").addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (b) turn(KEYS[{up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight"}[b.dataset.dir]]);
  });

  // deslizar con el dedo
  var sx = 0, sy = 0;
  canvas.addEventListener("touchstart", function (e) {
    sx = e.touches[0].clientX; sy = e.touches[0].clientY;
  }, {passive: true});

  canvas.addEventListener("touchend", function (e) {
    var dx = e.changedTouches[0].clientX - sx;
    var dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) < 22 && Math.abs(dy) < 22) return;
    if (Math.abs(dx) > Math.abs(dy)) turn({x: dx > 0 ? 1 : -1, y: 0});
    else turn({x: 0, y: dy > 0 ? 1 : -1});
  }, {passive: true});

  // ---------- Arranque ----------
  reset();
  state = "start";
  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(function (t) { last = t; loop(t); });
})();
