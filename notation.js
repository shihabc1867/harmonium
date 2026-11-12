"use strict";

/* Song notation parser (no DOM needed).
   S R G m P D N = natural swaras
   r g d n       = komal (black key, left)
   m = natural Ma, M = tivra Ma (black key)
   S' = high octave, S, = low octave
   -  = hold one more beat, _ = rest
   Key index: 0..36 (12 = middle Sa).   */
var Notation = (function () {
  var PC = {
    S: 0, r: 1, R: 2, g: 3, G: 4, m: 5,
    M: 6, P: 7, d: 8, D: 9, n: 10, N: 11
  };
  var NAME = {
    S: "Sa", r: "Re♭", R: "Re",
    g: "Ga♭", G: "Ga", m: "Ma",
    M: "Ma♯", P: "Pa", d: "Dha♭",
    D: "Dha", n: "Ni♭", N: "Ni"
  };

  /* net octave shift: +1 per ', -1 per , */
  function shift(tok) {
    var s = 0;
    for (var k = 1; k < tok.length; k++) {
      if (tok.charAt(k) === "'") { s++; }
      else if (tok.charAt(k) === ",") { s--; }
    }
    return s;
  }

  function parse(str) {
    var out = [];
    out.bad = [];
    var toks = String(str).trim().split(/\s+/);
    toks.forEach(function (tok) {
      if (!tok) { return; }
      if (tok === "|" || tok === "/") { return; }
      if (tok === "-") {
        if (out.length) { out[out.length - 1].b++; }
        return;
      }
      if (tok === "_") {
        out.push({ i: -1, b: 1, tok: tok });
        return;
      }
      var ch = tok.charAt(0);
      if (!PC.hasOwnProperty(ch) ||
          !/^.['",]*$/.test(tok)) {
        out.bad.push(tok);
        return;
      }
      var idx = PC[ch] + 12 * (1 + shift(tok));
      if (idx < 0 || idx > 36) {
        out.bad.push(tok);
        return;
      }
      out.push({ i: idx, b: 1, tok: tok });
    });
    return out;
  }

  return {
    parse: parse,
    shift: shift,
    name: function (tok) {
      return NAME[tok.charAt(0)] || tok;
    }
  };
})();
