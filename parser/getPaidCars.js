const HttpsProxyAgent = require("https-proxy-agent");
const cheerio = require("cheerio");
const config = require("config");

const axios = require("axios");
const url = require("url");
const FormData = require("form-data");
const { getCar, createCar, updateCar } = require("../services/cars.database");
const { getAllProxies } = require("../services/proxy.database");
const { sendMessage } = require("../scripts/message");
const CronJob = require("cron").CronJob;

const MAX_VIEWS = config.get("paidMaxViews");
const isProcessing = {};

const getPaidNewCars = async (page = 1, city) => {
  if (page > 5) {
    console.log(city + " finished job(paid)");
    return;
  }

  const html = await getHtmlFromSearchPage(page, city);

  if (html) {
    const cars = getCarsJsonDataFromSearchPageHtml(html);
    console.log(
      city + " number of cars on " + page + " page(paid): " + cars.length
    );

    for (let i = 0; i < cars.length; i++) {
      const views = await checkViewsOfCar(cars[i].id);
      // try to check by publicationDate
      if (views && views < MAX_VIEWS && views > 0) {
        const isInDb = await checkForExistenceInCarfastCarsDb(
          cars[i],
          page,
          views
        );
        if (!isInDb) {
          const carHtml = await getHtmlFromCarPage(cars[i].id);

          if (!carHtml) {
            continue;
          }

          const carJson = getCarJsonDataFromCarPageHtml(carHtml);

          if (!carJson) {
            continue;
          }

          await saveFullInfoInDB(cars[i].id, carJson);
        }
      }
    }
  }

  await timeOut(100);
  await getPaidNewCars(page + 1, city);
};

const timeOut = (timeout) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, timeout);
  });
};

// returns html from kolesa page as a string
const getHtmlFromSearchPage = async (page, city) => {
  const defaultUrl = `https://kolesa.kz/cars/${city}/`;
  let params = "?page=" + page;

  console.log(defaultUrl + params);
  for (let counter = 0; counter < 10; counter++) {
    const html = await getUrl(defaultUrl + params);
    if (html) {
      console.log("HTML found");

      return html;
    }
    console.log(city + " Trying again page " + page);
  }
  return undefined;
};

// returns json data with cars information from search page html
const getCarsJsonDataFromSearchPageHtml = (html) => {
  try {
    const parsedData = cheerio.load(html);

    const listOfScriptsWithCarsData = parsedData("#results script")
      .toArray()
      .map((it) => {
        if (it && it.children && it.children[0] && it.children[0].data) {
          return it.children[0].data;
        }

        return undefined;
      })
      .filter((it) => !!it);

    return listOfScriptsWithCarsData
      .map((it) => it.split(".items.push(")[1])
      .filter((it) => !!it)
      .map((it) => it.split(");")[0])
      .filter((it) => !!it)
      .map((it) => {
        let result;
        try {
          result = JSON.parse(it);
        } catch (err) {
          console.log(err);
        }
        return result;
      })
      .filter((it) => !!it);
  } catch (err) {
    return [];
  }
};

// returns html from kolesa car page
const getHtmlFromCarPage = async (carId) => {
  const defaultUrl = `https://kolesa.kz/a/show/${carId}`;
  for (let counter = 0; counter < 10; counter++) {
    const html = await getUrl(defaultUrl);
    if (html !== null) {
      return html;
    }
    console.log(" Trying again ");
  }
  return undefined;
};

// returns json data with car information from car page html
const getCarJsonDataFromCarPageHtml = (html) => {
  try {
    const parsedData = cheerio.load(html);

    // let isNew = parsedData('.a-label--new').text()==='Новая'? true:false
    // let probeg = isNew ? 'Новая' : parsedData('dt[title="Пробег"]').first().next("dd").text().trim()
    let probeg =
      parsedData('dt[title="Пробег"]').first().next("dd").text().trim() === ""
        ? "Нет данных"
        : parsedData('dt[title="Пробег"]').first().next("dd").text().trim();
    let condition =
      parsedData(".offer__parameters-mortgaged").text() ===
      "Аварийная/Не на ходу"
        ? "Аварийная"
        : "На ходу";
    let gearbox = parsedData('dt[title="Коробка передач"]')
      .first()
      .next("dd")
      .text()
      .trim();
    let isCleared =
      parsedData('dt[title="Растаможен в Казахстане"]')
        .first()
        .next("dd")
        .text()
        .trim() === "Да"
        ? true
        : false;
    let volume = parsedData('dt[title="Объем двигателя, л"]')
      .first()
      .next("dd")
      .text()
      .trim();
    let rul = parsedData('dt[title="Руль"]').first().next("dd").text().trim();
    let privod = parsedData('dt[title="Привод"]')
      .first()
      .next("dd")
      .text()
      .trim();
    let kuzov = parsedData('dt[title="Кузов"]')
      .first()
      .next("dd")
      .text()
      .trim();

    const infoObj = {
      condition: condition,
      gearbox: gearbox,
      isCleared: isCleared,
      volume: volume,
      probeg: probeg,
      rul: rul,
      privod: privod,
      kuzov: kuzov,
    };

    return infoObj;
  } catch (err) {
    return undefined;
  }
};

