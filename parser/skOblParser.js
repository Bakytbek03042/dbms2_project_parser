const { createSkOblJob: createPaid } = require("./getPaidCars");
const { createSkOblJob: createFree } = require("./getFreeCars");

createPaid();
createFree();
