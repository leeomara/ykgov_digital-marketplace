const path = require('path');
const moduleAlias = require('module-alias');
moduleAlias.addAlias('scripts', __dirname);
moduleAlias.addAlias('back-end', path.resolve(__dirname, '../back-end'));
moduleAlias.addAlias('shared', path.resolve(__dirname, '../shared'));
moduleAlias.addAlias('migrations', path.resolve(__dirname, '../migrations'));
moduleAlias();
require('./index.js');
