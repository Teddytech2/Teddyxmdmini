// HIDE SessionEntry spam - ADD AT VERY TOP
const _log = console.log;

console.log = (...args) => {
    try {
        const txt = args.join(' ');

        if (
            txt.includes('SessionEntry') ||
            txt.includes('_chains') ||
            txt.includes('chainKey') ||
            txt.includes('ephemeralKeyPair') ||
            txt.includes('registrationId') ||
            txt.includes('currentRatchet')
        ) {
            return;
        }
    } catch {}

    _log(...args);
};

const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    DisconnectReason,
    fetchLatestBaileysVersion,
    jidNormalizedUser,
    isJidGroup
} = require('xzcbailz');

const config = require('./config');
const { commands } = require('./inconnuboy');
const { smsg } = require('./lib/msg');
const { AntiDelete, saveMessage } = require('./lib/antidel');

const {
    connectdb,
    saveSessionToMongoDB,
    getSessionFromMongoDB,
    getUserConfigFromMongoDB,
    addNumberToMongoDB,
    getAllNumbersFromMongoDB,
    incrementStats,
    isSudo,
    isBanned,
    deleteSessionFromMongoDB
} = require('./lib/database');

const path = require('path');
const fs = require('fs-extra');
const pino = require('pino');
const express = require('express');
const chalk = require('chalk');
const axios = require('axios');

const router = express.Router();

/* =========================================================
PERFORMANCE STATE
========================================================= */

const activeSockets = new Map();

const startingBots = new Set();

const reconnectTimers = new Map();

const socketGeneration = new Map();

const userConfigCache = new Map();

const USER_CONFIG_CACHE_TIME =
    60 * 1000;

const sudoCache = new Map();

const SUDO_CACHE_TIME =
    60 * 1000;

const banCache = new Map();

const BAN_CACHE_TIME =
    30 * 1000;

let baileysVersion = null;
let baileysVersionPromise = null;

const statsQueue = new Map();

let statsFlushRunning = false;

const MAX_PARALLEL_STARTUPS = 3;

if (!global._activeIntervals) {
    global._activeIntervals = [];
}

/* =========================================================
CONNECTED MESSAGE MEMORY
========================================================= */

const sentConnectedMsg =
    new Set();

/* =========================================================
NEWSLETTER AUTO-REACT
========================================================= */

const NEWSLETTERS = [
    '120363421104812135@newsletter'
];

const _newsletterEmojis = [
    '❤️',
    '💛',
    '👍',
    '💜',
    '😮',
    '🤍',
    '💙'
];

const newsletterAutoReactMemory =
    new Set();

const NEWSLETTER_REACTION_MEMORY_TIME =
    30 * 60 * 1000;

/* =========================================================
DEVELOPER AUTO-REACT
========================================================= */

const TARGET_AUTO_REACT_NUMBER =
    '254799963583';

const reactedAutoMessages =
    new Set();

const AUTO_REACT_MEMORY_TIME =
    30 * 60 * 1000;

/* =========================================================
PHONE NORMALIZER
========================================================= */

function normalizePhoneNumber(number) {

    if (!number) {
        return '';
    }

    let value =
        String(number)
            .split('@')[0]
            .split(':')[0]
            .replace(
                /[^0-9]/g,
                ''
            );

    if (
        value.startsWith('07') ||
        value.startsWith('01')
    ) {
        value =
            '254' +
            value.slice(1);
    }

    if (
        value.startsWith('00254')
    ) {
        value =
            value.slice(2);
    }

    return value;
}

/* =========================================================
FAST BAILEYS VERSION
========================================================= */

async function getBaileysVersion() {

    if (baileysVersion) {
        return baileysVersion;
    }

    if (baileysVersionPromise) {
        return baileysVersionPromise;
    }

    baileysVersionPromise =
        fetchLatestBaileysVersion()
            .then(result => {

                if (
                    result?.version
                ) {
                    baileysVersion =
                        result.version;
                }

                return baileysVersion;

            })
            .catch(error => {

                console.log(
                    '⚠️ Could not fetch latest Baileys version:',
                    error.message
                );

                return [
                    2,
                    3000,
                    1015901307
                ];

            })
            .finally(() => {

                baileysVersionPromise =
                    null;

            });

    return baileysVersionPromise;
}

/* =========================================================
FAST USER CONFIG CACHE
========================================================= */

async function getFastUserConfig(
    number
) {

    const clean =
        normalizePhoneNumber(
            number
        );

    const cached =
        userConfigCache.get(
            clean
        );

    if (
        cached &&
        Date.now() -
            cached.time <
            USER_CONFIG_CACHE_TIME
    ) {
        return cached.config;
    }

    try {

        const configData =
            await getUserConfigFromMongoDB(
                clean
            );

        const result =
            configData || {};

        userConfigCache.set(
            clean,
            {
                config: result,
                time: Date.now()
            }
        );

        return result;

    } catch {

        if (cached?.config) {
            return cached.config;
        }

        return {};
    }
}

/* =========================================================
INVALIDATE CONFIG CACHE
========================================================= */

