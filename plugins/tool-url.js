const axios = require("axios");
const FormData = require("form-data");

const {
    downloadMediaMessage,
    getContentType
} = require("xzcbailz");

const { cmd } = require("../inconnuboy");

console.log("✅ TEDDY-XMD tourl.js loaded");

/* ============================================================
 * TEDDY-XMD TO URL
 *
 * Upload order:
 *
 * 1. Catbox
 * 2. Anon.Cat
 * 3. 0x0.st
 *
 * Supports:
 * - Images
 * - Videos
 * - Audio
 * - Documents
 * - Stickers
 * - Direct file URLs
 *
 * Maximum:
 * 200 MB
 * ========================================================== */

const MAX_SIZE = 200 * 1024 * 1024;

const DOWNLOAD_TIMEOUT = 120000;
const UPLOAD_TIMEOUT = 180000;


/* ============================================================
 * FORMAT BYTES
 * ========================================================== */

function formatBytes(bytes = 0) {
    if (!bytes) return "0 Bytes";

    const sizes = [
        "Bytes",
        "KB",
        "MB",
        "GB"
    ];

    const i = Math.floor(
        Math.log(bytes) / Math.log(1024)
    );

    return (
        parseFloat(
            (
                bytes /
                Math.pow(1024, i)
            ).toFixed(2)
        ) +
        " " +
        sizes[i]
    );
}


/* ============================================================
 * MIME → EXTENSION
 * ========================================================== */

function getExtension(mime = "") {

    mime = String(mime)
        .split(";")[0]
        .trim()
        .toLowerCase();

    const extensions = {

        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/png": "png",
        "image/gif": "gif",
        "image/webp": "webp",
        "image/bmp": "bmp",
        "image/svg+xml": "svg",

        "video/mp4": "mp4",
        "video/webm": "webm",
        "video/avi": "avi",
        "video/x-msvideo": "avi",
        "video/quicktime": "mov",
        "video/3gpp": "3gp",

        "audio/mpeg": "mp3",
        "audio/mp3": "mp3",
        "audio/wav": "wav",
        "audio/ogg": "ogg",
        "audio/opus": "opus",
        "audio/mp4": "m4a",
        "audio/x-m4a": "m4a",
        "audio/aac": "aac",

        "application/pdf": "pdf",
        "text/plain": "txt",
        "text/csv": "csv",
        "application/rtf": "rtf",

        "application/msword": "doc",
        "application/vnd.ms-excel": "xls",
        "application/vnd.ms-powerpoint": "ppt",

        "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            "docx",

        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
            "xlsx",

        "application/vnd.openxmlformats-officedocument.presentationml.presentation":
            "pptx",

        "application/zip": "zip",
        "application/x-rar-compressed": "rar",
        "application/vnd.rar": "rar",
        "application/x-7z-compressed": "7z",

        "application/json": "json",

        "application/octet-stream": "bin"
    };

    return extensions[mime] || "bin";
}


/* ============================================================
 * SANITIZE FILE NAME
 * ========================================================== */

