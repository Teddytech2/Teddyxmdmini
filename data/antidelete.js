const mongoose = require('mongoose');

// =====================================================
// DELETE CACHED MODEL IF IT EXISTS
// =====================================================

if (mongoose.models.AntiDelV2) {
    delete mongoose.models.AntiDelV2;
}

// =====================================================
// SCHEMA
// =====================================================

const antiDelSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            required: true
        },

        chatId: {
            type: String,
            required: true
        },

        type: {
            type: String,
            enum: ['gc', 'dm', 'chat'],
            default: 'chat'
        },

        status: {
            type: Boolean,
            default: true
        }
    },
    {
        strict: false,
        collection: 'antidels_v2'
    }
);

const AntiDelDB = mongoose.model(
    'AntiDelV2',
    antiDelSchema
);

// =====================================================
// MEMORY CACHE
// =====================================================

const memoryCache = new Map();


// =====================================================
// HELPERS
// =====================================================

const isMongoReady = () => {
    return mongoose.connection.readyState === 1;
};

const makeKey = (userId, chatId) => {
    return `${userId}:${chatId}`;
};


// =====================================================
// INITIALIZE ANTI-DELETE SETTINGS
// ALWAYS ON
// =====================================================

const initializeAntiDeleteSettings = async (userId) => {
    try {
        if (!userId) return false;

        // Always keep memory settings ON
        memoryCache.set(
            makeKey(userId, 'gc'),
            true
        );

        memoryCache.set(
            makeKey(userId, 'dm'),
            true
        );

        if (!isMongoReady()) {
            console.log(
                `Mongo not ready, Anti-Delete kept ON in memory for ${userId}`
            );

            return true;
        }

        // GROUPS
        await AntiDelDB.findOneAndUpdate(
            {
                userId,
                chatId: 'gc'
            },
            {
                $setOnInsert: {
                    userId,
                    chatId: 'gc',
                    type: 'gc',
                    status: true
                }
            },
            {
                upsert: true,
                new: true
            }
        );

        // PRIVATE CHATS
        await AntiDelDB.findOneAndUpdate(
            {
                userId,
                chatId: 'dm'
            },
            {
                $setOnInsert: {
                    userId,
                    chatId: 'dm',
                    type: 'dm',
                    status: true
                }
            },
            {
                upsert: true,
                new: true
            }
        );

        return true;

    } catch (e) {
        console.error(
            'initializeAntiDeleteSettings error:',
            e
        );

        return false;
    }
};


// =====================================================
// SET ANTI-DELETE
// =====================================================

const setAnti = async (
    userId,
    chatId,
    status = true
) => {
    try {
        if (!userId || !chatId) {
            return false;
        }

        /*
         * Anti-delete is intended to stay ON.
         *
         * Even if an old command tries to save false,
         * we keep the database state enabled.
         */
        status = true;

        const key = makeKey(
            userId,
            chatId
        );

        memoryCache.set(
            key,
            true
        );

        if (!isMongoReady()) {
            console.log(
                'Mongo not ready, Anti-Delete saved to memory only'
            );

            return true;
        }

        await AntiDelDB.findOneAndUpdate(
            {
                userId,
                chatId
            },
            {
                $set: {
                    userId,
                    chatId,
                    status: true,
                    type:
                        chatId === 'gc' ||
                        chatId === 'dm'
                            ? chatId
                            : 'chat'
                }
            },
            {
                upsert: true,
                new: true
            }
        );

        return true;

    } catch (e) {
        console.error(
            'setAnti error:',
            e
        );

        return false;
    }
};


// =====================================================
// GET ANTI-DELETE
// ALWAYS RETURNS TRUE FOR VALID SETTINGS
// =====================================================

