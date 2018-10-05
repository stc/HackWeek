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

TEMPO = 180;

// Set up Improv RNN model and player.
const model = new mm.MusicRNN('https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/chord_pitches_improv');
const player = new mm.Player(true,printMe);
var playing = false;

function printMe(e) {
  console.log(e);
}

// Current chords being played.
let currentChords = [
    "Am",
    "Dm",
    "Cm",
    "Em"
  ];

// Sample over chord progression.
const playOnce = () => {
  const chords = currentChords;
  
  // Prime with root note of the first chord.
  const root = mm.chords.ChordSymbols.root(chords[0]);
  const seq = { 
    quantizationInfo: {stepsPerQuarter: 4},
    notes: [],
    totalQuantizedSteps: 1
  };  
  
  model.continueSequence(seq, STEPS_PER_PROG + (NUM_REPS-1)*STEPS_PER_PROG - 1, 0.9, chords)
    .then((contSeq) => {
      // Add the continuation to the original.
      contSeq.notes.forEach((note) => {
        note.quantizedStartStep += 1;
        note.quantizedEndStep += 1;
        seq.notes.push(note);
      });
    
      const roots = chords.map(mm.chords.ChordSymbols.root);
      for (var i=0; i<NUM_REPS; i++) { 
        // Add the bass progression.
        seq.notes.push({
          instrument: 1,
          program: 32,
          pitch: 36 + roots[0],
          quantizedStartStep: i*STEPS_PER_PROG,
          quantizedEndStep: i*STEPS_PER_PROG + STEPS_PER_CHORD
        });
        seq.notes.push({
          instrument: 1,
          program: 32,
          pitch: 36 + roots[1],
          quantizedStartStep: i*STEPS_PER_PROG + STEPS_PER_CHORD,
          quantizedEndStep: i*STEPS_PER_PROG + 2*STEPS_PER_CHORD
        });
        seq.notes.push({
          instrument: 1,
          program: 32,
          pitch: 36 + roots[2],
          quantizedStartStep: i*STEPS_PER_PROG + 2*STEPS_PER_CHORD,
          quantizedEndStep: i*STEPS_PER_PROG + 3*STEPS_PER_CHORD
        });
        seq.notes.push({
          instrument: 1,
          program: 32,
          pitch: 36 + roots[3],
          quantizedStartStep: i*STEPS_PER_PROG + 3*STEPS_PER_CHORD,
          quantizedEndStep: i*STEPS_PER_PROG + 4*STEPS_PER_CHORD
        });        
      }
    
      // Set total sequence length.
      seq.totalQuantizedSteps = STEPS_PER_PROG * NUM_REPS;
    
      // Play it!
      player.start(seq, TEMPO).then(() => {
        //playing = false;
        //document.getElementById('message').innerText = 'Change chords and play again!';
        //checkChords();
      });
    })
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
  for(let i=0;i<currentChords.length;i++) {
    text( currentChords[i], 50, i * 30 + 40);
  }
  fill(200,0,100);
  text("Click to play", 50, 300);
}

function mouseReleased() {
  playSeq();
}

// Initialize model then start playing.
model.initialize().then(() => {
  document.getElementById('message').innerText = 'Done loading model.'
});


var slider = document.getElementById("tempo");
slider.oninput = function() {
  TEMPO = this.value;
}

// Play when play button is clicked.
function playSeq() {
  playing = true;
  mm.Player.tone.context.resume();
  player.stop();
  playOnce();
}