'use strict';

require('insulin').factory('ndm_MSSQLSchemaGenerator', ndm_MSSQLSchemaGeneratorProducer);

function ndm_MSSQLSchemaGeneratorProducer(mssql, deferred, ndm_Schema,
  ndm_DataMapper, ndm_booleanConverter) {

  const events       = require('events');
  const EventEmitter = events.EventEmitter;

  class MSSQLSchemaGenerator extends EventEmitter {
    /**
     * Initialize the schema generator.
     * @param {Connection} conn - A connection to the MSSQL database with
     * permission to read from the INFORMATION_SCHEMA table (the user will need
     * VIEW DEFINITION granted).
     */
    constructor(conn) {
      super();

      this._conn = conn;
    }

    /**
     * Generate the schema from the database.
     * @param {String} dbName - The name of the database for which the schema should be
     *        generated.
     * @param {String} [schema="dbo"] - The schema (e.g. dbo).
     * @return {Promise<Object>} A promise that shall be resolved with the generated
     * schema.
     */
    generateSchema(dbName, schema = 'dbo') {
      const sql = `
        SELECT  t.TABLE_NAME, t.TABLE_SCHEMA,
                c.COLUMN_NAME, c.DATA_TYPE, c.IS_NULLABLE,
                c.CHARACTER_MAXIMUM_LENGTH, c.COLUMN_DEFAULT,
                CASE
                  WHEN pri_ccu.COLUMN_NAME IS NULL THEN 0
                  ELSE 1
                END AS isPrimary,
                for_ccu.CONSTRAINT_NAME,
                for_ccu.TABLE_NAME fkTable,
                for_ccu.COLUMN_NAME AS fkColumn,
                ref_ccu.TABLE_NAME AS refsTable,
                ref_ccu.COLUMN_NAME AS refsColumn
        FROM    INFORMATION_SCHEMA.TABLES t
        INNER JOIN INFORMATION_SCHEMA.COLUMNS c ON t.TABLE_NAME = c.TABLE_NAME
          AND t.TABLE_CATALOG = c.TABLE_CATALOG
          AND t.TABLE_SCHEMA = c.TABLE_SCHEMA

        -- Primary key constraint.
        LEFT OUTER JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS pri_tc ON t.TABLE_NAME = pri_tc.TABLE_NAME
          AND t.TABLE_CATALOG = pri_tc.TABLE_CATALOG
          AND t.TABLE_SCHEMA = pri_tc.TABLE_SCHEMA
          AND pri_tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
        LEFT OUTER JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE pri_ccu ON t.TABLE_NAME = pri_ccu.TABLE_NAME
          AND t.TABLE_CATALOG = pri_ccu.TABLE_CATALOG
          AND t.TABLE_SCHEMA = pri_ccu.TABLE_SCHEMA
          AND pri_tc.CONSTRAINT_NAME = pri_ccu.CONSTRAINT_NAME
          AND pri_ccu.COLUMN_NAME = c.COLUMN_NAME

        -- Foreign keys (by table, not by column).
        LEFT OUTER JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS for_tc ON t.TABLE_NAME = for_tc.TABLE_NAME
          AND t.TABLE_CATALOG = for_tc.TABLE_CATALOG
          AND t.TABLE_SCHEMA = for_tc.TABLE_SCHEMA
          AND for_tc.CONSTRAINT_TYPE = 'FOREIGN KEY'
        LEFT OUTER JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE for_ccu ON t.TABLE_NAME = for_ccu.TABLE_NAME
          AND t.TABLE_CATALOG = for_ccu.TABLE_CATALOG
          AND t.TABLE_SCHEMA = for_ccu.TABLE_SCHEMA
          AND for_tc.CONSTRAINT_NAME = for_ccu.CONSTRAINT_NAME

        -- Foreign key references this table.
        LEFT OUTER JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc ON for_tc.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
          AND for_tc.TABLE_SCHEMA = rc.CONSTRAINT_SCHEMA
          AND for_tc.TABLE_CATALOG = rc.CONSTRAINT_CATALOG
        LEFT OUTER JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE ref_ccu ON rc.UNIQUE_CONSTRAINT_NAME = ref_ccu.CONSTRAINT_NAME
          AND rc.UNIQUE_CONSTRAINT_SCHEMA = ref_ccu.CONSTRAINT_SCHEMA
          AND rc.UNIQUE_CONSTRAINT_CATALOG = ref_ccu.CONSTRAINT_CATALOG

        WHERE   t.TABLE_CATALOG = @dbName
          AND   t.TABLE_TYPE = 'BASE TABLE'
          AND   t.TABLE_SCHEMA = @schema
        ORDER BY t.TABLE_NAME, c.COLUMN_NAME`;

      const request = new mssql.Request(this._conn);
      request.input('dbName', mssql.NVarChar, dbName);
      request.input('schema', mssql.NVarChar, schema);

      // Run the query and serialize the results.
      // Note: deferred is used as the promise library.  Since mssql uses native
      // promises, the query executation is wrapped.
      return deferred(request.query(sql))
        .then(res => {
          // Serialize the result to a normalized object.
          const tblSchema = new ndm_Schema('TABLE_NAME', 'name')
            .addProperty('TABLE_SCHEMA', 'schema')
            .addSchema('columns', new ndm_Schema('COLUMN_NAME', 'name')
              .addProperty('DATA_TYPE', 'dataType')
              .addProperty('IS_NULLABLE', 'isNullable', val => val === 'YES')
              .addProperty('CHARACTER_MAXIMUM_LENGTH', 'maxLength',
                val => val === -1 ? 2147483647 : val)
              .addProperty('COLUMN_DEFAULT', 'defaultValue')
              .addProperty('isPrimary', 'isPrimary', ndm_booleanConverter.onRetrieve))
            .addSchema('foreignKeys', new ndm_Schema('CONSTRAINT_NAME', 'constraintName')
              .addProperty('fkTable', 'table')
              .addProperty('fkColumn', 'column')
              .addSchema('references', new ndm_Schema('CONSTRAINT_NAME', 'constraintName')
                .addProperty('refsTable', 'table')
                .addProperty('refsColumn', 'column'), 'single'));

          const tables = new ndm_DataMapper().serialize(res, tblSchema);

          tables.forEach(table => {
            this.emit('ADD_TABLE', table);
            table.columns.forEach(col => this.emit('ADD_COLUMN', col, table));
          });

          return {
            name:   dbName,
            tables: tables
          };
        });
    }
  }

  return MSSQLSchemaGenerator;
}

