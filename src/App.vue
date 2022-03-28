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
        <dl class="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div
            v-for="t in paginatedTickers"
            :key="t"
            @click="selectTicker(t)"
            :class="{
              'border-4': selectedTicker === t,
              'bg-red-100': t.invalid === false,
            }"
            class="bg-white overflow-hidden shadow rounded-lg border-purple-800 border-solid cursor-pointer"
          >
            <div class="px-4 py-5 sm:p-6 text-center">
              <dt class="text-sm font-medium text-gray-500 truncate">
                {{ t.name }} - USD
              </dt>
              <dd class="mt-1 text-3xl font-semibold text-gray-900">
                {{ formatPrice(t.price) }}
              </dd>
            </div>
            <div class="w-full border-t border-gray-200"></div>
            <button
              @click.stop="handleDelete(t.name)"
              class="flex items-center justify-center font-medium w-full bg-gray-100 px-4 py-4 sm:px-6 text-md text-gray-500 hover:text-gray-600 hover:bg-gray-200 transition-all focus:outline-none"
            >
              <svg
                class="h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="#718096"
                aria-hidden="true"
              >
                <path
                  fill-rule="evenodd"
                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clip-rule="evenodd"
                ></path></svg
              >Удалить
            </button>
          </div>
        </dl>
        <hr class="w-full border-t border-gray-600 my-4" />
      </template>
      <graph
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
import Graph from "./components/Graph.vue";

export default {
  name: "App",

  components: {
    AddTicker,
    Graph,
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

    formatPrice(price) {
      if (price === "-") return price;
      return price > 1 ? price.toFixed(2) : price.toPrecision(2);
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