function sanitizeFileName(name) {

    if (!name) return null;

    return String(name)
        .replace(
            /[<>:"/\\|?*\x00-\x1F]/g,
            "_"
        )
        .replace(
            /\s+/g,
            "_"
        )
        .slice(0, 180);
}


/* ============================================================
 * EXTRACT URL
 * ========================================================== */

function extractUrl(text = "") {

    if (!text) return "";

    return text
        .trim()
        .replace(
            /^\.?(tourl|url|imgurl|upload|geturl|catbox|cbox|host)\s*/i,
            ""
        )
        .trim()
        .replace(
            /^<|>$/g,
            ""
        );
}


/* ============================================================
 * VALIDATE URL
 * ========================================================== */

function isValidUrl(url) {

    try {

        const parsed =
            new URL(url);

        return (
            parsed.protocol === "http:" ||
            parsed.protocol === "https:"
        );

    } catch {

        return false;
    }
}


/* ============================================================
 * UNWRAP WHATSAPP MESSAGE
 * ========================================================== */

function unwrapMessage(message) {

    let current = message;

    if (!current) {
        return null;
    }

    for (let i = 0; i < 6; i++) {

        if (!current) break;

        if (
            current.ephemeralMessage?.message
        ) {

            current =
                current.ephemeralMessage.message;

            continue;
        }

        if (
            current.viewOnceMessage?.message
        ) {

            current =
                current.viewOnceMessage.message;

            continue;
        }

        if (
            current.viewOnceMessageV2?.message
        ) {

            current =
                current.viewOnceMessageV2.message;

            continue;
        }

        if (
            current.viewOnceMessageV2Extension?.message
        ) {

            current =
                current.viewOnceMessageV2Extension.message;

            continue;
        }

        break;
    }

    return current;
}


/* ============================================================
 * GET QUOTED MESSAGE
 * ========================================================== */

function getQuotedInfo(mek) {

    const contextInfo =
        mek?.message?.extendedTextMessage?.contextInfo ||
        mek?.message?.imageMessage?.contextInfo ||
        mek?.message?.videoMessage?.contextInfo ||
        mek?.message?.audioMessage?.contextInfo ||
        mek?.message?.documentMessage?.contextInfo ||
        mek?.message?.stickerMessage?.contextInfo;

    if (!contextInfo?.quotedMessage) {
        return null;
    }

    const quotedMessage =
        unwrapMessage(
            contextInfo.quotedMessage
        );

    if (!quotedMessage) {
        return null;
    }

    return {

        message:
            quotedMessage,

        stanzaId:
            contextInfo.stanzaId,

        participant:
            contextInfo.participant
    };
}


/* ============================================================
 * DETECT MEDIA
 * ========================================================== */

function getMediaType(message) {

    if (!message) {
        return null;
    }

    const unwrapped =
        unwrapMessage(message);

    if (!unwrapped) {
        return null;
    }

    let type;

    try {

        type =
            getContentType(
                unwrapped
            );

    } catch {

        type = null;
    }

    const supported = [
        "imageMessage",
        "videoMessage",
        "audioMessage",
        "documentMessage",
        "stickerMessage"
    ];

    return supported.includes(type)
        ? type
        : null;
}


/* ============================================================
 * DOWNLOAD URL
 * ========================================================== */

async function downloadFromUrl(url) {

    const response =
        await axios.get(
            url,
            {
                responseType:
                    "arraybuffer",

                timeout:
                    DOWNLOAD_TIMEOUT,

                maxContentLength:
                    MAX_SIZE,

                maxBodyLength:
                    MAX_SIZE,

                maxRedirects:
                    5,

                validateStatus:
                    status =>
                        status >= 200 &&
                        status < 300,

                headers: {

                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",

                    "Accept":
                        "*/*"
                }
            }
        );

    const buffer =
        Buffer.from(
            response.data
        );

    if (!buffer.length) {
        throw new Error(
            "Downloaded file is empty"
        );
    }

    if (
        buffer.length >
        MAX_SIZE
    ) {

        throw new Error(
            `File exceeds ${formatBytes(MAX_SIZE)}`
        );
    }

    let contentType =
        String(
            response.headers[
                "content-type"
            ] ||
            "application/octet-stream"
        )
            .split(";")[0]
            .trim()
            .toLowerCase();

    let fileName = null;

    const disposition =
        response.headers[
            "content-disposition"
        ];

    if (disposition) {

        const match =
            disposition.match(
                /filename\*?=(?:UTF-8'')?"?([^";\n]+)"?/i
            );

        if (match?.[1]) {

            try {

                fileName =
                    decodeURIComponent(
                        match[1].trim()
                    );

            } catch {

                fileName =
                    match[1].trim();
            }
        }
    }

    if (!fileName) {

        try {

            const parsed =
                new URL(url);

            const pathname =
                decodeURIComponent(
                    parsed.pathname
                );

            const name =
                pathname
                    .split("/")
                    .filter(Boolean)
                    .pop();

            if (name) {
                fileName = name;
            }

        } catch {}
    }

    if (!fileName) {

        fileName =
            `teddyxmd_${Date.now()}.${getExtension(
                contentType
            )}`;
    }

    fileName =
        sanitizeFileName(
            fileName
        );

    return {
        buffer,
        fileName,
        contentType
    };
}


