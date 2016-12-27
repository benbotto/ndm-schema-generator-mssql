'use strict';

const ndm   = require('node-data-mapper');
const mssql = require('mssql');

class Generator {
  /**
   * Initialize the schema generator.
   * @param {Connection} conn - A connection to the MSSQL database with
   * permission to read from the INFORMATION_SCHEMA table.
   */
  constructor(conn) {
    this._conn = conn;
  }

  /**
   * Generate the schema from the database.
   * @param dbName The name of the database for which the schema should be
   *        generated.
   * @param tableCB A callback function(table) that is called with each
   *        table.  The function can be used to set the table alias or perform
   *        other table-level manipulation.
   * @param columnCB A callback function(column, table) that is called with
   *        each column.  The function can be used to set a column alias or
   *        add converters.
   */
  generateSchema(dbName, tableCB, columnCB) {
    tableCB  = tableCB  || function() {};
    columnCB = columnCB || function() {};

    const sql = `
      SELECT  t.TABLE_NAME, t.TABLE_SCHEMA,
              c.COLUMN_NAME, c.DATA_TYPE, c.IS_NULLABLE,
              c.CHARACTER_MAXIMUM_LENGTH, c.COLUMN_DEFAULT,
              CASE
                WHEN pri_ccu.COLUMN_NAME IS NULL THEN 0
                ELSE 1
              END AS isPrimary,
              '-------OTHER---------', c.*
      FROM    INFORMATION_SCHEMA.TABLES t
      INNER JOIN INFORMATION_SCHEMA.COLUMNS c ON t.TABLE_NAME = c.TABLE_NAME
        AND t.TABLE_SCHEMA = c.TABLE_SCHEMA
      LEFT OUTER JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS pri_tc ON t.TABLE_NAME = pri_tc.TABLE_NAME
        AND t.TABLE_CATALOG = pri_tc.TABLE_CATALOG
        AND pri_tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
      LEFT OUTER JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE pri_ccu ON t.TABLE_NAME = pri_ccu.TABLE_NAME
        AND t.TABLE_CATALOG = pri_ccu.TABLE_CATALOG
        AND pri_tc.CONSTRAINT_NAME = pri_ccu.CONSTRAINT_NAME
        AND pri_ccu.COLUMN_NAME = c.COLUMN_NAME
      WHERE   t.TABLE_CATALOG = @dbName
        AND   t.TABLE_TYPE = 'BASE TABLE'
      ORDER BY t.TABLE_NAME`;
    const request = new mssql.Request();
    request.input('dbName', mssql.NVarChar, dbName);

    request
      .query(sql)
      .then(res => {
        console.log('Success');
        console.log(res);
        conn.close();
      })
      .catch(err => {
        console.error('Error executing query.');
        console.error(err);
        conn.close();
      });
  }
}

module.exports = Generator;

