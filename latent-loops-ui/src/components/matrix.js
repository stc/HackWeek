import * as d3 from "d3";
import Colors from "../colors.js";

// helper
// takes [0,1] returns {i,b}, where i is index and b is if it's active or not
// by default drops the inactive ones, pass true
function to_objects_list(data, include_inactive = false) {
  return data
    .map((d, i) => {
      return { i, b: d };
    })
    .filter(d => (!include_inactive ? d.b : true));
}

// in this one we don't manage the data, more declarative, just call data on what you pass in
// https://bost.ocks.org/mike/chart/
export function NoteMatrix(kind) {
  // All options that should be accessible to caller
  let width = 200;
  let height = 200;
  let num_hits = 0;
  let num_pitches = 0;
  let edit_mode = false;
  let cell_margin = 0.25;
  let corners = [];
  let color_grid = [];
  let color;
  let onCellClick = () => {};

  // no set unset yet
  let meter = 4;

  function matrix(selection) {
    let cell_width = width / num_hits;
    let cell_height = height / num_pitches;

    selection.each(function(data, i) {
      // store metadata in the DOM for touchmove during dragging
      this.dataset.kind = kind;
      this.dataset.index = i;
      //just a base rect so click events work
      let base = d3
        .select(this)
        .selectAll("rect.base")
        .data([1]);
      base
        .enter()
        .append("rect")
        .attr("class", "base")
        .style("opacity", edit_mode ? 0 : 1)
        .merge(base)
        .transition() // for update when we enter edit_mode
        .duration(500) // .duration(1500)
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", width)
        .attr("height", height)
        .attr(
          "fill",
          edit_mode
            ? Colors.matrix_base_fill_edit_mode
            : Colors.matrix_base_fill
        )
        .attr(
          "stroke",
          corners.includes(i) ? color_grid[i] : Colors.matrix_base_stroke
        )
        .style("opacity", 1);

      let key_func = function(d) {
        return d.i;
      };
      data = to_objects_list(data, edit_mode);
      let cells = d3
        .select(this)
        .selectAll(".cell")
        .data(data, key_func);
      cells.exit().remove();
      cells
        .enter()
        .append("rect")
        .attr("class", "cell")
        // start at center
        .attr("y", height / 2)
        .attr("x", width / 2)
        .merge(cells)
        // cool, works
        // .style("fill", "url(#gradient1)")

        //how zach was doing it
        //.classed('active_cell', d => d.b)

        .classed("bar_start", d => (d.i % num_hits) % meter == 0)
        .attr("width", cell_width - cell_margin)
        .attr("height", cell_height - cell_margin)
        .transition()
        .duration(200)
        .style("fill", (d, i) => {
          // is it active?
          if (d.b) {
            //console.log('clicked color: ', color);
            return color;
          } else if ((d.i % num_hits) % meter == 0) {
            // is it the start of a bar?
            return "rgb(60,60,60)";
          } else {
            return "rgb(40,40,40)";
          }
        })
        .transition()
        .duration((d, i) => {
          return 300 + Math.random() * 300;
        })
        .delay((d, i) => {
          return edit_mode ? Math.random() * 300 + 100 : 0;
        })
        // go to appropriate place for each cell in grid
        .attr("x", d => {
          return (d.i % num_hits) * cell_width;
        })
        .attr("y", d => {
          return Math.floor(d.i / num_hits) * cell_height;
        })
        .attr("width", cell_width - cell_margin)
        .attr("height", cell_height - cell_margin);
      if (edit_mode) {
        d3.select(this)
          .selectAll(".cell")
          .on("click", onCellClick);
      }
    });
  }

  matrix.width = function(value) {
    if (!arguments.length) return width;
    width = value;
    if (typeof updateWidth === "function") updateWidth();
    return matrix;
  };
  matrix.height = function(value) {
    if (!arguments.length) return height;
    height = value;
    if (typeof updateHeight === "function") updateHeight();
    return matrix;
  };
  matrix.num_hits = function(value) {
    if (!arguments.length) return num_hits;
    num_hits = value;
    return matrix;
  };
  matrix.num_pitches = function(value) {
    if (!arguments.length) return num_pitches;
    num_pitches = value;
    return matrix;
  };
  matrix.edit_mode = function(value) {
    if (!arguments.length) return edit_mode;
    edit_mode = value;
    return matrix;
  };
  matrix.cell_margin = function(value) {
    if (!arguments.length) return cell_margin;
    cell_margin = value;
    if (typeof updateCellMargin === "function") updateCellMargin();
    return matrix;
  };
  matrix.onCellClick = function(value) {
    if (!arguments.length) return onCellClick;
    onCellClick = value;
    return matrix;
  };
  matrix.color_grid = function(value) {
    if (!arguments.length) return color_grid;
    color_grid = value;
    return matrix;
  };
  matrix.color = function(value) {
    if (!arguments.length) return color;
    color = value;
    return matrix;
  };
  matrix.corners = function(value) {
    if (!arguments.length) return corners;
    corners = value;
    return matrix;
  };

  matrix.get_color = function() {
    console.log("matrix color: ", color);
    return color;
  };

  return matrix;
}
