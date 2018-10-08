import { isDeviceSupported, MusicVAE } from "@magenta/music-vae";
// import { data } from "@magenta/music";
// import LoopzMelodyConverter from "./loopz_melody_converter";

// const CHECKPOINT_URL = "https://teampieshop.github.io/loopz-checkpoint";
const CHECKPOINT_URL =
  "https://storage.googleapis.com/download.magenta.tensorflow.org/models/music_vae/dljs/mel_small";
const SEQUENCE_LENGTH = 32;

const toNoteSequence = pitches => ({
  notes: pitches
    .map((pitch, i) => ({
      pitch,
      quantizedStartStep: i,
      quantizedEndStep: i + 1
    }))
    .filter(({ pitch }) => pitch !== 0)
});

const fromNoteSequence = sequence => {
  const pitches = Array(SEQUENCE_LENGTH).fill(0);
  for (const note of sequence.notes) {
    pitches[note.quantizedStartStep] = note.pitch;
  }
  return pitches;
};

let _loadingModel;
export const loadModel = () => {
  // if (!_loadingModel) {
  //   const converter = new data.MelodyConverter(SEQUENCE_LENGTH, 2, 130);
  //   // const converter = new LoopzMelodyConverter(SEQUENCE_LENGTH, 2, 130);
  //   _loadingModel = new MusicVAE(CHECKPOINT_URL, converter).initialize();
  // }
  // return _loadingModel;

  return new MusicVAE(CHECKPOINT_URL).initialize();
};

const encodeAndDecodeMelodies = (melodies, latent_dim) => {
  if (!isDeviceSupported) {
    console.log("device not supported!");
    return;
  }

  return loadModel().then(mvae => mvae.interpolate(melodies, latent_dim));
};

export function getLatentSpace(
  [topLeft, topRight, bottomLeft, bottomRight],
  latent_dim,
  done
) {
  console.log("begin encodeAndDecode");
  let start = new Date();
  const cornerMelodies = [topLeft, bottomLeft, topRight, bottomRight].map(
    toNoteSequence
  );
  encodeAndDecodeMelodies(cornerMelodies, latent_dim).then(melodies => {
    const result = melodies.map(fromNoteSequence);
    console.log(`finished in ${(new Date() - start) / 1000}s`);
    done(result);
  });
}
