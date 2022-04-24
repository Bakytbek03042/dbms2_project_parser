const HttpsProxyAgent = require("https-proxy-agent");
const cheerio = require("cheerio");
const CronJob = require("cron").CronJob;
const config = require("config");

const axios = require("axios");
const url = require("url");
const FormData = require("form-data");
const { getCar, createCar, updateCar } = require("../services/cars.database");
const { getAllProxies } = require("../services/proxy.database");
const { sendMessage } = require("../scripts/message");
const MAX_VIEWS = config.get("freeMaxViews");

const isProcessing = {};

const getFreeCars = async (page, city, startPage) => {
  if (page >= startPage + 5) {
    console.log(city + " finished job(free)");
    return;
  }

  const html = await getHtmlFromSearchPage(page, city);
  if (html) {
    const cars = getCarsJsonDataFromSearchPageHtml(html);
    console.log(
      city + " number of cars on " + page + " page(free): " + cars.length
    );
    for (let i = 0; i < cars.length; i++) {
      const views = await checkViewsOfCar(cars[i].id);
      // try to check by publicationDate
      if (views && views < MAX_VIEWS) {
        const isInDb = await checkForExistenceInCarfastCarsDb(
          cars[i],
          page,
          views
        );
        if (!isInDb) {
          const carHtml = await getHtmlFromCarPage(cars[i].id);

          if (!carHtml) {
            continue;
          } else {
            console.log("here");
          }

          const carJson = getCarJsonDataFromCarPageHtml(carHtml);

          if (!carJson) {
            continue;
          } else {
            console.log("here2");

            await updateCar(cars[i].id, carJson);

            const car = await getCar(cars[i].id);

            await sendMessage({
              ...carJson,
              ...car,
            });
          }
        }
      }
    }
  }

  await timeOut(100);
  await getFreeCars(page + 1, city, startPage);
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
  console.log(`page: ${page}, city: ${city}`);
  const defaultUrl = `https://kolesa.kz/cars/${city}/`;
  const params = page > 1 ? "?page=" + page : "";

  for (let counter = 0; counter < 10; counter++) {
    const html = await getUrl(defaultUrl + params);
    if (html !== null) {
      return html;
    }
    console.log(city + " Trying again free " + page);
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
    console.log("Trying again free" + page);
  }
  return undefined;
};

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

const checkForExistenceInCarfastCarsDb = async (car, page, view) => {
  const isCar = await getCar(car.id);
  // const isCar = await CAR.findOne({ id: car.id });
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
    // console.log(car.id+" "+car.attributes.brand +' '+car.attributes.model);

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
    console.log("I have found new car(free): " + car.name.split("  ")[0]);

    return false;
  } else {
    console.log("exists in db");
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
        {
          headers: formData.getHeaders(),
        }
      );
    } else {
      const proxies = await getAllProxies();
      const proxy = proxies[Math.floor(Math.random() * proxies.length)] || {};
      let agent;
      if (proxy.proxy) {
        var proxyOpts = url.parse(proxy.PROXY);
        proxyOpts.auth = `${proxy.LOGIN}:${proxy.PASSWORD}`;
        agent = new HttpsProxyAgent(proxyOpts);
        // agent = new HttpsProxyAgent(proxyOpts);
      }
      res = await axios.post(
        "https://kolesa.kz/ms/views/kolesa/live/" + carId + "/",
        formData,
        {
          headers: formData.getHeaders(),
          httpsAgent: agent,
        }
      );
    }

    return res.data.data.nb_views ? res.data.data.nb_views : null;

    // if (Config.environment !== 'production') {
    //     let res = await axios.post('https://kolesa.kz/ms/views/kolesa/live/' + carId + '/', formData, { headers: formData.getHeaders()})
    //     return res.data.data.nb_views ? res.data.data.nb_views : 0
    // } else {
    //     res = await axios.post('https://kolesa.kz/ms/views/kolesa/live/' + carId + '/', formData, { headers: formData.getHeaders(), httpsAgent: agent })
    //     return res.data.data.nb_views ? res.data.data.nb_views : 0
    // }
  } catch (err) {
    // console.log(err,209)
    return null;
  }
}

function round(value, precision) {
  var multiplier = Math.pow(10, precision || 0);
  return Math.round(value * multiplier) / multiplier;
}

const getFreeCarsStartingPage = async (page, min, max, counter, city) => {
  if (counter > 10) {
    console.log("Something went wrong with getFreeCarsStartingPage " + page);
    return page;
  }

  console.log("getFreeCarsStartingPage");

  const html = await getHtmlFromSearchPage(page, city);

  if (html) {
    const cars = getCarsJsonDataFromSearchPageHtml(html);
    if (cars) {
      let isFirstFree = cars[0].appliedPaidServices ? false : true;
      let isLastPaid = cars[cars.length - 1].appliedPaidServices ? true : false;
      //иногда после бесплатных может появиться одна-две платные
      //если первая бесплатная то следующие все бесплатные
      if (isFirstFree) {
        //двигаемся назад
        max = page;
        newPage = Math.floor((min + max) / 2);
        return await getFreeCarsStartingPage(
          newPage,
          min,
          max,
          ++counter,
          city
        );
      }
      //если последняя платная то предыдущие платные
      else if (isLastPaid) {
        //двигаемся вперед
        min = page;
        newPage = Math.floor((min + max) / 2);
        return await getFreeCarsStartingPage(
          newPage,
          min,
          max,
          ++counter,
          city
        );
      } else {
        //это нужная страница
        return page;
      }
    }
  }
};

async function getUrl(endpoint) {
  try {
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.75 Safari/537.36",
      "X-Requested-With": "XMLHttpRequest",
      "sech-ch-ua":
        '" Not A;Brand";v="99", "Chromium";v="100", "Google Chrome";v="100"',
    };

    let response;
    if (!config.get("useProxy")) {
      response = await axios(endpoint, {
        headers,
        timeout: 5000,
      });
      response = response.data;
    } else {
      const proxies = await getAllProxies({});
      const proxy = proxies[Math.floor(Math.random() * proxies.length)] || {};

      //if we use login and pass for proxy
      var proxyOpts = url.parse(proxy.PROXY);
      proxyOpts.auth = `${proxy.LOGIN}:${proxy.PASSWORD}`;
      const proxyAgent = new HttpsProxyAgent(proxyOpts);
      // const proxyAgent = new HttpsProxyAgent(proxy.proxy);
      response = await axios(endpoint, {
        timeout: 15000,
        httpsAgent: proxyAgent,
        headers,
      }).catch((err) => {
        console.log(err);
      });
    }

    if (response && response.status === 200) {
      const body = await response.data;
      return body;
    } else {
      console.log(
        "Could not get response " +
          endpoint +
          " status code: " +
          response.status
      );
      return null;
    }
  } catch (err) {
    console.log(err, 300);
    return null;
  }
}

function createJob(city) {
  return new CronJob(config.get("getFreeCarsCrone"), async function () {
    start(city);
  });
}

const start = async (city) => {
  if (isProcessing[city]) {
    console.log("Job still not finished");
    return;
  }
  isProcessing[city] = true;
  console.log("Started job (free)", city);

  try {
    const foundPage = await getFreeCarsStartingPage(200, 0, 300, 1, city);
    if (foundPage) {
      console.log(city + " found page where free cars starts : " + foundPage);
      await getFreeCars(foundPage - 1, city, foundPage);
    }
  } catch (err) {
    console.error(err, 351);
  } finally {
    isProcessing[city] = false;
    console.log(city + " Finished job (free)");
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
