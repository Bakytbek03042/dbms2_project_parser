const { createZkOblJob: createPaid } = require("./getPaidCars");
const { createZkOblJob: createFree } = require("./getFreeCars");

createPaid();
createFree();
