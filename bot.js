const { Client, GatewayIntentBits, EmbedBuilder, ActivityType } = require('discord.js');
const { token } = require('./config.json');
const dbPool = require('./sql-connection');
const fs = require('fs');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const TRANSACTION_LOG_FILE = 'transactions.txt';


client.once('ready', () => {
    console.log('Initialising the stock market...');

    setInterval(updateStockPrices, 60000);
    setInterval(updateStatus, 10000);

    const commands = [
        {
          name: 'balance',
          description: 'Check your coin balance',
        },
        {
          name: 'checkstocks',
          description: 'Check current stocks and their prices',
        },
        {
          name: 'portfolio',
          description: 'Check your stock portfolio',
        },
        {
          name: 'sellall',
          description: 'Sell all stocks in your portfolio',
        },
        {
          name: 'setup',
          description: 'Set up your stock market account',
        },
        {
          name: 'buy',
          description: 'Buy stocks',
          options: [
            {
              type: 3,
              name: 'stock',
              description: 'Stock ID',
              required: true,
            },
            {
              type: 4,
              name: 'quantity',
              description: 'Quantity to buy',
              required: true,
            },
          ],
        },
        {
          name: 'create',
          description: 'Create a stock',
          options: [
            {
              type: 3,
              name: 'stock_id',
              description: 'Stock ID',
              required: true,
            },
            {
              type: 4,
              name: 'initial_price',
              description: 'Initial price of the stock',
              required: true,
            },
           ],
          },
        {
          name: 'sell',
          description: 'Sell stocks',
          options: [
            {
              type: 3,
              name: 'stock',
              description: 'Stock ID',
              required: true,
            },
            {
              type: 4,
              name: 'quantity',
              description: 'Quantity to sell',
              required: true,
            },
          ],
        },
        {
          name: 'pay',
          description: 'Pay coins to another user',
          options: [
            {
              type: 6,
              name: 'user',
              description: 'User to pay',
              required: true,
            },
            {
              type: 3,
              name: 'amount',
              description: 'Amount to pay',
              required: true,
            },
          ],
        },
        {
          name: 'addcoins',
          description: 'Add coins to an account',
          options: [
            {
              type: 6,
              name: 'user',
              description: 'User to add coins to',
              required: true,
             },
             {
              type: 3,
              name: 'coins',
              description: 'Amount of coins to add',
              required: true,
             },
            ],
          },
        {
          name: 'price',
          description: 'Check the current price of a stock',
          options: [
            {
              type: 3,
              name: 'stock',
              description: 'Stock ID',
              required: true,
            },
          ],
        },
      ];
      
      (async () => {
        try {
          await client.application?.commands.set(commands);
          console.log('Slash commands registered successfully');
        } catch (error) {
          console.error('Error registering slash commands:', error);
        }
      })();
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'balance') {
        await checkBalance(interaction);
    } else if (commandName === 'buy') {
        await buyStock(interaction);
    } else if (commandName === 'sell') {
        await sellStock(interaction);
    } else if (commandName === 'pay') {
        await payUser(interaction);
    } else if (commandName === 'price') {
        await checkPrice(interaction);
    } else if (commandName === 'setup') {
        await setupUser(interaction);
    } else if (commandName === 'portfolio') {
        await checkPortfolio(interaction);
    } else if (commandName === 'sellall') {
        await sellAll(interaction);
    } else if (commandName === 'checkstocks') {
        await checkStocks(interaction);
    } else if (commandName === 'create') {
        await createStock(interaction);
    } else if (commandName === 'addcoins') {
        await addCoins(interaction);
    }
});

function updateStatus() {
    // query the database to retrieve the user's stock holdings and their respective prices
    dbPool.query("SELECT holdings.stock_id, holdings.quantity, stocks.price FROM holdings JOIN stocks ON holdings.stock_id = stocks.stock_id", (err, rows) => {
        if (err) {
            console.error(err);
            return;
        }

        // calculate the total value of all owned stocks
        let totalValue = 0;
        rows.forEach(row => {
            totalValue += row.quantity * row.price;
        });

        // update the bot's status with the total value of all owned stocks
        client.user.setActivity({
            type: ActivityType.Custom,
            name: 'customstatus',
            state: `Stock Value: ${totalValue.toFixed(3)} coins`
          })
    });
}

