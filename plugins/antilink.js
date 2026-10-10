const {
  setAntiLink,
  getAntiLink,
  AntiLinkDB
} = require("../data/antilink");

module.exports = {
  name: "antilink",
  alias: ["nolink", "antigrplink"],
  desc: "Auto delete links in group. 3 warnings = kick",
  category: "group",
  react: "🚫",

  /*
   * ============================================================
   * CHECK IF USER IS GROUP ADMIN
   * ============================================================
   */
  isUserAdmin: async (conn, groupId, userId) => {
    try {
      const metadata = await conn.groupMetadata(groupId);

      const participant = metadata?.participants?.find(
        p => p.id === userId
      );

      if (!participant) return false;

      return (
        participant.admin === "admin" ||
        participant.admin === "superadmin"
      );
    } catch (error) {
      console.log(
        "Antilink user admin check error:",
        error.message
      );

      return false;
    }
  },

  /*
   * ============================================================
   * CHECK IF TEDDY-XMD IS GROUP ADMIN
   * ============================================================
   */
  isBotGroupAdmin: async (conn, groupId, botNumber) => {
    try {
      const metadata = await conn.groupMetadata(groupId);

      if (!metadata?.participants) {
        return false;
      }

      /*
       * Normalize bot JID.
       *
       * Handles:
       * 254799963583@s.whatsapp.net
       * 254799963583:12@s.whatsapp.net
       */
      const normalizeJid = jid => {
        if (!jid) return "";

        return String(jid)
          .replace(/:\d+(?=@)/, "")
          .trim();
      };

      const normalizedBot =
        normalizeJid(botNumber);

      const participant =
        metadata.participants.find(
          p =>
            normalizeJid(p.id) ===
            normalizedBot
        );

      if (!participant) {
        return false;
      }

      return (
        participant.admin === "admin" ||
        participant.admin === "superadmin"
      );

    } catch (error) {
      console.log(
        "Antilink bot admin check error:",
        error.message
      );

      return false;
    }
  },

  /*
   * ============================================================
   * COMMAND
   * ============================================================
   *
   * .antilink on
   * .antilink off
   * .antilink
   *
   */
  start: async (
    conn,
    mek,
    m,
    {
      isGroup,
      isAdmin,
      reply,
      text,
      botNumber
    }
  ) => {

    if (!isGroup) {
      return reply(
        "❌ This command can only be used in groups."
      );
    }

    /*
     * Verify actual admin status from WhatsApp.
     *
     * We don't rely only on the global isAdmin variable.
     */
    const sender =
      m.sender ||
      mek.key?.participant ||
      m.participant;

    let verifiedAdmin = false;

    if (sender) {
      verifiedAdmin =
        await module.exports.isUserAdmin(
          conn,
          m.from,
          sender
        );
    }

    /*
     * Keep compatibility with existing
     * TEDDY-XMD command handler.
     */
    if (!verifiedAdmin && !isAdmin) {
      return reply(
        "❌ *Admin only!*\n\n" +
        "Only group admins can change Antilink settings."
      );
    }

    const value =
      String(text || "")
        .trim()
        .toLowerCase();

    /*
     * ==========================================================
     * ENABLE
     * ==========================================================
     */
    if (value === "on") {

      await setAntiLink(
        botNumber,
        m.from,
        true,
        "warn",
        3
      );

      return reply(
        "✅ *Antilink enabled!*\n\n" +
        "🚫 Links are not allowed in this group.\n" +
        "⚠️ 3 warnings = kick.\n\n" +
        "👑 Group admins are exempt."
      );
    }

    /*
     * ==========================================================
     * DISABLE
     * ==========================================================
     */
    if (value === "off") {

      await setAntiLink(
        botNumber,
        m.from,
        false,
        "warn",
        3
      );

      return reply(
        "✅ *Antilink disabled!*"
      );
    }

    /*
     * ==========================================================
     * STATUS
     * ==========================================================
     */
    const settings =
      await getAntiLink(
        botNumber,
        m.from
      );

    return reply(
`*🚫 ANTILINK STATUS*

*Status:* ${
  settings?.status
    ? "ON ✅"
    : "OFF ❌"
}

*Punishment:* 3 Warnings = Kick

*Admins:* Exempt 👑

*Usage:*
.antilink on
.antilink off`
    );
  },

  /*
   * ============================================================
   * MESSAGE HANDLER
   * ============================================================
   *
   * This runs on incoming group messages.
   *
   * Behavior:
   *
   * Bot NOT admin:
   *   → Tell group to promote bot.
   *
   * Bot IS admin:
   *   → Delete member link.
   *   → Warn member.
   *   → Kick at 3 warnings.
   *
   * Group admin sends link:
   *   → Ignore.
   *
   */
  all: async (
    conn,
    mek,
    m,
    {
      isGroup,
      isBotAdmin,
      botNumber
    }
  ) => {

    /*
     * ==========================================================
     * GROUP ONLY
     * ==========================================================
     */
    if (!isGroup) return;

    /*
     * ==========================================================
     * CHECK ANTILINK SETTINGS
     * ==========================================================
     */
    const settings =
      await getAntiLink(
        botNumber,
        m.from
      );

    if (!settings?.status) {
      return;
    }

    /*
     * ==========================================================
     * IGNORE BOT'S OWN MESSAGE
     * ==========================================================
     */
    if (m.fromMe) {
      return;
    }

    /*
     * ==========================================================
     * GET SENDER
     * ==========================================================
     */
    const sender =
      m.sender ||
      mek.key?.participant ||
      m.participant;

    if (!sender) {
      return;
    }

    /*
     * ==========================================================
     * GET MESSAGE BODY
     * ==========================================================
     */
    const body =
      m.body ||
      m.text ||
      m.message?.conversation ||
      m.message?.extendedTextMessage?.text ||
      m.message?.imageMessage?.caption ||
      m.message?.videoMessage?.caption ||
      m.message?.documentMessage?.caption ||
      m.message?.documentWithCaptionMessage
        ?.message?.documentMessage?.caption ||
      "";

    if (!body) {
      return;
    }

    /*
     * ==========================================================
     * LINK DETECTION
     * ==========================================================
     */
    const linkRegex =
      /(chat\.whatsapp\.com|wa\.me|whatsapp\.com\/channel|whatsapp\.com\/invite|t\.me|telegram\.me|https?:\/\/|www\.|bit\.ly|tinyurl\.com|discord\.gg)/i;

    if (!linkRegex.test(body)) {
      return;
    }

    /*
     * ==========================================================
     * CHECK BOT ADMIN STATUS
     * ==========================================================
     *
     * This is intentionally done AFTER detecting a link.
     *
     * Therefore the bot will NOT spam:
     * "Promote me to admin"
     * on every normal message.
     */

    let botIsAdmin = false;

    try {
      botIsAdmin =
        await module.exports.isBotGroupAdmin(
          conn,
          m.from,
          botNumber
        );
    } catch (error) {
      botIsAdmin = false;
    }

    /*
     * ==========================================================
     * BOT IS NOT ADMIN
     * ==========================================================
     */

    if (!botIsAdmin && !isBotAdmin) {

      return await conn.sendMessage(
        m.from,
        {
          text:
            "⚠️ *TEDDY-XMD needs admin permission!*\n\n" +
            "Please promote me to *Group Admin* so I can:\n\n" +
            "• 🗑️ Delete links\n" +
            "• ⚠️ Warn link senders\n" +
            "• 🚫 Kick users after 3 warnings"
        },
        {
          quoted: mek
        }
      );
    }

    /*
     * ==========================================================
     * CHECK ACTUAL SENDER ADMIN STATUS
     * ==========================================================
     *
     * IMPORTANT:
     * We check WhatsApp group metadata directly.
     *
     * This prevents the plugin from accidentally warning
     * group admins when the global isAdmin value is wrong.
     */

    const senderIsAdmin =
      await module.exports.isUserAdmin(
        conn,
        m.from,
        sender
      );

    /*
     * Group admins are exempt.
     */
    if (senderIsAdmin) {
      return;
    }

    /*
     * ==========================================================
     * DELETE LINK MESSAGE
     * ==========================================================
     */

    try {

      await conn.sendMessage(
        m.from,
        {
          delete: mek.key
        }
      );

    } catch (deleteError) {

      console.log(
        "Antilink delete error:",
        deleteError.message
      );

      /*
       * Continue with warning even if deletion fails.
       */
    }

    /*
     * ==========================================================
     * DATABASE / WARNING SYSTEM
     * ==========================================================
     */

    try {

      /*
       * Get current warning record.
       */
      const record =
        await AntiLinkDB.findOne({
          userId: botNumber,
          chatId: m.from
        });

      /*
       * Warning object:
       *
       * {
       *   "254700000000@s.whatsapp.net": 1,
       *   "254711111111@s.whatsapp.net": 2
       * }
       */
      let warnings =
        record?.warnings || {};

      /*
       * Increase sender warning.
       */
      warnings[sender] =
        (warnings[sender] || 0) + 1;

      const currentWarn =
        warnings[sender];

      const warnLimit =
        Number(
          settings.warnLimit || 3
        );

      /*
       * ========================================================
       * KICK USER
       * ========================================================
       */

      if (
        currentWarn >= warnLimit
      ) {

        try {

          await conn.groupParticipantsUpdate(
            m.from,
            [sender],
            "remove"
          );

        } catch (kickError) {

          console.log(
            "Antilink kick error:",
            kickError.message
          );

          /*
           * Keep the warning in DB.
           */
          await AntiLinkDB.findOneAndUpdate(
            {
              userId: botNumber,
              chatId: m.from
            },
            {
              $set: {
                warnings
              }
            },
            {
              upsert: true
            }
          );

          return await conn.sendMessage(
            m.from,
            {
              text:
                `⚠️ @${sender.split("@")[0]} reached ${warnLimit}/${warnLimit} warnings.\n\n` +
                "❌ I couldn't kick the user.\n" +
                "Please make sure TEDDY-XMD is a group admin.",
              mentions: [sender]
            }
          );
        }

        /*
         * Reset this user's warnings after kick.
         */
        delete warnings[sender];

        await AntiLinkDB.findOneAndUpdate(
          {
            userId: botNumber,
            chatId: m.from
          },
          {
            $set: {
              warnings
            }
          },
          {
            upsert: true
          }
        );

        return await conn.sendMessage(
          m.from,
          {
            text:
              `🚫 @${sender.split("@")[0]} *kicked!*\n\n` +
              `📛 Reason: Sent ${warnLimit} links\n` +
              "🛡️ Antilink protection",
            mentions: [sender]
          }
        );
      }

      /*
       * ========================================================
       * SAVE WARNING
       * ========================================================
       */

      await AntiLinkDB.findOneAndUpdate(
        {
          userId: botNumber,
          chatId: m.from
        },
        {
          $set: {
            warnings
          }
        },
        {
          upsert: true
        }
      );

      /*
       * ========================================================
       * WARNING MESSAGE
       * ========================================================
       */

      const remaining =
        Math.max(
          warnLimit - currentWarn,
          0
        );

      await conn.sendMessage(
        m.from,
        {
          text:
            `⚠️ @${sender.split("@")[0]} *links are not allowed!*\n\n` +
            `⚠️ Warning: *${currentWarn}/${warnLimit}*\n` +
            `🚫 Remaining: *${remaining}*\n\n` +
            `Next ${remaining} link(s) = Kick`,
          mentions: [sender]
        },
        {
          quoted: mek
        }
      );

    } catch (error) {

      console.log(
        "❌ Antilink warning/database error:",
        error.message
      );
    }
  }
};

