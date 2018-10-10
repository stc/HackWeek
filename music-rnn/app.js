// NOTE:
/*

Very ugly hack => music.js is a downloaded magenta distro, where playNote function has been overwritten to access
individual notes from the sequence.
UI is made with p5js, sound is produced with tonejs ATM

*/

// Number of steps to play each chord.
const STEPS_PER_CHORD = 32;
const STEPS_PER_PROG = 4 * STEPS_PER_CHORD;

// Number of times to repeat chord progression.
const NUM_REPS = 1;

// Number of times to repeat the loop
const LOOP_REPS = 4;

// Probability of repeating previous sequence instead of moving forward
const REPEAT_CHANCE = 0.0

// Set up Improv RNN model and player.
const model = new mm.MusicRNN('https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/chord_pitches_improv');
const player = new mm.Player(true,printMe);

function printMe(e) {
  // console.log(e);
}

const SCENES = {
  base: ['A', 'D', 'C', 'E'],
  mainmenu: ['D', 'G', 'C', 'E'],
  level: ['E', 'A', 'E', 'B'],
  debrief: ['C', 'F', 'C', 'G'],
  explore: ['A', 'D', 'A', 'E'],
  factory: ['D', 'G', 'D', 'E'],
}

const MOODS = ['happy', 'sad',]

function moodify(chords, mood) {
  return mood === 'happy' ? chords :
      chords.map(c => c + 'm')
}

var state = {
  tempo: null,
  nextTempo: null,
  intensity: null,
  character: 1,
  scene: null,
  chords: [],
  started: false,
  pollHandler: null,
  loops: {},
  composing: true,
}

function resetSeq() {
  state.started = false

  // TODO decide if we shall rewind current sequence
}

// return false if a single note represents more than 60% of sequence
const notRobotMusic = seq => Object.keys(seq.pitches)
  .every(pitch => seq.pitches[pitch] < seq.notes.length * 0.5)

function translateParams(params) {

  if (state.scene !== params.scene) {
    state.scene = params.scene
    resetSeq()
  }
  if (state.mood !== params.mood) {
    state.mood = params.mood
    resetSeq()
  }
  state.nextTempo = Math.round(120 + (params.tempo * 100));
  state.intensity = params.intensity || 0.1
  state.character = params.character || 1

  if (!state.started) {
    state.started = true
    playSeq()
  }
}

function pollParams() {
  let params = {
    "mood" : "happy", // "happy" or "sad"
    "character" : 1, // 1 - 3
    "tempo" : 0.4,//Math.random(),  //0.29724919083554, // 0.0 - 1.0
    "intensity" : 0.6, // 0.0 - 1.0
    // TODO: group sequences by number of notes, map to intensity value
    "scene": "base",
  };

  fetch('/music.json')
  .then(resp => resp.json())
  .then(translateParams)
  .catch(() => {translateParams(params)})
}

const filteredCompose = (chords, jury) => {
  return new Promise(resolve => {
    compose(chords).then(seq => {
      if (jury(seq)) {
        resolve(seq)
      } else {
        console.log('ROBOT JURY NOT ENTERTAINED. REJECTING COMPOSITION.')
        filteredCompose(chords, jury)
        .then(resolve)
      }
    })
  })
}

// returns an improvised Sequence over the specifed chord progression.
const compose = (chords) => {
  console.log('composing loop', chords)
  // Prime with root note of the first chord.
  const root = mm.chords.ChordSymbols.root(chords[0]);
  const seq = {
    quantizationInfo: {stepsPerQuarter: 4},
    notes: [],
    totalQuantizedSteps: 1,
    pitches: {},
  };

  return model.continueSequence(seq, STEPS_PER_PROG + (NUM_REPS-1)*STEPS_PER_PROG - 1, 0.75, chords)
    .then((contSeq) => {
      // Add the continuation to the original.
      contSeq.notes.forEach((note) => {
        seq.pitches[note.pitch] = (seq.pitches[note.pitch] || 0) + 1
        note.quantizedStartStep += 1;
        note.quantizedEndStep += 1;
        seq.notes.push(note);
      });
      console.log('composition ready', seq.pitches)

      const roots = chords.map(mm.chords.ChordSymbols.root);
      for (var i=0; i<NUM_REPS; i++) {
        // Add the bass progression.

        for (var j=0; j<4; j++) {
          seq.notes.push({
            instrument: 1,
            pitch: 36 + roots[j],
            quantizedStartStep: i*STEPS_PER_PROG + j * STEPS_PER_CHORD,
            quantizedEndStep: i*STEPS_PER_PROG + (j+1) * STEPS_PER_CHORD
          });
        }
        for (var j=0; j<STEPS_PER_PROG/4; j++) {
          seq.notes.push({
            instrument: 2,
            program: 1,
            pitch: 36 + roots[0],
            quantizedStartStep: i*STEPS_PER_PROG + j * 4,
            quantizedEndStep: i*STEPS_PER_PROG + j * 4 + 1
          });
        }
        for (var j=0; j<STEPS_PER_PROG/4; j++) {
          seq.notes.push({
            instrument: 2,
            program: 2,
            pitch: 36 + roots[0],
            quantizedStartStep: i*STEPS_PER_PROG + j * 4,
            quantizedEndStep: i*STEPS_PER_PROG + j * 4 + 1
          });
        }
      }

      // Set total sequence length.
      seq.totalQuantizedSteps = STEPS_PER_PROG * NUM_REPS;

      return seq;
    });
}

