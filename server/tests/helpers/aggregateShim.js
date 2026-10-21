// Test-only helper. Some MongoDB-compatible servers (e.g. FerretDB 1.x) do not implement every
// aggregation accumulator ($avg, ...). When the tests detect such a server they run the pipeline
// through `mingo`, which implements MongoDB's aggregation semantics in JavaScript:
// the leading $match is executed by the database, the remaining stages by mingo.
// With a real MongoDB server this file is never used.
module.exports = function installAggregateShim(mongoose) {
  require('mingo/init/system');
  const { Aggregator } = require('mingo');
  mongoose.Model.aggregate = async function aggregate(pipeline = []) {
    const hasMatch = pipeline[0] && pipeline[0].$match;
    const docs = await this.find(hasMatch ? pipeline[0].$match : {}).lean();
    return new Aggregator(hasMatch ? pipeline.slice(1) : pipeline).run(docs);
  };
};
