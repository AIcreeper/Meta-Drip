import { OpenAI } from "openai";
import dotenv from "dotenv";
import readline from "readline";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Coin abbreviation mapping
const coinDictionary = {
    "sol": "Solana",
    "btc": "Bitcoin",
    "eth": "Ethereum",
    "usdt": "Tether",
    "ada": "Cardano",
    "xrp": "XRP",
    "ltc": "Litecoin",
    "dot": "Polkadot",
    "doge": "Dogecoin",
    "matic": "Polygon",
    "pepe": "Pepe"
};

// Function to convert values like "$300K" → 300000, "$1M" → 1000000
function convertAmountToNumber(amountStr) {
    if (!amountStr) return null;
    
    // Ensure input is a string
    const amountStrCleaned = String(amountStr).trim();

    const match = amountStrCleaned.match(/\$?(\d+(?:\.\d+)?)([KkMm]?)/);
    if (!match) return null;

    let value = parseFloat(match[1]);
    const suffix = match[2].toUpperCase();

    if (suffix === "K") value *= 1000;
    if (suffix === "M") value *= 1000000;

    return Math.round(value);
}

async function extractTradeDetails(userInput) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { 
                    role: "system", 
                    content: `Extract trade details from user input and return a JSON array.
                    - If multiple trades exist, return an array.
                    - "action" should be "buy" or "sell". Convert "swap" to "buy".
                    - "coin_quantity" should be extracted if a number is mentioned for crypto.
                    - "coinname" should be the full name (e.g., "Bitcoin" instead of "BTC").
                    - "condition" should only exist when a numeric condition is found (e.g., "if BTC crosses $60K" → 60000, "if a whale buys $1M BTC" → 1000000).
                    - If no valid trade details are found, return "NO_TRADE".`
                },
                { role: "user", content: `Analyze this input and return trade details as JSON:\n\n"${userInput}"` }
            ],
            temperature: 0.3
        });

        const content = response.choices[0]?.message?.content.trim();
        if (content === "NO_TRADE") {
            return null;
        }

        const jsonMatch = content.match(/```json([\s\S]*?)```/);
        if (jsonMatch) {
            let trades = JSON.parse(jsonMatch[1]);

            if (!Array.isArray(trades)) {
                trades = [trades];
            }

            trades.forEach(trade => {
                if (!trade || typeof trade !== "object") return;

                // Convert "swap" to "buy"
                if (trade.action && trade.action.toLowerCase() === "swap") {
                    trade.action = "buy";
                }

                // Convert abbreviation to full coin name
                if (trade.coinName && coinDictionary[trade.coinName.toLowerCase()]) {
                    trade.coinName = coinDictionary[trade.coinName.toLowerCase()];
                }

                // Ensure the condition is properly formatted
                if (trade.condition) {
                    trade.condition = convertAmountToNumber(trade.condition);
                } else {
                    trade.condition = null;
                }

                // Ensure required fields always exist
                trade.coin_quantity = trade.coin_quantity !== undefined ? trade.coin_quantity : null;
            });

            return trades.length === 1 ? trades[0] : trades;
        }

        return null;
    } catch (error) {
        console.error("Error extracting trade details:", error);
        return null;
    }
}

async function generateGeneralResponse(userInput) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are a helpful chatbot. If the user asks a general question, provide a relevant response." },
                { role: "user", content: userInput }
            ],
            temperature: 0.5
        });

        return response.choices[0]?.message?.content.trim();
    } catch (error) {
        console.error("Error generating response:", error);
        return "I'm having trouble understanding you right now.";
    }
}

async function chatWithBot(userInput) {
    try {
        if (!userInput.trim()) {
            console.log("Please enter a valid query.");
            return;
        }

        const extractedTrades = await extractTradeDetails(userInput);

        if (extractedTrades) {
            console.log("Trade Details:", JSON.stringify(extractedTrades, null, 2));
        } else {
            const generalResponse = await generateGeneralResponse(userInput);
            console.log("Bot:", generalResponse);
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

function startChat() {
    rl.question("You: ", async (userInput) => {
        if (userInput.toLowerCase() === "exit") {
            console.log("Exiting chatbot...");
            rl.close();
            return;
        }

        await chatWithBot(userInput);
        startChat();
    });
}

console.log("Chatbot started! Type 'exit' to quit.");
startChat();
