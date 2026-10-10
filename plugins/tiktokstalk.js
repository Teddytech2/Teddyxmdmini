const axios = require("axios");
const { cmd } = require("../inconnuboy");

const NEWSLETTER_JID = "120363421104812135@newsletter";
const NEWSLETTER_NAME = "TEDDY-XMD";
const NEOSOFT_API = "https://api.neosoft.best/api/stalker/tiktok";

const getContextInfo = (query = "") => ({
  forwardingScore: 999,
  isForwarded: true,
  forwardedNewsletterMessageInfo: {
    newsletterJid: NEWSLETTER_JID,
    newsletterName: NEWSLETTER_NAME,
    serverMessageId: -1
  },
  body: query ? `Requested: ${query}` : undefined,
  title: NEWSLETTER_NAME
});

const formatNumber = (num) => {
  if (!num && num !== 0) return "0";
  return Number(num).toLocaleString();
};

cmd(
  {
    pattern: "tiktokstalk",
    alias: ["ttstalk", "stalk", "tiktokinfo"],
    react: "👤",
    desc: "Stalk TikTok user info",
    category: "stalker",
    filename: __filename,
    usage: ".tiktokstalk <username>"
  },
  async (conn, mek, m, { from, args, q, reply, react, prefix }) => {
    
    const username = q || args[0];
    if (!username) {
        return reply(`*Usage:* ${prefix}tiktokstalk kibet\n*Example:* ${prefix}tiktokstalk Im_kibet`);
    }

    try {
        await react("⏳");
        await reply(`*🔍 Searching TikTok profile: @${username}*`);

        const { data } = await axios.get(
            `${NEOSOFT_API}?username=${encodeURIComponent(username.replace('@',''))}`,
            { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' } }
        );

        if (!data?.status) {
            return reply(`❌ Profile @${username} not found.\n*Reason:* ${data.message || 'API error'}`);
        }

        const user = data;
        const stats = user.stats || {};
        
        const caption = 
`*👤 TIKTOK STALKER*\n\n` +
`╭───────────────◆\n` +
`│ 👤 Name: ${user.nickname || 'N/A'}\n` +
`│ 🆔 Username: @${user.username}\n` +
`│ 🆔 UserID: ${user.userId}\n` +
`│ ✅ Verified: ${user.verified ? 'Yes' : 'No'}\n` +
`│ 🔒 Private: ${user.privateAccount ? 'Yes' : 'No'}\n` +
`│ 📝 Bio: ${user.signature || 'No bio'}\n` +
`│ 📅 Joined: ${new Date(user.createdAt).toLocaleDateString()}\n` +
`╰────────────────◆\n\n` +
`*📊 STATS*\n` +
`╭───────────────◆\n` +
`│ ❤️ Likes: ${formatNumber(stats.hearts)}\n` +
`│ 👥 Followers: ${formatNumber(stats.followers)}\n` +
`│ 👤 Following: ${formatNumber(stats.following)}\n` +
`│ 👫 Friends: ${formatNumber(stats.friends)}\n` +
`│ 🎥 Videos: ${formatNumber(stats.videos)}\n` +
`╰────────────────◆\n\n` +
`🔗 Profile: ${user.profileUrl}`;

        await conn.sendMessage(from, {
            image: { url: user.avatar?.larger || user.avatar?.medium }, // use larger avatar
            caption: caption,
            contextInfo: {
              ...getContextInfo(username),
              externalAdReply: {
                title: `@${user.username}`,
                body: "TEDDY-XMD TikTok Stalker",
                thumbnailUrl: user.avatar?.medium,
                sourceUrl: user.profileUrl,
                mediaType: 1,
                renderLargerThumbnail: true
              }
            }
        }, { quoted: mek });

        await react("✅");

    } catch (error) {
        console.error('TikTok Stalk Error:', error.response?.data || error.message);
        await react("❌");
        return reply(`❌ Failed to fetch data.\n*Reason:* ${error.response?.data?.message || error.message}`);
    }
  }
);
