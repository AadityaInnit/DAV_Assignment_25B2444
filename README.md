[README.md](https://github.com/user-attachments/files/27474238/README.md)
# IIT Bombay AI Student Performance Advisor

A web application that predicts a student's Cumulative Grade based on their daily habits and lifestyle inputs, then generates a personalised recommendation using an AI language model. Built with React and powered by a Linear Regression model trained on the IIT Bombay UG Student Dataset (1,000 students).

---

## What This App Does

You fill in a form with details about your study habits, sleep, internet usage, attendance, and a few other lifestyle factors. The app instantly predicts your Cumulative Grade on a scale of 4.5 to 10.0 and displays it on a visual gauge. It then calls an AI model (Claude by Anthropic) to generate a 2–3 sentence personalised recommendation that compares your inputs to campus averages and tells you exactly what to change.

---

## What You Need Before Starting

You need three things on your computer before you can run this app:

1. **A Mac** (these instructions are written for macOS)
2. **Node.js** — the software that runs JavaScript outside of a browser (free to download)
3. **An Anthropic API key** — so the app can call the AI model (requires a free account at console.anthropic.com)

You do not need to know how to code. Every command you need to type is written out exactly as it should be entered.

---

## Part 1 — Install Node.js

Node.js is a program that allows your computer to run JavaScript code. Without it, none of the following steps will work.

**Step 1.** Open your browser and go to:
```
https://nodejs.org
```

**Step 2.** You will see two download buttons. Click the one labelled **LTS** (this stands for Long Term Support and is the stable, recommended version).

**Step 3.** A file ending in `.pkg` will download to your Downloads folder. Open it by double-clicking it.

**Step 4.** A setup wizard will open. Click **Continue**, then **Continue** again, then **Install**. Your Mac may ask for your password — enter it and click **Install Software**.

**Step 5.** Once the installer finishes, click **Close**.

**Step 6.** Now you need to verify the installation worked. Open the **Terminal** application on your Mac. To find it, press `Command + Space` on your keyboard to open Spotlight Search, type `Terminal`, and press Enter. A black or white window with a blinking cursor will open.

**Step 7.** In the Terminal window, type the following and press Enter:
```
node --version
```

If Node.js installed correctly, the Terminal will print a version number that looks something like `v20.11.0`. If you see a number, you are ready to move on. If you see an error message, close the Terminal window completely, reopen it, and try again.

---

## Part 2 — Download This Repository

**Step 1.** On this GitHub page, click the green **Code** button near the top right.

**Step 2.** In the dropdown that appears, click **Download ZIP**.

**Step 3.** A file called something like `student-advisor-main.zip` will download to your Downloads folder. Double-click it to unzip it. This creates a folder.

**Step 4.** Move that folder somewhere easy to find, such as your Desktop or your Documents folder. You can rename it to `student-advisor` if you like.

---

## Part 3 — Set Up the Project

This repository contains only the `src` folder, which holds the application's source code. Before you can run it, you need to create the surrounding project structure that React requires. This takes about two minutes and involves typing a few commands into the Terminal.

**Step 1.** Open the Terminal if it is not already open (`Command + Space`, type `Terminal`, press Enter).

**Step 2.** Create a new React project by typing the following command exactly as written and pressing Enter:
```
npm create vite@latest student-advisor -- --template react
```

The Terminal may ask: `Ok to proceed? (y)` — type `y` and press Enter.

You will see a few lines of output ending in something like `Done. Now run:`. This means a new folder called `student-advisor` has been created on your computer. By default it is created in your **Home folder** (the one with your username).

**Step 3.** Move into that folder by typing:
```
cd student-advisor
```

`cd` stands for "change directory" — it moves your Terminal session into the folder you specify. Your Terminal prompt will now show `student-advisor` to indicate you are inside it.

**Step 4.** Install all the libraries the project depends on by typing:
```
npm install
```

This will take 20–60 seconds. You will see a progress indicator. When it finishes, your Terminal prompt will return and show no errors.

---

## Part 4 — Add the Source Code

The project Vite created contains placeholder files that need to be replaced with the actual application code from this repository.

**Step 1.** Open the `student-advisor` folder in Finder. The easiest way to do this is to type the following in the Terminal while you are inside the folder:
```
open .
```

A Finder window will open showing the contents of `student-advisor`. You will see several files and a folder called `src`.

**Step 2.** Open the `src` folder in Finder by double-clicking it. You will see files inside it, including one called `App.jsx`.

**Step 3.** Delete the existing `App.jsx` file by clicking it once to select it, then pressing `Command + Delete`.

**Step 4.** Now go to the folder you downloaded from this repository (from Part 2). Open its `src` folder. You will find a file called `App.jsx` (or `StudentAdvisor.jsx` — if it is named `StudentAdvisor.jsx`, rename it to `App.jsx` by clicking it once, pressing Enter, typing `App.jsx`, and pressing Enter again).

**Step 5.** Copy that `App.jsx` file and paste it into the `src` folder of your `student-advisor` project (the one created by Vite in Part 3). You can do this by dragging the file from one Finder window to the other.

**Step 6.** Now you need to edit the `main.jsx` file that Vite created. In the `src` folder of your project, find `main.jsx` and open it with a text editor. The simplest way is to right-click the file, hover over **Open With**, and choose **TextEdit**. If TextEdit opens it in formatted mode, go to the TextEdit menu bar, click **Format**, and choose **Make Plain Text**.

**Step 7.** Select all the existing text in `main.jsx` (`Command + A`) and delete it. Then type or paste the following exactly:

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

**Step 8.** Save the file by pressing `Command + S` and close TextEdit.

---

## Part 5 — Get Your Anthropic API Key

The app needs an API key to call the AI model that generates recommendations. You get this for free from Anthropic.

**Step 1.** Open your browser and go to:
```
https://console.anthropic.com
```

**Step 2.** Click **Sign Up** if you do not have an account, or **Log In** if you do. Follow the prompts to create your account.

**Step 3.** Once logged in, look for a section called **API Keys** in the left-hand sidebar. Click it.

**Step 4.** Click **Create Key**. Give it any name you like (for example, `student-advisor`). Click **Create Key** again.

**Step 5.** A key will appear on screen. It will look something like `sk-ant-api03-xxxxxxxxxxxxxxxx`. **Copy it immediately** — Anthropic will only show it to you once. If you close the page without copying it, you will need to create a new one.

---

## Part 6 — Add the API Key to the Project

The API key must never be typed directly into your code — it should be stored in a separate file that the project reads at startup. This file is called `.env`.

**Step 1.** Go back to your Terminal window. Make sure you are inside the `student-advisor` folder (your prompt should show `student-advisor`). If you closed the Terminal, reopen it and type:
```
cd student-advisor
```

**Step 2.** Create the `.env` file by typing:
```
touch .env
```

This creates an empty file. Nothing visible will happen in the Terminal — that is normal.

**Step 3.** Open the file in TextEdit by typing:
```
open -a TextEdit .env
```

**Step 4.** If TextEdit opens in formatted mode, go to **Format → Make Plain Text**.

**Step 5.** Type the following into the file, replacing `YOUR_KEY_HERE` with the API key you copied in Part 5:
```
VITE_ANTHROPIC_API_KEY=YOUR_KEY_HERE
```

For example, it should look like:
```
VITE_ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxx
```

There should be no spaces around the `=` sign and no quotation marks around the key.

**Step 6.** Save the file (`Command + S`) and close TextEdit.

**Step 7.** Now open `src/App.jsx` in TextEdit (right-click → Open With → TextEdit → Make Plain Text if needed). Use `Command + F` to open the Find bar and search for the word `headers`. You are looking for a block of code that looks like this:

```
headers: {
  "Content-Type": "application/json",
},
```

**Step 8.** Replace that entire `headers` block with the following:

```
headers: {
  "Content-Type": "application/json",
  "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
  "anthropic-version": "2023-06-01",
  "anthropic-dangerous-direct-browser-access": "true",
},
```

**Step 9.** Save the file (`Command + S`) and close TextEdit.

> **A note on security:** Storing an API key in a `.env` file and calling the Anthropic API directly from the browser is appropriate for local development and coursework. In a publicly deployed application, the key should be kept on a backend server so it is never exposed to users. For running locally on your own machine, this setup is completely fine.

---

## Part 7 — Run the App

You are now ready to start the application.

**Step 1.** Go to your Terminal window. Make sure you are inside the `student-advisor` folder.

**Step 2.** Type the following and press Enter:
```
npm run dev
```

**Step 3.** After a few seconds you will see output that looks like:

```
  VITE v5.x.x  ready in 300ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

**Step 4.** Open your browser and go to:
```
http://localhost:5173
```

The Student Performance Advisor will load. You can now fill in the form, click **Predict my grade & get advice**, and see the results.

---

## How to Stop the App

When you are done using the app, go back to the Terminal window and press `Control + C` on your keyboard. The server will stop and the app will no longer be accessible at `localhost:5173`.

---

## How to Run It Again Next Time

Every time you want to use the app after the initial setup, you only need to do two things:

**Step 1.** Open Terminal and navigate to the project folder:
```
cd student-advisor
```

If the folder is not in your Home directory, you will need to navigate to wherever you put it. For example, if it is on your Desktop:
```
cd Desktop/student-advisor
```

**Step 2.** Start the app:
```
npm run dev
```

Then open `http://localhost:5173` in your browser as before.

---

## Troubleshooting

**"zsh: command not found: npm"**
Node.js is not installed, or the Terminal needs to be restarted after installation. Close the Terminal window completely, reopen it, and try again. If the problem persists, repeat Part 1.

**"cd: no such file or directory: student-advisor"**
The `student-advisor` folder does not exist in the location your Terminal is currently looking. Type `ls` and press Enter to see a list of folders in your current location. If you do not see `student-advisor`, navigate to the correct location using `cd` — for example, `cd Desktop` if the folder is on your Desktop.

**The app loads but the recommendation never appears**
This usually means the API key is not set up correctly. Check that your `.env` file is in the `student-advisor` folder (not inside `src`), that there are no spaces around the `=` sign, and that the key itself was copied completely. Also confirm that the `headers` block in `App.jsx` was updated as described in Part 6, Steps 7–9.

**"Failed to fetch" error in the browser**
This means the Anthropic API call failed. The most common causes are an incorrect API key, no internet connection, or insufficient credits on your Anthropic account. Log into `console.anthropic.com` to check your account status.

**The page is blank or shows a JavaScript error**
Open the browser's developer tools by pressing `Command + Option + J` in Chrome or `Command + Option + I` in Safari (enable developer tools in Safari's preferences first). Look at the Console tab for a red error message and check that all the steps in Part 4 were completed correctly, particularly that `main.jsx` contains exactly the code shown in Part 4 Step 7.

---

## Project Structure

Once set up, your `student-advisor` folder will look like this:

```
student-advisor/
├── src/
│   ├── App.jsx          ← the entire application (from this repository)
│   └── main.jsx         ← the entry point you edited in Part 4
├── .env                 ← your API key (never share or upload this file)
├── index.html           ← the HTML shell (created by Vite, do not edit)
├── package.json         ← project configuration (created by Vite)
├── vite.config.js       ← build tool configuration (created by Vite)
└── node_modules/        ← installed libraries (created by npm install)
```

The only files you directly touched are `src/App.jsx`, `src/main.jsx`, and `.env`. Everything else was generated automatically.

---

## Important: What Not to Share

- Never upload your `.env` file to GitHub or share it with anyone. It contains your private API key.
- If you fork or clone this repository and push it to GitHub, make sure `.env` is listed in your `.gitignore` file (Vite creates this automatically — it is already there).
