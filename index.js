const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { shouldDeleteMessage } = require('./moderation');

// --- Configuration ---
// Define your waking hours (24-hour format) and timezone offset from UTC.
// Example: 8 AM to 10 PM (22:00) in EST (UTC-5)
const WAKE_HOUR_START = 8; // 8 AM IST
const WAKE_HOUR_END = 22; // 10 PM IST (Exclusive, so up to 9:59 PM)
const TIMEZONE_OFFSET = 5.5; // IST (UTC+5.5)
// Important: Ensure these match your Render server timezone or adjust accordingly.
// Render servers typically run on UTC (offset 0).
// You might need to adjust WAKE_HOUR_START/END based on UTC if the server is UTC.
// E.g., 8 AM EST (UTC-5) is 13:00 UTC.
// E.g., 10 PM EST (UTC-5) is 3:00 UTC the *next* day.
// Consider using a library like Moment Timezone for complex timezone handling if needed.

// Function to check if current time is within waking hours in the specified timezone
function isWakingHours() {
    const now = new Date();
    const currentUTCHour = now.getUTCHours();
    // Adjust current hour by the timezone offset to get the *local* hour
    // The modulo operator (%) handles wrapping around days correctly.
    const currentLocalHour = (currentUTCHour + TIMEZONE_OFFSET + 24) % 24;

    const isAfterStart = currentLocalHour >= WAKE_HOUR_START;
    const isBeforeEnd = currentLocalHour < WAKE_HOUR_END;

    // Handle overnight waking periods (e.g., 10 PM to 6 AM)
    if (WAKE_HOUR_START > WAKE_HOUR_END) {
        return isAfterStart || isBeforeEnd; // Active if after start OR before end
    } else {
        return isAfterStart && isBeforeEnd; // Active if between start and end
    }
}

console.log("Initializing WhatsApp client...");

// Use LocalAuth strategy to save session
// Puppeteer options for resource saving (useful for free tiers)
const client = new Client({
    authStrategy: new LocalAuth(), // Saves session locally in .wwebjs_auth folder
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', // <- Doesn't work on Windows
            '--disable-gpu'
        ],
    }
});

client.on('qr', (qr) => {
    console.log('QR Code Received, Scan it please:');
    qrcode.generate(qr, { small: true });
});

client.on('authenticated', (session) => {
    console.log('Authentication successful!');
    // You can save the session object here if needed
    // console.log(JSON.stringify(session));
});

client.on('auth_failure', msg => {
    console.error('Authentication failure:', msg);
    process.exit(1); // Exit if authentication fails
});

client.on('ready', () => {
    console.log('Client is ready!');
    const now = new Date();
    const localTime = new Date(now.getTime() + TIMEZONE_OFFSET * 3600 * 1000);
    console.log(`Current UTC time: ${now.toUTCString()}`);
    console.log(`Configured Timezone Offset: ${TIMEZONE_OFFSET}`);
    console.log(`Calculated Local Time for Check: ${localTime.getHours()}:${localTime.getMinutes()}`);
    console.log(`Waking hours: ${WAKE_HOUR_START}:00 to ${WAKE_HOUR_END}:00 (Exclusive)`);
    console.log(`Moderation active: ${isWakingHours()}`);
});

client.on('message', async msg => {
    try {
        const chat = await msg.getChat();

        // Only process messages from groups and during waking hours
        if (chat.isGroup && msg.body && typeof msg.body === 'string') {
            const contact = await msg.getContact();
            const senderName = contact.pushname || contact.name || msg.author || msg._data.notifyName || 'UnknownSender';

            console.log(`------------------------------------`);
            console.log(`Message received:`);
            console.log(`  Group: ${chat.name}`);
            console.log(`  Sender: ${senderName} (${msg.from})`); // Log sender identifier
            console.log(`  Timestamp: ${new Date(msg.timestamp * 1000).toLocaleString()}`);
            console.log(`  Content: "${msg.body.substring(0, 100)}${msg.body.length > 100 ? '...' : ''}"`);

            if (!isWakingHours()) {
                console.log("Outside waking hours. Skipping moderation.");
                return;
            }

            console.log("Within waking hours. Proceeding with moderation check...");

            // Don't moderate messages from the bot itself
            if (msg.fromMe) {
                console.log("Skipping own message.");
                return;
            }

            // Check if the message should be deleted using the moderation module
            const deleteReason = await shouldDeleteMessage(msg.body);

            if (deleteReason) {
                console.log(`Attempting to delete message from ${senderName} in ${chat.name}. Reason: Violation detected.`);
                try {
                    await msg.delete(true); // true = delete for everyone
                    console.log(`Successfully deleted message from ${senderName}.`);
                    // Optional: Send a notification to the group or admin about the deletion
                    // await client.sendMessage(chat.id._serialized, `Deleted message from ${senderName} due to rule violation.`);
                } catch (deleteError) {
                    console.error(`Failed to delete message from ${senderName}:`, deleteError);
                }
            } else {
                console.log(`Message from ${senderName} passed moderation.`);
            }
        }
    } catch (error) {
        console.error("Error processing message:", error);
    }
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out.', reason);
    // Optional: Implement logic to attempt reconnection or exit
    process.exit(1); // Exit if disconnected
});

client.on('error', (error) => {
    console.error('Client error:', error);
});

client.initialize().catch(err => {
    console.error("Failed to initialize WhatsApp client:", err);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log("\nCaught interrupt signal. Shutting down gracefully...");
    try {
        await client.destroy();
        console.log("Client destroyed.");
    } catch (err) {
        console.error("Error destroying client:", err);
    } finally {
        process.exit(0);
    }
}); 