//checks by id if car presents in db or not (if not saves new car in db and return false, else return true)
const checkForExistenceInCarfastCarsDb = async (car, page, view, cb) => {
  const isCar = await getCar(car.id);

  if (!isCar) {
    let diff = car.attributes.avgPrice
      ? round(
          (car.attributes.avgPrice - car.unitPrice) /
            (car.attributes.avgPrice / 100),
          2
        )
      : null;
    let difference = car.attributes.avgPrice
      ? diff < 0
        ? "На " + Math.abs(diff) + "% дороже рынка"
        : "На " + diff + "% дешевле рынка"
      : null;
    let percent = car.attributes.avgPrice
      ? diff < 0
        ? Math.abs(diff)
        : parseFloat("-" + Math.abs(diff))
      : null;
    var d = new Date();

    const data = {
      id: car.id,
      brand: car.attributes.brand ? car.attributes.brand : "",
      model: car.attributes.model ? car.attributes.model : "",
      title: car.attributes.brand + " " + car.attributes.model,
      year: parseInt(getYearFromName(car.name)),
      price: car.unitPrice,
      average: car.attributes.avgPrice
        ? car.attributes.avgPrice
        : car.unitPrice,
      date: car.publicationDate,
      save_date:
        ("0" + d.getDate()).slice(-2) +
        "-" +
        ("0" + (d.getMonth() + 1)).slice(-2) +
        "-" +
        d.getFullYear() +
        " " +
        ("0" + d.getHours()).slice(-2) +
        ":" +
        ("0" + d.getMinutes()).slice(-2),
      city: car.city,
      url: car.url,
      difference: difference,
      percent: percent,
      page: page,
      view: view,
    };

    await createCar(data);
    console.log("I have found new car(paid): " + car.name.split("  ")[0]);
    return false;
  } else {
    return true;
  }
};

function getYearFromName(name) {
  for (let i = 1; i < name.split(" ").length; i++) {
    if (/^год/.test(name.split(" ")[i])) {
      return name.split(" ")[i - 1];
    }
  }
}

//returns number of view of car
async function checkViewsOfCar(carId) {
  const formData = new FormData();
  formData.append("return_counters", 1);
  formData.append("nb_views", 1);

  try {
    let res;
    if (!config.get("useProxy")) {
      res = await axios.post(
        "https://kolesa.kz/ms/views/kolesa/live/" + carId + "/",
        formData,
        { headers: formData.getHeaders() }
      );
    } else {
      const proxies = await getAllProxies();
      const proxy = proxies[Math.floor(Math.random() * proxies.length)] || {};
      let agent;
      if (proxy.PROXY) {
        var proxyOpts = url.parse(proxy.PROXY);
        proxyOpts.auth = `${proxy.LOGIN}:${proxy.PASSWORD}`;
        agent = new HttpsProxyAgent(proxyOpts);
        // agent = new HttpsProxyAgent(proxy.proxy);
      }
      res = await axios.post(
        "https://kolesa.kz/ms/views/kolesa/live/" + carId + "/",
        formData,
        { headers: formData.getHeaders(), httpsAgent: agent }
      );
    }

    return res.data.data.nb_views ? res.data.data.nb_views : null;
  } catch (err) {
    return null;
  }
}

//updates existing car with full info(such as probeg, condition and etc)
async function saveFullInfoInDB(carId, carInfo) {
  await updateCar(carId, carInfo);

  await sendMessage({ ...carInfo, ...(await getCar(carId)) });
}

