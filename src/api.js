const tickersHandlers = new Map();
const tickersSub = new Map();
let btcToUSD = null;
let tickers = JSON.parse(localStorage.getItem("cryptonomicon-list"));
const socket = new WebSocket(
  `${process.env.VUE_APP_SERVER_WEBSOCKET_PROTOCOL}://${process.env.VUE_APP_SERVER_URL}`
);

const AGGREGATE_INDEX = "5";

socket.addEventListener("message", (message) => {
  let {
    TYPE: type,
    FROMSYMBOL: currency,
    TOSYMBOL: toSymbol,
    PRICE: newPrice,
    PARAMETER: parameter,
    MESSAGE: errorMessage,
  } = JSON.parse(message.data);
  if (errorMessage === "INVALID_SUB") {
    const currency = parameter.split("~")[2];
    const toSymbol = parameter.split("~")[3];
    if (toSymbol === "BTC") {
      const handlers = tickersHandlers.get(currency) || [];
      handlers.forEach((fn) => fn());
      return;
    }
    subscribeToTicker("BTC", function updateBTCPrice(price) {
      btcToUSD = price;
    });
    setTimeout(() => {
      sendToWebSocket({
        action: "SubAdd",
        subs: [`5~CCCAGG~${currency}~BTC`],
      });
      tickersSub.set(currency, "BTC");
    }, 5000);
    return;
  }
  if (type !== AGGREGATE_INDEX || newPrice === undefined) return;
  if (toSymbol === "BTC") {
    if (!btcToUSD) return;
    newPrice = convertFromBTCtoUSD(newPrice);
  }
  const handlers = tickersHandlers.get(currency) || [];
  handlers.forEach((fn) => fn(newPrice));
});

const convertFromBTCtoUSD = (price) => {
  return price * btcToUSD;
};

export const loadTickersList = () => {
  return fetch(
    `${process.env.VUE_APP_SERVER_PROTOCOL}://${process.env.VUE_APP_SERVER_URL}/getData`
  )
    .then((res) => res.json())
    .then((data) => {
      return Object.values(data?.Data);
    });
};

const sendToWebSocket = (message) => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }

  socket.addEventListener(
    "open",
    () => {
      socket.send(JSON.stringify(message));
    },
    { once: true }
  );
};

export const subscribeToTicker = (ticker, cb) => {
  const subscribers = tickersHandlers.get(ticker) || [];
  tickersHandlers.set(ticker, [...subscribers, cb]);

  if (tickersSub.get(ticker)) return;
  updateTickers();
  sendToWebSocket({
    action: "SubAdd",
    subs: [`5~CCCAGG~${ticker}~USD`],
  });
  tickersSub.set(ticker, "USD");
};

export const unsubscribeFromTicker = (ticker) => {
  const sub = tickersSub.get(ticker);
  updateTickers();

  if (ticker === "BTC" && isAnyoneSubscribedOnTicker("BTC")) {
    tickersHandlers.set(
      ticker,
      tickersHandlers.get(ticker).filter((fn) => fn.name === "updateBTCPrice")
    );
    return;
  } else if (ticker === "BTC" && !isAnyoneSubscribedOnTicker("BTC")) {
    sendToWebSocket({
      action: "SubRemove",
      subs: [`5~CCCAGG~${ticker}~${sub}`],
    });
    tickersSub.delete(ticker);
    tickersHandlers.delete(ticker);
    return;
  }

  tickersSub.delete(ticker);
  tickersHandlers.delete(ticker);

  sendToWebSocket({
    action: "SubRemove",
    subs: [`5~CCCAGG~${ticker}~${sub}`],
  });

  if (
    isAnyoneSubscribedOnTicker("BTC") ||
    isTickerInTickers("BTC") ||
    !tickersHandlers.get("BTC")
  ) {
    return;
  }
  sendToWebSocket({
    action: "SubRemove",
    subs: ["5~CCCAGG~BTC~USD"],
  });
  tickersSub.delete("BTC");
  tickersHandlers.delete("BTC");
};

const isTickerInTickers = (ticker) => {
  return tickers.find((t) => t.name === ticker);
};

const isAnyoneSubscribedOnTicker = (ticker) => {
  const currencies = Array.from(tickersSub.values());
  return currencies.find((curr) => curr === ticker);
};

const updateTickers = () => {
  tickers = JSON.parse(localStorage.getItem("cryptonomicon-list"));
};

setInterval(updateTickers, 1000);
