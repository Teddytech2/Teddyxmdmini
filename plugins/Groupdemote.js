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

// ==========================================
// 👑 OWNER CHECK
// ==========================================

function isOwnerNumber(sender) {

    const senderNumber =
        String(sender || "")
            .replace(/[^0-9]/g, "");

    if (!senderNumber) {
        return false;
    }

    const ownerNumbers = [];

    const configuredOwner =
        config.OWNER_NUMBER ||
        config.OWNER_NUM ||
        config.OWNER;

    if (configuredOwner) {
        ownerNumbers.push(
            configuredOwner
        );
    }

    if (Array.isArray(config.OWNER_NUMBERS)) {
        ownerNumbers.push(
            ...config.OWNER_NUMBERS
        );
    }

    return ownerNumbers.some(number => {

        const owner =
            String(number || "")
                .replace(/[^0-9]/g, "");

        return (
            owner &&
            owner === senderNumber
        );
    });
}

cmd({
    pattern: "demote",
    alias: ["removeadmin", "dadmin"],
    react: "⬇️",
    desc: "Demote an admin to member",
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

    const botName =
        config.BOT_NAME || "TEDDY-XMD";

    const readmore =
        "\u200e".repeat(4001);

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
        // 👮 REAL ADMIN CHECK
        // ==========================================

        const userIsAdmin =
            isAdmin(senderParticipant);

        // ==========================================
        // 👑 REAL OWNER CHECK
        // ==========================================

        const directCreator =
            isOwnerNumber(sender);

        // ==========================================
        // 👑 OWNER / 👮 ADMIN CHECK
        // ==========================================

        if (
            !directCreator &&
            !userIsAdmin
        ) {

            return reply(
`┏━━❐✧ *${botName} DEMOTE* ✧❐
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

        const botId =
            conn.user?.id;

        const botJid =
            normalizeJid(botId);

        const botParticipant =
            participants.find(
                participant =>
                    normalizeJid(
                        participant.id ||
                        participant.jid
                    ) === botJid
            );

        // ==========================================
        // 🤖 REAL BOT ADMIN CHECK
        // ==========================================

        const botIsAdmin =
            isAdmin(botParticipant);

        if (!botIsAdmin) {

            return reply(
`┏━━❐✧ *${botName} DEMOTE* ✧❐
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
        // 🎯 GET TARGET
        // ==========================================

        const requestedUser =
            mentionedJid?.[0] ||
            quoted?.sender;

        if (!requestedUser) {

            return reply(
`┏━━❐✧ *${botName} DEMOTE* ✧❐
┃
┃ ✦ *Usage:* .demote @user
┃ ✦ *Or:* Reply to an admin 💬
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
        // 🔧 TARGET NORMALIZED ONLY FOR SEARCH
        // ==========================================

        const requestedNormalized =
            normalizeJid(
                requestedUser
            );

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
`┏━━❐✧ *${botName} DEMOTE* ✧❐
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

        const user =
            participant.id ||
            participant.jid ||
            requestedUser;

        // ==========================================
        // ℹ️ NOT AN ADMIN
        // ==========================================

        if (!isAdmin(participant)) {

            return reply(
                `ℹ️ @${user.split("@")[0]} is not an admin.`,
                {
                    mentions: [user]
                }
            );
        }

        // ==========================================
        // 👑 PROTECT GROUP OWNER
        // ==========================================

        if (
            participant.admin === "superadmin"
        ) {

            return reply(
                "👑 *The group owner cannot be demoted.*"
            );
        }

        // ==========================================
        // 🚫 PREVENT SELF DEMOTION
        // ==========================================

        if (
            normalizeJid(user) ===
            normalizeJid(sender)
        ) {

            return reply(
                "❌ *You cannot demote yourself.*"
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
        // ⬇️ DEMOTE
        // ==========================================

        const res =
            await conn.groupParticipantsUpdate(
                from,
                [user],
                "demote"
            );

        // ==========================================
        // 📊 RESPONSE STATUS
        // ==========================================

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
`┏━━❐✧ *${botName} DEMOTE* ✧❐
┃
┃ ✦ *Status:* Success ✅
┃ ✦ *User:* @${user.split("@")[0]}
┃ ✦ *Role:* Member 👤
┃ ✦ *By:* @${sender.split("@")[0]}
┃ ✦ *Time:* ${time}
┃
┗❐${readmore}
_⚡ Powered by ${botName}_`,
                {
                    mentions: [
                        user,
                        sender
                    ]
                }
            );
        }

        // ==========================================
        // ❌ FAILED
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
`┏━━❐✧ *${botName} DEMOTE* ✧❐
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
            "❌ DEMOTE ERROR:",
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
`┏━━❐✧ *${botName} DEMOTE* ✧❐
┃
┃ ✦ *Status:* Error ❌
┃ ✦ *Reason:* ${error?.message || "Make sure I am admin"}
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