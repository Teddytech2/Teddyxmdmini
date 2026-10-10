const { cmd } = require('../inconnuboy');
const config = require('../config');

const readmore = "\u200e".repeat(4001);

const botName =
    config.BOT_NAME || "TEDDY-XMD";

// ==========================================================
// 🔧 NORMALIZE JID
// ==========================================================

function normalizeJid(jid) {

    if (!jid) return "";

    return String(jid)
        .split(":")[0]
        .split("/")[0]
        .toLowerCase();
}

// ==========================================================
// 👮 CHECK USER ADMIN
// ==========================================================

function isParticipantAdmin(participant) {

    if (!participant) return false;

    return (
        participant.admin === "admin" ||
        participant.admin === "superadmin"
    );
}

// ==========================================================
// 🤖 FIND BOT PARTICIPANT
// ==========================================================

function findBotParticipant(conn, metadata) {

    const botJid =
        normalizeJid(
            conn.user?.id
        );

    if (!botJid) return null;

    return metadata.participants.find(
        participant =>
            normalizeJid(
                participant.id ||
                participant.jid
            ) === botJid
    ) || null;
}

// ==========================================================
// 1. REQUEST LIST
// ==========================================================

cmd({
    pattern: "requestlist",

    alias: [
        "req",
        "pending"
    ],

    desc: "Shows pending group join requests",

    category: "group",

    react: "📋",

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
        sender
    }
) => {

    try {

        await conn.sendMessage(
            from,
            {
                react: {
                    text: "⏳",
                    key: m.key
                }
            }
        );

        const time =
            new Date().toLocaleTimeString(
                "en-KE",
                {
                    timeZone:
                        "Africa/Nairobi"
                }
            );

        // ==========================================
        // 👥 GROUP CHECK
        // ==========================================

        if (!isGroup) {

            return reply(
                "❌ *This command is for groups only.*"
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
        // 👮 DIRECT ADMIN CHECK
        // ==========================================

        const userIsAdmin =
            isParticipantAdmin(
                senderParticipant
            );

        // ==========================================
        // 🔐 ADMIN CHECK
        // ==========================================

        if (!userIsAdmin) {

            return reply(
`┏━━❐✧ *${botName} REQLIST* ✧❐
┃✦ *Status:* Failed ❌
┃✦ *Reason:* Admin Only
┃✦ *By:* @${sender.split("@")[0]}
┃✦ *Time:* ${time}
┗❐${readmore}
_⚡ Powered by ${botName}_`,
                {
                    mentions: [sender]
                }
            );
        }

        // ==========================================
        // 🤖 BOT ADMIN CHECK
        // ==========================================

        const botParticipant =
            findBotParticipant(
                conn,
                metadata
            );

        const botIsAdmin =
            isParticipantAdmin(
                botParticipant
            );

        if (!botIsAdmin) {

            return reply(
`┏━━❐✧ *${botName} REQLIST* ✧❐
┃✦ *Status:* Failed ❌
┃✦ *Reason:* Bot needs admin
┃✦ *By:* @${sender.split("@")[0]}
┃✦ *Time:* ${time}
┗❐${readmore}
_⚡ Powered by ${botName}_`,
                {
                    mentions: [sender]
                }
            );
        }

        // ==========================================
        // 📋 REQUESTS
        // ==========================================

        const requests =
            await conn
                .groupRequestParticipantsList(from)
                .catch(() => []);

        if (
            !requests ||
            requests.length === 0
        ) {

            await conn.sendMessage(
                from,
                {
                    react: {
                        text: "ℹ️",
                        key: m.key
                    }
                }
            );

            return reply(
`┏━━❐✧ *${botName} REQLIST* ✧❐
┃✦ *Status:* No pending requests ℹ️
┃✦ *Group:* ${metadata.subject || "Unknown"}
┃✦ *By:* @${sender.split("@")[0]}
┃✦ *Time:* ${time}
┗❐${readmore}
_⚡ Powered by ${botName}_`,
                {
                    mentions: [sender]
                }
            );
        }

        // ==========================================
        // 📝 BUILD LIST
        // ==========================================

        let text =
`┏━━❐✧ *${botName} PENDING* ✧❐
┃✦ *Group:* ${metadata.subject || "Unknown"}
┃✦ *Total:* ${requests.length} Requests
┃✦ *By:* @${sender.split("@")[0]}
┃✦ *Time:* ${time}
┗❐${readmore}

*╔═══ PENDING USERS ═══╗*
`;

        const requestMentions = [];

        requests.forEach(
            (user, index) => {

                const jid =
                    user.jid ||
                    user.id;

                if (!jid) return;

                requestMentions.push(jid);

                const name =
                    user.name ||
                    jid.split("@")[0];

                text +=
                    `║ ${index + 1}. @${jid.split("@")[0]} - ${name}\n`;
            }
        );

        text +=
`*╚════════════════════╝*

> ✅ Use .acceptall to approve all
> ❌ Use .rejectall to decline all

_⚡ Powered by ${botName}_`;

        await conn.sendMessage(
            from,
            {
                react: {
                    text: "✅",
                    key: m.key
                }
            }
        );

        return reply(
            text,
            {
                mentions: [
                    ...requestMentions,
                    sender
                ]
            }
        );

    } catch (error) {

        console.error(
            "❌ REQUESTLIST ERROR:",
            error
        );

        try {
            await conn.sendMessage(
                from,
                {
                    react: {
                        text: "❌",
                        key: m.key
                    }
                }
            );
        } catch (_) {}

        return reply(
            "❌ *Error fetching join requests. Is approval mode on?*"
        );
    }
});

// ==========================================================
// 2. ACCEPT ALL
// ==========================================================

cmd({
    pattern: "acceptall",

    alias: [
        "approveall"
    ],

    desc: "Accepts all pending group join requests",

    category: "group",

    react: "✅",

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
        sender
    }
) => {

    try {

        await conn.sendMessage(
            from,
            {
                react: {
                    text: "⏳",
                    key: m.key
                }
            }
        );

        const time =
            new Date().toLocaleTimeString(
                "en-KE",
                {
                    timeZone:
                        "Africa/Nairobi"
                }
            );

        // ==========================================
        // 👥 GROUP CHECK
        // ==========================================

        if (!isGroup) {

            return reply(
                "❌ *This command is for groups only.*"
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
        // 👮 DIRECT ADMIN CHECK
        // ==========================================

        const userIsAdmin =
            isParticipantAdmin(
                senderParticipant
            );

        if (!userIsAdmin) {

            return reply(
`┏━━❐✧ *${botName} ACCEPTALL* ✧❐
┃✦ *Status:* Failed ❌
┃✦ *Reason:* Admin Only
┃✦ *By:* @${sender.split("@")[0]}
┃✦ *Time:* ${time}
┗❐${readmore}
_⚡ Powered by ${botName}_`,
                {
                    mentions: [sender]
                }
            );
        }

        // ==========================================
        // 🤖 BOT ADMIN CHECK
        // ==========================================

        const botParticipant =
            findBotParticipant(
                conn,
                metadata
            );

        const botIsAdmin =
            isParticipantAdmin(
                botParticipant
            );

        if (!botIsAdmin) {

            return reply(
`┏━━❐✧ *${botName} ACCEPTALL* ✧❐
┃✦ *Status:* Failed ❌
┃✦ *Reason:* Bot needs admin
┃✦ *By:* @${sender.split("@")[0]}
┃✦ *Time:* ${time}
┗❐${readmore}
_⚡ Powered by ${botName}_`,
                {
                    mentions: [sender]
                }
            );
        }

        // ==========================================
        // 📋 GET REQUESTS
        // ==========================================

        const requests =
            await conn
                .groupRequestParticipantsList(from)
                .catch(() => []);

        if (
            !requests ||
            requests.length === 0
        ) {

            return reply(
`┏━━❐✧ *${botName} ACCEPTALL* ✧❐
┃✦ *Status:* Nothing to accept ℹ️
┃✦ *By:* @${sender.split("@")[0]}
┃✦ *Time:* ${time}
┗❐${readmore}
_⚡ Powered by ${botName}_`,
                {
                    mentions: [sender]
                }
            );
        }

        // ==========================================
        // ✅ APPROVE REQUESTS
        // ==========================================

        const jids =
            requests
                .map(user =>
                    user.jid ||
                    user.id
                )
                .filter(Boolean);

        let approved = 0;

        for (
            let i = 0;
            i < jids.length;
            i += 20
        ) {

            const chunk =
                jids.slice(i, i + 20);

            await conn.groupRequestParticipantsUpdate(
                from,
                chunk,
                "approve"
            );

            approved += chunk.length;

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        1000
                    )
            );
        }

        await conn.sendMessage(
            from,
            {
                react: {
                    text: "👍",
                    key: m.key
                }
            }
        );

        return reply(
`┏━━❐✧ *${botName} ACCEPTALL* ✧❐
┃✦ *Status:* Success ✅
┃✦ *Approved:* ${approved} Members
┃✦ *By:* @${sender.split("@")[0]}
┃✦ *Time:* ${time}
┗❐${readmore}
_⚡ Powered by ${botName}_`,
            {
                mentions: [sender]
            }
        );

    } catch (error) {

        console.error(
            "❌ ACCEPTALL ERROR:",
            error
        );

        try {
            await conn.sendMessage(
                from,
                {
                    react: {
                        text: "❌",
                        key: m.key
                    }
                }
            );
        } catch (_) {}

        return reply(
            "❌ *Failed to process approvals.*"
        );
    }
});

