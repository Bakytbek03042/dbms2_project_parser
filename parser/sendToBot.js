const axios = require('axios')
const CAR = require("./models/cars");

async function sendToBot(id) {
    const car = await CAR.find({ id })
    //console.log(car)

    await axios.post('http://164.90.212.8:8000', car)
        .catch(e => {
            console.log("Error", e, 9)
        })
}

module.exports = sendToBot