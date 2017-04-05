'use strict';

const mssql                   = require('mssql');
const deferred                = require('deferred');
const ndm                     = require('node-data-mapper');
const schemaGen               = require('ndm-schema-generator-mssql');
const MSSQLSchemaGenerator    = schemaGen.MSSQLSchemaGenerator;
const util                    = require('util');
const settings                = {
  user     : 'example',
  password : 'secret',
  server   : 'localhost',
  database : 'bike_shop'
};

deferred(mssql.connect(settings))
  .then(conn => {
    const generator = new MSSQLSchemaGenerator(conn);

    generator.on('ADD_TABLE',  onAddTable);
		generator.on('ADD_COLUMN', onAddColumn);

    return generator.generateSchema(settings.database);
  })
  .then(schema => console.log(util.inspect(schema, {depth: null})))
  .catch(console.error)
  .finally(() => mssql.close());

/**
 * The table mapping (maptTo) removes any underscores and uppercases the
 * proceeding character.  Ex: bike_shop_bikes => bikeShopBikes
 * @param {Table} table - A Table object with name and alias properties.
 */
function onAddTable(table) {
  table.mapTo = table.name.replace(/_[a-z]/g, c => c.substr(1).toUpperCase());
}

/**
 * Set up each column.
 * @param {Column} col - A Column object with name, dataType,
 * columnType, isNullable, maxLength, and isPrimary properties.
 * @param {Table} table - A Table object with name and alias properties.
 */
function onAddColumn(col, table) {
  // Add a converter based on the type.
  if (col.dataType === 'bit')
    col.converter = ndm.booleanConverter;
}

