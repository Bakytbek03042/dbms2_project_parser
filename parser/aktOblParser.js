const { createAktOblJob: createPaid } = require("./getPaidCars");
const { createAktOblJob: createFree } = require("./getFreeCars");

createPaid();
createFree();
