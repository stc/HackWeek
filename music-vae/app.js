var numInterpolations = 12; 

var everyNote = 'C,C#,D,D#,E,F,F#,G,G#,A,A#,B,'.repeat(20).split(',').map( function(x,i) {
    return x + '' + Math.floor(i/12);
});

function toMidi(note) {
    return everyNote.indexOf(note);
}

var pitches2 = [ 48, 50, 55, 57, 58, 60, 62, 63, 65, 67, 72, 84 ];
var pitches1 = [ 50, 64, 65, 69, 70 ];

var offset = 0;

var MELODY1, MELODY2, MELODY3, MELODY4;

// var melodiesModelCheckPoint = 'https://storage.googleapis.com/download.magenta.tensorflow.org/models/music_vae/dljs/mel_big';
var melodiesModelCheckPoint = './data/mel_small';

var NUM_STEPS = 32; // DO NOT CHANGE.
var interpolatedNoteSequences1;
var interpolatedNoteSequences2;

new musicvae.MusicVAE(melodiesModelCheckPoint)
    .initialize()
    .then(function(musicVAE) {
        //blends between the given two melodies and returns numInterpolations note sequences
        // MELODY1 = musicVAE.sample(1, 0.5)[0]; //generates 1 new melody with 0.5 temperature. More temp means crazier melodies
        return musicVAE.interpolate([MELODY1, MELODY2], numInterpolations);
    })
    .then(function(noteSequences) {
        interpolatedNoteSequences1 = noteSequences;
    });

new musicvae.MusicVAE(melodiesModelCheckPoint)
    .initialize()
    .then(function(musicVAE) {
        //blends between the given two melodies and returns numInterpolations note sequences
        // MELODY1 = musicVAE.sample(1, 0.5)[0]; //generates 1 new melody with 0.5 temperature. More temp means crazier melodies
        return musicVAE.interpolate([MELODY3, MELODY4], numInterpolations);
    })
    .then(function(noteSequences) {
        interpolatedNoteSequences2 = noteSequences;
    });

///////////////////////////////
//TONE.js setup for audio play back
var reverb = new Tone.Convolver(
'https://s3-us-west-2.amazonaws.com/s.cdpn.io/969699/hm2_000_ortf_48k.mp3').
toMaster();
reverb.wet.value = 0.04;

var chorus = new Tone.Chorus(0.2, 2.5, 0.2).connect(reverb);
var phaser = new Tone.Phaser({
    "frequency" : 0.1,
    "octaves" : 2,
    "baseFrequency" : 400
}).toMaster();

var NUM_NOTES = 88;
var MIDI_START_NOTE = 21;

var synth1 = new Tone.PolySynth(6, Tone.Synth, {
            "oscillator" : {
                "partials" : [100, 2, 30, 4],
            },
            "envelope"  : {
                attack  : 0.01 ,
                decay  : 0.1 ,
                sustain  : 0.1 ,
                release  : 2
            },

        }).connect(chorus);

var synth2 = new Tone.PolySynth(6, Tone.Synth, {
            "oscillator" : {
                "partials" : [1, 2, 3, 4],
            },
            "envelope"  : {
                attack  : 2 ,
                decay  : 3 ,
                sustain  : 2 ,
                release  : 6
            }
        }).connect(phaser);

var synthDrum = new Tone.MembraneSynth().toMaster();
var synthHigh = new Tone.MetalSynth({
    "envelope"  : {
        attack  : 0.001 ,
        decay  : 0.1 ,
        release  : 0.1
    }
    }).connect(phaser);


function playSynth1(midiNote,numNoteHolds) {
    //var duration = Tone.Transport.toSeconds('8n') * (numNoteHolds || 1);
synth1.volume.value = -10;
    synth1.triggerAttackRelease(Tone.Frequency(midiNote, "midi"), "8n");
}

function playSynth2(midiNote,numNoteHolds) {
    //var duration = Tone.Transport.toSeconds('8n') * (numNoteHolds || 1);

    synth2.triggerAttackRelease(Tone.Frequency(midiNote, "midi"), "8n");
}

var sequenceIndex = -1;
var stepIndex = -1;

///////////////////////////////
//p5.js setup
var TILE_SIZE = 150;
var WIDTH = TILE_SIZE * numInterpolations;
var HEIGHT = 500;
var START_COLOR;
var END_COLOR;

function setup() {
    createCanvas(WIDTH , HEIGHT);
    START_COLOR = color(60, 180, 203);
    END_COLOR = color(233, 72, 88);
    noStroke();

    generateMelodies();
}

let count = 0;

