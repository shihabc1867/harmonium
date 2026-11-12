"use strict";

var NAMES = ["Sa", "Re♭", "Re", "Ga♭",
  "Ga", "Ma", "Ma♯", "Pa", "Dha♭",
  "Dha", "Ni♭", "Ni"];
var WEST = ["C", "C♯", "D", "D♯", "E",
  "F", "F♯", "G", "G♯", "A",
  "A♯", "B"];
var BLACK = [1, 3, 6, 8, 10];
var TOTAL = 37;

var S = {
  scale: 0, oct: 0, vol: 0.7, reed: 2,
  labels: "both", theme: null, drone: false
};

var $ = function (id) {
  return document.getElementById(id);
};
var keysEl = $("keys");
var keyEls = [];
var ctx = null;
var master = null;
var voices = {};
var lit = {};
var act = {};

/* ---------- settings storage ---------- */

function load() {
  try {
    var s = JSON.parse(
      localStorage.getItem("harmo") || "{}");
    for (var k in s) { S[k] = s[k]; }
  } catch (e) {}
  if (!S.theme) {
    var dark = window.matchMedia &&
      matchMedia("(prefers-color-scheme: dark)")
        .matches;
    S.theme = dark ? "dark" : "light";
  }
}

function save() {
  try {
    localStorage.setItem("harmo",
      JSON.stringify(S));
  } catch (e) {}
}

/* ---------- pitch ---------- */

function isBlack(i) {
  return BLACK.indexOf(i % 12) >= 0;
}

function freq(i) {
  var semis = S.scale + i - 12;
  return 261.626 *
    Math.pow(2, semis / 12 + S.oct);
}

/* ---------- audio ---------- */

function initAudio() {
  if (ctx) { return; }
  var AC = window.AudioContext ||
    window.webkitAudioContext;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = S.vol;
  var comp = ctx.createDynamicsCompressor();
  master.connect(comp);
  comp.connect(ctx.destination);
}

function layers() {
  var a = [
    ["sawtooth", 1, 0, 0.5],
    ["square", 1, 7, 0.18]
  ];
  if (S.reed === 2) {
    a.push(["sawtooth", 2, -6, 0.22]);
    a.push(["sawtooth", 0.5, 4, 0.2]);
  }
  return a;
}

function startVoice(vid, f, level) {
  initAudio();
  if (ctx.state !== "running") { ctx.resume(); }
  stopVoice(vid, true);
  var t = ctx.currentTime;
  var g = ctx.createGain();
  var lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 2200;
  lp.Q.value = 0.6;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(level, t + 0.05);
  lp.connect(g);
  g.connect(master);
  var oscs = [];
  layers().forEach(function (L) {
    var o = ctx.createOscillator();
    var og = ctx.createGain();
    o.type = L[0];
    o.frequency.value = f * L[1];
    o.detune.value = L[2];
    og.gain.value = L[3];
    o.connect(og);
    og.connect(lp);
    o.start(t);
    oscs.push(o);
  });
  voices[vid] = { g: g, o: oscs };
}

function stopVoice(vid, quick) {
  var v = voices[vid];
  if (!v) { return; }
  delete voices[vid];
  var t = ctx.currentTime;
  var r = quick ? 0.02 : 0.12;
  v.g.gain.cancelScheduledValues(t);
  v.g.gain.setValueAtTime(v.g.gain.value, t);
  v.g.gain.linearRampToValueAtTime(0, t + r);
  v.o.forEach(function (o) {
    o.stop(t + r + 0.02);
  });
}

function mark(i, d) {
  lit[i] = (lit[i] || 0) + d;
  var el = keyEls[i];
  if (el) {
    el.classList.toggle("down", lit[i] > 0);
  }
}

function noteOn(i, tag) {
  startVoice(tag, freq(i), 0.45);
  mark(i, 1);
}

function noteOff(i, tag) {
  stopVoice(tag, false);
  mark(i, -1);
}

function setDrone() {
  stopVoice("d1", false);
  stopVoice("d2", false);
  if (!S.drone) { return; }
  startVoice("d1", freq(0), 0.14);
  startVoice("d2", freq(7), 0.1);
}

