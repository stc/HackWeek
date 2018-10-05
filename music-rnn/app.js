// NOTE:
/*

Very ugly hack => music.js is a downloaded magenta distro, where playNote function has been overwritten to access
individual notes from the sequence.
UI is made with p5js, sound is produced with tonejs ATM

*/

// Number of steps to play each chord.
STEPS_PER_CHORD = 32;
STEPS_PER_PROG = 4 * STEPS_PER_CHORD;

// Number of times to repeat chord progression.
NUM_REPS = 1;

tempo = 180;

nextSeq = null;

// Set up Improv RNN model and player.
const model = new mm.MusicRNN('https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/chord_pitches_improv');
const player = new mm.Player(true,printMe);

function printMe(e) {
  // console.log(e);
}

let moods = {
  "happy" : [
    ["A", "D", "C", "E"],
    ["D", "G", "C", "E"],
    ["G", "A", "D", "A"]
  ],
  "sad" : [
    ["Am", "Dm", "Cm", "Em"],
    ["Dm", "Gm", "Cm", "Em"],
    ["Gm", "Am", "Dm", "Am"]
  ],
};


function pollParams() {
  let params = {
    "mood" : "happy", // "happy" or "sad"
    "character" : 1, // 1 - 3
    "tempo" : Math.random(),  //0.29724919083554, // 0.0 - 1.0
    "intensity" : 0.3 // 0.0 - 1.0
  };


  let chords = moods[params.mood][params.character];
  tempo = Math.round(100 + (params.tempo * 100) + (params.intensity * 100));

    console.log("Polled", params, chords, tempo);

  if (!nextSeq) {
    compose(chords).then(seq => {
      nextSeq = seq;
      playSeq()
    });
  } else {
    compose(chords).then(seq => {
      nextSeq = seq;
    });
  }
}

// returns an improvised Sequence over the specifed chord progression.
const compose = (chords) => {
  
  // Prime with root note of the first chord.
  const root = mm.chords.ChordSymbols.root(chords[0]);
  const seq = { 
    quantizationInfo: {stepsPerQuarter: 4},
    notes: [],
    totalQuantizedSteps: 1
  };  
  
  return model.continueSequence(seq, STEPS_PER_PROG + (NUM_REPS-1)*STEPS_PER_PROG - 1, 0.75, chords)
    .then((contSeq) => {
      // Add the continuation to the original.
      contSeq.notes.forEach((note) => {
        note.quantizedStartStep += 1;
        note.quantizedEndStep += 1;
        // note.velocity = Math.round(Math.random() * 127);
        // note.program = Math.round(Math.random() * 127);
        seq.notes.push(note);
      });
    
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
  createCanvas(400,400);
}

function draw() {
  background(20);
  textSize(14);
    fill(255);
    text("current chords:", 50, 20);
  // for(let i=0;i<currentChords.length;i++) {
  //   text( currentChords[i], 50, i * 30 + 40);
  // }
  fill(200,0,100);
  text("Click to play", 50, 300);
}

function mouseReleased() {
  // playSeq();
}

// Initialize model then start playing.
model.initialize().then(() => {
  document.getElementById('message').innerText = 'Done loading model.'
  mm.Player.tone.context.resume();
  setInterval(pollParams, 1000);
});

function currentTempo() {
  return tempo;
}

// Play when play button is clicked.
function playSeq() {
  console.log("Playing", nextSeq);
  let seq = nextSeq;
  player.start(seq, currentTempo()).then(() => {
    player.start(seq, currentTempo()).then(() => {
      player.start(seq, currentTempo()).then(() => {
        player.start(seq, currentTempo()).then(() => {
          playSeq();
        });
      });
    });
  });
}