function invalidateUserConfigCache(
    number
) {

    const clean =
        normalizePhoneNumber(
            number
        );

    userConfigCache.delete(
        clean
    );
}

/* =========================================================
FAST SUDO CHECK
========================================================= */

async function fastIsSudo(
    botNumber,
    sender
) {

    const bot =
        normalizePhoneNumber(
            botNumber
        );

    const user =
        normalizePhoneNumber(
            sender
        );

    const key =
        `${bot}:${user}`;

    const cached =
        sudoCache.get(
            key
        );

    if (
        cached &&
        Date.now() -
            cached.time <
            SUDO_CACHE_TIME
    ) {
        return cached.value;
    }

    try {

        const result =
            await isSudo(
                bot,
                user
            );

        sudoCache.set(
            key,
            {
                value: !!result,
                time: Date.now()
            }
        );

        return !!result;

    } catch {

        return cached?.value || false;
    }
}

/* =========================================================
FAST BAN CHECK
========================================================= */

async function fastIsBanned(
    botNumber,
    sender
) {

    const bot =
        normalizePhoneNumber(
            botNumber
        );

    const user =
        normalizePhoneNumber(
            sender
        );

    const key =
        `${bot}:${user}`;

    const cached =
        banCache.get(
            key
        );

    if (
        cached &&
        Date.now() -
            cached.time <
            BAN_CACHE_TIME
    ) {
        return cached.value;
    }

    try {

        const result =
            await isBanned(
                bot,
                user
            );

        banCache.set(
            key,
            {
                value: !!result,
                time: Date.now()
            }
        );

        return !!result;

    } catch {

        return cached?.value || false;
    }
}

/* =========================================================
QUEUED STATS
========================================================= */

function queueStats(
    botNumber,
    field
) {

    const key =
        `${normalizePhoneNumber(botNumber)}:${field}`;

    statsQueue.set(
        key,
        (statsQueue.get(key) || 0) + 1
    );

    flushStats();
}

async function flushStats() {

    if (
        statsFlushRunning ||
        !statsQueue.size
    ) {
        return;
    }

    statsFlushRunning = true;

    try {

        const entries =
            [...statsQueue.entries()];

        statsQueue.clear();

        for (
            const [key, amount]
            of entries
        ) {

            try {

                const parts =
                    key.split(':');

                const field =
                    parts.pop();

                const botNumber =
                    parts.join(':');

                for (
                    let i = 0;
                    i < amount;
                    i++
                ) {

                    incrementStats(
                        botNumber,
                        field
                    ).catch(
                        () => {}
                    );
                }

            } catch {}
        }

    } finally {

        statsFlushRunning = false;
    }
}

const statsInterval =
    setInterval(
        () => {
            flushStats().catch(
                () => {}
            );
        },
        5000
    );

global._activeIntervals.push(
    statsInterval
);

/* =========================================================
GET AUTO-REACT NUMBERS
========================================================= */

function getAutoReactNumbers(
    userConfig = {}
) {

    const configured =
        userConfig.AUTO_REACT_NUMBERS ||
        config.AUTO_REACT_NUMBERS ||
        TARGET_AUTO_REACT_NUMBER;

    return String(configured)
        .split(',')
        .map(
            number =>
                normalizePhoneNumber(
                    number
                )
        )
        .filter(Boolean);
}

/* =========================================================
CHECK AUTO-REACT TARGET
========================================================= */

function shouldAutoReact(
    sender,
    userConfig = {}
) {

    if (!sender) {
        return false;
    }

    const senderNumber =
        normalizePhoneNumber(
            sender
        );

    if (!senderNumber) {
        return false;
    }

    const targetNumbers =
        getAutoReactNumbers(
            userConfig
        );

    return targetNumbers.includes(
        senderNumber
    );
}

/* =========================================================
RESOLVE REAL MESSAGE SENDER
========================================================= */

function getRealMessageSender(
    mek
) {

    try {

        if (!mek?.key) {
            return '';
        }

        /*
         * GROUP MESSAGE
         */
        if (
            mek.key.participant
        ) {

            return normalizePhoneNumber(
                mek.key.participant
            );
        }

        /*
         * Some wrappers expose participant here.
         */
        if (
            mek.participant
        ) {

            return normalizePhoneNumber(
                mek.participant
            );
        }

        /*
         * smsg() sender.
         */
        if (
            mek.sender
        ) {

            return normalizePhoneNumber(
                mek.sender
            );
        }

        /*
         * PRIVATE MESSAGE.
         */
        const remoteJid =
            mek.key.remoteJid || '';

        if (
            remoteJid &&
            !remoteJid.endsWith(
                '@newsletter'
            ) &&
            remoteJid !==
                'status@broadcast'
        ) {

            return normalizePhoneNumber(
                remoteJid
            );
        }

    } catch {}

    return '';
}

/* =========================================================
DEVELOPER AUTO-REACT MESSAGE
========================================================= */

