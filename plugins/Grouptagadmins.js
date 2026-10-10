const { cmd } = require('../inconnuboy');
const config = require('../config');

cmd({
    pattern: "tagadmins",

    alias: [
        "taggcadmins",
        "taggroupadmins",
        "admins"
    ],

    react: "👮",
    category: "group",
    desc: "Tag all group admins with optional message",
    filename: __filename
},

async (
    conn,
    mek,
    m,
    {
        from,
        isGroup,
        q,
        reply,
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
                "❌ *This command only works in groups!* 👥"
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
                "❌ *Unable to get group information.*"
            );
        }

        const participants =
            metadata.participants;

        if (!participants.length) {
            return reply(
                "❌ *No group members found.*"
            );
        }

        // ==========================================
        // 🔧 NORMALIZE JID
        // ==========================================

        const normalizeJid = (jid) => {

            if (!jid) return "";

            return String(jid)
                .split(":")[0]
                .split("/")[0]
                .toLowerCase();
        };

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

        const directAdmin =
            !!senderParticipant &&
            (
                senderParticipant.admin === "admin" ||
                senderParticipant.admin === "superadmin"
            );

        // ==========================================
        // 👑 DIRECT OWNER CHECK
        // ==========================================

        let directCreator = false;

        const senderNumber =
            String(sender || "")
                .replace(/[^0-9]/g, "");

        const ownerNumbers = [];

        if (config.OWNER_NUMBER) {
            ownerNumbers.push(
                config.OWNER_NUMBER
            );
        }

        if (config.OWNER_NUM) {
            ownerNumbers.push(
                config.OWNER_NUM
            );
        }

        if (config.OWNER) {
            ownerNumbers.push(
                config.OWNER
            );
        }

        if (Array.isArray(config.OWNER_NUMBERS)) {

            ownerNumbers.push(
                ...config.OWNER_NUMBERS
            );

        } else if (config.OWNER_NUMBERS) {

            ownerNumbers.push(
                ...String(config.OWNER_NUMBERS)
                    .split(",")
            );
        }

        directCreator =
            ownerNumbers.some(owner => {

                const ownerNumber =
                    String(owner || "")
                        .replace(/[^0-9]/g, "");

                return (
                    ownerNumber &&
                    senderNumber &&
                    ownerNumber === senderNumber
                );
            });

        // ==========================================
        // 🔐 FINAL PERMISSION CHECK
        // ==========================================

        const allowed =
            directCreator ||
            directAdmin;

        if (!allowed) {

            return reply(
`┏━━❐✧ *${botName} TAGADMINS* ✧❐
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
        // ⏳ PROCESSING
        // ==========================================

        try {

            await conn.sendMessage(
                from,
                {
                    react: {
                        text: "⏳",
                        key: mek.key
                    }
                }
            );

        } catch (_) {}

        // ==========================================
        // 👑 FIND GROUP ADMINS
        // ==========================================

        const superAdmins = [];
        const admins = [];

        for (const participant of participants) {

            const id =
                participant.id ||
                participant.jid;

            if (!id) continue;

            if (
                participant.admin ===
                "superadmin"
            ) {

                superAdmins.push(id);

            } else if (
                participant.admin ===
                "admin"
            ) {

                admins.push(id);
            }
        }

        // ==========================================
        // 📢 ALL ADMINS
        // ==========================================

        const allAdmins = [
            ...superAdmins,
            ...admins
        ];

        // ==========================================
        // ❌ NO ADMINS
        // ==========================================

        if (!allAdmins.length) {

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
`┏━━❐✧ *${botName} TAGADMINS* ✧❐
┃
┃ ✦ *Status:* No admins found ❌
┃ ✦ *Group:* ${metadata.subject || "Unknown Group"}
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
        // 📢 MENTIONS
        // ==========================================

        const mentions = [
            ...allAdmins,
            sender
        ];

        // ==========================================
        // 📝 MESSAGE
        // ==========================================

        let text =
`┏━━❐✧ *${botName} TAGADMINS* ✧❐
┃
┃ ✦ *Group:* ${metadata.subject || "Unknown Group"}
┃ ✦ *Message:* ${
    q && q.trim()
        ? q.trim()
        : "Attention Admins! 👮"
}
┃ ✦ *By:* @${sender.split("@")[0]}
┃ ✦ *Time:* ${time}
┃ ✦ *Total:* ${allAdmins.length} Admins
┃
┗❐${readmore}

*╔═══ 👮 ADMIN LIST ═══╗*
`;

        // ==========================================
        // 👑 GROUP OWNER
        // ==========================================

        for (const id of superAdmins) {

            text +=
                `║ 👑 @${id.split("@")[0]} *Owner*\n`;
        }

        // ==========================================
        // 👮 GROUP ADMINS
        // ==========================================

        for (const id of admins) {

            text +=
                `║ 👮 @${id.split("@")[0]} *Admin*\n`;
        }

        text +=
`*╚══════════════════╝*

_⚡ Powered by ${botName}_`;

        // ==========================================
        // 📰 NEWSLETTER CONTEXT
        // ==========================================

        const newsletterContextInfo = {

            forwardingScore: 999,

            isForwarded: true,

            forwardedNewsletterMessageInfo: {

                newsletterJid:
                    config.NEWSLETTER_JID ||
                    "120363421104812135@newsletter",

                newsletterName:
                    config.OWNER_NAME ||
                    "TEDDY-XMD OFFICIAL",

                serverMessageId: 1
            }
        };

        // ==========================================
        // 📢 SEND
        // ==========================================

        await conn.sendMessage(
            from,
            {
                text: text.trim(),

                mentions,

                contextInfo:
                    newsletterContextInfo
            },
            {
                quoted: mek
            }
        );

        // ==========================================
        // ✅ SUCCESS
        // ==========================================

        try {

            await conn.sendMessage(
                from,
                {
                    react: {
                        text: "✅",
                        key: mek.key
                    }
                }
            );

        } catch (_) {}

    } catch (error) {

        console.error(
            "❌ TAGADMINS ERROR:",
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
`┏━━❐✧ *${botName} TAGADMINS* ✧❐
┃
┃ ✦ *Status:* Error ❌
┃ ✦ *Reason:* ${error?.message || "Unknown error"}
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