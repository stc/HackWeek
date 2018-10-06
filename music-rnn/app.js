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
// XXX wait, how is this different than NUM_REPS
const LOOP_REPS = 4;

// Set up Improv RNN model and player.
const model = new mm.MusicRNN('https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/chord_pitches_improv');
const player = new mm.Player(true,printMe);

function printMe(e) {
  // console.log(e);
}

const SCENES = {
  mainmenu: ['A', 'D', 'C', 'E'],
  base: ['D', 'G', 'C', 'E'],
  level: ['G', 'A', 'D', 'A'],
  debrief: ['C', 'F', 'C', 'G'],
  explore: ['A', 'D', 'A', 'E'],
  factory: ['D', 'G', 'D', 'E'],
}

function moodify(chords, mood) {
  return mood === 'happy' ? chords :
      chords.map(c => c + 'm')
}

const state = {
  nextSeq: null,
  tempo: null,
  nextTempo: null,
  scene: null,
  chords: [],
  nextChords: [],
  started: false,
  pollHandler: null,
  loopRep: 0,
  loopCount: 0,
}

function resetSeq() {
  state.nextSeq = null
  state.started = false
  state.loopRep = 0
  state.nextChords = moodify(SCENES[state.scene], state.mood)
}

// return false if a single note represents more than 60% of sequence
const isRobotMusic = seq => Object.keys(seq.pitches)
  .every(pitch => seq.pitches[pitch] < seq.notes.length * 0.6)

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

  if (!state.nextSeq) {
    filteredCompose(state.nextChords, isRobotMusic)
    .then(seq => {
      state.nextSeq = seq;
      if (!state.started) {
        state.started = true
        playSeq()
      }
    })
  }
}

function pollParams() {
  let params = {
    "mood" : "happy", // "happy" or "sad"
    "character" : 1, // 1 - 3
    "tempo" : 0.3,//Math.random(),  //0.29724919083554, // 0.0 - 1.0
    "intensity" : 0.3, // 0.0 - 1.0
    "scene": "mainmenu",
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
        seq.notes.push({
          instrument: 10,
          program: 32,
          pitch: 36 + roots[0],
          quantizedStartStep: i*STEPS_PER_PROG,
          quantizedEndStep: i*STEPS_PER_PROG + STEPS_PER_CHORD
        });
        seq.notes.push({
          instrument: 10,
          program: 32,
          pitch: 36 + roots[1],
          quantizedStartStep: i*STEPS_PER_PROG + STEPS_PER_CHORD,
          quantizedEndStep: i*STEPS_PER_PROG + 2*STEPS_PER_CHORD
        });
        seq.notes.push({
          instrument: 10,
          program: 32,
          pitch: 36 + roots[2],
          quantizedStartStep: i*STEPS_PER_PROG + 2*STEPS_PER_CHORD,
          quantizedEndStep: i*STEPS_PER_PROG + 3*STEPS_PER_CHORD
        });
        seq.notes.push({
          instrument: 10,
          program: 32,
          pitch: 36 + roots[3],
          quantizedStartStep: i*STEPS_PER_PROG + 3*STEPS_PER_CHORD,
          quantizedEndStep: i*STEPS_PER_PROG + 4*STEPS_PER_CHORD
        });
      }

      // Set total sequence length.
      seq.totalQuantizedSteps = STEPS_PER_PROG * NUM_REPS;

      return seq;
    });
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
  var chordsText = state.chords.join(' ')
  var nextChordsText = state.nextChords.join(' ')
  text("chords: " + chordsText
      + (chordsText === nextChordsText ? '' : ' (next: ' + nextChordsText + ')'), x, y);
  y += lineHeight
  text("tempo: " + state.tempo
    + (state.tempo === state.nextTempo ? '' : ' (next: ' + state.nextTempo + ')'), x, y);
  y += lineHeight
  text("loop: #" + state.loopCount + ' ' + state.loopRep + '/' + LOOP_REPS, x, y)
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
  state.pollHandler = setInterval(pollParams, 1000);
});

function createPlayOnce(seq) {
  return () => {
    state.tempo = state.nextTempo
    state.loopRep = state.loopRep % LOOP_REPS + 1
    return player.start(seq, state.tempo)
  }
}

function playSeq() {
  player.stop()
  console.log("Playing", state.nextSeq);
  let seq = state.nextSeq;
  state.chords = state.nextChords
  state.nextSeq = null;
  state.loopCount += 1
  var playOnce = createPlayOnce(seq)
  var prevPromise = playOnce()
  for (var i = 0; i < LOOP_REPS - 1; ++i) {
    prevPromise = prevPromise.then(playOnce)
  }
  prevPromise.then(playSeq)
}
