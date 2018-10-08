import { data } from "@magenta/music";
const dl = ENV.globalMath; // currently you can't import 'deeplearn' twice, so we steal the existing one

// the "loopz" model was trained with an extra class, so we shift everything by one
export default class extends data.MelodyConverter {
  toTensor(noteSequence) {
    const buffer = dl
      .cast(super.toTensor(noteSequence).argMax(1), "float32")
      .buffer();
    for (let i = 0; i < this.numSteps; i++) {
      buffer.set(buffer.get(i) + 1, i);
    }
    return dl.oneHot(buffer.toTensor(), this.depth);
  }

  toNoteSequence(oh) {
    const buffer = dl.cast(oh.argMax(1), "float32").buffer();
    for (let i = 0; i < this.numSteps; i++) {
      buffer.set(buffer.get(i) - 1, i);
    }
    return super.toNoteSequence(dl.oneHot(buffer.toTensor(), this.depth));
  }
}
