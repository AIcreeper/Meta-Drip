import { OpenAI } from "openai";
import dotenv from "dotenv";
import readline from "readline";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Mapping for coin abbreviations
const coinDictionary = {
    "sol": "SOL",
    "btc": "BTC",
    "eth": "ETH",
    "usdt": "USDT",
    "ada": "ADA",
    "xrp": "XRP",
    "ltc": "LTC",
    "dot": "DOT",
    "doge": "DOGE",
    "matic": "MATIC",
    "pepe": "PEPE"
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
                    - "action" should be "buy" or "sell".
                    - Convert "swap":
                      * "swap [fiat] for [crypto]" → "buy"
                      * "swap [crypto] for [crypto]" → split into "sell" for the first coin & "buy" for the second coin.
                    - "amount" should be null unless a fiat value is explicitly mentioned.
                    - "coin_quantity" should be null unless the user explicitly mentions an amount in crypto.
                    - "coinname" should be the uppercase abbreviation.
                    - "condition" rules:
                      * Extract price if mentioned (e.g., "$60K").
                      * If a trend is mentioned (e.g., "bull phase"), return "bullish" or "bearish".
                      * If no condition is found, return null.
                    - If no valid trade details are found, return "NO_TRADE".`
                },
                { role: "user", content: `Analyze this input and return trade details as JSON:\n\n"${userInput}"` }
            ],
            temperature: 0.3
        });

        const content = response.choices[0]?.message?.content.trim();
        if (content === "NO_TRADE") return null;

        const jsonMatch = content.match(/```json([\s\S]*?)```/);
        if (jsonMatch) {
            let trades = JSON.parse(jsonMatch[1]);
            if (!Array.isArray(trades)) trades = [trades];

            return trades.map(trade => {
                if (!trade || typeof trade !== "object") return null;
                
                if (trade.action.toLowerCase() === "swap") trade.action = "buy";
                if (trade.coinSymbol && coinDictionary[trade.coinSymbol.toLowerCase()]) {
                    trade.coinSymbol = coinDictionary[trade.coinSymbol.toLowerCase()];
                }
                if (trade.condition) {
                    const priceMatch = trade.condition.match(/\$\d+K?/i);
                    trade.condition = priceMatch ? priceMatch[0] : (/bull/i.test(trade.condition) ? "bullish" : (/bear/i.test(trade.condition) ? "bearish" : null));
                }
                trade.amount = trade.amount ?? null;
                trade.coin_quantity = trade.coin_quantity ?? null;
                
                return trade;
            }).filter(Boolean);
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
            console.log("Bot:", await generateGeneralResponse(userInput));
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