// ==========================================================
// 3. REJECT ALL
// ==========================================================

cmd({
    pattern: "rejectall",

    alias: [
        "declineall"
    ],

    desc: "Rejects all pending group join requests",

    category: "group",

    react: "❌",

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
        sender
    }
) => {

    try {

        await conn.sendMessage(
            from,
            {
                react: {
                    text: "⏳",
                    key: m.key
                }
            }
        );

        const time =
            new Date().toLocaleTimeString(
                "en-KE",
                {
                    timeZone:
                        "Africa/Nairobi"
                }
            );

        // ==========================================
        // 👥 GROUP CHECK
        // ==========================================

        if (!isGroup) {

            return reply(
                "❌ *This command is for groups only.*"
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
        // 👮 DIRECT ADMIN CHECK
        // ==========================================

        const userIsAdmin =
            isParticipantAdmin(
                senderParticipant
            );

        if (!userIsAdmin) {

            return reply(
`┏━━❐✧ *${botName} REJECTALL* ✧❐
┃✦ *Status:* Failed ❌
┃✦ *Reason:* Admin Only
┃✦ *By:* @${sender.split("@")[0]}
┃✦ *Time:* ${time}
┗❐${readmore}
_⚡ Powered by ${botName}_`,
                {
                    mentions: [sender]
                }
            );
        }

        // ==========================================
        // 🤖 BOT ADMIN CHECK
        // ==========================================

        const botParticipant =
            findBotParticipant(
                conn,
                metadata
            );

        const botIsAdmin =
            isParticipantAdmin(
                botParticipant
            );

        if (!botIsAdmin) {

            return reply(
`┏━━❐✧ *${botName} REJECTALL* ✧❐
┃✦ *Status:* Failed ❌
┃✦ *Reason:* Bot needs admin
┃✦ *By:* @${sender.split("@")[0]}
┃✦ *Time:* ${time}
┗❐${readmore}
_⚡ Powered by ${botName}_`,
                {
                    mentions: [sender]
                }
            );
        }

        // ==========================================
        // 📋 GET REQUESTS
        // ==========================================

        const requests =
            await conn
                .groupRequestParticipantsList(from)
                .catch(() => []);

        if (
            !requests ||
            requests.length === 0
        ) {

            return reply(
`┏━━❐✧ *${botName} REJECTALL* ✧❐
┃✦ *Status:* Nothing to reject ℹ️
┃✦ *By:* @${sender.split("@")[0]}
┃✦ *Time:* ${time}
┗❐${readmore}
_⚡ Powered by ${botName}_`,
                {
                    mentions: [sender]
                }
            );
        }

        // ==========================================
        // ❌ REJECT REQUESTS
        // ==========================================

        const jids =
            requests
                .map(user =>
                    user.jid ||
                    user.id
                )
                .filter(Boolean);

        let rejected = 0;

        for (
            let i = 0;
            i < jids.length;
            i += 20
        ) {

            const chunk =
                jids.slice(i, i + 20);

            await conn.groupRequestParticipantsUpdate(
                from,
                chunk,
                "reject"
            );

            rejected += chunk.length;

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        1000
                    )
            );
        }

        await conn.sendMessage(
            from,
            {
                react: {
                    text: "👎",
                    key: m.key
                }
            }
        );

        return reply(
`┏━━❐✧ *${botName} REJECTALL* ✧❐
┃✦ *Status:* Success ✅
┃✦ *Rejected:* ${rejected} Requests
┃✦ *By:* @${sender.split("@")[0]}
┃✦ *Time:* ${time}
┗❐${readmore}
_⚡ Powered by ${botName}_`,
            {
                mentions: [sender]
            }
        );

    } catch (error) {

        console.error(
            "❌ REJECTALL ERROR:",
            error
        );

        try {
            await conn.sendMessage(
                from,
                {
                    react: {
                        text: "❌",
                        key: m.key
                    }
                }
            );
        } catch (_) {}

        return reply(
            "❌ *Failed to process rejections.*"
        );
    }
});