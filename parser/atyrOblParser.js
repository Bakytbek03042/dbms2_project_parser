const { createAtyrOblJob: createPaid } = require("./getPaidCars");
const { createAtyrOblJob: createFree } = require("./getFreeCars");

createPaid();
createFree();