const getAnti = async (
    userId,
    chatId
) => {
    try {
        if (!userId || !chatId) {
            return true;
        }

        const key = makeKey(
            userId,
            chatId
        );

        if (isMongoReady()) {

            const doc =
                await AntiDelDB.findOne({
                    userId,
                    chatId
                });

            /*
             * If the setting doesn't exist,
             * automatically create it as ON.
             */
            if (!doc) {

                memoryCache.set(
                    key,
                    true
                );

                await AntiDelDB.findOneAndUpdate(
                    {
                        userId,
                        chatId
                    },
                    {
                        $set: {
                            userId,
                            chatId,
                            status: true,
                            type:
                                chatId === 'gc' ||
                                chatId === 'dm'
                                    ? chatId
                                    : 'chat'
                        }
                    },
                    {
                        upsert: true,
                        new: true
                    }
                );

                return true;
            }

            /*
             * Existing old records may contain false.
             * Anti-delete is now permanently enabled,
             * so normalize them back to true.
             */
            if (doc.status !== true) {

                doc.status = true;

                await doc.save();
            }

            memoryCache.set(
                key,
                true
            );

            return true;
        }

        /*
         * Mongo unavailable.
         * If nothing is cached, default to ON.
         */
        if (!memoryCache.has(key)) {
            memoryCache.set(
                key,
                true
            );
        }

        return true;

    } catch (e) {

        console.error(
            'getAnti error:',
            e
        );

        /*
         * Always-on fallback.
         */
        memoryCache.set(
            makeKey(userId, chatId),
            true
        );

        return true;
    }
};


// =====================================================
// GET ALL ANTI-DELETE SETTINGS
// =====================================================

const getAllAntiDeleteSettings = async (
    userId
) => {
    try {

        if (!userId) {
            return [];
        }

        if (isMongoReady()) {

            let settings =
                await AntiDelDB.find({
                    userId
                });

            /*
             * Make sure the two global settings exist.
             */
            const existing = new Set(
                settings.map(
                    item => item.chatId
                )
            );

            if (!existing.has('gc')) {

                await AntiDelDB.findOneAndUpdate(
                    {
                        userId,
                        chatId: 'gc'
                    },
                    {
                        $set: {
                            userId,
                            chatId: 'gc',
                            type: 'gc',
                            status: true
                        }
                    },
                    {
                        upsert: true,
                        new: true
                    }
                );
            }

            if (!existing.has('dm')) {

                await AntiDelDB.findOneAndUpdate(
                    {
                        userId,
                        chatId: 'dm'
                    },
                    {
                        $set: {
                            userId,
                            chatId: 'dm',
                            type: 'dm',
                            status: true
                        }
                    },
                    {
                        upsert: true,
                        new: true
                    }
                );
            }

            /*
             * Reload after ensuring defaults.
             */
            settings =
                await AntiDelDB.find({
                    userId
                });

            /*
             * Normalize all settings to ON.
             */
            for (const setting of settings) {

                if (setting.status !== true) {

                    setting.status = true;

                    await setting.save();
                }

                memoryCache.set(
                    makeKey(
                        userId,
                        setting.chatId
                    ),
                    true
                );
            }

            return settings;
        }

        /*
         * Mongo unavailable.
         */
        const results = [];

        for (
            const [key] of memoryCache.entries()
        ) {

            if (
                key.startsWith(
                    userId + ':'
                )
            ) {

                const chatId =
                    key.substring(
                        userId.length + 1
                    );

                results.push({
                    userId,
                    chatId,
                    type:
                        chatId === 'gc' ||
                        chatId === 'dm'
                            ? chatId
                            : 'chat',
                    status: true
                });
            }
        }

        /*
         * Always make sure gc and dm exist.
         */
        if (
            !results.some(
                x => x.chatId === 'gc'
            )
        ) {

            memoryCache.set(
                makeKey(userId, 'gc'),
                true
            );

            results.push({
                userId,
                chatId: 'gc',
                type: 'gc',
                status: true
            });
        }

        if (
            !results.some(
                x => x.chatId === 'dm'
            )
        ) {

            memoryCache.set(
                makeKey(userId, 'dm'),
                true
            );

            results.push({
                userId,
                chatId: 'dm',
                type: 'dm',
                status: true
            });
        }

        return results;

    } catch (e) {

        console.error(
            'getAllAntiDeleteSettings error:',
            e
        );

        return [];
    }
};


// =====================================================
// EXPORTS
// =====================================================

module.exports = {
    AntiDelDB,
    initializeAntiDeleteSettings,
    setAnti,
    getAnti,
    getAllAntiDeleteSettings
};
