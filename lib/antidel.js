/* =========================================================
TEDDY-XMD ALWAYS-ON ANTI-DELETE
========================================================= */

const {
    proto,
    isJidGroup,
    downloadMediaMessage
} = require('xzcbailz');

const {
    getAnti
} = require('../data/antidelete');

/* =========================================================
MESSAGE CACHE
========================================================= */

/*
 * Keep deleted-message candidates for 24 hours.
 *
 * This is intentionally longer than the old 1 hour cache.
 */
const messageCache =
    new Map();

const CACHE_TTL =
    24 * 60 * 60 * 1000;

/*
 * Prevent processing the same revoke twice.
 */
const processedDeletes =
    new Set();

const DELETE_MEMORY_TTL =
    30 * 60 * 1000;

/* =========================================================
CACHE KEY
========================================================= */

const cacheKey = key => {

    if (
        !key?.remoteJid ||
        !key?.id
    ) {
        return null;
    }

    return `${key.remoteJid}:${key.id}`;
};

/* =========================================================
UNWRAP MESSAGE
========================================================= */

const unwrapMessage = message => {

    if (!message) {
        return null;
    }

    let msg =
        message;

    /*
     * Ephemeral messages.
     */
    if (
        msg.ephemeralMessage?.message
    ) {
        msg =
            msg.ephemeralMessage.message;
    }

    /*
     * View once.
     */
    if (
        msg.viewOnceMessage?.message
    ) {
        msg =
            msg.viewOnceMessage.message;
    }

    /*
     * View once V2.
     */
    if (
        msg.viewOnceMessageV2?.message
    ) {
        msg =
            msg.viewOnceMessageV2.message;
    }

    /*
     * View once V2 extension.
     */
    if (
        msg.viewOnceMessageV2Extension?.message
    ) {
        msg =
            msg.viewOnceMessageV2Extension.message;
    }

    /*
     * Document with caption / other wrappers.
     */
    if (
        msg.documentWithCaptionMessage?.message
    ) {
        msg =
            msg.documentWithCaptionMessage.message;
    }

    return msg;
};

/* =========================================================
SAVE MESSAGE
========================================================= */

const saveMessage = (
    key,
    msg
) => {

    try {

        if (
            !msg?.message
        ) {
            return;
        }

        if (
            !key?.id
        ) {
            return;
        }

        /*
         * Don't cache bot's own messages.
         */
        if (
            key.fromMe
        ) {
            return;
        }

        /*
         * Don't cache status.
         */
        if (
            key.remoteJid ===
            'status@broadcast'
        ) {
            return;
        }

        /*
         * Don't cache newsletters.
         */
        if (
            key.remoteJid?.endsWith(
                '@newsletter'
            )
        ) {
            return;
        }

        const id =
            cacheKey(key);

        if (!id) {
            return;
        }

        /*
         * Store a copy of the key and message.
         */
        messageCache.set(
            id,
            {
                key: {
                    ...key
                },

                message:
                    msg.message,

                pushName:
                    msg.pushName,

                savedAt:
                    Date.now()
            }
        );

    } catch (error) {

        console.error(
            '❌ AntiDelete cache error:',
            error?.message ||
            error
        );
    }
};

/* =========================================================
CACHE CLEANUP
========================================================= */

const cleanupCache =
    setInterval(
        () => {

            try {

                const now =
                    Date.now();

                for (
                    const [
                        id,
                        item
                    ]
                    of messageCache
                ) {

                    if (
                        !item ||
                        now -
                            item.savedAt >
                            CACHE_TTL
                    ) {

                        messageCache.delete(
                            id
                        );
                    }
                }

            } catch {}

        },
        10 * 60 * 1000
    );

if (
    cleanupCache.unref
) {
    cleanupCache.unref();
}

/* =========================================================
DELETE MEMORY CLEANUP
========================================================= */

const cleanupDeleteMemory =
    setInterval(
        () => {

            /*
             * processedDeletes is only a Set,
             * so keep it bounded by clearing it periodically.
             */
            processedDeletes.clear();

        },
        DELETE_MEMORY_TTL
    );

if (
    cleanupDeleteMemory.unref
) {
    cleanupDeleteMemory.unref();
}

/* =========================================================
GET OWNER JID
========================================================= */

const getOwnerJid =
    botNumber => {

        const clean =
            String(
                botNumber || ''
            )
                .split('@')[0]
                .split(':')[0]
                .replace(
                    /[^0-9]/g,
                    ''
                );

        return clean
            ? `${clean}@s.whatsapp.net`
            : null;
    };

/* =========================================================
GET MESSAGE TYPE
========================================================= */

const getMessageType =
    message => {

        const msg =
            unwrapMessage(
                message
            ) || {};

        return (
            Object.keys(msg)
                .find(
                    key =>
                        ![
                            'messageContextInfo',
                            'senderKeyDistributionMessage',
                            'messageContextInfo'
                        ].includes(
                            key
                        )
                ) ||
            'message'
        );
    };

