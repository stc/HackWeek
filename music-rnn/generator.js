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

const SCENES = {
//  base: ['Am', 'D7', 'G', 'G'],
  base: ['G', 'C', 'G', 'D'],
  mainmenu: ['D', 'G', 'C', 'E'],
  level: ['E', 'A', 'E', 'B'],
  debrief: ['C', 'F', 'C', 'G'],
  explore: ['A', 'D', 'A', 'E'],
  factory: ['D', 'G', 'D', 'E'],
}

const SAD_SCENES = {
//  base: ['D0', 'B7', 'Em', 'Em'],
}

const SCENE_FREQ = {
  base: {
    happy: 10,
    sad: 5,
  },
  mainmenu: {
    happy: 1,
  },
  level: {
    happy: 20,
    sad: 10,
  },
  debrief: {
    happy: 2,
    sad: 1,
  },
  explore: {
    happy: 4,
  },
  factory: {
    happy: 2,
    sad: 1,
  },
}

const MOODS = ['happy', 'sad',]

function moodify(scene, mood) {
  return mood === 'happy' ? SCENES[scene] :
      SAD_SCENES[scene] ? SAD_SCENES[scene] :
      SCENES[scene].map(c => c + 'm')
}

var state = {
  melodies: {},
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
  };

  return model.continueSequence(seq, STEPS_PER_PROG + (NUM_REPS-1)*STEPS_PER_PROG - 1, 0.75, chords)
    .then((contSeq) => {
      return contSeq.notes.flatMap(note => [
        note.pitch,
        note.quantizedStartStep,
        note.quantizedEndStep - note.quantizedStartStep,
      ])
    });
}

function initLoops() {
  const composers = []
  const chordKeys = []
  Object.keys(SCENES).forEach(scene => {
    MOODS.forEach(mood => {
      const chords = moodify(scene, mood)
      for (let i = 0; i < (SCENE_FREQ[scene] && SCENE_FREQ[scene][mood] || 0); i++) {
        composers.push(compose(chords))
        chordKeys.push(chords.join())
      }
    })
  })
  Promise.all(composers)
  .then(seqs => {
    console.log('composed ' + seqs.length + ' new melodies')
    seqs.forEach((seq, i) => {
      const key = chordKeys[i]
      state.melodies[key] = state.melodies[key] || []
      state.melodies[key].push(seq)
    })
  })
  .then(saveState)
}

function setup() {
}

function draw() {
}

// Initialize model then start playing.
model.initialize().then(() => {
  document.getElementById('message').innerText = 'Done loading model.'
  initLoops()
});

const LS_KEY = 'genmusic-state'

function loadState() {
  state.melodies = JSON.parse(localStorage.getItem(LS_KEY)) || {}
}

loadState()

function saveState() {
  Object.keys(state.melodies).forEach(chordsKey => {
    console.log(chordsKey, state.melodies[chordsKey].length)
  })
  localStorage.setItem(LS_KEY, JSON.stringify(state.melodies))
}