function allOff() {
  for (var v in voices) { stopVoice(v, false); }
  lit = {};
  act = {};
  keyEls.forEach(function (el) {
    el.classList.remove("down");
  });
}

/* glowing hint on keys (used by the tutorial) */
function setHint(list) {
  keyEls.forEach(function (el) {
    el.classList.remove("hint");
  });
  (list || []).forEach(function (i) {
    if (keyEls[i]) {
      keyEls[i].classList.add("hint");
    }
  });
}

/* ---------- keyboard drawing ---------- */

function labelHTML(i) {
  var pc = i % 12;
  var sg = '<b class="sg">' + NAMES[pc] + "</b>";
  var wn = '<i class="wn">' +
    WEST[(S.scale + pc) % 12] + "</i>";
  if (S.labels === "sargam") { return sg; }
  if (S.labels === "western") { return wn; }
  return sg + wn;
}

function refreshLabels() {
  keyEls.forEach(function (el, i) {
    el.innerHTML = '<span class="lab">' +
      labelHTML(i) + "</span>";
  });
}

function build() {
  keysEl.innerHTML = "";
  keyEls = [];
  var whites = 0;
  var i;
  for (i = 0; i < TOTAL; i++) {
    if (!isBlack(i)) { whites++; }
  }
  var w = 100 / whites;
  var bw = w * 0.62;
  var wi = 0;
  for (i = 0; i < TOTAL; i++) {
    var el = document.createElement("div");
    var oct = Math.min(2, Math.floor(i / 12));
    var cls = ["low", "mid", "high"][oct];
    el.dataset.i = i;
    if (isBlack(i)) {
      el.className = "key black " + cls;
      el.style.left = (wi * w - bw / 2) + "%";
      el.style.width = bw + "%";
    } else {
      el.className = "key white " + cls;
      if (i % 12 === 0) {
        el.className += " sa";
      }
      el.style.left = (wi * w) + "%";
      el.style.width = w + "%";
      wi++;
    }
    keyEls.push(el);
    keysEl.appendChild(el);
  }
  refreshLabels();
}

/* ---------- landscape + start screen ---------- */

function isStandalone() {
  var m = window.matchMedia &&
    matchMedia("(display-mode: standalone)")
      .matches;
  return !!(m || navigator.standalone);
}

function tryLock() {
  try {
    screen.orientation.lock("landscape")
      .catch(function () {});
  } catch (e) {}
}

/* In a browser tab, locking works only in
   full screen, so go full screen first. */
function enterLandscape() {
  var d = document.documentElement;
  try {
    if (d.requestFullscreen &&
        !document.fullscreenElement) {
      d.requestFullscreen()
        .then(tryLock, tryLock);
      return;
    }
  } catch (e) {}
  tryLock();
}

$("start-btn").onclick = function () {
  enterLandscape();
  try {
    initAudio();
    ctx.resume();
  } catch (e) {}
  $("start").hidden = true;
};

if (isStandalone()) {
  $("start").hidden = true;
  tryLock();
}

/* ---------- touch / mouse ---------- */

function keyAt(x, y) {
  var el = document.elementFromPoint(x, y);
  if (!el) { return -1; }
  el = el.closest(".key");
  return el ? +el.dataset.i : -1;
}

keysEl.addEventListener("pointerdown",
  function (e) {
    e.preventDefault();
    try { keysEl.setPointerCapture(e.pointerId); }
    catch (x) {}
    var k = keyAt(e.clientX, e.clientY);
    if (k < 0) { return; }
    act[e.pointerId] = k;
    noteOn(k, "p" + e.pointerId);
    tryLock();
    if (window.Harmo && window.Harmo.onPress) {
      window.Harmo.onPress(k);
    }
  });

keysEl.addEventListener("pointermove",
  function (e) {
    var id = e.pointerId;
    if (!(id in act)) { return; }
    var k = keyAt(e.clientX, e.clientY);
    if (k < 0 || k === act[id]) { return; }
    noteOff(act[id], "p" + id);
    act[id] = k;
    noteOn(k, "p" + id);
  });

