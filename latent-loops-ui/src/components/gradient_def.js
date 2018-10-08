export default function MakeGradientDef(
  root,
  id,
  first_color,
  second_color,
  direction,
  scale = 1
) {
  if (direction == 0) {
    //vertical, note mode
    let mode_gradient = root
      .append("defs")
      .append("linearGradient")
      .attr("id", id)
      // .attr("id", "gradient1")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      // y2 really should be 100% but it didn't look as nice
      .attr("y2", "70%")
      // .attr("spreadMethod", "repeat")
      .attr("spreadMethod", "pad")
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("gradientTransform", `scale(${scale})`);

    mode_gradient
      .append("stop")
      .attr("class", "start")
      .attr("offset", "0%")
      .attr("stop-color", first_color)
      .attr("stop-opacity", 1);

    mode_gradient
      .append("stop")
      .attr("class", "end")
      .attr("offset", "100%")
      .attr("stop-color", second_color)
      .attr("stop-opacity", 1);
    return mode_gradient;
  }

  if (direction == 1) {
    //horizontal
    let horiz_gradient = root
      .append("defs")
      .append("linearGradient")
      .attr("id", id)
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");

    horiz_gradient
      .append("stop")
      .attr("class", "start")
      .attr("offset", "0%")
      .attr("stop-color", first_color)
      .attr("stop-opacity", 1);

    horiz_gradient
      .append("stop")
      .attr("class", "end")
      .attr("offset", "100%")
      .attr("stop-color", second_color)
      .attr("stop-opacity", 1);
    return horiz_gradient;
  }

  if (direction == 2) {
    //vertical
    let vert_gradient = root
      .append("defs")
      .append("linearGradient")
      .attr("id", id)
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");

    tert_gradient
      .append("stop")
      .attr("class", "start")
      .attr("offset", "0%")
      .attr("stop-color", first_color)
      .attr("stop-opacity", 1);

    vert_gradient
      .append("stop")
      .attr("class", "end")
      .attr("offset", "100%")
      .attr("stop-color", second_color)
      .attr("stop-opacity", 1);
    return vert_gradient;
  }
}
