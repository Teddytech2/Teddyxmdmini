const { cmd } = require('../inconnuboy');

cmd({
    pattern: "getpp",
    alias: ["pp", "profile", "dp", "getdp"],
    desc: "Fetch profile picture of user",
    category: "tools",
    react: "🖼️",
    filename: __filename
},
async (conn, mek, m, { from, q, reply, sender }) => {
    try {
        let target;

        // 1. Reply target
        const quotedJid = mek.message?.extendedTextMessage?.contextInfo?.participant;
        // 2. Mention target
        const mentionedJid = mek.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        // 3. Number target
        // 4. Self target

        if (quotedJid) target = quotedJid;
        else if (mentionedJid.length > 0) target = mentionedJid[0];
        else if (q) {
            const num = q.replace(/[^0-9]/g, '');
            if (num.length < 7) return reply("❌ *Please provide a valid number.*");
            target = `${num}@s.whatsapp.net`;
            const exists = await conn.onWhatsApp(target);
            if (!exists || exists.length === 0) return reply("❌ *User is not on WhatsApp.*");
        } else {
            target = mek.key.participant || mek.key.remoteJid;
        }

        await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });

        let ppUrl;
        try {
            ppUrl = await conn.profilePictureUrl(target, 'image');
        } catch {
            ppUrl = 'https://files.catbox.moe/13nyhx.jpg'; // default bot dp
        }

        const userNumber = target.split('@')[0];
        const isGroup = target.endsWith('@g.us');

        const caption = `╭───「 *TEDDY-XMD PP* 」───⬣
│
│ 👤 *User:* @${userNumber}
│ 🏷️ *Type:* ${isGroup? 'Group' : 'User'}
│ 📂 *Status:* Successfully Retrieved
│ 🛡️ *Source:* WhatsApp Servers
│
╰────────────────────────⬣
> *Powered by TEDDY-XMD*`;

        await conn.sendMessage(from, {
            image: { url: ppUrl },
            caption,
            mentions: [target],
            buttons: [
                {buttonId: 'getpp', buttonText: {displayText: '🔄 REFRESH'}, type: 1},
                {buttonId: `https://wa.me/${userNumber}`, buttonText: {displayText: '💬 CHAT'}, type: 1}
            ],
            headerType: 1
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (err) {
        console.log("GETPP ERROR:", err);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
        reply("❌ *Failed to fetch profile picture.*\n\nThe user may have hidden their profile photo or blocked the bot.");
    }
});
