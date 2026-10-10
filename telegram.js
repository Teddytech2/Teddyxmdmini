const { Telegraf, Markup } = require('telegraf');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    Browsers,
    DisconnectReason
} = require('@whiskeysockets/baileys');

const fs = require('fs-extra');
const path = require('path');
const pino = require('pino');
const express = require('express');
const config = require('./config');

const BOT_TOKEN = config.TELEGRAM_BOT_TOKEN;
const ADMIN_ID = config.TELEGRAM_CHAT_ID;

if (
    !BOT_TOKEN ||
    BOT_TOKEN === '8464187309:AAHNLXu7uz1IdErpWNiEQwtfbrXzYhutWN4'
) {
    console.log('❌ TELEGRAM_BOT_TOKEN missing or revoked. Telegram bot disabled.');
    module.exports = {};
    return;
}

const bot = new Telegraf(BOT_TOKEN);
const app = express();

const BOT_IMAGE = config.IMAGE_PATH;
const WEB_PAIR_URL = config.WEB_PAIR_URL || 'https://example.com';

const tempSessions = new Map();
const rateLimit = new Map();
const broadcastSessions = new Map();

let totalPairs = 0;
let botStarted = false;

// ================= HELPERS =================

const isAdmin = (ctx) => {
    return ctx.from?.id?.toString() === ADMIN_ID?.toString();
};

const safeSend = async (ctx, text, extra = {}) => {
    try {
        return await ctx.reply(text, extra);
    } catch (e) {
        console.log('Reply error:', e.message);
    }
};

const mainMenuKeyboard = (ctx) => {
    const buttons = [
        [
            Markup.button.callback('📱 Pair WhatsApp', 'pair'),
            Markup.button.callback('❓ Help', 'help')
        ],
        [
            Markup.button.callback('📊 Bot Status', 'status'),
            Markup.button.callback('👤 Owner', 'owner')
        ],
        [
            Markup.button.url('📢 Channel', config.CHANNEL_LINK || 'https://t.me/telegram'),
            Markup.button.url('👥 Group', config.GROUP_LINK || 'https://t.me/telegram')
        ]
    ];

    if (isAdmin(ctx)) {
        buttons.push([
            Markup.button.callback('📣 Admin Broadcast', 'admin_broadcast')
        ]);
    }

    buttons.push([
        Markup.button.url('🌐 Web Pair', WEB_PAIR_URL)
    ]);

    return Markup.inlineKeyboard(buttons);
};

const backKeyboard = () => {
    return Markup.inlineKeyboard([
        [Markup.button.callback('⬅️ Back to Menu', 'back_to_menu')]
    ]);
};

// ================= START =================

bot.start(async (ctx) => {
    try {
        const payload = ctx.startPayload;

        if (payload && payload.startsWith('pair_')) {
            const number = payload.replace('pair_', '');
            return await startTgPairing(ctx, number);
        }

        const user = ctx.from?.first_name || 'User';

        const text =
`👑 *${config.BOT_NAME} Pair Bot*

Hi ${user}! I can pair your WhatsApp to ${config.BOT_NAME}.

*How it works:*
1. Tap "Pair WhatsApp"
2. Send number: 254712345678
3. Get pairing code
4. Open WhatsApp
5. Linked Devices
6. Link with phone number

*Stats:* ${totalPairs} devices paired

${config.BOT_FOOTER}`;

        try {
            await ctx.replyWithPhoto(
                { source: BOT_IMAGE },
                {
                    caption: text,
                    parse_mode: 'Markdown',
                    ...mainMenuKeyboard(ctx)
                }
            );
        } catch {
            await ctx.reply(text, {
                parse_mode: 'Markdown',
                ...mainMenuKeyboard(ctx)
            });
        }

    } catch (e) {
        console.log('/start error:', e.message);
    }
});

// ================= BACK =================

bot.action('back_to_menu', async (ctx) => {
    try {
        await ctx.answerCbQuery();

        const user = ctx.from?.first_name || 'User';

        const text =
`👑 *${config.BOT_NAME} Pair Bot*

Hi ${user}! I can pair your WhatsApp to ${config.BOT_NAME}.

*How it works:*
1. Tap "Pair WhatsApp"
2. Send number: 254712345678
3. Get pairing code
4. Open WhatsApp
5. Linked Devices
6. Link with phone number

*Stats:* ${totalPairs} devices paired

${config.BOT_FOOTER}`;

        try {
            await ctx.editMessageCaption(text, {
                parse_mode: 'Markdown',
                ...mainMenuKeyboard(ctx)
            });
        } catch {
            await ctx.editMessageText(text, {
                parse_mode: 'Markdown',
                ...mainMenuKeyboard(ctx)
            });
        }

    } catch (e) {
        console.log('Back menu error:', e.message);
    }
});

// ================= PAIR =================

