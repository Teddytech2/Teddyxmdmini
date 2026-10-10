const { cmd } = require('../inconnuboy');
const config = require('../config');
const fs = require('fs');

const dataPath = './data/antitag.json';

if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data', { recursive: true });
}

if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(
        dataPath,
        JSON.stringify({}, null, 2)
    );
}

let antitagSettings = {};

try {
    antitagSettings =
        JSON.parse(
            fs.readFileSync(
                dataPath,
                'utf-8'
            )
        );
} catch {
    antitagSettings = {};
}

const saveSettings = () => {
    try {
        fs.writeFileSync(
            dataPath,
            JSON.stringify(
                antitagSettings,
                null,
                2
            )
        );
    } catch (err) {
        console.error(
            '❌ Failed to save Antitag settings:',
            err
        );
    }
};

// ==========================================
// 🔧 JID HELPERS
// ==========================================

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
        ownerNumbers.push(configuredOwner);
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

// ==========================================
// 👮 GET REAL GROUP PERMISSIONS
// ==========================================

async function getPermission(
    conn,
    from,
    sender
) {

    const metadata =
        await conn.groupMetadata(from);

    const participants =
        metadata?.participants || [];

    const senderNormalized =
        normalizeJid(sender);

    const senderParticipant =
        participants.find(
            participant =>
                normalizeJid(
                    participant.id ||
                    participant.jid
                ) === senderNormalized
        );

    const directAdmin =
        isAdmin(senderParticipant);

    const directOwner =
        isOwnerNumber(sender);

    return {
        metadata,
        participants,

        // ONLY REAL GROUP ADMIN STATUS
        isAdmin: directAdmin,

        // OWNER NUMBER
        isOwner: directOwner,

        senderParticipant
    };
}

// ==========================================
// 🚫 PUNISHMENT COOLDOWN
// ==========================================

const cooldown = new Map();

function getCooldownKey(from, sender) {
    return `${from}:${normalizeJid(sender)}`;
}

// ==========================================
// 1. ANTITAG COMMAND
// ==========================================

