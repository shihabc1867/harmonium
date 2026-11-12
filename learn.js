"use strict";

(function () {
  var H = window.Harmo;
  var N = Notation;
  var $ = function (id) {
    return document.getElementById(id);
  };
  var tabs = document.querySelectorAll(
    ".tab[data-view]");

  var P = { done: [], li: 0, si: 0 };
  var view = "play";
  var notes = [];
  var pos = 0;
  var finished = true;
  var wrongs = 0;
  var reveal = false;
  var timers = [];
  var live = [];
  var uid = 0;

  /* ---------- saved progress ---------- */

  function loadP() {
    try {
      var s = JSON.parse(
        localStorage.getItem("harmo-learn") ||
        "{}");
      if (s.done) { P.done = s.done; }
      if (s.li >= 0 && s.li < LESSONS.length) {
        P.li = s.li;
      }
      if (s.si >= 0) { P.si = s.si; }
    } catch (e) {}
    if (P.si >= LESSONS[P.li].steps.length) {
      P.si = 0;
    }
  }

  function saveP() {
    try {
      localStorage.setItem("harmo-learn",
        JSON.stringify(P));
    } catch (e) {}
  }

  function unlocked(i) {
    return i === 0 ||
      P.done.indexOf(LESSONS[i - 1].id) >= 0;
  }

  /* ---------- demo playback ---------- */

  function stopDemo() {
    timers.forEach(function (t) {
      clearTimeout(t);
    });
    timers = [];
    live.forEach(function (v) {
      H.noteOff(v.i, v.tag);
    });
    live = [];
  }

  function demo(seq, bpm) {
    stopDemo();
    var beat = 60000 / bpm;
    var t = 0;
    N.parse(seq).forEach(function (n) {
      if (n.i >= 0) {
        var tag = "demo" + (uid++);
        var on = t * beat;
        var off = (t + n.b) * beat - 70;
        timers.push(setTimeout(function () {
          H.noteOn(n.i, tag);
          live.push({ i: n.i, tag: tag });
        }, on));
        timers.push(setTimeout(function () {
          H.noteOff(n.i, tag);
          live = live.filter(function (v) {
            return v.tag !== tag;
          });
        }, off));
      }
      t += n.b;
    });
  }

  /* ---------- screen ---------- */

  function curStep() {
    return LESSONS[P.li].steps[P.si];
  }

  function msg(text) {
    $("l-msg").textContent = text;
  }

  function updateHint() {
    var step = curStep();
    if (view === "learn" && step.hint &&
        !finished && pos < notes.length) {
      H.setHint([notes[pos].i]);
    } else {
      H.setHint([]);
    }
  }

  function renderNotes() {
    var step = curStep();
    var box = $("l-notes");
    box.innerHTML = "";
    if (!step.seq) { return; }
    if (step.t === "ear" && !reveal) {
      var q = [];
      for (var k = 0; k < notes.length; k++) {
        q.push(k < pos ? "✓" : "?");
      }
      box.textContent = q.join(" ");
      return;
    }
    var n = 0;
    step.seq.split(/\s+/).forEach(function (tok) {
      var s = document.createElement("span");
      if (tok === "-" || tok === "_") {
        s.className = "nt hold";
        s.textContent =
          tok === "-" ? "–" : "_";
      } else {
        var sh = N.shift(tok);
        s.className = "nt" +
          (sh > 0 ? " high" : sh < 0 ? " low" : "");
        s.textContent = N.name(tok);
        if (n < pos) {
          s.className += " done";
        } else if (n === pos && !finished) {
          s.className += " cur";
        }
        n++;
      }
      box.appendChild(s);
    });
  }

  function enterStep() {
    stopDemo();
    var lesson = LESSONS[P.li];
    var step = curStep();
    var last = P.si === lesson.steps.length - 1;
    pos = 0;
    wrongs = 0;
    reveal = false;
    finished = step.t === "read";
    notes = step.seq ?
      N.parse(step.seq).filter(function (n) {
        return n.i >= 0;
      }) : [];
    $("l-title").textContent = lesson.title;
    $("l-step").textContent = "Step " +
      (P.si + 1) + " of " + lesson.steps.length;
    $("l-text").textContent = step.text;
    msg("");
    $("l-hear").hidden = !step.seq;
    $("l-show").hidden = true;
    $("l-back").disabled = P.si === 0;
    $("l-next").textContent =
      last ? "Finish stage" : "Next";
    $("l-next").disabled = !finished;
    renderNotes();
    updateHint();
    saveP();
  }

  function setView(v) {
    view = v;
    $("lesson").hidden = v !== "learn";
    for (var k = 0; k < tabs.length; k++) {
      tabs[k].classList.toggle("on",
        tabs[k].dataset.view === v);
    }
    stopDemo();
    H.setHint([]);
    if (v === "learn") { enterStep(); }
  }

  function openList() {
    var box = $("stage-list");
    box.innerHTML = "";
    LESSONS.forEach(function (L, i) {
      var b = document.createElement("button");
      var done = P.done.indexOf(L.id) >= 0;
      var ok = unlocked(i);
      b.className = "stage";
      b.disabled = !ok;
      b.textContent = L.title +
        (done ? "  (done)" : ok ? "" : "  (locked)");
      b.onclick = function () {
        P.li = i;
        P.si = 0;
        $("stages").hidden = true;
        setView("learn");
      };
      box.appendChild(b);
    });
    $("stages").hidden = false;
  }

  function next() {
    var lesson = LESSONS[P.li];
    if (P.si < lesson.steps.length - 1) {
      P.si++;
      enterStep();
      return;
    }
    if (P.done.indexOf(lesson.id) < 0) {
      P.done.push(lesson.id);
    }
    if (P.li < LESSONS.length - 1) {
      P.li++;
      P.si = 0;
      enterStep();
    } else {
      P.si = 0;
      saveP();
      openList();
    }
  }

  /* ---------- key presses from the keyboard ---------- */

  H.onPress = function (k) {
    if (view !== "learn" || finished) { return; }
    if (!notes.length) { return; }
    var step = curStep();
    if (k === notes[pos].i) {
      pos++;
      msg("");
      if (pos >= notes.length) {
        finished = true;
        msg("Well done!");
        $("l-next").disabled = false;
      }
    } else {
      wrongs++;
      if (step.strict) { pos = 0; }
      msg(step.strict ?
        "Not that one. Start again." :
        "Not that one. Try again.");
      if (step.t === "ear" && wrongs >= 3) {
        $("l-show").hidden = false;
      }
    }
    renderNotes();
    updateHint();
  };

  /* ---------- buttons ---------- */

  for (var i = 0; i < tabs.length; i++) {
    (function (t) {
      t.onclick = function () {
        setView(t.dataset.view);
      };
    })(tabs[i]);
  }

  $("l-next").onclick = next;
  $("l-back").onclick = function () {
    if (P.si > 0) {
      P.si--;
      enterStep();
    }
  };
  $("l-hear").onclick = function () {
    var step = curStep();
    if (step.seq) { demo(step.seq, step.bpm || 80); }
  };
  $("l-show").onclick = function () {
    reveal = true;
    $("l-show").hidden = true;
    renderNotes();
  };
  $("l-list").onclick = openList;
  $("stages-close").onclick = function () {
    $("stages").hidden = true;
  };
  $("stages").addEventListener("click",
    function (e) {
      if (e.target === $("stages")) {
        $("stages").hidden = true;
      }
    });
  $("stages-reset").onclick = function () {
    if (!confirm("Reset all tutorial progress?")) {
      return;
    }
    P = { done: [], li: 0, si: 0 };
    saveP();
    $("stages").hidden = true;
    setView("learn");
  };

  loadP();
})();