function draw() {
    if(mouseX>0 && mouseX < width) {
     offset = ceil(map(mouseX,0,width,0,numInterpolations-1));
    }
    var totalPlayTime = (Tone.Transport.bpm.value * NUM_STEPS * numInterpolations) / 1000;
    var percent = (millis() % 6000 / 6000 / numInterpolations) + (TILE_SIZE / WIDTH * offset);
    
    var currSequenceIndex = Math.floor(percent * numInterpolations);
    var currStepIndex = Math.floor((percent * numInterpolations - currSequenceIndex) * NUM_STEPS);
    function isCurrentStep(note) {
        return note.quantizedStartStep === currStepIndex;
    }
    if(Tone.Transport.state === 'started') { //playback started
        if(currStepIndex != stepIndex) {
            var notes1 = interpolatedNoteSequences1[currSequenceIndex].notes.filter(isCurrentStep);
            notes1.forEach(function(note) {
                var noteDuration = note.quantizedEndStep - note.quantizedStartStep;
                playSynth1(note.pitch);  
                var r= Math.random(); 
                if (r > 0.7) {
                    synthHigh.resonance = Math.random()*2000  + 500;
                    synthHigh.volume.value = - (Math.random() * 100) - 16;
                    synthHigh.triggerAttackRelease("16n");
                }

            });
            var notes2 = interpolatedNoteSequences2[currSequenceIndex].notes.filter(isCurrentStep);
            notes2.forEach(function(note) {
                var noteDuration = note.quantizedEndStep - note.quantizedStartStep;
                playSynth2(note.pitch);

                var r= Math.random(); 
                if (r > 0.8) {
                    synthDrum.triggerAttackRelease("C2", "8n");
                }
                
            });
            var r= Math.random(); 
                if (r > 0.9) {
                    synthDrum.triggerAttackRelease("A1", "8n");
                }
        }
        sequenceIndex = currSequenceIndex;
        stepIndex = currStepIndex;
    }

    background(38);
    for(var i = 0; i < numInterpolations; i++){
        var x = i * TILE_SIZE;
        var y = 50;
        var currColor = lerpColor(START_COLOR, END_COLOR, i / numInterpolations);
        //use currColor but at 50% opacity
        fill(red(currColor), green(currColor), blue(currColor), 125);
        rect(x, y, TILE_SIZE, TILE_SIZE);
        fill(currColor);
        if(interpolatedNoteSequences1){
            drawNotes(interpolatedNoteSequences1[i].notes, x, y, TILE_SIZE, TILE_SIZE);
        }
    }
    for(var i = 0; i < numInterpolations; i++){
        var x = i * TILE_SIZE;
        var y = 210;
        var currColor = lerpColor(START_COLOR, END_COLOR, i / numInterpolations);
        //use currColor but at 50% opacity
        fill(red(currColor), green(currColor), blue(currColor), 125);
        rect(x, y, TILE_SIZE, TILE_SIZE);
        fill(currColor);
        if(interpolatedNoteSequences2){
            drawNotes(interpolatedNoteSequences2[i].notes, x, y, TILE_SIZE, TILE_SIZE);
        }
    }
    fill(255, 64);
    rect(percent * WIDTH, 0, TILE_SIZE / NUM_STEPS, HEIGHT);
    text(sequenceIndex + " - " + currStepIndex, 15, 15);
}

function mousePressed() {
    if(!interpolatedNoteSequences1) {
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

function generateMelodies() {
    var seed0 = Math.floor(Math.random() * 8);
    var seed1 = Math.floor(Math.random() * 8);
    var seed2 = Math.floor(Math.random() * 6);
    var seed3 = Math.floor(Math.random() * 6)

    MELODY1= { notes: [
        {pitch: pitches1[ Math.floor(Math.random() * pitches1.length-1) ], quantizedStartStep: 0, quantizedEndStep: seed0},
        {pitch: pitches1[ Math.floor(Math.random() * pitches1.length-1) ], quantizedStartStep: seed0 , quantizedEndStep: seed0 + seed1},
        {pitch: pitches1[ Math.floor(Math.random() * pitches1.length-1) ], quantizedStartStep: seed0 + seed1, quantizedEndStep: seed0 + seed1 + 8},
        
    ]};

    MELODY2 = { notes: [
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 0, quantizedEndStep: 1},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 1, quantizedEndStep: 2},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 2, quantizedEndStep: 3},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 3, quantizedEndStep: 4},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 4, quantizedEndStep: 5},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 5, quantizedEndStep: 6},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 6, quantizedEndStep: 7},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 7, quantizedEndStep: 8},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 8, quantizedEndStep: 9},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 9, quantizedEndStep: 10},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 10, quantizedEndStep: 11},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 11, quantizedEndStep: 12},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 12, quantizedEndStep: 13},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 13, quantizedEndStep: 14},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 14, quantizedEndStep: 15},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 15, quantizedEndStep: 16},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 16, quantizedEndStep: 17},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 17, quantizedEndStep: 18},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 18, quantizedEndStep: 19},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 19, quantizedEndStep: 20},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 20, quantizedEndStep: 21},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 21, quantizedEndStep: 22},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 22, quantizedEndStep: 23},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 23, quantizedEndStep: 24},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 24, quantizedEndStep: 25},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 25, quantizedEndStep: 26},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 26, quantizedEndStep: 27},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 27, quantizedEndStep: 28},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 28, quantizedEndStep: 29},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 29, quantizedEndStep: 30},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 30, quantizedEndStep: 31},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 31, quantizedEndStep: 32}
    ]};

    MELODY3= { notes: [
        {pitch: pitches1[ Math.floor(Math.random() * pitches1.length-1) ], quantizedStartStep: seed2, quantizedEndStep: seed2 + seed3},
        {pitch: pitches1[ Math.floor(Math.random() * pitches1.length-1) ], quantizedStartStep: seed2 + seed3, quantizedEndStep: seed2 + seed3 + 16},
    ]};

    MELODY4 = { notes: [
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 0, quantizedEndStep: 2},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 2, quantizedEndStep: 4},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 4, quantizedEndStep: 6},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 6, quantizedEndStep: 8},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 8, quantizedEndStep: 10},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 10, quantizedEndStep: 12},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 12, quantizedEndStep: 14},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 14, quantizedEndStep: 16},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 16, quantizedEndStep: 18},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 18, quantizedEndStep: 20},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 20, quantizedEndStep: 22},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 22, quantizedEndStep: 24},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 24, quantizedEndStep: 26},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 26, quantizedEndStep: 28},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 28, quantizedEndStep: 30},
        {pitch: pitches2[ Math.floor(Math.random() * pitches2.length-1) ], quantizedStartStep: 30, quantizedEndStep: 32},
        
    ]};
}
