'use strict';

let db = {
  name: 'INFORMATION_SCHEMA',
  tables: [
    {
      name: 'tables',
      columns: [
        {
          name: 'TABLE_NAME',
          alias: 'name',
          isPrimary: true
        },
        {
          name: 'TABLE_SCHEMA'
        }
      ]
    },
    {
      name: 'columns',
      columns: [
        {
          name: 'COLUMN_NAME',
          alias: 'name',
          isPrimary: true
        },
        {
          name: 'TABLE_NAME'
        },
        {
          name: 'TABLE_SCHEMA'
        },
        {
          name: 'DATA_TYPE',
          alias: 'dataType'
        },
        {
          name: 'COLUMN_TYPE',
          alias: 'columnType'
        },
        {
          name: 'CHARACTER_MAXIMUM_LENGTH',
          alias: 'maxLength'
        },
        {
          name: 'IS_NULLABLE',
          alias: 'isNullable',
          converter: {
            onRetrieve: function(val) {
              return val === 'YES';
            }
          }
        },
        {
          name: 'COLUMN_KEY',
          alias: 'isPrimary',
          converter: {
            onRetrieve: function(val) {
              return val === 'PRI';
            }
          }
        },
        {
          name: 'COLUMN_DEFAULT',
          alias: 'defaultValue'
        }
      ]
    }
  ]
};

module.exports = db;