// function to log transactions
function logTransaction(userId, type, stockName, quantity, price) {
    const transaction = `${userId},${type},${stockName},${quantity},${price}\n`;
    fs.appendFile(TRANSACTION_LOG_FILE, transaction, err => {
        if (err) {
            console.error('Error logging transaction:', err);
        } else {
            console.log('Transaction logged successfully:', transaction);

        }
    });
}

async function addCoins(interaction) {
    const userId = interaction.options.getUser('user').id;
    const coinsInteger = interaction.options.getString('coins');
    const coinsToAdd = parseFloat(coinsInteger);

    if (isNaN(coinsInteger) || !isFinite(coinsInteger)) {
        return interaction.reply('Invalid amount. Please enter a valid number.');
    }

    // update the user's coins in the database
    dbPool.query("UPDATE players SET coins = coins + ? WHERE discord_id = ?", [coinsToAdd, userId], (err, result) => {
        if (err) {
            console.error(err);
            return interaction.reply('An error occurred while adding coins to the user.');
        }

        interaction.reply(`${coinsToAdd} coins added to the user.`);
    });
}

async function createStock(interaction) {
    const stockId = interaction.options.getString('stock_id').toUpperCase();
    const initialPrice = interaction.options.getInteger('initial_price');

    // check if the stock already exists
    dbPool.query("SELECT * FROM stocks WHERE stock_id = ?", [stockId], (err, rows) => {
        if (err) {
            console.error(err);
            return interaction.reply('An error occurred while checking the database.');
        }
        
        // if the stock already exists, return an error message
        if (rows.length > 0) {
            return interaction.reply('Stock already exists.');
        }

        // insert the new stock into the database
        dbPool.query("INSERT INTO stocks (stock_id, price) VALUES (?, ?)", [stockId, initialPrice], (err, result) => {
            if (err) {
                console.error(err);
                return interaction.reply('An error occurred while creating the stock.');
            }

            interaction.reply(`Stock "${stockId}" created with initial price ${initialPrice} coins.`);
        });
    });
}


async function checkStocks(interaction) {
    const discordId = interaction.user.id;

    // query the database to retrieve all stocks and their prices
    dbPool.query("SELECT stock_id, price FROM stocks", (err, stockRows) => {
        if (err) {
            console.error(err);
            return interaction.reply('An error occurred while fetching stock data.');
        }

        if (stockRows.length === 0) {
            return interaction.reply('No stocks available.');
        }

        // initialize an object to store the total quantity owned for each stock
        const stockQuantities = {};

        // query the database to retrieve the user's stock holdings
        dbPool.query("SELECT stock_id, SUM(quantity) AS total_quantity FROM holdings WHERE discord_id = ? GROUP BY stock_id", [discordId], (err, holdingRows) => {
            if (err) {
                console.error(err);
                return interaction.reply('An error occurred while fetching your portfolio data.');
            }

            // populate the stockQuantities object with the total quantity owned for each stock
            holdingRows.forEach(row => {
                stockQuantities[row.stock_id] = row.total_quantity;
            });

            const embed = new EmbedBuilder()
                .setTitle('Current Stocks and Prices')
                .setColor('#0099ff');

            stockRows.forEach(stock => {
                const quantityOwned = stockQuantities[stock.stock_id] || 0;
                embed.addFields(
                    { name: stock.stock_id, value: `Price: ${stock.price.toFixed(3)} coins\nQuantity Owned: ${quantityOwned}`, inline: true },
                    { name: ' ', value: '\u200B', inline: true } // empty field for spacing between stocks
                );
            });

            interaction.reply({ embeds: [embed] });
        });
    });
}




async function checkPortfolio(interaction) {
    const discordId = interaction.user.id;

    // query the database to retrieve the user's stock holdings
    dbPool.query("SELECT holdings.stock_id, holdings.quantity, stocks.price FROM holdings JOIN stocks ON holdings.stock_id = stocks.stock_id WHERE holdings.discord_id = ?", [discordId], (err, rows) => {
        if (err) {
            console.error(err);
            return interaction.reply('An error occurred while fetching your portfolio.');
        }
        
        if (rows.length === 0) {
            return interaction.reply('Your portfolio is empty.');
        }

        // calc the total value of all stocks
        let totalValue = 0;
        rows.forEach(row => {
            totalValue += row.quantity * row.price;
        });

        const portfolioEmbed = new EmbedBuilder()
            .setTitle(`Stock Portfolio - Total Value: ${totalValue.toFixed(3)} coins`)
            .setColor('#0099ff');

        rows.forEach(row => {
            portfolioEmbed.addFields(
                { name: 'Stock', value: `${row.stock_id}`, inline: true },
                { name: 'Quantity', value: `${row.quantity}`, inline: true },
                { name: 'Price', value: `${row.price.toFixed(3)} coins`, inline: true },
                { name: ' ', value: '\u200B' } // Add an empty field for spacing
            );
        });

        interaction.reply({ embeds: [portfolioEmbed] });
    });
}