/* ============================================================
 * DOWNLOAD QUOTED MEDIA
 * ========================================================== */

async function downloadQuotedMedia(
    conn,
    mek,
    quotedInfo
) {

    const mediaType =
        getMediaType(
            quotedInfo.message
        );

    if (!mediaType) {

        throw new Error(
            "Unsupported quoted message"
        );
    }

    const media =
        quotedInfo.message[
            mediaType
        ];

    const contentType =
        media?.mimetype ||
        (
            mediaType === "imageMessage"
                ? "image/jpeg"
                :
            mediaType === "videoMessage"
                ? "video/mp4"
                :
            mediaType === "audioMessage"
                ? "audio/mpeg"
                :
            mediaType === "stickerMessage"
                ? "image/webp"
                :
            "application/octet-stream"
        );

    const extension =
        getExtension(
            contentType
        );

    const fileName =
        sanitizeFileName(
            media?.fileName ||
            `teddyxmd_${Date.now()}.${extension}`
        );

    /*
     * Reconstruct the quoted WhatsApp
     * message using the original stanza ID.
     */

    const fakeMsg = {

        key: {

            ...mek.key,

            id:
                quotedInfo.stanzaId ||
                mek.key.id,

            participant:
                quotedInfo.participant ||
                mek.key.participant,

            fromMe:
                false
        },

        message:
            quotedInfo.message
    };

    const buffer =
        await downloadMediaMessage(
            fakeMsg,
            "buffer",
            {},
            {
                logger:
                    conn.logger,

                reuploadRequest:
                    typeof conn.updateMediaMessage ===
                    "function"
                        ? conn.updateMediaMessage
                        : undefined
            }
        );

    if (
        !buffer ||
        !buffer.length
    ) {

        throw new Error(
            "WhatsApp returned an empty media file"
        );
    }

    if (
        buffer.length >
        MAX_SIZE
    ) {

        throw new Error(
            `File exceeds ${formatBytes(MAX_SIZE)}`
        );
    }

    return {

        buffer:
            Buffer.from(buffer),

        fileName,

        contentType
    };
}


/* ============================================================
 * HOST #1 — CATBOX
 * ========================================================== */

async function uploadCatbox(
    buffer,
    fileName,
    contentType
) {

    const form =
        new FormData();

    form.append(
        "reqtype",
        "fileupload"
    );

    form.append(
        "fileToUpload",
        buffer,
        {
            filename:
                sanitizeFileName(
                    fileName
                ) ||
                `teddyxmd_${Date.now()}.bin`,

            contentType:
                contentType ||
                "application/octet-stream",

            knownLength:
                buffer.length
        }
    );

    const response =
        await axios.post(
            "https://catbox.moe/user/api.php",
            form,
            {
                headers: {

                    ...form.getHeaders(),

                    "User-Agent":
                        "TEDDY-XMD",

                    "Accept":
                        "*/*"
                },

                timeout:
                    UPLOAD_TIMEOUT,

                maxContentLength:
                    MAX_SIZE +
                    1024 * 1024,

                maxBodyLength:
                    MAX_SIZE +
                    1024 * 1024,

                validateStatus:
                    () => true
            }
        );

    const result =
        String(
            response.data ||
            ""
        ).trim();

    if (
        response.status < 200 ||
        response.status >= 300
    ) {

        throw new Error(
            `Catbox HTTP ${response.status}`
        );
    }

    if (
        !result ||
        !/^https?:\/\/files\.catbox\.moe\//i.test(
            result
        )
    ) {

        throw new Error(
            result ||
            "Catbox returned an invalid URL"
        );
    }

    return result;
}


