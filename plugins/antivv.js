const { cmd } = require('../inconnuboy');
const { getContentType, downloadContentFromMessage } = require('xzcbailz');

global.ANTI_VIEWONCE = true;

cmd({
    pattern: "antiviewonce",
    desc: "Enable or Disable Anti ViewOnce",
    category: "settings",
    filename: __filename
}, async (conn, m, mek, { args, reply }) => {
    if (!args[0]) {
        return reply(`👁️ *ANTI VIEWONCE SETTINGS*

Status: ${global.ANTI_VIEWONCE? "✅ ON" : "❌ OFF"}

Usage:
.antiviewonce on
.antiviewonce off`);
    }

    const option = args[0].toLowerCase();
    if (option === "on") {
        global.ANTI_VIEWONCE = true;
        return reply("✅ Anti ViewOnce Enabled");
    }
    if (option === "off") {
        global.ANTI_VIEWONCE = false;
        return reply("❌ Anti ViewOnce Disabled");
    }
});

// AUTO RESTORE
cmd({
    on: "body"
},
async (conn, m, mek, { from }) => {
    try {
        if (!global.ANTI_VIEWONCE) return;
        if (!mek.message) return;

        const type = getContentType(mek.message);
        if (type!== "viewOnceMessageV2" && type!== "viewOnceMessage") return;

        const viewOnce = mek.message[type].message;
        const mediaType = getContentType(viewOnce);
        const media = viewOnce[mediaType];

        if (!media) return;

        const sender = mek.key.participant || mek.key.remoteJid;

        // Download the media first
        const stream = await downloadContentFromMessage(media, mediaType.replace('Message', '').toLowerCase());
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        if (mediaType === "imageMessage") {
            await conn.sendMessage(from, {
                image: buffer,
                mimetype: media.mimetype,
                caption: `👁️ *VIEW ONCE RESTORED*\n\n${media.caption || ''}`,
                mentions: [sender]
            }, { quoted: mek });
        }
        else if (mediaType === "videoMessage") {
            await conn.sendMessage(from, {
                video: buffer,
                mimetype: media.mimetype,
                caption: `👁️ *VIEW ONCE RESTORED*\n\n${media.caption || ''}`,
                mentions: [sender]
            }, { quoted: mek });
        }
        else if (mediaType === "audioMessage") {
            await conn.sendMessage(from, {
                audio: buffer,
                mimetype: "audio/mp4",
                ptt: media.ptt || false
            }, { quoted: mek });
        }

    } catch (err) {
        console.log("AntiViewOnce Error:", err);
    }
});
