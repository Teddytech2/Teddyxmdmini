const { cmd } = require("../inconnuboy");

const NEWSLETTER_JID = "120363421104812135@newsletter";
const NEWSLETTER_NAME = "TEDDY-XMD";

cmd(
  {
    pattern: "channelreact",
    alias: ["creact", "creaction", "reactchannel"],
    react: "😊",
    desc: "React to a channel post with multiple emojis",
    category: "owner",
    filename: __filename,
    usage: ".channelreact <channel_jid> <post_id> <emojis>"
  },
  async (conn, mek, m, { from, args, q, reply, react, isOwner }) => {
    
    if (!isOwner) return reply("❌ Only Owner can use this command");

    const [channelJid, postId, ...emojiArr] = args;
    const emojis = emojiArr.join(" ").split(" ").filter(e => e);

    if (!channelJid || !postId || emojis.length === 0) {
        return reply(`*Usage:* ${prefix}channelreact <channel_jid> <post_id> <emojis>\n\n*Example:* ${prefix}channelreact 0029Vb6NveDBPzjPa4vIRt3n 737 ❤️ 👍 🔥`);
    }

    // If user pasted full channel link, extract JID
    let channel = channelJid;
    if (channelJid.includes("whatsapp.com/channel")) {
        channel = channelJid.split("/").pop();
    }
    if (!channel.includes("@")) {
        channel = channel + "@newsletter"; // convert to JID
    }

    try {
        await react("⏳");
        await reply(`*Reacting to post ${postId} in ${channel}*\nEmojis: ${emojis.join(" ")}`);

        let successCount = 0;
        let failedCount = 0;

        // Loop through all emojis and react
        for (let emoji of emojis) {
            try {
                await conn.sendMessage(channel, {
                    react: { 
                        text: emoji, 
                        key: { 
                            remoteJid: channel, 
                            fromMe: false, 
                            id: postId 
                        } 
                    }
                });
                successCount++;
                await new Promise(r => setTimeout(r, 500)); // 0.5s delay to avoid ban
            } catch (e) {
                console.log("React error:", e);
                failedCount++;
            }
        }

        await react("✅");
        
        const caption = 
`✅ *Reactions sent successfully!*\n\n` +
`📊 *Details:*\n` +
`🎯 *Channel:* ${channel}\n` +
`📝 *Post:* ${postId}\n` +
`😊 *Emojis:* ${emojis.join(" ")}\n` +
`🖥️ 🌐 *Success:* ${successCount} | *Failed:* ${failedCount}`;

        await reply(caption);

    } catch (error) {
        console.error('Channel React Error:', error);
        await react("❌");
        return reply(`❌ Failed to react.\n*Reason:* ${error.message}`);
    }
  }
);
