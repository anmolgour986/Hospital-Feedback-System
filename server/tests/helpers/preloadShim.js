// Dev/test only: `node -r ./tests/helpers/preloadShim.js server.js` for MongoDB-compatible emulators that lack $avg etc.
require('./aggregateShim')(require('mongoose'));