//fetch request to get response body of requested page(two options with proxy or not)
async function getUrl(endpoint) {
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.75 Safari/537.36",
    "X-Requested-With": "XMLHttpRequest",
    "sech-ch-ua":
      '" Not A;Brand";v="99", "Chromium";v="100", "Google Chrome";v="100"',
  };

  try {
    let response;
    if (!config.get("useProxy")) {
      response = await axios.get(endpoint, {
        headers,
        timeout: 5000,
      });
    } else {
      const proxies = await getAllProxies();
      const proxy = proxies[Math.floor(Math.random() * proxies.length)] || {};
      //if we use login and pass for proxy
      var proxyOpts = url.parse(proxy.PROXY);
      proxyOpts.auth = `${proxy.LOGIN}:${proxy.PASSWORD}`;
      const proxyAgent = new HttpsProxyAgent(proxyOpts);

      response = await axios.get(endpoint, {
        timeout: 5000,
        httpsAgent: proxyAgent,
        headers,
      });
    }

    if (response && response.status === 200) {
      const body = await response.data;
      return body;
    } else {
      console.log(
        "Could not get response from " +
          endpoint +
          " and status code: " +
          response.status
      );
      return null;
    }
  } catch (err) {
    console.log(err, 267);
    return null;
  }
}

//round number with some precision
function round(value, precision) {
  var multiplier = Math.pow(10, precision || 0);
  return Math.round(value * multiplier) / multiplier;
}

function createJob(city) {
  return new CronJob(config.get("getPaidCarsCrone"), async function () {
    start(city);
  });
}

const start = async (city) => {
  if (isProcessing[city]) {
    console.log("Job still not finished");
    return;
  }
  isProcessing[city] = true;

  console.log("Started job (paid)", city);
  try {
    await getPaidNewCars(1, city);
  } catch (err) {
    console.error(err, 299);
  } finally {
    isProcessing[city] = false;
    console.log(city + " FINISHED job (paid)");
  }
};

function createJobAlmaty() {
  const almatyJob = createJob("almaty");
  almatyJob.start();
}

function createNurSultanJob() {
  const nurSultanJob = createJob("nur-sultan");
  nurSultanJob.start();
}

function createShymkentJob() {
  const shymkentJob = createJob("shymkent");
  shymkentJob.start();
}

function createAkmlOblJob() {
  const akmlOblJob = createJob("region-akmolinskaya-oblast");
  akmlOblJob.start();
}

function createAktOblJob() {
  const aktOblJob = createJob("region-aktubinskaya-oblast");
  aktOblJob.start();
}

function createAlmOblJob() {
  const almOblJob = createJob("region-almatinskaya-oblast");
  almOblJob.start();
}

function createAtyrOblJob() {
  const atyrOblJob = createJob("region-atyrauskaya-oblast");
  atyrOblJob.start();
}

function createVkOblJob() {
  const vkOblJob = createJob("region-vostochnokazakhstanskaya-oblast");
  vkOblJob.start();
}

function createZhamOblJob() {
  const zhamOblJob = createJob("region-zhambilskaya-oblast");
  zhamOblJob.start();
}

function createZkOblJob() {
  const zkOblJob = createJob("region-zapadnokazakshstabskaya-oblast");
  zkOblJob.start();
}

function createKostOblJob() {
  const kostOblJob = createJob("region-kostanayskaya-oblast");
  kostOblJob.start();
}

function createKzlOblJob() {
  const kzlOblJob = createJob("region-kyzylordinskaya-oblast");
  kzlOblJob.start();
}

function createMangOblJob() {
  const mangOblJob = createJob("region-mangistauskaya-oblast");
  mangOblJob.start();
}

function createPavlOblJob() {
  const pavlOblJob = createJob("region-pavlodarskaya-oblast");
  pavlOblJob.start();
}

function createSkOblJob() {
  const skOblJob = createJob("region-severokazakhstanskaya-oblast");
  skOblJob.start();
}

function createYukOblJob() {
  const yukOblJob = createJob("region-yuzhnokazahstanskaya-oblast");
  yukOblJob.start();
}

function createJobs() {
  createNurSultanJob();
  createShymkentJob();
  createAkmlOblJob();
  createAktOblJob();
  createAlmOblJob();
  createAtyrOblJob();
  createVkOblJob();
  createZhamOblJob();
  createZkOblJob();
  createKostOblJob();
  createKzlOblJob();
  createMangOblJob();
  createPavlOblJob();
  createSkOblJob();
  createYukOblJob();
}

module.exports = {
  createJobAlmaty,
  createNurSultanJob,
  createShymkentJob,
  createAkmlOblJob,
  createAktOblJob,
  createAlmOblJob,
  createAtyrOblJob,
  createVkOblJob,
  createZhamOblJob,
  createZkOblJob,
  createKostOblJob,
  createKzlOblJob,
  createMangOblJob,
  createPavlOblJob,
  createSkOblJob,
  createYukOblJob,
  createJobs,
};
