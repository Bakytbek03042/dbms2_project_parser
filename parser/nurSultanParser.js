const { createNurSultanJob: createNurSultanJobPaid } = require("./getPaidCars");
const { createNurSultanJob: createNurSultanJobFree } = require("./getFreeCars");

createNurSultanJobPaid();
createNurSultanJobFree();
