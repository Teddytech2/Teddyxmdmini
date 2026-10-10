const { getUserConfig, updateUserConfig } = require('../lib/database');

const contextInfo = {
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
        newsletterJid: '120363421104812135@newsletter',
        newsletterName: 'TEDDY-XMD',
        serverMessageId: -1
    }
};

module.exports = {
    command: 'resetprefix',
    alias: ['rp', 'defaultprefix'],
    desc: 'Reset bot prefix to default.',
    category: 'owner',
    use: '.resetprefix',
    react: '🔄',
    ownerOnly: true,
    filename: __filename,

    async function(conn, mek, m, { from, reply, botNumber }) {
        try {
            const cfg = await getUserConfig(botNumber);
            const oldPrefix = cfg.PREFIX || '.';

            cfg.PREFIX = '.';
            await updateUserConfig(botNumber, cfg);
            global.prefix = '.'; // update runtime

            await reply(`╭━━━〔 *PREFIX RESET* 〕━━━╮
│
│ ✅ *OLD PREFIX:* ${oldPrefix}
│ ✅ *NEW PREFIX:*.
│ 💾 *Saved to MongoDB*
│ 🔄 *No restart needed*
│
│ *USAGE NOW:*.menu
╰━━━━━━━━━━╯`);

        } catch (e) {
            console.error(e);
            await reply(`❌ Error: ${e.message}`);
        }
    }
};