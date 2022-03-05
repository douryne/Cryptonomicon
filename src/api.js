const tickersHandlers = new Map();

const socket = new WebSocket(`ws://${process.env.VUE_APP_SERVER_URL}`);
const AGGREGATE_INDEX = "5";

socket.addEventListener("message", (message) => {
  const {
    TYPE: type,
    FROMSYMBOL: currency,
    PRICE: newPrice,
  } = JSON.parse(message.data);
  if (type !== AGGREGATE_INDEX || newPrice === undefined) return;
  const handlers = tickersHandlers.get(currency) || [];
  handlers.forEach((fn) => fn(newPrice));
});

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

  sendToWebSocket({
    action: "SubAdd",
    subs: [`5~CCCAGG~${ticker}~USD`],
  });
};

export const unsubscribeFromTicker = (ticker) => {
  tickersHandlers.delete(ticker);

  sendToWebSocket({
    action: "SubRemove",
    subs: [`5~CCCAGG~${ticker}~USD`],
  });
};
