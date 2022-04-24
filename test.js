const { getCar, createCar } = require("./services/cars.database");
const database = require("./services/database");
const {
  createProxy,
  getAllProxies,
  clearProxyTable,
} = require("./services/proxy.database");

const startDatabaseInitialization = async () => {
  console.log("Initializing database module");

  try {
    await database.initialize().then(() => {
      console.log(`Database initialized | ${new Date()}`);

      start();
    });
  } catch (e) {
    console.log(e);

    process.exit(1);
  }
};
startDatabaseInitialization();

const start = async () => {};

const proxies = [
  {
    login: "ashimerarus",
    password: "R2tpQBG52g",
    proxy: "http://185.120.77.133:59100",
    host: "185.120.77.133",
    port: 59100,
  },
  {
    login: "ashimerarus",
    password: "R2tpQBG52g",
    proxy: "http://185.120.77.158:59100",
    host: "185.120.77.158",
    port: 59100,
    isActive: false,
    usedCount: 130249,
    __v: 0,
  },
  {
    login: "ashimerarus",
    password: "R2tpQBG52g",
    proxy: "http://185.120.76.136:59100",
    host: "185.120.76.136",
    port: 59100,
    isActive: false,
    usedCount: 130249,
    __v: 0,
  },
  {
    login: "ashimerarus",
    password: "R2tpQBG52g",
    proxy: "http://185.120.76.151:59100",
    host: "185.120.76.151",
    port: 59100,
    isActive: false,
    usedCount: 130889,
    __v: 0,
  },
  {
    login: "ashimerarus",
    password: "R2tpQBG52g",
    proxy: "http://185.120.78.144:59100",
    host: "185.120.78.144",
    port: 59100,
    isActive: false,
    __v: 0,
  },
  {
    login: "ashimerarus",
    password: "R2tpQBG52g",
    proxy: "http://185.120.79.124:59100",
    host: "185.120.79.124",
    port: 59100,
    isActive: false,
    usedCount: 131080,
    __v: 0,
  },
  {
    login: "ashimerarus",
    password: "R2tpQBG52g",
    proxy: "http://185.120.76.163:59100",
    host: "185.120.76.163",
    port: 59100,
    isActive: false,
    usedCount: 130109,
    __v: 0,
  },
  {
    login: "ashimerarus",
    password: "R2tpQBG52g",
    proxy: "http://185.120.77.197:59100",
    host: "185.120.77.197",
    port: 59100,
    isActive: false,
    usedCount: 131284,
    __v: 0,
  },
  {
    login: "ashimerarus",
    password: "R2tpQBG52g",
    proxy: "http://185.120.77.197:59100",
    host: "185.120.77.197",
    port: 59100,
    isActive: false,
    usedCount: 131284,
    __v: 0,
  },
  {
    login: "ashimerarus",
    password: "R2tpQBG52g",
    proxy: "http://185.120.79.122:59100",
    host: "185.120.79.122",
    port: 59100,
    isActive: false,
    usedCount: 131017,
    __v: 0,
  },
];