async function setupUser(interaction) {
    const discordId = interaction.user.id;
    dbPool.query("SELECT discord_id FROM players WHERE discord_id = ?", [discordId], (err, rows) => {
        if (err) {
            console.error(err);
            return interaction.reply('An error occurred.');
        }
        if (rows.length === 0) {
            dbPool.query("INSERT INTO players (discord_id, coins) VALUES (?, 0)", [discordId], (err) => {
                if (err) {
                    console.error(err);
                    return interaction.reply('An error occurred.');
                }
                interaction.reply('Your account has been successfully set up.');
            });
        } else {
            interaction.reply('You already have an account.');
        }
    });
}


async function checkBalance(interaction) {
    const discordId = interaction.user.id;
    dbPool.query("SELECT coins FROM players WHERE discord_id = ?", [discordId], (err, rows) => {
        if (err) {
            console.error(err);
            return interaction.reply('An error occurred.');
        }
        if (rows.length > 0) {
            const row = rows[0]; // get the first row object from the array
            const coins = row.coins.toFixed(3); // and limit to 3 decimals
            interaction.reply(`You have ${coins} coins.`);
        } else {
            dbPool.query("INSERT INTO players (discord_id) VALUES (?)", [discordId], (err) => {
                if (err) {
                    console.error(err);
                    return interaction.reply('An error occurred.');
                }
                interaction.reply('You have 0 coins.');
            });
        }
    });
}

async function sellAll(interaction) {
    const discordId = interaction.user.id;
    let totalCoinsEarned = 0;

    // query the database to retrieve the user's stock holdings
    dbPool.query("SELECT stock_id, quantity FROM holdings WHERE discord_id = ?", [discordId], (err, rows) => {
        if (err) {
            console.error(err);
            return interaction.reply('An error occurred while fetching your portfolio.');
        }

        if (rows.length === 0) {
            return interaction.reply('Your portfolio is empty.');
        }

        let promises = rows.map(row => {
            return new Promise((resolve, reject) => {
                // query the database to get the current price of the stock
                dbPool.query("SELECT price FROM stocks WHERE stock_id = ?", [row.stock_id], (err, priceRows) => {
                    if (err || priceRows.length === 0) {
                        console.error(err);
                        return reject('An error occurred while fetching stock prices.');
                    }

                    // calc the total value of the stock holding
                    const stockPrice = priceRows[0].price;
                    const stockValue = stockPrice * row.quantity;
                    totalCoinsEarned += stockValue;

                    // lower the stock price based on the quantity sold
                    const newPrice = (stockPrice * (1 - 0.01 * row.quantity)).toFixed(3); // decrease by 1% per quantity sold
                    const finalPrice = Math.max(1, newPrice); // ensure price doesn't drop below 1

                    // the above code is shitty and is a bad simulation of stock market prices

                    dbPool.query("UPDATE stocks SET price = ? WHERE stock_id = ?", [finalPrice, row.stock_id], (err) => {
                        if (err) {
                            console.error(err);
                            return reject('An error occurred while updating stock prices.');
                        }

                        // sell the stocks
                        dbPool.query("DELETE FROM holdings WHERE discord_id = ? AND stock_id = ?", [discordId, row.stock_id], (err) => {
                            if (err) {
                                console.error(err);
                                return reject('An error occurred while selling stocks.');
                            }

                            resolve();
                        });
                    });
                });
            });
        });

        Promise.all(promises)
            .then(() => {
                // update the user's coins with the total value
                dbPool.query("UPDATE players SET coins = coins + ? WHERE discord_id = ?", [totalCoinsEarned, discordId], (err) => {
                    if (err) {
                        console.error(err);
                        return interaction.reply('An error occurred while updating your coins.');
                    }

                    interaction.reply(`All stocks in your portfolio have been sold. You earned ${totalCoinsEarned} coins.`);
                });
            })
            .catch(error => {
                interaction.reply(error);
            });
    });
}


