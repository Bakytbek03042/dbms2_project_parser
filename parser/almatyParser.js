const { createJobAlmaty: createJobAlmatyPaid } = require("./getPaidCars");
const { createJobAlmaty: createJobAlmatyFree } = require("./getFreeCars");

createJobAlmatyPaid();
createJobAlmatyFree();
