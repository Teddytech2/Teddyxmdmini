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
    command: 'setprefix',
    alias: ['prefix', 'sp'],
    desc: 'Change bot prefix. Use "none" for no prefix',
    category: 'owner',
    use: '.setprefix!',
    react: '⚙️',
    ownerOnly: true,
    filename: __filename,

    async function(conn, mek, m, { from, args, reply, botNumber }) {
        if (!args[0]) {
            const cfg = await getUserConfig(botNumber);
            return reply(`╭━━━〔 *SET PREFIX* 〕━━━╮
│
│ *CURRENT PREFIX:* ${cfg.PREFIX || '.'}
│ *NULL MODE:* ${cfg.NULL_PREFIX === 'true'? 'ON' : 'OFF'}
│ *USAGE:* ${cfg.PREFIX || '.'}setprefix!
│ *EXAMPLE 1:* ${cfg.PREFIX || '.'}setprefix#
│ *EXAMPLE 2:* ${cfg.PREFIX || '.'}setprefix none
╰━━━━━━━━━━╯`);
        }

        try {
            const cfg = await getUserConfig(botNumber);
            let newPrefix = args[0];

            if(newPrefix.toLowerCase() === 'none'){
                cfg.PREFIX = '';
                cfg.NULL_PREFIX = 'true';
                await updateUserConfig(botNumber, cfg);
                return reply(`╭━━━〔 *NULL PREFIX ENABLED* 〕━━━╮
│
│ ✅ *PREFIX REMOVED*
│ ✅ *Now use commands without.*
│ 💡 *EXAMPLE:* menu ping help
│ 💾 *Saved to MongoDB*
╰━━━━━━━━━━━━━━╯`);
            }

            if (newPrefix.length > 3) return reply('❌ Prefix too long. Max 3 characters.');

            cfg.PREFIX = newPrefix;
            cfg.NULL_PREFIX = 'false'; // turn off null mode
            await updateUserConfig(botNumber, cfg);
            global.prefix = newPrefix;

            await reply(`╭━━━〔 *PREFIX UPDATED* 〕━━━╮
│
│ ✅ *NEW PREFIX:* ${newPrefix}
│ 🔘 *NULL MODE:* OFF
│ 💾 *Saved to MongoDB*
│ 🔄 *No restart needed*
╰━━━━━━━━━━╯`);

        } catch (e) {
            console.error(e);
            await reply(`❌ Error: ${e.message}`);
        }
    }
};