async function buyStock(interaction) {
    const discordId = interaction.user.id;
    const stockId = interaction.options.getString('stock').toUpperCase();
    const quantity = interaction.options.getInteger('quantity');

    dbPool.query("SELECT coins FROM players WHERE discord_id = ?", [discordId], (err, rows) => {
        if (err) {
            console.error(err);
            return interaction.reply('An error occurred.');
        }
        
        // check if the query returned any rows
        if (rows.length === 0) {
            return interaction.reply('Player not found.');
        }
        
        // extract the coins value from the first row
        const playerCoins = rows[0].coins;

        dbPool.query("SELECT price FROM stocks WHERE stock_id = ?", [stockId], (err, rows) => {
            if (err || !rows || rows.length === 0) {
                console.error(err);
                return interaction.reply('Invalid stock ID.');
            }
            const stock = rows[0]; // get the first row object from the array
            const cost = (stock.price * quantity).toFixed(3); // and limit to 3 decimals again
            if (playerCoins >= cost) {
                dbPool.query("UPDATE players SET coins = coins - ? WHERE discord_id = ?", [cost, discordId]);
                
                dbPool.query("INSERT INTO holdings (discord_id, stock_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + ?", [discordId, stockId, quantity, quantity], (err, result) => {
                    if (err) {
                        console.error(err);
                        return interaction.reply('An error occurred while buying the stock.');
                    }
                });
                
                // calc new stock price and percentage change
                const newPrice = (stock.price * (1 + 0.01 * quantity)).toFixed(3); // increase by 1% per quantity bought
                const percentageChange = ((newPrice - stock.price) / stock.price) * 100;

                // if the percentage change is significant, send an embed notification
                if (Math.abs(percentageChange) >= 5) {
                    const embed = new EmbedBuilder()
                        .setTitle('Stock Price Fluctuation')
                        .setDescription(`The price of ${stockId} has changed significantly after a buy transaction.\nPercentage Change: ${percentageChange.toFixed(2)}%\nNew Price: ${newPrice} coins`)
                        .setColor('#ff0000');

                    const channel = client.channels.cache.get('1245109991573028955');
                    if (channel && channel.isTextBased()) {
                        channel.send({ embeds: [embed] })
                            .then(() => console.log('Price fluctuation notification sent to channel'))
                            .catch(console.error);
                    } else {
                        console.error('Invalid channel or channel type');
                    }
                }

                dbPool.query("UPDATE stocks SET price = ? WHERE stock_id = ?", [newPrice, stockId]);
                
                logTransaction(discordId, 'BUY', stockId, quantity, cost);
                
                interaction.reply(`You bought ${quantity} ${stockId} stocks for ${cost} coins. New price of ${stockId} is ${newPrice} coins.`);
            } else {
                interaction.reply('Not enough coins.');
            }
        });
    });
}

async function sellStock(interaction) {
    const discordId = interaction.user.id;
    const stockId = interaction.options.getString('stock').toUpperCase();
    const quantity = interaction.options.getInteger('quantity');

    dbPool.query("SELECT quantity FROM holdings WHERE discord_id = ? AND stock_id = ?", [discordId, stockId], (err, rows) => {
        if (err || !rows || rows.length === 0) {
            console.error(err);
            return interaction.reply('Not enough stock holdings.');
        }

        const holding = rows[0]; 
        if (holding.quantity < quantity) {
            return interaction.reply('Not enough stock holdings.');
        }

        dbPool.query("SELECT price FROM stocks WHERE stock_id = ?", [stockId], (err, rows) => {
            if (err || !rows || rows.length === 0) {
                console.error(err);
                return interaction.reply('Invalid stock ID.');
            }

            const stock = rows[0]; 
            const earnings = (stock.price * quantity).toFixed(3); 
            dbPool.query("UPDATE players SET coins = coins + ? WHERE discord_id = ?", [earnings, discordId]);
            dbPool.query("UPDATE holdings SET quantity = quantity - ? WHERE discord_id = ? AND stock_id = ?", [quantity, discordId, stockId]);
            if (holding.quantity === quantity) {
                dbPool.query("DELETE FROM holdings WHERE discord_id = ? AND stock_id = ?", [discordId, stockId]);
            }

            // calc new stock price and percentage change
            const newPrice = (stock.price * (1 - 0.01 * quantity)).toFixed(3); // decrease by 1% per quantity sold
            const finalPrice = Math.max(1, newPrice); // make sure price doesn't drop below 1 (bankruptcy? i think?)
            const percentageChange = ((newPrice - stock.price) / stock.price) * 100;

            // if the percentage change is significant, send an embed notification
            if (Math.abs(percentageChange) >= 5) {
                const embed = new EmbedBuilder()
                    .setTitle('Stock Price Fluctuation')
                    .setDescription(`The price of ${stockId} has changed significantly after a sell transaction.\nPercentage Change: ${percentageChange.toFixed(2)}%\nNew Price: ${finalPrice} coins`)
                    .setColor('#ff0000');

                const channel = client.channels.cache.get('1245109991573028955');
                if (channel && channel.isTextBased()) {
                    channel.send({ embeds: [embed] })
                        .then(() => console.log('Price fluctuation notification sent to channel'))
                        .catch(console.error);
                } else {
                    console.error('Invalid channel or channel type');
                }
            }

            dbPool.query("UPDATE stocks SET price = ? WHERE stock_id = ?", [finalPrice, stockId]);

            logTransaction(discordId, 'SELL', stockId, quantity, earnings);

            interaction.reply(`You sold ${quantity} ${stockId} stocks for ${earnings} coins. New price of ${stockId} is ${finalPrice} coins.`);
        });
    });
}




