const { cmd } = require('../inconnuboy');

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

cmd({
    pattern: "unlockgc",
    alias: ["unlock"],
    react: "🔓",
    desc: "Unlock group (everyone can send messages)",
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
        sender,
        reply
    }
) => {

    try {

        // -----------------------------
        // CHECK GROUP
        // -----------------------------
        if (!isGroup) {
            return reply(
                "❌ Group only command"
            );
        }

        // -----------------------------
        // GET FRESH GROUP METADATA
        // -----------------------------
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

        // -----------------------------
        // CHECK SENDER ADMIN
        // -----------------------------
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

        const userIsAdmin =
            isAdmin(senderParticipant);

        if (!userIsAdmin) {
            return reply(
                "❌ Admins only!\n\n" +
                "👑 Only group admins can unlock the group."
            );
        }

        // -----------------------------
        // CHECK BOT ADMIN
        // -----------------------------
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

        const botIsAdmin =
            isAdmin(botParticipant);

        if (!botIsAdmin) {
            return reply(
                "❌ I need admin privileges to unlock this group.\n\n" +
                "👑 Please promote me to admin and try again."
            );
        }

        // -----------------------------
        // UNLOCK GROUP
        // -----------------------------
        await conn.groupSettingUpdate(
            from,
            "not_announcement"
        );

        // -----------------------------
        // SUCCESS MESSAGE
        // -----------------------------
        await conn.sendMessage(
            from,
            {
                text:
                    "🔓 *GROUP UNLOCKED*\n\n" +
                    "👥 Everyone can now send messages.\n\n" +
                    "🤖 TEDDY-XMD"
            },
            {
                quoted: mek
            }
        );

    } catch (e) {

        console.error(
            "UNLOCKGC ERROR:",
            e
        );

        return reply(
            "❌ Failed to unlock the group.\n\n" +
            "Make sure TEDDY-XMD is a group admin."
        );
    }
});