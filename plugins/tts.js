const { cmd } = require('../inconnuboy')
const googleTTS = require('google-tts-api')
const axios = require('axios')

cmd({
    pattern: "tts",
    alias: ["speak", "say"],
    react: "🔊",
    desc: "Convert text to audio",
    category: "fun",
    filename: __filename
},
async (conn, mek, m, { from, q, args, reply }) => {

    try {

        // =====================================
        // CHECK TEXT
        // =====================================

        if (!q) {
            return reply(
                "*🗣️ TEDDY TTS*\n\n" +
                "*Usage:*\n" +
                "`.tts Hello how are you`\n\n" +
                "*Language:*\n" +
                "`.tts en Hello everyone`\n" +
                "`.tts sw Habari yako`\n" +
                "`.tts ur السلام علیکم`\n" +
                "`.tts hi नमस्ते`\n" +
                "`.tts fr Bonjour`\n\n" +
                "*Maximum:* 200 characters"
            )
        }

        // =====================================
        // SUPPORTED LANGUAGES
        // =====================================

        const languages = [
            "en", "sw", "ur", "hi", "ar",
            "fr", "es", "de", "it", "pt",
            "ru", "ja", "ko", "zh", "tr",
            "id", "nl", "pl", "vi", "bn",
            "ta", "te", "mr", "gu"
        ]

        let lang = "en"
        let text = q.trim()

        // =====================================
        // LANGUAGE DETECTION
        // =====================================

        if (
            args &&
            args.length > 1 &&
            languages.includes(args[0].toLowerCase())
        ) {
            lang = args[0].toLowerCase()
            text = args.slice(1).join(" ").trim()
        }

        if (!text) {
            return reply("*❌ Please provide text to speak.*")
        }

        if (text.length > 200) {
            return reply(
                "*❌ Text too long!*\n\n" +
                "Maximum allowed: *200 characters*."
            )
        }

        // =====================================
        // REACTION
        // =====================================

        await conn.sendMessage(from, {
            react: {
                text: "🔊",
                key: mek.key
            }
        })

        // =====================================
        // GENERATE GOOGLE TTS URL
        // =====================================

        const audioUrl = googleTTS.getAudioUrl(text, {
            lang: lang,
            slow: false,
            host: "https://translate.google.com"
        })

        console.log("━━━━━━━━━━━━━━━━━━━━")
        console.log("TEDDY TTS")
        console.log("Language:", lang)
        console.log("Text:", text)
        console.log("━━━━━━━━━━━━━━━━━━━━")

        // =====================================
        // DOWNLOAD MP3
        // =====================================

        const response = await axios.get(audioUrl, {
            responseType: "arraybuffer",
            timeout: 30000,
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            }
        })

        const audioBuffer = Buffer.from(response.data)

        if (!audioBuffer || audioBuffer.length === 0) {
            throw new Error(
                "Google TTS returned empty audio."
            )
        }

        console.log(
            "TTS audio:",
            audioBuffer.length,
            "bytes"
        )

        // =====================================
        // SEND MP3 AUDIO
        // NO FFMPEG REQUIRED
        // =====================================

        await conn.sendMessage(
            from,
            {
                audio: audioBuffer,
                mimetype: "audio/mpeg",
                fileName: "teddy-tts.mp3",
                ptt: false
            },
            {
                quoted: mek
            }
        )

        // =====================================
        // SUCCESS
        // =====================================

        await conn.sendMessage(from, {
            react: {
                text: "✅",
                key: mek.key
            }
        })

        console.log("✅ TEDDY TTS SENT")

    } catch (error) {

        console.error(
            "❌ TEDDY TTS ERROR:",
            error.message
        )

        try {
            await conn.sendMessage(from, {
                react: {
                    text: "❌",
                    key: mek.key
                }
            })
        } catch (_) {}

        return reply(
            "*❌ TTS FAILED*\n\n" +
            "Unable to generate the audio.\n\n" +
            "Please try again."
        )
    }
})
