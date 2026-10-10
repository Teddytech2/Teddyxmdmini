const axios = require("axios");
const { cmd } = require("../inconnuboy");

console.log("✅ TEDDY-XMD anime.js loaded");

const API_URL = "http://51.75.118.170:20041/api/v1/anime";
const API_TIMEOUT = 30000;

/* ============================================================
 * HELPERS
 * ========================================================== */

function cleanText(text = "") {
    return String(text)
        .replace(/<[^>]*>/g, "")
        .trim();
}

function isValidUrl(url) {
    try {
        const parsed = new URL(url);
        return (
            parsed.protocol === "http:" ||
            parsed.protocol === "https:"
        );
    } catch {
        return false;
    }
}

function getArray(data) {
    if (Array.isArray(data)) return data;

    if (!data || typeof data !== "object") {
        return [];
    }

    const arrays = [
        data.results,
        data.result,
        data.data,
        data.anime,
        data.items,
        data.data?.results,
        data.data?.anime
    ];

    for (const value of arrays) {
        if (Array.isArray(value)) {
            return value;
        }
    }

    return [];
}

function getTitle(item) {
    return cleanText(
        item?.title ||
        item?.name ||
        item?.anime ||
        item?.anime_name ||
        item?.english_title ||
        item?.japanese_title ||
        "Unknown Anime"
    );
}

function getImage(item) {
    return (
        item?.image ||
        item?.imageUrl ||
        item?.image_url ||
        item?.poster ||
        item?.posterUrl ||
        item?.poster_url ||
        item?.thumbnail ||
        item?.cover ||
        item?.coverImage ||
        item?.cover_url ||
        null
    );
}

function getUrl(item) {
    return (
        item?.url ||
        item?.link ||
        item?.href ||
        item?.watch ||
        item?.watch_url ||
        item?.anime_url ||
        null
    );
}

function getDescription(item) {
    return cleanText(
        item?.description ||
        item?.desc ||
        item?.synopsis ||
        item?.overview ||
        ""
    );
}

function getEpisodes(item) {
    return (
        item?.episodes ||
        item?.episode_count ||
        item?.total_episodes ||
        null
    );
}

function getStatus(item) {
    return (
        item?.status ||
        item?.airing_status ||
        null
    );
}

/* ============================================================
 * API REQUEST
 * ========================================================== */

async function animeRequest(params = {}) {
    const response = await axios.get(
        API_URL,
        {
            params,

            timeout: API_TIMEOUT,

            headers: {
                "User-Agent": "TEDDY-XMD",
                "Accept": "application/json"
            },

            validateStatus: status =>
                status >= 200 && status < 500
        }
    );

    if (
        response.status < 200 ||
        response.status >= 300
    ) {
        throw new Error(
            `Anime API returned HTTP ${response.status}`
        );
    }

    return response.data;
}

/* ============================================================
 * SEARCH ANIME
 * ========================================================== */

