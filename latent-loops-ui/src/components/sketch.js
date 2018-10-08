import * as d3 from "d3";

// in this one we don't manage the data, more declarative, just call data on what you pass in
// https://bost.ocks.org/mike/chart/
export function SketchPad() {
  // All options that should be accessible to caller
  let width = 0;
  let height = 0;
  let active = false;
  let color = "rgb(0,0,0)";
  let point_drawn = () => false;
  let removeSketchPath = () => false;
  let showSampleLine = () => false;

  function sketch(selection) {
    selection.each(function(data, i) {
      //just a base rect so click events work
      let base = d3
        .select(this)
        .selectAll("rect.sketch_pad")
        .data([1]);
      base
        .enter()
        .append("rect")
        .attr("class", "sketch_pad")
        // .style('opacity', edit_mode ? 0 : 1 )
        .merge(base)
        .transition() // for update when we enter edit_mode
        .duration(500)
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", width)
        .attr("height", active ? height : 0)
        .style("opacity", 0.6);

      var line = d3.line().curve(d3.curveBasis);
      let dragstarted = () => {
        var d = d3.event.subject,
          active = pad
            .append("path")
            .attr("stroke", color)
            .datum(d),
          x0 = d3.event.x,
          y0 = d3.event.y;
        d3.event.on("drag", () => {
          var x1 = d3.event.x,
            y1 = d3.event.y,
            dx = x1 - x0,
            dy = y1 - y0;
          // are we in bounds?
          if (x1 > width || x1 < 0) {
            return;
          }
          if (y1 > height || y1 < 0) {
            return;
          }
          // add to path
          if (dx * dx + dy * dy > 100) d.push([(x0 = x1), (y0 = y1)]);
          else d[d.length - 1] = [x1, y1];
          // update the matrix
          point_drawn(x1, y1);
          // update the path itself
          active.attr("d", line);
        });
      };
      let pad = d3.select(this).call(
        d3
          .drag()
          .container(function() {
            return this;
          })
          .subject(function() {
            var p = [d3.event.x, d3.event.y];
            return [p, p];
          })
          .on("start", dragstarted)
      );

      removeSketchPath = () => {
        if (active == true) {
          return;
        }
        if (
          d3
            .select(this)
            .selectAll("path")
            .empty()
        ) {
          return;
        }
        // kinda hacky, basically setting paths to [[1,1],[2,1] ... [this.width,1]]
        let d = new Array(Math.round(width))
          .fill(0)
          .map((x, i) => [i, 1])
          .filter((x, i) => {
            return i % 25 == 0;
          });
        // interpolate and then remove
        d3.select(this)
          .selectAll("path")
          .datum(d)
          .transition()
          .duration(500)
          .attr("d", d3.line().curve(d3.curveBasis))
          .remove();
      };
      // just for the tour
      showSampleLine = () => {
        // the 1000 value is hacky, better to use the actual length
        let line = d3.line().curve(d3.curveBasis);
        pad
          .append("path")
          .datum(sample_line)
          .attr("d", line)
          .attr("stroke", color)
          .attr("stroke-dasharray", 1000 + " " + 1000)
          .attr("stroke-dashoffset", 1000)
          .transition()
          .duration(2000)
          .delay(500)
          .attr("stroke-dashoffset", 0);
      };
    }); // end selection.each
  }

  sketch.width = function(value) {
    if (!arguments.length) return width;
    width = value;
    if (typeof updateWidth === "function") updateWidth();
    return sketch;
  };
  sketch.height = function(value) {
    if (!arguments.length) return height;
    height = value;
    if (typeof updateHeight === "function") updateHeight();
    return sketch;
  };
  sketch.active = function(value) {
    if (!arguments.length) return active;
    active = value;
    return sketch;
  };
  sketch.color = function(value) {
    if (!arguments.length) return color;
    color = value;
    return sketch;
  };
  sketch.removeSketchPath = function() {
    removeSketchPath();
  };
  sketch.showSampleLine = function() {
    showSampleLine();
  };
  sketch.point_drawn = function(value) {
    if (!arguments.length) return point_drawn;
    point_drawn = value;
    return sketch;
  };

  return sketch;
}

// for tour
const sample_line = [
  [138, 222.16949462890625],
  [138, 221.16949462890625],
  [156, 203.16949462890625],
  [190, 169.16949462890625],
  [222, 143.16949462890625],
  [275, 114.16949462890625],
  [389, 125.16949462890625],
  [411, 146.16949462890625],
  [417, 189.16949462890625],
  [438, 257.16949462890625],
  [471, 291.16949462890625],
  [520, 283.16949462890625],
  [567, 230.16949462890625],
  [583, 185.16949462890625],
  [597, 147.16949462890625],
  [605, 135.16949462890625],
  [615, 133.16949462890625],
  [627, 135.16949462890625],
  [643, 145.16949462890625],
  [657, 164.16949462890625],
  [667, 175.16949462890625],
  [690, 183.16949462890625],
  [723, 186.16949462890625]
];
