const database = require("./services/database");

const startDatabaseInitialization = async () => {
  console.log("Initializing database module");

  try {
    await database.initialize().then(() => {
      console.log(`Database initialized | ${new Date()}`);

      require("./parser/");
    });
  } catch (e) {
    console.log(e);

    process.exit(1);
  }
};
startDatabaseInitialization();
