import * as d3 from "d3";
import axios from "axios";
import { getLatentSpace, loadModel } from "./generate.js";
import { MusicService } from "./music.js";
import melodies from "./melodies.js";
import { SketchPad } from "./components/sketch.js";
import { ButtonGroup } from "./components/button_group.js";
import { NoteMatrix } from "./components/matrix.js";
import { Collection } from "./components/collection.js";
import MakeGradientDef from "./components/gradient_def.js";
import Settings from "./components/settings.js";
import Colors from "./colors.js";
import GenerateColorGrid from "./components/color_grid.js";
import { make_arr_of, change_array_len, get_translation } from "./helpers.js";
import { copyTextToClipboard } from "./helpers";
let gtag = function() {};
// clockwise starting from top left
// const default_corners = [ melodies.twinkle, melodies.chariot, melodies.sunshine, melodies.my_girl ]
const default_corners = [
  [],
  melodies.twinkle,
  melodies.chariot,
  melodies.american_two
];

// all the required options, used in the initial_options, merged with whatever is passed in
let default_opt = {
  num_hits: 32,
  num_pitches: 20,
  meter: 4,
  bpm: 120,
  scale_mode: 0,
  tonic: 0,
  // tone_instrument: 'piano',
  tone_instrument: "synth",
  use_midi_output: false,
  use_midi_clock: false,
  midi_instrument: 0,
  midi_clock_bus: 1,
  save_data_to_url: false,
  containers: {
    // ls is special, dims isn't an array
    // ls:        { dims:      6, size: [0.65,  0.60],  pos: [0.2, 0.12   ] },
    ls: { dims: 6, size: [0.52, 0.61], pos: [0.3, 0.14] },
    // clipboard: { dims: [1, 8], size: [0.09, 0.62],   pos: [0.015,    0.12] },
    clipboard: { dims: [1, 8], size: [0.09, 0.61], pos: [0.05, 0.14] },
    transport: { dims: [8, 1], size: [0.8, 0.11], pos: [0.1, 0.875] },
    // editor is not a real container, no data of it's own or collection
    editor: { dims: [1, 1], size: [0.7, 0.8], pos: [0.15, 0.1] }
  },
  about_height: 0.22,
  grid_palette: [],
  note_duration: 240
};

// editor:    { dims: [1, 1], size: [0.9, 0.84],    pos: [0.05,     0.14    ] },

