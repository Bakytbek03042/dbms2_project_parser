const oracledb = require("oracledb");

const table_name = "cars";

exports.getCar = async (id, binds = [], opts = []) => {
  const statement = `SELECT * FROM ${table_name} WHERE CAR_ID=${id}`;

  const res = await execute(statement);

  if (res.rows.length > 0) {
    return res.rows[0];
  }

  return null;
};

exports.createCarTable = async (binds = [], opts = []) => {
  const statement = `
    CREATE TABLE ${table_name}
    ( 
      car_id number(38) NOT NULL,
      title varchar(150) NOT NULL,
      brand varchar(50) NOT NULL,
      model varchar(50) NOT NULL,
      city varchar(100) NOT NULL,
      price number(38) NOT NULL,
      car_date varchar(50) NULL,
      car_view number(38) NULL,
      car_year number(38) NOT NULL,
      car_url varchar(150) NOT NULL,
      car_condition varchar(50) NOT NULL,
      gearbox varchar(50) NOT NULL,
      is_cleared number(1) NOT NULL
    )
    `;

  await execute(statement, binds, opts);
};

exports.updateCar = async (id, data, binds = [], opts = []) => {
  console.log("update car", id);

  const statement = `
    UPDATE ${table_name}
    SET gearbox = '${data.gearbox}',
      car_condition = '${data.condition}',
      is_cleared = ${data.isCleared ? 1 : 0}
    WHERE car_id = ${id}
  `;

  await execute(statement, binds, opts);
};

exports.createCar = async (data, binds = [], opts = []) => {
  console.log("create car");

  const statement = `INSERT INTO ${table_name}
  (car_id, title, brand, model, city, price, car_date, car_view, car_year, car_url, car_condition, gearbox, is_cleared)
  VALUES 
  (${data.id}, '${data.title}', '${data.brand}', '${data.model}', '${
    data.city
  }', ${data.price}, NULL, ${data.view}, ${data.year}, '${data.url}', '${
    data.condition
  }', '${data.gearbox}', ${1})`;

  await execute(statement, binds, opts);
};

// Execute PL/SQL query
const execute = (statement, binds = [], opts = []) => {
  console.log("execute car");

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
        await this.createCarTable();
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
