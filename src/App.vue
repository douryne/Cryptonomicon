<template>
  <div class="container mx-auto flex flex-col items-center bg-gray-100 p-4">
    <!-- <div
      class="fixed w-100 h-100 opacity-80 bg-purple-800 inset-0 z-50 flex items-center justify-center"
    >
      <svg
        class="animate-spin -ml-1 mr-3 h-12 w-12 text-white"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        ></circle>
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
    </div> -->
    <div class="container">
      <add-ticker
        :coinList="coinList"
        :errorMessage="errorMessage"
        @add-ticker="add"
        @clear-err="errorMessage = ''"
      />
      <template v-if="tickers.length">
        <hr class="w-full border-t border-gray-600 mt-5" />
        <div>
          <button
            @click="page -= 1"
            :disabled="page > 1 === false"
            class="disabled:bg-gray-100 mt-4 inline-flex items-center py-3 px-5 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-full text-white bg-gray-600 hover:bg-gray-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            Назад
          </button>
          <button
            @click="page += 1"
            :disabled="hasNextPage === false"
            class="ml-5 mt-4 inline-flex items-center py-3 px-5 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-full text-white bg-gray-600 hover:bg-gray-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            Вперед
          </button>
          <div class="flex items-center my-4">
            Фильтр:
            <input
              v-model="filter"
              type="text"
              class="ml-2 max-w-xs block w-full pr-10 border-gray-300 text-gray-600 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md disabled:bg-gray-300"
            />
          </div>
        </div>
        <hr class="w-full border-t border-gray-600 my-4" />
        <tickers-list
          :paginatedTickers="paginatedTickers"
          :selectedTicker="selectedTicker"
          @select-ticker="selectTicker"
          @handle-delete="handleDelete"
        />
        <hr class="w-full border-t border-gray-600 my-4" />
      </template>
      <price-graph
        :graph="graph"
        :selectedTicker="selectedTicker"
        :graphElemWidth="graphElemWidth"
        @reset-selected-ticker="selectedTicker = null"
        ref="graph"
      />
    </div>
  </div>
</template>

<script>
import {
  loadTickersList,
  subscribeToTicker,
  unsubscribeFromTicker,
} from "./api";

import AddTicker from "./components/AddTicker.vue";
import PriceGraph from "./components/PriceGraph.vue";
import TickersList from "./components/TickersList.vue";

export default {
  name: "App",

  components: {
    AddTicker,
    PriceGraph,
    TickersList,
  },

  data() {
    return {
      filter: "",
      tickers: [],
      graph: [],
      maxGraphElements: 1,
      graphElemWidth: 40,
      selectedTicker: null,
      errorMessage: "",
      coinList: [],
      page: 1,
    };
  },

  async created() {
    const windowData = Object.fromEntries(
      new URL(window.location).searchParams.entries()
    );

    if (windowData.filter) this.filter = windowData.filter;

    if (windowData.page) this.page = windowData.page;

    const tickersData = localStorage.getItem("cryptonomicon-list");

    if (tickersData) {
      this.tickers = JSON.parse(tickersData);
      this.tickers.forEach((ticker) => {
        subscribeToTicker(ticker.name, (newPrice) => {
          this.updateTicker(ticker.name, newPrice);
        });
      });
    }

    this.coinList = await loadTickersList();
  },

  mounted() {
    window.addEventListener("resize", () => {
      this.calculateMaxGraphElements();
      this.reWriteGraph();
    });
  },

  beforeUnmount() {
    window.removeEventListener("resize", () => {
      this.calculateMaxGraphElements();
      this.reWriteGraph();
    });
  },

  computed: {
    startIndex() {
      return (this.page - 1) * 6;
    },
    endIndex() {
      return 6 * this.page;
    },
    filteredTickers() {
      return this.tickers.filter((ticker) =>
        ticker.name.includes(this.filter.toUpperCase().trim())
      );
    },
    paginatedTickers() {
      return this.filteredTickers.slice(this.startIndex, this.endIndex);
    },
    hasNextPage() {
      return this.filteredTickers.length > this.endIndex;
    },
    pageStateOptions() {
      return {
        filter: this.filter,
        page: this.page,
      };
    },
  },

  methods: {
    add(tickerName) {
      const currentTicker = {
        name: tickerName.toUpperCase().trim(),
        price: "-",
        invalid: true,
      };

      if (this.tickerInTickersCheck(currentTicker.name)) {
        this.errorMessage = "Такой тикер уже добавлен";
        return;
      }

      if (!tickerName) {
        this.errorMessage = "Введите тикер";
        return;
      }

      this.tickers = [...this.tickers, currentTicker];

      this.filter = "";
      subscribeToTicker(currentTicker.name, (newPrice) => {
        this.updateTicker(currentTicker.name, newPrice);
      });
    },

    updateTicker(tickerName, price) {
      const currency = this.tickers.find((t) => t.name === tickerName);
      if (!price) {
        currency.invalid = false;
        return;
      }
      if (this.selectedTicker === currency) {
        this.graph.push(price);
        this.reWriteGraph();
      }
      currency.price = price;
    },

    calculateMaxGraphElements() {
      if (!this.$refs.graph.$refs.graph) return;
      this.maxGraphElements =
        this.$refs.graph.$refs.graph.clientWidth / this.graphElemWidth;
    },

    reWriteGraph() {
      if (this.graph.length > this.maxGraphElements) {
        const diff = this.graph.length - this.maxGraphElements;
        this.graph.splice(0, diff);
      }
    },

    tickerInTickersCheck(tickerName) {
      if (this.tickers.find((t) => t.name === tickerName)) return true;
      return false;
    },

    selectTicker(ticker) {
      this.selectedTicker = ticker;
    },

    handleDelete(tickerToDelete) {
      this.tickers = this.tickers.filter((t) => t.name !== tickerToDelete);
      if (this.selectedTicker?.name === tickerToDelete) {
        this.selectedTicker = null;
      }
      unsubscribeFromTicker(tickerToDelete);
    },
  },

  watch: {
    selectedTicker() {
      this.graph = [];
      this.$nextTick().then(this.calculateMaxGraphElements);
    },
    paginatedTickers() {
      if (this.paginatedTickers.length === 0 && this.page > 1) {
        this.page -= 1;
      }
    },
    tickers() {
      localStorage.setItem("cryptonomicon-list", JSON.stringify(this.tickers));
    },
    filter() {
      this.page = 1;
    },
    pageStateOptions(value) {
      window.history.pushState(
        null,
        document.title,
        `${window.location.pathname}?filter=${value.filter}&page=${value.page}`
      );
    },
  },
};
</script>
