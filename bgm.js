/* bgm.js — procedural chiptune BGM engine + score for ぴょんぴーの大冒険.
 *
 * WebAudio only (oscillators + one cached noise buffer). Defines exactly one global: window.Bgm.
 * Audio is obtained lazily through game.js globals getAudioContext() / audioOut().
 *
 * Score format (parsed once per track on first use):
 *   lead   : "D5 G5 B5:3 -:2 ~:4 | ..."  NOTE[:len] in 16th steps (default len = track.L or 2),
 *            "-" = rest, "~" = tie (extends previous note), "|" = bar line (bar length is validated).
 *   chords : one token per bar ("G Em7 C/E"), "Am,D" splits a bar evenly. Qualities: see QUAL.
 *   arp    : one char per step, bars separated by "|" and cycled. 0-9 = n-th chord tone above v.arp.lo,
 *            "c" = 3-note chord stab, "-" = hold, "." = rest.
 *   bass   : same layout. 1 = root (or slash bass), 3/5/7 = chord degrees above it, 8 = octave.
 *   drums  : one kit letter per bar (cycled, "-" = silent bar); kit entries are step layers joined by "/".
 *            k kick, s snare, h closed hat, o open hat, c crash, t tom.
 *   sections may inherit with { base: "A", ... } and transpose their lead with { shift: 12 };
 *   track.tr transposes lead + chords together (used to re-key the main theme).
 */