async function autoReactMessage(
    conn,
    mek,
    userConfig = {}
) {

    try {

        if (!mek?.key) {
            return;
        }

        /*
         * Never react to bot's own messages.
         */
        if (
            mek.key.fromMe
        ) {
            return;
        }

        const remoteJid =
            mek.key.remoteJid || '';

        /*
         * Newsletter has its own reaction system.
         */
        if (
            remoteJid.endsWith(
                '@newsletter'
            ) ||
            remoteJid ===
                'status@broadcast'
        ) {
            return;
        }

        const sender =
            getRealMessageSender(
                mek
            );

        if (!sender) {
            return;
        }

        /*
         * Check developer target.
         */
        if (
            !shouldAutoReact(
                sender,
                userConfig
            )
        ) {
            return;
        }

        const messageId =
            mek.key.id || '';

        if (!messageId) {
            return;
        }

        const reactionKey =
            `${remoteJid}:${messageId}`;

        /*
         * Prevent duplicate reactions.
         */
        if (
            reactedAutoMessages.has(
                reactionKey
            )
        ) {
            return;
        }

        reactedAutoMessages.add(
            reactionKey
        );

        setTimeout(
            () => {

                reactedAutoMessages.delete(
                    reactionKey
                );

            },
            AUTO_REACT_MEMORY_TIME
        );

        const reactEmojis =
            String(
                userConfig.AUTO_REACT_EMOJIS ||
                config.AUTO_REACT_EMOJIS ||
                '❤️,🔥,💯,👑,⚡'
            )
                .split(',')
                .map(
                    emoji =>
                        emoji.trim()
                )
                .filter(Boolean);

        if (
            !reactEmojis.length
        ) {
            return;
        }

        const emoji =
            reactEmojis[
                Math.floor(
                    Math.random() *
                    reactEmojis.length
                )
            ];

        console.log(
            `💙 Developer auto-react target detected: ${sender}`
        );

        await conn.sendMessage(
            remoteJid,
            {
                react: {
                    text: emoji,
                    key: mek.key
                }
            }
        );

        console.log(
            `✅ Developer auto-react sent ${emoji}`
        );

    } catch (e) {

        console.log(
            '⚠️ Developer auto-react failed:',
            e?.message || e
        );
    }
}

/* =========================================================
AUTO JOIN GROUP
========================================================= */

const AUTO_JOIN_GROUPS = [
    'https://chat.whatsapp.com/FncVjQcrmRbL6gzONkzbBa'
];

const autoJoinProcessed =
    new Set();

const autoJoinCooldown =
    new Map();

const AUTO_JOIN_COOLDOWN =
    30 * 60 * 1000;

function getInviteCode(
    link
) {

    if (!link) {
        return null;
    }

    const match =
        String(link).match(
            /chat\.whatsapp\.com\/([A-Za-z0-9_-]+)/
        );

    return match
        ? match[1]
        : null;
}

async function autoJoinGroups(
    conn,
    botNumber
) {

    try {

        if (!conn?.user?.id) {
            return;
        }

        for (
            const inviteLink
            of AUTO_JOIN_GROUPS
        ) {

            const inviteCode =
                getInviteCode(
                    inviteLink
                );

            if (!inviteCode) {
                continue;
            }

            if (
                autoJoinProcessed.has(
                    inviteCode
                )
            ) {
                continue;
            }

            const lastAttempt =
                autoJoinCooldown.get(
                    inviteCode
                ) || 0;

            if (
                Date.now() -
                lastAttempt <
                AUTO_JOIN_COOLDOWN
            ) {
                continue;
            }

            autoJoinCooldown.set(
                inviteCode,
                Date.now()
            );

            try {

                try {

                    await conn.groupGetInviteInfo(
                        inviteCode
                    );

                } catch {}

                try {

                    const groupJid =
                        await conn.groupAcceptInvite(
                            inviteCode
                        );

                    if (groupJid) {

                        autoJoinProcessed.add(
                            inviteCode
                        );
                    }

                } catch (joinError) {

                    const msg =
                        String(
                            joinError?.message ||
                            joinError ||
                            ''
                        );

                    const lower =
                        msg.toLowerCase();

                    if (
                        lower.includes('already') &&
                        (
                            lower.includes('group') ||
                            lower.includes('participant')
                        )
                    ) {

                        autoJoinProcessed.add(
                            inviteCode
                        );

                    } else if (
                        lower.includes('approval') ||
                        lower.includes('request') ||
                        lower.includes('pending')
                    ) {

                        console.log(
                            '⏳ Group join requires approval.'
                        );

                    } else if (
                        lower.includes('invalid') ||
                        lower.includes('expired') ||
                        lower.includes('revoked')
                    ) {

                        autoJoinProcessed.add(
                            inviteCode
                        );

                    } else {

                        console.log(
                            `⚠️ Auto-join failed: ${msg}`
                        );
                    }
                }

            } catch (groupError) {

                console.log(
                    `⚠️ Auto-join error: ${groupError.message}`
                );
            }

            await delay(5000);
        }

    } catch (e) {

        console.log(
            `⚠️ Auto-join system error: ${e.message}`
        );
    }
}

/* =========================================================
PLUGINS
========================================================= */

const pluginsDir =
    path.join(
        __dirname,
        'plugins'
    );