class App {
  constructor(parent_el, passed_opt) {
    // remove the loading indicator
    parent_el.html(``);
    // check the url hash for data, for persisting state
    let { data, opt } = this.get_data_from_url_hash();
    // create our application state and set it to this.state
    this.set_initial(data, opt);
    // this.set_initial();
    // set up our about and settings divs
    this.setup_about(parent_el);
    // create the svg that will contain all the things
    this.root_el = parent_el.append("svg");
    // create a group to hold all our container g's that will hold the notematrixes
    let all_containers_g = this.root_el
      .append("g")
      .attr("id", "all_containers");
    this.root_el.append("g").attr("id", "editor");

    this.setup_music(() => {
      this.state.opt.midi_instrument_options = this.musicService.getMidiInstrumentOptions();
      this.setup_settings(parent_el);
      // this.setup_dat_gui()
    });
    // this sets the root_el's width and height to the full window, and updates state
    this.resize();
    // warm or cool, based on scale
    this.update_root_class();

    this.setup_keyboard_events();
    for (let data of this.state.data) {
      let kind = data.key;
      let container = all_containers_g
        .append("g")
        .attr("class", `container ${kind}`);
    }
    /*MakeGradientDef(this.root_el, 'cells_big_cool', Colors.bg_green, Colors.bg_blue, 0);
    MakeGradientDef(this.root_el, 'cells_small_cool', Colors.bg_green, Colors.bg_blue, 0, 0.14);
    MakeGradientDef(this.root_el, 'cells_big_warm', Colors.bg_orange, Colors.bg_pink, 0);
    MakeGradientDef(this.root_el, 'cells_small_warm', Colors.bg_orange, Colors.bg_pink, 0, 0.14);*/

    MakeGradientDef(
      this.root_el,
      "panel_gradient",
      Colors.panel_grey,
      Colors.panel_black,
      1
    );
    MakeGradientDef(
      this.root_el,
      "bar_gradient",
      Colors.panel_black,
      Colors.panel_grey,
      1
    );

    setTimeout(this.begin.bind(this), 400);
    // this.begin()
  }
  begin() {
    loadModel();
    this.create_sketch_pad();
    this.create_buttons();
    this.create_panels();
    // finally, use the data to create all containers/collections of matrixes
    this.update_containers();
    d3.select(window).on("resize", this.resize.bind(this));
    this.loadGameData();
  }
  loadGameData() {
    axios.get("http://127.0.0.1:8081/music.json").then(res => {
      console.log("res", res);
    });
  }
  resize() {
    this.state.width = this.state.show_settings
      ? window.innerWidth * 0.75
      : window.innerWidth;
    this.state.height = this.state.show_about
      ? window.innerHeight * (1 - this.state.opt.about_height)
      : window.innerHeight;
    this.root_el
      .attr("width", this.state.width)
      .attr("height", this.state.height);
    // console.log('render/update. need debounce?')
    this.update_all();
  }
  // set our initial state, including data & opt
  set_initial(data, opt = {}) {
    let show_about = !document.cookie.includes("show_about=false");
    // show_about = true  // for debugging about, ignore cookie
    document.cookie = "show_about=false;max-age=86400"; // one day for now
    opt = Object.assign({}, default_opt, opt);
    this.state = {
      opt,
      show_about,
      last_hover: false,
      show_settings: false,
      active_edit: false,
      sketch_mode: false,
      is_working: false,
      is_playing: false,
      playing_from_button: false,
      tour_mode: false,
      width: window.innerWidth,
      height: show_about
        ? window.innerHeight * (1 - opt.about_height)
        : window.innerHeight
    };
    if (data) {
      data[0]["values"] = this.get_empty_ls_with_corners(data[0]["values"]);
    } else {
      data = this.get_default_data();
      this.state.opt.grid_palette = new Array(3);
      this.state.opt.grid_palette[0] = GenerateColorGrid(
        this.state.opt.scale_mode,
        this.state.opt.containers.ls.dims
      );
      this.state.opt.grid_palette[1] = new Array(
        this.state.opt.containers.clipboard.dims[0] *
          this.state.opt.containers.clipboard.dims[1]
      ).fill("rgb(255,255,255)");
      this.state.opt.grid_palette[2] = new Array(
        this.state.opt.containers.transport.dims[0] *
          this.state.opt.containers.transport.dims[1]
      ).fill("rgb(255,255,255)");
    }
    this.state.data = data;
  }
  update_root_class() {
    this.root_el.classed("warm cool", false);
    let c =
      this.state.opt.scale_mode == 0 || this.state.opt.scale_mode == 2
        ? "warm"
        : "cool";
    this.root_el.classed(c, true);
  }
  setup_music(cb) {
    let opt = this.state.opt;
    this.musicService = new MusicService(
      opt.use_midi_output,
      opt.use_midi_clock,
      opt.tone_instrument,
      opt.midi_instrument,
      opt.midi_clock_bus,
      cb
    );
  }
  // get empty data for our three containers, with default corners filled in on the ls grid
  get_default_data() {
    let [clip_dims, tran_dims] = [
      this.state.opt.containers.clipboard.dims,
      this.state.opt.containers.transport.dims
    ];

    let empty_matrix_data = make_arr_of(this.state.opt.num_hits, 0);
    return [
      { key: "ls", values: this.get_empty_ls_with_corners(default_corners) },
      {
        key: "clipboard",
        values: make_arr_of(clip_dims[0] * clip_dims[1], empty_matrix_data)
      },
      {
        key: "transport",
        values: make_arr_of(tran_dims[0] * tran_dims[1], empty_matrix_data)
      }
    ];
  }
  // setup or update all of our matrix containers, ls, transport and clipboard
  update_containers() {
    // console.log('update_containers')

    for (let [index, data] of this.state.data.entries()) {
      let kind = data.key;

      let [width, height] = this.state.opt.containers[kind]["size"];
      width = width * this.state.width;
      height = height * this.state.height;

      let [x_pos, y_pos] = this.state.opt.containers[kind]["pos"];
      x_pos =
        x_pos != "center"
          ? x_pos * this.state.width
          : (this.state.width - width) / 2;
      y_pos =
        y_pos != "center"
          ? y_pos * this.state.height
          : (this.state.height - height) / 2;
      let offset = [x_pos, y_pos];
      let [dims, m_size] = this.get_dims_and_size_for(kind);
      let margin = kind == "transport" ? 1 : 3;

      // create the note matrix for this collection/container with appropriate options. see matrix.js
      let note_matrix = NoteMatrix(kind)
        .num_hits(this.state.opt.num_hits)
        .num_pitches(this.state.opt.num_pitches)
        .corners(kind == "ls" ? this.get_corner_indices() : [])
        .color_grid(this.state.opt.grid_palette[this.get_ki(kind)])
        .width(m_size[0] - margin)
        .height(m_size[1] - margin);

      // create the collection, see collection.js, using the note_matrix component
      let collection = Collection()
        .item(note_matrix)
        .dims(dims)
        .margin(margin)
        .offset(offset)
        .kind(kind)
        .width(width)
        .height(height)
        .data(this.get_hit_arrs_for(data.key))
        .startFromCenter(kind == "ls")
        .corners(kind == "ls" ? this.get_corner_indices() : [])
        .cornerScale(this.state.tour_mode == "corners" ? 1.5 : 1.3)
        .color_grid(this.state.opt.grid_palette[this.get_ki(kind)]);

      // and apply it
      this.root_el.select(`g.container.${kind}`).call(collection);
      // setup the drag events for all the matrixes of this kind
      this.setup_drag(kind, note_matrix);
      // panels
      this.update_panel(kind, width, height, x_pos, y_pos);
    } // end loop
    this.set_url_hash_from_data();
    this.update_buttons();
  }
  update_editor() {
    if (!this.state.active_edit) {
      return;
    }
    // which one is it
    let [ki, index] = this.state.active_edit;
    this.update_sketch(ki, index);

    let kind = this.get_key_from_ki(ki);
    // let sel = this.root_el.selectAll(`g.container.${kind} g.matrix`).filter(function(d, i) { return i ===index; })
    let sel = this.root_el.selectAll(`g#editor`);
    // allow it pointer events (which we disabled during drag)
    sel.attr("pointer-events", "all");

    // setup our note matrix
    let [dims, m_size] = this.get_dims_and_size_for("editor");
    // let [dims, m_size] = this.get_dims_and_size_for(kind)
    let [x_pos, y_pos] = this.state.opt.containers["editor"]["pos"];
    x_pos =
      x_pos != "center"
        ? x_pos * this.state.width
        : (this.state.width - m_size[0]) / 2;
    y_pos =
      y_pos != "center"
        ? y_pos * this.state.height
        : (this.state.height - m_size[1]) / 2;
    let offset = [x_pos, y_pos];

    let note_matrix = NoteMatrix(kind)
      .edit_mode(true)
      .onCellClick((d, i) => this.on_cell_click(d, i))
      .num_hits(this.state.opt.num_hits)
      .num_pitches(this.state.opt.num_pitches)
      .color(this.state.opt.grid_palette[ki][index])
      .width(m_size[0])
      .height(m_size[1]);
    // .cell_margin(1)
    // get that data
    let data = this.state.data[ki]["values"][index];
    //console.log(data);
    // get it as a big ol' hit array
    let m_data = this.from_pitch_seq(data);
    sel
      .datum(m_data)
      .call(note_matrix)
      // .transition().duration(250)
      // .style("opacity", 1)
      .attr("transform", `translate(${offset[0]},${offset[1]}) scale(1)`);
    this.set_url_hash_from_data();
    this.update_buttons();
    // todo, move this logic to update_panel
    let extra_x = this.state.width * 0.03;
    let extra_y = this.state.height * 0.5;
    this.update_panel(
      "editor",
      m_size[0] + extra_x,
      m_size[1] + extra_y,
      -extra_x / 2,
      -extra_y / 2,
      true
    );
  }
  update_all() {
    this.update_about_and_settings();
    if (this.state.active_edit) {
      this.update_editor();
    } else {
      this.update_containers();
    }
  }
  // setup our drag/drop logic for this kind of notematrix
  setup_drag(kind, note_matrix) {
    // reach in and select the g's we just created
    let matrixes = this.root_el.selectAll(`g.container.${kind} g.matrix`);
    let kind_index = this.get_ki(kind);
    let m_size = this.get_matrix_size_for(kind);
    // this could be part of state, but closure works
    let last_time = new Date();
    // helper for the translate string, centers matrix on mouse pointer
    let get_t = function(s = 1) {
      return `translate(${d3.event.x - m_size[0] / 2}, ${d3.event.y -
        m_size[1] / 2}) scale(${s})`;
    };
    // keep track of the last matrix we hovered over, for the drop of drag and drop
    // and also for playing and stopping
    matrixes
      .on("mouseover", (d, i, nodes) => {
        // if it's empty, and we're not dragging, don't even set last_hover
        if (!this.check_if_has_data(kind_index, i) && d3.event.buttons === 0) {
          return;
        }
        this.state["last_hover"] = [kind_index, i];
        // play sequence if the user isn't clicking to drag
        if (d3.event.buttons === 0 && !this.state.playing_from_button) {
          this.play_sequence(kind_index, i);
        }
      })
      .on("mouseleave", (d, i, nodes) => {
        // if we're playing, it'll finish the sequence and then stop
        this.state["last_hover"] = false;
      });
    matrixes.on("touchmove", () => {
      const touch = d3.event.changedTouches[0];
      const rect = document.elementFromPoint(touch.clientX, touch.clientY);
      if (!rect) return;
      const { kind, index } = rect.parentElement.dataset;
      this.state.last_hover = kind && [this.get_ki(kind), index];
      if (kind && !rect.classList.contains("touchover")) {
        this.root_el.select("rect.base.touchover").classed("touchover", false);
        rect.classList.add("touchover");
      }
    });

    // on drag start create a new matrix, a clone, to use as an indicator
    // and give the actual one a selected class
    let drag = d3
      .drag()
      .on("start", (d, i, nodes) => {
        this.stop_sequence();
        // hack for double click, not actually drag
        let time_delta = new Date() - last_time;
        last_time = new Date(); // not strictly nec because setup_drag will be called on any update, reseting this
        // it was a double click
        if (time_delta < 250) {
          d3.select(nodes[i]).classed("selected", false);
          this.activate_editor(kind_index, i, nodes[i]);
          return;
        }
        // start actual drag behavior
        this.root_el
          .append("g")
          .attr("class", `drag_layer`)
          .datum(d)
          .call(note_matrix)
          // .attr("transform-origin", `5% 5%`) // was 50
          .attr("opacity", 0.75)
          .attr("transform", get_t(0))
          .transition()
          .attr(
            "fill",
            d3
              .select(nodes[i])
              .classed("selected", true)
              .attr("fill")
          )
          .attr("transform", get_t());
        d3.select(nodes[i]).classed("selected", true);
      })
      // move our clone. XXX pointer-events must be set to to none
      // so we can get the mouseover of what's underneath it
      .on("drag", (d, i, nodes) => {
        d3.select("g.drag_layer")
          .attr("transform", get_t())
          .attr("pointer-events", "none");
      })
      // drag stopped, i.e. drop, copy what we were dragging to where it was dropped
      .on("end", (d, i, nodes) => {
        this.root_el.select("g.drag_layer").remove();
        d3.select(nodes[i]).classed("selected", false);
        this.root_el.select("rect.base.touchover").classed("touchover", false);
        let time_delta = new Date() - last_time;
        // it wasn't a drag, it was a double click!
        if (time_delta < 250) {
          return;
        }
        // it's not a drop, we're not over anything
        if (!this.state.last_hover) {
          return;
        }
        // console.log('end', time_delta)
        let [last_ci, last_i] = this.state.last_hover;
        gtag("event", `drag to ${this.get_key_from_ki(last_ci)}`);
        // change the data: assign what was dropped to the last thing that was hovered
        //
        this.state.opt.grid_palette[last_ci][
          last_i
        ] = this.state.opt.grid_palette[kind_index][i];
        let dropped_data = this.state.data[kind_index]["values"][i];
        this.state.opt.grid_palette;

        this.state.data[last_ci]["values"][last_i] = JSON.parse(
          JSON.stringify(dropped_data)
        );
        this.update_containers();
      });
    // aaand apply it
    matrixes.call(drag);
    // setup stop on mouseleave for the whole container
    this.root_el
      .selectAll(`g.container.${kind}`)
      .on("mouseleave", (d, i, nodes) => {
        if (!this.state.playing_from_button) {
          this.stop_sequence();
        }
      });
  }
  update_play_line(kind_index, matrix_index, active_hit_playing = false) {
    // hacky solution, TODO, rewrite
    this.root_el.selectAll("rect.line").remove();

    let data = active_hit_playing === false ? [] : [active_hit_playing];
    if (data.length) {
      let is_ed =
        this.state.active_edit &&
        kind_index === this.state.active_edit[0] &&
        matrix_index === this.state.active_edit[1];
      let key = this.get_key_from_ki(kind_index);
      let matrix_g = this.root_el
        .selectAll(`g.container.${key} g.matrix`)
        .filter((d, i) => {
          return i === matrix_index;
        });
      // if it's the editor, use that
      matrix_g = is_ed ? this.root_el.selectAll(`g#editor.matrix`) : matrix_g;
      let size = is_ed
        ? this.get_matrix_size_for("editor")
        : this.get_matrix_size_for(key);
      let width = size[0] / this.state.opt.num_hits;
      let height = is_ed ? size[1] : size[1] - 3; // for border in non ed view
      let line = matrix_g.selectAll("rect.line").data(data);
      line
        .enter()
        .append("rect")
        .attr("class", "line")
        .attr("pointer-events", "none")
        .merge(line)
        .style("fill", "rgba(220,220,230, 0.5)")
        .attr("width", width)
        .attr("height", height)
        .attr("y", 0)
        .attr("x", (d, i) => d * width);
    } else {
      this.root_el.selectAll("rect.line").remove();
    }
  }
  deactivate_editor() {
    if (!this.state.active_edit) {
      return;
    }
    this.state.sketch_mode = false;
    this.update_editor();
    this.root_el
      .selectAll(`g#editor`)
      .classed("matrix active_edit", false)
      .attr("pointer-events", "none");
    // update state
    this.state.active_edit = false;
    this.update_buttons();
    // this.root_el.selectAll('g.container g.matrix')
    this.root_el
      .selectAll("g.container")
      .transition()
      .duration(350)
      .style("opacity", 1);

    this.root_el
      .select("g#all_containers")
      .transition()
      .duration(750)
      .attr("transform", `scale(1) translate(0,0) `)
      .on("end", () => {
        this.update_containers();
        this.root_el.selectAll(`g#editor .cell`).remove();
      });
  }
  activate_editor(kind_index, item_index, node) {
    if (this.state.active_edit) {
      return;
    }
    // set this for empties where it wasn't already set
    this.state.last_hover = [kind_index, item_index];
    gtag("event", "activate editor");
    this.root_el.selectAll(`g#editor`).classed("matrix active_edit", true);
    // this.root_el.selectAll(`g#editor rect.base`).attr('fill', "rgba(0,0,0,0)")
    this.root_el.selectAll(`g#editor rect.base`).style("opacity", 0);
    // get the active one, give it a class, and get it's transformation
    // d3.select(node).classed("active_edit", true)
    // disable drag for all and old click listers
    this.root_el
      .selectAll("g.matrix")
      .on(".drag", null)
      .on("dblclick", null)
      .on("mouseover", null)
      .on("mouseleave", null);

    let current_trans = get_translation(d3.select(node).attr("transform"));
    let zoom = 7;
    // zoom in to that transformation, plus a bit of padding
    this.root_el
      .select("g#all_containers")
      .transition()
      .duration(700)
      .attr(
        "transform",
        `scale(${zoom}) translate(${-current_trans[0] +
          5}, ${-current_trans[1] + 10})`
      );
    // .on('end', ()=>{   })
    // update our state
    this.state.active_edit = [kind_index, item_index];
    // this.root_el.selectAll('g.container g.matrix:not(.active_edit)')
    this.root_el
      .selectAll("g.container")
      .transition()
      .duration(1000)
      .style("opacity", 0);
    this.update_editor();
  }
  create_sketch_pad() {
    let ed_opts = this.state.opt.containers.editor;
    this.sketch_pad = this.root_el.append("g").attr("class", "sketch_g");
  }
  update_sketch(ki, index) {
    // console.log('update sketch')
    let ed_opts = this.state.opt.containers.editor;
    let sketch = SketchPad()
      .width(ed_opts.size[0] * this.state.width)
      .height(ed_opts.size[1] * this.state.height)
      .active(this.state.sketch_mode)
      .color(this.state.opt.grid_palette[ki][index])
      .point_drawn(this.point_drawn.bind(this));
    let sketch_g = this.root_el.select("g.sketch_g");
    sketch_g
      .call(sketch)
      .attr(
        "transform",
        `translate(${ed_opts.pos[0] * this.state.width},${ed_opts.pos[1] *
          this.state.height})`
      );
    //.attr('fill', this.state.opt.grid_palette[index]);
    // not ideal to call this every time
    if (!this.state.sketch_mode) {
      sketch.removeSketchPath();
    }
    if (this.state.tour_mode == "sketching") {
      sketch.showSampleLine();
    }
  }
  update_tonic(newValue, oldValue) {
    // console.log('tonic', newValue, oldValue)
    let ls_data = this.state.data[0]["values"];
    let clipboard_data = this.state.data[1]["values"];
    let transport_data = this.state.data[2]["values"];
    for (let i = 0; i < ls_data.length; i++) {
      ls_data[i] = this.musicService.transposeSequence(
        ls_data[i],
        newValue,
        oldValue,
        this.state.opt.scale_mode,
        this.state.opt.scale_mode,
        this.state.opt.num_pitches
      );
    }
    for (let i = 0; i < clipboard_data.length; i++) {
      clipboard_data[i] = this.musicService.transposeSequence(
        clipboard_data[i],
        newValue,
        oldValue,
        this.state.opt.scale_mode,
        this.state.opt.scale_mode,
        this.state.opt.num_pitches
      );
    }
    for (let i = 0; i < transport_data.length; i++) {
      transport_data[i] = this.musicService.transposeSequence(
        transport_data[i],
        newValue,
        oldValue,
        this.state.opt.scale_mode,
        this.state.opt.scale_mode,
        this.state.opt.num_pitches
      );
    }
    this.state.data[0]["values"] = ls_data;
    this.state.data[1]["values"] = clipboard_data;
    this.state.data[2]["values"] = transport_data;
    //this.musicService.transpose_tonic( newValue, oldValue )
    this.update_all();
  }
  update_scale_mode(newValue, oldValue) {
    this.update_root_class();
    let clip_list = new Array(this.state.opt.grid_palette[1].length).fill(200);
    let transport_list = new Array(this.state.opt.grid_palette[2].length).fill(
      200
    );

    //find cells in the clipboard and transport and figure out where they came from in the ls
    for (let i = 0; i < this.state.opt.grid_palette[1].length; i++) {
      let cell_color = this.state.opt.grid_palette[1][i];
      if (cell_color != "rgb(255,255,255)") {
        clip_list[i] = this.get_ls_index_from_color(cell_color);
      }
    }
    for (let i = 0; i < this.state.opt.grid_palette[2].length; i++) {
      let cell_color = this.state.opt.grid_palette[2][i];
      if (cell_color != "rgb(255,255,255)") {
        transport_list[i] = this.get_ls_index_from_color(cell_color);
      }
    }

    //change ls color palette to match scale mode
    this.state.opt.grid_palette[0] = GenerateColorGrid(
      this.state.opt.scale_mode,
      this.state.opt.containers.ls.dims
    );

    //change the color of the active clipboard and transport cells to match new mode, keeping track of where they came from on the ls
    for (let i = 0; i < this.state.opt.grid_palette[1].length; i++) {
      if (clip_list[i] != 200) {
        this.state.opt.grid_palette[1][i] = this.state.opt.grid_palette[0][
          clip_list[i]
        ];
      }
    }
    for (let i = 0; i < this.state.opt.grid_palette[2].length; i++) {
      if (transport_list[i] != 200) {
        this.state.opt.grid_palette[2][i] = this.state.opt.grid_palette[0][
          transport_list[i]
        ];
      }
    }
    // console.log('mode', newValue, oldValue)
    let corners = this.get_corner_indices();
    let ls_data = this.state.data[0]["values"];
    let clipboard_data = this.state.data[1]["values"];
    let transport_data = this.state.data[2]["values"];
    for (let i = 0; i < ls_data.length; i++) {
      if (
        i == corners[0] ||
        i == corners[1] ||
        i == corners[2] ||
        i == corners[3]
      ) {
        ls_data[i] = this.musicService.transposeSequence(
          ls_data[i],
          this.state.opt.tonic,
          this.state.opt.tonic,
          newValue,
          oldValue,
          this.state.opt.num_pitches
        );
      } else {
        for (let j = 0; j < ls_data[i].length; j++) {
          ls_data[i][j] = 0;
        }
      }
    }
    for (let i = 0; i < clipboard_data.length; i++) {
      clipboard_data[i] = this.musicService.transposeSequence(
        clipboard_data[i],
        this.state.opt.tonic,
        this.state.opt.tonic,
        newValue,
        oldValue,
        this.state.opt.num_pitches
      );
    }
    for (let i = 0; i < transport_data.length; i++) {
      transport_data[i] = this.musicService.transposeSequence(
        transport_data[i],
        this.state.opt.tonic,
        this.state.opt.tonic,
        newValue,
        oldValue,
        this.state.opt.num_pitches
      );
    }
    this.state.data[0]["values"] = ls_data;
    this.state.data[1]["values"] = clipboard_data;
    this.state.data[2]["values"] = transport_data;

    this.update_all();
  }

