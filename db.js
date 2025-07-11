const { MongoClient } = require("mongodb");
require("dotenv").config();

const dbURI = process.env.DB_URI;
let dbConnection;
module.exports = {
  connectToDb: (cb) => {
    // console.log(dbURI)
    MongoClient.connect(dbURI)
      .then((client) => {
        dbConnection = client.db();
        return cb();
      })
      .catch((err) => {
        // console.log(err)
        return cb();
      });
  },
  getDb: () => dbConnection,
};
