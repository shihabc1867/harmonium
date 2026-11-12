"use strict";

/* Tutorial stages.
   Step types:
     read : text only
     play : press the notes of "seq" in order
            hint:true  -> next key glows
            strict:true-> a wrong key restarts
     ear  : listen (Hear it), then play back.
            notes are hidden until "Show notes". */
var LESSONS = [
{
  id: "keys",
  title: "1. Meet the keyboard",
  steps: [
    { t: "read", text:
      "A harmonium has white and black keys.\n" +
      "Each key is one swara (note).\n" +
      "Keys with a gold bar are Sa,\n" +
      "your home note." },
    { t: "play", hint: true, seq: "S",
      text: "Press the glowing Sa (middle octave)." },
    { t: "read", text:
      "The keyboard has 3 octaves.\n" +
      "Low (Mandra): dot below the name.\n" +
      "Middle (Madhya): no dot.\n" +
      "High (Tar): dot above the name." },
    { t: "play", hint: true, seq: "S, S S'",
      text: "Press the three Sa keys:\n" +
      "low, middle, high." }
  ]
},
{
  id: "natural",
  title: "2. Natural swaras",
  steps: [
    { t: "read", text:
      "The 7 natural swaras are the white\n" +
      "keys from Sa:\n" +
      "Sa Re Ga Ma Pa Dha Ni,\n" +
      "then high Sa." },
    { t: "play", hint: true, seq: "S R G",
      text: "Play Sa, Re, Ga.\nFollow the glow." },
    { t: "play", hint: true,
      seq: "S R G m P D N S'",
      text: "Now the full scale, going up." },
    { t: "play", hint: false,
      seq: "S R G m P D N S'",
      text: "Again, without the glow." }
  ]
},
{
  id: "updown",
  title: "3. Up and down",
  steps: [
    { t: "read", text:
      "Going up is Aaroh.\n" +
      "Coming down is Avaroh.\n" +
      "Both use the same keys." },
    { t: "play", hint: true,
      seq: "S' N D P m G R S",
      text: "Avaroh: play down from high Sa." },
    { t: "play", hint: false,
      seq: "S R G m P D N S' N D P m G R S",
      text: "Aaroh, then Avaroh.\nNo glow." }
  ]
},
{
  id: "komal",
  title: "4. Komal and Tivra",
  steps: [
    { t: "read", text:
      "Black keys are the in-between swaras.\n" +
      "Komal (flat) Re, Ga, Dha, Ni: the black\n" +
      "key just LEFT of the white key.\n" +
      "Tivra (sharp) Ma: just RIGHT of Ma." },
    { t: "play", hint: true, seq: "r g d n",
      text: "Find the komal keys:\n" +
      "Re, Ga, Dha, Ni (flat)." },
    { t: "play", hint: true, seq: "m M",
      text: "Natural Ma, then Tivra Ma." },
    { t: "play", hint: true,
      seq: "S r G m P d N S'",
      text: "Raga Bhairav scale:\n" +
      "komal Re and komal Dha." },
    { t: "play", hint: false,
      seq: "S R G M P D N S'",
      text: "Raga Yaman scale:\n" +
      "tivra Ma. No glow." }
  ]
},
{
  id: "octaves",
  title: "5. Three octaves",
  steps: [
    { t: "play", hint: true,
      seq: "S, R, G, m, P, D, N, S",
      text: "Low octave (Mandra):\n" +
      "dot below the name." },
    { t: "play", hint: true,
      seq: "S' R' G' m' P' D' N' S''",
      text: "High octave (Tar):\n" +
      "dot above the name." },
    { t: "play", hint: false,
      seq: "S, P, S P S' P' S''",
      text: "Jump across all three octaves.\n" +
      "No glow." }
  ]
},
{
  id: "rhythm",
  title: "6. Hold and rest",
  steps: [
    { t: "read", text:
      "Each swara lasts 1 beat.\n" +
      "A dash ( - ) holds the swara\n" +
      "one more beat.\n" +
      "An underscore ( _ ) is a silent beat." },
    { t: "play", hint: true,
      seq: "S - R - G - R -",
      text: "Tap Hear it, then play S R G R,\n" +
      "holding each for 2 beats.\n" +
      "(Try Rhythm mode in Songs later.)" },
    { t: "play", hint: true,
      seq: "S S _ G G _ P - -",
      text: "Rests are silent.\n" +
      "Pause on every underscore." }
  ]
},
{
  id: "alankar",
  title: "7. Finger patterns",
  steps: [
    { t: "read", text:
      "Alankars are patterns that train\n" +
      "your fingers. Play slowly and evenly." },
    { t: "play", hint: true,
      seq: "S R G R G m G m P",
      text: "Pattern: groups of three,\n" +
      "one step at a time." },
    { t: "play", hint: false,
      seq: "S R G R G m G m P m P D P D N D N S'",
      text: "The full pattern going up.\nNo glow." },
    { t: "play", hint: false,
      seq: "S' N D N D P D P m P m G m G R G R S",
      text: "And coming down." }
  ]
},
{
  id: "reading",
  title: "8. Reading notation",
  steps: [
    { t: "read", text:
      "Songs are written as swaras.\n" +
      "S R G P D N = natural\n" +
      "m = natural Ma, M = tivra Ma\n" +
      "r g d n (small) = komal" },
    { t: "read", text:
      "S' = high octave, S, = low octave\n" +
      "- = hold, _ = rest\n" +
      "Example:  S S P P D D P -" },
    { t: "play", hint: true,
      seq: "S S P P D D P -",
      text: "Read the line, then play it." },
    { t: "play", hint: false,
      seq: "m m G G R R S -",
      text: "Next line. No glow." }
  ]
},
{
  id: "songs",
  title: "9. Your first songs",
  steps: [
    { t: "play", hint: true,
      seq: "S S P P D D P - m m G G R R S -",
      text: "Twinkle Twinkle Little Star\n" +
      "(first two lines)." },
    { t: "play", hint: false,
      seq: "S S P P D D P - m m G G R R S - " +
      "P P m m G G R - P P m m G G R - " +
      "S S P P D D P - m m G G R R S -",
      text: "The whole song. No glow." },
    { t: "play", hint: false,
      seq: "G R S R G G G - R R R - G P P - " +
      "G R S R G G G G R R G R S - - -",
      text: "Mary Had a Little Lamb.\n" +
      "Read it and play." }
  ]
},
{
  id: "ear",
  title: "10. Play by ear",
  steps: [
    { t: "read", text:
      "To play any song you hear, find its\n" +
      "swaras by ear. Practise now:\n" +
      "listen, then play it back.\n" +
      "No glow, no names." },
    { t: "ear", bpm: 70, seq: "S R G R S",
      text: "Tap Hear it. Play what you hear." },
    { t: "ear", bpm: 70, seq: "G P D P G",
      text: "Another one. Listen closely." },
    { t: "ear", bpm: 70,
      seq: "G G P D P G R S -",
      text: "A longer one." },
    { t: "read", text:
      "Well done! You finished the tutorial.\n" +
      "Next: the Songs section (coming soon)\n" +
      "lets you enter any song and learn it." }
  ]
}
];
