"use strict";

const webpack = require("webpack");
const path = require("path");
const HtmlWebpack = require("html-webpack-plugin");
const _ExtractTextPlugin = require("extract-text-webpack-plugin");

const UglifyJsPlugin = new webpack.optimize.UglifyJsPlugin({
  compress: {
    warnings: true
  }
});

// Lets get the Javascripts within the index.html
const HtmlWebpackPlugin = new HtmlWebpack({
  template: path.join(__dirname, "../src/public/index.html"),
  filename: "index.html",
  inject: "body" // inject at the bottom of the body tag
});

const ExtractTextPlugin = new _ExtractTextPlugin("styles.css");

module.exports = {
  UglifyJsPlugin: UglifyJsPlugin,
  HtmlWebpackPlugin: HtmlWebpackPlugin,
  ExtractTextPlugin: ExtractTextPlugin
};
