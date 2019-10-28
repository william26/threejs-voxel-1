const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = (env = {}) => ({
  mode: env.mode === "production" ? "production" : "development",
  entry: "./src/index.ts",
  output: {
    path: `${__dirname}/compiled`,
    filename: "bundle.[hash].js"
  },
  module: {
    rules: [
      {
        test: /.*\.tsx?$/,
        use: "ts-loader",
        exclude: `${__dirname}/node_modules`
      },
      {
        test: /.*\.obj$/,
        use: {
          loader: "file-loader",
          options: {
            name: "[name].[hash].[ext]"
          }
        }
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/index.html"
    })
  ],
  resolve: {
    extensions: [".js", ".ts", ".tsx", ".jsx"]
  },
  devServer: {
    host: "0.0.0.0"
  }
});