/* =========================================================
GET MESSAGE TEXT
========================================================= */

const getMessageText =
    message => {

        const msg =
            unwrapMessage(
                message
            ) || {};

        return (
            msg.conversation ||
            msg.extendedTextMessage?.text ||
            msg.imageMessage?.caption ||
            msg.videoMessage?.caption ||
            msg.documentMessage?.caption ||
            ''
        );
    };

/* =========================================================
SEND RECOVERED MESSAGE
========================================================= */

async function sendRecoveredMessage(
    conn,
    ownerJid,
    original,
    info
) {

    try {

        let msg =
            unwrapMessage(
                original?.message
            );

        if (!msg) {
            return false;
        }

        const type =
            getMessageType(
                msg
            );

        const text =
            getMessageText(
                msg
            );

        /* =====================================================
           TEXT
           ===================================================== */

        if (
            text !== undefined &&
            text !== null &&
            String(text).length > 0
        ) {

            await conn.sendMessage(
                ownerJid,
                {
                    text:
                        `${info}\n\n💬 *Content:* ${text}`
                }
            );

            return true;
        }

        /* =====================================================
           MEDIA
           ===================================================== */

        const mediaTypes = {

            imageMessage:
                'image',

            videoMessage:
                'video',

            audioMessage:
                'audio',

            documentMessage:
                'document',

            stickerMessage:
                'sticker'
        };

        if (
            mediaTypes[type]
        ) {

            let buffer;

            try {

                buffer =
                    await downloadMediaMessage(
                        {
                            key:
                                original.key,

                            message:
                                original.message
                        },
                        'buffer',
                        {},
                        {
                            logger:
                                console
                        }
                    );

            } catch (downloadError) {

                console.log(
                    '⚠️ AntiDelete media download failed:',
                    downloadError?.message ||
                    downloadError
                );

                /*
                 * Still inform the owner that
                 * the message was deleted.
                 */
                await conn.sendMessage(
                    ownerJid,
                    {
                        text:
                            `${info}\n\n⚠️ *Media could not be downloaded before recovery.*`
                    }
                );

                return false;
            }

            if (!buffer) {

                await conn.sendMessage(
                    ownerJid,
                    {
                        text:
                            `${info}\n\n⚠️ *Media buffer unavailable.*`
                    }
                );

                return false;
            }

            const media =
                msg[type];

            const payload = {
                [mediaTypes[type]]:
                    buffer
            };

            /* =================================================
               IMAGE
               ================================================= */

            if (
                type ===
                'imageMessage'
            ) {

                payload.caption =
                    `${info}${
                        media?.caption
                            ? `\n\n${media.caption}`
                            : ''
                    }`;

                payload.mentions =
                    info.match(
                        /@(\d+)/g
                    )?.map(
                        x =>
                            `${x.slice(1)}@s.whatsapp.net`
                    ) || [];
            }

            /* =================================================
               VIDEO
               ================================================= */

            else if (
                type ===
                'videoMessage'
            ) {

                payload.caption =
                    `${info}${
                        media?.caption
                            ? `\n\n${media.caption}`
                            : ''
                    }`;

                payload.mentions =
                    info.match(
                        /@(\d+)/g
                    )?.map(
                        x =>
                            `${x.slice(1)}@s.whatsapp.net`
                    ) || [];
            }

            /* =================================================
               AUDIO
               ================================================= */

            else if (
                type ===
                'audioMessage'
            ) {

                payload.mimetype =
                    media?.mimetype ||
                    'audio/mp4';

                payload.ptt =
                    !!media?.ptt;
            }

            /* =================================================
               DOCUMENT
               ================================================= */

            else if (
                type ===
                'documentMessage'
            ) {

                payload.fileName =
                    media?.fileName ||
                    'recovered-document';

                payload.mimetype =
                    media?.mimetype ||
                    'application/octet-stream';

                payload.caption =
                    info;
            }

            /* =================================================
               STICKER
               ================================================= */

            else if (
                type ===
                'stickerMessage'
            ) {

                /*
                 * Sticker payload normally only needs
                 * the buffer.
                 */
            }

            await conn.sendMessage(
                ownerJid,
                payload
            );

            return true;
        }

        /* =====================================================
           FALLBACK
           ===================================================== */

        await conn.sendMessage(
            ownerJid,
            {
                text:
                    `${info}\n\n⚠️ *Message type:* ${type.replace(
                        /Message$/,
                        ''
                    )}\n_This message type could not be restored automatically._`
            }
        );

        return false;

    } catch (error) {

        console.error(
            '❌ sendRecoveredMessage error:',
            error?.stack ||
            error?.message ||
            error
        );

        return false;
    }
}

