const { cmd } = require('../inconnuboy');
const config = require('../config');
const os = require('os');
const process = require('process');
const axios = require('axios');

const imgUrl = 'https://files.catbox.moe/zp99ie.jpg';
const readmore = "\u200e".repeat(4001);

//===================== PING =====================//
cmd({
    pattern: "ping",
    desc: "Check bot latency",
    category: "general",
    react: "⚡",
    filename: __filename
},
async (conn, mek, m, { from, sender, reply }) => {
    try {
        // ================= LOADING ANIMATION =================
        await conn.sendMessage(from, { text: `*TEDDY-XMD Loading...* ⏳` }, { quoted: mek });
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2s like menu
        // =====================================================

        const start = Date.now();
        await conn.sendPresenceUpdate('composing', from);
        const ping = Date.now() - start;

        let text = `┏━━❐✧ *${config.BOT_NAME || 'TEDDY-XMD'} SPEED* ✧❐
┃✦ *Status:* Online ✅
┃✦ *Latency:* ${ping}ms
┃✦ *Platform:* ${os.platform()}
┃✦ *RAM:* ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB
┃✦ *User:* @${sender.split('@')[0]}
┗❐${readmore}

_⚡ Powered by ${config.BOT_NAME || 'TEDDY-XMD'}_`;

        let imageBuffer = null;
        try {
            imageBuffer = (await axios.get(imgUrl, { responseType: "arraybuffer", timeout: 5000 })).data;
        } catch {}

        await conn.sendMessage(from, {
            image: imageBuffer, // IMAGE HEADER LIKE MENU
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
                }
            }
        }, { quoted: mek });

    } catch (e) {
        console.log(e);
        reply(`❌ Error: ${e.message}`);
    }
});

//===================== ALIVE =====================//
cmd({
    pattern: "alive",
    alias: ["status", "live"],
    desc: "Check if bot is alive",
    category: "general",
    react: "🤖",
    filename: __filename
},
async (conn, mek, m, { from, sender, reply }) => {
    try {
        // ================= LOADING ANIMATION =================
        await conn.sendMessage(from, { text: `*TEDDY-XMD Loading...* ⏳` }, { quoted: mek });
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2s like menu
        // =====================================================

        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);

        const start = Date.now();
        await conn.sendPresenceUpdate('composing', from);
        const ping = Date.now() - start;

        let text = `┏━━❐✧ *${config.BOT_NAME || 'TEDDY-XMD'} STATUS* ✧❐
┃✦ *Status:* Online ✅
┃✦ *Owner:* ${config.OWNER_NAME || "Teddy Tech"}
┃✦ *Prefix:* ${config.PREFIX || "."}
┃✦ *Mode:* ${config.MODE || "private"}
┃✦ *Uptime:* ${hours}h ${minutes}m ${seconds}s
┃✦ *Latency:* ${ping}ms
┃✦ *RAM:* ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB
┃✦ *Platform:* ${os.platform()}
┃✦ *User:* @${sender.split('@')[0]}
┗❐${readmore}

_⚡ Powered by ${config.BOT_NAME || 'TEDDY-XMD'}_`;

        let imageBuffer = null;
        try {
            imageBuffer = (await axios.get(imgUrl, { responseType: "arraybuffer", timeout: 5000 })).data;
        } catch {}

        await conn.sendMessage(from, {
            image: imageBuffer, // IMAGE HEADER LIKE MENU
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
                }
            }
        }, { quoted: mek });

    } catch (e) {
        console.log("ALIVE ERROR:", e);
        reply(`❌ Error: ${e.message}`);
    }
});
