require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');

// Replace with your own Telegram bot token
const token = process.env.TELEGRAM_BOT_TOKEN;

// Create bot instance without polling
const bot = new TelegramBot(token);

// Set webhook URL (you'll need to set this after deploying to Vercel)
const url = process.env.VERCEL_URL || 'your-vercel-deployment-url';
bot.setWebHook(`${url}/api/webhook`);

// Store users and random chat pairs (Note: This will reset on each function call due to serverless nature)
let users = [];
let chatPairs = {};

// Create Express app
const app = express();
app.use(express.json());

// Webhook endpoint
app.post('/api/webhook', (req, res) => {
    const msg = req.body.message;
    
    if (!msg) {
        return res.sendStatus(200);
    }

    handleMessage(msg);
    res.sendStatus(200);
});

// Function to handle incoming messages
async function handleMessage(msg) {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text === '/start') {
        if (!users.includes(chatId)) {
            users.push(chatId);
            await bot.sendMessage(chatId, 'You have been added to the queue. Please wait for a random user to be paired.');
        }
        pairUsers();
    } else if (text === '/end') {
        const pairedUser = chatPairs[chatId];

        if (pairedUser) {
            await bot.sendMessage(pairedUser, 'The other user has ended the chat.');
            await bot.sendMessage(chatId, 'You have ended the chat.');

            delete chatPairs[chatId];
            delete chatPairs[pairedUser];

            users.push(chatId);
            users.push(pairedUser);

            pairUsers();
        } else {
            await bot.sendMessage(chatId, 'You are not in an active chat.');
        }
    } else {
        if (chatPairs[chatId]) {
            const pairedUser = chatPairs[chatId];
            await bot.sendMessage(pairedUser, text);
        } else {
            await bot.sendMessage(chatId, 'You are not paired with anyone yet. Please wait.');
        }
    }
}

// Function to pair users
async function pairUsers() {
    while (users.length >= 2) {
        const user1 = users.shift();
        const user2 = users.shift();
        chatPairs[user1] = user2;
        chatPairs[user2] = user1;

        await bot.sendMessage(user1, 'You have been paired with a random user! Start chatting!\n /start - to start chat \n /end - to stop and move next.');
        await bot.sendMessage(user2, 'You have been paired with a random user! Start chatting!\n /start - to start chat \n /end - to stop and move next.');
    }
}

// Export the Express API
module.exports = app;
