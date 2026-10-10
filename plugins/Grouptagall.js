/**
 * TEDDY-XMD Tag All Command
 * Based on the working tagging mechanism
 */

const { cmd } = require('../inconnuboy');
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

function isOwner(sender) {
    const senderNumber = cleanNumber(sender);

    if (!senderNumber) return false;

    const owners = [
        config.OWNER_NUMBER,
        config.OWNER_NUM,
        config.OWNER
    ];

    if (
        owners.some(
            owner =>
                owner &&
                cleanNumber(owner) === senderNumber
        )
    ) {
        return true;
    }

    if (Array.isArray(config.OWNER_NUMBERS)) {
        return config.OWNER_NUMBERS.some(
            owner =>
                cleanNumber(owner) === senderNumber
        );
    }

    if (typeof config.OWNER_NUMBERS === "string") {
        return config.OWNER_NUMBERS
            .split(",")
            .some(
                owner =>
                    cleanNumber(owner) === senderNumber
            );
    }

    return false;
}

cmd(
{
    pattern: "tagall",
    alias: [
        "mentionall",
        "everyone"
    ],
    react: "📢",
    desc: "Tag all group members",
    category: "group",
    filename: __filename
},

async (
    conn,
    mek,
    m,
    {
        from,
        args,
        reply,
        isGroup,
        sender,
        isCreator
    }
) => {

    try {

        // ==========================================
        // 👥 GROUP CHECK
        // ==========================================

        if (!isGroup) {
            return reply(
                "❌ *This command is for groups only.*"
            );
        }

        // ==========================================
        // 📋 FRESH GROUP METADATA
        // ==========================================

        const groupMetadata =
            await conn.groupMetadata(from);

        // ==========================================
        // 👤 CHECK SENDER ADMIN
        // ==========================================

        const senderParticipant =
            groupMetadata.participants.find(
                participant =>
                    normalizeJid(
                        participant.id
                    ) === normalizeJid(sender)
            );

        const directAdmin =
            isAdmin(senderParticipant);

        // ==========================================
        // 👑 OWNER / ADMIN
        // ==========================================

        const userIsAdmin =
            directAdmin ||
            isOwner(sender) ||
            isCreator === true;

        if (!userIsAdmin) {

            return reply(
`❌ *Admin / Owner only.*

Only group admins or the bot owner can use
the tagall command.`
            );
        }

        // ==========================================
        // 👥 USE WORKING TAGGING METHOD
        // ==========================================

        const participants =
            groupMetadata.participants
                .map(p => p.id)
                .filter(Boolean);

        if (!participants.length) {
            return reply(
                "❌ *No group members found.*"
            );
        }

        // ==========================================
        // 📝 MESSAGE
        // ==========================================

        const message =
            args?.join(" ") || "Everyone!";

        let text =
`📢 *GROUP ANNOUNCEMENT*

${message}

👥 *Tagged Members:*
`;

        participants.forEach(
            (participant, index) => {

                text +=
                    `${index + 1}. @${participant.split("@")[0]}\n`;
            }
        );

        // ==========================================
        // 📢 SEND MESSAGE
        // ==========================================

        await conn.sendMessage(
            from,
            {
                text,
                mentions: participants
            },
            {
                quoted: mek
            }
        );

        // ==========================================
        // 📢 REACTION
        // ==========================================

        try {
            await conn.sendMessage(
                from,
                {
                    react: {
                        text: "📢",
                        key: mek.key
                    }
                }
            );
        } catch (_) {}

    } catch (error) {

        console.error(
            "❌ TAGALL ERROR:",
            error
        );

        return reply(
            `❌ *Error:* ${error?.message || "Unknown error"}`
        );
    }
});