bot.action('pair', async (ctx) => {
    try {
        await ctx.answerCbQuery();

        const text =
`📱 *Send your WhatsApp number*

Example:
\`254712345678\`

⚠️ No + or spaces

🌐 Web Pair:
${WEB_PAIR_URL}`;

        try {
            await ctx.editMessageCaption(text, {
                parse_mode: 'Markdown',
                ...backKeyboard()
            });
        } catch {
            await ctx.editMessageText(text, {
                parse_mode: 'Markdown',
                ...backKeyboard()
            });
        }

    } catch (e) {
        console.log('Pair menu error:', e.message);
    }
});

// ================= HELP =================

bot.action('help', async (ctx) => {
    try {
        await ctx.answerCbQuery();

        const helpText =
`❓ *${config.BOT_NAME} Help*

*How to pair:*
1. Send number
2. Receive code
3. WhatsApp → Linked Devices
4. Link with phone number
5. Enter code

🌐 Web Pair:
${WEB_PAIR_URL}

📢 Support:
${config.CHANNEL_LINK}

${config.BOT_FOOTER}`;

        try {
            await ctx.editMessageCaption(helpText, {
                parse_mode: 'Markdown',
                ...backKeyboard()
            });
        } catch {
            await ctx.editMessageText(helpText, {
                parse_mode: 'Markdown',
                ...backKeyboard()
            });
        }

    } catch (e) {
        console.log('Help error:', e.message);
    }
});

// ================= STATUS =================

bot.action('status', async (ctx) => {
    try {
        await ctx.answerCbQuery();

        const uptime = process.uptime();

        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const mins = Math.floor((uptime % 3600) / 60);

        const statusText =
`📊 *${config.BOT_NAME} Status*

✅ System Online
⏰ Uptime: ${days}d ${hours}h ${mins}m
📱 Total Pairs: ${totalPairs}

🌐 ${WEB_PAIR_URL}

${config.BOT_FOOTER}`;

        try {
            await ctx.editMessageCaption(statusText, {
                parse_mode: 'Markdown',
                ...backKeyboard()
            });
        } catch {
            await ctx.editMessageText(statusText, {
                parse_mode: 'Markdown',
                ...backKeyboard()
            });
        }

    } catch (e) {
        console.log('Status error:', e.message);
    }
});

// ================= OWNER =================

bot.action('owner', async (ctx) => {
    try {
        await ctx.answerCbQuery();

        const ownerText =
`👤 *${config.BOT_NAME} Owner*

👑 Developer: ${config.OWNER_NAME}

📢 Channel:
${config.CHANNEL_LINK}

👥 Group:
${config.GROUP_LINK}

${config.BOT_FOOTER}`;

        try {
            await ctx.editMessageCaption(ownerText, {
                parse_mode: 'Markdown',
                ...backKeyboard()
            });
        } catch {
            await ctx.editMessageText(ownerText, {
                parse_mode: 'Markdown',
                ...backKeyboard()
            });
        }

    } catch (e) {
        console.log('Owner error:', e.message);
    }
});

// ================= TEXT HANDLER =================

bot.on('text', async (ctx) => {
    try {
        const text = ctx.message?.text;

        if (!text) return;

        // Ignore commands
        if (text.startsWith('/')) return;

        // Broadcast
        if (
            isAdmin(ctx) &&
            broadcastSessions.has(ctx.from.id)
        ) {
            const session = broadcastSessions.get(ctx.from.id);

            if (
                session.step === 'waiting_message'
            ) {
                broadcastSessions.delete(ctx.from.id);

                return await executeBroadcast(
                    ctx,
                    text
                );
            }
        }

        // Pair number
        const isNumber =
            /^[0-9]{10,15}$/.test(text);

        if (isNumber) {
            return await startTgPairing(
                ctx,
                text
            );
        }

    } catch (e) {
        console.log('Text handler error:', e.message);
    }
});

// ================= BROADCAST =================

bot.action('admin_broadcast', async (ctx) => {
    try {
        await ctx.answerCbQuery();

        if (!isAdmin(ctx)) {
            return ctx.reply('❌ Admin only.');
        }

        broadcastSessions.set(ctx.from.id, {
            step: 'waiting_message'
        });

        await ctx.reply(
            '📣 Send broadcast message now.',
            backKeyboard()
        );

    } catch (e) {
        console.log('Broadcast menu error:', e.message);
    }
});

async function executeBroadcast(ctx, message) {
    try {
        const sock = global.sock;

        if (!sock) {
            return ctx.reply('❌ WhatsApp bot offline.');
        }

        const owner =
            config.OWNER_NUMBER.replace(/[^0-9]/g, '')
            + '@s.whatsapp.net';

        await sock.sendMessage(owner, {
            text:
`📣 *Broadcast Message*

${message}`
        });

        await ctx.reply(
            '✅ Broadcast sent.',
            backKeyboard()
        );

    } catch (e) {
        console.log('Broadcast error:', e.message);
        await ctx.reply('❌ Broadcast failed.');
    }
}

// ================= PAIRING =================

