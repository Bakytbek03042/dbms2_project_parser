const { createPavlOblJob: createPaid } = require("./getPaidCars");
const { createPavlOblJob: createFree } = require("./getFreeCars");

createPaid();
createFree();
