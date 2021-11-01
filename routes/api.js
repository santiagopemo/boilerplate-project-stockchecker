'use strict';

const bcrypt = require('bcrypt');
const fetch = require("node-fetch");
const { Stock } = require("../models")
// import fetch from 'node-fetch';

async function getStock(stock) {
  const response = await fetch(`https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${stock}/quote`);
  const {symbol, latestPrice} = await response.json();
  if (!symbol || !latestPrice) return undefined;
  return {symbol, price: latestPrice}
}

async function findCreateStock(symbol, ip, like) {
  let stock = await Stock.findOne({symbol});
  const ipHash = await bcrypt.hash(ip, 2)
  if (stock) {
    if (like === true && !stock.likes.find((ipHash) => bcrypt.compareSync(ip, ipHash))) {
      stock.likes.push(ipHash)
      return await stock.save();
    } else {
      return stock;
    }    
  } else {
    if (like === true) {      
      return await Stock.create({symbol, likes: [ipHash]})
    } else {
      return await Stock.create({symbol, likes: []})
    }
  }  
}

module.exports = function (app) {

  app.route('/api/stock-prices')
    .get(async function (req, res){
      const {stock } = req.query;
      let like = false;

      if (req.query.like && req.query.like.toLowerCase() === 'true') {
        like = true; 
      } 

      if (!stock) {
        res.json({error: "Missing parameters"});
        return;
      }

      let stocks;
      if (Array.isArray(stock)) {
        stocks = [...stock]
      } else {
        stocks = [stock]
      }

      let stock1, stock2, dataStock1, dataStock2, stockData;
      if (stocks.length == 1) {
        stock1 = await getStock(stocks[0]);
        if (stock1) {
          dataStock1 = await findCreateStock(stock1.symbol, req.ip, like)
          stockData = {stock: dataStock1.symbol, price: stock1.price, likes: dataStock1.likes.length}
        } else {
          stockData = {likes: 0};
        }
      } else {
        stock1 = await getStock(stocks[0]);
        stock2 = await getStock(stocks[1]);
        stockData = [{}, {}];
        if (stock1) {
          dataStock1 = await findCreateStock(stock1.symbol, req.ip, like);
          stockData[0]['stock'] = stock1.symbol;
          stockData[0]['price'] = stock1.price;
        } else {
          dataStock1 = {likes: []}
        }
        if (stock2) {
          dataStock2 = await findCreateStock(stock2.symbol, req.ip, like);
          stockData[1]['stock'] = stock2.symbol;
          stockData[1]['price'] = stock2.price;
        } else {
          dataStock2 = {likes: []}
        }
        stockData[0]['rel_likes'] = dataStock1.likes.length - dataStock2.likes.length
        stockData[1]['rel_likes'] = dataStock2.likes.length - dataStock1.likes.length   
      }
      res.json({stockData})
    });
    
};
