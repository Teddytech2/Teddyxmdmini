const { cmd } = require('../inconnuboy');

cmd({
    pattern: 'antidelete',
    alias: ['antidel', 'nodelete', 'atd'],
    desc: 'Anti-delete is always enabled',
    category: 'owner',
    react: '🛡️',
    use: '.antidelete',
    filename: __filename
}, async (conn, mek, m, { isOwner, reply }) => {

    if (!isOwner) {
        return reply('*❌ This command is for owner only*');
    }

    return reply(
        '*🛡️ ANTI-DELETE*\n\n' +
        '*Status:* ON ✅\n\n' +
        'Deleted messages will automatically be recovered ' +
        'and sent to the bot owner.\n\n' +
        '*⚡ TEDDY-XMD*'
    );
});
