const oracledb = require("oracledb");

const table_name = "proxies";

exports.createProxyTable = async (binds = [], opts = []) => {
  console.log("create proxy table");

  const statement = `
    CREATE TABLE ${table_name}
    ( 
      proxy varchar(250) NOT NULL,
      login varchar(250) NOT NULL,
      password varchar(250) NOT NULL
    )
    `;

  await execute(statement, binds, opts);
};

exports.clearProxyTable = async (binds = [], opts = []) => {
  const statement = `DELETE FROM ${table_name}`;

  await execute(statement, binds, opts);
};

exports.createProxy = async (data, binds = [], opts = []) => {
  console.log("create proxy");

  const statement = `
    INSERT INTO ${table_name}(proxy, login, password)
    VALUES ('${data.proxy}', '${data.login}', '${data.password}')
  `;

  await execute(statement, binds, opts);
};

exports.getAllProxies = async (binds = [], opts = []) => {
  const statement = `
    SELECT * FROM ${table_name}
  `;

  const res = await execute(statement, binds, opts);

  return res.rows;
};

// Execute PL/SQL query
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
      console.log(err);

      console.log(err.errorNum);

      if (err.errorNum === 942) {
        await this.createProxyTable();
      }

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