(function () {
  "use strict";

  const TICK_MS = 25;        // scheduler interval
  const LOOKAHEAD = 0.14;    // seconds scheduled ahead of ctx.currentTime
  const START_DELAY = 0.06;  // first note offset when a track starts / resyncs
  const DUCK_LEVEL = 0.35;   // Bgm.duck(true) music level
  const JINGLE_DUCK = 0.3;   // music level while a jingle plays (~70% reduction)
  const JINGLE_TAIL = 0.25;

  // ------------------------------------------------------------------ score

  // Main theme ("Pyonpy's hop"), written in G major. Reused by world0 / ending / credits via `tr`.
  const MAIN_A =
    "D5 G5 B5:3 A5:3 G5 D5:4 | E5 G5 C6:3 B5:3 A5 G5:4 | B5 B5:1 B5:1 A5 G5 A5 B5 G5:4 | A5:6 F#5 D5:4 - D5 |" +
    "E5 G5 B5:3 A5:3 G5 E5:4 | E5 G5 C6:3 D6:3 C6 B5:4 | A5 C6 B5 A5 F#5 A5 D6:4 | B5:3 A5:1 G5:8 -:4";
  const MAIN_A_CH = "G C G D Em C Am,D G";
  const MAIN_B =
    "E5:4 G5:4 C6:6 B5 | A5:4 D6:4 C6 B5 A5:4 | B5:6 A5 F#5:4 D5:4 | G5:6 F#5 E5:6 - |" +
    "E5 G5 C6:4 E6:4 D6 C6 | D6:6 C6 B5 A5 F#5 A5 | C6:3 A5:3 C6 B5:3 A5:3 G5 | A5:6 F#5 D5 E5 F#5 A5";
  const MAIN_B_CH = "C D Bm Em C D Am D";
  const MAIN_C =
    "C6:3 C6:3 E6 D6 C6 G5:4 | D6:3 D6:3 F#6 E6 D6 A5:4 | E6:3 D6:3 B5 G5 B5 E6:4 | D6:3 B5:3 F#5 B5:4 -:4 |" +
    "C6:3 C6:3 E6 D6 C6 G5:4 | D6:3 D6:3 F#6 E6 D6 C6 A5 | D5 G5 B5 D6 B5 G5 B5:4 | G5:8 -:4 D5 D5";
  const MAIN_C_CH = "C D Em Bm C D G G";

  const TRACKS = {
    // ---- Title: dreamy F-major reading of the main motif --------------------
    title: {
      bpm: 104, echo: 0.32, form: "A B",
      v: { lead: { w: "triangle", g: 0.05, gate: 0.92 }, arp: { w: "sine", g: 0.022, gate: 0.8, cut: 4000 } },
      kit: { a: "k.........k...../....h.......h...", b: "k.........k...../........s......./..h...h...h...h." },
      sec: {
        A: {
          lead: "C5 F5 A5:3 G5:3 F5 C5:4 | D5 F5 Bb5:3 A5:3 G5 F5:4 | A5:4 G5 F5 G5 A5 F5:4 | G5:6 E5 C5:8 |" +
                "D5 F5 A5:3 G5:3 F5 D5:4 | D5 F5 Bb5:3 C6:3 Bb5 A5:4 | G5 Bb5 A5 G5 E5 G5 C6:4 | A5:3 G5:1 F5:12",
          chords: "FM7 BbM7 FM7 C Dm7 BbM7 Gm7,C7 F",
          arp: "0.1.2.3.2.1.2.1.", bass: "1-----..5-..1-..", drums: "a"
        },
        B: {
          lead: "D5:4 F5:4 A5:6 Bb5 | G5:6 E5 G5:4 C6:4 | C6:4 A5:4 E5:4 G5:4 | F5:6 E5 D5:8 |" +
                "- G5 Bb5 D6 C6:4 Bb5:4 | A5 G5 E5 G5 Bb5:4 G5:4 | A5:6 F5 C5:4 F5:4 | G5:8 -:8",
          chords: "BbM7 C Am7 Dm7 Gm7 C7 FM7 C7",
          arp: "0.2.1.2.3.2.1.2.", bass: "1-----..1-..5-..", drums: "bbbbbbba"
        }
      }
    },

    // ---- World map: light pizzicato travel tune in D ------------------------
    map: {
      bpm: 112, echo: 0.15, form: "A B",
      v: { lead: { w: "square", g: 0.028, gate: 0.6, cut: 2600, vib: 0 }, arp: { w: "triangle", g: 0.03, gate: 0.5 } },
      kit: { a: "k.......k......./....s.......s.../..h...h...h...h.", b: "k.......k.....k./....s.......s.s./..h...h...h...h." },
      sec: {
        A: {
          lead: "D5 F#5 A5:4 F#5 A5 D6:4 | C#6 B5 A5:4 F#5:4 -:4 | G5 B5 D6:4 B5 D6 E6:4 | C#6:4 A5:4 E5:4 -:4 |" +
                "D5 F#5 A5:4 F#5 A5 D6:4 | D6 C#6 B5:4 F#5:4 B5:4 | G5 B5 A5 G5 E5 A5 C#6:4 | D6:8 -:8",
          chords: "D D G A D Bm G,A D",
          arp: "0..1..2.0..1..2.", bass: "1...5...1...5.5.", drums: "aaab"
        },
        B: {
          lead: "B5:6 A5 G5:4 D5:4 | A5:6 G5 F#5:4 D5:4 | G5:6 F#5 E5:4 G5:4 | E5:4 A5:4 C#6:6 - |" +
                "B5 D6 B5 G5 B5:4 A5 G5 | A5 D6 A5 F#5 A5:4 G5 F#5 | E5 G5 B5:4 A5 C#6 E6:4 | D6:6 A5 F#5:4 -:4",
          chords: "G D/F# Em A G D/F# Em,A D",
          arp: "0.1.2.1.0.1.2.1.", bass: "1.....5.1.....5.", drums: "aaab"
        }
      }
    },

    // ---- World 0: Moon Candy Field — the main theme, G major ----------------
    world0: {
      bpm: 126, form: "A A2 B A2",
      v: { lead: { w: "p25", g: 0.038 }, arp: { w: "square", g: 0.014, gate: 0.5 } },
      kit: {
        a: "k...s...k.k.s.../h.h.h.h.h.h.h.h.", b: "k...s...k.k.s.ss/h.h.h.h.h.h.o...",
        c: "k.k.s...k.k.s.../..o...o...o...o.", d: "k.k.s...k.s.ssss/..o...o........."
      },
      sec: {
        A: { lead: MAIN_A, chords: MAIN_A_CH, arp: "..c...c...c...c.", bass: "1...5...1...5.8.", drums: "aaab" },
        A2: { base: "A", arp: "0.2.1.2.3.2.1.2.", bass: "1.8.5.8.1.8.5.8." },
        B: { lead: MAIN_B, chords: MAIN_B_CH, arp: "0.1.2.3.2.1.2.1.", bass: "1..1..5.1..1..5.", drums: "cccccccd" }
      }
    },

    // ---- World 1: Mars Neon Colony — E dorian funk --------------------------
    world1: {
      bpm: 138, form: "A A2 B A2",
      v: {
        lead: { w: "p25", g: 0.036, gate: 0.8 }, arp: { w: "square", g: 0.013, gate: 0.4 },
        bass: { w: "p25", g: 0.03, gate: 0.6, cut: 650 }
      },
      kit: {
        a: "k..ks..k.k..s.k./h.hhh.hhh.hhh.hh", b: "k..ks..k.k..ssss/h.hhh.hhh.o.....",
        c: "k...s...k.k.s.../..o...o...o...o.", d: "k...s...k.s.ssss/..o...o........."
      },
      sec: {
        A: {
          lead: "E5 G5:1 A5:1 B5 -:1 B5:1 D6 B5 A5 G5 | A5:3 C#6:3 E6 - E6:1 D6:1 C#6 A5 |" +
                "E5 G5:1 A5:1 B5 -:1 B5:1 D6 E6 D6 B5 | C#6:3 A5:3 G5 E5:4 -:4 |" +
                "C6 C6:1 C6:1 - G5 C6 E6 D6 C6 | D6 D6:1 D6:1 - A5 D6 F#6 E6 D6 |" +
                "E6:3 D6:3 B5 G5:3 A5:3 B5 | B5 -:1 B5:1 A5 F#5 D#5 F#5 B5 -",
          chords: "Em7 A7 Em7 A7 C D Em B7",
          arp: "c..c..c...c.c...", bass: "1..1..8.1.1..7.8", drums: "aaab"
        },
        A2: { base: "A", arp: "0.20.20.1.20.20.", bass: "1.1.8.1.1.1.7.8." },
        B: {
          lead: "G5:6 E5 G5:4 C6:4 | A5:6 F#5 A5:4 D6:4 | B5:10 A5 G5 E5 | G5:3 A5:3 B5 - E5 G5 B5 |" +
                "C6:6 G5 C6:4 E6:4 | D6:6 A5 D6:4 F#6:4 | F#6:4 D#6:4 B5:4 A5:4 | F#5 A5 B5 D#6 F#6 D#6 B5 -",
          chords: "C D Em Em C D B7 B7",
          arp: "0.1.2.1.3.1.2.1.", bass: "1.1.1.8.1.1.5.8.", drums: "cccccccd"
        }
      }
    },

    // ---- World 2: Crystal Ice Planet — D lydian glass arpeggios -------------
    world2: {
      bpm: 116, echo: 0.36, form: "A A2 B A2",
      v: {
        lead: { w: "triangle", g: 0.05, gate: 0.92 },
        arp: { w: "sine", g: 0.024, gate: 0.7, lo: 64, cut: 5200 }, bass: { gate: 0.9 }
      },
      kit: { a: "k.........k...../....s.......s.../..h...h...h...hh", b: "k.........k...../....s.......s.s./..h...h...o....." },
      sec: {
        A: {
          lead: "F#5:6 A5 C#6:8 | B5:6 G#5 E5:8 | F#5:4 A5 C#6 E6:6 D6 | B5:8 - G#5 B5 E6 |" +
                "D6:6 B5 F#5:4 A5:4 | E6:6 C#6 G#5:4 B5:4 | A5 C#6 F#6:4 E6 C#6 A5:4 | G#5:4 B5:4 E6:6 -",
          chords: "DM7 E/D DM7 E/D Bm7 C#m7 DM7 E",
          arp: "0.2.3.2.4.2.3.2.", bass: "1-------1---5---", drums: "aaab"
        },
        A2: { base: "A", arp: "0123432101234321", bass: "1..1..1...1.5..." },
        B: {
          lead: "C#6:3 B5:3 A5 F#5:4 A5:4 | B5:3 A5:3 G#5 E5:4 G#5:4 | A5:3 G#5:3 F#5 D5:4 F#5:4 | E5 A5 C#6:4 G#5:8 |" +
                "D6:3 C#6:3 B5 F#5:4 B5:4 | E6:3 D6:3 C#6 G#5:4 C#6:4 | F#6:4 E6 C#6 A5:4 C#6:4 | B5:6 G#5 E5:4 -:4",
          chords: "F#m7 E DM7 AM7 Bm7 C#m7 DM7 E",
          arp: "0.1.2.3.4.3.2.1.", bass: "1-----1-5---8---", drums: "aaab"
        }
      }
    },

    // ---- World 3: Star Ocean — slow Eb waltz (3/4, 12 steps per bar) --------
    world3: {
      bpm: 92, bar: 12, L: 4, echo: 0.34, form: "A A2 B A2",
      v: {
        lead: { w: "sine", g: 0.055, gate: 0.95 }, arp: { w: "triangle", g: 0.022, gate: 0.8, lo: 58 },
        bass: { g: 0.05, gate: 0.95 }
      },
      kit: { a: "k.........../....h...h...", b: "k.........../....h...h.h." },
      sec: {
        A: {
          lead: "G5:8 Bb5 | Eb6:8 D6 | C6:12 | Bb5 F5 Ab5 | G5:8 Bb5 | Eb6:8 G6 | F6 Eb6 C6 | D6:10 -:2",
          chords: "EbM7 Cm7 AbM7 Bb7 EbM7 Cm7 Fm7 Bb",
          arp: "0.1.2.3.2.1.", bass: "1---------..", drums: "aaab"
        },
        A2: {
          base: "A",
          lead: "G5:6 F5:2 G5:2 Bb5:2 | Eb6:6 D6:2 C6:2 D6:2 | C6:8 Ab5:2 C6:2 | Bb5 F5 Ab5:2 Bb5:2 |" +
                "G5:6 F5:2 G5:2 Bb5:2 | Eb6:6 F6:2 G6 | F6:2 Eb6:2 C6:2 Ab5:2 C6:2 Eb6:2 | D6:8 Bb5"
        },
        B: {
          lead: "C6 Eb6 G6 | F6:8 D6 | Bb5 D6 F6 | Eb6:8 C6 | Ab5 C6 Eb6 | D6:6 C6:2 Bb5:2 Ab5:2 | G5:8 Bb5 | F5:6 Bb5:6",
          chords: "AbM7 Bb Gm7 Cm7 Fm7 Bb7 EbM7 Bb",
          arp: "0.2.1.3.1.2.", bass: "1-----..5-..", drums: "aaab"
        }
      }
    },

    // ---- World 4: Ring Mecha Factory — staccato C-minor machinery -----------
    world4: {
      bpm: 132, L: 1, echo: 0.12, form: "A A2 B A2",
      v: {
        lead: { w: "square", g: 0.026, gate: 0.55, cut: 2800, vib: 0 },
        arp: { w: "square", g: 0.012, gate: 0.4 }, bass: { w: "p25", g: 0.028, gate: 0.5, cut: 700 }
      },
      kit: {
        a: "k.k.s..kk.k.s.../h.hhh.hhh.hhh.hh", b: "k.k.s..kk.s.s.ss/h.hhh.hho.......",
        c: "k..k..k.s..k..k./..o...o...o...o.", d: "k..k..k.s.s.ssss/..o...o........."
      },
      sec: {
        A: {
          lead: "C5 C5 - Eb5 - G5 -:2 C5 C5 - Eb5 - G5:2 - | Bb5 Bb5 - G5 - Eb5 -:2 F5 F5 - G5 - Eb5:2 - |" +
                "C5 C5 - Eb5 - Ab5 -:2 C5 C5 - Eb5 - Ab5:2 - | D5 D5 - F5 - Bb5 -:2 D6:2 Bb5:2 F5:2 D5:2 |" +
                "C6 C6 - G5 - Eb5 -:2 C6 C6 - G5 - Eb5:2 - | D6 D6 - Bb5 - G5 -:2 Eb6:2 D6:2 C6:2 Bb5:2 |" +
                "Ab5:3 C6:3 Eb6:2 -:2 Eb6 D6 C6:2 Ab5:2 | G5:2 B5:2 D6:2 G6:2 -:2 G5 G5 G5:2 -:2",
          chords: "Cm Cm Ab Bb Cm Cm7 Ab G",
          arp: "0.01.12.0.01.12.", bass: "1.1.8.1.1.8.1.5.", drums: "aaab"
        },
        A2: { base: "A", arp: "..c..c....c..c..", bass: "11.811.811.81.8." },
        B: {
          lead: "F5:3 Ab5:3 C6:2 F6:4 Eb6:2 C6:2 | Eb6:3 C6:3 Ab5:2 F5:4 -:4 |" +
                "Eb5:3 G5:3 C6:2 Eb6:4 D6:2 C6:2 | D6:3 C6:3 G5:2 Eb5:4 -:4 |" +
                "Ab5:2 C6:2 Eb6:4 C6:2 Eb6:2 F6:4 | Bb5:2 D6:2 F6:4 D6:2 F6:2 G6:4 |" +
                "G6:4 F6:2 D6:2 B5:4 G5:4 | B5 B5 - D6 - G5 -:2 B5 B5 - D6 - G6:2 -",
          chords: "Fm Fm Cm Cm Ab Bb G G",
          arp: "0.2.1.2.0.2.1.2.", bass: "1..1..1.1..1..5.", drums: "cccccccd"
        }
      }
    },

    // ---- World 5: Demon Star Citadel — D harmonic minor march ---------------
    world5: {
      bpm: 120, form: "A A2 B A2",
      v: { lead: { w: "p25", g: 0.036 }, arp: { w: "square", g: 0.013, gate: 0.5, lo: 53 } },
      kit: {
        a: "k...s...kk..s.../h.h.h.h.h.h.h.h.", b: "k...s...kk..s.ss/h.h.h.h.h.h.o...",
        c: "k.k.s...k.k.s.../h.hhh.hhh.hhh.hh", d: "k.k.s...s.s.ssss/h.hhh.hho......."
      },
      sec: {
        A: {
          lead: "D5:3 F5:3 A5 D6:4 C#6 D6 | E6:3 D6:3 A5 F5:4 - A5 | Bb5:3 D6:3 F6 E6:4 D6 Bb5 | A5:4 C#6:4 E6:6 - |" +
                "D5:3 F5:3 A5 D6:4 C#6 D6 | F6:3 E6:3 D6 A5:4 - D6 | Bb5 D6 G6:4 F6 E6 D6 Bb5 | C#6:4 E6 C#6 A5:6 -",
          chords: "Dm Dm Bb A Dm Dm Gm A",
          arp: "0.2.1.2.0.2.1.2.", bass: "1.1.1.1.1.1.1.8.", drums: "aaab"
        },
        A2: { base: "A", arp: "0120.120.120.120", bass: "1.1.8.1.1.1.8.5." },
        B: { // bars 1-2 quote the hop motif's rhythm in the dark
          lead: "F5 Bb5 D6:3 C6:3 Bb5 F5:4 | G5 C6 E6:3 D6:3 C6 G5:4 | A5 D6 F6:6 E6 D6:4 | A5:8 -:4 D5 F5 |" +
                "Bb5:3 A5:3 Bb5 D6:4 F6:4 | C6:3 Bb5:3 C6 E6:4 G6:4 | E6:6 C#6 A5:4 C#6:4 | E6 C#6 A5 E5 A5 C#6 E6 -",
          chords: "Bb C Dm Dm Bb C A A",
          arp: "0.1.2.3.2.1.2.1.", bass: "1..1..1.1..1..5.", drums: "cccccccd"
        }
      }
    },

    // ---- Boss: urgent A-minor battle ----------------------------------------
    boss: {
      bpm: 156, echo: 0.16, form: "A A2 B",
      v: {
        lead: { w: "p25", g: 0.038, gate: 0.85 }, arp: { w: "square", g: 0.012, gate: 0.45 },
        bass: { w: "p25", g: 0.03, gate: 0.6, cut: 700 }
      },
      kit: {
        a: "k..ks..kk.k.s.../h.h.h.h.h.h.h.h.", b: "k..ks..kk.s.ssss/h.h.h.h.o.......",
        c: "k.k.s.k.k.k.s.k./..o...o...o...o.", d: "k.k.s.k.s.s.ssss/..o...o........."
      },
      sec: {
        A: {
          lead: "A5:3 A5:3 C6 B5 A5 E5:4 | A5:3 A5:3 C6 E6 D6 C6 B5 | C6:3 C6:3 F6 E6 C6 A5:4 | D6:3 D6:3 G6 F6 D6 B5 G5 |" +
                "A5:3 A5:3 C6 B5 A5 E5:4 | A5:3 A5:3 C6 E6 F6 E6 D6 | C6 A5 F5 A5 C6 F6 E6 C6 | B5 G#5 E5 G#5 B5 D6 E6:4",
          chords: "Am Am F G Am Am F E",
          arp: "0121012101210121", bass: "1.1.8.1.1.1.8.1.", drums: "aaab"
        },
        A2: { base: "A", arp: "c..c..c.c..c..c.", bass: "1.111.111.111.11" },
        B: {
          lead: "A5:6 C6 F6:8 | B5:6 D6 G6:8 | E6:4 B5 G5 B5 E6 G6:4 | E6:6 C6 A5:8 |" +
                "F6:3 E6:3 C6 A5:3 C6:3 F6 | G6:3 F6:3 D6 B5:3 D6:3 G6 | E6:4 G#5 B5 E6 D6 C6 B5 | G#5 B5 E6 G#5 B5 E6 G#6 -",
          chords: "F G Em Am F G E E",
          arp: "0.2.1.2.3.2.1.2.", bass: "1.1.1.1.1.1.5.8.", drums: "cccccccd"
        }
      }
    },

    // ---- Final boss: G minor drama; B lifts to Bb major with the main motif --
    finalBoss: {
      bpm: 164, echo: 0.16, form: "A C A B",
      v: {
        lead: { w: "p25", g: 0.04, gate: 0.86 }, arp: { w: "square", g: 0.012, gate: 0.45 },
        bass: { w: "p25", g: 0.03, gate: 0.6, cut: 700 }
      },
      kit: {
        a: "k..ks..kk.k.s.k./h.h.h.h.h.h.h.h.", b: "k..ks..ks.s.ssss/h.h.h.h.o.......",
        c: "k.....k.s...k.../c.......h...h...", e: "k.....k.s...k.k./h...h...h...h...",
        d: "k...s...k.k.s.../..o...o...o...o.", f: "k...s...k.s.ssss/..o...o........."
      },
      sec: {
        A: {
          lead: "G5:3 G5:3 Bb5 D6:4 C6 Bb5 | A5:3 A5:3 Bb5 G5:4 - D5 | G5:3 G5:3 Bb5 Eb6:4 D6 Bb5 | C6:3 C6:3 A5 F5 A5 C6 F6 |" +
                "D6:3 D6:3 Bb5 G6:4 F6 D6 | C6:3 C6:3 D6 Bb5:4 - G5 | Eb6 D6 Bb5 G5 Eb6 D6 Bb5 G5 | F#5 A5 D6 F#5 A5 D6 F#6:4",
          chords: "Gm Gm Eb F Gm Cm Eb D",
          arp: "0121012101210121", bass: "1.111.111.111.11", drums: "aaab"
        },
        C: {
          lead: "Eb6:8 D6:4 C6:4 | D6:6 F#5 A5:4 D6:4 | Bb5:8 A5:4 G5:4 | D5 G5 Bb5 D6 G6:6 - |" +
                "Eb6:8 F6:4 G6:4 | F#6:6 D6 A5:4 D6:4 | Eb6:3 D6:3 Bb5 F6:3 Eb6:3 C6 | D6:8 - D5 F#5 A5",
          chords: "Cm D Gm Gm Cm D Eb,F D",
          arp: "c.....c.c.....c.", bass: "1-----1-1-----5-", drums: "ceeeceeb"
        },
        B: {
          lead: "F5 Bb5 D6:3 C6:3 Bb5 F5:4 | G5 Bb5 Eb6:3 D6:3 C6 Bb5:4 | D6 D6:1 D6:1 C6 Bb5 C6 D6 Bb5:4 | C6:6 A5 F5:4 - F5 |" +
                "G5 Bb5 D6:3 C6:3 Bb5 G5:4 | G5 Bb5 Eb6:3 F6:3 Eb6 D6:4 | C6 Eb6 D6 C6 A5 D6 F#6:4 | D6 D6 - D6 D6 - D6:1 D6:1 D6:1 D6:1",
          chords: "Bb Eb Bb F Gm Eb Cm,D D",
          arp: "0.2.1.2.3.2.1.2.", bass: "1.8.1.8.1.8.1.8.", drums: "dddddddf"
        }
      }
    },

    // ---- Story: sparse music-box background for dialogue --------------------
    story: {
      bpm: 80, L: 4, echo: 0.3, vol: 0.9, form: "A B",
      v: {
        lead: { w: "sine", g: 0.055, gate: 0.95 }, arp: { w: "triangle", g: 0.018, gate: 0.8 },
        bass: { g: 0.045, gate: 0.95 }
      },
      kit: { a: "k.............../........h......." },
      sec: {
        A: {
          lead: "E5:8 G5 C6 | B5:12 - | C6 B5 A5 E5 | G5:12 - | A5:8 G5 F5 | G5:8 E5:8 | F5 A5 D6 C6 | B5:12 -",
          chords: "C Em/B Am C/G F C/E Dm7 G",
          arp: "0.2.1.2.3.2.1.2.", bass: "1---------------", drums: "a"
        },
        B: {
          lead: "- A5 C6 A5 | - B5 D6 B5 | G5:6 A5:2 B5:8 | C6:6 B5:2 A5:8 | A5 C6 E6:6 D6:2 | D6:8 B5 G5 | E5 G5 C6:8 | ~:8 -:8",
          chords: "F G Em Am F G C C",
          arp: "0.1.2.3.2.1.2.1.", bass: "1-------5-------", drums: "a"
        }
      }
    },

    // ---- Opening cutscene: bouncy C-major chiptune, game-intro energy -------
    opening: {
      bpm: 144, form: "A B",
      v: { lead: { w: "p25", g: 0.038, gate: 0.75 }, arp: { w: "square", g: 0.014, gate: 0.45 } },
      kit: {
        a: "k...s...k.k.s.../h.h.h.h.h.h.h.h.", b: "k...s...k.k.ssss/h.h.h.h.h.h.o...",
        c: "k.k.s...k.k.s.../..o...o...o...o.", d: "k.k.s...k.s.ssss/..o...o.....c..."
      },
      sec: {
        A: {
          lead: "C5 E5 G5 C6:3 G5:1 E5 G5:4 | A5:3 G5:1 E5 C5 E5:4 -:4 | F5 A5 C6 F6:3 E6:1 D6 C6 A5 | B5:4 G5:4 D6:6 - |" +
                "C5 E5 G5 C6:3 G5:1 E5 G5:4 | A5:3 C6:1 E6 D6 C6 A5 C6:4 | D6:3 C6:1 A5 F5 G5 B5 D6 F6 | E6:3 D6:1 C6:8 -:4",
          chords: "C Am F G C Am Dm,G C",
          arp: "..c...c...c...c.", bass: "1.8.5.8.1.8.5.8.", drums: "aaab"
        },
        B: {
          lead: "A5 A5:1 A5:1 G5 A5 C6:4 A5:4 | B5 B5:1 B5:1 A5 B5 D6:4 B5:4 | G5:3 E5:3 G5 B5:4 E6:4 | C6:3 A5:3 E5 A5:8 |" +
                "C6 A5 F5 A5 F6:4 E6 D6 | D6 B5 G5 B5 G6:4 F6 E6 | E6:3 C6:3 A5 C6:3 D6:3 F#6 | G6:4 D6 B5 G5 D5 -:4",
          chords: "F G Em Am F G Am,D7 G",
          arp: "0.2.1.2.3.2.1.2.", bass: "1..1..5.1..1..5.", drums: "cccccccd"
        }
      }
    },

    // ---- Ending: main theme in C, low and warm, then lifted an octave -------
    ending: {
      bpm: 96, tr: -7, echo: 0.3, form: "A B A2",
      v: { lead: { w: "p25", g: 0.04, gate: 0.93 }, arp: { w: "triangle", g: 0.026, gate: 0.7 }, bass: { gate: 0.92 } },
      kit: {
        a: "k.........k...../........s......./..h...h...h...h.",
        b: "k.....k.s.....k./h.h.h.h.h.h.h.h.", c: "k.....k.s...ssss/h.h.h.h.o......."
      },
      sec: {
        A: { lead: MAIN_A, chords: "G C G/B D Em C Am7,D7 G", arp: "0.1.2.1.3.1.2.1.", bass: "1-------1---5---", drums: "----aaaa" },
        B: { lead: MAIN_B, chords: "C D Bm7 Em C D Am7 D7", arp: "0.1.2.3.2.1.2.1.", bass: "1-----1-5---1---", drums: "bbbbbbbc" },
        A2: { base: "A", shift: 12, arp: "0.2.1.2.3.2.1.2.", bass: "1..1..5.1..1..5.", drums: "bbbbbbbc" }
      }
    },

    // ---- Credits: main theme in A major, four-on-the-floor party ------------
    credits: {
      bpm: 128, tr: 2, form: "A B A2 C",
      v: { lead: { w: "p25", g: 0.038 }, arp: { w: "square", g: 0.013, gate: 0.45 } },
      kit: { a: "k...k...k...k.../....s.......s.../..o...o...o...o.", b: "k...k...k...k.../....s.......ssss/..o...o...o....." },
      sec: {
        A: { lead: MAIN_A, chords: MAIN_A_CH, arp: "..c...c...c...c.", bass: "1.8.1.8.1.8.1.8.", drums: "aaab" },
        A2: { base: "A", arp: "0.2.1.2.3.2.1.2." },
        B: { lead: MAIN_B, chords: MAIN_B_CH, arp: "0.1.2.3.2.1.2.1.", bass: "1..1..5.1..1..5.", drums: "aaab" },
        C: { lead: MAIN_C, chords: MAIN_C_CH, arp: "c..c..c...c.c...", bass: "1.1.8.1.1.1.8.5.", drums: "aaab" }
      }
    }
  };

  // One-shot fanfares: voices are [wave, gain, notes].
  const JINGLES = {
    stageClear: { bpm: 150, voices: [
      ["p25", 0.045, "D5 G5 B5 D6:3 B5:1 D6 G6:8"],
      ["triangle", 0.04, "B4 D5 G5 B5:3 G5:1 B5 D6:8"],
      ["triangle", 0.05, "G3:6 G3:4 D4:2 G3:8"]] },
    bossClear: { bpm: 146, voices: [
      ["p25", 0.045, "C5 F5 A5 C6:4 Bb5 A5 G5 A5 Bb5 C6 E6 F6:8"],
      ["triangle", 0.04, "A4 C5 F5 A5:4 G5 F5 E5 F5 G5 G5 G5 A5:8"],
      ["triangle", 0.05, "F3:10 Bb3:8 C4:6 F3:8"]] },
    gameOver: { bpm: 106, voices: [
      ["triangle", 0.055, "E5:3 D5:1 C5 A4 B4 A4:6"],
      ["sine", 0.04, "C5:4 A4:4 E4:2 E4:6"],
      ["triangle", 0.05, "A3:4 F3:4 E3:2 A2:6"]] },
    worldOpen: { bpm: 170, voices: [
      ["triangle", 0.05, "G5:1 B5:1 D6:1 G6:1 B5:1 D6:1 G6:1 B6:1 D6:1 G6:1 B6:1 D7:5"],
      ["sine", 0.035, "G4:4 B4:4 D5:3 G5:5"]] },
    fanfare: { bpm: 140, voices: [
      ["p25", 0.045, "D5 G5 B5:3 A5:3 G5 D6:4 C6 E6 D6 F#6 G6:12"],
      ["triangle", 0.04, "B4 D5 G5:3 F#5:3 D5 B5:4 A5 C6 B5 D6 B5:12"],
      ["triangle", 0.05, "G3:8 G3:8 C4:4 D4:4 G3:12"]] }
  };

  const VOICE_DEFAULTS = {
    lead: { w: "p25", g: 0.038, gate: 0.88, a: 0.008, d: 0.1, s: 0.72, r: 0.07, vib: 1, cut: 3600 },
    arp: { w: "square", g: 0.015, gate: 0.55, a: 0.006, d: 0.08, s: 0.5, r: 0.05, vib: 0, cut: 2600, lo: 57 },
    bass: { w: "triangle", g: 0.055, gate: 0.8, a: 0.006, d: 0.1, s: 0.8, r: 0.05, vib: 0, cut: 1100, lo: 40 }
  };
  const JINGLE_VOICE = { gate: 0.92, a: 0.008, d: 0.1, s: 0.75, r: 0.14, vib: 1 };

  // f: [startHz, endHz] pitched body; n: noise level; hp: route noise through the hat high-pass.
  const DRUMS = {
    k: { f: [150, 46], sweep: 0.09, dur: 0.17, g: 0.06, w: "sine" },
    t: { f: [240, 120], sweep: 0.1, dur: 0.16, g: 0.04, w: "sine" },
    s: { f: [210, 150], sweep: 0.05, dur: 0.08, g: 0.02, w: "triangle", n: 0.045, nd: 0.13 },
    h: { n: 0.014, nd: 0.04, hp: 1 },
    o: { n: 0.013, nd: 0.16, hp: 1 },
    c: { n: 0.016, nd: 0.5, hp: 1 }
  };

  // ------------------------------------------------------------------ parsing

  const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const QUAL = {
    "": [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], M7: [0, 4, 7, 11], m7: [0, 3, 7, 10],
    6: [0, 4, 7, 9], sus4: [0, 5, 7], dim: [0, 3, 6]
  };
  const mod12 = (n) => ((n % 12) + 12) % 12;
  const merge = (a, b) => Object.assign({}, a, b);
  const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function pitchClass(name) { // "Bb" -> 10
    return SEMI[name[0]] + (name[1] === "#" ? 1 : name[1] === "b" ? -1 : 0);
  }

  function noteMidi(name) { // "F#5" -> 78
    const m = /^([A-G][#b]?)(\d)$/.exec(name);
    return m ? pitchClass(m[1]) + 12 * (+m[2] + 1) : NaN;
  }

  // Parses a melodic line into [{s, l, m}] (step, length, midi). `bar` > 0 validates bar lengths.
  function parseLine(str, bar, defLen, shift, offset, label, errs) {
    const notes = [];
    let pos = 0, last = null;
    str.split("|").forEach((barStr, bi) => {
      const barStart = pos;
      barStr.trim().split(/\s+/).forEach((tok) => {
        if (!tok) return;
        const p = tok.split(":"), len = p.length > 1 ? +p[1] : defLen;
        if (!(len > 0) || len !== Math.floor(len)) errs.push(label + ": bad length in '" + tok + "'");
        if (p[0] === "~") {
          if (last) last.l += len; else errs.push(label + ": tie without a note");
        } else if (p[0] === "-") {
          last = null;
        } else {
          const m = noteMidi(p[0]);
          if (isNaN(m)) errs.push(label + ": bad note '" + tok + "'");
          last = { s: offset + pos, l: len, m: m + shift };
          notes.push(last);
        }
        pos += len || 0;
      });
      if (bar && pos - barStart !== bar) errs.push(label + ": bar " + (bi + 1) + " is " + (pos - barStart) + " steps");
    });
    return { notes: notes, len: pos };
  }

  // "G Em7 Am,D" -> one chord object per step.
  function expandChords(str, bar, tr, label, errs) {
    const steps = [];
    str.trim().split(/\s+/).forEach((tok) => {
      const parts = tok.split(",");
      if (bar % parts.length) errs.push(label + ": cannot split bar for '" + tok + "'");
      parts.forEach((name) => {
        const m = /^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/.exec(name);
        const iv = m && QUAL[m[2]];
        if (!iv) errs.push(label + ": bad chord '" + name + "'");
        const root = m ? mod12(pitchClass(m[1]) + tr) : 0;
        const chord = { root: root, iv: iv || QUAL[""], bass: m && m[3] ? mod12(pitchClass(m[3]) + tr) : root };
        for (let i = 0; i < Math.floor(bar / parts.length); i++) steps.push(chord);
      });
    });
    return steps;
  }

  function arpNote(chord, k, lo) { // k-th chord tone at or above `lo`
    if (!(k >= 0)) return NaN;
    for (let m = lo, n = 0; m < lo + 72; m++) {
      if (chord.iv.some((iv) => mod12(m - chord.root - iv) === 0) && n++ === k) return m;
    }
    return NaN;
  }

  function bassNote(chord, ch, lo) {
    const base = lo + mod12(chord.bass - lo);
    const above = (pc) => base + (mod12(pc - base) || 12);
    if (ch === "1") return base;
    if (ch === "8") return base + 12;
    if (ch === "3") return above(chord.root + chord.iv[1]);
    if (ch === "5") return above(chord.root + chord.iv[2]);
    if (ch === "7") return above(chord.root + (chord.iv[3] || 10));
    return NaN;
  }

  function expandPattern(pat, chords, bar, offset, voice, lo, label, errs, out) {
    if (!pat) return;
    const bars = pat.split("|");
    bars.forEach((p) => { if (p.length !== bar) errs.push(label + ": " + voice + " pattern '" + p + "' is not " + bar + " steps"); });
    let held = [];
    for (let i = 0; i < chords.length; i++) {
      const ch = bars[Math.floor(i / bar) % bars.length][i % bar], chord = chords[i];
      if (ch === undefined || ch === ".") { held = []; continue; }
      if (ch === "-") { held.forEach((n) => { n.l++; }); continue; }
      const midis = voice === "bass" ? [bassNote(chord, ch, lo)]
        : ch === "c" ? [0, 1, 2].map((k) => arpNote(chord, k, lo))
          : [arpNote(chord, parseInt(ch, 10), lo)];
      held = midis.map((m) => ({ s: offset + i, l: 1, v: voice, m: m, poly: midis.length }));
      held.forEach((n) => out.push(n));
    }
  }

  function expandDrums(seq, kit, bars, bar, offset, label, errs, out) {
    seq = (seq || "").replace(/\s/g, "");
    if (!seq) return;
    for (let b = 0; b < bars; b++) {
      const key = seq[b % seq.length];
      if (key === "-") continue;
      if (!kit || !kit[key]) { errs.push(label + ": unknown drum bar '" + key + "'"); continue; }
      kit[key].split("/").forEach((layer) => {
        if (layer.length !== bar) { errs.push(label + ": drum layer '" + layer + "' is not " + bar + " steps"); return; }
        for (let i = 0; i < bar; i++) {
          if (layer[i] === ".") continue;
          if (!DRUMS[layer[i]]) errs.push(label + ": unknown drum '" + layer[i] + "'");
          else out.push({ s: offset + b * bar + i, l: 1, v: "drum", m: layer[i] });
        }
      });
    }
  }

  const trackCache = {}, jingleCache = {};

  function buildTrack(name) {
    if (trackCache[name]) return trackCache[name];
    const T = TRACKS[name];
    if (!T) return null;
    const bar = T.bar || 16, tr = T.tr || 0, errs = [], ev = [];
    const voices = { lead: merge(VOICE_DEFAULTS.lead, T.v && T.v.lead), arp: merge(VOICE_DEFAULTS.arp, T.v && T.v.arp), bass: merge(VOICE_DEFAULTS.bass, T.v && T.v.bass) };
    const voiceLen = { lead: 0, arp: 0, bass: 0, drums: 0 };
    let pos = 0;
    T.form.trim().split(/\s+/).forEach((key) => {
      let S = T.sec[key];
      const label = name + "." + key;
      if (!S) { errs.push(label + ": unknown section"); return; }
      if (S.base) S = merge(T.sec[S.base], S);
      const lead = parseLine(S.lead || "", bar, T.L || 2, tr + (S.shift || 0), pos, label, errs);
      lead.notes.forEach((n) => { ev.push({ s: n.s, l: n.l, v: "lead", m: n.m }); });
      const chords = expandChords(S.chords || "", bar, tr, label, errs);
      const bars = chords.length / bar;
      if (chords.length !== lead.len) errs.push(label + ": lead is " + lead.len + " steps but chords cover " + chords.length);
      expandPattern(S.arp, chords, bar, pos, "arp", voices.arp.lo, label, errs, ev);
      expandPattern(S.bass, chords, bar, pos, "bass", voices.bass.lo, label, errs, ev);
      expandDrums(S.drums, T.kit, bars, bar, pos, label, errs, ev);
      voiceLen.lead += lead.len;
      voiceLen.arp += S.arp ? chords.length : 0;
      voiceLen.bass += S.bass ? chords.length : 0;
      voiceLen.drums += S.drums ? bars * bar : 0;
      pos += lead.len;
    });
    ev.forEach((e, i) => {
      e.i = i;
      if (e.v === "drum") return;
      e.f = midiToFreq(e.m);
      if (!isFinite(e.f) || e.f < 20 || e.f > 8000) errs.push(name + ": bad pitch in " + e.v + " at step " + e.s);
    });
    ev.sort((a, b) => a.s - b.s || a.i - b.i);
    const built = {
      name: name, T: T, bpm: T.bpm, bar: bar, stepDur: 60 / T.bpm / 4, steps: pos, bars: pos / bar,
      events: ev, voices: voices, voiceLen: voiceLen, errors: errs
    };
    if (errs.length && typeof console !== "undefined") console.warn("[Bgm] score errors", errs);
    trackCache[name] = built;
    return built;
  }

  function buildJingle(name) {
    if (jingleCache[name]) return jingleCache[name];
    const J = JINGLES[name];
    if (!J) return null;
    const errs = [], notes = [];
    let steps = 0;
    J.voices.forEach((v, vi) => {
      const line = parseLine(v[2], 0, 2, 0, 0, name + "#" + vi, errs);
      steps = Math.max(steps, line.len);
      line.notes.forEach((n) => {
        notes.push({ s: n.s, l: n.l, f: midiToFreq(n.m), o: merge(JINGLE_VOICE, { w: v[0], g: v[1], vib: vi === 0 ? 1 : 0 }) });
      });
    });
    const stepDur = 60 / J.bpm / 4;
    const built = { name: name, bpm: J.bpm, stepDur: stepDur, steps: steps, notes: notes, duration: steps * stepDur + JINGLE_TAIL, errors: errs };
    jingleCache[name] = built;
    return built;
  }

  // ------------------------------------------------------------------ audio graph

  let G = null;          // shared nodes for the current AudioContext
  let volume = 0.6;
  let ducked = false;

  function rawCtx() {
    try { return typeof getAudioContext === "function" ? getAudioContext() : null; } catch (e) { return null; }
  }

  function pulseWave(ctx, duty) {
    const N = 24, re = new Float32Array(N), im = new Float32Array(N);
    for (let n = 1; n < N; n++) {
      re[n] = (2 * Math.sin(2 * Math.PI * n * duty)) / (Math.PI * n);
      im[n] = (2 * (1 - Math.cos(2 * Math.PI * n * duty))) / (Math.PI * n);
    }
    return ctx.createPeriodicWave(re, im);
  }

  function filterNode(ctx, type, freq, q) {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q || 0.5;
    return f;
  }

  function gainNode(ctx, value) {
    const g = ctx.createGain();
    g.gain.value = value;
    return g;
  }

  // master (setVolume) <- duck (Bgm.duck) <- jduck (jingle ducking) <- per-track mix
  //                    <- jbus (jingles, with a small echo)
  function graph(ctx) {
    if (G && G.ctx === ctx) return G;
    let out = null;
    try { out = typeof audioOut === "function" ? audioOut() : null; } catch (e) { out = null; }
    if (!out) return null;
    try {
      const g = { ctx: ctx, waves: {} };
      g.master = gainNode(ctx, volume);
      g.duck = gainNode(ctx, ducked ? DUCK_LEVEL : 1);
      g.jduck = gainNode(ctx, 1);
      g.jbus = filterNode(ctx, "lowpass", 4200);
      const jsend = gainNode(ctx, 0.22), jdelay = ctx.createDelay(1), jfb = gainNode(ctx, 0.28);
      jdelay.delayTime.value = 0.19;
      g.jduck.connect(g.duck); g.duck.connect(g.master);
      g.jbus.connect(g.master); g.jbus.connect(jsend); jsend.connect(jdelay);
      jdelay.connect(jfb); jfb.connect(jdelay); jdelay.connect(g.master);
      g.master.connect(out);
      if (ctx.createPeriodicWave) { g.waves.p25 = pulseWave(ctx, 0.25); g.waves.p12 = pulseWave(ctx, 0.125); }
      const len = Math.floor(ctx.sampleRate * 1.5);
      g.noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = g.noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      G = g;
      return G;
    } catch (e) {
      return null;
    }
  }

  // Per-track nodes: voice filters, panning, lead echo and drum filters, all feeding one `mix` gain.
  function makeTrackNodes(g, trk) {
    const ctx = g.ctx, T = trk.T, all = [];
    const keep = (node) => { all.push(node); return node; };
    const panned = (pan) => {
      if (!ctx.createStereoPanner) return mix;
      const p = keep(ctx.createStereoPanner());
      p.pan.value = pan;
      p.connect(mix);
      return p;
    };
    const mix = keep(gainNode(ctx, T.vol || 1));
    mix.connect(g.jduck);
    const n = { g: g, mix: mix, all: all };
    n.lead = keep(filterNode(ctx, "lowpass", trk.voices.lead.cut));
    n.arp = keep(filterNode(ctx, "lowpass", trk.voices.arp.cut));
    n.bass = keep(filterNode(ctx, "lowpass", trk.voices.bass.cut));
    n.lead.connect(mix);
    n.arp.connect(panned(-0.3));
    n.bass.connect(mix);
    const send = keep(gainNode(ctx, T.echo == null ? 0.22 : T.echo));
    const delay = keep(ctx.createDelay(1)), fb = keep(gainNode(ctx, 0.3));
    const damp = keep(filterNode(ctx, "lowpass", 2200));
    delay.delayTime.value = Math.min(0.9, trk.stepDur * 3); // dotted-eighth echo
    n.lead.connect(send); send.connect(delay); delay.connect(damp);
    damp.connect(fb); fb.connect(delay); damp.connect(panned(0.3));
    n.hat = keep(filterNode(ctx, "highpass", 7000));
    n.hat.connect(panned(0.2));
    n.snare = keep(filterNode(ctx, "bandpass", 1900, 0.6));
    n.snare.connect(mix);
    return n;
  }

  function releaseOnEnd(src, env) {
    src.onended = function () { try { env.disconnect(); } catch (e) { /* already gone */ } };
  }

  // One enveloped oscillator note. `dur` is the gate time; the release tail follows it.
  function tone(g, dest, t, dur, freq, o, mul) {
    const ctx = g.ctx, osc = ctx.createOscillator(), env = ctx.createGain();
    const peak = o.g * (mul || 1), sus = peak * o.s;
    const end = t + Math.max(dur, o.a + 0.02), off = end + o.r + 0.02;
    if (g.waves[o.w]) osc.setPeriodicWave(g.waves[o.w]);
    else osc.type = o.w === "p25" || o.w === "p12" ? "square" : o.w;
    osc.frequency.setValueAtTime(freq, t);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(peak, t + o.a);
    env.gain.linearRampToValueAtTime(sus, Math.min(t + o.a + o.d, end));
    env.gain.setValueAtTime(sus, end);
    env.gain.linearRampToValueAtTime(0, end + o.r);
    if (o.vib && dur > 0.38) { // gentle delayed vibrato on long notes
      const lfo = ctx.createOscillator(), depth = ctx.createGain();
      lfo.frequency.setValueAtTime(5.6, t);
      depth.gain.setValueAtTime(0, t);
      depth.gain.setValueAtTime(0, t + 0.16);
      depth.gain.linearRampToValueAtTime(freq * 0.006 * o.vib, t + 0.34);
      lfo.connect(depth); depth.connect(osc.frequency);
      lfo.start(t); lfo.stop(off);
    }
    osc.connect(env); env.connect(dest);
    osc.start(t); osc.stop(off);
    releaseOnEnd(osc, env);
  }

  function drum(g, n, t, ch) {
    const ctx = g.ctx, d = DRUMS[ch];
    if (d.f) {
      const osc = ctx.createOscillator(), env = ctx.createGain();
      osc.type = d.w;
      osc.frequency.setValueAtTime(d.f[0], t);
      osc.frequency.exponentialRampToValueAtTime(d.f[1], t + d.sweep);
      env.gain.setValueAtTime(0.0001, t);
      env.gain.linearRampToValueAtTime(d.g, t + 0.004);
      env.gain.exponentialRampToValueAtTime(0.0001, t + d.dur);
      osc.connect(env); env.connect(n.mix);
      osc.start(t); osc.stop(t + d.dur + 0.02);
      releaseOnEnd(osc, env);
    }
    if (d.n) {
      const src = ctx.createBufferSource(), env = ctx.createGain();
      src.buffer = g.noise;
      src.loop = true;
      env.gain.setValueAtTime(0.0001, t);
      env.gain.linearRampToValueAtTime(d.n, t + 0.002);
      env.gain.exponentialRampToValueAtTime(0.0001, t + d.nd);
      src.connect(env); env.connect(d.hp ? n.hat : n.snare);
      src.start(t, Math.random()); src.stop(t + d.nd + 0.02);
      releaseOnEnd(src, env);
    }
  }

  function playEvent(c, e, t) {
    const n = c.nodes, trk = c.trk;
    if (e.v === "drum") { drum(n.g, n, t, e.m); return; }
    const o = trk.voices[e.v];
    // The gap between notes is capped at that of a 2-step note so long notes stay legato.
    const dur = trk.stepDur * (e.l - Math.min(e.l, 2) * (1 - o.gate));
    tone(n.g, n[e.v], t, dur, e.f, o, e.poly > 1 ? 0.6 : 1);
  }

  // ------------------------------------------------------------------ scheduler

  let cur = null;        // { name, trk, idx, t0, loops, nodes }
  let timer = null;
  let lastCtx = null;
  let waitTicks = 0;

  const isHidden = () => typeof document !== "undefined" && !!document.hidden;

  // game.js's getAudioContext() calls resume() on every call, so while the context is still
  // waiting for a user gesture we only poll it about twice a second.
  function runningCtx() {
    if (lastCtx && lastCtx.state !== "running" && waitTicks++ % 20) return null;
    lastCtx = rawCtx();
    return lastCtx && lastCtx.state === "running" ? lastCtx : null;
  }

  function tick() {
    const c = cur;
    if (!c || isHidden()) return;
    const ctx = runningCtx();
    if (!ctx) return;
    const g = graph(ctx);
    if (!g) return;
    const now = ctx.currentTime, trk = c.trk, ev = trk.events, loopDur = trk.steps * trk.stepDur;
    if (!ev.length) return;
    if (!c.nodes || c.nodes.g !== g) { // first run for this track (or the context was replaced)
      c.nodes = makeTrackNodes(g, trk);
      c.idx = 0;
      c.t0 = now + START_DELAY;
    }
    if (c.idx >= ev.length) { c.idx = 0; c.t0 += loopDur; c.loops++; }
    // Never schedule in the past: if we fell behind (stalled tab, long frame, resume from
    // hidden) slide the timeline so the next event lands just ahead of now. No note bursts.
    const next = c.t0 + ev[c.idx].s * trk.stepDur;
    if (next < now + 0.005) { c.t0 += now + START_DELAY - next; c.resyncs++; }
    const horizon = now + LOOKAHEAD;
    for (let guard = 0; guard < 512; guard++) {
      if (c.idx >= ev.length) { c.idx = 0; c.t0 += loopDur; c.loops++; }
      const e = ev[c.idx], t = c.t0 + e.s * trk.stepDur;
      if (t >= horizon) break;
      playEvent(c, e, t);
      c.idx++;
    }
  }

  function startTimer() {
    if (timer === null && !isHidden()) timer = setInterval(tick, TICK_MS);
  }

  function stopTimer() {
    if (timer !== null) { clearInterval(timer); timer = null; }
  }

  function fadeOut(c, sec) {
    if (!c || !c.nodes) return;
    const n = c.nodes, ctx = n.g.ctx, now = ctx.currentTime, p = n.mix.gain;
    c.nodes = null;
    try {
      p.cancelScheduledValues(now);
      p.setValueAtTime(p.value, now);
      p.linearRampToValueAtTime(0, now + Math.max(0.02, sec));
    } catch (e) { /* ignore */ }
    setTimeout(function () {
      n.all.forEach((node) => { try { node.disconnect(); } catch (e) { /* ignore */ } });
    }, (Math.max(0.02, sec) + 0.3) * 1000);
  }

  function smooth(param, value, ctx, tc) {
    try {
      param.cancelScheduledValues(ctx.currentTime);
      param.setTargetAtTime(value, ctx.currentTime, tc);
    } catch (e) { param.value = value; }
  }

  // ------------------------------------------------------------------ public API

  function play(name, opts) {
    if (!Object.prototype.hasOwnProperty.call(TRACKS, name)) { stop(); return; }
    if (cur && cur.name === name && !(opts && opts.restart === true)) return;
    const trk = buildTrack(name);
    fadeOut(cur, 0.4);
    cur = { name: name, trk: trk, idx: 0, t0: 0, loops: 0, resyncs: 0, nodes: null };
    waitTicks = 0;
    startTimer();
    tick();
  }

  function stop(fadeSec) {
    fadeOut(cur, typeof fadeSec === "number" && fadeSec >= 0 ? fadeSec : 0.5);
    cur = null;
    stopTimer();
  }

  function jingle(name) {
    const j = Object.prototype.hasOwnProperty.call(JINGLES, name) ? buildJingle(name) : null;
    const ctx = rawCtx();
    if (!j || !ctx || ctx.state !== "running") return 0;
    const g = graph(ctx);
    if (!g) return 0;
    const now = ctx.currentTime, t0 = now + 0.03, end = t0 + j.steps * j.stepDur;
    j.notes.forEach((n) => {
      tone(g, g.jbus, t0 + n.s * j.stepDur, n.l * j.stepDur * n.o.gate, n.f, n.o, 1);
    });
    const p = g.jduck.gain;
    try {
      p.cancelScheduledValues(now);
      p.setValueAtTime(p.value, now);
      p.linearRampToValueAtTime(JINGLE_DUCK, now + 0.08);
      p.setValueAtTime(JINGLE_DUCK, end);
      p.linearRampToValueAtTime(1, end + 0.5);
    } catch (e) { /* ignore */ }
    return j.duration;
  }

  function setVolume(v) {
    v = Number(v);
    if (!isFinite(v)) return;
    volume = Math.min(1, Math.max(0, v));
    if (G) smooth(G.master.gain, volume, G.ctx, 0.04);
  }

  function duck(on) {
    ducked = !!on;
    if (G) smooth(G.duck.gain, ducked ? DUCK_LEVEL : 1, G.ctx, 0.08);
  }

  if (typeof document !== "undefined" && document.addEventListener) {
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stopTimer();
      else if (cur) { startTimer(); tick(); }
    });
  }

  window.Bgm = {
    play: play,
    stop: stop,
    jingle: jingle,
    setVolume: setVolume,
    getVolume: function () { return volume; },
    duck: duck,
    current: function () { return cur ? cur.name : null; },
    tracks: Object.keys(TRACKS),
    jingles: Object.keys(JINGLES),
    // Introspection for tests/tools; not used by the game.
    _debug: {
      buildTrack: buildTrack,
      buildJingle: buildJingle,
      tick: tick,
      state: function () {
        return cur ? { name: cur.name, idx: cur.idx, t0: cur.t0, loops: cur.loops, resyncs: cur.resyncs, started: !!cur.nodes } : null;
      }
    }
  };
})();
