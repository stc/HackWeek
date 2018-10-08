import Tone from "tone";

import WebMidi from "WebMidi";

const every_note = "C,C#,D,D#,E,F,F#,G,G#,A,A#,B,"
  .repeat(20)
  .split(",")
  .map((x, i) => `${x}${Math.floor(i / 12)}`);

export class MusicService {
  constructor(
    use_midi = false,
    use_midi_clock = false,
    instrument_type = "synth",
    midi_out_number = 0,
    midi_clock_number = 1,
    cb = () => {}
  ) {
    this.use_midi = use_midi;
    this.use_midi_clock = use_midi_clock;

    WebMidi.enable(err => {
      if (err) {
        cb([]);
      } else {
        // cb( WebMidi.outputs.map( x=> x.name) )
        // XXX untested
        cb();
      }
      // console.log(WebMidi.outputs);
      this.num_midi_outputs = WebMidi.outputs.length;
      this.midiOut = WebMidi.outputs[midi_out_number];
      this.midi_clock = WebMidi.outputs[midi_clock_number];
      this.tempo; //tempo in 24ppq
      this.beatCounter = 0;

      //console.log('selected output: ', this.midiOut, ', midi_clock: ', this.midi_clock);
    });
    if (use_midi) {
      this.midi_instrument = midi_out_number;
      console.log("selected midi output: ", this.midi_instrument);
    } else {
      // Tone.Buffer.on("load", function()
      // for monotonic
      this.all_tone_instruments = {
        synth: new Tone.Synth().toMaster(),
        piano: create_piano()
      };
      this.tone_instrument = instrument_type;
    }

    // for polyphonic
    // this.instrument = new Tone.PolySynth(4, Tone.MonoSynth).toMaster()
  }
  rowToPitch(row, num_pitches, tonic, mode) {
    let scale = this.get_scale(tonic, mode);
    let note = num_pitches - row - 1;
    return scale[note];
  }
  pitchToRow(pitch, num_pitches, tonic, mode) {
    let scale = this.get_scale(tonic, mode);
    let pos = scale.indexOf(pitch);
    return num_pitches - pos - 1;
  }
  transposeSequence(
    sequence,
    to_tonic,
    from_tonic,
    to_mode,
    from_mode,
    num_pitches
  ) {
    for (let i = 0; i < sequence.length; i++) {
      if (sequence[i] != 0 && sequence[i] != null) {
        let pitch_id = sequence[i];
        let row_id = this.pitchToRow(
          pitch_id,
          num_pitches,
          from_tonic,
          from_mode
        );
        sequence[i] = this.rowToPitch(row_id, num_pitches, to_tonic, to_mode);
      }
    }
    return sequence;
  }
  playNote(pitch_num, note_duration) {
    if (pitch_num <= 2) {
      return;
    }
    if (this.use_midi) {
      this.midiOut.playNote(pitch_num, 1, { duration: note_duration });
    } else {
      let n = every_note[pitch_num];
      this.all_tone_instruments[this.tone_instrument].triggerAttackRelease(
        `${n}`,
        "16n"
      );
    }
  }
  startSequence(on_time, num_hits, draw = x => x) {
    this.stopSequence();

    if (this.use_midi_clock) {
      console.log("midiclock");
      let clock_hits = new Array(num_hits * 6).fill(0).map((x, i) => i);
      this.start_midi_clock();
      let toneClock = this.midi_clock;

      this.sequenceLoop = new Tone.Sequence(
        function(time, i) {
          toneClock.send([0xf8]);
          if (i % 6 == 0) {
            on_time(i / 6);
            Tone.Draw.schedule(function(time) {
              draw(i / 6);
            }, time);
          }
        },
        clock_hits,
        "8i"
      );
    } else {
      let hits = new Array(num_hits).fill(0).map((x, i) => i);
      this.sequenceLoop = new Tone.Sequence(
        (time, i) => {
          on_time(i);
          Tone.Draw.schedule(function(time) {
            draw(i);
          }, time);
        },
        hits,
        "16n"
      );
    }

    Tone.Transport.start();
    this.sequenceLoop.start();
  }
  changeBpm(bpm) {
    Tone.Transport.bpm.value = bpm;
    //calculate the MIDI clock (24ppq)
    this.tempo = 60 / bpm / 24;
  }
  changeInstrument(instrument_type) {
    this.tone_instrument = instrument_type; //== 'synth' ? new Tone.Synth().toMaster() : create_piano()
  }
  changeMidiInstrument(midi_out_number) {
    this.midi_instrument = midi_out_number;
    this.midiOut = WebMidi.outputs[midi_out_number];
  }
  changeMidiClock(midi_clock_number) {
    this.midi_clock_bus = midi_clock_number;
    this.midi_clock = WebMidi.outputs[midi_clock_number];
  }
  getMidiInstrumentOptions() {
    let names = WebMidi.outputs.map(x => x.name);
    return names.reduce((f, x, i) => {
      f[x] = i;
      return f;
    }, {});
  }
  get_scale(current_tonic, current_mode) {
    return create_scale(current_mode, current_tonic);
  }
  stopSequence() {
    if (this.sequenceLoop) {
      // console.log('stop')
      this.sequenceLoop.stop();
      Tone.Transport.stop();
      if (this.use_midi_clock) {
        this.stop_midi_clock();
      }
    }
  }
  setOutput(v) {
    this.use_midi = v;
  }
  setClock(v) {
    this.use_midi_clock = v;
  }

