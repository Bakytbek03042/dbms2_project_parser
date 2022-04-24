const { createKzlOblJob: createPaid } = require("./getPaidCars");
const { createKzlOblJob: createFree } = require("./getFreeCars");

createPaid();
createFree();
