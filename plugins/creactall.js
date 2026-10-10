const { cmd } = require("../inconnuboy");

cmd(
  {
    pattern: "channelreactall",
    alias: [
      "creactall",
      "creactionall",
      "reactall"
    ],
    react: "🔥",
    desc: "React to channel posts",
    category: "owner",
    filename: __filename,
    usage: "channelreactall <channel_jid> <count> <emojis>"
  },

  async (
    conn,
    mek,
    m,
    {
      from,
      args,
      q,
      reply,
      react,
      isCreator,
      isOwner,
      sender
    }
  ) => {

    try {

      // ==========================================
      // 👑 OWNER CHECK
      // ==========================================

      const owner =
        Boolean(isCreator || isOwner);

      if (!owner) {
        return reply(
          "❌ *Owner only command.* 👑"
        );
      }

      // ==========================================
      // 📋 ARGUMENTS
      // ==========================================

      const channelInput =
        args?.[0];

      const countInput =
        args?.[1];

      const emojiInput =
        args?.slice(2) || [];

      const count =
        parseInt(countInput) || 5;

      // ==========================================
      // 😀 EMOJIS
      // ==========================================

      const emojis =
        emojiInput
          .join(" ")
          .split(/\s+/)
          .filter(Boolean);

      // ==========================================
      // ❌ INPUT VALIDATION
      // ==========================================

      if (
        !channelInput ||
        emojis.length === 0
      ) {

        return reply(
`┏━━❐✧ *CHANNEL REACT ALL* ✧❐
┃
┃ 📌 *Usage:*
┃ channelreactall <channel> <count> <emojis>
┃
┃ 💡 *Example:*
┃ channelreactall
┃ 0029Vb6NveDBPzjPa4vIRt3n
┃ 10 ❤️ 👍 🔥 😍 😂
┃
┃ 🔢 *Maximum:* 50 posts
┃
┗❐`
        );
      }

      // ==========================================
      // 🔢 COUNT LIMIT
      // ==========================================

      if (
        count < 1 ||
        count > 50
      ) {

        return reply(
          "❌ *Count must be between 1 and 50.* 🔢"
        );
      }

      // ==========================================
      // 📢 CHANNEL JID
      // ==========================================

      let channel =
        channelInput.trim();

      if (
        channel.includes(
          "whatsapp.com/channel/"
        )
      ) {

        channel =
          channel
            .split("/")
            .pop()
            .split("?")[0];
      }

      if (
        !channel.includes("@")
      ) {

        channel +=
          "@newsletter";
      }

      // ==========================================
      // ⏳ START
      // ==========================================

      await react("⏳");

      await reply(
`⏳ *CHANNEL REACT ALL*

📢 *Channel:* ${channel}
📝 *Posts:* ${count}
😀 *Emojis:* ${emojis.join(" ")}

🔍 *Checking channel information...*`
      );

      // ==========================================
      // 📡 CHANNEL METADATA
      // ==========================================

      const metadata =
        await conn.newsletterMetadata(
          channel.replace(
            "@newsletter",
            ""
          ),
          "invite"
        );

      if (!metadata) {

        await react("❌");

        return reply(
          "❌ *Channel not found or unavailable.* 📢"
        );
      }

      /*
       * IMPORTANT:
       *
       * newsletterMetadata() does NOT provide a
       * guaranteed sequential list of all channel
       * post message IDs.
       *
       * Therefore we don't pretend that:
       *
       * lastMessageId - 1
       *
       * is necessarily the previous post.
       */

      const preview =
        metadata.preview || [];

      if (!preview.length) {

        await react("❌");

        return reply(
          "❌ *No channel posts were returned by WhatsApp.*"
        );
      }

      // ==========================================
      // 📝 AVAILABLE POSTS
      // ==========================================

      const posts =
        preview
          .slice(0, count)
          .filter(post => post?.id);

      if (!posts.length) {

        await react("❌");

        return reply(
          "❌ *Couldn't obtain valid channel post IDs.*"
        );
      }

      // ==========================================
      // 🔥 REACT
      // ==========================================

      let successPosts = 0;
      let totalReacts = 0;

      for (
        const post of posts
      ) {

        let postSuccess = false;

        for (
          const emoji of emojis
        ) {

          try {

            await conn.sendMessage(
              channel,
              {
                react: {
                  text: emoji,

                  key: {
                    remoteJid:
                      channel,

                    fromMe: false,

                    id: post.id
                  }
                }
              }
            );

            totalReacts++;
            postSuccess = true;

            await new Promise(
              resolve =>
                setTimeout(
                  resolve,
                  1000
                )
            );

          } catch (error) {

            console.log(
              `❌ React failed ${post.id}:`,
              error?.message ||
              error
            );
          }
        }

        if (postSuccess) {
          successPosts++;
        }

        await new Promise(
          resolve =>
            setTimeout(
              resolve,
              1200
            )
        );
      }

      // ==========================================
      // ✅ COMPLETE
      // ==========================================

      await react("✅");

      return reply(
`╭━━〔 🔥 *CHANNEL REACT ALL* 〕━━╮
┃
┃ ✅ *Completed*
┃
┃ 📢 *Channel:* ${channel}
┃ 📝 *Posts:* ${successPosts}/${posts.length}
┃ 😀 *Emojis:* ${emojis.join(" ")}
┃ 💥 *Reactions Sent:* ${totalReacts}
┃
┃ ⚡ *TEDDY-XMD*
╰━━━━━━━━━━━━━━━━━━╯`
      );

    } catch (error) {

      console.error(
        "❌ CHANNEL REACT ALL ERROR:",
        error
      );

      try {
        await react("❌");
      } catch (_) {}

      return reply(
`┏━━❐✧ *CHANNEL REACT ALL* ✧❐
┃
┃ ❌ *Status:* Failed
┃
┃ ⚠️ *Reason:*
┃ ${error?.message || error}
┃
┗❐`
      );
    }
  }
);
