const { createAkmlOblJob: createPaid } = require("./getPaidCars");
const { createAkmlOblJob: createFree } = require("./getFreeCars");

createPaid();
createFree();
