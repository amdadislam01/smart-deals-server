// encode.js
const fs = require("fs");
const key = fs.readFileSync("./smart-deals-shop-firebase-admin.json", "utf8");
const base64 = Buffer.from(key).toString("base64");
console.log(base64);