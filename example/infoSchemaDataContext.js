'use strict';

const ndm   = require('node-data-mapper');
const mysql = require('mysql');

let db   = new ndm.Database(require('ndm-schema-generator').information_schema);
let pool = mysql.createPool({
  host:            'localhost',
  user:            'example',
  password:        'secret',
  database:        db.getName(),
  connectionLimit: 1
});

module.exports = new ndm.MySQLDataContext(db, pool);

