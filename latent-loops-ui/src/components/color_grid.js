import Colors from "../colors.js";

var Color = function(hexOrObject) {
  var obj;
  if (hexOrObject instanceof Object) {
    obj = hexOrObject;
  } else {
    obj = LinearColorInterpolator.convertHexToRgb(hexOrObject);
  }
  this.r = obj.r;
  this.g = obj.g;
  this.b = obj.b;
};

Color.prototype.asRgbCss = function() {
  return "rgb(" + this.r + ", " + this.g + ", " + this.b + ")";
};

var LinearColorInterpolator = {
  // convert 6-digit hex to rgb components;
  // accepts with or without hash ("335577" or "#335577")
  convertHexToRgb: function(hex) {
    let match = hex.replace(/#/, "").match(/.{1,2}/g);
    return new Color({
      r: parseInt(match[0], 16),
      g: parseInt(match[1], 16),
      b: parseInt(match[2], 16)
    });
  },
  // left and right are colors that you're aiming to find
  // a color between. Percentage (0-100) indicates the ratio
  // of right to left. Higher percentage means more right,
  // lower means more left.
  findColorBetween: function(left, right, percentage) {
    let newColor = {};
    let components = ["r", "g", "b"];
    for (var i = 0; i < components.length; i++) {
      let c = components[i];
      newColor[c] = Math.round(
        left[c] + ((right[c] - left[c]) * percentage) / 100
      );
    }
    return new Color(newColor);
  }
};

export default function GenerateColorGrid(scale_mode, grid_dimensions) {
  var color_palette = [];
  var seed_colors = [];
  if (scale_mode == 0 || scale_mode == 2) {
    seed_colors = Colors.major_colors_hex;
  }

  if (scale_mode == 1 || scale_mode == 3) {
    seed_colors = Colors.minor_colors_hex;
  }

  if (scale_mode == 4) {
    seed_colors = Colors.chrom_colors_hex;
  }

  let c0 = new Color(seed_colors[0]);
  let c1 = new Color(seed_colors[1]);
  let c2 = new Color(seed_colors[2]);
  let c3 = new Color(seed_colors[3]);

  for (let i = 0; i < grid_dimensions; i++) {
    let y_percentage = (i / grid_dimensions) * 100;
    let left_color = LinearColorInterpolator.findColorBetween(
      c0,
      c3,
      y_percentage
    );
    let right_color = LinearColorInterpolator.findColorBetween(
      c1,
      c2,
      y_percentage
    );

    let current_row = [];
    for (let j = 0; j < grid_dimensions; j++) {
      let x_percentage = (j / grid_dimensions) * 100;
      current_row.push(
        LinearColorInterpolator.findColorBetween(
          left_color,
          right_color,
          x_percentage
        ).asRgbCss()
      );
    }
    color_palette = color_palette.concat(current_row);
  }
  return color_palette;
}
