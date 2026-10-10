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
    pattern: "lockgc",
    alias: ["lock"],
    react: "🔒",
    desc: "Lock group (admins only can send messages)",
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

        // ==========================================
        // 👥 GROUP CHECK
        // ==========================================

        if (!isGroup) {
            return reply(
                "❌ Group only command"
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
        // 👮 REAL SENDER ADMIN CHECK
        // ==========================================

        const userIsAdmin =
            isAdmin(senderParticipant);

        if (!userIsAdmin) {

            return reply(
                "❌ Admins only!\n\n" +
                "👑 Only group admins can lock the group."
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
        // 🤖 REAL BOT ADMIN CHECK
        // ==========================================

        const botIsAdmin =
            isAdmin(botParticipant);

        if (!botIsAdmin) {

            return reply(
                "❌ I need admin privileges to lock this group.\n\n" +
                "👑 Please promote me to admin and try again."
            );
        }

        // ==========================================
        // 🔒 LOCK GROUP
        // ==========================================

        await conn.groupSettingUpdate(
            from,
            "announcement"
        );

        // ==========================================
        // 📢 CONFIRMATION
        // ==========================================

        await conn.sendMessage(
            from,
            {
                text:
                    "🔒 *GROUP LOCKED*\n\n" +
                    "👑 Only group admins can now send messages.\n\n" +
                    "🤖 TEDDY-XMD"
            },
            {
                quoted: mek
            }
        );

    } catch (error) {

        console.error(
            "LOCKGC ERROR:",
            error
        );

        return reply(
            "❌ Failed to lock the group.\n\n" +
            "Make sure TEDDY-XMD is a group admin."
        );
    }
});