/* ============================================================
 * HOST #2 — ANON.CAT
 *
 * Anon.Cat supports multipart uploads.
 * ========================================================== */

async function uploadAnonCat(
    buffer,
    fileName,
    contentType
) {

    const form =
        new FormData();

    form.append(
        "files[]",
        buffer,
        {
            filename:
                sanitizeFileName(
                    fileName
                ) ||
                `teddyxmd_${Date.now()}.bin`,

            contentType:
                contentType ||
                "application/octet-stream",

            knownLength:
                buffer.length
        }
    );

    const response =
        await axios.post(
            "https://up.anon.cat/upload",
            form,
            {
                headers: {

                    ...form.getHeaders(),

                    "User-Agent":
                        "TEDDY-XMD",

                    "Accept":
                        "application/json,text/plain,*/*"
                },

                timeout:
                    UPLOAD_TIMEOUT,

                maxContentLength:
                    MAX_SIZE +
                    1024 * 1024,

                maxBodyLength:
                    MAX_SIZE +
                    1024 * 1024,

                validateStatus:
                    () => true
            }
        );

    if (
        response.status < 200 ||
        response.status >= 300
    ) {

        throw new Error(
            `Anon.Cat HTTP ${response.status}`
        );
    }

    let result =
        response.data;

    /*
     * Anon.Cat normally returns JSON.
     * Handle JSON and plain text responses.
     */

    if (
        typeof result ===
        "object"
    ) {

        const possibleUrl =
            result?.url ||
            result?.file ||
            result?.files?.[0]?.url ||
            result?.data?.url ||
            result?.data?.[0]?.url;

        if (
            possibleUrl &&
            /^https?:\/\//i.test(
                possibleUrl
            )
        ) {

            return possibleUrl;
        }
    }

    result =
        String(
            result ||
            ""
        ).trim();

    /*
     * Extract URL from JSON/text.
     */

    const urlMatch =
        result.match(
            /https?:\/\/[^\s"'<>]+/i
        );

    if (
        urlMatch &&
        /^https?:\/\//i.test(
            urlMatch[0]
        )
    ) {

        return urlMatch[0];
    }

    throw new Error(
        "Anon.Cat returned an invalid response"
    );
}


/* ============================================================
 * HOST #3 — 0x0.ST
 * ========================================================== */

async function upload0x0(
    buffer,
    fileName,
    contentType
) {

    const form =
        new FormData();

    form.append(
        "file",
        buffer,
        {
            filename:
                sanitizeFileName(
                    fileName
                ) ||
                `teddyxmd_${Date.now()}.bin`,

            contentType:
                contentType ||
                "application/octet-stream",

            knownLength:
                buffer.length
        }
    );

    const response =
        await axios.post(
            "https://0x0.st",
            form,
            {
                headers: {

                    ...form.getHeaders(),

                    "User-Agent":
                        "TEDDY-XMD",

                    "Accept":
                        "text/plain,*/*"
                },

                timeout:
                    UPLOAD_TIMEOUT,

                maxContentLength:
                    MAX_SIZE +
                    1024 * 1024,

                maxBodyLength:
                    MAX_SIZE +
                    1024 * 1024,

                validateStatus:
                    () => true
            }
        );

    if (
        response.status < 200 ||
        response.status >= 300
    ) {

        throw new Error(
            `0x0 HTTP ${response.status}`
        );
    }

    const result =
        String(
            response.data ||
            ""
        ).trim();

    const urlMatch =
        result.match(
            /https?:\/\/0x0\.st\/[^\s"'<>]+/i
        );

    if (
        urlMatch
    ) {

        return urlMatch[0];
    }

    if (
        /^https?:\/\/0x0\.st\//i.test(
            result
        )
    ) {

        return result;
    }

    throw new Error(
        result ||
        "0x0 returned an invalid URL"
    );
}


