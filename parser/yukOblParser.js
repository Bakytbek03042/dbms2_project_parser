const { createYukOblJob: createPaid } = require("./getPaidCars");
const { createYukOblJob: createFree } = require("./getFreeCars");

createPaid();
createFree();
