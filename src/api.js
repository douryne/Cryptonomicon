const tickersHandlers = new Map();

const loadTickers = () => {
  if (tickersHandlers.size === 0) return;

  fetch(
    `${process.env.VUE_APP_SERVER_URL}/getData?tickers=${[
      ...tickersHandlers.keys(),
    ].join(",")}`
  )
    .then((res) => res.json())
    .then((rawData) => {
      const updatedPrices = Object.fromEntries(
        Object.entries(rawData).map(([key, value]) => [key, value.USD])
      );
      Object.entries(updatedPrices).forEach(([currentTicker, newPrice]) => {
        const handlers = tickersHandlers.get(currentTicker) || [];
        handlers.forEach((fn) => fn(newPrice));
      });
    });
};

export const subscribeToTicker = (ticker, cb) => {
  const subscribers = tickersHandlers.get(ticker) || [];
  tickersHandlers.set(ticker, [...subscribers, cb]);
};

export const unsubscribeFromTicker = (ticker) => {
  tickersHandlers.delete(ticker);
};

setInterval(loadTickers, 3000);