function up(e) {
  var id = e.pointerId;
  if (!(id in act)) { return; }
  noteOff(act[id], "p" + id);
  delete act[id];
}
keysEl.addEventListener("pointerup", up);
keysEl.addEventListener("pointercancel", up);
keysEl.addEventListener("lostpointercapture", up);
keysEl.addEventListener("contextmenu",
  function (e) { e.preventDefault(); });

document.addEventListener("visibilitychange",
  function () {
    if (document.hidden) {
      allOff();
      stopVoice("d1", true);
      stopVoice("d2", true);
    } else if (S.drone) {
      setDrone();
    }
  });

/* ---------- controls ---------- */

function applyTheme() {
  document.documentElement
    .setAttribute("data-theme", S.theme);
  $("btn-theme").textContent =
    S.theme === "dark" ? "Light" : "Dark";
  var m = document.querySelector(
    'meta[name="theme-color"]');
  if (m) {
    m.setAttribute("content",
      S.theme === "dark" ? "#16120f" : "#f6f0e6");
  }
}

function applyOct() {
  $("oct-val").textContent =
    (S.oct > 0 ? "+" : "") + S.oct;
}

function fillScale() {
  var sel = $("set-scale");
  for (var i = 0; i < 12; i++) {
    var o = document.createElement("option");
    o.value = i;
    o.textContent = WEST[i];
    sel.appendChild(o);
  }
}

function syncForm() {
  $("set-scale").value = S.scale;
  $("set-vol").value = S.vol;
  $("set-reed").value = S.reed;
  $("set-labels").value = S.labels;
  $("set-drone").checked = S.drone;
}

$("btn-theme").onclick = function () {
  S.theme = S.theme === "dark" ? "light" : "dark";
  applyTheme();
  save();
};

$("oct-dn").onclick = function () {
  if (S.oct > -1) { S.oct--; }
  applyOct();
  save();
  if (S.drone) { setDrone(); }
};
$("oct-up").onclick = function () {
  if (S.oct < 1) { S.oct++; }
  applyOct();
  save();
  if (S.drone) { setDrone(); }
};

$("btn-set").onclick = function () {
  $("sheet").hidden = false;
};
$("set-close").onclick = function () {
  $("sheet").hidden = true;
};
$("sheet").addEventListener("click",
  function (e) {
    if (e.target === $("sheet")) {
      $("sheet").hidden = true;
    }
  });

$("set-scale").onchange = function () {
  S.scale = +this.value;
  refreshLabels();
  save();
  if (S.drone) { setDrone(); }
};
$("set-vol").oninput = function () {
  S.vol = +this.value;
  if (master) { master.gain.value = S.vol; }
  save();
};
$("set-reed").onchange = function () {
  S.reed = +this.value;
  save();
};
$("set-labels").onchange = function () {
  S.labels = this.value;
  refreshLabels();
  save();
};
$("set-drone").onchange = function () {
  S.drone = this.checked;
  setDrone();
  save();
};

/* ---------- install + offline ---------- */

var deferred = null;
window.addEventListener("beforeinstallprompt",
  function (e) {
    e.preventDefault();
    deferred = e;
    $("btn-install").hidden = false;
  });
$("btn-install").onclick = function () {
  if (!deferred) { return; }
  deferred.prompt();
  deferred.userChoice.then(function () {
    deferred = null;
    $("btn-install").hidden = true;
  });
};
window.addEventListener("appinstalled",
  function () {
    $("btn-install").hidden = true;
  });

if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js")
      .catch(function () {});
  });
}

/* ---------- start ---------- */

/* Used by the tutorial (Phase 2) and
   the song player (Phase 3). */
window.Harmo = {
  noteOn: noteOn,
  noteOff: noteOff,
  freq: freq,
  setHint: setHint,
  onPress: null,
  viewHooks: [],
  names: NAMES,
  state: S
};

load();
fillScale();
syncForm();
applyTheme();
applyOct();
build();
