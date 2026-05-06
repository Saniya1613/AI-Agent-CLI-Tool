import "dotenv/config";
import axios from "axios";
import { OpenAI } from "openai";
import { exec } from "child_process";
import fs from "fs/promises";
import readline from "readline";
import path from "path";

// ─────────────────────────────────────────
//  PRETTY TERMINAL HELPERS
// ─────────────────────────────────────────

const COLORS = {
    reset:   "\x1b[0m",
    bold:    "\x1b[1m",
    dim:     "\x1b[2m",
    red:     "\x1b[31m",
    green:   "\x1b[32m",
    yellow:  "\x1b[33m",
    blue:    "\x1b[34m",
    magenta: "\x1b[35m",
    cyan:    "\x1b[36m",
    white:   "\x1b[37m",
    bgBlue:  "\x1b[44m",
    bgGreen: "\x1b[42m",
};

const ICONS = {
    user:    "👤",
    think:   "💭",
    tool:    "🔧",
    observe: "👁️ ",
    output:  "✅",
    start:   "🚀",
    error:   "❌",
    file:    "📄",
    folder:  "📁",
    browser: "🌐",
};

function printSeparator() {
    console.log(`${COLORS.dim}${"─".repeat(60)}${COLORS.reset}`);
}

function printBoxed(label, icon, color, message) {
    console.log();
    console.log(`  ${icon}  ${color}${COLORS.bold}${label}${COLORS.reset}`);
    console.log(`  ${COLORS.dim}│${COLORS.reset}`);
    // Word-wrap message to ~55 chars per line
    const lines = wordWrap(message, 54);
    for (const line of lines) {
        console.log(`  ${COLORS.dim}│${COLORS.reset}  ${line}`);
    }
    console.log(`  ${COLORS.dim}│${COLORS.reset}`);
    printSeparator();
}

function wordWrap(text, maxWidth) {
    if (!text) return [""];
    const words = text.split(" ");
    const lines = [];
    let current = "";
    for (const word of words) {
        if ((current + " " + word).trim().length > maxWidth) {
            lines.push(current.trim());
            current = word;
        } else {
            current = current ? current + " " + word : word;
        }
    }
    if (current.trim()) lines.push(current.trim());
    return lines.length ? lines : [""];
}

// Simple spinner for loading state
function createSpinner(text) {
    const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    let i = 0;
    const id = setInterval(() => {
        process.stdout.write(`\r  ${COLORS.cyan}${frames[i % frames.length]}${COLORS.reset} ${COLORS.dim}${text}${COLORS.reset}`);
        i++;
    }, 80);
    return {
        stop: (finalText) => {
            clearInterval(id);
            process.stdout.write(`\r${" ".repeat(70)}\r`);
            if (finalText) console.log(`  ${COLORS.green}✓${COLORS.reset} ${COLORS.dim}${finalText}${COLORS.reset}`);
        }
    };
}

// ─────────────────────────────────────────
//  SETUP
// ─────────────────────────────────────────

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

// Track created files to auto-open HTML at the end
let createdFiles = [];

