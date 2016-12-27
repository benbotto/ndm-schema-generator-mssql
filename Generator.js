'use strict';

class Generator {
  /**
   * Initialize the schema generator.
   * @param infoSchemaDC A DataContext instance with permission to read
   *        from the INFORMATION_SCHEMA table.
   */
  constructor(infoSchemaDC) {
    this._infoSchemaDC = infoSchemaDC;
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

    // Get all the tables and columns from the information_schema db.
    let query = this._infoSchemaDC
      .from('tables')
      .innerJoin({
          table:  'columns',
          parent: 'tables',
          on: {
            $and: [
              {$eq: {'tables.TABLE_NAME':'columns.TABLE_NAME'}},
              {$eq: {'tables.TABLE_SCHEMA':'columns.TABLE_SCHEMA'}}
            ]
          }
        })
      .where({$eq: {'tables.TABLE_SCHEMA':':schema'}}, {schema: dbName})
      .select('tables.TABLE_NAME', 'columns.COLUMN_NAME',
        'columns.DATA_TYPE', 'columns.COLUMN_TYPE',
        'columns.IS_NULLABLE', 'columns.CHARACTER_MAXIMUM_LENGTH',
        'columns.COLUMN_KEY', 'columns.COLUMN_DEFAULT')
      .orderBy('tables.TABLE_NAME', 'columns.COLUMN_NAME');

    return query
      .execute()
      .then(function(res) {
        // Fire the table and column callbacks.
        res.tables.forEach(function(table) {
          tableCB(table);
          table.columns.forEach((col) => columnCB(col, table));
        });

        let database = {
          name:   dbName,
          tables: res.tables
        };

        return database;
      })
      .finally(() => this._infoSchemaDC.getQueryExecuter().getConnectionPool().end());
  }
}

module.exports = Generator;

