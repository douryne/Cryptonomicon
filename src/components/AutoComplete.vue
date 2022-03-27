<template>
  <div
    v-if="foundCoincidences.length"
    class="flex bg-white shadow-md p-1 rounded-md flex-wrap"
  >
    <span
      v-for="hint in foundCoincidences"
      :key="hint.Symbol"
      @click="add(hint.Symbol)"
      class="inline-flex items-center px-2 m-1 rounded-md text-xs font-medium bg-gray-300 text-gray-800 cursor-pointer"
    >
      {{ hint.Symbol }}
    </span>
  </div>
</template>

<script>
export default {
  props: {
    ticker: {
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
  },
  computed: {
    foundCoincidences() {
      if (!this.coinList.length) return this.coinList;
      return this.coinList
        .filter(
          (t) => this.ticker && t.Symbol.startsWith(this.ticker.toUpperCase())
        )
        .slice(-4);
    },
  },
  methods: {
    add(ticker) {
      this.$emit("add-ticker", ticker);
    },
  },
};
</script>
