const { sendInteractiveMessage } = require('gifted-btns');
const { cmd } = require('../inconnuboy');
const config = require('../config');

const readmore = "\u200e".repeat(4001);

const MENU_IMAGE = "https://files.catbox.moe/zp99ie.jpg";

const runtime = (seconds) => {
    seconds = Number(seconds);

    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    return `${d}d ${h}h ${m}m ${s}s`;
};

cmd(
    {
        pattern: "menu",
        alias: [
            "help",
            "m",
            "list",
            "commands"
        ],
        react: "⚡",
        category: "menu",
        desc: "Show full bot command list",
        filename: __filename
    },

    async (
        conn,
        mek,
        m,
        {
            from,
            prefix
        }
    ) => {

        try {

            const botName =
                config.BOT_NAME || "TEDDY-XMD";

            const usedPrefix =
                prefix || config.PREFIX || ".";

            // ==========================================
            // GET THE REAL COMMAND SENDER
            // ==========================================

            let sender = "";

            /*
             * GROUP MESSAGE
             *
             * In a normal Baileys group message:
             * mek.key.remoteJid = GROUP JID
             * mek.key.participant = PERSON WHO SENT MESSAGE
             *
             * Therefore participant must be checked first.
             */

            if (
                mek?.key?.participant &&
                typeof mek.key.participant === "string"
            ) {
                sender = mek.key.participant;
            }

            /*
             * Some newer Baileys message structures expose
             * the phone JID through senderPn.
             */

            if (
                !sender &&
                mek?.key?.senderPn &&
                typeof mek.key.senderPn === "string"
            ) {
                sender = mek.key.senderPn;
            }

            /*
             * Your command handler may also expose the sender
             * through m.sender.
             */

            if (
                !sender &&
                m?.sender &&
                typeof m.sender === "string"
            ) {
                sender = m.sender;
            }

            /*
             * Other possible wrapper fields.
             */

            if (
                !sender &&
                m?.participant &&
                typeof m.participant === "string"
            ) {
                sender = m.participant;
            }

            if (
                !sender &&
                mek?.participant &&
                typeof mek.participant === "string"
            ) {
                sender = mek.participant;
            }

            /*
             * PRIVATE CHAT
             *
             * There is no group participant in a private chat,
             * so remoteJid is the person who sent the command.
             */

            if (
                !sender &&
                mek?.key?.remoteJid &&
                typeof mek.key.remoteJid === "string" &&
                !mek.key.remoteJid.endsWith("@g.us") &&
                !mek.key.remoteJid.endsWith("@broadcast")
            ) {
                sender = mek.key.remoteJid;
            }

            // ==========================================
            // CLEAN SENDER JID
            // ==========================================

            if (typeof sender !== "string") {
                sender = "";
            }

            /*
             * Handle device JIDs such as:
             *
             * 254799963583:12@s.whatsapp.net
             *
             * Convert them to:
             *
             * 254799963583@s.whatsapp.net
             */

            if (
                sender.includes(":") &&
                sender.includes("@s.whatsapp.net")
            ) {
                const numberPart =
                    sender.split(":")[0];

                sender =
                    `${numberPart}@s.whatsapp.net`;
            }

            // ==========================================
            // SENDER NUMBER
            // ==========================================

            const senderNumber =
                sender.includes("@")
                    ? sender
                        .split("@")[0]
                        .split(":")[0]
                    : sender || "User";

            // ==========================================
            // MENTIONS
            // ==========================================

            const mentions =
                sender.includes("@")
                    ? [sender]
                    : [];

            const uptimeStr =
                runtime(process.uptime());

            const workType =
                config.WORK_TYPE || "PUBLIC";

            // ==========================================
            // REACTION
            // ==========================================

            try {

                await conn.sendMessage(
                    from,
                    {
                        react: {
                            text: "⚡",
                            key: mek.key
                        }
                    }
                );

            } catch (e) {

                console.log(
                    "Menu reaction error:",
                    e.message
                );

            }

            // ==========================================
            // LOADING
            // ==========================================

            try {

                await conn.sendMessage(
                    from,
                    {
                        text:
                            `*${botName} Loading...* ⏳`
                    },
                    {
                        quoted: mek
                    }
                );

            } catch (e) {

                console.log(
                    "Menu loading error:",
                    e.message
                );

            }

            await new Promise(
                resolve => setTimeout(resolve, 1200)
            );

            // ==========================================
            // MENU TEXT
            // ==========================================

            const menuMsg =
`┏━━❐✧ *${botName}* ✧❐
┃
┃ 👤 *User:* @${senderNumber}
┃ ⚡ *Prefix:* [${usedPrefix}]
┃ 🤖 *Mode:* ${workType}
┃ ⏱️ *Uptime:* ${uptimeStr}
┃
┗❐${readmore}

┏━━❐ *AI* ❐
┃ ✧ ${usedPrefix}ai
┃ ✧ ${usedPrefix}aivid
┗❐

┏━━❐ *AUDIO* ❐
┃ ✧ ${usedPrefix}tomp3
┃ ✧ ${usedPrefix}toptt
┗❐

┏━━❐ *CONVERT* ❐
┃ ✧ ${usedPrefix}s
┃ ✧ ${usedPrefix}tiny
┗❐

┏━━❐ *DOWNLOAD* ❐
┃ ✧ ${usedPrefix}apk
┃ ✧ ${usedPrefix}app
┃ ✧ ${usedPrefix}fb
┃ ✧ ${usedPrefix}movie
┃ ✧ ${usedPrefix}pindl
┃ ✧ ${usedPrefix}play
┃ ✧ ${usedPrefix}play2
┃ ✧ ${usedPrefix}song3
┃ ✧ ${usedPrefix}video
┃ ✧ ${usedPrefix}xvideos
┃ ✧ ${usedPrefix}ytmp3
┗❐

┏━━❐ *DOWNLOADER* ❐
┃ ✧ ${usedPrefix}dlnpm
┃ ✧ ${usedPrefix}gitclone
┃ ✧ ${usedPrefix}instagram
┗❐

┏━━❐ *FUN* ❐
┃ ✧ ${usedPrefix}awoo
┃ ✧ ${usedPrefix}bite
┃ ✧ ${usedPrefix}blush
┃ ✧ ${usedPrefix}bonk
┃ ✧ ${usedPrefix}bully
┃ ✧ ${usedPrefix}cringe
┃ ✧ ${usedPrefix}cry
┃ ✧ ${usedPrefix}cuddle
┃ ✧ ${usedPrefix}dance
┃ ✧ ${usedPrefix}glomp
┃ ✧ ${usedPrefix}hack
┃ ✧ ${usedPrefix}handhold
┃ ✧ ${usedPrefix}happy
┃ ✧ ${usedPrefix}highfive
┃ ✧ ${usedPrefix}hug
┃ ✧ ${usedPrefix}img
┃ ✧ ${usedPrefix}insult
┃ ✧ ${usedPrefix}kill
┃ ✧ ${usedPrefix}kiss
┃ ✧ ${usedPrefix}lick
┃ ✧ ${usedPrefix}me
┃ ✧ ${usedPrefix}nom
┃ ✧ ${usedPrefix}pat
┃ ✧ ${usedPrefix}poke
┃ ✧ ${usedPrefix}slap
┃ ✧ ${usedPrefix}smile
┃ ✧ ${usedPrefix}smug
┃ ✧ ${usedPrefix}technologia
┃ ✧ ${usedPrefix}tts
┃ ✧ ${usedPrefix}wave
┃ ✧ ${usedPrefix}wink
┃ ✧ ${usedPrefix}yeet
┗❐

┏━━❐ *GENERAL* ❐
┃ ✧ ${usedPrefix}alive
┃ ✧ ${usedPrefix}owner
┃ ✧ ${usedPrefix}ping
┃ ✧ ${usedPrefix}uptime
┗❐

┏━━❐ *GROUP* ❐
┃ ✧ ${usedPrefix}acceptall
┃ ✧ ${usedPrefix}add
┃ ✧ ${usedPrefix}antibad
┃ ✧ ${usedPrefix}antilink
┃ ✧ ${usedPrefix}antitag
┃ ✧ ${usedPrefix}demote
┃ ✧ ${usedPrefix}goodbye
┃ ✧ ${usedPrefix}gstatus
┃ ✧ ${usedPrefix}join
┃ ✧ ${usedPrefix}left
┃ ✧ ${usedPrefix}lockgc
┃ ✧ ${usedPrefix}newgroup
┃ ✧ ${usedPrefix}online
┃ ✧ ${usedPrefix}promote
┃ ✧ ${usedPrefix}rejectall
┃ ✧ ${usedPrefix}requestlist
┃ ✧ ${usedPrefix}tagadmins
┃ ✧ ${usedPrefix}tagall
┃ ✧ ${usedPrefix}unlockgc
┃ ✧ ${usedPrefix}welcome
┃ ✧ ${usedPrefix}hidetag
┗❐

┏━━❐ *INFORMATION* ❐
┃ ✧ ${usedPrefix}praytime
┗❐

┏━━❐ *ISBOTADMINS* ❐
┃ ✧ ${usedPrefix}unmute
┗❐

┏━━❐ *LOGO* ❐
┃ ✧ ${usedPrefix}america
┃ ✧ ${usedPrefix}angel
┃ ✧ ${usedPrefix}avengers
┃ ✧ ${usedPrefix}balloon
┃ ✧ ${usedPrefix}beach
┃ ✧ ${usedPrefix}blackpink
┃ ✧ ${usedPrefix}broken
┃ ✧ ${usedPrefix}cartoon
┃ ✧ ${usedPrefix}clouds
┃ ✧ ${usedPrefix}comic
┃ ✧ ${usedPrefix}delete
┃ ✧ ${usedPrefix}devil
┃ ✧ ${usedPrefix}dragonball
┃ ✧ ${usedPrefix}firework
┃ ✧ ${usedPrefix}fog
┃ ✧ ${usedPrefix}football
┃ ✧ ${usedPrefix}future
┃ ✧ ${usedPrefix}galaxy
┃ ✧ ${usedPrefix}glitch
┃ ✧ ${usedPrefix}glow
┃ ✧ ${usedPrefix}hacker
┃ ✧ ${usedPrefix}luxury
┃ ✧ ${usedPrefix}maker
┃ ✧ ${usedPrefix}marvel
┃ ✧ ${usedPrefix}metal
┃ ✧ ${usedPrefix}multicolor
┃ ✧ ${usedPrefix}naruto
┃ ✧ ${usedPrefix}neon
┃ ✧ ${usedPrefix}neonglitch
┃ ✧ ${usedPrefix}nigeria
┃ ✧ ${usedPrefix}pixel
┃ ✧ ${usedPrefix}pornhub
┃ ✧ ${usedPrefix}sand
┃ ✧ ${usedPrefix}shield
┃ ✧ ${usedPrefix}shirt
┃ ✧ ${usedPrefix}silver
┃ ✧ ${usedPrefix}sketch
┃ ✧ ${usedPrefix}snow
┃ ✧ ${usedPrefix}space
┃ ✧ ${usedPrefix}tattoo
┃ ✧ ${usedPrefix}thor
┃ ✧ ${usedPrefix}tiktok
┃ ✧ ${usedPrefix}typo
┃ ✧ ${usedPrefix}underwater
┃ ✧ ${usedPrefix}vintage
┃ ✧ ${usedPrefix}watercolor
┃ ✧ ${usedPrefix}wolf
┃ ✧ ${usedPrefix}write
┗❐

┏━━❐ *MAIN* ❐
┃ ✧ ${usedPrefix}fetch
┃ ✧ ${usedPrefix}host
┃ ✧ ${usedPrefix}ig
┃ ✧ ${usedPrefix}pair
┃ ✧ ${usedPrefix}quran
┃ ✧ ${usedPrefix}repo
┃ ✧ ${usedPrefix}save
┃ ✧ ${usedPrefix}speed
┗❐

┏━━❐ *MEDIA* ❐
┃ ✧ ${usedPrefix}convert
┃ ✧ ${usedPrefix}getimage
┃ ✧ ${usedPrefix}movieinfo
┗❐

┏━━❐ *MENU* ❐
┃ ✧ ${usedPrefix}githubstalk
┃ ✧ ${usedPrefix}list
┃ ✧ ${usedPrefix}menu
┃ ✧ ${usedPrefix}quranmenu
┗❐

┏━━❐ *MISC* ❐
┃ ✧ ${usedPrefix}vv3
┗❐

┏━━❐ *NEWS* ❐
┃ ✧ ${usedPrefix}news
┗❐

┏━━❐ *OTHER* ❐
┃ ✧ ${usedPrefix}gpass
┃ ✧ ${usedPrefix}srepo
┗❐

┏━━❐ *OWNER* ❐
┃ ✧ ${usedPrefix}antidelete
┃ ✧ ${usedPrefix}autobio
┃ ✧ ${usedPrefix}ban
┃ ✧ ${usedPrefix}banlist
┃ ✧ ${usedPrefix}block
┃ ✧ ${usedPrefix}broadcast
┃ ✧ ${usedPrefix}ch
┃ ✧ ${usedPrefix}chatbot
┃ ✧ ${usedPrefix}clearchats
┃ ✧ ${usedPrefix}forward
┃ ✧ ${usedPrefix}getstatusreact
┃ ✧ ${usedPrefix}gjid
┃ ✧ ${usedPrefix}nulpp
┃ ✧ ${usedPrefix}restart
┃ ✧ ${usedPrefix}set
┃ ✧ ${usedPrefix}setpp
┃ ✧ ${usedPrefix}setstatusreact
┃ ✧ ${usedPrefix}shutdown
┃ ✧ ${usedPrefix}sudoadd
┃ ✧ ${usedPrefix}sudodel
┃ ✧ ${usedPrefix}sudolist
┃ ✧ ${usedPrefix}unban
┃ ✧ ${usedPrefix}unblock
┃ ✧ ${usedPrefix}update
┃ ✧ ${usedPrefix}xx
┗❐

┏━━❐ *PLUGIN* ❐
┃ ✧ ${usedPrefix}deleteplugin
┃ ✧ ${usedPrefix}install
┃ ✧ ${usedPrefix}pluginlist
┗❐

┏━━❐ *SEARCH* ❐
┃ ✧ ${usedPrefix}define
┃ ✧ ${usedPrefix}githubstalk2
┃ ✧ ${usedPrefix}yts
┃ ✧ ${usedPrefix}ytstalk
┗❐

┏━━❐ *SETTINGS* ❐
┃ ✧ ${usedPrefix}always-online
┃ ✧ ${usedPrefix}anticall
┃ ✧ ${usedPrefix}antiviewonce
┃ ✧ ${usedPrefix}auto-recording
┃ ✧ ${usedPrefix}auto-seen
┃ ✧ ${usedPrefix}auto-sticker
┃ ✧ ${usedPrefix}auto-typing
┃ ✧ ${usedPrefix}autolikestatus
┃ ✧ ${usedPrefix}autoreact
┃ ✧ ${usedPrefix}autoread
┃ ✧ ${usedPrefix}autorecording
┃ ✧ ${usedPrefix}autostatusview
┃ ✧ ${usedPrefix}autotyping
┃ ✧ ${usedPrefix}autovoice
┃ ✧ ${usedPrefix}customreact
┃ ✧ ${usedPrefix}dashboard
┃ ✧ ${usedPrefix}mentionreply
┃ ✧ ${usedPrefix}mode
┃ ✧ ${usedPrefix}ownerreact
┃ ✧ ${usedPrefix}readreceipt
┃ ✧ ${usedPrefix}setprefix
┃ ✧ ${usedPrefix}setprefix1
┃ ✧ ${usedPrefix}status-react
┗❐

┏━━❐ *STICKER* ❐
┃ ✧ ${usedPrefix}attp
┃ ✧ ${usedPrefix}vsticker
┗❐

┏━━❐ *SYSTEM* ❐
┃ ✧ ${usedPrefix}config
┗❐

┏━━❐ *TOOLS* ❐
┃ ✧ ${usedPrefix}getpp
┃ ✧ ${usedPrefix}savecontact
┃ ✧ ${usedPrefix}screenshot
┃ ✧ ${usedPrefix}tempmail
┃ ✧ ${usedPrefix}tiktoksearch
┃ ✧ ${usedPrefix}timecorrect
┃ ✧ ${usedPrefix}timefix
┃ ✧ ${usedPrefix}today
┃ ✧ ${usedPrefix}vv
┃ ✧ ${usedPrefix}vv2
┗❐

┏━━❐ *UTILITY* ❐
┃ ✧ ${usedPrefix}caption
┃ ✧ ${usedPrefix}jid
┃ ✧ ${usedPrefix}person
┃ ✧ ${usedPrefix}time
┃ ✧ ${usedPrefix}tourl
┃ ✧ ${usedPrefix}trt
┃ ✧ ${usedPrefix}weather
┃ ✧ ${usedPrefix}wstalk
┗❐

┏━━❐ *WALLPAPERS* ❐
┃ ✧ ${usedPrefix}rw
┗❐

┏━━❐ *WHATSAPP* ❐
┃ ✧ ${usedPrefix}cid
┗❐

_⚡ Powered by ${botName}_`;

            // ==========================================
            // BUTTONS
            // ==========================================

            const interactiveButtons = [

                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: "👨‍💻 Contact Owner",
                        url: "https://wa.me/254799963583",
                        merchant_url: "https://wa.me/254799963583"
                    })
                },

                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: "📢 WhatsApp Channel",
                        url: "https://whatsapp.com/channel/0029Vb6NveDBPzjPa4vIRt3n",
                        merchant_url: "https://whatsapp.com/channel/0029Vb6NveDBPzjPa4vIRt3n"
                    })
                },

                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: "👥 WhatsApp Group",
                        url: "https://chat.whatsapp.com/FncVjQcrmRbL6gzONkzbBa",
                        merchant_url: "https://chat.whatsapp.com/FncVjQcrmRbL6gzONkzbBa"
                    })
                },

                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: "🤖 TEDDY-XMD Website",
                        url: "https://www.teddyxmd.run.place/",
                        merchant_url: "https://www.teddyxmd.run.place/"
                    })
                }

            ];

            // ==========================================
            // SEND IMAGE + BUTTONS
            // ==========================================

            try {

                await sendInteractiveMessage(
                    conn,
                    from,
                    {
                        title: `${botName} MENU`,

                        text: menuMsg,

                        footer:
                            "⚡ Powered by TEDDY Tech Hub",

                        image: {
                            url: MENU_IMAGE
                        },

                        interactiveButtons:
                            interactiveButtons
                    },
                    {
                        quoted: mek,

                        contextInfo: {
                            mentionedJid: mentions
                        }
                    }
                );

            } catch (buttonError) {

                console.error(
                    "❌ IMAGE MENU ERROR:",
                    buttonError
                );

                // ======================================
                // IMAGE FALLBACK
                // ======================================

                try {

                    await conn.sendMessage(
                        from,
                        {
                            image: {
                                url: MENU_IMAGE
                            },

                            caption: menuMsg,

                            mentions: mentions
                        },
                        {
                            quoted: mek
                        }
                    );

                } catch (imageError) {

                    console.error(
                        "❌ IMAGE FALLBACK ERROR:",
                        imageError
                    );

                    // ==================================
                    // TEXT FALLBACK
                    // ==================================

                    await conn.sendMessage(
                        from,
                        {
                            text: menuMsg,

                            mentions: mentions
                        },
                        {
                            quoted: mek
                        }
                    );

                }
            }

        } catch (error) {

            console.error(
                "❌ TEDDY-XMD MENU ERROR:",
                error
            );

            try {

                await conn.sendMessage(
                    from,
                    {
                        text:
                            `❌ *Menu Error*\n\n${error?.message || "Unknown error"}`
                    },
                    {
                        quoted: mek
                    }
                );

            } catch (fallbackError) {

                console.error(
                    "MENU FINAL FALLBACK ERROR:",
                    fallbackError
                );

            }
        }
    }
);