// ─────────────────────────────────────────
//  TOOLS
// ─────────────────────────────────────────

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
    return new Promise((res) => {
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
        // Sanitize: Groq/Llama often puts literal newlines/tabs inside JSON strings
        // which causes "Bad control character" errors. Fix them before parsing.
        let sanitized = argsStr;
        // Replace literal control characters inside the JSON string values
        // but preserve actual JSON structure
        sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, (char) => {
            switch (char) {
                case '\n': return '\\n';
                case '\r': return '\\r';
                case '\t': return '\\t';
                default: return ''; // strip other control chars
            }
        });

        const args = JSON.parse(sanitized);
        // Restore actual newlines in file content (convert \n back to real newlines)
        if (args.content) {
            args.content = args.content.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
        }
        // Ensure parent directories exist
        const dir = path.dirname(args.filepath);
        if (dir && dir !== ".") {
            await fs.mkdir(dir, { recursive: true });
        }
        await fs.writeFile(args.filepath, args.content, "utf-8");
        createdFiles.push(args.filepath);
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

// ─────────────────────────────────────────
//  OPEN IN BROWSER
// ─────────────────────────────────────────

async function openInBrowser(filepath) {
    const absolutePath = path.resolve(filepath);
    const fileUrl = `file://${absolutePath}`;

    printBoxed("OPENING IN BROWSER", ICONS.browser, COLORS.green, `Opening ${filepath} in your default browser...`);

    // macOS uses 'open', Linux uses 'xdg-open'
    const cmd = process.platform === "darwin" ? "open" : "xdg-open";
    return new Promise((res) => {
        exec(`${cmd} "${fileUrl}"`, (error) => {
            if (error) {
                console.log(`  ${COLORS.red}${ICONS.error} Could not auto-open browser: ${error.message}${COLORS.reset}`);
            }
            res();
        });
    });
}

// ─────────────────────────────────────────
//  SYSTEM PROMPT
// ─────────────────────────────────────────

const system_prompt = `You are an AI CLI agent. Follow: INPUT->THINK->TOOL->OBSERVE->OUTPUT.

TOOLS:
1. getTheWeatherOfCity(cityname) - weather data. Args: "Mumbai"
2. executeCommand(cmd) - shell command. Args: "mkdir -p project"
3. createFile(args) - create file. Args must be JSON: {"filepath":"f.html","content":"html code"}
4. readFile(filepath) - read file. Args: "index.html"

RULES:
- Respond with ONE JSON object per message: {"step":"START|THINK|TOOL|OUTPUT","content":"...","tool_name":"...","tool_args":"..."}
- Do 2+ THINK steps before first TOOL.
- After TOOL, STOP and wait for OBSERVE. Never fake OBSERVE.
- For websites: mkdir -> HTML -> CSS -> JS -> OUTPUT (one tool at a time).
- Write FULL production code. No placeholders. HTML 100+ lines, CSS 150+ lines.
- Use Google Fonts, modern CSS (flexbox/grid/transitions/hover/responsive).

SCALER CLONE SPEC:
Colors: bg #FFF, dark #10162A, accent #1A73E8, CTA #E94E1B, gradient text #2563EB->#06B6D4, text #1A1A2E/#6B7280
Font: Inter from Google Fonts
Layout: 1)Sticky nav(white,SCALER logo,PROGRAM/MASTERCLASS/AI LABS/ALUMNI/RESOURCES links,Login+PLACEMENT REPORT btns) 2)Hero(pill"THE MARKET HAS ALREADY CHANGED",heading"Become the Professional Built for the Next Decade in AI."gradient on Next/Decade/AI,subtitle,program pills,REQUEST A CALLBACK+BOOK FREE LIVE CLASS btns) 3)Why Scaler(#10162A bg,"Built Different Designed to Last",4 cards:AI-Integrated Curriculum/AI Powered Platform/Lifelong Learning Access/Strong Foundations) 4)Logo marquee(Microsoft/Amazon/OpenAI/Meta/Adobe/Google DeepMind) 5)Help bar
Effects: nav shadow on scroll, btn hover scale, card hover lift, logo scroll animation
EXAMPLE:
user: Create hello world
assistant: {"step":"START","content":"Creating hello world HTML."}
assistant: {"step":"THINK","content":"Need a proper HTML file."}
assistant: {"step":"THINK","content":"Will use createFile."}
assistant: {"step":"TOOL","tool_name":"createFile","tool_args":"{\\"filepath\\":\\"index.html\\",\\"content\\":\\"<!DOCTYPE html><html><head><title>Hello</title></head><body><h1>Hello World</h1></body></html>\\"}"}
OBSERVE: File created.
assistant: {"step":"OUTPUT","content":"Done! index.html created."}`;

// ─────────────────────────────────────────
//  MAIN AGENT LOOP
// ─────────────────────────────────────────

async function askUser(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function runAgent(userInstruction) {
    const messages = [
        { role: "system", content: system_prompt },
        { role: "user", content: userInstruction }
    ];

    // Show user message in chat style
    printBoxed("YOU", ICONS.user, COLORS.blue, userInstruction);

    let maxIterations = 50; // Safety limit
    let iteration = 0;

    while (iteration < maxIterations) {
        iteration++;
        try {
            const spinner = createSpinner("AI is thinking...");

            const response = await client.chat.completions.create({
                model: isGroq ? "llama-3.3-70b-versatile" : "gpt-4o-mini",
                messages: messages,
                response_format: { type: "json_object" },
                temperature: 0.7,
                max_tokens: isGroq ? 8000 : 16000,
            });

            spinner.stop("Response received");

            const content = response.choices[0].message.content;
            let parsedContent;

            try {
                // Strip markdown code fences if present
                let jsonString = content;
                const match = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                if (match) {
                    jsonString = match[1];
                }
                parsedContent = JSON.parse(jsonString);
            } catch (err) {
                printBoxed("ERROR", ICONS.error, COLORS.red, `Agent returned invalid JSON:\n${content.substring(0, 200)}`);
                break;
            }

            messages.push({
                role: "assistant",
                content: JSON.stringify(parsedContent)
            });

            // ── Handle each step type with pretty output ──

            if (parsedContent.step === "START") {
                printBoxed("STARTING", ICONS.start, COLORS.magenta, parsedContent.content);
            }
            else if (parsedContent.step === "THINK") {
                printBoxed("THINKING", ICONS.think, COLORS.yellow, parsedContent.content);
            }
            else if (parsedContent.step === "TOOL") {
                const toolName = parsedContent.tool_name;
                const toolArgs = parsedContent.tool_args;

                // Pretty tool display
                let toolIcon = ICONS.tool;
                if (toolName === "createFile") toolIcon = ICONS.file;
                if (toolName === "executeCommand") toolIcon = ICONS.folder;

                const shortArgs = toolArgs && toolArgs.length > 80
                    ? toolArgs.substring(0, 80) + "..."
                    : toolArgs;
                printBoxed(`TOOL: ${toolName}`, toolIcon, COLORS.cyan, `Args: ${shortArgs}`);

                if (!tool_map[toolName]) {
                    const errorMsg = `Tool "${toolName}" is not available.`;
                    printBoxed("OBSERVE (Error)", ICONS.error, COLORS.red, errorMsg);
                    messages.push({
                        role: "developer",
                        content: JSON.stringify({ step: "OBSERVE", content: errorMsg })
                    });
                } else {
                    // Execute tool with spinner
                    const toolSpinner = createSpinner(`Executing ${toolName}...`);
                    const data = await tool_map[toolName](toolArgs);
                    toolSpinner.stop(`${toolName} completed`);

                    // Show observe result (truncate if very long)
                    const displayData = data.length > 300
                        ? data.substring(0, 300) + `\n... (${data.length} chars total)`
                        : data;
                    printBoxed("OBSERVE", ICONS.observe, COLORS.magenta, displayData);

                    messages.push({
                        role: "developer",
                        content: JSON.stringify({ step: "OBSERVE", content: data })
                    });
                }
            }
            else if (parsedContent.step === "OUTPUT") {
                printBoxed("DONE", ICONS.output, COLORS.green, parsedContent.content);

                // Auto-open HTML files in browser
                const htmlFiles = createdFiles.filter(f => f.endsWith(".html"));
                if (htmlFiles.length > 0) {
                    // Find the main index.html, or the first HTML file
                    const mainFile = htmlFiles.find(f => f.includes("index.html")) || htmlFiles[0];
                    await openInBrowser(mainFile);
                }

                break;
            }
            else {
                // Handle unknown steps (STOP, WAIT, etc.) gracefully — just continue the loop
                // so the model can recover instead of crashing
                printBoxed("CONTINUING", ICONS.think, COLORS.yellow, `Agent sent step "${parsedContent.step}". Continuing...`);
                // Re-prompt the model to keep going
                messages.push({
                    role: "developer",
                    content: JSON.stringify({ step: "OBSERVE", content: "Continue with the next step. Do not use STOP — use THINK, TOOL, or OUTPUT only." })
                });
            }

        } catch (error) {
            printBoxed("FATAL ERROR", ICONS.error, COLORS.red, `Communication failed: ${error.message}`);
            break;
        }
    }

    if (iteration >= maxIterations) {
        printBoxed("TIMEOUT", ICONS.error, COLORS.red, "Agent exceeded maximum iterations (50). Stopping.");
    }
}

// ─────────────────────────────────────────
//  ENTRY POINT
// ─────────────────────────────────────────

async function main() {
    console.log();
    console.log(`  ${COLORS.bold}${COLORS.cyan}╔══════════════════════════════════════════╗${COLORS.reset}`);
    console.log(`  ${COLORS.bold}${COLORS.cyan}║                                          ║${COLORS.reset}`);
    console.log(`  ${COLORS.bold}${COLORS.cyan}║     ${COLORS.white}🤖 AI Agent CLI Tool${COLORS.cyan}                 ║${COLORS.reset}`);
    console.log(`  ${COLORS.bold}${COLORS.cyan}║     ${COLORS.dim}Assignment 02${COLORS.cyan}${COLORS.bold}                       ║${COLORS.reset}`);
    console.log(`  ${COLORS.bold}${COLORS.cyan}║                                          ║${COLORS.reset}`);
    console.log(`  ${COLORS.bold}${COLORS.cyan}╚══════════════════════════════════════════╝${COLORS.reset}`);
    console.log();

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "your-openai-api-key-here") {
        printBoxed("ERROR", ICONS.error, COLORS.red, "OPENAI_API_KEY is missing or invalid in .env file. Please create a .env file and add your API key.");
        process.exit(1);
    }

    const provider = isGroq ? "Groq (Llama 3.3 70B)" : "OpenAI (GPT-4o Mini)";
    console.log(`  ${COLORS.dim}Using: ${provider}${COLORS.reset}`);
    printSeparator();

    const startInstruction = await askUser(`\n  ${ICONS.user} ${COLORS.bold}How can I help you today?${COLORS.reset}\n  ${COLORS.dim}(e.g., "Clone the Scaler Academy website")${COLORS.reset}\n\n  ${COLORS.green}▶${COLORS.reset} `);

    if (startInstruction.trim()) {
        await runAgent(startInstruction);
    }

    console.log();
    console.log(`  ${COLORS.dim}Thanks for using AI Agent CLI! 👋${COLORS.reset}`);
    console.log();
    rl.close();
}

main();