async function startTgPairing(ctx, number) {
    try {
        const tgId = ctx.from.id;

        const last =
            rateLimit.get(tgId) || 0;

        if (Date.now() - last < 30000) {
            return ctx.reply(
                '⏳ Wait 30 seconds before retrying.'
            );
        }

        rateLimit.set(tgId, Date.now());

        if (!/^[0-9]{10,15}$/.test(number)) {
            return ctx.reply(
                '❌ Invalid number format.'
            );
        }

        const loading = await ctx.reply(
            '🔄 Generating pairing code...'
        );

        // Clear old session
        if (tempSessions.has(tgId)) {
            const old = tempSessions.get(tgId);

            clearTimeout(old.timeout);

            try {
                old.sock.ws.close();
            } catch {}

            tempSessions.delete(tgId);
        }

        const sessionDir = path.join(
            __dirname,
            'temp',
            `tg_${tgId}_${Date.now()}`
        );

        fs.ensureDirSync(sessionDir);

        const { state, saveCreds } =
            await useMultiFileAuthState(
                sessionDir
            );

        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            browser: Browsers.macOS('Safari'),
            logger: pino({
                level: 'silent'
            })
        });

        sock.ev.on('creds.update', saveCreds);

        const timeout = setTimeout(async () => {
            try {
                sock.ws.close();
            } catch {}

            fs.removeSync(sessionDir);

            tempSessions.delete(tgId);

            try {
                await ctx.telegram.editMessageText(
                    ctx.chat.id,
                    loading.message_id,
                    undefined,
                    '⌛ Pair code expired.',
                    backKeyboard()
                );
            } catch {}
        }, 120000);

        tempSessions.set(tgId, {
            sock,
            timeout
        });

        sock.ev.on(
            'connection.update',
            async (update) => {

                const {
                    connection,
                    lastDisconnect
                } = update;

                if (connection === 'open') {

                    clearTimeout(timeout);

                    totalPairs++;

                    fs.removeSync(sessionDir);

                    tempSessions.delete(tgId);

                    try {
                        await ctx.telegram.editMessageText(
                            ctx.chat.id,
                            loading.message_id,
                            undefined,
`✅ *WhatsApp Paired Successfully*

📱 Number:
${number}

📊 Total Pairs:
${totalPairs}

${config.BOT_FOOTER}`,
                            {
                                parse_mode: 'Markdown',
                                ...backKeyboard()
                            }
                        );
                    } catch {}
                }

                if (connection === 'close') {

                    const code =
                        lastDisconnect?.error
                            ?.output?.statusCode;

                    if (
                        code ===
                        DisconnectReason.loggedOut
                    ) {
                        clearTimeout(timeout);

                        fs.removeSync(sessionDir);

                        tempSessions.delete(tgId);
                    }
                }
            }
        );

        await new Promise(r => setTimeout(r, 3000));

        const code =
            await sock.requestPairingCode(number);

        const msg =
`✅ *Your Pairing Code*

📱 Number:
\`${number}\`

🔑 Code:
\`${code}\`

*How to use:*
1. Open WhatsApp
2. Linked Devices
3. Link with phone number
4. Enter this code

⌛ Expires in 60 seconds

${config.BOT_FOOTER}`;

        await ctx.telegram.editMessageText(
            ctx.chat.id,
            loading.message_id,
            undefined,
            msg,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [
                        Markup.button.callback(
                            '🔄 New Code',
                            'pair'
                        )
                    ],
                    [
                        Markup.button.callback(
                            '⬅️ Back',
                            'back_to_menu'
                        )
                    ]
                ])
            }
        );

    } catch (e) {
        console.log('Pairing error:', e);

        try {
            await ctx.reply(
                '❌ Failed to generate pairing code.'
            );
        } catch {}
    }
}

// ================= EXPRESS WEBHOOK =================

if (process.env.NODE_ENV === 'production') {

    app.use(bot.webhookCallback('/telegram'));

    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
        console.log(
            `✅ Telegram webhook server running on ${PORT}`
        );
    });
}

// ================= START BOT =================

async function startBot() {
    try {

        if (botStarted) return;

        if (process.env.NODE_ENV === 'production') {

            const domain =
                `${process.env.HEROKU_APP_NAME}.herokuapp.com`;

            const webhook =
                `https://${domain}/telegram`;

            await bot.telegram.setWebhook(
                webhook
            );

            console.log(
                `✅ Telegram webhook set: ${webhook}`
            );

        } else {

            await bot.launch();

            console.log(
                `✅ Telegram bot started in polling mode`
            );
        }

        botStarted = true;

    } catch (e) {

        console.log(
            'Telegram startup error:',
            e.message
        );
    }
}

startBot();

// ================= SAFE STOP =================

process.once('SIGINT', () => {
    try {
        if (botStarted) {
            bot.stop('SIGINT');
        }
    } catch {}

    process.exit(0);
});

process.once('SIGTERM', () => {
    try {
        if (botStarted) {
            bot.stop('SIGTERM');
        }
    } catch {}

    process.exit(0);
});

module.exports = bot;