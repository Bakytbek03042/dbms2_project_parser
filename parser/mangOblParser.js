const { createMangOblJob: createPaid } = require("./getPaidCars");
const { createMangOblJob: createFree } = require("./getFreeCars");

createPaid();
createFree();
