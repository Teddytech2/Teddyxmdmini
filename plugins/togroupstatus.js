const { cmd } = require('../inconnuboy');
const { downloadContentFromMessage } = require('xzcbailz');

const FOOTER = '\n\n> TEDDY-XMD is fast';

cmd({
    pattern: "gstatus",
    alias: ["groupstatus", "gs"],
    react: "📡",
    category: "group",
    desc: "Upload a group status",
    filename: __filename
}, async (conn, mek, m, { from, q, reply, isGroup }) => {
    try {

        if (!isGroup) {
            return reply("*This command is for groups only.*" + FOOTER);
        }

        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
        const messageToProcess = quoted ? quoted : mek.message;

        if (!messageToProcess) {
            return reply("*Reply to media or add text to post a status.*" + FOOTER);
        }

        const type = Object.keys(messageToProcess)[0];
        const mime = messageToProcess[type]?.mimetype || '';

        const defaultCaption = `⚡ *Group Status Uploaded* ⚡\n_Via TEDDY-XMD_`;

        const downloadMedia = async (message, mediaType) => {
            const stream = await downloadContentFromMessage(message, mediaType);
            let buffer = Buffer.from([]);

            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            return buffer;
        };

        if (/image/.test(mime)) {

            const buffer = await downloadMedia(messageToProcess[type], 'image');

            await conn.sendMessage(from, {
                groupStatusMessage: {
                    image: buffer,
                    caption: q || defaultCaption
                }
            });

        } else if (/video/.test(mime)) {

            const buffer = await downloadMedia(messageToProcess[type], 'video');

            await conn.sendMessage(from, {
                groupStatusMessage: {
                    video: buffer,
                    caption: q || defaultCaption
                }
            });

        } else if (/audio/.test(mime)) {

            const buffer = await downloadMedia(messageToProcess[type], 'audio');

            await conn.sendMessage(from, {
                groupStatusMessage: {
                    audio: buffer,
                    mimetype: 'audio/mp4'
                }
            });

        } else if (q) {

            await conn.sendMessage(from, {
                groupStatusMessage: {
                    text: q
                }
            });

        } else {
            return reply("*Reply to media or add text to post a status.*" + FOOTER);
        }

        const successText = `*📡 TEDDY-XMD Status Upload*

╭───( \`TEDDY-XMD STATS\` )───
> ───≫ ⚡ Status ⚡ <<<───
> \`»\` Type : ${mime ? mime.split('/')[0].toUpperCase() : 'TEXT'}
> \`»\` Upload : SUCCESSFUL ✅
> \`»\` Server Time : ${new Date().toLocaleString()}
╰──────────────────☉

*Status has been deployed to the group feed.*`;

        await reply(successText + FOOTER);

    } catch (error) {
        console.log("GSTATUS ERROR:", error);
        reply(`*Error:* ${error.message}` + FOOTER);
    }
});
