const config = require('../config');
const { cmd } = require('../inconnuboy');

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

    // ==========================================
    // SINGLE OWNER
    // ==========================================

    const ownerNumber =
        config.OWNER_NUMBER ||
        config.OWNER_NUM ||
        config.OWNER;

    if (ownerNumber) {

        const owner =
            cleanNumber(ownerNumber);

        if (
            owner &&
            owner === senderNumber
        ) {
            return true;
        }
    }

    // ==========================================
    // MULTIPLE OWNERS
    // ==========================================

    const ownerNumbers =
        config.OWNER_NUMBERS;

    if (Array.isArray(ownerNumbers)) {

        return ownerNumbers.some(number => {

            const owner =
                cleanNumber(number);

            return (
                owner &&
                owner === senderNumber
            );
        });
    }

    return false;
}

cmd({
    pattern: "join",
    react: "📬",
    alias: ["joinme", "f_join"],
    desc: "Join a group from an invite link",
    category: "group",
    use: ".join <Group Link>",
    filename: __filename
},

async (
    conn,
    mek,
    m,
    {
        from,
        q,
        sender,
        reply
    }
) => {

    const botName =
        config.BOT_NAME || "TEDDY-XMD";

    try {

        // ==========================================
        // 👑 OWNER ONLY
        // ==========================================

        const owner =
            isOwner(sender);

        if (!owner) {

            return reply(
`┏━━❐✧ *${botName} JOIN* ✧❐
┃
┃ ✦ *Status:* Access Denied ❌
┃ ✦ *Reason:* Owner Only 👑
┃ ✦ *By:* @${sender.split("@")[0]}
┃
┗❐
_⚡ Powered by ${botName}_`,
                {
                    mentions: [sender]
                }
            );
        }

        // ==========================================
        // 🔗 LINK CHECK
        // ==========================================

        if (!q || !q.trim()) {

            return reply(
`┏━━❐✧ *${botName} JOIN* ✧❐
┃
┃ 📬 *Send a WhatsApp group invite link*
┃
┃ 🔗 Example:
┃ .join https://chat.whatsapp.com/XXXXXXXX
┃
┗❐`
            );
        }

        // ==========================================
        // 🔍 EXTRACT INVITE CODE
        // ==========================================

        let code =
            q.trim();

        if (
            code.includes(
                "chat.whatsapp.com/"
            )
        ) {

            code =
                code
                    .split(
                        "chat.whatsapp.com/"
                    )[1]
                    .split("?")[0]
                    .trim();
        }

        // ==========================================
        // ❌ INVALID CODE
        // ==========================================

        if (
            !code ||
            code.length < 10
        ) {

            return reply(
                "❌ *Invalid WhatsApp group invite link.*\n\n" +
                "🔗 Please send a valid invite link."
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
        // 📬 ACCEPT INVITE
        // ==========================================

        let groupId;

        try {

            groupId =
                await conn.groupAcceptInvite(
                    code
                );

        } catch (error) {

            const message =
                String(
                    error?.message || error
                ).toLowerCase();

            // ==========================================
            // ALREADY JOINED
            // ==========================================

            if (
                message.includes("already") ||
                message.includes("409")
            ) {

                await conn.sendMessage(
                    from,
                    {
                        react: {
                            text: "ℹ️",
                            key: mek.key
                        }
                    }
                );

                return reply(
                    "ℹ️ *I'm already a member of that group.* 👥"
                );
            }

            throw error;
        }

        // ==========================================
        // 📋 GET GROUP INFO
        // ==========================================

        const metadata =
            await conn.groupMetadata(
                groupId
            ).catch(() => ({}));

        const groupName =
            metadata.subject ||
            "Unknown Group";

        // ==========================================
        // ✅ SUCCESS REACTION
        // ==========================================

        await conn.sendMessage(
            from,
            {
                react: {
                    text: "✅",
                    key: mek.key
                }
            }
        );

        // ==========================================
        // ✨ SUCCESS MESSAGE
        // ==========================================

        const successText =
`╭━━〔 ✨ *${botName} JOINER* 〕━━╮
┃
┃ ✅ *Successfully Joined*
┃
┃ 👥 *Group:* ${groupName}
┃ 👤 *Requested By:* @${sender.split("@")[0]}
┃
┃ 🤖 *Status:* Ready to manage
┃
╰━━━━━━━━━━━━━━━━━━╯`;

        await conn.sendMessage(
            from,
            {
                text: successText,

                mentions: [
                    sender
                ],

                contextInfo: {
                    externalAdReply: {
                        title:
                            `${botName} NETWORK`,

                        body:
                            `Joined: ${groupName}`,

                        mediaType: 1,

                        sourceUrl:
                            "https://github.com/TEDDY-XMD",

                        thumbnailUrl:
                            "https://files.catbox.moe/aapw1p.png",

                        renderLargerThumbnail:
                            true,

                        showAdAttribution:
                            false
                    }
                }
            },
            {
                quoted: mek
            }
        );

    } catch (error) {

        console.error(
            "❌ JOIN ERROR:",
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

        const message =
            String(
                error?.message || error
            ).toLowerCase();

        let reason =
            error?.message ||
            "Unknown error";

        // ==========================================
        // 🔗 INVITE ERROR
        // ==========================================

        if (
            message.includes("invite")
        ) {

            reason =
                "Invalid or expired invite link 🔗";
        }

        // ==========================================
        // 🚫 BANNED
        // ==========================================

        else if (
            message.includes("banned")
        ) {

            reason =
                "Bot is banned from that group 🚫";
        }

        // ==========================================
        // ❌ GONE
        // ==========================================

        else if (
            message.includes("gone")
        ) {

            reason =
                "The invite link is no longer valid ❌";
        }

        return reply(
`┏━━❐✧ *${botName} JOIN* ✧❐
┃
┃ ✦ *Status:* Failed ❌
┃ ✦ *Reason:* ${reason}
┃
┗❐
_⚡ Powered by ${botName}_`
        );
    }
});