cmd(
    {
        pattern: "anime",

        alias: [
            "animesearch",
            "searchanime"
        ],

        react: "🍥",

        desc: "Search for anime",

        category: "anime",

        use: ".anime <anime name>",

        filename: __filename
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

            const query = String(
                m?.text ||
                m?.body ||
                ""
            )
                .replace(
                    /^\.?(anime|animesearch|searchanime)\s*/i,
                    ""
                )
                .trim();

            if (!query) {

                return await reply(
                    "🍥 *TEDDY-XMD ANIME*\n\n" +
                    "*Usage:*\n" +
                    "`.anime Naruto`\n" +
                    "`.anime One Piece`\n" +
                    "`.anime Demon Slayer`"
                );
            }

            await conn.sendMessage(
                from,
                {
                    react: {
                        text: "🔎",
                        key: mek.key
                    }
                }
            );

            await reply(
                `_🔎 Searching for *${query}*..._`
            );

            let data;

            try {

                data = await animeRequest({
                    q: query
                });

            } catch {

                try {

                    data = await animeRequest({
                        query: query
                    });

                } catch {

                    data = await animeRequest({
                        search: query
                    });
                }
            }

            let results = getArray(data);

            /*
             * Handle APIs that return one object
             */

            if (
                !results.length &&
                data &&
                typeof data === "object" &&
                !Array.isArray(data)
            ) {

                if (
                    data.title ||
                    data.name ||
                    data.anime
                ) {
                    results = [data];
                }
            }

            if (!results.length) {

                await conn.sendMessage(
                    from,
                    {
                        react: {
                            text: "❌",
                            key: mek.key
                        }
                    }
                );

                return await reply(
                    `❌ No anime found for *${query}*.`
                );
            }

            results = results.slice(0, 10);

            let text =
                `🍥 *TEDDY-XMD ANIME SEARCH*\n\n`;

            text +=
                `🔎 *Query:* ${query}\n`;

            text +=
                `📚 *Results:* ${results.length}\n\n`;

            results.forEach(
                (item, index) => {

                    const title =
                        getTitle(item);

                    const url =
                        getUrl(item);

                    const episodes =
                        getEpisodes(item);

                    const status =
                        getStatus(item);

                    text +=
                        `*${index + 1}. ${title}*\n`;

                    if (episodes) {
                        text +=
                            `🎬 Episodes: ${episodes}\n`;
                    }

                    if (status) {
                        text +=
                            `📡 Status: ${status}\n`;
                    }

                    if (url) {
                        text +=
                            `🔗 ${url}\n`;
                    }

                    text += "\n";
                }
            );

            text +=
                `> Powered by TEDDY-XMD`;

            await conn.sendMessage(
                from,
                {
                    text: text
                },
                {
                    quoted: mek
                }
            );

            await conn.sendMessage(
                from,
                {
                    react: {
                        text: "✅",
                        key: mek.key
                    }
                }
            );

        } catch (error) {

            console.error(
                "❌ TEDDY-XMD ANIME ERROR:",
                error
            );

            try {

                await conn.sendMessage(
                    from,
                    {
                        react: {
                            text: "❌",
                            key: mek.key
                        }
                    }
                );

            } catch {}

            let message =
                "❌ *Anime API request failed.*";

            if (
                error.code === "ECONNABORTED"
            ) {

                message +=
                    "\n\n⏱️ API request timed out.";

            } else {

                message +=
                    `\n\n${error.message || "Unknown error"}`;
            }

            await reply(message);
        }
    }
);

/* ============================================================
 * ANIME INFO
 * ========================================================== */

cmd(
    {
        pattern: "animeinfo",

        alias: [
            "aninfo",
            "animedetails"
        ],

        react: "📖",

        desc: "Get anime information",

        category: "anime",

        use: ".animeinfo <anime name>",

        filename: __filename
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

            const query = String(
                m?.text ||
                m?.body ||
                ""
            )
                .replace(
                    /^\.?(animeinfo|aninfo|animedetails)\s*/i,
                    ""
                )
                .trim();

            if (!query) {

                return await reply(
                    "❌ Usage: `.animeinfo <anime name>`"
                );
            }

            await reply(
                `_📖 Getting information for *${query}*..._`
            );

            let data;

            try {

                data = await animeRequest({
                    q: query
                });

            } catch {

                try {

                    data = await animeRequest({
                        query: query
                    });

                } catch {

                    data = await animeRequest({
                        search: query
                    });
                }
            }

            const results =
                getArray(data);

            let item =
                results[0];

            if (!item) {

                if (
                    data &&
                    typeof data === "object" &&
                    !Array.isArray(data)
                ) {
                    item = data;
                }
            }

            if (!item) {

                return await reply(
                    `❌ No information found for *${query}*.`
                );
            }

            const title =
                getTitle(item);

            const image =
                getImage(item);

            const url =
                getUrl(item);

            const description =
                getDescription(item);

            const episodes =
                getEpisodes(item);

            const status =
                getStatus(item);

            let text =
                `🍥 *${title}*\n\n`;

            if (description) {

                text +=
                    `📖 *Description:*\n` +
                    `${description.slice(0, 1000)}\n\n`;
            }

            if (episodes) {

                text +=
                    `🎬 *Episodes:* ${episodes}\n`;
            }

            if (status) {

                text +=
                    `📡 *Status:* ${status}\n`;
            }

            if (url) {

                text +=
                    `🔗 *URL:* ${url}\n`;
            }

            text +=
                `\n> Powered by TEDDY-XMD`;

            if (
                image &&
                isValidUrl(image)
            ) {

                await conn.sendMessage(
                    from,
                    {
                        image: {
                            url: image
                        },
                        caption: text
                    },
                    {
                        quoted: mek
                    }
                );

            } else {

                await conn.sendMessage(
                    from,
                    {
                        text: text
                    },
                    {
                        quoted: mek
                    }
                );
            }

            await conn.sendMessage(
                from,
                {
                    react: {
                        text: "✅",
                        key: mek.key
                    }
                }
            );

        } catch (error) {

            console.error(
                "❌ TEDDY-XMD ANIMEINFO ERROR:",
                error
            );

            await reply(
                "❌ *Failed to get anime information.*\n\n" +
                `${error.message || "Unknown error"}`
            );
        }
    }
);
