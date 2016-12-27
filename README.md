# ndm-schema-generator

A tool to generate a database schema object for use with the [node-data-mapper](https://github.com/benbotto/node-data-mapper) project.

When using [node-data-mapper](https://github.com/benbotto/node-data-mapper) a database schema object is required to describe how each table and column will be mapped from a tablular format to a normalized format (from rows and columns to JavaScript objects and arrays).  Manually creating and maintaining a database schema object is cumbersome and error prone, so it's recommended that the database schema object be generated automatically at application start-up time.  After all, the database itself has metadata available that describes the tables, columns, data types, maximum lengths, nullability, etc.  Using a generator makes additions and modifications to the database automatic.  So if, for example, a column is added to the database, a simple application restart gives the ORM knowledge of the new column.  This tool provides a working example that can be used to generate a database schema object, with some useful hooks for aliasing tables and columns and attaching global converters.

### Table of Contents

- [Getting Started](#getting-started)
    - [Install ndm-schema-generator](#install-ndm-schema-generator)
    - [Create a DataContext Instance](#create-a-datacontext-instance)
- [Generate a Database Schema Object](#generate-a-database-schema-object)
    - [Example](#example)
    - [Table Callback](#table-callback)
    - [Column Callback](#column-callback)

### Getting Started

First off, if you're not familiar with [node-data-mapper](https://github.com/benbotto/node-data-mapper) then please read through the [Getting Started](https://github.com/benbotto/node-data-mapper#getting-started) section.  The ndm-schema-generator is implemented in terms of node-data-mapper, and the initial setup is therefore similar.

The below example uses a fictitious ```bike_shops``` database.  If you would like to run the example included in the example folder (```./example/example.js```), then first [follow the instructions](https://github.com/benbotto/node-data-mapper#examples) for creating the ```bike_shops``` database.

##### Install ndm-schema-generator

```bash
$ npm install ndm-schema-generator --save
```

##### Create a DataContext Instance

After installation, a ```DataContext``` instance needs to be set up.  This object provides connection details for your database.  The supplied user must have access to the ```INFORMATION_SCHEMA``` database, as it's what is queried to retrieve metadata about your database and subsequently generate the database schema object.  Here's an example script that exports a ```DataContext``` instance (reference ```example/infoSchemaDataContext.js```):

```JavaScript
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
```

### Generate a Database Schema Object

##### Example

Below is a quick example of how to generate a database schema object using the ```DataContext``` instance defined [above](#create-a-datacontext-instance).  The example generates the schema object, performs some minor manipulation on the tables and columns, and then prints the results to the console.  There are two hooks--tableCB and columnCB--that will be described in further detail below.

```JavaScript
'use strict';

const ndm          = require('node-data-mapper');
const Generator    = require('ndm-schema-generator').Generator;
const infoSchemaDC = require('./infoSchemaDataContext');
const util         = require('util');

let generator = new Generator(infoSchemaDC);

/**
 * The table alias removes any underscores and uppercases the proceeding
 * character.  Ex: bike_shop_bikes => bikeShopBikes
 * @param table A Table object with name and alias properties.
 */
function tableCB(table) {
  table.alias = table.name.replace(/_[a-z]/g, (c) => c.substr(1).toUpperCase());
}

/**
 * Set up each column.
 * @param col A Column object with name, alias, dataType, columnType,
 *        isNullable, maxLength, and isPrimary properties.
 * @param table A Table object with name and alias properties.
 */
function columnCB(col, table) {
  // Add a converter based on the type.
  if (col.dataType === 'bit')
    col.converter = ndm.bitConverter;
}

generator
  .generateSchema('bike_shop', tableCB, columnCB)
  .then((schema) => console.log(util.inspect(schema, {depth: null})))
  .catch(console.error);
```

The ```generator.generateSchema``` method takes three parameters: ```dbName```, which is a string; ```tableCB```, a function that takes a table object as a parameter; and ```columnCB```, which is a function that takes column and table objects as parameters.

##### Table Callback

The ```tableCB``` callback function is called once for each table in the database.  This is the appropriate place to define global aliases for tables.  In the example above, tables are defined in the database using snake_case (```bike_shops``` and ```bike_shop_bikes``` for example).  In JavaScript, however, the most common convention is camelCase.  Hence, the ```tableCB``` function above take in a ```table object``` with a ```name``` in snake_case, and modifies it to have a camelCase ```alias```.

##### Column Callback

The ```columnCB``` callback function is called once for each column in the database.  Like the ```tableCB```, it can be used to alias columns.  In addition, it can be used to attached global converters based on data type.  In the example above, a ```bitConverter``` is attached to all ```bit```-type columns (in reality, this would most likely be attached to columns with a ```columnType``` of ```tinyint(1)``` as well).  At any rate, with the above definition in place every ```bit```-type column in the database will automatically be transformed into a boolean.  One could, for example, convert all dates to UTC strings, and a system-wide format changes can then be done in a single place.
