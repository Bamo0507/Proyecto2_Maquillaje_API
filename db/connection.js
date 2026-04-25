const neo4j = require('neo4j-driver');

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
);

const connectDB = async () => {
  await driver.verifyConnectivity();
  console.log('Conectado...');
};

module.exports = { driver, connectDB };
