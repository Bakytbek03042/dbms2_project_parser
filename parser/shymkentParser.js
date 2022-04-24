const { createShymkentJob: createPaid } = require("./getPaidCars");
const { createShymkentJob: createFree } = require("./getFreeCars");

createPaid();
createFree();