async function payUser(interaction) {
    const senderId = interaction.user.id;
    const recipient = interaction.options.getUser('user');
    const amountString = interaction.options.getString('amount');
    const amount = parseFloat(amountString);

    if (isNaN(amount) || !isFinite(amount)) {
        return interaction.reply('Invalid amount. Please enter a valid number.');
    }


    const recipientId = recipient.id;

    dbPool.query("SELECT coins FROM players WHERE discord_id = ?", [senderId], (err, senderResult) => {
        if (err || !senderResult || senderResult.length === 0 || senderResult[0].coins < amount) {
            console.error(err);
            return interaction.reply('Not enough coins.');
        }

        const senderCoins = senderResult[0].coins;

        dbPool.query("UPDATE players SET coins = coins - ? WHERE discord_id = ?", [amount, senderId], (err) => {
            if (err) {
                console.error(err);
                return interaction.reply('An error occurred while updating sender coins.');
            }

            dbPool.query("INSERT INTO players (discord_id, coins) VALUES (?, ?) ON DUPLICATE KEY UPDATE coins = coins + ?", [recipientId, amount, amount], (err) => {
                if (err) {
                    console.error(err);
                    return interaction.reply('An error occurred while updating recipient coins.');
                }

                interaction.reply(`You paid ${amount} coins to ${recipient.username}.`);
            });
        });
    });
}


async function checkPrice(interaction) {
    const stockId = interaction.options.getString('stock').toUpperCase();
    dbPool.query("SELECT price FROM stocks WHERE stock_id = ?", [stockId], (err, rows) => {
        if (err || !rows || rows.length === 0) {
            console.error(err);
            return interaction.reply('Invalid stock ID.');
        }
        const row = rows[0]; 
        const price = row.price.toFixed(3);
        interaction.reply(`The current price of ${stockId} is ${price} coins.`);
    });
}


async function updateStockPrices() {
    try {
        const stocks = await new Promise((resolve, reject) => {
            dbPool.query("SELECT stock_id, price FROM stocks", (err, stocks) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(stocks);
                }
            });
        });

        const priceUpdates = [];

        for (const stock of stocks) {
            const randomFactor = (Math.random() * 0.05) - 0.025; // randomly adjust price by ± 2.5%
            const newPrice = Math.max(1, stock.price * (1 + randomFactor));

            await new Promise((resolve, reject) => {
                dbPool.query("UPDATE stocks SET price = ? WHERE stock_id = ?", [newPrice, stock.stock_id], err => {
                    if (err) {
                        console.error(err);
                        reject(err);
                    } else {
                        console.log(`Stock price updated for ${stock.stock_id}. New price: ${newPrice}`);
                        const description = `Stock price updated for ${stock.stock_id}.\nNew price: ${newPrice}`;
                        priceUpdates.push(description);
                        resolve();
                    }
                });
            });
        }

        if (priceUpdates.length > 0) {
            const embed = new EmbedBuilder()
                .setTitle('Stock Price Updates')
                .setDescription(priceUpdates.join('\n\n'))
                .setColor('#0099ff');

            const channel = client.channels.cache.get('1245107375958921217');
            if (channel && channel.isTextBased()) {
                channel.send({ embeds: [embed] })
                    .then(() => console.log('Price updates sent to channel'))
                    .catch(console.error);
            } else {
                console.error('Invalid channel or channel type');
            }
        }
    } catch (error) {
        console.error(error);
    }
}


client.login(token);
