const { cmd } = require('../inconnuboy');
const config = require('../config');

cmd({
    pattern: "owner",
    alias: ["developer", "teddy", "creator"],
    desc: "Get information about the bot owner",
    category: "main",
    react: "👑",
    filename: __filename
},
async (conn, mek, m, { from, reply, pushname }) => {
    try {
        const ownerNumber = config.OWNER_NUMBER || "254799963583"; // read from config
        const ownerName = config.OWNER_NAME || "Teddy";
        const ownerOrg = "Teddy Tech AI Labs";
        const githubProfile = "https://github.com/Teddytech1";
        const channelLink = config.CHANNEL_LINK || "https://whatsapp.com/channel/0029Vb6NveDBPzjPa4vIRt3n";
        const profilePic = "https://files.catbox.moe/13nyhx.jpg";

        // vCard format
        const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${ownerName}
ORG:${ownerOrg};
TEL;type=CELL;type=VOICE;waid=${ownerNumber}:+${ownerNumber}
URL:${githubProfile}
URL:${channelLink}
END:VCARD`;

        let ownerMsg = `╭───「 *👑 TEDDY-XMD OWNER* 」───⬣
│
│ 👤 *Name:* ${ownerName}
│ 🌍 *Location:* Kenya 🇰🇪
│ 💻 *Role:* Full-Stack Developer
│ 🏢 *Org:* ${ownerOrg}
│ 📞 *Number:* +${ownerNumber}
│ 🔗 *GitHub:* ${githubProfile}
│ 📢 *Channel:* ${channelLink}
│
│ > *Contact me for scripts, deployment, or support* ⚡
╰────────────────────────⬣`;

        // 1. Send Contact Card
        await conn.sendMessage(from, {
            contacts: {
                displayName: ownerName,
                contacts: [{ vcard }]
            }
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: "👑", key: mek.key } });

        // 2. Send Image with buttons
        await conn.sendMessage(from, {
            image: { url: profilePic },
            caption: ownerMsg,
            contextInfo: {
                mentionedJid: [m.sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: config.NEWSLETTER_JID || '120363421104812135@newsletter',
                    newsletterName: 'TEDDY-XMD',
                    serverMessageId: 1
                }
            },
            buttons: [
                {buttonId: `https://wa.me/${ownerNumber}`, buttonText: {displayText: '💬 CHAT OWNER'}, type: 1},
                {buttonId: githubProfile, buttonText: {displayText: '💻 GITHUB'}, type: 1}
            ],
            headerType: 1
        }, { quoted: mek });

    } catch (e) {
        console.log("OWNER CMD ERROR:", e);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
        reply("❌ *Could not fetch owner information.*");
    }
});