/* =========================================================
ANTI-DELETE
ALWAYS ON
========================================================= */

async function AntiDelete(
    conn,
    updates,
    botNumber
) {

    for (
        const update
        of updates || []
    ) {

        try {

            const protocol =
                update
                    ?.update
                    ?.message
                    ?.protocolMessage;

            /*
             * Only handle revoke/delete events.
             */
            if (
                !protocol ||
                protocol.type !==
                    proto.Message.ProtocolMessage.Type.REVOKE
            ) {
                continue;
            }

            const deletedKey =
                protocol.key;

            const chat =
                deletedKey?.remoteJid;

            if (
                !deletedKey?.id ||
                !chat
            ) {
                continue;
            }

            /*
             * Never process status.
             */
            if (
                chat ===
                'status@broadcast'
            ) {
                continue;
            }

            /*
             * Never process newsletter deletes.
             */
            if (
                chat.endsWith(
                    '@newsletter'
                )
            ) {
                continue;
            }

            /*
             * Don't recover our own deleted messages.
             */
            if (
                deletedKey.fromMe
            ) {
                continue;
            }

            const deleteId =
                cacheKey(
                    deletedKey
                );

            if (!deleteId) {
                continue;
            }

            /*
             * Prevent duplicate revoke events.
             */
            if (
                processedDeletes.has(
                    deleteId
                )
            ) {
                continue;
            }

            processedDeletes.add(
                deleteId
            );

            /* =================================================
               ALWAYS ON

               We intentionally do NOT require:
               .antidelete on

               The feature is always active.

               getAnti() is checked only for compatibility
               with existing data, but a false/missing
               setting does NOT disable recovery.
               ================================================= */

            let configuredSetting = null;

            try {

                configuredSetting =
                    await getAnti(
                        botNumber,
                        chat
                    );

            } catch {}

            /*
             * Keep the value available for compatibility
             * and debugging, but don't use false to disable
             * the always-on system.
             */
            void configuredSetting;

            /* =================================================
               FIND ORIGINAL MESSAGE
               ================================================= */

            const original =
                messageCache.get(
                    deleteId
                );

            if (!original) {

                console.log(
                    `⚠️ AntiDelete: original message not found in cache (${chat}:${deletedKey.id})`
                );

                continue;
            }

            /* =================================================
               OWNER / CONNECTED USER
               ================================================= */

            const ownerJid =
                getOwnerJid(
                    botNumber
                );

            if (!ownerJid) {
                continue;
            }

            /* =================================================
               SENDER
               ================================================= */

            const sender =
                original.key.participant ||
                original.key.remoteJid ||
                '';

            const senderNum =
                String(sender)
                    .split('@')[0]
                    .split(':')[0]
                    .replace(
                        /[^0-9]/g,
                        ''
                    );

            /* =================================================
               CHAT NAME
               ================================================= */

            let chatName =
                'Private Chat';

            if (
                isJidGroup(
                    chat
                )
            ) {

                try {

                    const metadata =
                        await conn.groupMetadata(
                            chat
                        );

                    chatName =
                        metadata?.subject ||
                        chat;

                } catch {

                    chatName =
                        chat;
                }
            }

            /* =================================================
               TIME
               ================================================= */

            const time =
                new Date()
                    .toLocaleString(
                        'en-KE',
                        {
                            dateStyle:
                                'short',
                            timeStyle:
                                'short',
                            timeZone:
                                'Africa/Nairobi'
                        }
                    );

            /* =================================================
               MESSAGE TYPE
               ================================================= */

            const type =
                getMessageType(
                    original.message
                );

            /* =================================================
               RECOVERY INFO
               ================================================= */

            const info =
`╭───「 *🚨 ANTI-DELETE* 」───⬣
│
│ 👤 *From:* @${senderNum}
│ 🏷️ *Chat:* ${chatName}
│ ⏰ *Time:* ${time}
│ 📍 *Type:* ${type.replace(
    /Message$/,
    ''
)}
│
╰────────────────────────⬣`;

            /* =================================================
               SEND NOTICE
               ================================================= */

            await conn.sendMessage(
                ownerJid,
                {
                    text:
                        `${info}\n\n♻️ _Deleted message recovered below._`,
                    mentions:
                        sender
                            ? [sender]
                            : []
                }
            );

            /* =================================================
               SEND ORIGINAL
               ================================================= */

            await sendRecoveredMessage(
                conn,
                ownerJid,
                original,
                info
            );

            /*
             * Remove from cache after successful processing.
             */
            messageCache.delete(
                deleteId
            );

        } catch (error) {

            console.error(
                '❌ AntiDelete error:',
                error?.stack ||
                error?.message ||
                error
            );
        }
    }
}

/* =========================================================
EXPORTS
========================================================= */

module.exports = {
    AntiDelete,
    saveMessage
};