function initLoops() {
  const composers = []
  const params = []
  state.composing = true
  Object.keys(SCENES).forEach(scene => {
    MOODS.forEach(mood => {
      if (state.loops[scene]
          && state.loops[scene][mood]) {
        return
      }
      composers.push(filteredCompose(moodify(SCENES[scene], mood), notRobotMusic))
      params.push({scene : scene, mood : mood})
    })
  })
  Promise.all(composers)
  .then(seqs => {
    seqs.forEach((seq, i) => {
      const p = params[i]
      state.loops[p.scene] = state.loops[p.scene] || {}
      state.loops[p.scene][p.mood] = {
        seqs: [seq],
        reps: 0,
        loopCount: 0,
      }
    })
    state.pollHandler = setInterval(pollParams, 1000);
    state.composing = false
  })
  .then(saveState)
}


// UI & Canvas elements

function setup() {
  createCanvas(800,400);
}

function draw() {
  background(20);
  textSize(14);
  fill(255);
  const lineHeight = 20
  var x = 20
  var y = lineHeight
  text("scene: " + state.scene, x, y);
  y += lineHeight
  var chords = state.scene ? moodify(SCENES[state.scene], state.mood) : []
  text("chords: " + chords.join(' '), x, y);
  y += lineHeight
  text("tempo: " + state.tempo
    + (state.tempo === state.nextTempo ? '' : ' (next: ' + state.nextTempo + ')'), x, y);
  y += lineHeight
  text("intensity: " + state.intensity, x, y);
  y += lineHeight
  text("character: " + state.character, x, y);
  y += lineHeight

  if (state.loops[state.scene]) {
    const loop = state.loops[state.scene][state.mood]
    text("loop: #" + loop.loopCount + ' ' + loop.reps + '/' + LOOP_REPS, x, y)
    y += lineHeight
  }
  if (state.composing) {
    y += lineHeight
    text("HELLO. I AM REGULAR HUMAN PIANIST. PLEASE WAIT WHILE I COMPOSE.", x, y)
  }
  fill(200,0,100);
  text("Click to stop", x, 300);
}

function mouseReleased() {
  player.stop()
  if (state.pollHandler) {
    clearInterval(state.pollHandler)
  }
}

// Initialize model then start playing.
model.initialize().then(() => {
  document.getElementById('message').innerText = 'Done loading model.'
  mm.Player.tone.context.resume();

  // unused, just to warm up RNN
  // compose(['A', 'B', 'C', 'D'])
  // .then(initLoops)
  initLoops()
});

const LS_KEY = 'genmusic-state'

function loadState() {
  // state = JSON.parse(localStorage.getItem(LS_KEY)) || state
  state.started = false
}

loadState()

function saveState() {
  localStorage.setItem(LS_KEY, JSON.stringify(state))
}


var samplesPath = "https://storage.googleapis.com/melody-mixer/piano/"
var samples = {};
var NUM_NOTES = 88;
var MIDI_START_NOTE = 21;
for (var i = MIDI_START_NOTE; i < NUM_NOTES + MIDI_START_NOTE; i++) {
  samples[i] = samplesPath + i + '.mp3';
}

var players = new Tone.Players(samples, function onPlayersLoaded(){
    console.log("Tone.js players loaded");
}).toMaster();

var synth = new Tone.PolySynth(6, Tone.Synth, {
  envelope: {
      attack: 2,
      decay: 1,
      sustain: 1,
      release: 8,
  }
}).toMaster();
synth.set("detune", -1200);
var bassSynth = new Tone.PolySynth(6, Tone.Synth, {
  envelope: {
    attack: 2,
    decay: 3,
    sustain: 2,
    release: 16,
  }
}).toMaster();
bassSynth.set("detune", -1200);

