const factory = require('./src/client.js');

if (typeof jQuery === 'undefined')
  throw new Error('jQuery not found in the global scope');

factory(jQuery);
