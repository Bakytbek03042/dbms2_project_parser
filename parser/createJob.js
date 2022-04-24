const cron = require("node-cron");
const Config = require("./config");

const { getFreeCarsStartingPage, getFreeCars } = require("./getFreeCars");
const { getPaidNewCars } = require("./getPaidCars");

let isProcessingFree = false;
let countProcessingFree = 0;
let isProcessingPaid = false;
let countProcessingPaid = 0;

let cronJobFree;
let cronJobPaid;

function createJob(city) {
  cronJobFree = createJobFree(city);
  cronJobPaid = createJobPaid(city);
}

function createJobFree(city) {
  return cron.schedule(Config.getFreeCarsCrone, async function () {
    if (isProcessingFree) {
      countProcessingFree++;

      if (countProcessingFree > 5) {
        countProcessingFree = 0;
        isProcessingFree = false;
        console.log(
          `Job automatically finished for ${city} and restarted (free)`
        );
        cronJobFree.destroy();
      } else {
        console.log("Job still not finished (free)");
      }
      return;
    }
    isProcessingFree = true;
    console.log("Started job (free)");

    try {
      const foundPage = await getFreeCarsStartingPage(100, 0, 200, 1, city);
      if (foundPage) {
        console.log(city + " found page where free cars starts : " + foundPage);
        await getFreeCars(foundPage - 1, city, foundPage);
      }
    } catch (err) {
      console.error(err, 351);
    } finally {
      isProcessingFree = false;
      console.log(city + " Finished job (free)");
    }
  });
}

function createJobPaid(city) {
  return cron.schedule(Config.getPaidCarsCrone, async function () {
    if (isProcessingPaid) {
      countProcessingPaid++;

      if (countProcessingPaid > 5) {
        countProcessingPaid = 0;
        isProcessingPaid = false;
        console.log(
          `Job automatically finished for ${city} and restarted (paid)`
        );
        cronJobPaid.destroy();
      } else {
        console.log("Job still not finished (paid)");
      }
      return;
    }
    isProcessingPaid[city] = true;

    console.log("Started job (paid)");
    try {
      await getPaidNewCars(1, city);
    } catch (err) {
      console.error(err, 299);
    } finally {
      isProcessingPaid[city] = false;
      console.log(city + " FINISHED job (paid)");
    }
  });
}

module.exports = createJob;
