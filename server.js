const express = require("express");
const serveStatic = require("serve-static");
const path = require("path");
const axios = require("axios");
require("dotenv").config();

const app = express();

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, PUT, POST");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

const apiKey = `${process.env.CRYPTO_API_KEY}`;

//here we are configuring dist to serve app files
app.use("/", serveStatic(path.join(__dirname, "/dist")));

app.get("/getData", async (req, res) => {
  const coinName = req.query.coin;

  let data = await axios.get(
    `https://min-api.cryptocompare.com/data/price?fsym=${coinName}&tsyms=USD&api_key=${apiKey}`
  );
  res.json(data.data);
});

// this * route is to serve project on different page routes except root `/`
app.get(/.*/, function (req, res) {
  res.sendFile(path.join(__dirname, "/dist/index.html"));
});

const port = process.env.PORT || 8081;
app.listen(port);
console.log(`app is listening on port: ${port}`);
