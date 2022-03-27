<template>
  <section>
    <div class="flex">
      <div class="max-w-xs">
        <label for="wallet" class="block text-sm font-medium text-gray-500"
          >Тикер</label
        >
        <div class="mt-1 relative rounded-md shadow-md">
          <input
            v-model="ticker"
            @input="clearErr"
            @keydown.enter="add"
            type="text"
            name="wallet"
            id="wallet"
            class="block w-full pr-10 border-gray-300 text-gray-600 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md"
            placeholder="Например DOGE"
          />
        </div>
        <auto-complete
          :ticker="ticker"
          :coinList="coinList"
          @add-ticker="add"
        />
        <div v-if="errorMessage" class="text-sm text-red-600">
          {{ errorMessage }}
        </div>
      </div>
    </div>
    <add-button @click="add" />
  </section>
</template>

<script>
import AddButton from "./AddButton.vue";
import AutoComplete from "./AutoComplete.vue";
export default {
  components: {
    AddButton,
    AutoComplete,
  },

  props: {
    errorMessage: {
      type: String,
      require: true,
      default: "",
    },
    coinList: {
      type: Array,
      require: true,
      default: () => [],
    },
  },

  emits: {
    "add-ticker": (value) => typeof value === "string",
    "clear-err": null,
  },

  data() {
    return {
      ticker: "",
    };
  },
  methods: {
    add(tickerName) {
      if (typeof tickerName === "string") {
        this.ticker = tickerName;
      }
      this.$emit("add-ticker", this.ticker);
      this.ticker = "";
    },
    clearErr() {
      this.$emit("clear-err");
    },
  },
};
</script>
