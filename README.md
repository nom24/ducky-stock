# Ducky Stock 

This Discord bot simulates a stock market environment, allowing users to buy and sell virtual stocks, trade stocks and currency, and view their portfolio.

## Features

- **Stock Trading**: Users can buy and sell stocks using a coin currency.
- **Portfolio Management**: Users can view their current stock holdings and their total portfolio value.
- **Dynamic Stock Prices**: Stock prices fluctuate based on user transactions.
- **Detailed Reporting**: The bot sends detailed reports and notifications about stock price fluctuations and market injections.

## Commands

### Setup

- **`/setup`**: Set up your trading account.

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
      
- **`/sellall`**: Sell all of your current holdings.

### Coin Currency
- **`/pay`**: Pay a user a specified amount of coins.
  - Parameters:
    - `user`: The user to pay.
    - `amount`: The amount of coins to transfer.
   
- **`/addcoins`**: Add a specified amount of coins to a user (Admin command).
  - Parameters:
    - `user`: The user to which to add coins.
    - `amount`: The amount of coins to add.

- **`/balance`**: Check your current coin balance.

### Viewing Portfolio
- **`/portfolio`**: View your current stock holdings and total portfolio value.

### Checking Stock Prices
- **`/checkstocks`**: View all current stock prices and cumulative holdings.
  
- **`/price`**: Check the price of a specified stock.
  - Parameters:
    - `stock`: The stock ID to check.
   
- **`/create`**: Create a stock.
  - Parameters:
    - `stock`: The stock ID to create.
    - `initial_price`: The initial value of the new stock.

## Stock Prices
Stock prices are dynamically adjusted based on user transactions. Buying stocks increases the price, while selling stocks decreases it. The changes are calculated using the following logic:

```javascript
const newPrice = (stock.price * (1 + 0.01 * quantity)).toFixed(3); // For buying
const newPrice = (stock.price * (1 - 0.01 * quantity)).toFixed(3); // For selling
