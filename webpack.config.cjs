const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: { index: path.resolve(__dirname, 'index.js') },
  devtool: 'inline-source-map',
  devServer: {
    static: false,
    host: '0.0.0.0', // phone testing over LAN
    allowedHosts: 'all',
    port: 8180,
  },
  plugins: [
    new HtmlWebpackPlugin({ template: path.resolve(__dirname, 'index.html') }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'scenes', to: 'scenes' },
        { from: 'game_objects', to: 'game_objects' },
        { from: 'data', to: 'data' },
        { from: 'models', to: 'models', noErrorOnMissing: true },
        { from: 'fonts', to: 'fonts' },
        { from: 'icons', to: 'icons' },
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'sw.js', to: 'sw.js' },
        { from: 'game.json', to: 'game.json' },
      ],
    }),
  ],
  output: { filename: '[name].bundle.js', path: path.resolve(__dirname, 'dist'), clean: true },
};