  //Stops the MIDI clock
  stop_midi_clock() {
    this.midi_clock.send([0xfc]);
  }
  //Starts the MIDI Clock
  start_midi_clock() {
    this.midi_clock.send([0xfa]);
  }
  //Sends MIDI Clock Pulse
  pulse_midi_clock() {
    this.midi_clock.send([0xf8]);
  }
}

function create_piano() {
  let piano = new Tone.Sampler(
    {
      A0: "A0.[mp3|ogg]",
      C1: "C1.[mp3|ogg]",
      "D#1": "Ds1.[mp3|ogg]",
      "F#1": "Fs1.[mp3|ogg]",
      A1: "A1.[mp3|ogg]",
      C2: "C2.[mp3|ogg]",
      "D#2": "Ds2.[mp3|ogg]",
      "F#2": "Fs2.[mp3|ogg]",
      A2: "A2.[mp3|ogg]",
      C3: "C3.[mp3|ogg]",
      "D#3": "Ds3.[mp3|ogg]",
      "F#3": "Fs3.[mp3|ogg]",
      A3: "A3.[mp3|ogg]",
      C4: "C4.[mp3|ogg]",
      "D#4": "Ds4.[mp3|ogg]",
      "F#4": "Fs4.[mp3|ogg]",
      A4: "A4.[mp3|ogg]",
      C5: "C5.[mp3|ogg]",
      "D#5": "Ds5.[mp3|ogg]",
      "F#5": "Fs5.[mp3|ogg]",
      A5: "A5.[mp3|ogg]",
      C6: "C6.[mp3|ogg]",
      "D#6": "Ds6.[mp3|ogg]",
      "F#6": "Fs6.[mp3|ogg]",
      A6: "A6.[mp3|ogg]",
      C7: "C7.[mp3|ogg]",
      "D#7": "Ds7.[mp3|ogg]",
      "F#7": "Fs7.[mp3|ogg]",
      A7: "A7.[mp3|ogg]",
      C8: "C8.[mp3|ogg]"
    },
    {
      release: 1,
      baseUrl: "https://tonejs.github.io/examples/audio/salamander/"
    }
  ).toMaster();
  return piano;
}

