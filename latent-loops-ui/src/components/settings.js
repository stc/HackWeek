import React from "react";
import ReactDOM from "react-dom";
import darkBaseTheme from "material-ui/styles/baseThemes/darkBaseTheme";
import MuiThemeProvider from "material-ui/styles/MuiThemeProvider";
import getMuiTheme from "material-ui/styles/getMuiTheme";
import AppBar from "material-ui/AppBar";
import Slider from "material-ui/Slider";
import RaisedButton from "material-ui/RaisedButton";
import DropDownMenu from "material-ui/DropDownMenu";
import MenuItem from "material-ui/MenuItem";
import Checkbox from "material-ui/Checkbox";

class SettingsComponent extends React.Component {
  constructor(props) {
    super(props);
    // because nesting is annoying
    let ls_dims = props.opt.containers.ls.dims;
    let note_duration = props.opt.note_duration;

    // create our opt/settings state from what we were passed
    this.state = Object.assign({ ls_dims, note_duration }, props.opt);
  }
  // for the sliders, so we only trigger a redraw when they're done sliding
  // others, we pass the value, so set the state, either way, tell app
  changeComplete(kind, value) {
    if (typeof value === "undefined") {
      value = this.state[kind];
    } else {
      // if it's not a dropdown, not a slider
      this.setState({ [kind]: value });
      console.log(kind, value);
    }
    this.props.on_change(kind, value);
  }
  // for sliders
  onChange(kind, value) {
    // console.log('on change', kind, value)
    this.setState({ [kind]: value });
  }
  render() {
    let tonics = [
      "C",
      "C#",
      "D",
      "D#",
      "E",
      "F",
      "F#",
      "G",
      "G#",
      "A",
      "A#",
      "B"
    ];
    return (
      <MuiThemeProvider muiTheme={getMuiTheme(darkBaseTheme)}>
        <div>
          <h3>Settings</h3>
          <label>
            Tempo{" "}
            <span className="value">
              {this.state.bpm}
              bpm
            </span>{" "}
          </label>
          <Slider
            step={10}
            value={this.state.bpm}
            min={80}
            max={280}
            onDragStop={e => this.changeComplete("bpm")}
            onChange={(e, v) => this.onChange("bpm", v)}
          />
          <label>
            Palette Dimensions{" "}
            <span className="value">{this.state.ls_dims}</span>
          </label>
          <Slider
            step={2}
            value={this.state.ls_dims}
            min={4}
            max={12}
            onDragStop={e => this.changeComplete("ls_dims")}
            onChange={(e, v) => this.onChange("ls_dims", v)}
          />
          {this.state.use_midi_output && (
            <div>
              <label>
                MIDI Note Duration in ms{" "}
                <span className="value">{this.state.note_duration}</span>
              </label>
              <Slider
                step={5}
                value={this.state.note_duration}
                min={10}
                max={1000}
                onDragStop={e => this.changeComplete("note_duration")}
                onChange={(e, v) => this.onChange("note_duration", v)}
              />
            </div>
          )}
          {this.state.use_midi_output && (
            <div>
              <label>
                <Checkbox
                  label="Use MIDI Clock"
                  checked={this.state.use_midi_clock}
                  onCheck={(e, v) => this.changeComplete("use_midi_clock", v)}
                />
              </label>
              <label>
                <span className="kind">MIDI Clock</span>
                <DropDownMenu
                  className="dropdown"
                  value={this.state.midi_clock_bus}
                  onChange={(e, i, v) =>
                    this.changeComplete("midi_clock_bus", v)
                  }
                >
                  {Object.entries(this.state.midi_instrument_options).map(
                    (x, i) => (
                      <MenuItem value={x[1]} primaryText={x[0]} key={i} />
                    )
                  )}
                </DropDownMenu>
              </label>
            </div>
          )}
          <label>
            <Checkbox
              label="Use MIDI Output"
              checked={this.state.use_midi_output}
              onCheck={(e, v) => this.changeComplete("use_midi_output", v)}
            />
          </label>

          {this.state.use_midi_output ? (
            <label>
              <span className="kind">MIDI Instrument</span>
              <DropDownMenu
                className="dropdown"
                value={this.state.midi_instrument}
                onChange={(e, i, v) =>
                  this.changeComplete("midi_instrument", v)
                }
              >
                {Object.entries(this.state.midi_instrument_options).map(
                  (x, i) => (
                    <MenuItem value={x[1]} primaryText={x[0]} key={i} />
                  )
                )}
              </DropDownMenu>
            </label>
          ) : (
            <div>
              <label>
                <span className="kind">Web Instrument</span>
                <DropDownMenu
                  className="dropdown"
                  value={this.state.tone_instrument}
                  onChange={(e, i, v) =>
                    this.changeComplete("tone_instrument", v)
                  }
                >
                  <MenuItem value="piano" primaryText="Piano" />
                  <MenuItem value="synth" primaryText="Synth" />
                </DropDownMenu>
              </label>
              {this.state.tone_instrument === "piano" && (
                <small className="piano-attribution">
                  <a href="https://archive.org/details/SalamanderGrandPianoV3">
                    Salamander Grand Piano V3
                  </a>
                  <br />
                  by Alexander Holm
                  <br />
                  licensed under{" "}
                  <a href="https://creativecommons.org/licenses/by/3.0/">
                    CC BY 3.0
                  </a>
                </small>
              )}
            </div>
          )}
          <label>
            <span className="kind">Scale Mode</span>
            <DropDownMenu
              label="Scale mode"
              className="dropdown"
              value={this.state.scale_mode}
              onChange={(e, v) => this.changeComplete("scale_mode", v)}
            >
              <MenuItem value={0} primaryText="Pentatonic Major" />
              <MenuItem value={1} primaryText="Pentatonic minor" />
              <MenuItem value={2} primaryText="Major" />
              <MenuItem value={3} primaryText="Minor" />
              <MenuItem value={4} primaryText="Chromatic" />
            </DropDownMenu>
          </label>
          <label>
            <span className="kind">Tonic</span>
            <DropDownMenu
              className="dropdown"
              value={this.state.tonic}
              onChange={(e, v) => this.changeComplete("tonic", v)}
            >
              {tonics.map((t, i) => (
                <MenuItem value={i} primaryText={t} key={i} />
              ))}
            </DropDownMenu>
          </label>
          <label>
            <br />
            <br />
            Get a link to your work
            <br />
            <br />
            <RaisedButton
              label="Copy link to clipboard"
              onClick={e => this.changeComplete("copy")}
            />
          </label>
        </div>
      </MuiThemeProvider>
    );
  }
}

function Settings(element, opt, on_change) {
  ReactDOM.render(
    <SettingsComponent opt={opt} on_change={on_change} />,
    element
  );
}

export default Settings;
