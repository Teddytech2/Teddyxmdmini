const { cmd } = require('../inconnuboy');
const config = require('../config');
const axios = require('axios');

const imgUrl = 'https://files.catbox.moe/13nyhx.jpg';
const readmore = "\u200e".repeat(4001);
const SUPPORT_URL = "https://teddyxmdsupport.onrender.com/";

cmd({
    pattern: "website", // CHANGED FROM support to website. "support" sometimes conflicts
    alias: ["site", "helpdesk", "panel"],
    desc: "Get TEDDY-XMD support website",
    category: "main",
    react: "🌐",
    filename: __filename
},
async (conn, mek, m, { from, sender, reply }) => {
    try {
        // ================= LOADING ANIMATION =================
        await conn.sendMessage(from, { text: `*TEDDY-XMD Loading...* ⏳` }, { quoted: mek });
        await new Promise(resolve => setTimeout(resolve, 2000));
        // =====================================================

        let text = `┏━━❐✧ *${config.BOT_NAME || 'TEDDY-XMD'} SUPPORT* ✧❐
┃✦ *Need Help?*
┃✦ *Report Bugs*
┃✦ *Request Features*
┃✦ *Download Updates*
┃✦ *Join Community*
┗❐${readmore}

┏━━❐ *OFFICIAL SUPPORT SITE* ❐
┃ ${SUPPORT_URL}
┗❐

_Click the link above to visit our support panel_
_⚡ Powered by ${config.BOT_NAME || 'TEDDY-XMD'}_`;

        let imageBuffer = null;
        try {
            imageBuffer = (await axios.get(imgUrl, { responseType: "arraybuffer", timeout: 5000 })).data;
        } catch {}

        await conn.sendMessage(from, {
            image: imageBuffer,
            caption: text,
            mentions: [sender],
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: config.NEWSLETTER_JID || "120363421104812135@newsletter",
                    newsletterName: config.OWNER_NAME || "TEDDY-XMD OFFICIAL",
                    serverMessageId: 1
                },
                externalAdReply: {
                    title: "TEDDY-XMD SUPPORT",
                    body: "King of Automation",
                    thumbnailUrl: imgUrl,
                    sourceUrl: SUPPORT_URL,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: mek }); // QUOTED MEK INSTEAD OF VCard

    } catch (e) {
        console.log(e);
        reply(`❌ Error: ${e.message}`);
    }
});
