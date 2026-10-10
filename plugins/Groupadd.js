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

function isOwnerNumber(sender) {
    const senderNumber = cleanNumber(sender);

    if (!senderNumber) return false;

    const possibleOwners = [
        config.OWNER_NUMBER,
        config.OWNER_NUM,
        config.OWNER
    ];

    for (const owner of possibleOwners) {
        if (
            owner &&
            cleanNumber(owner) === senderNumber
        ) {
            return true;
        }
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

function findParticipant(metadata, jid) {

    const normalized =
        normalizeJid(jid);

    return (
        metadata?.participants?.find(
            participant =>
                normalizeJid(
                    participant.id ||
                    participant.jid
                ) === normalized
        ) || null
    );
}

cmd(
{
    pattern: "add",
    alias: [
        "invite",
        "addmember",
        "a",
        "summon"
    ],
    desc: "Adds a person to group",
    category: "group",
    react: "👤",
    filename: __filename
},

async (
    conn,
    mek,
    m,
    {
        from,
        quoted,
        args,
        reply,
        isGroup,
        isCreator,
        sender
    }
) => {

    const readmore =
        "\u200e".repeat(4001);

    const time =
        new Date().toLocaleTimeString(
            "en-KE",
            {
                timeZone: "Africa/Nairobi"
            }
        );

    const botName =
        config.BOT_NAME ||
        "TEDDY-XMD";

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

        const metadata =
            await conn.groupMetadata(from);

        const participants =
            metadata?.participants || [];

        // ==========================================
        // 👤 FIND SENDER
        // ==========================================

        const senderParticipant =
            findParticipant(
                metadata,
                sender
            );

        // ==========================================
        // 👮 DIRECT ADMIN CHECK
        // ==========================================

        const directAdmin =
            isAdmin(senderParticipant);

        // ==========================================
        // 👑 OWNER CHECK
        // ==========================================

        const directOwner =
            isOwnerNumber(sender) ||
            isCreator === true;

        // ==========================================
        // 👑 USER PERMISSION
        // ==========================================

        const userIsAdmin =
            directAdmin ||
            directOwner;

        if (!userIsAdmin) {

            return reply(
`┏━━❐✧ *${botName} ADD* ✧❐
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
            conn.user?.id || "";

        const botParticipant =
            participants.find(
                participant => {

                    const participantId =
                        participant.id ||
                        participant.jid;

                    return (
                        normalizeJid(
                            participantId
                        ) ===
                        normalizeJid(botId)
                    );
                }
            );

        // ==========================================
        // 🤖 BOT ADMIN CHECK
        // ==========================================

        const botIsAdmin =
            isAdmin(botParticipant);

        if (!botIsAdmin) {

            return reply(
`┏━━❐✧ *${botName} ADD* ✧❐
┃
┃ ✦ *Status:* Failed ❌
┃ ✦ *Reason:* Promote me to admin 🤖
┃ ✦ *Action:* I need admin rights to add members
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
        // 🎯 FIND TARGET
        // ==========================================

        let target =
            m.mentionedJid?.[0] ||
            quoted?.sender ||
            null;

        // ==========================================
        // 📱 NUMBER ARGUMENT
        // ==========================================

        if (!target && args?.[0]) {

            const number =
                String(args[0])
                    .replace(/[^0-9]/g, "");

            if (number) {
                target =
                    `${number}@s.whatsapp.net`;
            }
        }

        // ==========================================
        // ❌ NO TARGET
        // ==========================================

        if (!target) {

            return reply(
`┏━━❐✧ *${botName} ADD* ✧❐
┃
┃ ✦ *Usage:* .add 2547xxxxxxx
┃ ✦ *Or:* Mention a user 👤
┃ ✦ *Or:* Reply to their message 💬
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
        // 🔧 KEEP TARGET AS A REAL WHATSAPP JID
        // ==========================================

        if (!String(target).includes("@")) {

            target =
                `${String(target).replace(
                    /[^0-9]/g,
                    ""
                )}@s.whatsapp.net`;
        }

        // Only use normalized JID for comparisons.
        // Keep the original JID for the actual API call.
        const targetJid =
            String(target);

        const targetNormalized =
            normalizeJid(targetJid);

        // ==========================================
        // 🤖 DON'T ADD BOT
        // ==========================================

        if (
            targetNormalized ===
            normalizeJid(conn.user?.id)
        ) {

            return reply(
                "❌ *I can't add myself.* 🤖"
            );
        }

        // ==========================================
        // ℹ️ ALREADY IN GROUP
        // ==========================================

        const existingParticipant =
            participants.find(
                participant =>
                    normalizeJid(
                        participant.id ||
                        participant.jid
                    ) === targetNormalized
            );

        if (existingParticipant) {

            // Use the REAL JID from metadata
            const realJid =
                existingParticipant.id ||
                existingParticipant.jid ||
                targetJid;

            return reply(
`┏━━❐✧ *${botName} ADD* ✧❐
┃
┃ ✦ *Status:* Already in group ℹ️
┃ ✦ *User:* @${realJid.split("@")[0]}
┃ ✦ *Group:* ${metadata.subject}
┃ ✦ *By:* @${sender.split("@")[0]}
┃ ✦ *Time:* ${time}
┃
┗❐${readmore}
_⚡ Powered by ${botName}_`,
                {
                    mentions: [
                        realJid,
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
        // ➕ ADD USER
        // ==========================================

        const res =
            await conn.groupParticipantsUpdate(
                from,
                [targetJid],
                "add"
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
`┏━━❐✧ *${botName} ADD* ✧❐
┃
┃ ✦ *Status:* Added Successfully ✅
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
        // 🔒 PRIVACY
        // ==========================================

        if (status === "403") {

            await conn.sendMessage(
                from,
                {
                    react: {
                        text: "❌",
                        key: mek.key
                    }
                }
            );

            let inviteLink = "";

            try {

                const code =
                    await conn.groupInviteCode(
                        from
                    );

                inviteLink =
                    `https://chat.whatsapp.com/${code}`;

            } catch (_) {}

            return reply(
`┏━━❐✧ *${botName} ADD* ✧❐
┃
┃ ✦ *Status:* Failed ❌
┃ ✦ *Reason:* User privacy settings 🔒
┃ ✦ *Solution:* Use the group invite link 📎
┃ ✦ *By:* @${sender.split("@")[0]}
┃ ✦ *Time:* ${time}
┃
┗❐${readmore}

📎 *Invite Link:*
${inviteLink || "Unable to generate link"}

_⚡ Powered by ${botName}_`,
                {
                    mentions: [sender]
                }
            );
        }

        // ==========================================
        // ⏱️ RECENTLY LEFT
        // ==========================================

        if (status === "408") {

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
`┏━━❐✧ *${botName} ADD* ✧❐
┃
┃ ✦ *Status:* Failed ❌
┃ ✦ *Reason:* User recently left ⏱️
┃ ✦ *Solution:* Wait before adding again
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
        // ❌ OTHER FAILURE
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
`┏━━❐✧ *${botName} ADD* ✧❐
┃
┃ ✦ *Status:* Operation Failed ❌
┃ ✦ *Code:* ${status || "Unknown"}
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
            "❌ ADD ERROR:",
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
`┏━━❐✧ *${botName} ADD* ✧❐
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