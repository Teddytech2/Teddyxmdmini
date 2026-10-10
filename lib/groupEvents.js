const { isJidGroup } = require('@whiskeysockets/baileys');
const config = require('../config');
const { getUserConfigFromMongoDB, getGroupConfig } = require('./database');

const getContextInfo = (m) => {
    return {
        mentionedJid: [m.sender],
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: config.NEWSLETTER_JID,
            newsletterName: config.OWNER_NAME,
            serverMessageId: 143,
        },
    };
};

const groupEvents = async (conn, update, botNumber) => {
    try {
        if (!isJidGroup(update.id)) return;
        if (!['add', 'remove', 'promote', 'demote'].includes(update.action)) return;

        const userConfig = await getUserConfigFromMongoDB(botNumber || conn.user?.id?.split(':')[0] || '')
            .catch(() => ({}));

        const groupConfig = await getGroupConfig(botNumber || conn.user?.id?.split(':')[0] || '', update.id).catch(() => null);
        const welcomeEnabled = String(groupConfig?.WELCOME_ENABLE ?? userConfig.WELCOME_ENABLE ?? config.WELCOME_ENABLE ?? 'true') === 'true';
        const goodbyeEnabled = String(groupConfig?.GOODBYE_ENABLE ?? userConfig.GOODBYE_ENABLE ?? config.GOODBYE_ENABLE ?? 'true') === 'true';

        console.log(`[GROUP EVENT] ${update.action} in ${update.id}`, update.participants);

        const metadata = await conn.groupMetadata(update.id);
        const desc = metadata.desc || "No Description";
        const groupMembersCount = metadata.participants.length;

        let ppUrl;
        try {
            ppUrl = await conn.profilePictureUrl(update.id, 'image');
        } catch {
            ppUrl = config.IMAGE_PATH;
        }

        for (const num of update.participants) {
            const userName = num.split("@")[0];
            const timestamp = new Date().toLocaleString();

            // WELCOME
            if (update.action === "add" && welcomeEnabled && num !== conn.user?.id) {
                const welcomeMsg = (userConfig.WELCOME_MSG ?? config.WELCOME_MSG) || `╭───「 *WELCOME* 」
│
│ 👋 Hey @${userName}
│
├───「 *GROUP INFO* 」
│ 🏷️ Group: ${metadata.subject}
│ 👥 Members: ${groupMembersCount}
│ ⏰ Joined: ${timestamp}
│
├───「 *RULES* 」
│ 📜 ${desc}
│
╰───────────────
✨ Powered by ${config.BOT_NAME}`;

                await conn.sendMessage(update.id, {
                    image: { url: (userConfig.WELCOME_IMAGE ?? config.WELCOME_IMAGE) || ppUrl },
                    caption: welcomeMsg,
                    mentions: [num],
                    contextInfo: getContextInfo({ sender: num }),
                });
                console.log(`[WELCOME] Sent to ${userName}`);
            }

            // GOODBYE
            else if (update.action === "remove" && goodbyeEnabled) {
                const goodbyeMsg = (userConfig.GOODBYE_MSG ?? config.GOODBYE_MSG) || `╭───「 *GOODBYE* 」
│
│ 😔 @${userName} left
│
├───「 *INFO* 」
│ ⏰ Time: ${timestamp}
│ 👥 Members Left: ${groupMembersCount}
│
╰───────────────
✨ Powered by ${config.BOT_NAME}`;

                await conn.sendMessage(update.id, {
                    image: { url: (userConfig.GOODBYE_IMAGE ?? config.GOODBYE_IMAGE) || ppUrl },
                    caption: goodbyeMsg,
                    mentions: [num],
                    contextInfo: getContextInfo({ sender: num }),
                });
                console.log(`[GOODBYE] Sent for ${userName}`);
            }

            // DEMOTE
            else if (update.action === "demote" && config.ADMIN_EVENTS === "true") {
                const demoter = update.author.split("@")[0];
                const DemoteText = `╭───「 *ADMIN EVENT* 」
│
│ 👇 Demotion
│
├───「 *DETAILS* 」
│ 👤 By: @${demoter}
│ 🎯 Target: @${userName}
│ ⏰ Time: ${timestamp}
│ 🏷️ Group: ${metadata.subject}
│
╰───────────────
✨ Powered by ${config.BOT_NAME}`;

                await conn.sendMessage(update.id, {
                    text: DemoteText,
                    mentions: [update.author, num],
                    contextInfo: getContextInfo({ sender: update.author }),
                });
            }

            // PROMOTE
            else if (update.action === "promote" && config.ADMIN_EVENTS === "true") {
                const promoter = update.author.split("@")[0];
                const PromoteText = `╭───「 *ADMIN EVENT* 」
│
│ 🎉 Promotion
│
├───「 *DETAILS* 」
│ 👤 By: @${promoter}
│ 🎯 Target: @${userName}
│ ⏰ Time: ${timestamp}
│ 🏷️ Group: ${metadata.subject}
│
╰───────────────
✨ Powered by ${config.BOT_NAME}`;

                await conn.sendMessage(update.id, {
                    text: PromoteText,
                    mentions: [update.author, num],
                    contextInfo: getContextInfo({ sender: update.author }),
                });
            }
        }
    } catch (err) {
        console.error('Group event error:', err);
    }
};

module.exports = { groupEvents };
