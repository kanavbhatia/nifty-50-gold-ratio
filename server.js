const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 3000;
let dataFetchTime;
let dataToEmit = {};

require("dotenv").config();
const apiKey = process.env.CURRENCY_FREAKS_API_KEY;

const filePath = path.join(__dirname);

async function fetchGoldData() {
  try {
    const response = await axios.get(
      "https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAU/USD"
    );

    const data = response.data;
    const price = data[0].spreadProfilePrices[0].bid;
    const ounceWeight = 28.3495; // 1 ounce = 28.3495 grams
    const goldPricePerGram = price / ounceWeight; // Convert to price per gram
    // console.log("Gold Price:", goldPricePerGram);
    return goldPricePerGram;
  } catch (error) {
    console.error("Error fetching gold data:", error);
  }
}

async function fetchDollarPrices() {
  try {
    const response = await axios.get(
      `https://api.currencyfreaks.com/v2.0/rates/latest?apikey=${apiKey}`
    );

    const price = response.data.rates.INR;
    // console.log("Dollar Price:", price);
    return price;
  } catch (error) {
    console.error("Error fetching dollar prices:", error);
  }
}

async function getNifty50Data() {
  try {
    const options = {
      method: "GET",
      url: "https://apidojo-yahoo-finance-v1.p.rapidapi.com/stock/v3/get-chart?interval=1mon&region=IN&symbol=%5ENSEI",
      headers: {
        "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
        "X-RapidAPI-Host": "apidojo-yahoo-finance-v1.p.rapidapi.com",
      },
    };
    const response = await axios.request(options);
    const niftyData = response.data;
    const niftyPrice = niftyData.chart.result[0].meta.regularMarketPrice;
    // const niftyPrice = 25019.8; // Placeholder value for Nifty 50 price

    console.log("Nifty Price:", niftyPrice);
    return niftyPrice;
  } catch (error) {
    console.error("Error fetching nifty data:", error);
  }
}

async function fetchGoldPricesInRupees() {
  try {
    const goldPrice = await fetchGoldData();
    const dollarPrice = await fetchDollarPrices();
    const goldPriceInRupees = goldPrice * dollarPrice;
    // const goldPriceInRupees = 9663.11903592656; // Placeholder value for gold price in grams
    console.log("Gold Price in Rupees:", goldPriceInRupees);
    return goldPriceInRupees;
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

async function getPriceRatio() {
  try {
    const goldPrice = await fetchGoldPricesInRupees();
    const niftyPrice = await getNifty50Data();
    const priceRatio = goldPrice / niftyPrice;
    console.log("Price Ratio (Gold / Nifty 50):", priceRatio);
    // if this ratio is greater than 0.6, then gold is overvalued (or Nifty is undervalued) --> so reduce gold and increase stocks
    // if this ratio is lesser than 0.28, then gold is undervalued (or Nifty is overvalued) --> so increase gold and reduce stocks
    // if this ratio is between 0.28 and 0.6, then gold and Nifty are fairly valued --> so keep the same allocation

    return priceRatio;
  } catch (error) {
    console.error("Error fetching price ratio:", error);
  }
}

async function logicToCalculateAllocation(goldPrice, niftyPrice) {
  // const priceRatio = await getPriceRatio();
  const priceRatio = goldPrice / niftyPrice;

  // Implement your logic to calculate allocation based on the price ratio
  if (priceRatio > 0.6) {
    console.log("Reduce gold and increase stocks");
    return "Reduce gold and increase stocks";
  } else if (priceRatio < 0.28) {
    console.log("Increase gold and reduce stocks");
    return "Increase gold and reduce stocks";
  } else {
    console.log("Keep the same allocation");
    return "Keep the same allocation";
  }
}
async function saveToJSON(data) {
  try {
    let arr = [];
    try {
      const raw = await fs.promises.readFile(filePath, "utf8");
      arr = JSON.parse(raw);
    } catch (_) {
      // file missing or bad JSON? start with empty array
      arr = [];
    }
    arr.push(data);
    await fs.promises.writeFile(filePath, JSON.stringify(arr, null, 2), "utf8");
    console.log("Wrote entry to", filePath);
  } catch (err) {
    console.error("saveToJSON caught an error:", err);
    // swallow it so it never kills your socket handler
  }
}

io.on("connection", async (socket) => {
  console.log("client connected");

  try {
    const currentTime = new Date();
    const timeDiff = Math.abs(currentTime - dataFetchTime);
    const diffInSeconds = Math.floor(timeDiff / 1000);
    if (!dataFetchTime || diffInSeconds > 60) {
      dataFetchTime = currentTime;
      // 1. Get latest data and save it to data.json
      const goldPrice = await fetchGoldPricesInRupees();
      const niftyPrice = await getNifty50Data();
      const message = await logicToCalculateAllocation(goldPrice, niftyPrice);
      dataToEmit = {
        goldPrice,
        niftyPrice,
        ratio: goldPrice / niftyPrice,
        message,
        timeStamp: new Date().toLocaleString(),
      };
      socket.emit("data", { dataToEmit });
      socket.on("disconnect", () => {
        // clearInterval(interval);
        console.log("client disconnected");
      });
    } else {
      socket.emit("data", { dataToEmit });
    }
  } catch (err) {
    console.error("fetch error", err.message);
    socket.disconnect(true);
  }
});

app.use(express.static("public"));

server.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});