cmd({
    pattern: "antitag",
    desc: "Protect group from mass mentions",
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
        args,
        reply,
        sender
    }
) => {

    try {

        // ==========================================
        // 👥 GROUP CHECK
        // ==========================================

        if (!isGroup) {
            return reply(
                "❌ *TEDDY, this is for groups only!*"
            );
        }

        // ==========================================
        // 👮 DIRECT PERMISSION CHECK
        // ==========================================

        const permission =
            await getPermission(
                conn,
                from,
                sender
            );

        const allowed =
            permission.isOwner ||
            permission.isAdmin;

        if (!allowed) {
            return reply(
                "❌ *Admin or Owner access required.*"
            );
        }

        // ==========================================
        // 🔧 ARGUMENTS
        // ==========================================

        const subcmd =
            args?.[0]?.toLowerCase();

        const param =
            args?.[1]?.toLowerCase();

        const validActions = [
            "delete",
            "warn",
            "kick"
        ];

        // ==========================================
        // 🟢 ON / 🔴 OFF
        // ==========================================

        if (
            subcmd === "on" ||
            subcmd === "off"
        ) {

            // ==========================================
            // ENABLE
            // ==========================================

            if (subcmd === "on") {

                const action =
                    validActions.includes(param)
                        ? param
                        : "delete";

                antitagSettings[from] =
                    antitagSettings[from] || {};

                antitagSettings[from].enabled =
                    true;

                antitagSettings[from].action =
                    action;

                antitagSettings[from].exempt =
                    antitagSettings[from].exempt || [];

                saveSettings();

                return reply(
`✅ *Antitag Enabled*

🛡️ *Action:* ${action.toUpperCase()}
📊 *Threshold:* >5 mentions or @everyone`
                );
            }

            // ==========================================
            // DISABLE
            // ==========================================

            if (subcmd === "off") {

                antitagSettings[from] = {
                    enabled: false,
                    action:
                        antitagSettings[from]?.action ||
                        "delete",
                    exempt:
                        antitagSettings[from]?.exempt || []
                };

                saveSettings();

                return reply(
                    "❌ *Antitag Disabled.*"
                );
            }
        }

        // ==========================================
        // 🛡️ EXEMPT
        // ==========================================

        if (subcmd === "exempt") {

            if (!antitagSettings[from]) {

                antitagSettings[from] = {
                    enabled: false,
                    action: "delete",
                    exempt: []
                };
            }

            antitagSettings[from].exempt =
                antitagSettings[from].exempt || [];

            // ==========================================
            // ADD
            // ==========================================

            if (
                param === "add" &&
                m.mentionedJid?.[0]
            ) {

                const originalTarget =
                    m.mentionedJid[0];

                const target =
                    normalizeJid(
                        originalTarget
                    );

                const exists =
                    antitagSettings[from]
                        .exempt
                        .some(
                            jid =>
                                normalizeJid(jid) ===
                                target
                        );

                if (!exists) {

                    antitagSettings[from]
                        .exempt
                        .push(
                            originalTarget
                        );

                    saveSettings();
                }

                return reply(
                    `✅ @${target.split("@")[0]} added to exempt list`,
                    {
                        mentions: [
                            originalTarget
                        ]
                    }
                );
            }

            // ==========================================
            // DELETE
            // ==========================================

            if (
                param === "del" &&
                m.mentionedJid?.[0]
            ) {

                const originalTarget =
                    m.mentionedJid[0];

                const target =
                    normalizeJid(
                        originalTarget
                    );

                antitagSettings[from].exempt =
                    antitagSettings[from]
                        .exempt
                        .filter(
                            jid =>
                                normalizeJid(jid) !==
                                target
                        );

                saveSettings();

                return reply(
                    `❌ @${target.split("@")[0]} removed from exempt list`,
                    {
                        mentions: [
                            originalTarget
                        ]
                    }
                );
            }

            // ==========================================
            // LIST
            // ==========================================

            if (param === "list") {

                const exempt =
                    antitagSettings[from]
                        .exempt || [];

                if (!exempt.length) {

                    return reply(
                        "🛡️ *Exempt List:*\n\nNo one exempt"
                    );
                }

                const list =
                    exempt
                        .map(
                            jid =>
                                `@${normalizeJid(jid).split("@")[0]}`
                        )
                        .join("\n");

                return reply(
`🛡️ *Exempt List:*

${list}`,
                    {
                        mentions: exempt
                    }
                );
            }
        }

        // ==========================================
        // 📊 CURRENT SETTINGS
        // ==========================================

        const current =
            antitagSettings[from]?.enabled
                ? `ON - ${(antitagSettings[from].action || "delete").toUpperCase()}`
                : "OFF";

        return reply(
`🛡️ *TEDDY-XMD Antitag Settings*

*Status:* ${current}

*Commands:*
.antitag on [delete/warn/kick]
.antitag off
.antitag exempt add @user
.antitag exempt del @user
.antitag exempt list`
        );

    } catch (err) {

        console.error(
            "❌ Antitag Cmd Error:",
            err
        );

        return reply(
            "❌ Error updating settings."
        );
    }
});

// ==========================================
// 2. ANTITAG WATCHER
// ==========================================

