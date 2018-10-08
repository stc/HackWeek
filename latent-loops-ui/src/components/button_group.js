import * as d3 from "d3";

export const CodePointMap = {
  play: "\uf04b",
  pause: "\uf04c",
  smile: "\uf118",
  draw: "\uf040",
  grid: "\uf00a",
  close: "\uf057",
  reset: "\uf1f8",
  settings: "\uf013",
  generate: "\uf0e7",
  wait: "\uf254",
  about: "\uf128"
};

export function ButtonGroup() {
  let data = [];
  // All options that should be accessible to caller
  let width = 200;
  let height = 35;
  let margin = 10;
  let show_label = true;
  let show_wrap = false;
  let onClick = () => {};
  let icon_size = 25;
  let button_rx = false;
  let scale = 1;

  function button_group(selection) {
    // selection should just be a single group
    selection.each(function() {
      // this is just for the background to show that buttons are logically connected
      // only used for draw/matrix control currently
      let wrap_data = data.length && show_wrap ? [1] : [];
      let wrap = d3
        .select(this)
        .selectAll("rect.button_wrap")
        .data(wrap_data);
      wrap
        .enter()
        .append("rect")
        .attr("class", "button_wrap")
        .style("opacity", 0)
        .merge(wrap)
        .transition() // for update when we enter edit_mode
        .attr("x", -margin)
        .attr("y", -margin)
        .attr(
          "width",
          width * data.length +
            margin * Math.max(0, data.length - 1) +
            margin * 2
        )
        .attr("height", height + margin * 2)
        .style("opacity", 1)
        .attr("rx", 15);
      wrap
        .exit()
        .transition()
        .style("opacity", 0)
        .remove();

      // join
      let buttons = d3
        .select(this)
        .selectAll("g.button")
        .data(data);

      var buttons_enter = buttons
        .enter()
        .append("g")
        // .classed(`button ${label}`)
        .attr("class", d => `button button_${d.label}`);

      buttons_enter
        .style("opacity", 0)
        .transition()
        .style("opacity", 1);

      buttons_enter.append("rect").classed("button", true);
      buttons_enter.append("text").classed("icon", true);
      buttons_enter.append("text").classed("label", true);

      let rx = button_rx ? button_rx : show_label ? 7 : 100;
      buttons
        .merge(buttons_enter)
        .select("rect.button")
        .attr("width", width)
        .attr("height", height)
        .attr("x", (d, i) => i * (width + margin))
        .attr("rx", rx);
      // .attr('transform-origin', `center`)
      // .transition()1
      // .attr('transform', `scale(${scale})`)

      if (show_label) {
        buttons
          .merge(buttons_enter)
          .select("text.label")
          .text(d => {
            return d.label.charAt(0).toUpperCase() + d.label.slice(1);
          })
          .attr("alignment-baseline", "middle")
          .attr("font-size", 12)
          .attr("text-anchor", "middle")
          .attr("y", height / 2)
          .attr("x", (d, i) => i * (width + margin) + width / 1.75);
      } else {
        buttons
          .merge(buttons_enter)
          .select("text.label")
          .text("");
      }
      let icon_offset = show_label ? 4 : 2;
      buttons
        .merge(buttons_enter)
        .select("text.icon")
        .attr("font-family", "FontAwesome")
        .attr("font-size", icon_size)
        .attr("alignment-baseline", "middle")
        .attr("text-anchor", "middle")
        .attr("dy", 2) // shift down slightly, otherwise it is off-center
        .attr("y", height / 2)
        .attr("x", (d, i) => i * (width + margin) + width / icon_offset)
        .text(d => CodePointMap[d.label]);

      buttons.merge(buttons_enter).classed("active_button", d => d.active);
      buttons.merge(buttons_enter).on("click", d => onClick(d.label));
      buttons
        .exit()
        .transition()
        .style("opacity", 0)
        .remove();
    });
  }

  button_group.width = function(value) {
    if (!arguments.length) return width;
    width = value;
    if (typeof updateWidth === "function") updateWidth();
    return button_group;
  };
  button_group.height = function(value) {
    if (!arguments.length) return height;
    height = value;
    if (typeof updateHeight === "function") updateHeight();
    return button_group;
  };
  button_group.margin = function(value) {
    if (!arguments.length) return margin;
    margin = value;
    return button_group;
  };
  button_group.icon_size = function(value) {
    if (!arguments.length) return icon_size;
    icon_size = value;
    return button_group;
  };
  button_group.onClick = function(value) {
    if (!arguments.length) return onClick;
    onClick = value;
    return button_group;
  };
  button_group.data = function(value) {
    if (!arguments.length) return data;
    data = value;
    return button_group;
  };
  button_group.show_label = function(value) {
    if (!arguments.length) return show_label;
    show_label = value;
    if (typeof updateShowLabel === "function") updateShowLabel();

    return button_group;
  };
  button_group.button_rx = function(value) {
    if (!arguments.length) return button_rx;
    button_rx = value;
    return button_group;
  };
  button_group.show_wrap = function(value) {
    if (!arguments.length) return show_wrap;
    show_wrap = value;
    return button_group;
  };
  button_group.scale = function(value) {
    if (!arguments.length) return scale;
    scale = value;
    return button_group;
  };

  return button_group;
}