  // event handlers
  on_cell_click(d, i) {
    // storing the data makes it monophonic rn, which is how loops wants it,
    // eventually we may want to change that
    let row = Math.floor(i / this.state.opt.num_hits);
    let pitch_num = this.musicService.rowToPitch(
      row,
      this.state.opt.num_pitches,
      this.state.opt.tonic,
      this.state.opt.scale_mode
    );
    this.musicService.playNote(pitch_num, this.state.opt.note_duration);
    let col = Math.floor(i % this.state.opt.num_hits);
    // which matrix entry is it?
    let data = this.state["data"][this.state.active_edit[0]]["values"][
      this.state.active_edit[1]
    ];
    data[col] = !d.b ? pitch_num : 0;
    this.update_editor();
  }
  // draw from line sketch to matrix
  point_drawn(x, y) {
    let ed_opts = this.state.opt.containers.editor;
    let cell_width =
      (ed_opts.size[0] * this.state.width) / this.state.opt.num_hits;
    let cell_height =
      (ed_opts.size[1] * this.state.height) / this.state.opt.num_pitches;
    let index =
      Math.floor(x / cell_width) +
      Math.floor(y / cell_height) * this.state.opt.num_hits;
    let row = Math.floor(index / this.state.opt.num_hits);
    let col = Math.floor(index % this.state.opt.num_hits);
    let pitch_num = this.musicService.rowToPitch(
      row,
      this.state.opt.num_pitches,
      this.state.opt.tonic,
      this.state.opt.scale_mode
    );
    // set the data for the active one
    this.state.data[this.state.active_edit[0]]["values"][
      this.state.active_edit[1]
    ][col] = pitch_num;
    this.musicService.playNote(pitch_num, this.state.opt.note_duration);
    this.update_editor();
  }
  // data conversion
  // takes pitch seq [48, 0..], returns matrix data [0,1..]
  from_pitch_seq(seq) {
    // first convert expand the pitch seq to columns
    let columns = seq.map(pitch_num => {
      let col = new Array(this.state.opt.num_pitches).fill(0).map((x, i) => 0);
      if (!pitch_num) {
        return col;
      }
      let row_num = this.musicService.pitchToRow(
        pitch_num,
        this.state.opt.num_pitches,
        this.state.opt.tonic,
        this.state.opt.scale_mode
      );
      // monophonic
      col[row_num] = 1;
      return col;
    });
    // https://stackoverflow.com/a/17428705/83859
    let rows = columns[0].map((col, i) => columns.map(row => row[i]));
    let data = rows.reduce((a, b) => {
      return a.concat(b);
    }, []);
    return data;
  }
  get_corner_indices(lsd) {
    lsd = lsd || this.state.opt.containers["ls"]["dims"];
    return [0, lsd - 1, Math.pow(lsd, 2) - 1 - (lsd - 1), Math.pow(lsd, 2) - 1];
  }
  get_corners(lsd) {
    let indices = this.get_corner_indices(lsd);
    let ls_data = this.state.data[0]["values"];
    return [
      ls_data[indices[0]],
      ls_data[indices[1]],
      ls_data[indices[2]],
      ls_data[indices[3]]
    ];
  }
  // empty-ish, fill in corners
  get_empty_ls_with_corners(corners) {
    let num_in_ls = Math.pow(this.state.opt.containers["ls"]["dims"], 2);
    let empty_matrix_data = make_arr_of(this.state.opt.num_hits, 0);
    let ls = make_arr_of(num_in_ls, empty_matrix_data);
    let indices = this.get_corner_indices();
    // replace the four corners in ls
    indices.forEach((ind, i) => {
      if (corners[i].length) {
        ls[ind] = corners[i];
      }
    });
    return ls;
  }
  get_data_from_url_hash() {
    try {
      // let { data, opt } = JSON.parse(decodeURIComponent(location.hash.slice(1)));
      let { data, opt } = JSON.parse(atob(location.hash.slice(1)));
      opt = this.whitelist_opt(opt);
      return { data, opt };
    } catch (e) {
      return false;
    }
  }
  set_url_hash_from_data() {
    // if (this.state.opt.save_data_to_url == false) {
    //   history.replaceState(null, null, '');
    //   // history.replaceState(null, null, '#');
    //   return;
    // }
    // history.replaceState(null, null, '#' + encodeURIComponent(JSON.stringify({ data, opt })));
  }
  get_url_hash_from_data() {
    let data = [{ key: "ls", values: this.get_corners() }];
    data.push(this.state.data[1]);
    data.push(this.state.data[2]);
    let opt = this.whitelist_opt(this.state.opt);
    let hash = "#" + btoa(JSON.stringify({ data, opt }));
    return hash;
  }
  whitelist_opt(opt) {
    let {
      num_hits,
      num_pitches,
      meter,
      bpm,
      scale_mode,
      tonic,
      tone_instrument,
      grid_palette,
      save_data_to_url
    } = opt;
    return {
      num_hits,
      num_pitches,
      meter,
      bpm,
      scale_mode,
      tonic,
      tone_instrument,
      grid_palette,
      save_data_to_url
    };
  }
  setup_keyboard_events() {
    document.addEventListener("keydown", event => {
      if (event.key == "Escape") {
        this.deactivate_editor();
        this.stop_sequence();
      }
    });
  }
  generate_ls() {
    if (this.state.is_working) {
      return;
    }
    // grab the corners from the ls data in state
    let four_corners = this.get_corners();
    this.deactivate_editor();
    this.state.is_working = true;
    this.state.data[0]["values"] = [];
    this.update_containers();
    // this.root_el.selectAll(`g.container.ls g.matrix`).remove()
    this.update_buttons();
    // timeout is just so the animation doesn't struggle when we load all the models etc
    //console.log( "corners: ", four_corners )
    setTimeout(() => {
      getLatentSpace(
        four_corners,
        this.state.opt.containers.ls.dims,
        result => {
          this.state.is_working = false;
          this.state.data[0]["values"] = result.map(x => Array.from(x));
          this.update_containers();
        }
      );
    }, 300);
  }
  change_num_hits() {
    let sample = this.state.data[0]["values"][0];
    // change the length of every note arr in data
    let difference = this.state.opt.num_hits - sample.length;
    this.state.data = this.state.data.map(c => {
      c["values"] = c["values"].map(m => change_array_len(m, difference, 0));
      return c;
    });
    this.update_all();
  }
  // helpers
  // get all the hit arrays for a of matrixes, ie [ [0,0,0..], [0,0..]..]
  get_hit_arrs_for(kind) {
    let index = this.get_ki(kind);
    let data = this.state.data[index]["values"].map(x =>
      this.from_pitch_seq(x)
    );
    return data;
  }
  get_container_dims_for(key) {
    let dims = this.state.opt.containers[key]["dims"];
    dims = dims.length ? dims : [dims, dims]; // deal with ls being one value
    return dims;
  }
  get_matrix_size_for(key_or_i) {
    let key = key_or_i.length ? key_or_i : this.get_key_from_ki(key_or_i);
    let [width, height] = this.state.opt.containers[key]["size"];
    width = width * this.state.width;
    height = height * this.state.height;
    let dims = this.get_container_dims_for(key);
    return [width / dims[0], height / dims[1]];
  }
  get_dims_and_size_for(key) {
    return [this.get_container_dims_for(key), this.get_matrix_size_for(key)];
  }
  // get the index of the data container matching kind, i.e. 'ls' returns `0`
  get_ki(kind) {
    return this.state["data"].findIndex(d => d.key == kind);
  }
  // do the reverse of get_ki(), get the key for a given index, i.e. `0` returns 'ls'
  get_key_from_ki(kind_index) {
    return this.state.data[kind_index]["key"];
  }

