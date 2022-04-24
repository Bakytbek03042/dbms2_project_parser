const config = require("config");
const oracledb = require("oracledb");

const initialize = async () => {
  const pool = await oracledb.createPool(config.get("orclpdb.hrPool"));
};
exports.initialize = initialize;

const closePool = async () => {
  await oracledb.getPool().close();
};
exports.close = closePool;

const execute = (statement, binds = [], opts = []) => {
  return new Promise(async (resolve, reject) => {
    let conn;

    opts["outFormat"] = oracledb.OBJECT;
    opts["autoCommit"] = true;

    try {
      conn = await oracledb.getConnection();

      const result = await conn.execute(statement, binds, opts);

      resolve(result);
    } catch (err) {
      reject(err);
    } finally {
      if (conn) {
        try {
          await conn.close();
        } catch (err) {
          console.log(err);
        }
      }
    }
  });
};
exports.execute = execute;
