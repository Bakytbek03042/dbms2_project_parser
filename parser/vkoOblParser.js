const { createVkOblJob: createPaid } = require("./getPaidCars");
const { createVkOblJob: createFree } = require("./getFreeCars");

createPaid();
createFree();