  //
  get_ls_index_from_color(color) {
    let color_index = 0;
    for (let i = 0; i < this.state.opt.grid_palette[0].length; i++) {
      if (color == this.state.opt.grid_palette[0][i]) {
        color_index = i;
      }
    }
    return color_index;
  }
  reset_to_factory_defaults() {
    this.dat_gui.destroy();
    this.set_initial();
    this.state.opt.midi_instrument_options = this.musicService.getMidiInstrumentOptions();
    this.update_all();
    this.setup_dat_gui();
  }
  change_ls_dims(newValue, oldValue) {
    // if (change==0){return}
    this.deactivate_editor();
    let corners = this.get_corners(oldValue);
    // this.state.opt.containers.ls.dims += change
    this.state.data[0]["values"] = this.get_empty_ls_with_corners(corners);
    this.state.opt.grid_palette[0] = GenerateColorGrid(
      this.state.opt.scale_mode,
      this.state.opt.containers.ls.dims
    );

    this.update_containers();
  }
  check_if_has_data(ki, mi) {
    let d = this.state.data[ki]["values"][mi];
    if (!d || !d.reduce((x, acc) => x + acc, 0)) {
      return false;
    } else {
      return true;
    }
  }
  play_sequence(kind_index, matrix_index) {
    // don't play if there are no notes, and we're not actively editing, return
    if (
      !this.check_if_has_data(kind_index, matrix_index) &&
      this.state.active_edit === false
    ) {
      return;
    }
    // a function to play the notes
    let on_time = cur => {
      // if the user has hovered over a different one, use that data instead
      // changing kind_index and matrix_index effects them in draw() as well
      kind_index = this.state.last_hover
        ? this.state.last_hover[0]
        : kind_index;
      matrix_index = this.state.last_hover
        ? this.state.last_hover[1]
        : matrix_index;
      if (!this.check_if_has_data(kind_index, matrix_index)) {
        return;
      }
      let data = this.state.data[kind_index]["values"][matrix_index];
      // continue from previous note
      let curr = (this.state.offset || 0) % this.state.opt.num_hits;
      this.musicService.playNote(data[curr], this.state.opt.note_duration);
      let at_end = cur === this.state.opt.num_hits - 1;
      this.state.offset = (this.state.offset || 0) + 1;
      // if (at_end && !this.state.last_hover) {
      //   this.stop_sequence();
      // }
    };
    // a function to update the play line
    let draw = cur => {
      // continue from previous note
      let curr = ((this.state.offset || 0) % this.state.opt.num_hits) - 1;
      let at_end = curr === this.state.opt.num_hits - 1;
      if (at_end || !this.state.is_playing) {
        this.update_play_line();
      } else {
        // draw the line for that matrix, that hit
        this.update_play_line(kind_index, matrix_index, curr);
      }
    };
    // if (!this.state.is_playing) {
    // because we want musically accurate time, we let tone run the loop, and
    // so we pass two functions to run on each beat
    // one to play notes, one to update ui
    if (this.state.playing_matrix !== matrix_index) {
      this.musicService.startSequence(on_time, this.state.opt.num_hits, draw);
      this.state.is_playing = true;
      // this.state.playing_matrix = matrix_index;
    }
    // }
  }
  stop_sequence() {
    this.state.is_playing = false;
    this.update_play_line();
    this.musicService.stopSequence();
    this.state.playing_from_button = false;
    this.update_buttons();
  }
  play_transport() {
    this.musicService.stopSequence();
    this.state.playing_from_button = true;
    let active_playing_index = 0;
    let kind_index = this.get_ki("transport");
    // a kludgey flag to clear the previous playline
    let needs_clear = false;
    let on_time = cur => {
      if (cur != 0 && cur % this.state.opt.num_hits == 0) {
        active_playing_index += 1;
        needs_clear = true;
      }
      if (cur == 0) {
        active_playing_index = 0;
      }
      let d = this.state.data[kind_index]["values"][active_playing_index];
      cur = cur % this.state.opt.num_hits;
      this.musicService.playNote(d[cur] || 0, this.state.opt.note_duration);
    };
    let draw = cur => {
      let active_hit_playing = cur % this.state.opt.num_hits;
      if (needs_clear) {
        // the transport index to clear, either the previous one, or if we're on the first, the final one
        let to_clear =
          active_playing_index != 0
            ? active_playing_index
            : this.state.opt.containers.transport.dims[0] - 1;
        this.update_play_line(kind_index, to_clear);
        needs_clear = false;
      }
      this.update_play_line(
        kind_index,
        active_playing_index,
        active_hit_playing
      );
    };
    this.musicService.startSequence(
      on_time,
      this.state.opt.num_hits * this.state.opt.containers.transport.dims[0],
      draw
    );
  }
  play_button_clicked() {
    // this.stop_sequence()
    if (this.state.playing_from_button) {
      this.stop_sequence();
      this.state.playing_from_button = false;
      this.update_buttons();
      return;
    }
    if (this.state.active_edit) {
      this.play_sequence(this.state.active_edit[0], this.state.active_edit[1]);
    } else {
      this.play_transport();
    }
    this.state.playing_from_button = true;

    this.update_buttons();
  }
  onButtonClick(label) {
    gtag("event", `click ${label} button`);
    if (label == "play") {
      this.play_button_clicked();
    } else if (label == "pause") {
      this.stop_sequence();
    } else if (label == "close") {
      this.deactivate_editor();
    } else if (label == "settings") {
      this.state.show_settings = !this.state.show_settings;
      this.resize();
      // this.update_all()
    } else if (label == "reset") {
      // a hacky way to clear the path while maintaining sketch_mode state
      let is_in_sketch = this.state.sketch_mode;
      this.state.sketch_mode = false;
      let [ki, index] = this.state.active_edit;
      this.update_sketch(ki, index);
      this.state.sketch_mode = is_in_sketch;
      // and clear the actual data for this matrix
      this.state.data[this.state.active_edit[0]]["values"][
        this.state.active_edit[1]
      ] = make_arr_of(this.state.opt.num_hits, 0);
      this.update_editor();
    } else if (label == "draw") {
      this.state.sketch_mode = true;
      this.update_editor();
    } else if (label == "grid") {
      this.state.sketch_mode = false;
      this.update_editor();
    } else if (label == "generate") {
      this.generate_ls();
    } else if (label == "about") {
      this.state.show_about = true;
      this.resize();
      // this.update_all()
    }
  }
  // update all the buttons
  // these use the size and position config as much as possible
  // but there's still a lot of hardwired adjustments
  update_buttons() {
    // if we're in default mode, just show play button next to transport
    // otherwise show reset button too and labels
    let play_label = !this.state.playing_from_button ? "play" : "pause";
    let left_button_arr = [{ label: play_label }];
    if (this.state.active_edit) {
      left_button_arr.push({ label: "reset" });
    }
    let left_buttons = ButtonGroup()
      .width(this.state.active_edit ? 110 : 50)
      .height(this.state.active_edit ? 35 : 50)
      .show_label(!!this.state.active_edit)
      .data(left_button_arr)
      .onClick(this.onButtonClick.bind(this));

    // let left_b_trans = this.state.active_edit ? `translate(${this.state.opt.containers.editor.pos[0]*this.state.width}, ${55})`
    let left_b_trans = this.state.active_edit
      ? `translate(${this.state.opt.containers.editor.pos[0] *
          this.state.width}, ${10})`
      : `translate(${this.state.opt.containers.transport.pos[0] *
          this.state.width -
          this.state.width * 0.052}, ${this.state.opt.containers.transport
          .pos[1] *
          this.state.height +
          (this.state.opt.containers.transport.size[1] * this.state.height) /
            6})`;
    this.root_el
      .select("g.left_buttons")
      .call(left_buttons)
      .transition()
      .attr("transform", left_b_trans);

    // if we're in edit more show draw/grid and close button
    let right_button_arr = [
      { label: "grid", active: !this.state.sketch_mode },
      { label: "draw", active: this.state.sketch_mode }
    ];
    right_button_arr = this.state.active_edit ? right_button_arr : [];
    let right_buttons = ButtonGroup()
      .width(35)
      .height(35)
      .margin(5)
      .icon_size(20)
      .show_label(false)
      .show_wrap(true)
      .data(right_button_arr)
      .onClick(this.onButtonClick.bind(this));

    // let right_b_trans = `translate(${(this.state.opt.containers.editor.size[0]+this.state.opt.containers.editor.pos[0])*this.state.width-105}, ${50})`
    let right_b_trans = `translate(${(this.state.opt.containers.editor.size[0] +
      this.state.opt.containers.editor.pos[0]) *
      this.state.width -
      125}, ${10})`;
    this.root_el
      .select("g.right_buttons")
      .call(right_buttons)
      .transition()
      .attr("transform", right_b_trans);

    let close_b_trans = `translate(${(this.state.opt.containers.editor.size[0] +
      this.state.opt.containers.editor.pos[0]) *
      this.state.width -
      5}, ${0})`;
    let close_button = ButtonGroup()
      .width(35)
      .height(35)
      .show_label(false)
      .icon_size(20)
      .data(this.state.active_edit ? [{ label: "close" }] : [])
      .onClick(this.onButtonClick.bind(this));

    this.root_el
      .select("g.close_button")
      .call(close_button)
      .transition()
      .attr("transform", close_b_trans);

    // helper for below
    let get_generate_button_trans = scale =>
      `translate(${(this.state.opt.containers.ls.size[0] / 2 +
        this.state.opt.containers.ls.pos[0]) *
        this.state.width -
        25 * scale}, ${(this.state.opt.containers.ls.size[1] / 2 +
        this.state.opt.containers.ls.pos[1]) *
        this.state.height -
        25 * scale}) scale(${scale})  `;

    let gen_label = !this.state.is_working
      ? [{ label: "generate", active: true }]
      : [{ label: "wait" }];
    let gen_b_scale = this.state.tour_mode == "generate" ? 1.8 : 1;
    gen_b_scale = this.state.is_working ? 1.3 : gen_b_scale;
    gen_label = this.state.active_edit ? [] : gen_label;
    let generate_b_trans = get_generate_button_trans(gen_b_scale);

    let generate_button = ButtonGroup()
      .width(50)
      .height(50)
      .show_label(false)
      .icon_size(30)
      .data(gen_label)
      .onClick(this.onButtonClick.bind(this));

    this.root_el
      .select("g.generate_button")
      .call(generate_button)
      .transition()
      .attr("transform", generate_b_trans);

    // get rid of any previous listener
    this.root_el.select("g.generate_button").on("mouseover", null);
    // hover scale when they can use it
    if (!this.state.is_working) {
      this.root_el
        .select("g.generate_button")
        .on("mouseover", (d, i, nodes) =>
          d3
            .select(nodes[i])
            .transition()
            .attr("transform", get_generate_button_trans(1.3))
        )
        .on("mouseleave", (d, i, nodes) =>
          d3
            .select(nodes[i])
            .transition()
            .attr("transform", get_generate_button_trans(1))
        );
    }

    let settings_b_trans = `translate(${this.state.width - 45}, ${(this.state
      .opt.containers.ls.size[1] /
      2 +
      this.state.opt.containers.ls.pos[1]) *
      this.state.height -
      25})`;
    let advanced_settings_button = ButtonGroup()
      .width(50)
      .height(50)
      .show_label(false)
      .icon_size(25)
      .button_rx(5)
      .data([{ label: "settings" }])
      .onClick(this.onButtonClick.bind(this));

    this.root_el
      .select("g.advanced_settings_button")
      .call(advanced_settings_button)
      .transition()
      .attr("transform", settings_b_trans);

    let about_b_trans = !this.state.show_about
      ? `translate(${this.state.width - 45}, ${5})`
      : `translate(${this.state.width - 45}, ${-100})`;
    let about_button = ButtonGroup()
      .width(40)
      .height(40)
      .show_label(false)
      .icon_size(25)
      .button_rx(5)
      .data([{ label: "about" }])
      .onClick(this.onButtonClick.bind(this));

    this.root_el
      .select("g.about_button")
      .call(about_button)
      .transition()
      .attr("transform", about_b_trans);
  }
  create_buttons() {
    this.root_el.append("g").attr("class", "left_buttons");
    this.root_el.append("g").attr("class", "right_buttons");
    this.root_el.append("g").attr("class", "close_button");
    this.root_el.append("g").attr("class", "generate_button"); //.attr("transform-origin", "center")
    this.root_el.append("g").attr("class", "advanced_settings_button");
    this.root_el.append("g").attr("class", "about_button");
  }
  update_panel(kind, width, height, x_pos, y_pos, no_bar) {
    let titles = {
      ls: "explorer",
      clipboard: "clipboard",
      transport: "timeline"
    };
    let x_padding =
      kind == "ls" ? this.state.width * 0.12 : this.state.width * 0.02;
    // do all kinds of spacing logic for transport
    x_padding = kind == "transport" ? this.state.width * 0.12 : x_padding;
    let y_padding =
      kind == "transport" ? this.state.height * 0.07 : this.state.height * 0.15;
    let height_adjust = kind == "transport" ? -this.state.height * 0.025 : 0;
    this.root_el
      .select(`rect.panel.${kind}`)
      .attr("width", width + x_padding)
      .attr("height", height + y_padding + height_adjust)
      .attr("fill", "url(#panel_gradient)")
      .attr("x", x_pos - x_padding / 2)
      .attr("y", y_pos - y_padding / 2);

    let y_offset =
      kind == "transport"
        ? -this.state.height * 0.015
        : -this.state.height * 0.055;
    let x_offset = kind == "ls" ? -x_padding / 4 : 0;
    this.root_el
      .select(`text.panel_title.${kind}`)
      .style("fill", "rgb(200,200,200)")
      .text(titles[kind])
      .attr("x", x_pos + x_offset)
      .attr("y", y_pos + y_offset)
      .style("font-size", 14);

    if (no_bar) {
      return;
    }
    this.root_el
      .select(`rect.title_bar.${kind}`)
      .attr("width", width + x_padding)
      .attr("height", this.state.height * 0.026)
      .attr("fill", "url(#bar_gradient)")
      .attr("x", x_pos - x_padding / 2)
      .attr("y", y_pos - y_padding / 2);
  }
  create_panels() {
    for (let data of this.state.data) {
      let kind = data.key;
      let container = this.root_el.select(`g.container.${kind}`);
      container
        .append("rect")
        .attr("class", `panel ${kind}`)
        .attr("rx", 15)
        .attr("ry", 15);
      container.append("rect").attr("class", `title_bar ${kind}`),
        container.append("text").attr("class", `panel_title ${kind}`);
    }
    this.root_el
      .select(`#editor`)
      .append("rect")
      .attr("class", `panel editor`);
    this.root_el
      .select(`#editor`)
      .append("rect")
      .attr("class", `title_bar editor`);
    this.root_el
      .select(`#editor`)
      .append("rect")
      .attr("class", `panel_title editor`);
  }
  update_about_and_settings() {
    d3.select("body").classed("about_active", this.state.show_about);
    d3.select("body").classed("settings_active", this.state.show_settings);
  }
  setup_about(parent_el) {
    let about = parent_el.append("div").attr("id", "about");
    about.html(about_html);
    about.select(".close").on("click", e => {
      this.state.show_about = false;
      // this.update_all()
      this.resize();
    });

    let hover = (hash, enter) => {
      let tour_mode = enter ? hash : false;
      this.state.tour_mode = tour_mode;
      let top_right_corner_index = this.get_corner_indices()[1];
      let top_right_node = d3
        .selectAll(`.matrix.corner`)
        .filter((d, i) => i == 1)
        .node();
      if (hash == "editing" && enter) {
        // hacky, select() will return this first one
        this.activate_editor(0, top_right_corner_index, top_right_node);
      } else if (hash == "editing" && !enter) {
        this.deactivate_editor();
      } else if (hash == "sketching" && enter) {
        // hacky, select() will return this first one
        this.state.sketch_mode = true;
        this.activate_editor(0, top_right_corner_index, top_right_node);
      } else if (hash == "sketching" && !enter) {
        this.deactivate_editor();
      }

      this.update_all();
    };
    about
      .selectAll("a")
      .on("mouseover", function() {
        hover(this.href.split("#")[1], true);
      })
      .on("mouseleave", function() {
        hover(this.href.split("#")[1], false);
      })
      .on("click", () => d3.event.preventDefault());
  }
  setup_settings(parent_el) {
    let settings_el = parent_el.append("div").attr("id", "settings");
    Settings(
      settings_el.node(),
      this.state.opt,
      this.on_settings_change.bind(this)
    );
  }