cmd({
    on: "main"
},

async (
    conn,
    mek,
    m,
    {
        from,
        isGroup,
        sender
    }
) => {

    try {

        // ==========================================
        // 👥 GROUP CHECK
        // ==========================================

        if (!isGroup) {
            return;
        }

        // ==========================================
        // ⚙️ GROUP SETTINGS
        // ==========================================

        const groupSetting =
            antitagSettings[from];

        if (
            !groupSetting ||
            !groupSetting.enabled
        ) {
            return;
        }

        // ==========================================
        // 👮 CHECK REAL ADMIN STATUS
        // ==========================================

        const permission =
            await getPermission(
                conn,
                from,
                sender
            );

        // ==========================================
        // 👑 REAL ADMINS / OWNER ARE EXEMPT
        // ==========================================

        if (
            permission.isOwner ||
            permission.isAdmin
        ) {
            return;
        }

        // ==========================================
        // 🛡️ EXEMPT LIST
        // ==========================================

        const senderNormalized =
            normalizeJid(sender);

        const exempt =
            groupSetting.exempt || [];

        const isExempt =
            exempt.some(
                jid =>
                    normalizeJid(jid) ===
                    senderNormalized
            );

        if (isExempt) {
            return;
        }

        // ==========================================
        // ⏱️ COOLDOWN
        // ==========================================

        const cooldownKey =
            getCooldownKey(
                from,
                sender
            );

        const now =
            Date.now();

        const lastAction =
            cooldown.get(
                cooldownKey
            );

        if (
            lastAction &&
            now - lastAction < 10000
        ) {
            return;
        }

        // ==========================================
        // 🔎 GET MESSAGE
        // ==========================================

        const msg =
            m.message;

        let mentions = [];

        // ==========================================
        // 📝 EXTENDED TEXT
        // ==========================================

        if (
            msg?.extendedTextMessage
                ?.contextInfo
                ?.mentionedJid
        ) {

            mentions =
                msg.extendedTextMessage
                    .contextInfo
                    .mentionedJid;
        }

        // ==========================================
        // 🖼️ IMAGE
        // ==========================================

        else if (
            msg?.imageMessage
                ?.contextInfo
                ?.mentionedJid
        ) {

            mentions =
                msg.imageMessage
                    .contextInfo
                    .mentionedJid;
        }

        // ==========================================
        // 🎥 VIDEO
        // ==========================================

        else if (
            msg?.videoMessage
                ?.contextInfo
                ?.mentionedJid
        ) {

            mentions =
                msg.videoMessage
                    .contextInfo
                    .mentionedJid;
        }

        // ==========================================
        // 📊 POLL
        // ==========================================

        else if (
            msg?.pollCreationMessageV3
                ?.contextInfo
                ?.mentionedJid
        ) {

            mentions =
                msg.pollCreationMessageV3
                    .contextInfo
                    .mentionedJid;
        }

        // ==========================================
        // 📋 LIST
        // ==========================================

        else if (
            msg?.listMessage
                ?.contextInfo
                ?.mentionedJid
        ) {

            mentions =
                msg.listMessage
                    .contextInfo
                    .mentionedJid;
        }

        // ==========================================
        // 📝 TEXT TAG DETECTION
        // ==========================================

        const text =
            m.body ||
            m.mtext ||
            "";

        const lowerText =
            String(text)
                .toLowerCase();

        const isTextTag =
            lowerText.includes("@everyone") ||
            lowerText.includes("@here") ||
            lowerText.includes("@all");

        // ==========================================
        // 🚨 MASS TAG DETECTION
        // ==========================================

        const isMassTag =
            mentions.length > 5 ||
            isTextTag;

        if (!isMassTag) {
            return;
        }

        // ==========================================
        // ⏱️ START COOLDOWN
        // ==========================================

        cooldown.set(
            cooldownKey,
            now
        );

        // ==========================================
        // 🗑️ DELETE MESSAGE
        // ==========================================

        await conn.sendMessage(
            from,
            {
                delete: mek.key
            }
        ).catch(() => {});

        // ==========================================
        // 🎯 ACTION
        // ==========================================

        const action =
            groupSetting.action ||
            "delete";

        let responseText = "";

        // ==========================================
        // ⚠️ WARN
        // ==========================================

        if (action === "warn") {

            responseText =
`⚠️ @${sender.split("@")[0]}, mass tagging is not allowed!
You have 10s cooldown before the next action.`;
        }

        // ==========================================
        // 🚫 KICK
        // ==========================================

        else if (action === "kick") {

            responseText =
`🚫 @${sender.split("@")[0]} was removed for mass tagging.`;

            await conn
                .groupParticipantsUpdate(
                    from,
                    [sender],
                    "remove"
                )
                .catch(() => {});
        }

        // ==========================================
        // 🗑️ DELETE
        // ==========================================

        else {

            responseText =
`🗑️ Mass tag deleted from @${sender.split("@")[0]}`;
        }

        // ==========================================
        // 📢 RESPONSE
        // ==========================================

        await conn.sendMessage(
            from,
            {
                text: responseText,
                mentions: [sender]
            }
        );

    } catch (err) {

        console.error(
            "❌ Antitag Watcher Error:",
            err
        );
    }
});