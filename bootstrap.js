'use strict';

/**
 * This script sets up the dependency injection container, insulin.
 */
const insulin = require('insulin');

// Static dependencies.
insulin
  .factory('mssql',    () => require('mssql'))
  .factory('deferred', () => require('deferred'));

// ndm registers itself with insulin under the namespace ndm.
require('node-data-mapper');

// Application (dynamic) dependencies.
const glob = require('glob');
const opts = {
  cwd: __dirname,
  ignore: [
    './node_modules/**',
    './example/**',
    './bootstrap.js',
    './index.js'
  ]
};

const files = glob.sync('./**/*.js', opts);

// Let each file register itself with the DiC.
files.forEach(require);

// Export the list of files.
module.exports = files;

