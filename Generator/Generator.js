var MOOD = "vivid";
var INTENSITY = 1;

var numInterpolations = 12; 
var pitches1, pitches2;

if(MOOD === "soft") {
    pitches2 = [ 48, 50, 55, 57, 58, 60, 62, 63, 65, 67, 72, 84 ];
    pitches1 = [ 50, 64, 65, 69, 70 ];
}
if(MOOD == "vivid") {
    pitches2 = [ 67, 69, 71, 74, 76, 79, 81, 83, 84, 85, 86 ];
    pitches1 = [ 53, 57, 58, 60, 62, 64 ];
}

if(MOOD == "dark") {
    pitches2 = [ 48, 49, 54, 55, 56 ];
    pitches1 = [ 36, 37, 45, 46 ];
}

var loopLen = 1 / numInterpolations;

var MELODY1, MELODY2, MELODY3, MELODY4;
var melodiesModelCheckPoint = './data/mel_small';
var NUM_STEPS = 32; // DO NOT CHANGE.
var interpolatedNoteSequences1;
var interpolatedNoteSequences2;

new musicvae.MusicVAE(melodiesModelCheckPoint)
    .initialize()
    .then(function(musicVAE) {
        return musicVAE.interpolate([MELODY1, MELODY2], numInterpolations);
    })
    .then(function(noteSequences) {
        interpolatedNoteSequences1 = noteSequences;
        console.log("seq1 generated");
    });

new musicvae.MusicVAE(melodiesModelCheckPoint)
    .initialize()
    .then(function(musicVAE) {
        return musicVAE.interpolate([MELODY3, MELODY4], numInterpolations);
    })
    .then(function(noteSequences) {
        interpolatedNoteSequences2 = noteSequences;
        console.log("seq2 generated");
    });

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

generateMelodies();

var toggle = false;
window.addEventListener("click", () => {
    if(toggle) {
        startSequence();
    }
    if(!toggle) {
        endSequence();
    }
    toggle = !toggle;
});

function startSequence() {
    if(!interpolatedNoteSequences1) {
        return;
    }
    if(Tone.Transport.state === 'started') {
        Tone.Transport.stop();
    } else {
        Tone.Transport.start();
    }
    // start the loop
    setInterval(playSequence, 10);
}

function endSequence() {
    Tone.Transport.stop();
    clearInterval(playSequence);
}

var sequenceIndex = -1;
var stepIndex = -1;

function playSequence() {
    //here we calculate the percentage through melodies, between 0-1
    var totalPlayTime = (Tone.Transport.bpm.value * NUM_STEPS * numInterpolations) / 1000;
    var percent = Tone.Transport.seconds / totalPlayTime % 1;

    // INTENSITY should be set between 0 - (1-loopLen)
    if(INTENSITY + loopLen >= 1 ) INTENSITY = INTENSITY - loopLen;
    //var percent = (Date.now() % 6000 / 6000 / numInterpolations) + INTENSITY;

    //here we calculate the index of interpolatedNoteSequences
    //and currStepIndex is the note between 0-31 of that playback
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
        console.log(percent);
    }
}

function generateMelodies() {
    console.log("generating melodies...");
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