var max_num_pitches = 40;
//var tonic = 48;
// { pentatonic: 0, 'pentatonic minor': 1, major: 2, minor: 3, chromatic: 4 }
function create_scale(current_mode, current_tonic) {
  let tonic = 48 + parseInt(current_tonic); //12, 24, 36, 48 are C
  var scale_pitches = [];
  if (current_mode == 0) {
    //pentatonic
    for (var i = 0; i < max_num_pitches; i++) {
      if (i % 5 == 0) {
        scale_pitches[i] = tonic + 12 * Math.floor(i / 5);
      }
      if (i % 5 == 1) {
        scale_pitches[i] = tonic + 12 * Math.floor(i / 5) + 2;
      }
      if (i % 5 == 2) {
        scale_pitches[i] = tonic + 12 * Math.floor(i / 5) + 4;
      }
      if (i % 5 == 3) {
        scale_pitches[i] = tonic + 12 * Math.floor(i / 5) + 7;
      }
      if (i % 5 == 4) {
        scale_pitches[i] = tonic + 12 * Math.floor(i / 5) + 9;
      }
    }
  }

  if (current_mode == 1) {
    //pentatonic minor
    for (var i = 0; i < max_num_pitches; i++) {
      if (i % 5 == 0) {
        scale_pitches[i] = tonic + 12 * Math.floor(i / 5);
      }
      if (i % 5 == 1) {
        scale_pitches[i] = tonic + 12 * Math.floor(i / 5) + 3;
      }
      if (i % 5 == 2) {
        scale_pitches[i] = tonic + 12 * Math.floor(i / 5) + 5;
      }
      if (i % 5 == 3) {
        scale_pitches[i] = tonic + 12 * Math.floor(i / 5) + 7;
      }
      if (i % 5 == 4) {
        scale_pitches[i] = tonic + 12 * Math.floor(i / 5) + 10;
      }
    }
  }

  if (current_mode == 2) {
    //major
    for (var i = 0; i < max_num_pitches; i++) {
      if (i % 7 == 0) {
        scale_pitches[i] = tonic + 12 * Math.floor(i / 7);
      }
      if (i % 7 == 1) {
        scale_pitches[i] = tonic + 12 * Math.floor(i / 7) + 2;
      }
      if (i % 7 == 2) {
        scale_pitches[i] = tonic + 12 * Math.floor(i / 7) + 4;
      }
      if (i % 7 == 3) {
        scale_pitches[i] = tonic + 12 * Math.floor(i / 7) + 5;
      }
      if (i % 7 == 4) {
        scale_pitches[i] = tonic + 12 * Math.floor(i / 7) + 7;
      }
      if (i % 7 == 5) {
        scale_pitches[i] = tonic + 12 * Math.floor(i / 7) + 9;
      }
      if (i % 7 == 6) {
        scale_pitches[i] = tonic + 12 * Math.floor(i / 7) + 11;
      }
    }
  }

  if (current_mode == 3) {
    //minor
    for (var i = 0; i < max_num_pitches; i++) {
      if (i % 7 == 0) {
        scale_pitches[i] = tonic + 12 * Math.floor(i / 7);
      }
      if (i % 7 == 1) {
        scale_pitches[i] = tonic + 12 * Math.floor(i / 7) + 2;
      }
      if (i % 7 == 2) {
        scale_pitches[i] = tonic + 12 * Math.floor(i / 7) + 3;
      }
      if (i % 7 == 3) {
        scale_pitches[i] = tonic + 12 * Math.floor(i / 7) + 5;
      }
      if (i % 7 == 4) {
        scale_pitches[i] = tonic + 12 * Math.floor(i / 7) + 7;
      }
      if (i % 7 == 5) {
        scale_pitches[i] = tonic + 12 * Math.floor(i / 7) + 8;
      }
      if (i % 7 == 6) {
        scale_pitches[i] = tonic + 12 * Math.floor(i / 7) + 10;
      }
    }
  }

  if (current_mode == 4) {
    //chromatic
    for (var i = 0; i < max_num_pitches; i++) {
      if (i % 12 == 0) {
        scale_pitches[i] = tonic + 12 * Math.floor(i / 12);
      }
      if (i % 12 == 1) {
        scale_pitches[i] = tonic + 12 * Math.floor(i / 12) + 1;
      }
      if (i % 12 == 2) {
        scale_pitches[i] = tonic + 12 * Math.floor(i / 12) + 2;
      }
      if (i % 12 == 3) {
        scale_pitches[i] = tonic + 12 * Math.floor(i / 12) + 3;
      }
      if (i % 12 == 4) {
        scale_pitches[i] = tonic + 12 * Math.floor(i / 12) + 4;
      }
      if (i % 12 == 5) {
        scale_pitches[i] = tonic + 12 * Math.floor(i / 12) + 5;
      }
      if (i % 12 == 6) {
        scale_pitches[i] = tonic + 12 * Math.floor(i / 12) + 6;
      }
      if (i % 12 == 7) {
        scale_pitches[i] = tonic + 12 * Math.floor(i / 12) + 7;
      }
      if (i % 12 == 8) {
        scale_pitches[i] = tonic + 12 * Math.floor(i / 12) + 8;
      }
      if (i % 12 == 9) {
        scale_pitches[i] = tonic + 12 * Math.floor(i / 12) + 9;
      }
      if (i % 12 == 10) {
        scale_pitches[i] = tonic + 12 * Math.floor(i / 12) + 10;
      }
      if (i % 12 == 11) {
        scale_pitches[i] = tonic + 12 * Math.floor(i / 12) + 11;
      }
    }
  }
  return scale_pitches;
}
