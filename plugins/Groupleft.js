const { cmd } = require('../inconnuboy');
const { sleep } = require('../lib/functions');
const config = require('../config');

function normalizeJid(jid) {
    if (!jid) return "";

    return String(jid)
        .split(":")[0]
        .split("/")[0]
        .toLowerCase();
}

function isAdmin(participant) {
    return (
        participant &&
        (
            participant.admin === "admin" ||
            participant.admin === "superadmin"
        )
    );
}

function cleanNumber(value) {
    return String(value || "")
        .replace(/[^0-9]/g, "");
}

// ==========================================
// 👑 OWNER CHECK
// ==========================================

function isOwner(sender) {

    const senderNumber =
        cleanNumber(sender);

    if (!senderNumber) {
        return false;
    }

    const ownerNumbers = [];

    // Single owner
    const ownerNumber =
        config.OWNER_NUMBER ||
        config.OWNER_NUM ||
        config.OWNER;

    if (ownerNumber) {
        ownerNumbers.push(
            ownerNumber
        );
    }

    // Multiple owners
    if (Array.isArray(config.OWNER_NUMBERS)) {
        ownerNumbers.push(
            ...config.OWNER_NUMBERS
        );
    }

    return ownerNumbers.some(number => {

        const owner =
            cleanNumber(number);

        return (
            owner &&
            owner === senderNumber
        );
    });
}

cmd({
    pattern: "left",
    alias: ["leave", "exit", "bye"],
    react: "🚪",
    desc: "Make the bot leave the group",
    category: "group",
    use: ".left",
    filename: __filename
},

async (
    conn,
    mek,
    m,
    {
        from,
        isGroup,
        sender,
        reply
    }
) => {

    try {

        // ==========================================
        // 👥 GROUP CHECK
        // ==========================================

        if (!isGroup) {
            return reply(
                "❌ *This command can only be used in groups.* 👥"
            );
        }

        // ==========================================
        // 📋 GET FRESH GROUP METADATA
        // ==========================================

        const metadata =
            await conn.groupMetadata(from);

        if (
            !metadata ||
            !Array.isArray(metadata.participants)
        ) {
            return reply(
                "❌ Unable to get group information."
            );
        }

        const participants =
            metadata.participants;

        // ==========================================
        // 👤 FIND SENDER
        // ==========================================

        const senderJid =
            normalizeJid(sender);

        const senderParticipant =
            participants.find(
                participant =>
                    normalizeJid(
                        participant.id ||
                        participant.jid
                    ) === senderJid
            );

        // ==========================================
        // 👮 REAL ADMIN CHECK
        // ==========================================

        const userIsAdmin =
            isAdmin(senderParticipant);

        // ==========================================
        // 👑 REAL OWNER CHECK
        // ==========================================

        const userIsOwner =
            isOwner(sender);

        // ==========================================
        // 👑 OWNER / 👮 ADMIN CHECK
        // ==========================================

        if (
            !userIsOwner &&
            !userIsAdmin
        ) {

            return reply(
                "⚠️ *Access Denied*\n\n" +
                "👑 Only the *Bot Owner* or\n" +
                "👮 *Group Admin* can use this command."
            );
        }

        // ==========================================
        // ⏳ PROCESSING
        // ==========================================

        await conn.sendMessage(
            from,
            {
                react: {
                    text: "⏳",
                    key: mek.key
                }
            }
        );

        // ==========================================
        // 🚪 LEAVING MESSAGE
        // ==========================================

        await conn.sendMessage(
            from,
            {
                text:
`╭━━〔 🚪 *TEDDY-XMD* 〕━━╮
┃
┃ 👋 *Goodbye everyone!*
┃
┃ 👑 Requested by:
┃ @${sender.split("@")[0]}
┃
┃ 🚪 Leaving this group...
┃
╰━━━━━━━━━━━━━━━━━━╯`,
                mentions: [sender]
            },
            {
                quoted: mek
            }
        );

        // ==========================================
        // ⏱️ WAIT
        // ==========================================

        await sleep(1500);

        // ==========================================
        // 🚪 LEAVE GROUP
        // ==========================================

        await conn.groupLeave(from);

    } catch (error) {

        console.error(
            "❌ LEAVE ERROR:",
            error
        );

        // ==========================================
        // ❌ ERROR REACTION
        // ==========================================

        try {

            await conn.sendMessage(
                from,
                {
                    react: {
                        text: "❌",
                        key: mek.key
                    }
                }
            );

        } catch (_) {}

        return reply(
            `❌ *Failed to leave the group.*\n\n` +
            `⚠️ ${error?.message || error}`
        );
    }
});