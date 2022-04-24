const { createKostOblJob: createPaid } = require("./getPaidCars");
const { createKostOblJob: createFree } = require("./getFreeCars");

createPaid();
createFree();
