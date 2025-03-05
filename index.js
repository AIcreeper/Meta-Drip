import { OpenAI } from "openai";
import dotenv from "dotenv";
import readline from "readline";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function extractTradeDetails(userInput) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { 
                    role: "system", 
                    content: `Extract trade details from user input and return JSON.
                    - "action" should be "buy" or "sell" only (convert "swap" to "buy").
                    - "amount" should be extracted as a number.
                    - "currency" should be extracted from the input (USD, USDT, etc.).
                    - "coinname" should be the cryptocurrency being traded.
                    - "condition" should capture any conditions provided.
                    - If no trade details are found, return "NO_TRADE".`
                },
                { role: "user", content: `Analyze the following input and extract trade details in JSON format:\n\n"${userInput}"` }
            ],
            temperature: 0.3
        });

        const content = response.choices[0]?.message?.content.trim();

        if (content === "NO_TRADE") {
            return null;
        }

        const jsonMatch = content.match(/```json([\s\S]*?)```/);
        if (jsonMatch) {
            let tradeData = JSON.parse(jsonMatch[1]);

            if (Array.isArray(tradeData)) {
                tradeData.forEach(trade => {
                    if (trade.action.toLowerCase() === "swap") {
                        trade.action = "buy";
                    }
                });
            } else {
                if (tradeData.action.toLowerCase() === "swap") {
                    tradeData.action = "buy";
                }
            }

            return tradeData;
        } else {
            return null;
        }
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
                { role: "system", content: "You are a helpful chatbot. If the user asks a general question, provide a friendly response." },
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
