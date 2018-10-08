const plugins = require("./plugins");
const babelLoader = {
  test: /\.(js)$/,
  exclude: /node_modules/,
  loader: "babel-loader",
  query: {
    cacheDirectory: true
  }
};
const cssLoader = {
  test: /\.(css|scss|sass)$/,
  use: plugins.ExtractTextPlugin.extract({
    fallback: "style-loader",
    use: ["css-loader", "postcss-loader", "sass-loader"]
  })
};
module.exports = {
  babelLoader: babelLoader,
  cssLoader: cssLoader
};