/* ============================================================
 * UPLOAD WITH FALLBACKS
 * ========================================================== */

async function uploadWithFallbacks(
    buffer,
    fileName,
    contentType,
    statusCallback
) {

    const hosts = [

        {
            name:
                "Catbox",

            upload:
                uploadCatbox
        },

        {
            name:
                "Anon.Cat",

            upload:
                uploadAnonCat
        },

        {
            name:
                "0x0.st",

            upload:
                upload0x0
        }
    ];

    const errors = [];

    for (
        const host of hosts
    ) {

        try {

            if (
                statusCallback
            ) {

                await statusCallback(
                    host.name
                );
            }

            console.log(
                `☁️ TEDDY-XMD uploading to ${host.name}...`
            );

            const url =
                await host.upload(
                    buffer,
                    fileName,
                    contentType
                );

            if (
                url &&
                /^https?:\/\//i.test(
                    url
                )
            ) {

                console.log(
                    `✅ TEDDY-XMD upload successful: ${host.name}`
                );

                return {

                    url,

                    host:
                        host.name
                };
            }

        } catch (error) {

            const errorText =
                error?.message ||
                String(error);

            console.error(
                `❌ ${host.name} failed:`,
                errorText
            );

            errors.push(
                `${host.name}: ${errorText}`
            );
        }
    }

    throw new Error(
        "All upload servers failed.\n\n" +
        errors.join("\n")
    );
}


/* ============================================================
 * COMMAND
 * ========================================================== */

