const axios = require('axios');
const { cmd } = require('../inconnuboy');

cmd({
    pattern: "insult",
    alias: ["roast", "burn"],
    desc: "Generate a rhyming insult and tag the target",
    category: "fun",
    react: "🔥",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {

    try {

        // =====================================================
        // FIND CONTEXT INFO
        // =====================================================
        const contextInfo =
            m?.msg?.contextInfo ||
            mek?.msg?.contextInfo ||
            m?.message?.extendedTextMessage?.contextInfo ||
            mek?.message?.extendedTextMessage?.contextInfo ||
            {};

        // =====================================================
        // FIND REPLIED USER
        // =====================================================
        let target = null;

        // Method 1: quoted participant
        if (contextInfo.participant) {
            target = contextInfo.participant;
        }

        // Method 2: quoted message key participant
        if (
            !target &&
            contextInfo.quotedMessage
        ) {
            target =
                contextInfo.quotedMessage?.key?.participant ||
                contextInfo.quotedMessage?.participant;
        }

        // Method 3: wrapper quoted sender
        if (!target && m?.quoted?.sender) {
            target = m.quoted.sender;
        }

        if (!target && mek?.quoted?.sender) {
            target = mek.quoted.sender;
        }

        // =====================================================
        // FIND MANUAL @MENTION
        // =====================================================
        if (!target) {

            const mentioned =
                contextInfo.mentionedJid ||
                m?.mentionedJid ||
                mek?.mentionedJid ||
                m?.msg?.contextInfo?.mentionedJid ||
                mek?.msg?.contextInfo?.mentionedJid;

            if (
                Array.isArray(mentioned) &&
                mentioned.length > 0
            ) {
                target = mentioned[0];
            }
        }

        // =====================================================
        // NORMALIZE TARGET
        // =====================================================
        if (target) {

            // Remove device suffix such as :12
            if (target.includes(':')) {
                target =
                    target.split(':')[0] +
                    '@s.whatsapp.net';
            }

            // Convert LID if your handler exposes it
            if (
                target.endsWith('@lid') &&
                contextInfo.participant
            ) {
                target = contextInfo.participant;
            }
        }

        // =====================================================
        // NO TARGET
        // =====================================================
        if (!target) {

            return reply(
                "⚠️ *Reply to someone's message or tag someone to insult them.* 😈"
            );
        }

        // =====================================================
        // TYPING
        // =====================================================
        try {
            await conn.sendPresenceUpdate(
                "composing",
                from
            );
        } catch (e) {}

        // =====================================================
        // GET INSULT
        // =====================================================
        let baseInsult;

        try {

            const response = await axios.get(
                "https://evilinsult.com/generate_insult.php?lang=en&type=json",
                {
                    timeout: 10000
                }
            );

            baseInsult =
                response.data?.insult ||
                "Your brain went offline before the conversation started. 💀";

        } catch (apiError) {

            console.error(
                "INSULT API ERROR:",
                apiError.message
            );

            baseInsult =
                "Your brain went offline before the conversation started. 💀";
        }

        // =====================================================
        // RHYMING LINES
        // =====================================================
        const rhymes = [

            `You talk too much, dusty kid,
Bow down now to *TEDDY-XMD*! 🎤🔥`,

            `Brain on sleep, thoughts forbid,
Another roast delivered by *TEDDY-XMD*! ⚡`,

            `You stepped wrong, your fate is sealed,
Roasted clean by *TEDDY-XMD*! 💀`,

            `Trying to flex? Don't kid,
You just got humbled by *TEDDY-XMD*! 👑`,

            `Weak response, childish bid,
You just got roasted by *TEDDY-XMD*! 😈`,

            `You came to fight but never did,
Now you're cooked by *TEDDY-XMD*! 🔥`

        ];

        const randomRhyme =
            rhymes[
                Math.floor(
                    Math.random() * rhymes.length
                )
            ];

        // =====================================================
        // USERNAME
        // =====================================================
        const username =
            target
                .replace('@s.whatsapp.net', '')
                .replace('@lid', '')
                .split(':')[0];

        // =====================================================
        // FINAL MESSAGE
        // =====================================================
        const finalRoast = `💥 *TEDDY-XMD INSULT MODE* 💥

👤 @${username}

> ${baseInsult}

${randomRhyme}`;

        // =====================================================
        // SEND WITH REAL MENTION
        // =====================================================
        await conn.sendMessage(
            from,
            {
                text: finalRoast,
                mentions: [target]
            },
            {
                quoted: mek
            }
        );

        // =====================================================
        // STOP TYPING
        // =====================================================
        try {
            await conn.sendPresenceUpdate(
                "paused",
                from
            );
        } catch (e) {}

    } catch (error) {

        console.error(
            "INSULT PLUGIN ERROR:",
            error
        );

        try {
            await conn.sendPresenceUpdate(
                "paused",
                from
            );
        } catch (e) {}

        return reply(
            "❌ *Insult command failed. Please try again.*"
        );
    }
});
