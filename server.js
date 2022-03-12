const express = require("express");
const WebSocket = require("ws");
const http = require("http");
const serveStatic = require("serve-static");
const path = require("path");
const axios = require("axios");
require("dotenv").config();

const port = process.env.PORT || 8081;
const app = express();
const server = http.createServer(app);
const wsServer = new WebSocket.Server({ server });

const apiKey = `${process.env.CRYPTO_API_KEY}`;

const socket = new WebSocket(
  `wss://streamer.cryptocompare.com/v2?api_key=${apiKey}`
);

wsServer.on("connection", onConnect);

function sendWhenOpen(message) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(message);
  }

  socket.addEventListener(
    "open",
    () => {
      socket.send(message);
    },
    { once: true }
  );
}

const tickers = new Map();

function onConnect(wsClient) {
  console.log("Новый пользователь");

  wsClient.on("message", (message) => {
    console.log(JSON.parse(message));
    const tickerName = JSON.parse(message).subs[0].split("~")[2];
    const currency = JSON.parse(message).subs[0].split("~")[3];
    const action = JSON.parse(message).action;

    if (action === "SubRemove") {
      tickers.delete(tickerName);
      console.log(tickers);
      sendWhenOpen(message);
      return;
    }
    if (!(tickers.get(tickerName) === currency)) {
      tickers.set(tickerName, currency);
      console.log(tickers);
      sendWhenOpen(message);
      return;
    }
  });

  socket.addEventListener("message", (e) => {
    wsClient.send(e.data);
  });

  wsClient.on("close", () => {
    const tickerNames = Array.from(tickers.keys());
    tickerNames.forEach((tickerName) => {
      const currency = tickers.get(tickerName);
      const message = {
        action: "SubRemove",
        subs: [`5~CCCAGG~${tickerName}~${currency}`],
      };
      sendWhenOpen(JSON.stringify(message));
      tickers.delete(tickerName);
    });
    console.log("Пользователь отключился");
  });
}

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, PUT, POST");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

//here we are configuring dist to serve app files
app.use("/", serveStatic(path.join(__dirname, "/dist")));

app.get("/getData", async (req, res) => {
  let data;
  try {
    data = await axios.get(
      `https://min-api.cryptocompare.com/data/all/coinlist?summary=true`
    );
  } catch (error) {
    const status = error?.response?.status;
    if (status) {
      res.status(status).end(error.message);
    } else {
      res.status(500).end(error.message);
    }
    return;
  }
  wsServer.readyState = WebSocket.OPEN;
  res.json(data.data);
});

// this * route is to serve project on different page routes except root `/`
app.get(/.*/, function (req, res) {
  res.sendFile(path.join(__dirname, "/dist/index.html"));
});

server.listen(port);
console.log(`app is listening on port: ${port}`);
