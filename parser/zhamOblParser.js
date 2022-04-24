const { createZhamOblJob: createPaid } = require("./getPaidCars");
const { createZhamOblJob: createFree } = require("./getFreeCars");

createPaid();
createFree();