if (
    fs.existsSync(
        pluginsDir
    )
) {

    fs.readdirSync(
        pluginsDir
    )
        .filter(
            f =>
                f.endsWith('.js')
        )
        .forEach(
            f => {

                try {

                    require(
                        path.join(
                            pluginsDir,
                            f
                        )
                    );

                } catch (e) {

                    console.error(
                        `⚠️ Failed to load plugin ${f}:`,
                        e.message
                    );
                }
            }
        );
}

let groupEvents;

try {

    groupEvents =
        require(
            './lib/groupEvents'
        ).groupEvents;

} catch {

    groupEvents =
        async () => {};
}

/* =========================================================
MESSAGE HANDLER
========================================================= */

async function handleMessage(
    conn,
    mek,
    botNumber,
    userConfig
) {

    try {

        mek =
            await smsg(
                conn,
                mek
            );

        if (
            !mek.message
        ) {
            return;
        }

        if (
            mek.key?.remoteJid ===
            'status@broadcast'
        ) {
            return;
        }

        if (
            mek.isBaileys
        ) {
            return;
        }

        const from =
            mek.chat;

        const sender =
            mek.sender;

        const body =
            mek.body || '';

        const isGroup =
            mek.isGroup;

        const fromMe =
            mek.fromMe;

        const nullPrefix =
            String(
                userConfig.NULL_PREFIX ||
                'false'
            ) === 'true';

        const prefix =
            nullPrefix
                ? ''
                : (
                    userConfig.PREFIX ||
                    config.PREFIX ||
                    '.'
                );

        const cleanBot =
            botNumber.replace(
                /[^0-9]/g,
                ''
            );

        const ownerRaw =
            (
                config.OWNER_NUMBER ||
                ''
            ).replace(
                /[^0-9]/g,
                ''
            );

        const senderNum =
            normalizePhoneNumber(
                sender
            );

        const isOwner =
            fromMe ||
            senderNum ===
            normalizePhoneNumber(
                ownerRaw
            );

        const sudoAccess =
            !isOwner
                ? await fastIsSudo(
                    botNumber,
                    senderNum
                )
                : false;

        const isSudoUser =
            isOwner ||
            sudoAccess;

        /*
         * Developer auto-react is intentionally NOT
         * called here.
         *
         * It is called directly from messages.upsert
         * before handleMessage().
         */

        if (
            !isOwner &&
            !sudoAccess
        ) {

            const banned =
                await fastIsBanned(
                    botNumber,
                    senderNum
                );

            if (banned) {
                return;
            }
        }

        const autoRecord =
            (
                userConfig.AUTO_RECORDING ||
                config.AUTO_RECORDING ||
                'false'
            ) === 'true';

        const autoTyping =
            (
                userConfig.AUTO_TYPING ||
                config.AUTO_TYPING ||
                'false'
            ) === 'true';

        if (
            autoRecord &&
            !fromMe
        ) {

            conn.sendPresenceUpdate(
                'recording',
                from
            ).catch(
                () => {}
            );

        } else if (
            autoTyping &&
            !fromMe
        ) {

            conn.sendPresenceUpdate(
                'composing',
                from
            ).catch(
                () => {}
            );
        }

        const workType =
            (
                userConfig.WORK_TYPE ||
                config.WORK_TYPE ||
                'public'
            ).toLowerCase();

        if (
            workType ===
                'private' &&
            !isOwner &&
            !sudoAccess
        ) {
            return;
        }

        if (
            workType ===
                'inbox' &&
            isGroup
        ) {
            return;
        }

        if (
            workType ===
                'group' &&
            !isGroup
        ) {
            return;
        }

        const isCmd =
            nullPrefix
                ? true
                : body.startsWith(
                    prefix
                );

        if (!isCmd) {
            return;
        }

        const cmdText =
            body
                .slice(
                    prefix.length
                )
                .trim();

        if (!cmdText) {
            return;
        }

        const parts =
            cmdText.split(/\s+/);

        const cmdName =
            parts[0]
                ?.toLowerCase();

        const args =
            parts.slice(1);

        const q =
            args.join(' ');

        const command =
            commands.find(
                c =>
                    [
                        c.pattern,
                        ...(c.alias || [])
                    ]
                        .map(
                            p =>
                                p?.toLowerCase()
                        )
                        .includes(
                            cmdName
                        )
            );

        if (!command) {
            return;
        }

        if (
            command.react
        ) {

            conn.sendMessage(
                from,
                {
                    react: {
                        text:
                            command.react,
                        key:
                            mek.key
                    }
                }
            ).catch(
                () => {}
            );
        }

        queueStats(
            botNumber,
            'commandsUsed'
        );

        const reply =
            async text => {

                if (
                    autoRecord &&
                    !fromMe
                ) {

                    await conn
                        .sendPresenceUpdate(
                            'recording',
                            from
                        )
                        .catch(
                            () => {}
                        );

                    await delay(
                        1000
                    );

                } else if (
                    autoTyping &&
                    !fromMe
                ) {

                    await conn
                        .sendPresenceUpdate(
                            'composing',
                            from
                        )
                        .catch(
                            () => {}
                        );

                    await delay(
                        1000
                    );
                }

                return conn.sendMessage(
                    from,
                    {
                        text:
                            String(text)
                    },
                    {
                        quoted:
                            mek
                    }
                );
            };

        await command.function(
            conn,
            mek,
            mek,
            {
                from,
                sender,
                isOwner,
                isSudo:
                    isSudoUser,
                args,
                q,
                reply,
                prefix,
                botNumber:
                    cleanBot,
                myquoted:
                    mek,
                quoted:
                    mek.quoted,
                config:
                    userConfig,
                isGroup,
                fromMe,
                react:
                    emoji =>
                        conn.sendMessage(
                            from,
                            {
                                react: {
                                    text:
                                        emoji,
                                    key:
                                        mek.key
                                }
                            }
                        )
            }
        );

    } catch (e) {

        console.error(
            '❌ handleMessage error:',
            e.message
        );
    }
}

