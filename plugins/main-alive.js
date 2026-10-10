const { cmd, commands } = require('../inconnuboy');
const os = require("os");
const { runtime } = require('../lib/functions');
const config = require('../config');

cmd({
    pattern: "alive",
    alias: ["status", "live"],
    desc: "Check uptime and system status",
    category: "main",
    react: "🟢",
    filename: __filename
},
async (conn, mek, m, { from, sender, reply }) => {
    try {
        const totalCmds = commands.length;

        const status = `
╭━━━〔 🟢 *TEDDY-XMD STATUS* 〕━━━⬣
┃ 🤖 Bot: ${config.BOT_NAME || "TEDDY-XMD"}
┃ 👑 Owner: ${config.OWNER_NAME || "Teddy"}
┃ 🌐 Platform: Heroku
┃ 📦 Mode: ${config.MODE || "private"}
┃ 🔹 Prefix: ${config.PREFIX || "."}
┃ 🧩 Version: 1.0.0 Beta
┃ 📁 Commands: ${totalCmds}
┃ ⏱ Runtime: ${runtime(process.uptime())}
┃ 💻 RAM: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB
┃ ⚡ Status: Online
╰────────────────────────⬣

> TEDDY-XMD • King of Automation 🚀
`;

        await conn.sendMessage(from, {
            image: {
                url: "https://files.catbox.moe/5ffdce.jpeg"
            },
            caption: status,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true,

                forwardedNewsletterMessageInfo: {
                    newsletterJid: "120363421104812135@newsletter",
                    newsletterName: "TEDDY-XMD",
                    serverMessageId: 1
                },

                externalAdReply: {
                    title: "TEDDY-XMD",
                    body: "King of Automation 🚀",
                    thumbnailUrl: "https://files.catbox.moe/5ffdce.jpeg",
                    sourceUrl: "https://whatsapp.com/channel/0029Vb6NveDBPzjPa4vIRt3n",
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: mek });

        await conn.sendMessage(from, {
            text: "⚡ Choose an option below",
            footer: "TEDDY-XMD • King of Automation",
            title: "TEDDY-XMD OPTIONS",
            buttonText: "OPEN MENU",
            sections: [
                {
                    title: "BOT OPTIONS",
                    rows: [
                        {
                            title: "🤖 Pair Free Bot",
                            description: "Get your own TEDDY-XMD bot",
                            rowId: ".pair"
                        },
                        {
                            title: "📢 WhatsApp Channel",
                            description: "Join the official channel",
                            rowId: ".channel"
                        },
                        {
                            title: "👑 Owner",
                            description: "Contact the owner",
                            rowId: ".owner"
                        }
                    ]
                }
            ]
        }, { quoted: mek });

    } catch (e) {
        console.error("Error in alive command:", e);
        reply(`❌ An error occurred: ${e.message}`);
    }
});