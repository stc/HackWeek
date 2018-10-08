// helpers
// create an array of length n, filled with copies of val
export function make_arr_of(n, val) {
  return new Array(n).fill(0).map(() => JSON.parse(JSON.stringify(val)));
}

// fill or splice an array by diff. -1 remove the last, 2 fill two more
export function change_array_len(arr, diff, fill) {
  if (diff === 0) {
    return arr;
  }
  if (diff < 0) {
    // make it shorter
    return arr.slice(0, diff);
  } else if (diff > 0) {
    // make it longer
    return arr.concat(make_arr_of(diff, fill));
  }
}

// take a transform string, get the translation as [x,y]
// https://stackoverflow.com/a/38230545/83859
export function get_translation(transform) {
  // Create a dummy g for calculation purposes only. This will never
  // be appended to the DOM and will be discarded once this function
  // returns.
  var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  // Set the transform attribute to the provided string value.
  g.setAttributeNS(null, "transform", transform);
  // consolidate the SVGTransformList containing all transformations
  // to a single SVGTransform of type SVG_TRANSFORM_MATRIX and get
  // its SVGMatrix.
  var matrix = g.transform.baseVal.consolidate().matrix;
  // As per definition values e and f are the ones for the translation.
  return [matrix.e, matrix.f];
}

// https://stackoverflow.com/a/30810322/83859
export function copyTextToClipboard(text) {
  if (!navigator.clipboard) {
    fallbackCopyTextToClipboard(text);
    return;
  }
  navigator.clipboard.writeText(text).then(
    function() {
      console.log("Async: Copying to clipboard was successful!");
    },
    function(err) {
      console.error("Async: Could not copy text: ", err);
    }
  );
}

function fallbackCopyTextToClipboard(text) {
  var textArea = document.createElement("textarea");
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    var successful = document.execCommand("copy");
    var msg = successful ? "successful" : "unsuccessful";
    // console.log('Fallback: Copying text command was ' + msg);
  } catch (err) {
    console.error("Fallback: Oops, unable to copy", err);
  }

  document.body.removeChild(textArea);
}
