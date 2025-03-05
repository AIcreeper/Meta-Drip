// import { OpenAI } from "openai";
// import dotenv from "dotenv";
// import readline from "readline";

// dotenv.config();

// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout
// });

// async function chatWithBot(userInput) {
//     try {
//         const stream = await openai.chat.completions.create({
//             model: "gpt-4o",
//             messages: [{ role: "user", content: userInput }],
//             stream: true, 
//             temperature: 0.7
//         });

//         process.stdout.write("Bot: ");
//         for await (const part of stream) {
//             process.stdout.write(part.choices[0]?.delta?.content || "");
//         }
//         console.log("\n");
//     } catch (error) {
//         console.error("Error:", error);
//     }
// }

// function startChat() {
//     rl.question("You: ", async (userInput) => {
//         if (userInput.toLowerCase() === "exit") {
//             console.log("Exiting chatbot...");
//             rl.close();
//             return;
//         }

//         await chatWithBot(userInput);
//         startChat();
//     });
// }

// console.log("Chatbot started! Type 'exit' to quit.");
// startChat();









import { OpenAI } from "openai";
import dotenv from "dotenv";
import readline from "readline";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function analyzeText(userInput) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "Analyze the user input. If it is a trade-related request, extract details as JSON with fields: coinname, type (Buy/Sell), minimumAmount, and defaultValue (always null). If it is a general conversation (e.g., 'hi', 'hello', 'how are you?'), respond appropriately as a chatbot without JSON." },
                { role: "user", content: userInput }
            ],
            temperature: 0.7
        });

        return response.choices[0]?.message?.content.trim();
    } catch (error) {
        console.error("Error analyzing text:", error);
        return "Sorry, I couldn't process your request.";
    }
}

async function chatWithBot(userInput) {
    try {
        const responseText = await analyzeText(userInput);
        
        // Check if response contains JSON
        if (responseText.startsWith("{") && responseText.endsWith("}")) {
            const jsonStart = responseText.indexOf('{');
            const jsonEnd = responseText.lastIndexOf('}') + 1;
            const jsonString = responseText.substring(jsonStart, jsonEnd);
            const tradeDetails = JSON.parse(jsonString);
            console.log("Extracted JSON:", JSON.stringify(tradeDetails, null, 2));
        } else {
            console.log("Bot:", responseText);
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