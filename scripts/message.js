const axios = require("axios");

exports.sendMessage = async (data) => {
  axios
    .post(`http://localhost:5050/api/message/webhook`, {
      ...data,
    })
    .catch(() => {});
};
