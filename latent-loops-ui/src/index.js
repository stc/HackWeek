// import React from 'react';

import App from "./app";
import * as d3 from "d3";

// import { Array3D, Array2D, CheckpointLoader, NDArrayMathGPU } from 'deeplearn/dist/src';

// let Tone = require('tone')

require("./style.css");

let app = new App(d3.select("div#wrap"));
// let app = new App(d3.select("div#root"), {use_midi_output: true})

// just for debugging
window.app = app;
