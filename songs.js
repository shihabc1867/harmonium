"use strict";

(function () {
  var H = window.Harmo;
  var N = Notation;
  var $ = function (id) {
    return document.getElementById(id);
  };

  var BUILTIN = [
    { id: "b1", builtin: true, bpm: 80,
      title: "Twinkle Twinkle Little Star",
      seq: "S S P P D D P - | m m G G R R S - /" +
        " P P m m G G R - | P P m m G G R - /" +
        " S S P P D D P - | m m G G R R S -" },
    { id: "b2", builtin: true, bpm: 90,
      title: "Mary Had a Little Lamb",
      seq: "G R S R | G G G - | R R R - | G P P - /" +
        " G R S R | G G G G | R R G R | S - - -" },
    { id: "b3", builtin: true, bpm: 90,
      title: "Happy Birthday",
      seq: "S S R S m G - | S S R S P m - /" +
        " S S S' D m G R - | n n D m P m -" }
  ];

  var LET = ["S", "r", "R", "g", "G", "m",
    "M", "P", "d", "D", "n", "N"];

  var Z = { songs: [], bpm: {}, glow: true,
    cur: "b1" };
  var cur = BUILTIN[0];
  var active = false;
  var editing = false;
  var editId = null;
  var recording = false;
  var playing = false;
  var learning = false;
  var items = [];
  var noteK = [];
  var notes = [];
  var pos = 0;
  var timers = [];
  var live = [];
  var uid = 0;

  /* ---------- storage ---------- */

  function loadZ() {
    try {
      var s = JSON.parse(
        localStorage.getItem("harmo-songs") ||
        "{}");
      if (s.songs) { Z.songs = s.songs; }
      if (s.bpm) { Z.bpm = s.bpm; }
      if (s.glow === false) { Z.glow = false; }
      if (s.cur) { Z.cur = s.cur; }
    } catch (e) {}
    cur = find(Z.cur) || BUILTIN[0];
  }

  function saveZ() {
    try {
      localStorage.setItem("harmo-songs",
        JSON.stringify(Z));
    } catch (e) {}
  }

  function all() {
    return BUILTIN.concat(Z.songs);
  }

  function find(id) {
    var a = all();
    for (var k = 0; k < a.length; k++) {
      if (a[k].id === id) { return a[k]; }
    }
    return null;
  }

  function bpmOf(song) {
    return Z.bpm[song.id] || song.bpm || 80;
  }

  function tokenOf(i) {
    var o = Math.floor(i / 12);
    var suf = o === 0 ? "," : o === 2 ? "'" :
      o === 3 ? "''" : "";
    return LET[i % 12] + suf;
  }

  function msg(t) { $("s-msg").textContent = t; }
  function emsg(t) { $("e-msg").textContent = t; }

  /* ---------- note display ---------- */

  function build(seq) {
    var box = $("s-notes");
    box.innerHTML = "";
    items = [];
    var k = -1;
    seq.split(/\s+/).forEach(function (tok) {
      if (!tok) { return; }
      var s = document.createElement("span");
      var it = { el: s, k: -1, base: "nt" };
      if (tok === "|") {
        it.base = "nt bar";
        s.textContent = "|";
      } else if (tok === "/") {
        it.base = "nt brk";
      } else if (tok === "-") {
        it.base = "nt hold";
        s.textContent = "–";
        it.k = k;
      } else if (tok === "_") {
        k++;
        it.base = "nt hold";
        s.textContent = "_";
        it.k = k;
      } else {
        var p = N.parse(tok);
        if (p.length === 1 && !p.bad.length) {
          k++;
          var sh = N.shift(tok);
          it.base = "nt tap" +
            (sh > 0 ? " high" : sh < 0 ? " low" : "");
          s.textContent = N.name(tok);
          it.k = k;
          (function (kk) {
            s.onclick = function () { jump(kk); };
          })(k);
        } else {
          it.base = "nt bad";
          s.textContent = tok;
        }
      }
      s.className = it.base;
      box.appendChild(s);
      items.push(it);
    });
  }

  function reveal(el) {
    var box = $("s-notes");
    if (!el || !el.getBoundingClientRect) {
      return;
    }
    var r = el.getBoundingClientRect();
    var b = box.getBoundingClientRect();
    if (r.bottom > b.bottom) {
      box.scrollTop += r.bottom - b.bottom + 6;
    } else if (r.top < b.top) {
      box.scrollTop -= b.top - r.top + 6;
    }
  }

  /* k = current note index; -1 clears */
  function paint(k) {
    var curEl = null;
    items.forEach(function (it) {
      var st = "";
      if (it.k >= 0 && k >= 0) {
        if (it.k < k) { st = " done"; }
        else if (it.k === k) {
          st = " cur";
          if (!curEl) { curEl = it.el; }
        }
      }
      it.el.className = it.base + st;
    });
    reveal(curEl);
  }

  function showSong() {
    stopPlay();
    stopLearn();
    $("s-title").textContent = cur.title;
    $("s-bpm").textContent = bpmOf(cur);
    $("s-glow").textContent =
      "Glow: " + (Z.glow ? "On" : "Off");
    build(cur.seq);
    msg("");
  }

  function songNotes() {
    var p = N.parse(cur.seq);
    noteK = [];
    notes = [];
    p.forEach(function (n, k) {
      if (n.i >= 0) {
        noteK.push(k);
        notes.push(n);
      }
    });
    return p;
  }

  /* ---------- listen ---------- */

  function stopPlay() {
    timers.forEach(function (t) {
      clearTimeout(t);
    });
    timers = [];
    live.forEach(function (v) {
      H.noteOff(v.i, v.tag);
    });
    live = [];
    if (playing) {
      playing = false;
      $("s-play").textContent = "Listen";
      paint(-1);
    }
  }

  function play() {
    stopLearn();
    var p = songNotes();
    if (!notes.length) {
      msg("This song has no notes.");
      return;
    }
    stopPlay();
    playing = true;
    msg("");
    $("s-play").textContent = "Stop";
    var beat = 60000 / bpmOf(cur);
    var t = 0;
    p.forEach(function (n, k) {
      var tag = "song" + (uid++);
      timers.push(setTimeout(function () {
        paint(k);
        if (n.i >= 0) {
          H.noteOn(n.i, tag);
          live.push({ i: n.i, tag: tag });
        }
      }, t * beat));
      if (n.i >= 0) {
        timers.push(setTimeout(function () {
          H.noteOff(n.i, tag);
          live = live.filter(function (v) {
            return v.tag !== tag;
          });
        }, (t + n.b) * beat - 70));
      }
      t += n.b;
    });
    timers.push(setTimeout(stopPlay,
      t * beat + 150));
  }

  /* ---------- learn ---------- */

  function stopLearn() {
    if (learning) {
      learning = false;
      $("s-learn").textContent = "Learn";
      paint(-1);
    }
    H.setHint([]);
  }

  function refreshLearn() {
    if (pos < notes.length) {
      paint(noteK[pos]);
      H.setHint(Z.glow ? [notes[pos].i] : []);
    }
  }

  function startLearn() {
    stopPlay();
    songNotes();
    if (!notes.length) {
      msg("This song has no notes.");
      return;
    }
    learning = true;
    pos = 0;
    $("s-learn").textContent = "Stop";
    msg("Play the glowing key.");
    if (!Z.glow) { msg("Play the marked swara."); }
    refreshLearn();
  }

  function jump(kk) {
    if (!learning) { return; }
    var j = noteK.indexOf(kk);
    if (j < 0) { return; }
    pos = j;
    msg("");
    refreshLearn();
  }

  function onKey(k) {
    if (!active) { return; }
    if (editing) {
      if (recording) { add(tokenOf(k)); }
      return;
    }
    if (!learning || pos >= notes.length) {
      return;
    }
    if (k === notes[pos].i) {
      pos++;
      msg("");
      if (pos >= notes.length) {
        learning = false;
        $("s-learn").textContent = "Learn";
        H.setHint([]);
        paint(1e9);
        msg("Well done! You played it all.");
      } else {
        refreshLearn();
      }
    } else {
      msg("Not that one. Try again.");
    }
  }

  /* ---------- edit ---------- */

  function setEdit(on) {
    editing = on;
    $("s-view").hidden = on;
    $("s-edit-view").hidden = !on;
    $("s-title").hidden = on;
    $("e-title").hidden = !on;
    $("s-bpmbox").hidden = on;
    $("e-msg").hidden = !on;
    if (!on) { setRec(false); }
  }

  function setRec(on) {
    recording = on;
    $("e-rec").textContent =
      "Record: " + (on ? "On" : "Off");
    $("e-rec").className = on ? "on" : "";
    emsg(on ? "Recording: play the keys." : "");
  }

  function add(tok) {
    var e = $("e-seq");
    var v = e.value;
    if (v && !/\s$/.test(v)) { v += " "; }
    e.value = v + tok +
      (tok === "/" ? "\n" : " ");
    e.scrollTop = e.scrollHeight;
  }

  function startEdit(song) {
    stopPlay();
    stopLearn();
    var mine = song && !song.builtin;
    editId = mine ? song.id : null;
    $("e-title").value = !song ? "" :
      mine ? song.title : song.title + " (copy)";
    $("e-seq").value = song ? song.seq : "";
    $("e-del").hidden = !mine;
    emsg("");
    setEdit(true);
  }

  function saveEdit() {
    var title = $("e-title").value.trim() ||
      "My song";
    var seq = $("e-seq").value.trim();
    var p = N.parse(seq);
    var cnt = p.filter(function (n) {
      return n.i >= 0;
    }).length;
    if (p.bad.length) {
      emsg("Unknown: " + p.bad.slice(0, 4).join(" "));
      return;
    }
    if (!cnt) {
      emsg("Add some notes first.");
      return;
    }
    var song = null;
    if (editId) { song = find(editId); }
    if (song) {
      song.title = title;
      song.seq = seq;
    } else {
      song = { id: "u" + Date.now(), title: title,
        seq: seq, bpm: 80 };
      Z.songs.push(song);
    }
    cur = song;
    Z.cur = song.id;
    saveZ();
    setEdit(false);
    showSong();
  }

  function deleteSong() {
    if (!editId) { return; }
    if (!confirm("Delete this song?")) { return; }
    Z.songs = Z.songs.filter(function (s) {
      return s.id !== editId;
    });
    delete Z.bpm[editId];
    cur = BUILTIN[0];
    Z.cur = cur.id;
    saveZ();
    setEdit(false);
    showSong();
  }

  /* ---------- song list ---------- */

  function heading(box, text) {
    var h = document.createElement("h3");
    h.textContent = text;
    h.className = "sub";
    box.appendChild(h);
  }

  function addBtn(box, song) {
    var b = document.createElement("button");
    b.className = "stage";
    b.textContent = song.title;
    b.onclick = function () {
      cur = song;
      Z.cur = song.id;
      saveZ();
      $("songs-list").hidden = true;
      setEdit(false);
      showSong();
    };
    box.appendChild(b);
  }

  function openList() {
    var box = $("songs-box");
    box.innerHTML = "";
    heading(box, "Built-in");
    BUILTIN.forEach(function (s) {
      addBtn(box, s);
    });
    heading(box, "My songs");
    if (!Z.songs.length) {
      var p = document.createElement("p");
      p.className = "hint-text";
      p.textContent = "No songs yet. Tap New song.";
      box.appendChild(p);
    }
    Z.songs.forEach(function (s) {
      addBtn(box, s);
    });
    $("songs-list").hidden = false;
  }

  /* ---------- wiring ---------- */

  H.viewHooks.push(function (v) {
    active = v === "songs";
    $("song").hidden = !active;
    if (!active) {
      stopPlay();
      stopLearn();
      if (recording) { setRec(false); }
    } else if (!editing) {
      showSong();
    }
  });

  var prev = H.onPress;
  H.onPress = function (k) {
    if (prev) { prev(k); }
    onKey(k);
  };

  $("s-play").onclick = function () {
    if (playing) { stopPlay(); } else { play(); }
  };
  $("s-learn").onclick = function () {
    if (learning) {
      stopLearn();
      msg("");
    } else {
      startLearn();
    }
  };
  $("s-glow").onclick = function () {
    Z.glow = !Z.glow;
    saveZ();
    $("s-glow").textContent =
      "Glow: " + (Z.glow ? "On" : "Off");
    if (learning) { refreshLearn(); }
  };
  $("s-edit").onclick = function () {
    startEdit(cur);
  };
  function bump(d) {
    var b = bpmOf(cur) + d;
    b = Math.max(30, Math.min(200, b));
    Z.bpm[cur.id] = b;
    saveZ();
    $("s-bpm").textContent = b;
  }
  $("s-slow").onclick = function () { bump(-10); };
  $("s-fast").onclick = function () { bump(10); };

  $("s-list").onclick = openList;
  $("songs-close").onclick = function () {
    $("songs-list").hidden = true;
  };
  $("songs-list").addEventListener("click",
    function (e) {
      if (e.target === $("songs-list")) {
        $("songs-list").hidden = true;
      }
    });
  $("songs-new").onclick = function () {
    $("songs-list").hidden = true;
    startEdit(null);
  };

  $("e-rec").onclick = function () {
    setRec(!recording);
  };
  $("e-bar").onclick = function () { add("|"); };
  $("e-hold").onclick = function () { add("-"); };
  $("e-rest").onclick = function () { add("_"); };
  $("e-line").onclick = function () { add("/"); };
  $("e-undo").onclick = function () {
    var e = $("e-seq");
    e.value = e.value.replace(/\s*\S+\s*$/, "");
  };
  $("e-save").onclick = saveEdit;
  $("e-cancel").onclick = function () {
    setEdit(false);
    showSong();
  };
  $("e-del").onclick = deleteSong;
  $("e-seq").addEventListener("input",
    function () { emsg(""); });

  /* for tests */
  window.HarmoSongs = { tokenOf: tokenOf };

  loadZ();
})();
