const { cmd } = require('../inconnuboy');

const TRUTH_API =
    "https://api.shizo.top/quote/truth?apikey=shizo";

cmd({
    pattern: "truth",
    alias: ["truthquestion", "truthq"],
    react: "❓",
    desc: "Get a random truth question",
    category: "fun",
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

    const botName = "TEDDY-XMD";

    try {

        // -----------------------------
        // FETCH TRUTH QUESTION
        // -----------------------------
        const response =
            await fetch(TRUTH_API);

        if (!response.ok) {
            throw new Error(
                `API returned HTTP ${response.status}`
            );
        }

        const data =
            await response.json();

        // -----------------------------
        // CHECK API RESPONSE
        // -----------------------------
        if (
            !data ||
            data.status !== true ||
            !data.result
        ) {
            throw new Error(
                "Invalid response from Truth API"
            );
        }

        const question =
            String(data.result).trim();

        // -----------------------------
        // SEND QUESTION
        // -----------------------------
        await conn.sendMessage(
            from,
            {
                text:
`╭━━〔 ❓ *TRUTH QUESTION* 〕━━╮
┃
┃ 💭 ${question}
┃
╰━━━━━━━━━━━━━━━━━━╯

_🤖 ${botName}_`
            },
            {
                quoted: mek
            }
        );

    } catch (error) {

        console.error(
            "❌ TRUTH COMMAND ERROR:",
            error
        );

        return reply(
            "❌ *Failed to get a truth question.*\n\n" +
            "⚠️ The Truth API may be temporarily unavailable."
        );
    }
});
