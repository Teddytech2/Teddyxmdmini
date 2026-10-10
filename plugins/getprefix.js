const { getUserConfig } = require('../lib/database');

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
    command: 'getprefix',
    alias: ['prefix', 'gp'],
    desc: 'Check current bot prefix',
    category: 'info',
    use: '.getprefix',
    react: '📌',
    ownerOnly: false,
    filename: __filename,

    async function(conn, mek, m, { from, reply, botNumber }) {
        try {
            const cfg = await getUserConfig(botNumber);
            const currentPrefix = cfg.PREFIX || '.';
            const nullStatus = cfg.NULL_PREFIX === 'true'? 'ON' : 'OFF';

            await conn.sendMessage(from, {
                text: `╭━━━〔 *TEDDY-XMD PREFIX* 〕━━━╮
│
│ 📌 *CURRENT PREFIX:* ${currentPrefix}
│ 🔘 *NULL PREFIX:* ${nullStatus}
│ 💡 *EXAMPLE:* ${currentPrefix}menu or menu
│ ⚙️ *CHANGE:* ${currentPrefix}setprefix <new>
│
╰━━━〔 *POWERED BY TEDDY-XMD* 〕━━━╯
*Channel:* https://whatsapp.com/channel/0029Vb6NveDBPzjPa4vIRt3n`,
                contextInfo
            }, { quoted: mek });

        } catch (e) {
            console.error(e);
            await reply(`❌ Error getting prefix: ${e.message}`);
        }
    }
};