const prod = process.env.NODE_ENV === "production"

const HtmlWebpackPlugin = require("html-webpack-plugin")
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const CopyPlugin = require("copy-webpack-plugin")
const path = require("path")
const express = require("express")

module.exports = {
  mode: prod ? "production" : "development",
  entry: "./src/index.tsx",
  output: {
    path: __dirname + "/dist/",
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        resolve: {
          extensions: [".ts", ".tsx", ".js", ".json"],
        },
        use: "ts-loader",
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
    ],
  },
  devServer: {
    static: {
      directory: path.join(__dirname, "dist"),
    },
    setupMiddlewares: (middlewares, devServer) => {
      if (!devServer) {
        throw new Error("webpack-dev-server is not defined")
      }

      devServer.app.use(
        "/demos",
        express.static(path.join(__dirname, "smanim-demos"))
      )
      devServer.app.use(
        "/public",
        express.static(path.join(__dirname, "public"))
      )
      // required for the web worker
      devServer.app.use("/scripts", express.static(path.join(__dirname, "src")))

      return middlewares
    },
  },
  devtool: prod ? undefined : "source-map",
  plugins: [
    new HtmlWebpackPlugin({
      template: "./public/index.html",
    }),
    new MiniCssExtractPlugin(),
    new CopyPlugin({
      patterns: [
        { from: "./public/", to: "./public" },
        {
          from: "./src/utils/pyodideWorker.js",
          to: "./scripts/pyodideWorker.js",
        },
      ],
    }),
  ],
}
