import * as d3 from "d3";

// For this one we DO keep track of the data ourselves, and bind it to our items
// (As opposed to passing in a selection with data already bound, as in matrix.js)
// this is more straightforward for this use, we can call our own .data() method to update

export function Collection() {
  // All options that should be accessible to caller
  let width = 0;
  let height = 0;
  let dims = [0, 0];
  let data = [];
  let margin = 0;
  let item = () => {};
  let kind = "";
  let offset = [0, 0]; // top, left, globally
  let startFromCenter = false;
  let corners = [];
  let cornerScale = 1;
  let color_grid = [];

  // our main function, which we return
  function collection(selection) {
    selection.each(function() {
      let matrixes = d3
        .select(this)
        .selectAll("g.matrix")
        .data(data);

      // matrixes.exit().remove()
      matrixes
        .exit()
        .transition()
        .duration(400)
        .attr("transform", `translate(${get_center()[0]},${get_center()[1]})`)
        .remove();

      let start_trans = !startFromCenter
        ? `translate(${get_pos(0)[0]},${get_pos(0)[1]})`
        : `translate(${get_center()[0]},${get_center()[1]})`;

      matrixes = matrixes
        .enter()
        .append("g")
        .attr("class", "matrix")
        .attr("transform", start_trans)
        .merge(matrixes);

      matrixes.classed("corner", (d, i) => corners.includes(i));

      matrixes
        .transition()
        .duration(500)
        .attr(
          "transform",
          (d, i) =>
            `translate(${get_pos(i)[0]},${get_pos(i)[1]}) scale(${
              get_pos(i)[2]
            })`
        )
        .attr("fill", (d, i) => color_grid[i]);
      matrixes.call(item);
    }); // end each
  } // end main func

  // get position by index based on the dims
  // includes offset
  // and adjustments for corner scale
  function get_pos(i) {
    let scale = corners.includes(i) ? cornerScale : 1;
    // margin should be subtracted from the with passed to item (notematrix)
    // for the panel padding to work correctly
    let x =
      (i % dims[0]) * (width / dims[0] - margin) +
      (i % dims[0]) * margin +
      offset[0];
    let row_num = Math.floor(i / dims[0]);
    let y =
      row_num * (height / dims[1] - margin) + row_num * margin + offset[1];
    if (corners.includes(i)) {
      let corner_offset_x = (width / dims[0]) * cornerScale - width / dims[0];
      let corner_offset_y = (height / dims[1]) * cornerScale - height / dims[1];
      if (i == corners[0]) {
        x -= corner_offset_x;
        y -= corner_offset_y;
      } else if (i == corners[1]) {
        y -= corner_offset_y;
      } else if (i == corners[2]) {
        x -= corner_offset_x;
      }
    }
    return [x, y, scale];
  }
  function get_center() {
    let x = width / 2 + offset[0];
    let y = height / 2 + offset[1];
    return [x, y];
  }
  collection.width = function(value) {
    if (!arguments.length) return width;
    width = value;
    if (typeof updateWidth === "function") updateWidth();
    return collection;
  };
  collection.height = function(value) {
    if (!arguments.length) return height;
    height = value;
    if (typeof updateHeight === "function") updateHeight();
    return collection;
  };
  collection.dims = function(value) {
    if (!arguments.length) return dims;
    dims = value;
    if (typeof updateDims === "function") updateDims();
    return collection;
  };
  collection.item = function(value) {
    if (!arguments.length) return item;
    item = value;
    if (typeof updateItem === "function") updateItem();
    return collection;
  };
  collection.data = function(value) {
    if (!arguments.length) return data;
    data = value;
    if (typeof updateData === "function") updateData();
    return collection;
  };
  collection.margin = function(value) {
    if (!arguments.length) return margin;
    margin = value;
    return collection;
  };
  collection.kind = function(value) {
    if (!arguments.length) return kind;
    kind = value;
    return collection;
  };
  collection.onDoubleClick = function(value) {
    if (!arguments.length) return onDoubleClick;
    onDoubleClick = value;
    return collection;
  };
  collection.offset = function(value) {
    if (!arguments.length) return offset;
    offset = value;
    return collection;
  };
  collection.startFromCenter = function(value) {
    if (!arguments.length) return startFromCenter;
    startFromCenter = value;
    return collection;
  };

  collection.corners = function(value) {
    if (!arguments.length) return corners;
    corners = value;
    return collection;
  };

  collection.cornerScale = function(value) {
    if (!arguments.length) return cornerScale;
    cornerScale = value;
    return collection;
  };
  collection.color_grid = function(value) {
    if (!arguments.length) return color_grid;
    color_grid = value;
    return collection;
  };

  return collection;
}