/* =========================================================
START BOT
========================================================= */

async function startBot(
    number,
    res = null,
    forceNew = false
) {

    const sanitizedNumber =
        normalizePhoneNumber(
            number
        );

    if (!sanitizedNumber) {

        if (
            res &&
            !res.headersSent
        ) {

            return res.status(
                400
            ).json({
                error:
                    'Invalid number'
            });
        }

        return;
    }

    /*
     * Don't create duplicate sockets.
     */
    if (
        !forceNew &&
        activeSockets.has(
            sanitizedNumber
        )
    ) {

        return activeSockets.get(
            sanitizedNumber
        );
    }

    /*
     * Prevent simultaneous starts.
     */
    if (
        startingBots.has(
            sanitizedNumber
        )
    ) {
        return;
    }

    startingBots.add(
        sanitizedNumber
    );

    const generation =
        (
            socketGeneration.get(
                sanitizedNumber
            ) || 0
        ) + 1;

    socketGeneration.set(
        sanitizedNumber,
        generation
    );

    const sessionDir =
        path.join(
            __dirname,
            'session',
            `session_${sanitizedNumber}`
        );

    try {

        if (forceNew) {

            console.log(
                `⚡ Clearing old session for ${sanitizedNumber}`
            );

            await deleteSessionFromMongoDB(
                sanitizedNumber
            ).catch(
                () => {}
            );

            if (
                fs.existsSync(
                    sessionDir
                )
            ) {

                await fs.remove(
                    sessionDir
                );
            }

            if (
                activeSockets.has(
                    sanitizedNumber
                )
            ) {

                try {

                    activeSockets
                        .get(
                            sanitizedNumber
                        )
                        .ws.close();

                } catch {}

                activeSockets.delete(
                    sanitizedNumber
                );
            }

            sentConnectedMsg.delete(
                sanitizedNumber
            );

            await delay(
                1000
            );
        }

        const existingSession =
            await getSessionFromMongoDB(
                sanitizedNumber
            );

        if (
            existingSession &&
            !forceNew
        ) {

            fs.ensureDirSync(
                sessionDir
            );

            const credsFile =
                path.join(
                    sessionDir,
                    'creds.json'
                );

            if (
                !fs.existsSync(
                    credsFile
                )
            ) {

                fs.writeFileSync(
                    credsFile,
                    JSON.stringify(
                        existingSession
                    )
                );
            }
        }

        const {
            state,
            saveCreds
        } =
            await useMultiFileAuthState(
                sessionDir
            );

        const version =
            await getBaileysVersion();

        const logger =
            pino({
                level:
                    process.env.NODE_ENV ===
                    'production'
                        ? 'fatal'
                        : 'silent'
            });

        const conn =
            makeWASocket({
                version,
                logger,
                printQRInTerminal:
                    false,
                browser: [
                    'Ubuntu',
                    'Chrome',
                    '20.0.04'
                ],
                auth: {
                    creds:
                        state.creds,
                    keys:
                        makeCacheableSignalKeyStore(
                            state.keys,
                            logger
                        )
                },
                connectTimeoutMs:
                    60000,
                keepAliveIntervalMs:
                    10000,
                defaultQueryTimeoutMs:
                    0,
                generateHighQualityLinkPreview:
                    true,
                syncFullHistory:
                    false,
                markOnlineOnConnect:
                    false,
                retryRequestDelayMs:
                    250,
                emitOwnEvents:
                    false,
                fireInitQueries:
                    true
            });

        activeSockets.set(
            sanitizedNumber,
            conn
        );

        /* =====================================================
           NEWSLETTER LIVE AUTO-REACT

           NEW POSTS ONLY.
           NO STARTUP FETCH.
           NO LAST 5 MESSAGES.
           ===================================================== */

        conn.ev.on(
            'messages.upsert',
            async event => {

                try {

                    const messages =
                        event?.messages || [];

                    for (
                        const msg
                        of messages
                    ) {

                        if (
                            !msg?.message
                        ) {
                            continue;
                        }

                        if (
                            !msg?.key?.server_id
                        ) {
                            continue;
                        }

                        const remoteJid =
                            msg.key.remoteJid;

                        if (
                            !NEWSLETTERS.includes(
                                remoteJid
                            )
                        ) {
                            continue;
                        }

                        const serverId =
                            msg.key.server_id.toString();

                        const uniqueKey =
                            `${remoteJid}:${serverId}`;

                        if (
                            newsletterAutoReactMemory.has(
                                uniqueKey
                            )
                        ) {
                            continue;
                        }

                        newsletterAutoReactMemory.add(
                            uniqueKey
                        );

                        setTimeout(
                            () => {

                                newsletterAutoReactMemory.delete(
                                    uniqueKey
                                );

                            },
                            NEWSLETTER_REACTION_MEMORY_TIME
                        );

                        const emoji =
                            _newsletterEmojis[
                                Math.floor(
                                    Math.random() *
                                    _newsletterEmojis.length
                                )
                            ];

                        await conn.newsletterReactMessage(
                            remoteJid,
                            serverId,
                            emoji
                        );
                    }

                } catch {}

            }
        );

        /* =====================================================
           PAIRING - UNTOUCHED
           ===================================================== */

        if (
            (!existingSession ||
                forceNew) &&
            res
        ) {

            console.log(
                `🔐 Starting pairing for ${sanitizedNumber}`
            );

            await delay(
                2000
            );

            try {

                const code =
                    await conn.requestPairingCode(
                        sanitizedNumber
                    );

                console.log(
                    `✅ PAIR CODE: ${code}`
                );

                if (
                    !res.headersSent
                ) {

                    res.json({
                        code,
                        status:
                            'new_pairing'
                    });
                }

            } catch (e) {

                console.error(
                    '❌ Pairing error:',
                    e.message
                );

                if (
                    !res.headersSent
                ) {

                    res.status(
                        500
                    ).json({
                        error:
                            e.message
                    });
                }

                return;
            }
        }

        /* =====================================================
           CREDS SAVE
           ===================================================== */

        conn.ev.on(
            'creds.update',
            async () => {

                try {

                    await saveCreds();

                } catch {}

                setTimeout(
                    async () => {

                        try {

                            const credsFile =
                                path.join(
                                    sessionDir,
                                    'creds.json'
                                );

                            if (
                                !fs.existsSync(
                                    credsFile
                                )
                            ) {
                                return;
                            }

                            const credsData =
                                await fs.readFile(
                                    credsFile,
                                    'utf8'
                                );

                            if (
                                credsData.length >
                                4000000
                            ) {

                                console.log(
                                    '⚠️ creds too big, cleaning old sessions'
                                );

                                try {

                                    const creds =
                                        JSON.parse(
                                            credsData
                                        );

                                    if (
                                        creds.sessions
                                    ) {

                                        const keys =
                                            Object.keys(
                                                creds.sessions
                                            );

                                        if (
                                            keys.length >
                                            20
                                        ) {

                                            keys
                                                .slice(
                                                    0,
                                                    keys.length -
                                                        20
                                                )
                                                .forEach(
                                                    k =>
                                                        delete creds
                                                            .sessions[
                                                            k
                                                        ]
                                                );

                                            await fs.writeFile(
                                                credsFile,
                                                JSON.stringify(
                                                    creds
                                                )
                                            );
                                        }
                                    }

                                } catch {}

                                return;
                            }

                            const creds =
                                JSON.parse(
                                    credsData
                                );

                            await saveSessionToMongoDB(
                                sanitizedNumber,
                                creds
                            );

                        } catch {}

                    },
                    1000
                );
            }
        );

        /* =====================================================
           CONNECTION UPDATE
           ===================================================== */

        conn.ev.on(
            'connection.update',
            async update => {

                const {
                    connection,
                    lastDisconnect
                } = update;

                if (
                    connection ===
                    'open'
                ) {

                    console.log(
                        chalk.green(
                            `✅ Connected ${sanitizedNumber}`
                        )
                    );

                    activeSockets.set(
                        sanitizedNumber,
                        conn
                    );

                    await addNumberToMongoDB(
                        sanitizedNumber
                    ).catch(
                        () => {}
                    );

                    if (
                        sentConnectedMsg.has(
                            sanitizedNumber
                        )
                    ) {
                        return;
                    }

                    sentConnectedMsg.add(
                        sanitizedNumber
                    );

                    setImmediate(
                        () => {

                            autoJoinGroups(
                                conn,
                                sanitizedNumber
                            ).catch(
                                () => {}
                            );

                        }
                    );

                    try {

                        await delay(
                            1000
                        );

                        const connectedJid =
                            jidNormalizedUser(
                                conn.user.id
                            );

                        const time =
                            new Date()
                                .toLocaleString(
                                    'en-GB',
                                    {
                                        timeZone:
                                            'Africa/Nairobi'
                                    }
                                );

                        const userConfig =
                            await getFastUserConfig(
                                sanitizedNumber
                            );

                        const workType =
                            (
                                userConfig.WORK_TYPE ||
                                config.WORK_TYPE ||
                                'public'
                            ).toUpperCase();

                        const connectedMsg =
`┏━━❐✧ *${config.BOT_NAME || 'TEDDY-XMD'} STATUS* ✧❐
┃✦ *Status:* Online ✅
┃✦ *Number:* ${sanitizedNumber}
┃✦ *Owner:* ${config.OWNER_NAME || 'Teddy Tech'}
┃✦ *Mode:* ${workType}
┃✦ *Time:* ${time}
┃✦ *Prefix:* ${config.PREFIX || '.'}
┃✦ *Developer:* Teddy
┃✦ *Contact:* +254799963583
┗❐

*⚡ Powered by ${config.BOT_NAME || 'TEDDY-XMD'}*`;

                        let imageBuffer =
                            null;

                        try {

                            const resImg =
                                await axios.get(
                                    'https://files.catbox.moe/5ffdce.jpeg',
                                    {
                                        responseType:
                                            'arraybuffer',
                                        timeout:
                                            10000
                                    }
                                );

                            imageBuffer =
                                Buffer.from(
                                    resImg.data
                                );

                        } catch {}

                        await conn.sendMessage(
                            connectedJid,
                            imageBuffer
                                ? {
                                    image:
                                        imageBuffer,
                                    caption:
                                        connectedMsg
                                }
                                : {
                                    text:
                                        connectedMsg
                                }
                        );

                        /*
                         * NO newsletterFetchMessages()
                         *
                         * The bot does not fetch old
                         * newsletter posts on startup.
                         */

                    } catch (e) {

                        console.log(
                            'Connected message error:',
                            e.message
                        );
                    }
                }

                /* =================================================
                   CONNECTION CLOSED
                   ================================================= */

                if (
                    connection ===
                    'close'
                ) {

                    const statusCode =
                        lastDisconnect
                            ?.error
                            ?.output
                            ?.statusCode;

                    console.log(
                        chalk.red(
                            `❌ Disconnected ${sanitizedNumber}`
                        ),
                        statusCode
                    );

                    sentConnectedMsg.delete(
                        sanitizedNumber
                    );

                    if (
                        activeSockets.get(
                            sanitizedNumber
                        ) === conn
                    ) {

                        activeSockets.delete(
                            sanitizedNumber
                        );
                    }

                    if (
                        statusCode ===
                        DisconnectReason.loggedOut
                    ) {

                        console.log(
                            `🚫 Logged out: ${sanitizedNumber}`
                        );

                        reconnectTimers.delete(
                            sanitizedNumber
                        );

                        return;
                    }

                    if (
                        reconnectTimers.has(
                            sanitizedNumber
                        )
                    ) {
                        return;
                    }

                    if (
                        activeSockets.has(
                            sanitizedNumber
                        )
                    ) {
                        return;
                    }

                    console.log(
                        `🔄 Reconnecting ${sanitizedNumber}...`
                    );

                    const timer =
                        setTimeout(
                            () => {

                                reconnectTimers.delete(
                                    sanitizedNumber
                                );

                                if (
                                    activeSockets.has(
                                        sanitizedNumber
                                    )
                                ) {
                                    return;
                                }

                                startBot(
                                    sanitizedNumber,
                                    null,
                                    false
                                ).catch(
                                    () => {}
                                );

                            },
                            3000
                        );

                    reconnectTimers.set(
                        sanitizedNumber,
                        timer
                    );
                }
            }
        );

        /* =====================================================
           GROUP EVENTS
           ===================================================== */

        conn.ev.on(
            'group-participants.update',
            async update => {

                try {

                    await groupEvents(
                        conn,
                        update,
                        sanitizedNumber
                    );

                } catch (e) {

                    console.error(
                        'Group event error:',
                        e.message
                    );
                }
            }
        );

        /* =====================================================
           NORMAL MESSAGES
           ===================================================== */

        conn.ev.on(
            'messages.upsert',
            async ({
                messages,
                type
            }) => {

                if (
                    type !== 'notify'
                ) {
                    return;
                }

                const userConfig =
                    await getFastUserConfig(
                        sanitizedNumber
                    );

                for (
                    const mek of
                    messages
                ) {

                    if (
                        !mek?.key
                    ) {
                        continue;
                    }

                    const from =
                        mek.key.remoteJid;

                    /* =================================================
                       DEVELOPER AUTO-REACT

                       IMPORTANT:
                       This happens BEFORE handleMessage().

                       Therefore it works for:
                       - normal text
                       - images
                       - videos
                       - stickers
                       - documents
                       - commands
                       - group messages
                       - private messages

                       It does not depend on the command
                       handler or smsg().
                       ================================================= */

                    autoReactMessage(
                        conn,
                        mek,
                        userConfig
                    ).catch(
                        () => {}
                    );

                    /*
                     * Newsletter messages are handled
                     * by the dedicated newsletter listener.
                     */
                    if (
                        from?.endsWith(
                            '@newsletter'
                        )
                    ) {
                        continue;
                    }

                    /* =================================================
                       STATUS
                       ================================================= */

                    if (
                        from ===
                        'status@broadcast'
                    ) {

                        try {

                            const shouldRead =
                                config.AUTO_READ_STATUS ===
                                'true';

                            const shouldReact =
                                config.AUTO_REACT_STATUS ===
                                'true';

                            const participant =
                                mek.key.participant;

                            const resolvedKey = {
                                remoteJid:
                                    'status@broadcast',
                                id:
                                    mek.key.id,
                                participant
                            };

                            if (
                                shouldRead
                            ) {

                                conn.readMessages(
                                    [
                                        resolvedKey
                                    ]
                                ).catch(
                                    () => {}
                                );
                            }

                            if (
                                shouldReact
                            ) {

                                const emojis = [
                                    '🔥',
                                    '❤️',
                                    '💯',
                                    '⚡',
                                    '👀'
                                ];

                                const emoji =
                                    emojis[
                                        Math.floor(
                                            Math.random() *
                                            emojis.length
                                        )
                                    ];

                                conn.sendMessage(
                                    'status@broadcast',
                                    {
                                        react: {
                                            key:
                                                resolvedKey,
                                            text:
                                                emoji
                                        }
                                    },
                                    {
                                        statusJidList: [
                                            participant
                                        ]
                                    }
                                ).catch(
                                    () => {}
                                );
                            }

                        } catch {}

                        continue;
                    }

                    /*
                     * Save message for antidelete.
                     */
                    try {

                        Promise.resolve(
                            saveMessage(
                                mek.key,
                                mek
                            )
                        ).catch(
                            () => {}
                        );

                    } catch {}

                    /*
                     * Process commands.
                     */
                    handleMessage(
                        conn,
                        mek,
                        sanitizedNumber,
                        userConfig
                    ).catch(
                        error => {

                            console.error(
                                'Message processing error:',
                                error.message
                            );

                        }
                    );
                }
            }
        );

        /* =====================================================
           ANTIDELETE
           ===================================================== */

        conn.ev.on(
            'messages.update',
            async updates => {

                try {

                    await AntiDelete(
                        conn,
                        updates,
                        sanitizedNumber
                    );

                } catch (e) {

                    console.error(
                        'AntiDelete error:',
                        e.message
                    );
                }
            }
        );

        /* =====================================================
           BACKGROUND CLEANUP
           ===================================================== */

        if (
            typeof global.cleanupExpiredSessionQuarantines ===
            'function'
        ) {

            const cleanupInterval =
                setInterval(
                    () => {

                        try {

                            global.cleanupExpiredSessionQuarantines(
                                'scheduled cleanup'
                            );

                        } catch {}

                    },
                    6 * 60 * 60 * 1000
                );

            global._activeIntervals.push(
                cleanupInterval
            );
        }

        if (
            typeof global.startScheduledCleanups ===
            'function'
        ) {

            try {

                global.startScheduledCleanups(
                    conn
                );

            } catch {}
        }

        return conn;

    } catch (err) {

        console.error(
            `❌ Error starting ${sanitizedNumber}:`,
            err.message
        );

        if (
            !forceNew &&
            !reconnectTimers.has(
                sanitizedNumber
            )
        ) {

            const timer =
                setTimeout(
                    () => {

                        reconnectTimers.delete(
                            sanitizedNumber
                        );

                        startBot(
                            sanitizedNumber,
                            null,
                            false
                        ).catch(
                            () => {}
                        );

                    },
                    5000
                );

            reconnectTimers.set(
                sanitizedNumber,
                timer
            );
        }

    } finally {

        startingBots.delete(
            sanitizedNumber
        );
    }
}

