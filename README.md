# Stock Market Discord Bot

This Discord bot simulates a stock market environment, allowing users to buy and sell virtual stocks, trade stocks and currency, and view their portfolio.

## Features

- **Stock Trading**: Users can buy and sell stocks using a coin currency.
- **Portfolio Management**: Users can view their current stock holdings and their total portfolio value.
- **Dynamic Stock Prices**: Stock prices fluctuate based on user transactions.
- **Detailed Reporting**: The bot sends detailed reports and notifications about stock price fluctuations and market injections.

## Commands

### Buying Stocks
- **`/buy`**: Buy a specified quantity of a stock.
  - Parameters:
    - `stock`: The stock ID to buy.
    - `quantity`: The quantity of the stock to buy.

### Selling Stocks
- **`/sell`**: Sell a specified quantity of a stock.
  - Parameters:
    - `stock`: The stock ID to sell.
    - `quantity`: The quantity of the stock to sell.

### Viewing Portfolio
- **`/portfolio`**: View your current stock holdings and total portfolio value.

### Checking Stock Prices
- **`/checkstocks`**: View current stock prices and cumulative holdings.

## Stock Prices
Stock prices are dynamically adjusted based on user transactions. Buying stocks increases the price, while selling stocks decreases it. The changes are calculated using the following logic:

```javascript
const newPrice = (stock.price * (1 + 0.01 * quantity)).toFixed(3); // For buying
const newPrice = (stock.price * (1 - 0.01 * quantity)).toFixed(3); // For selling
