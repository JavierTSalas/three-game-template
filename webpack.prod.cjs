const config = require('./webpack.config.cjs');
module.exports = { ...config, mode: 'production', devtool: false, devServer: undefined };