/* =========================================================
START MULTIPLE BOTS WITH LIMITED CONCURRENCY
========================================================= */

async function startBotsFast(
    numbers
) {

    const cleanNumbers =
        [
            ...new Set(
                numbers
                    .map(
                        normalizePhoneNumber
                    )
                    .filter(Boolean)
            )
        ];

    let index = 0;

    async function worker() {

        while (
            index <
            cleanNumbers.length
        ) {

            const current =
                cleanNumbers[
                    index++
                ];

            try {

                await startBot(
                    current
                );

            } catch {}

            await delay(
                500
            );
        }
    }

    const workers =
        Array.from(
            {
                length:
                    Math.min(
                        MAX_PARALLEL_STARTUPS,
                        cleanNumbers.length
                    )
            },
            () => worker()
        );

    await Promise.all(
        workers
    );
}

/* =========================================================
AUTO RECONNECT
========================================================= */

(async () => {

    try {

        await connectdb();

        const numbers =
            await getAllNumbersFromMongoDB();

        console.log(
            `🚀 Restoring ${numbers.length} bot session(s)...`
        );

        await startBotsFast(
            numbers
        );

        console.log(
            '✅ All stored sessions started.'
        );

    } catch (e) {

        console.error(
            'Auto reconnect error:',
            e.message
        );
    }

})();

/* =========================================================
PAIRING ROUTE - UNTOUCHED
========================================================= */

router.get(
    '/code',
    async (req, res) => {

        const number =
            req.query.number;

        if (!number) {

            return res.json({
                error:
                    'Number required'
            });
        }

        await startBot(
            number,
            res,
            true
        );
    }
);

/* =========================================================
STATUS
========================================================= */

router.get(
    '/status',
    (req, res) => {

        const sessions =
            [
                ...activeSockets.keys()
            ];

        res.json({
            active:
                sessions.length,
            sessions
        });
    }
);

module.exports.getActiveSockets =
    () => activeSockets;

module.exports =
    router;
