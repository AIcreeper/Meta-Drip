import { OpenAI } from "openai";
import dotenv from "dotenv";
import readline from "readline";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Mapping for coin abbreviations to full names
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
    "matic": "Polygon"
};

async function extractTradeDetails(userInput) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { 
                    role: "system", 
                    content: `Extract trade details from user input and return a JSON array.
                    - If multiple trades exist, return an array of objects.
                    - "action" should be "buy" or "sell". Convert "swap" to "buy".
                    - "amount" should be null unless a fiat value is explicitly mentioned.
                    - "coin_quantity" should be null unless the user explicitly mentions an amount in crypto.
                    - "currency" is included only when a fiat amount is given.
                    - "coinname" should always be the full name of the cryptocurrency.
                    - "condition" should always exist, even if null.
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

                // Convert coin abbreviations to full names
                if (trade.coinname && coinDictionary[trade.coinname.toLowerCase()]) {
                    trade.coinname = coinDictionary[trade.coinname.toLowerCase()];
                }

                // Ensure required fields always exist
                trade.amount = trade.amount !== undefined ? trade.amount : null;
                trade.coin_quantity = trade.coin_quantity !== undefined ? trade.coin_quantity : null;
                trade.condition = trade.condition !== undefined ? trade.condition : null;
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
            temperature: 0.7
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