  on_settings_change(kind, value) {
    if (kind == "ls_dims") {
      let ov = this.state.opt.containers.ls.dims;
      this.state.opt.containers.ls.dims = value;
      this.change_ls_dims(value, ov);
    } else if (kind == "bpm") {
      this.state.opt.bpm = value;
      this.musicService.changeBpm(value);
    } else if (kind == "note_duration") {
      this.state.opt.note_duration = value;
    } else if (kind == "scale_mode") {
      let ov = this.state.opt.scale_mode;
      this.state.opt.scale_mode = value;
      this.update_scale_mode(value, ov);
    } else if (kind == "tonic") {
      let ov = this.state.opt.tonic;
      this.state.opt.tonic = value;
      this.update_tonic(value, ov);
    } else if (kind == "tone_instrument") {
      this.state.opt.tone_instrument = value;
      this.musicService.changeInstrument(value);
    } else if (kind == "use_midi_output") {
      this.state.opt.use_midi_output = value;
      this.musicService.setOutput(value);
    } else if (kind == "use_midi_clock") {
      this.state.opt.use_midi_clock = value;
      this.musicService.setClock(value);
    } else if (kind == "copy") {
      let url =
        location.origin + "/latent-loops/" + this.get_url_hash_from_data();
      copyTextToClipboard(url);
    } else if (kind == "midi_instrument") {
      this.state.opt.midi_instrument = value;
      this.musicService.changeMidiInstrument(value);
    } else if (kind == "midi_clock_bus") {
      this.state.opt.midi_clock_bus = value;
      this.musicService.changeMidiClock(value);
    }
  } // end on settings change
}

const about_html = `

<div class="close"><i class="fas fa-times-circle"></i></div>
<div id="title-bar">
<h2>latent loops <sup>beta</sup> <span>make electronic music with machine learning</span></h2></div>
<ul>
  <li>hover over loops to play them back</li>
  <li>fill the <a href="#corners">four corner cells</a> with seed loops - we've started you off with three you might recognize</li>
  <li>double click to edit a loop by <a href="#sketching">sketching</a> or <a href="#editing">editing the matrix</a></li>
  <li><a href="#generate">press <i class="fas fa-bolt"></i></a> to generate a grid of new loops that interpolate between your seeds</li>
  <li>drag loops to the clipboard to save them for later</li>
  <li>drag them to the timeline to sequence a longer phrase</li>
</ul>
`;

export default App;
