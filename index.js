import "dotenv/config";
import axios from "axios";
import { OpenAI } from "openai";
import { exec } from "child_process";
import fs from "fs/promises";
import readline from "readline";

// Setup readline interface for conversational CLI
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const apiKey = process.env.OPENAI_API_KEY;
const isGroq = apiKey && apiKey.startsWith("gsk_");

const client = new OpenAI({
    apiKey: apiKey,
    baseURL: isGroq ? "https://api.groq.com/openai/v1" : undefined
});

// ------------- TOOLS -------------

async function getTheWeatherOfCity(cityname = "") {
    try {
        const url = `https://wttr.in/${cityname.toLowerCase()}?format=%C+%t`;
        const { data } = await axios.get(url, { responseType: "text" });
        return `The Weather of ${cityname} is ${data}`;
    } catch (e) {
        return `Failed to fetch weather for ${cityname}`;
    }
}

async function executeCommand(cmd = "") {
    return new Promise((res, rej) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                res(`Error: ${error.message}\nStderr: ${stderr}`);
            } else {
                res(stdout || "Command executed successfully with no output.");
            }
        });
    });
}

async function createFile(argsStr = "") {
    try {
        const args = JSON.parse(argsStr);
        await fs.writeFile(args.filepath, args.content, "utf-8");
        return `File ${args.filepath} created successfully.`;
    } catch (e) {
        return `Failed to create file: ${e.message}`;
    }
}

async function readFile(filepath = "") {
    try {
        const content = await fs.readFile(filepath, "utf-8");
        return content;
    } catch (e) {
        return `Failed to read file: ${e.message}`;
    }
}

const tool_map = {
    getTheWeatherOfCity,
    executeCommand,
    createFile,
    readFile
};

// ------------- SYSTEM PROMPT -------------
const system_prompt = `
You are an advanced AI Assistant who works on INPUT, THINK, TOOL, OBSERVE, and OUTPUT format.
You act as a conversational CLI agent (like Cursor or Windsurf) that can take user instructions, reason through them, and execute actions to modify the filesystem and build applications.

You are responsible for breaking down the major problem into smaller problems.
You will do multiple thinking steps before providing any final output.
You have access to some tools that you can use to perform actions.

Tools:
1. getTheWeatherOfCity(cityname: string): Fetches the live weather of the city.
2. executeCommand(cmd: string): Executes a linux/unix command inside the machine of the user. Example args: "mkdir scaler_clone"
3. createFile(args: string): Creates a file with the given content. The args MUST be a valid JSON string like: {"filepath": "index.html", "content": "<h1>Hello</h1>"}. Make sure to escape quotes properly.
4. readFile(filepath: string): Reads the contents of a file.

Rules:
1. You will always follow the JSON format for your responses.
2. You will do one step at a time and wait for the previous step to be completed via an OBSERVE message.
3. You will always do multiple THINK steps to plan before producing any OUTPUT or TOOL step.
4. After every TOOL step, wait for the developer to provide an OBSERVE step. Do NOT simulate the OBSERVE step yourself.
5. If creating a website, break it down: THINK -> Create HTML -> OBSERVE -> THINK -> Create CSS -> OBSERVE -> THINK -> Create JS -> OBSERVE -> OUTPUT.
6. The user may ask you to "clone the Scaler Academy website". If they do, use the tools to generate HTML, CSS, and JS files with a Header, Hero section, and Footer that visually resemble the Scaler website (dark blue, vibrant red/orange call to actions, modern typography).

Output format:
{ "step": "START | THINK | TOOL | OBSERVE | OUTPUT", "content": "string", "tool_name": "string", "tool_args": "string" }

Examples:
user: Create a hello world html file
assistant: { "step": "START", "content": "User wants me to create a hello world HTML file." }
assistant: { "step": "THINK", "content": "I need to use the createFile tool to generate an index.html file." }
assistant: { "step": "TOOL", "tool_name": "createFile", "tool_args": "{\\"filepath\\": \\"index.html\\", \\"content\\": \\"<h1>Hello World</h1>\\"}" }
developer: { "step": "OBSERVE", "content": "File index.html created successfully." }
assistant: { "step": "THINK", "content": "The file was successfully created. I can notify the user now." }
assistant: { "step": "OUTPUT", "content": "I have created the index.html file for you." }
`;

// ------------- MAIN AGENT LOOP -------------

async function askUser(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function runAgent(userInstruction) {
    const messages = [
        { role: "system", content: system_prompt },
        { role: "user", content: userInstruction }
    ];

    console.log("\\n[Agent] Starting task...");

    while (true) {
        try {
            const response = await client.chat.completions.create({
                model: isGroq ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini',
                messages: messages
            });

            const content = response.choices[0].message.content;
            let parsedContent;
            
            try {
                parsedContent = JSON.parse(content);
            } catch (err) {
                console.error("[Error] Agent returned invalid JSON. Content was:", content);
                break;
            }

            messages.push({
                role: 'assistant',
                content: JSON.stringify(parsedContent)
            });

            if (parsedContent.step === "START") {
                console.log("\\x1b[34m[START]\\x1b[0m", parsedContent.content);
            } 
            else if (parsedContent.step === "THINK") {
                console.log("\\x1b[33m[THINK]\\x1b[0m", parsedContent.content);
            } 
            else if (parsedContent.step === "TOOL") {
                console.log(`\\x1b[36m[TOOL]\\x1b[0m Calling \\x1b[32m${parsedContent.tool_name}\\x1b[0m with args: ${parsedContent.tool_args}`);
                
                if (!tool_map[parsedContent.tool_name]) {
                    const errorMsg = `Tool ${parsedContent.tool_name} is not available`;
                    console.log("\\x1b[31m[OBSERVE]\\x1b[0m", errorMsg);
                    messages.push({
                        role: "developer",
                        content: JSON.stringify({
                            step: "OBSERVE",
                            content: errorMsg
                        })
                    });
                } else {
                    // Execute tool
                    const data = await tool_map[parsedContent.tool_name](parsedContent.tool_args);
                    console.log("\\x1b[35m[OBSERVE]\\x1b[0m", data);
                    
                    messages.push({
                        role: "developer",
                        content: JSON.stringify({
                            step: "OBSERVE",
                            content: data
                        })
                    });
                }
            } 
            else if (parsedContent.step === "OUTPUT") {
                console.log("\\x1b[32m[OUTPUT]\\x1b[0m", parsedContent.content);
                break; // End the loop
            }
            else {
                console.log("[UNKNOWN STEP]", parsedContent);
                break;
            }
        } catch (error) {
            console.error("[Fatal Error] Communication with OpenAI failed:", error.message);
            break;
        }
    }
}

// ------------- ENTRY POINT -------------

async function main() {
    console.log("=========================================");
    console.log("   AI Agent CLI Tool - Assignment 02     ");
    console.log("=========================================\\n");

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "your-openai-api-key-here") {
        console.error("\\x1b[31m[Error]\\x1b[0m OPENAI_API_KEY is missing or invalid in .env file.");
        console.log("Please create a .env file based on .env.example and add your API key.");
        process.exit(1);
    }

    const startInstruction = await askUser("How can I help you today? (e.g., 'Clone the Scaler Academy website'): ");
    
    if (startInstruction.trim()) {
        await runAgent(startInstruction);
    }

    rl.close();
}

main();
