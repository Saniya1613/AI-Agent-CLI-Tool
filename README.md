# 🤖 AI Agent CLI Tool

> A conversational CLI agent built with Node.js that uses LLMs (Groq/OpenAI) to autonomously reason through tasks, execute commands, and build full websites — all from a simple text prompt.

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-Compatible-412991?logo=openai&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-Llama_3.3-F55036?logo=groq&logoColor=white)
![License](https://img.shields.io/badge/License-ISC-blue)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Demo](#demo)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Tools Available](#tools-available)
- [Project Structure](#project-structure)
- [Example Output](#example-output)
- [Troubleshooting](#troubleshooting)

---

## Overview

This project implements an **agentic AI system** that operates in a structured reasoning loop:

```
INPUT → THINK → TOOL → OBSERVE → OUTPUT
```

The agent takes natural language instructions from the user, breaks them down into smaller sub-tasks, reasons through each step, and executes actions using built-in tools — all while displaying progress in a beautiful, chatbox-style terminal UI.

When asked to build a website (e.g., "Clone the Scaler Academy website"), the agent autonomously:
1. Creates project directories
2. Generates production-quality HTML with semantic markup
3. Writes comprehensive CSS with modern techniques (flexbox, grid, animations)
4. Adds JavaScript for interactivity
5. **Automatically opens the result in your browser**

---

## Features

| Feature | Description |
|---------|-------------|
| 🧠 **Agentic Reasoning** | Multi-step THINK → TOOL → OBSERVE loop with structured JSON communication |
| 🎨 **Pretty CLI Output** | Chatbox-style display with emojis, box-drawing characters, and animated spinners |
| 🔧 **4 Built-in Tools** | File creation, file reading, command execution, and weather lookup |
| 🌐 **Auto Browser Open** | Automatically opens generated HTML files in your default browser |
| 🔄 **Groq + OpenAI Support** | Works with both Groq (free Llama 3.3 70B) and OpenAI (GPT-4o Mini) |
| 🛡️ **Error Recovery** | Handles malformed JSON, unknown steps, and API errors gracefully |
| 📱 **Responsive Output** | Generated websites include mobile-responsive CSS with media queries |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                    USER INPUT                    │
│          "Clone the Scaler Academy website"      │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│               AGENT LOOP (index.js)              │
│                                                  │
│  ┌──────┐    ┌───────┐    ┌──────┐    ┌───────┐ │
│  │START │ →  │ THINK │ →  │ TOOL │ →  │OBSERVE│ │
│  └──────┘    └───────┘    └──────┘    └───────┘ │
│       ↑                                    │     │
│       └────────────────────────────────────┘     │
│                       │                          │
│                  ┌────▼────┐                     │
│                  │ OUTPUT  │                     │
│                  └─────────┘                     │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│              TOOLS LAYER                         │
│                                                  │
│  📄 createFile    │  📁 executeCommand           │
│  📖 readFile      │  🌤️ getTheWeatherOfCity      │
└──────────────────────────────────────────────────┘
                       │
                       ▼
              🌐 Auto-opens in Browser
```

---

## Demo

```
  ╔══════════════════════════════════════════╗
  ║     🤖 AI Agent CLI Tool                 ║
  ║     Assignment 02                        ║
  ╚══════════════════════════════════════════╝

  Using: Groq (Llama 3.3 70B)
  ────────────────────────────────────────────

  👤  YOU
  │  Clone the Scaler Academy website
  ────────────────────────────────────────────

  🚀  STARTING
  │  Cloning the Scaler Academy website...
  ────────────────────────────────────────────

  💭  THINKING
  │  I need to create HTML, CSS, and JS files
  │  matching Scaler's design system...
  ────────────────────────────────────────────

  📄  TOOL: createFile
  │  Args: {"filepath":"scaler_clone/index.html"...}
  ────────────────────────────────────────────

  👁️   OBSERVE
  │  File scaler_clone/index.html created successfully.
  ────────────────────────────────────────────

  ✅  DONE
  │  Scaler Academy clone is ready!
  ────────────────────────────────────────────

  🌐  OPENING IN BROWSER
  │  Opening scaler_clone/index.html...
```

---

## Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **npm** (comes with Node.js)
- A **Groq API key** (free) or **OpenAI API key**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Saniya1613/AI-Agent-CLI-Tool.git
   cd AI-Agent-CLI-Tool
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up your API key:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your API key:
   ```env
   # For Groq (free — recommended):
   OPENAI_API_KEY=gsk_your_groq_api_key_here

   # OR for OpenAI:
   OPENAI_API_KEY=sk-your_openai_api_key_here
   ```

   > **Get a free Groq API key:** Visit [console.groq.com](https://console.groq.com) → API Keys → Create

4. **Run the agent:**
   ```bash
   node index.js
   ```

---

## Usage

After starting the agent, type any instruction:

| Prompt | What it does |
|--------|-------------|
| `Clone the Scaler Academy website` | Builds a pixel-perfect Scaler clone with HTML/CSS/JS |
| `Create a to-do app` | Generates a full to-do application |
| `What is the weather in Mumbai?` | Fetches live weather data |
| `Create a file called hello.txt with "Hi there"` | Creates a text file |
| `List all files in the current directory` | Runs `ls` command |

---

## Tools Available

### 1. `createFile(args)`
Creates a file with specified content. Automatically creates parent directories.
```
Args: {"filepath": "src/index.html", "content": "<h1>Hello</h1>"}
```

### 2. `readFile(filepath)`
Reads and returns the contents of any file.
```
Args: "config.json"
```

### 3. `executeCommand(cmd)`
Executes any shell command on the user's machine.
```
Args: "mkdir -p my_project/src"
```

### 4. `getTheWeatherOfCity(cityname)`
Fetches live weather data for any city using wttr.in.
```
Args: "Mumbai"
```

---

## Project Structure

```
AI-Agent-CLI-Tool/
├── index.js              # Main agent — CLI loop, tools, system prompt, pretty output
├── package.json          # Node.js project config & dependencies
├── .env                  # API key (not committed)
├── .env.example          # Template for .env setup
├── .gitignore            # Ignores node_modules/ and .env
├── scaler_clone/         # Generated Scaler Academy website clone
│   ├── index.html        #   Full HTML structure (165 lines)
│   ├── styles.css        #   Comprehensive CSS (500+ lines)
│   └── script.js         #   Interactive JS (scroll, animations)
└── README.md             # This file
```

---

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| **Groq as default provider** | Free tier, fast inference with Llama 3.3 70B |
| **Auto-detect API provider** | Keys starting with `gsk_` route to Groq, otherwise OpenAI |
| **JSON response format** | Enforced via `response_format: { type: "json_object" }` for reliable parsing |
| **Control character sanitization** | Groq/Llama models output literal newlines in JSON strings — sanitized before `JSON.parse()` |
| **Unknown step recovery** | Agent re-prompts model instead of crashing on unexpected step types |
| **Auto-open browser** | Tracks created `.html` files and opens them via `open` (macOS) / `xdg-open` (Linux) |

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `openai` | ^6.36.0 | OpenAI/Groq API client |
| `axios` | ^1.16.0 | HTTP requests (weather API) |
| `dotenv` | ^17.4.2 | Load environment variables from `.env` |
| `open` | ^11.0.0 | Cross-platform browser opener |

---

## Troubleshooting

| Error | Solution |
|-------|----------|
| `OPENAI_API_KEY is missing` | Create a `.env` file with your API key (see [Getting Started](#getting-started)) |
| `429 Rate limit reached` | Groq free tier has daily limits. Wait for reset or create a new account |
| `413 Request too large` | System prompt + conversation exceeded token limit. Restart with a fresh run |
| `Bad control character in JSON` | Already handled — the agent sanitizes Groq's malformed JSON automatically |
| Browser doesn't open | Run from a regular terminal (not embedded IDE terminals) |

---

## Commit History

| Commit | Description |
|--------|-------------|
| `75a53b5` | Initialize project and install dependencies |
| `2b6ef27` | Add .env.example for API key instructions |
| `b36d6df` | Implement conversational AI agent CLI with file creation tools |
| `f1cae77` | Set type to module to support ES imports |
| `08aafb4` | Add automatic support for Groq API keys |
| `ac844b8` | Make JSON parsing robust for Llama models |
| `ec2641c` | Upgrade system prompt with Scaler design reference and pretty CLI output |
| `a293119` | Update project dependencies |
| `3f8d2a1` | Add production-quality Scaler Academy website clone |
| `af6c3e4` | Handle Groq bad control characters and recover from unknown steps |

---

## License

ISC License — see [LICENSE](LICENSE) for details.

---

<p align="center">
  Built with ❤️ using Node.js, Groq, and Llama 3.3 70B
</p>
