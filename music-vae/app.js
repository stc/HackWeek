var numInterpolations = 8; 

var everyNote = 'C,C#,D,D#,E,F,F#,G,G#,A,A#,B,'.repeat(20).split(',').map( function(x,i) {
    return x + '' + Math.floor(i/12);
});

function toMidi(note) {
    return everyNote.indexOf(note);
}

/*
var MELODY1 = { notes: [
    {pitch: toMidi('A3'), quantizedStartStep: 0, quantizedEndStep: 4},
    {pitch: toMidi('D4'), quantizedStartStep: 4, quantizedEndStep: 6},
    {pitch: toMidi('E4'), quantizedStartStep: 6, quantizedEndStep: 8},
    {pitch: toMidi('F4'), quantizedStartStep: 8, quantizedEndStep: 10},
    {pitch: toMidi('D4'), quantizedStartStep: 10, quantizedEndStep: 12},
    {pitch: toMidi('E4'), quantizedStartStep: 12, quantizedEndStep: 16},
    {pitch: toMidi('C4'), quantizedStartStep: 16, quantizedEndStep: 20},
    {pitch: toMidi('D4'), quantizedStartStep: 20, quantizedEndStep: 26},
    {pitch: toMidi('A3'), quantizedStartStep: 26, quantizedEndStep: 28},
    {pitch: toMidi('A3'), quantizedStartStep: 28, quantizedEndStep: 32}
]};
*/

var MELODY1= { notes: [
    {pitch: 50, quantizedStartStep: 0, quantizedEndStep: 12},
    {pitch: 62, quantizedStartStep: 12, quantizedEndStep: 20},
]};

var MELODY2 = { notes: [
    {pitch: 50, quantizedStartStep: 0, quantizedEndStep: 1},
    {pitch: 53, quantizedStartStep: 1, quantizedEndStep: 2},
    {pitch: 58, quantizedStartStep: 2, quantizedEndStep: 3},
    {pitch: 58, quantizedStartStep: 3, quantizedEndStep: 4},
    {pitch: 58, quantizedStartStep: 4, quantizedEndStep: 5},
    {pitch: 53, quantizedStartStep: 5, quantizedEndStep: 6},
    {pitch: 53, quantizedStartStep: 6, quantizedEndStep: 7},
    {pitch: 53, quantizedStartStep: 7, quantizedEndStep: 8},
    {pitch: 52, quantizedStartStep: 8, quantizedEndStep: 9},
    {pitch: 55, quantizedStartStep: 9, quantizedEndStep: 10},
    {pitch: 60, quantizedStartStep: 10, quantizedEndStep: 11},
    {pitch: 60, quantizedStartStep: 11, quantizedEndStep: 12},
    {pitch: 60, quantizedStartStep: 12, quantizedEndStep: 13},
    {pitch: 60, quantizedStartStep: 13, quantizedEndStep: 14},
    {pitch: 60, quantizedStartStep: 14, quantizedEndStep: 15},
    {pitch: 52, quantizedStartStep: 15, quantizedEndStep: 16},
    {pitch: 57, quantizedStartStep: 16, quantizedEndStep: 17},
    {pitch: 57, quantizedStartStep: 17, quantizedEndStep: 18},
    {pitch: 57, quantizedStartStep: 18, quantizedEndStep: 19},
    {pitch: 65, quantizedStartStep: 19, quantizedEndStep: 20},
    {pitch: 65, quantizedStartStep: 20, quantizedEndStep: 21},
    {pitch: 65, quantizedStartStep: 21, quantizedEndStep: 22},
    {pitch: 57, quantizedStartStep: 22, quantizedEndStep: 23},
    {pitch: 57, quantizedStartStep: 23, quantizedEndStep: 24},
    {pitch: 57, quantizedStartStep: 24, quantizedEndStep: 25},
    {pitch: 57, quantizedStartStep: 25, quantizedEndStep: 26},
    {pitch: 62, quantizedStartStep: 26, quantizedEndStep: 27},
    {pitch: 62, quantizedStartStep: 27, quantizedEndStep: 28},
    {pitch: 65, quantizedStartStep: 28, quantizedEndStep: 29},
    {pitch: 65, quantizedStartStep: 29, quantizedEndStep: 30},
    {pitch: 69, quantizedStartStep: 30, quantizedEndStep: 31},
    {pitch: 69, quantizedStartStep: 31, quantizedEndStep: 32}
]};

// var melodiesModelCheckPoint = 'https://storage.googleapis.com/download.magenta.tensorflow.org/models/music_vae/dljs/mel_big';
var melodiesModelCheckPoint = './data/mel_small';

var NUM_STEPS = 32; // DO NOT CHANGE.
var interpolatedNoteSequences;

new musicvae.MusicVAE(melodiesModelCheckPoint)
    .initialize()
    .then(function(musicVAE) {
        //blends between the given two melodies and returns numInterpolations note sequences
        // MELODY1 = musicVAE.sample(1, 0.5)[0]; //generates 1 new melody with 0.5 temperature. More temp means crazier melodies
        return musicVAE.interpolate([MELODY1, MELODY2], numInterpolations);
    })
    .then(function(noteSequences) {
        var text = 'Click to Play a blend from Melody 1 to Melody 2 in ' + numInterpolations + ' interpolations';
        document.querySelector('.loading').innerHTML = text;
        interpolatedNoteSequences = noteSequences;
    });

