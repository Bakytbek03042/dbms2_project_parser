const { createAlmOblJob: createPaid } = require("./getPaidCars");
const { createAlmOblJob: createFree } = require("./getFreeCars");

createPaid();
createFree();