cmd(
    {

        pattern:
            "tourl",

        alias: [

            "url",
            "imgurl",
            "upload",
            "geturl",
            "catbox",
            "cbox",
            "host"
        ],

        react:
            "🖇️",

        desc:
            "Upload media or files and get a public URL",

        category:
            "utility",

        use:
            ".tourl [URL] or reply to media",

        filename:
            __filename
    },

    async (
        conn,
        mek,
        m,
        {
            from,
            reply
        }
    ) => {

        try {

            /* ==================================================
             * START REACTION
             * ================================================= */

            await conn.sendMessage(
                from,
                {
                    react: {

                        text:
                            "⏳",

                        key:
                            mek.key
                    }
                }
            );


            let result = null;


            /* ==================================================
             * CHECK QUOTED MEDIA
             * ================================================= */

            const quotedInfo =
                getQuotedInfo(
                    mek
                );


            /* ==================================================
             * MODE 1 — QUOTED MEDIA
             * ================================================= */

            if (
                quotedInfo
            ) {

                const mediaType =
                    getMediaType(
                        quotedInfo.message
                    );

                if (!mediaType) {

                    await reply(

                        "❌ *Unsupported quoted message!*\n\n" +

                        "Reply to:\n" +

                        "🖼️ Image\n" +
                        "🎥 Video\n" +
                        "🎵 Audio\n" +
                        "📄 Document\n" +
                        "🎨 Sticker"
                    );

                    return;
                }


                await reply(
                    "_📥 Downloading media..._"
                );


                result =
                    await downloadQuotedMedia(
                        conn,
                        mek,
                        quotedInfo
                    );
            }


            /* ==================================================
             * MODE 2 — URL
             * ================================================= */

            else {

                const url =
                    extractUrl(
                        m?.text ||
                        m?.body ||
                        ""
                    );


                if (!url) {

                    await reply(

                        "❌ *No file provided!*\n\n" +

                        "*Reply to media:*\n" +

                        "`.tourl`\n\n" +

                        "*Or use a URL:*\n" +

                        "`.tourl https://example.com/file.jpg`\n\n" +

                        "*Supported:*\n" +

                        "🖼️ Images\n" +
                        "🎥 Videos\n" +
                        "🎵 Audio\n" +
                        "📄 Documents\n" +
                        "🎨 Stickers"
                    );

                    return;
                }


                if (
                    !isValidUrl(
                        url
                    )
                ) {

                    await reply(

                        "❌ *Invalid URL!*\n\n" +

                        "Use a valid `http://` or `https://` URL."
                    );

                    return;
                }


                await reply(
                    "_📥 Downloading file..._"
                );


                result =
                    await downloadFromUrl(
                        url
                    );
            }


            /* ==================================================
             * SAFETY CHECK
             * ================================================= */

            if (
                !result?.buffer ||
                !result.buffer.length
            ) {

                throw new Error(
                    "Unable to obtain file data"
                );
            }


            if (
                result.buffer.length >
                MAX_SIZE
            ) {

                throw new Error(
                    `File exceeds ${formatBytes(MAX_SIZE)}`
                );
            }


            /* ==================================================
             * UPLOAD
             * ================================================= */

            await reply(
                "_☁️ Uploading to Catbox..._"
            );


            const uploaded =
                await uploadWithFallbacks(

                    result.buffer,

                    result.fileName,

                    result.contentType,

                    async host => {

                        if (
                            host ===
                            "Catbox"
                        ) {

                            await reply(
                                "_☁️ Uploading to Catbox..._"
                            );

                        } else {

                            await reply(
                                `_🔄 Catbox unavailable. Trying ${host}..._`
                            );
                        }
                    }
                );


            /* ==================================================
             * SUCCESS REACTION
             * ================================================= */

            await conn.sendMessage(
                from,
                {
                    react: {

                        text:
                            "✅",

                        key:
                            mek.key
                    }
                }
            );


            /* ==================================================
             * RESPONSE
             * ================================================= */

            const hostedUrl =
                uploaded.url;

            const hostedName =
                hostedUrl
                    .split("/")
                    .pop() ||
                result.fileName;

            const botName =
                global.config?.BOT_NAME ||
                global.botname ||
                "TEDDY-XMD";


            const responseText =

                `*📦 TEDDY-XMD FILE HOST*\n\n` +

                `*📁 File:* ${hostedName}\n` +

                `*📏 Size:* ${formatBytes(
                    result.buffer.length
                )}\n` +

                `*📄 Type:* ${result.contentType}\n` +

                `*☁️ Host:* ${uploaded.host}\n\n` +

                `*🔗 Link:*\n` +

                `${hostedUrl}\n\n` +

                `> Powered by ${botName}`;


            await conn.sendMessage(
                from,
                {
                    text:
                        responseText
                },
                {
                    quoted:
                        mek
                }
            );

        } catch (error) {

            /* ==================================================
             * ERROR
             * ================================================= */

            console.error(
                "❌ TEDDY-XMD TOURL ERROR:",
                error
            );


            try {

                await conn.sendMessage(
                    from,
                    {
                        react: {

                            text:
                                "❌",

                            key:
                                mek.key
                        }
                    }
                );

            } catch {}


            let errorMessage =
                "❌ *Failed to upload file.*";


            const message =
                String(
                    error?.message ||
                    ""
                );


            if (
                /exceed|too large|200 mb/i.test(
                    message
                )
            ) {

                errorMessage +=
                    "\n\n📦 *Maximum size:* 200 MB";

            } else if (
                error?.code ===
                "ECONNABORTED"
            ) {

                errorMessage +=
                    "\n\n⏱️ *Request timed out.*";

            } else if (
                /All upload servers failed/i.test(
                    message
                )
            ) {

                errorMessage +=
                    "\n\n☁️ *All upload servers are currently unavailable.*";

            } else if (
                error?.response?.status
            ) {

                errorMessage +=
                    `\n\n🌐 *HTTP ${error.response.status}*`;

            } else if (
                message
            ) {

                errorMessage +=
                    `\n\n${message.slice(0, 500)}`;
            }


            await reply(
                errorMessage
            );
        }
    }
);