///////////////////////////////
//TONE.js setup for audio play back
var reverb = new Tone.Convolver(
'https://s3-us-west-2.amazonaws.com/s.cdpn.io/969699/hm2_000_ortf_48k.mp3').
toMaster();
reverb.wet.value = 0.15;

var samplesPath = 'https://storage.googleapis.com/melody-mixer/piano/';
var samples = {};
var NUM_NOTES = 88;
var MIDI_START_NOTE = 21;
for (var i = MIDI_START_NOTE; i < NUM_NOTES + MIDI_START_NOTE; i++) {
  samples[i] = samplesPath + i + '.mp3';
}

var players = new Tone.Players(samples, function onPlayersLoaded(){
    console.log("Tone.js players loaded");
}).connect(reverb);

var synth = new Tone.PolySynth(6, Tone.Synth, {
            "oscillator" : {
                "partials" : [100, 2, 3, 4],
            },
            "envelope"  : {
                attack  : 0.001 ,
                decay  : 0.01 ,
                sustain  : 0.3 ,
                release  : 1
            }
        }).connect(reverb);


function playNote(midiNote, numNoteHolds){
    var duration = Tone.Transport.toSeconds('8n') * (numNoteHolds || 1);
    var player = players.get(midiNote);
    player.fadeOut = 0.05;
    player.fadeIn = 0.01;
    player.start(Tone.now(), 0, duration);
}

function playSynth(midiNote,numNoteHolds) {
    //var duration = Tone.Transport.toSeconds('8n') * (numNoteHolds || 1);
    synth.triggerAttackRelease(Tone.Frequency(midiNote, "midi"), "8n");
}

var sequenceIndex = -1;
var stepIndex = -1;

///////////////////////////////
//p5.js setup
var TILE_SIZE = 150;
var WIDTH = TILE_SIZE * numInterpolations;
var HEIGHT = 170;
var START_COLOR;
var END_COLOR;

function setup() {
    createCanvas(WIDTH , HEIGHT);
    START_COLOR = color(60, 180, 203);
    END_COLOR = color(233, 72, 88);
    noStroke();
}

let count = 0;

function draw() {
    var index = if(mouseX>0 && mouseX < width) ceil(map(mouseX,0,width,0,numInterpolations-1));
    var totalPlayTime = (Tone.Transport.bpm.value * NUM_STEPS * numInterpolations) / 1000;
    var percent = (millis() % 4000 / 4000 / numInterpolations) + (TILE_SIZE / WIDTH * index);
    
    var currSequenceIndex = Math.floor(percent * numInterpolations);
    var currStepIndex = Math.floor((percent * numInterpolations - currSequenceIndex) * NUM_STEPS);
    function isCurrentStep(note) {
        return note.quantizedStartStep === currStepIndex;
    }
    if(Tone.Transport.state === 'started') { //playback started
        if(currStepIndex != stepIndex) {
            //here we search through all notes and find any that match our current step index
            var notes = interpolatedNoteSequences[currSequenceIndex].notes.filter(isCurrentStep);
            notes.forEach(function(note) {
                var noteDuration = note.quantizedEndStep - note.quantizedStartStep;
                //playNote(note.pitch, noteDuration);
                playSynth(note.pitch);
                print(note.pitch);
            });
        }
        sequenceIndex = currSequenceIndex;
        stepIndex = currStepIndex;
    }

    //Draw Tiles + Notes
    //Drawing Tiles + notes
    background(38);
    for(var i = 0; i < numInterpolations; i++){
        var x = i * TILE_SIZE;
        var y = HEIGHT-TILE_SIZE;
        var currColor = lerpColor(START_COLOR, END_COLOR, i / numInterpolations);
        //use currColor but at 50% opacity
        fill(red(currColor), green(currColor), blue(currColor), 125);
        rect(x, y, TILE_SIZE, TILE_SIZE);
        fill(currColor);
        if(interpolatedNoteSequences){
            drawNotes(interpolatedNoteSequences[i].notes, x, y, TILE_SIZE, TILE_SIZE);
        }

    }
    fill(255, 64);
    rect(percent * WIDTH, 0, TILE_SIZE / NUM_STEPS, HEIGHT);
    text(sequenceIndex + " - " + currStepIndex, 15, 15);
}

function mousePressed() {
    if(!interpolatedNoteSequences) {
        return;
    }
    var loadingSpan = document.querySelector('.loading');
    if(Tone.Transport.state === 'started') {
        Tone.Transport.stop();
        loadingSpan.innerHTML = 'Play';
    } else {
        Tone.Transport.start();
        loadingSpan.innerHTML = 'Pause';
    }
}

function drawNotes(notes, x, y, width, height) {
    push();
    translate(x, y);
    var cellWidth = width / NUM_STEPS;
    var cellHeight = height / NUM_NOTES;
    notes.forEach(function(note) {
        var emptyNoteSpacer = 1;
        rect(emptyNoteSpacer + cellWidth * note.quantizedStartStep, height - cellHeight * (note.pitch-MIDI_START_NOTE),
            cellWidth * (note.quantizedEndStep - note.quantizedStartStep) - emptyNoteSpacer, cellHeight);
    });
    pop();
}