var kickDrumSynth = new Tone.MembraneSynth().toMaster();
var highHatSynth = new Tone.MetalSynth({
    "envelope"  : {
        attack  : 0.001 ,
        decay  : 1 ,
        release  : 1
    }
    }).toMaster();

const VOLUMES = [
  {piano: 0, synth: 0, drums: 0,},
  {piano: -4, synth: -4, drums: 4,},
  {piano: 4, synth: -4, drums: -4,},
  {piano: -4, synth: 4, drums: -4,},
]

function playSynth(note, r) {
  var offset = note.instrument === 1 ? 36 : 0
  const s = note.instrument === 1 ? bassSynth : synth
  const baseVolume = VOLUMES[state.character].synth
  if (isAt(2)(note)) {
    s.volume.value = baseVolume - 2
  } else if (isAt(4)(note) && Math.random() < state.intensity) {
    s.volume.value = baseVolume - 8
  } else {
    return
  }
  var duration = note.quantizedEndStep - note.quantizedStartStep
  //console.log(duration)
  s.triggerAttackRelease(Tone.Frequency(r._val + offset, 'midi'), '4n');
}
function playPiano(note, r) {
  var player = players.get(r._val);
  player.fadeOut = 0.05;
  player.fadeIn = 0.01;
  const baseVolume = VOLUMES[state.character].piano
  if (isAt(16)(note)) {
    player.volume.value = baseVolume - 18
  }
  if (isAt(8)(note)) {
    player.volume.value = baseVolume - 16
  }
  if (isAt(4)(note)) {
    player.volume.value = baseVolume - 14
  }
  if (isAt(2)(note)) {
    player.volume.value = baseVolume - 12
  }
  player.start(Tone.now(), 0, 1);
}

const isAt = (grid) =>
  (note, offset) =>
    (note.quantizedStartStep + (offset || 0)) % (32/grid) === 0

const isWhole = isAt(1)
const isHalf = isAt(2)
const isFourth = isAt(4)
const isEigth = isAt(8)
const isSixteenth = isAt(16)

const kickProb = [1, 0.8, 0.4, 0.2, 0.0]
const hhProb = [0, 0.1, 0.2, 0.8, 0.0]
const GRID = [1, 2, 4, 8, 16]

function randomPlay(note, probs) {
  const noteIsAt = GRID.findIndex(pos => isAt(pos)(note))
  if (noteIsAt > -1) {
    return Math.random() < kickProb[noteIsAt] * state.intensity
  }
  return false
}

function playDrum(note, r) {
  const baseVolume = VOLUMES[state.character].drums

  if (note.program === 1 && randomPlay(note, kickProb)) {
    kickDrumSynth.volume.value = baseVolume + 0
    kickDrumSynth.triggerAttackRelease('C1', '2n');
  }

  if (note.program === 2 && randomPlay(note, hhProb)) {
    highHatSynth.volume.value = baseVolume - 16
    highHatSynth.triggerAttackRelease('8n');
  }
}

function playNote(note, r) {
  const loop = state.loops[state.scene][state.mood]

  if (note.instrument === 2) {
    playDrum(note, r)
    return
  }

  if (state.intensity < 0.25 && note.quantizedStartStep % 16 !== 0) {
    return
  }
  if (state.intensity < 0.5 && note.quantizedStartStep % 8 !== 0) {
    return
  }
  if (state.intensity < 0.75 && note.quantizedStartStep % 4 !== 0) {
    return
  }
//  console.log(note)
  playPiano(note, r)
  playSynth(note, r)
}

function playSeq() {
  player.stop()
  state.tempo = state.nextTempo
  const loop = state.loops[state.scene][state.mood]
  loop.reps++
  if (loop.reps === LOOP_REPS + 1) {
    loop.reps = 1
    loop.loopCount += (loop.loopCount === 0 || Math.random() > REPEAT_CHANCE) ? 1 : -1
  }
  if (loop.reps === 1 && loop.loopCount + 1 === loop.seqs.length) {
    filteredCompose(moodify(SCENES[state.scene], state.mood), notRobotMusic)
    .then(seq => loop.seqs.push(seq))
  }

  // TODO: can we make progressive loops by dropping some notes and gradually adding them back

  player.start(loop.seqs[loop.loopCount], state.tempo, playNote)
  .then(playSeq)
  .then(saveState)
}
