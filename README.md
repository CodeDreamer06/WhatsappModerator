# WhatsApp Group Moderator Bot

This bot uses `whatsapp-web.js` and the Google Gemini API to automatically moderate messages in specified WhatsApp groups based on defined rules (e.g., slurs, informality). It's designed to run during specified "waking hours".

## Features

- Monitors group messages.
- Uses Gemini API for content moderation.
- Deletes messages violating rules (slurs, excessive informality, spam, etc.).
- Operates only during configured waking hours.
- Uses local authentication to persist sessions.
- Configurable for deployment on platforms like Render.com.

## Prerequisites

- Node.js (v18 or later recommended)
- npm
- A Google Gemini API Key (obtainable from [Google AI Studio](https://aistudio.google.com/app/apikey))
- A separate WhatsApp account for the bot (using your primary account is not recommended and may lead to bans).

## Setup

1.  **Clone the repository (or download the files):**
    ```bash
    git clone <repository_url>
    cd whatsapp-moderator
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    - Create a `.env` file in the project root.
    - Add your Gemini API key:
      ```dotenv
      GEMINI_API_KEY=YOUR_ACTUAL_GEMINI_API_KEY
      ```
    - **Important:** Replace `YOUR_ACTUAL_GEMINI_API_KEY` with your real key.

4.  **Configure Waking Hours and Timezone:**
    - Open `index.js`.
    - Modify the `WAKE_HOUR_START`, `WAKE_HOUR_END`, and `TIMEZONE_OFFSET` constants to match your desired operating times and local timezone relative to UTC.
      - `WAKE_HOUR_START`: The hour (0-23) when moderation should start (inclusive).
      - `WAKE_HOUR_END`: The hour (0-23) when moderation should end (exclusive).
      - `TIMEZONE_OFFSET`: Your timezone's offset from UTC (e.g., `-5` for EST, `+1` for CET, `+5.5` for IST).

5.  **(Optional) Refine Moderation Rules:**
    - Open `moderation.js`.
    - Adjust the `MODERATION_PROMPT` variable to fine-tune the rules Gemini should enforce. Be specific about what constitutes an "informal" message or other violations.

## Running the Bot

1.  **Start the bot:**
    ```bash
    node index.js
    ```

2.  **Scan QR Code:**
    - On the first run, a QR code will appear in your terminal.
    - Open WhatsApp on the phone dedicated to the bot, go to `Settings` > `Linked Devices` > `Link a Device`, and scan the QR code.

3.  **Keep Running:** The bot needs to stay running to monitor messages. The terminal will show logs.

## Deployment (e.g., Render.com Free Tier)

1.  **Push to GitHub/GitLab:** Ensure your code (excluding `.env` and `node_modules`) is in a Git repository.
2.  **Create a New Web Service on Render:**
    - Connect your Git repository.
    - **Build Command:** `npm install`
    - **Start Command:** `node index.js`
    - **Environment:** Choose `Node`.
    - **Environment Variables:** Add `GEMINI_API_KEY` with your key value under the "Environment" section in Render's dashboard (do NOT commit your `.env` file).
    - **Free Tier:** Select the free instance type. Note that free instances spin down after inactivity and may take time to restart when a new request comes in (though for a persistent WhatsApp connection, it might stay active longer). Render might automatically handle restarts if the process crashes.

## Important Considerations

- **WhatsApp TOS:** Using automated systems like this is against WhatsApp's Terms of Service. Your bot's number could be banned. Use a dedicated, non-primary number.
- **Rate Limits:** Be mindful of potential rate limits on the Gemini API (especially the free tier). Add delays or error handling if needed.
- **Accuracy:** AI moderation isn't perfect. Review the `MODERATION_PROMPT` and potentially the bot's actions periodically.
- **Resource Usage:** `whatsapp-web.js` runs a headless Chrome instance, which can be resource-intensive. Monitor usage, especially on free tiers. The flags in `index.js` attempt to minimize this.
- **Session Persistence:** `LocalAuth` saves session data locally (`.wwebjs_auth/` folder). Ensure this folder is writable and persists across deployments if needed (Render's free tier has ephemeral storage, meaning this might be lost on restarts/redeploys, requiring QR scanning again). Consider Render's persistent disks if this becomes an issue. 