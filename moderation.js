const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

// --- Configuration ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    console.error("Error: GEMINI_API_KEY not found in .env file.");
    console.error("Please create a .env file in the root directory and add your Gemini API key.");
    console.error("Example: GEMINI_API_KEY=YOUR_ACTUAL_API_KEY");
    process.exit(1);
}

// --- IMPORTANT: Customize this prompt! ---
const MODERATION_PROMPT = `
Analyze the following WhatsApp message. Decide if it violates the group rules.
Rules:
1. No slurs or hate speech.
2. No excessive informality (e.g., excessive slang, abbreviations understandable only to a small group, very poor grammar/spelling).
3. No spam or irrelevant links.
4. Keep the conversation respectful.

Message:
"""
{MESSAGE_CONTENT}
"""

Based ONLY on the rules and the message content, answer with ONE word: 'DELETE' if it violates the rules, or 'KEEP' if it does not.
`;
// ------

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"}); // Use flash for speed and cost

async function shouldDeleteMessage(messageContent) {
    if (!messageContent || typeof messageContent !== 'string') {
        console.warn("Moderation check skipped: Invalid message content.");
        return false;
    }

    const prompt = MODERATION_PROMPT.replace("{MESSAGE_CONTENT}", messageContent);

    try {
        console.log(`Checking message: "${messageContent.substring(0, 50)}..."`);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const decision = response.text().trim().toUpperCase();

        console.log(`Gemini response: ${decision}`);

        if (decision === 'DELETE') {
            return true;
        } else if (decision === 'KEEP') {
            return false;
        } else {
            // Fallback or log unexpected response
            console.warn(`Unexpected Gemini response: "${decision}". Defaulting to KEEP.`);
            return false;
        }
    } catch (error) {
        console.error("Error contacting Gemini API:", error);
        // Decide how to handle API errors - fail safe (keep) or fail strict (delete)?
        // For now, let's fail safe.
        console.warn("Moderation check failed due to API error. Defaulting to KEEP.");
        return false;
    }
}

module.exports = { shouldDeleteMessage }; 