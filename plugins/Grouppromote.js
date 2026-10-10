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
    const senderNumber =
        cleanNumber(sender);

    if (!senderNumber) {
        return false;
    }

    const ownerNumbers = [];

    const configuredOwner =
        config.OWNER_NUMBER ||
        config.OWNER_NUM ||
        config.OWNER;

    if (configuredOwner) {
        ownerNumbers.push(configuredOwner);
    }

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
    pattern: "promote",
    alias: ["addadmin", "padmin", "makeadmin"],
    react: "⬆️",
    desc: "Promote a member to admin",
    category: "group",
    filename: __filename
},

async (
    conn,
    mek,
    m,
    {
        from,
        isGroup,
        reply,
        quoted,
        mentionedJid,
        sender
    }
) => {

    const readmore =
        "\u200e".repeat(4001);

    const botName =
        config.BOT_NAME || "TEDDY-XMD";

    const time =
        new Date().toLocaleTimeString(
            "en-KE",
            {
                timeZone: "Africa/Nairobi"
            }
        );

    try {

        // ==========================================
        // 👥 GROUP CHECK
        // ==========================================

        if (!isGroup) {
            return reply(
                "❌ *This command is for groups only.* 👥"
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
        // 👑 DIRECT ADMIN CHECK
        // ==========================================

        const userIsAdmin =
            isAdmin(senderParticipant);

        // ==========================================
        // 👑 DIRECT OWNER CHECK
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
`┏━━❐✧ *${botName} PROMOTE* ✧❐
┃
┃ ✦ *Status:* Failed ❌
┃ ✦ *Reason:* Admin / Owner Only 👑
┃ ✦ *By:* @${sender.split("@")[0]}
┃ ✦ *Time:* ${time}
┃
┗❐${readmore}
_⚡ Powered by ${botName}_`,
                {
                    mentions: [sender]
                }
            );
        }

        // ==========================================
        // 🤖 FIND BOT
        // ==========================================

        const botJid =
            normalizeJid(
                conn.user?.id
            );

        const botParticipant =
            participants.find(
                participant =>
                    normalizeJid(
                        participant.id ||
                        participant.jid
                    ) === botJid
            );

        // ==========================================
        // 🤖 DIRECT BOT ADMIN CHECK
        // ==========================================

        const botIsAdmin =
            isAdmin(botParticipant);

        if (!botIsAdmin) {

            return reply(
`┏━━❐✧ *${botName} PROMOTE* ✧❐
┃
┃ ✦ *Status:* Failed ❌
┃ ✦ *Reason:* Bot needs admin rights 🤖
┃ ✦ *By:* @${sender.split("@")[0]}
┃ ✦ *Time:* ${time}
┃
┗❐${readmore}
_⚡ Powered by ${botName}_`,
                {
                    mentions: [sender]
                }
            );
        }

        // ==========================================
        // 🎯 TARGET USER
        // ==========================================

        const requestedUser =
            mentionedJid?.[0] ||
            quoted?.sender;

        if (!requestedUser) {

            return reply(
`┏━━❐✧ *${botName} PROMOTE* ✧❐
┃
┃ ✦ *Usage:* .promote @user
┃ ✦ *Or:* Reply to a user 💬
┃ ✦ *By:* @${sender.split("@")[0]}
┃ ✦ *Time:* ${time}
┃
┗❐${readmore}
_⚡ Powered by ${botName}_`,
                {
                    mentions: [sender]
                }
            );
        }

        // ==========================================
        // 🔎 FIND TARGET IN GROUP
        // ==========================================

        const requestedNormalized =
            normalizeJid(requestedUser);

        const participant =
            participants.find(
                p =>
                    normalizeJid(
                        p.id || p.jid
                    ) === requestedNormalized
            );

        // ==========================================
        // ❌ USER NOT FOUND
        // ==========================================

        if (!participant) {

            return reply(
`┏━━❐✧ *${botName} PROMOTE* ✧❐
┃
┃ ✦ *Status:* User not found ❌
┃ ✦ *Group:* ${metadata.subject}
┃ ✦ *By:* @${sender.split("@")[0]}
┃ ✦ *Time:* ${time}
┃
┗❐${readmore}
_⚡ Powered by ${botName}_`,
                {
                    mentions: [sender]
                }
            );
        }

        // ==========================================
        // 🎯 KEEP ORIGINAL GROUP JID
        // ==========================================

        const targetJid =
            participant.id ||
            participant.jid ||
            requestedUser;

        // ==========================================
        // ℹ️ ALREADY ADMIN
        // ==========================================

        if (isAdmin(participant)) {

            return reply(
`┏━━❐✧ *${botName} PROMOTE* ✧❐
┃
┃ ✦ *Status:* Already Admin ℹ️
┃ ✦ *User:* @${targetJid.split("@")[0]}
┃ ✦ *By:* @${sender.split("@")[0]}
┃ ✦ *Time:* ${time}
┃
┗❐${readmore}
_⚡ Powered by ${botName}_`,
                {
                    mentions: [
                        targetJid,
                        sender
                    ]
                }
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
        // ⬆️ PROMOTE
        // ==========================================

        const res =
            await conn.groupParticipantsUpdate(
                from,
                [targetJid],
                "promote"
            );

        const status =
            String(
                res?.[0]?.status || ""
            );

        // ==========================================
        // ✅ SUCCESS
        // ==========================================

        if (
            status === "200" ||
            status === "207"
        ) {

            await conn.sendMessage(
                from,
                {
                    react: {
                        text: "✅",
                        key: mek.key
                    }
                }
            );

            return reply(
`┏━━❐✧ *${botName} PROMOTE* ✧❐
┃
┃ ✦ *Status:* Promoted Successfully ✅
┃ ✦ *User:* @${targetJid.split("@")[0]}
┃ ✦ *Group:* ${metadata.subject}
┃ ✦ *By:* @${sender.split("@")[0]}
┃ ✦ *Time:* ${time}
┃
┗❐${readmore}
_⚡ Powered by ${botName}_`,
                {
                    mentions: [
                        targetJid,
                        sender
                    ]
                }
            );
        }

        // ==========================================
        // ❌ FAILURE
        // ==========================================

        await conn.sendMessage(
            from,
            {
                react: {
                    text: "❌",
                    key: mek.key
                }
            }
        );

        return reply(
`┏━━❐✧ *${botName} PROMOTE* ✧❐
┃
┃ ✦ *Status:* Failed ❌
┃ ✦ *Reason:* ${status || "Unknown error"}
┃ ✦ *By:* @${sender.split("@")[0]}
┃ ✦ *Time:* ${time}
┃
┗❐${readmore}
_⚡ Powered by ${botName}_`,
            {
                mentions: [sender]
            }
        );

    } catch (error) {

        console.error(
            "❌ PROMOTE ERROR:",
            error
        );

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
`┏━━❐✧ *${botName} PROMOTE* ✧❐
┃
┃ ✦ *Status:* Error ❌
┃ ✦ *Reason:* ${error?.message || "Make sure the bot is admin"}
┃ ✦ *By:* @${sender.split("@")[0]}
┃ ✦ *Time:* ${time}
┃
┗❐${readmore}
_⚡ Powered by ${botName}_`,
            {
                mentions: [sender]
            }
        );
    }
});