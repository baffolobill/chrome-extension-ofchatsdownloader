const WebpackDevServer = require('webpack-dev-server');
const Webpack = require('webpack');
const path = require('path');
const config = require('../webpack.config');
const env = require('./env');

const options = config.chromeExtensionBoilerplate || {};
const excludeEntriesToHotReload = options.notHotReload || [];

Object.keys(config.entry).forEach((entryName) => {
  if (excludeEntriesToHotReload.indexOf(entryName) === -1) {
    config.entry[entryName] = [
      `webpack-dev-server/client?http://localhost:${env.PORT}`,
      'webpack/hot/dev-server',
    ].concat(config.entry[entryName]);
  }
});

config.plugins = [new Webpack.HotModuleReplacementPlugin()].concat(
  config.plugins || []
);

const devServerOptions = {
  port: env.PORT,
  static: path.join(__dirname, '../build'),
  headers: {
    'Access-Control-Allow-Origin': '*',
  },
  open: true,
};

delete config.chromeExtensionBoilerplate;

const compiler = Webpack(config, (err) => {
  if (err) throw err;
  const server = new WebpackDevServer(devServerOptions, compiler);
  server.start();
});
