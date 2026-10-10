const mongoose = require('mongoose');
const config = require('../config');

/* =========================================================
   MONGODB CONNECTION
   ========================================================= */

let mongoConnectionPromise = null;
let mongoReady = false;

const connectdb = async () => {
    if (mongoReady && mongoose.connection.readyState === 1) {
        return true;
    }

    if (mongoConnectionPromise) {
        return mongoConnectionPromise;
    }

    mongoConnectionPromise = (async () => {
        try {
            if (!config.MONGODB_URI) {
                console.error('❌ MONGODB_URI is missing');
                return false;
            }

            mongoose.set('strictQuery', false);

            mongoose.connection.on('connected', () => {
                mongoReady = true;
                console.log('✅ Database Connected Successfully');
            });

            mongoose.connection.on('disconnected', () => {
                mongoReady = false;
                console.log('⚠️ MongoDB disconnected');
            });

            mongoose.connection.on('error', err => {
                mongoReady = false;
                console.error('❌ MongoDB error:', err.message);
            });

            await mongoose.connect(config.MONGODB_URI, {
                maxPoolSize: 10,
                minPoolSize: 1,

                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,

                connectTimeoutMS: 10000,

                heartbeatFrequencyMS: 10000,

                retryWrites: true,

                family: 4
            });

            mongoReady = true;

            return true;

        } catch (e) {
            mongoReady = false;

            console.error(
                '❌ Database Connection Failed:',
                e.message
            );

            return false;

        } finally {
            mongoConnectionPromise = null;
        }
    })();

    return mongoConnectionPromise;
};


/* =========================================================
   DATABASE READY CHECK
   ========================================================= */

function isMongoReady() {
    return (
        mongoReady &&
        mongoose.connection.readyState === 1
    );
}


/* =========================================================
   NORMALIZE NUMBER
   ========================================================= */

function cleanNumber(number) {
    return String(number || '')
        .replace(/[^0-9]/g, '');
}


/* =========================================================
   MODELS
   ========================================================= */

const sessionSchema = new mongoose.Schema({
    number: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    credentials: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },

    createdAt: {
        type: Date,
        default: Date.now
    },

    updatedAt: {
        type: Date,
        default: Date.now
    }

}, {
    minimize: false
});


const userConfigSchema = new mongoose.Schema({
    number: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    config: {
        PREFIX: {
            type: String,
            default: '.'
        },

        NULL_PREFIX: {
            type: String,
            default: 'false'
        },

        AUTO_RECORDING: {
            type: String,
            default: 'false'
        },

        AUTO_TYPING: {
            type: String,
            default: 'false'
        },

        ANTI_CALL: {
            type: String,
            default: 'false'
        },

        REJECT_MSG: {
            type: String,
            default: '*🔕 Your call was automatically rejected!*'
        },

        READ_MESSAGE: {
            type: String,
            default: 'false'
        },

        AUTO_VIEW_STATUS: {
            type: String,
            default: 'false'
        },

        AUTO_LIKE_STATUS: {
            type: String,
            default: 'false'
        },

        AUTO_STATUS_REPLY: {
            type: String,
            default: 'false'
        },

        AUTO_STATUS_MSG: {
            type: String,
            default: 'Hello from black pather'
        },

        AUTO_LIKE_EMOJI: {
            type: [String],
            default: [
                '❤️',
                '👍',
                '😮',
                '😎'
            ]
        },

        WELCOME_ENABLE: {
            type: String,
            default: 'true'
        },

        GOODBYE_ENABLE: {
            type: String,
            default: 'true'
        },

        WELCOME_MSG: {
            type: String,
            default: null
        },

        GOODBYE_MSG: {
            type: String,
            default: null
        },

        WELCOME_IMAGE: {
            type: String,
            default: null
        },

        GOODBYE_IMAGE: {
            type: String,
            default: null
        },

        WORK_TYPE: {
            type: String,
            default: 'public'
        },

        ADMIN_EVENTS: {
            type: String,
            default: 'true'
        },

        AUTO_REACT_NUMBERS: {
            type: String,
            default: '254799963583'
        },

        AUTO_REACT_EMOJIS: {
            type: String,
            default: '❤️,🔥,💯,👑,⚡'
        },

        CHANNEL_REACT: {
            type: String,
            default: 'true'
        },

        CHANNEL_REACT_EMOJIS: {
            type: String,
            default: '❤️,👍,🔥,💯,🙏,⚡'
        },

        AUTO_AI: {
            type: String,
            default: 'false'
        }
    },

    createdAt: {
        type: Date,
        default: Date.now
    },

    updatedAt: {
        type: Date,
        default: Date.now
    }

}, {
    minimize: false
});


/* =========================================================
   GROUP CONFIG
   ========================================================= */

const groupConfigSchema = new mongoose.Schema({
    botNumber: {
        type: String,
        required: true,
        index: true
    },

    groupId: {
        type: String,
        required: true,
        index: true
    },

    WELCOME_ENABLE: {
        type: String,
        default: null
    },

    GOODBYE_ENABLE: {
        type: String,
        default: null
    },

    updatedAt: {
        type: Date,
        default: Date.now
    }

});

groupConfigSchema.index(
    {
        botNumber: 1,
        groupId: 1
    },
    {
        unique: true
    }
);


/* =========================================================
   OTP
   ========================================================= */

const otpSchema = new mongoose.Schema({
    number: {
        type: String,
        required: true,
        index: true
    },

    otp: {
        type: String,
        required: true
    },

    config: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },

    expiresAt: {
        type: Date,
        default: () =>
            new Date(
                Date.now() +
                5 * 60 * 1000
            ),
        index: {
            expires: '0s'
        }
    },

    createdAt: {
        type: Date,
        default: Date.now
    }

});


/* =========================================================
   ACTIVE NUMBERS
   ========================================================= */

const activeNumberSchema = new mongoose.Schema({
    number: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    lastConnected: {
        type: Date,
        default: Date.now
    },

    isActive: {
        type: Boolean,
        default: true,
        index: true
    },

    connectionInfo: {
        ip: String,
        userAgent: String,
        timestamp: Date
    }

});


/* =========================================================
   STATS
   ========================================================= */

const statsSchema = new mongoose.Schema({
    number: {
        type: String,
        required: true,
        index: true
    },

    date: {
        type: String,
        required: true,
        index: true
    },

    commandsUsed: {
        type: Number,
        default: 0
    },

    messagesReceived: {
        type: Number,
        default: 0
    },

    messagesSent: {
        type: Number,
        default: 0
    },

    groupsInteracted: {
        type: Number,
        default: 0
    }

});

statsSchema.index({
    number: 1,
    date: 1
}, {
    unique: true
});


/* =========================================================
   SUDO
   ========================================================= */

const sudoSchema = new mongoose.Schema({
    botNumber: {
        type: String,
        required: true,
        index: true
    },

    sudoNumber: {
        type: String,
        required: true
    },

    addedAt: {
        type: Date,
        default: Date.now
    }

});

sudoSchema.index(
    {
        botNumber: 1,
        sudoNumber: 1
    },
    {
        unique: true
    }
);


/* =========================================================
   BAN
   ========================================================= */

const banSchema = new mongoose.Schema({
    botNumber: {
        type: String,
        required: true,
        index: true
    },

    bannedNumber: {
        type: String,
        required: true
    },

    reason: {
        type: String,
        default: 'No reason provided'
    },

    bannedAt: {
        type: Date,
        default: Date.now
    }

});

banSchema.index(
    {
        botNumber: 1,
        bannedNumber: 1
    },
    {
        unique: true
    }
);


/* =========================================================
   MODELS
   ========================================================= */

const Session =
    mongoose.models.Session ||
    mongoose.model(
        'Session',
        sessionSchema
    );

const UserConfig =
    mongoose.models.UserConfig ||
    mongoose.model(
        'UserConfig',
        userConfigSchema
    );

const OTP =
    mongoose.models.OTP ||
    mongoose.model(
        'OTP',
        otpSchema
    );

const ActiveNumber =
    mongoose.models.ActiveNumber ||
    mongoose.model(
        'ActiveNumber',
        activeNumberSchema
    );

const Stats =
    mongoose.models.Stats ||
    mongoose.model(
        'Stats',
        statsSchema
    );

const Sudo =
    mongoose.models.Sudo ||
    mongoose.model(
        'Sudo',
        sudoSchema
    );

const Ban =
    mongoose.models.Ban ||
    mongoose.model(
        'Ban',
        banSchema
    );

const GroupConfig =
    mongoose.models.GroupConfig ||
    mongoose.model(
        'GroupConfig',
        groupConfigSchema
    );


/* =========================================================
   SESSION FUNCTIONS
   ========================================================= */

async function saveSessionToMongoDB(
    number,
    credentials
) {

    try {

        if (!isMongoReady()) {
            return false;
        }

        const clean = cleanNumber(number);

        if (!clean || !credentials) {
            return false;
        }

        await Session.updateOne(
            {
                number: clean
            },
            {
                $set: {
                    credentials,
                    updatedAt: new Date()
                },

                $setOnInsert: {
                    number: clean,
                    createdAt: new Date()
                }
            },
            {
                upsert: true
            }
        );

        return true;

    } catch (error) {

        console.error(
            '❌ Error saving session:',
            error.message
        );

        return false;
    }
}


async function getSessionFromMongoDB(
    number
) {

    try {

        if (!isMongoReady()) {
            return null;
        }

        const clean = cleanNumber(number);

        if (!clean) {
            return null;
        }

        const session =
            await Session
                .findOne({
                    number: clean
                })
                .lean();

        return session?.credentials || null;

    } catch (error) {

        console.error(
            '❌ Error getting session:',
            error.message
        );

        return null;
    }
}


async function deleteSessionFromMongoDB(
    number
) {

    try {

        if (!isMongoReady()) {
            return false;
        }

        const clean = cleanNumber(number);

        await Session.deleteOne({
            number: clean
        });

        await ActiveNumber.deleteOne({
            number: clean
        });

        return true;

    } catch (error) {

        console.error(
            '❌ Error deleting session:',
            error.message
        );

        return false;
    }
}


/* =========================================================
   DEFAULT USER CONFIG
   ========================================================= */

function getDefaultUserConfig() {

    return {
        PREFIX: '.',
        NULL_PREFIX: 'false',
        AUTO_RECORDING: 'false',
        AUTO_TYPING: 'false',
        ANTI_CALL: 'false',
        REJECT_MSG:
            '*🔕 Your call was automatically rejected!*',
        READ_MESSAGE: 'false',
        AUTO_VIEW_STATUS: 'false',
        AUTO_LIKE_STATUS: 'false',
        AUTO_STATUS_REPLY: 'false',
        AUTO_STATUS_MSG:
            'Hello from black pather!',
        AUTO_LIKE_EMOJI: [
            '❤️',
            '👍',
            '😮',
            '😎'
        ],
        WELCOME_ENABLE: 'true',
        GOODBYE_ENABLE: 'true',
        WELCOME_MSG: null,
        GOODBYE_MSG: null,
        WELCOME_IMAGE: null,
        GOODBYE_IMAGE: null,
        WORK_TYPE: 'public',
        ADMIN_EVENTS: 'true',
        AUTO_REACT_NUMBERS:
            '254799963583',
        AUTO_REACT_EMOJIS:
            '❤️,🔥,💯,👑,⚡',
        CHANNEL_REACT: 'true',
        CHANNEL_REACT_EMOJIS:
            '❤️,👍,🔥,💯,🙏,⚡',
        AUTO_AI: 'false'
    };
}


/* =========================================================
   USER CONFIG
   ========================================================= */

async function getUserConfigFromMongoDB(
    number
) {

    const clean = cleanNumber(number);

    if (!clean) {
        return getDefaultUserConfig();
    }

    try {

        if (!isMongoReady()) {
            return getDefaultUserConfig();
        }

        let user =
            await UserConfig
                .findOne({
                    number: clean
                })
                .lean();

        if (user?.config) {
            return {
                ...getDefaultUserConfig(),
                ...user.config
            };
        }

        const defaults =
            getDefaultUserConfig();

        /*
         * Do not make the command wait for this insert.
         */
        UserConfig.updateOne(
            {
                number: clean
            },
            {
                $setOnInsert: {
                    number: clean,
                    config: defaults,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            },
            {
                upsert: true
            }
        ).catch(() => {});

        return defaults;

    } catch (error) {

        console.error(
            '❌ Error getting user config:',
            error.message
        );

        return getDefaultUserConfig();
    }
}


async function saveUserConfigToMongoDB(
    number,
    newConfig
) {

    try {

        if (!isMongoReady()) {
            return false;
        }

        const clean = cleanNumber(number);

        const configData = {
            ...getDefaultUserConfig(),
            ...(newConfig || {})
        };

        await UserConfig.updateOne(
            {
                number: clean
            },
            {
                $set: {
                    config: configData,
                    updatedAt: new Date()
                },

                $setOnInsert: {
                    number: clean,
                    createdAt: new Date()
                }
            },
            {
                upsert: true
            }
        );

        return true;

    } catch (error) {

        console.error(
            '❌ Error saving user config:',
            error.message
        );

        return false;
    }
}


async function updateUserConfigInMongoDB(
    number,
    newConfig
) {
    return saveUserConfigToMongoDB(
        number,
        newConfig
    );
}


/* =========================================================
   GROUP CONFIG
   ========================================================= */

async function getGroupConfig(
    botNumber,
    groupId
) {

    try {

        if (!isMongoReady()) {
            return null;
        }

        const cleanBot =
            cleanNumber(botNumber);

        const cleanGroup =
            String(groupId || '').trim();

        if (!cleanBot || !cleanGroup) {
            return null;
        }

        return await GroupConfig
            .findOne({
                botNumber: cleanBot,
                groupId: cleanGroup
            })
            .lean();

    } catch (error) {

        console.error(
            '❌ Error getting group config:',
            error.message
        );

        return null;
    }
}


async function setGroupConfig(
    botNumber,
    groupId,
    key,
    value
) {

    try {

        if (!isMongoReady()) {
            return false;
        }

        const cleanBot =
            cleanNumber(botNumber);

        const cleanGroup =
            String(groupId || '').trim();

        if (!cleanBot || !cleanGroup) {
            return false;
        }

        if (
            ![
                'WELCOME_ENABLE',
                'GOODBYE_ENABLE'
            ].includes(key)
        ) {
            return false;
        }

        await GroupConfig.updateOne(
            {
                botNumber: cleanBot,
                groupId: cleanGroup
            },
            {
                $set: {
                    botNumber: cleanBot,
                    groupId: cleanGroup,
                    [key]: String(value),
                    updatedAt: new Date()
                }
            },
            {
                upsert: true
            }
        );

        return true;

    } catch (error) {

        console.error(
            '❌ Error saving group config:',
            error.message
        );

        return false;
    }
}


/* =========================================================
   OTP
   ========================================================= */

async function saveOTPToMongoDB(
    number,
    otp,
    configData
) {

    try {

        if (!isMongoReady()) {
            return false;
        }

        const clean = cleanNumber(number);

        await OTP.create({
            number: clean,
            otp,
            config: configData
        });

        return true;

    } catch (error) {

        console.error(
            '❌ Error saving OTP:',
            error.message
        );

        return false;
    }
}


async function verifyOTPFromMongoDB(
    number,
    otp
) {

    try {

        if (!isMongoReady()) {
            return {
                valid: false,
                error: 'Database unavailable'
            };
        }

        const clean = cleanNumber(number);

        const otpRecord =
            await OTP.findOne({
                number: clean,
                otp,
                expiresAt: {
                    $gt: new Date()
                }
            });

        if (!otpRecord) {
            return {
                valid: false,
                error: 'Invalid or expired OTP'
            };
        }

        await OTP.deleteOne({
            _id: otpRecord._id
        });

        return {
            valid: true,
            config: otpRecord.config
        };

    } catch (error) {

        console.error(
            '❌ Error verifying OTP:',
            error.message
        );

        return {
            valid: false,
            error: 'Verification error'
        };
    }
}


/* =========================================================
   ACTIVE NUMBERS
   ========================================================= */

async function addNumberToMongoDB(
    number
) {

    try {

        if (!isMongoReady()) {
            return false;
        }

        const clean =
            cleanNumber(number);

        await ActiveNumber.updateOne(
            {
                number: clean
            },
            {
                $set: {
                    lastConnected: new Date(),
                    isActive: true
                },

                $setOnInsert: {
                    number: clean
                }
            },
            {
                upsert: true
            }
        );

        return true;

    } catch (error) {

        console.error(
            '❌ Error adding number:',
            error.message
        );

        return false;
    }
}


async function removeNumberFromMongoDB(
    number
) {

    try {

        if (!isMongoReady()) {
            return false;
        }

        await ActiveNumber.deleteOne({
            number: cleanNumber(number)
        });

        return true;

    } catch (error) {

        console.error(
            '❌ Error removing number:',
            error.message
        );

        return false;
    }
}


async function getAllNumbersFromMongoDB() {

    try {

        if (!isMongoReady()) {
            return [];
        }

        const activeNumbers =
            await ActiveNumber
                .find({
                    isActive: true
                })
                .select({
                    number: 1,
                    _id: 0
                })
                .lean();

        return activeNumbers.map(
            item => item.number
        );

    } catch (error) {

        console.error(
            '❌ Error getting numbers:',
            error.message
        );

        return [];
    }
}


/* =========================================================
   STATS
   ========================================================= */

async function incrementStats(
    number,
    field
) {

    try {

        if (!isMongoReady()) {
            return;
        }

        const allowedFields = [
            'commandsUsed',
            'messagesReceived',
            'messagesSent',
            'groupsInteracted'
        ];

        if (
            !allowedFields.includes(field)
        ) {
            return;
        }

        const clean =
            cleanNumber(number);

        const today =
            new Date()
                .toISOString()
                .split('T')[0];

        /*
         * Fire-and-forget.
         * Commands don't wait for stats.
         */
        Stats.updateOne(
            {
                number: clean,
                date: today
            },
            {
                $inc: {
                    [field]: 1
                },

                $setOnInsert: {
                    number: clean,
                    date: today
                }
            },
            {
                upsert: true
            }
        ).catch(() => {});

    } catch {}
}


async function getStatsForNumber(
    number
) {

    try {

        if (!isMongoReady()) {
            return [];
        }

        return await Stats
            .find({
                number: cleanNumber(number)
            })
            .sort({
                date: -1
            })
            .limit(30)
            .lean();

    } catch (error) {

        console.error(
            '❌ Error getting stats:',
            error.message
        );

        return [];
    }
}


/* =========================================================
   SUDO
   ========================================================= */

async function addSudo(
    botNumber,
    sudoNumber
) {

    try {

        if (!isMongoReady()) {
            return false;
        }

        const cleanBot =
            cleanNumber(botNumber);

        const cleanSudo =
            cleanNumber(sudoNumber);

        await Sudo.updateOne(
            {
                botNumber: cleanBot,
                sudoNumber: cleanSudo
            },
            {
                $setOnInsert: {
                    botNumber: cleanBot,
                    sudoNumber: cleanSudo
                }
            },
            {
                upsert: true
            }
        );

        return true;

    } catch (e) {

        console.error(
            '❌ addSudo error:',
            e.message
        );

        return false;
    }
}


async function removeSudo(
    botNumber,
    sudoNumber
) {

    try {

        if (!isMongoReady()) {
            return false;
        }

        await Sudo.deleteOne({
            botNumber:
                cleanNumber(botNumber),
            sudoNumber:
                cleanNumber(sudoNumber)
        });

        return true;

    } catch (e) {

        console.error(
            '❌ removeSudo error:',
            e.message
        );

        return false;
    }
}


async function getSudoList(
    botNumber
) {

    try {

        if (!isMongoReady()) {
            return [];
        }

        const list =
            await Sudo
                .find({
                    botNumber:
                        cleanNumber(botNumber)
                })
                .select({
                    sudoNumber: 1,
                    _id: 0
                })
                .lean();

        return list.map(
            item => item.sudoNumber
        );

    } catch (e) {

        console.error(
            '❌ getSudoList error:',
            e.message
        );

        return [];
    }
}


async function isSudo(
    botNumber,
    number
) {

    try {

        if (!isMongoReady()) {
            return false;
        }

        const found =
            await Sudo.exists({
                botNumber:
                    cleanNumber(botNumber),
                sudoNumber:
                    cleanNumber(number)
            });

        return !!found;

    } catch {
        return false;
    }
}


/* =========================================================
   BAN
   ========================================================= */

async function banUser(
    botNumber,
    bannedNumber,
    reason = 'No reason provided'
) {

    try {

        if (!isMongoReady()) {
            return false;
        }

        const cleanBot =
            cleanNumber(botNumber);

        const cleanBanned =
            cleanNumber(bannedNumber);

        await Ban.updateOne(
            {
                botNumber: cleanBot,
                bannedNumber: cleanBanned
            },
            {
                $set: {
                    reason
                },

                $setOnInsert: {
                    botNumber: cleanBot,
                    bannedNumber: cleanBanned
                }
            },
            {
                upsert: true
            }
        );

        return true;

    } catch (e) {

        console.error(
            '❌ banUser error:',
            e.message
        );

        return false;
    }
}


async function unbanUser(
    botNumber,
    bannedNumber
) {

    try {

        if (!isMongoReady()) {
            return false;
        }

        await Ban.deleteOne({
            botNumber:
                cleanNumber(botNumber),
            bannedNumber:
                cleanNumber(bannedNumber)
        });

        return true;

    } catch (e) {

        console.error(
            '❌ unbanUser error:',
            e.message
        );

        return false;
    }
}


async function getBanList(
    botNumber
) {

    try {

        if (!isMongoReady()) {
            return [];
        }

        const list =
            await Ban
                .find({
                    botNumber:
                        cleanNumber(botNumber)
                })
                .lean();

        return list.map(
            b => ({
                number: b.bannedNumber,
                reason: b.reason,
                bannedAt: b.bannedAt
            })
        );

    } catch (e) {

        console.error(
            '❌ getBanList error:',
            e.message
        );

        return [];
    }
}


async function isBanned(
    botNumber,
    number
) {

    try {

        if (!isMongoReady()) {
            return false;
        }

        const found =
            await Ban.exists({
                botNumber:
                    cleanNumber(botNumber),
                bannedNumber:
                    cleanNumber(number)
            });

        return !!found;

    } catch {
        return false;
    }
}


/* =========================================================
   EXPORTS
   ========================================================= */

module.exports = {

    connectdb,
    isMongoReady,

    Session,
    UserConfig,
    OTP,
    ActiveNumber,
    Stats,
    Sudo,
    Ban,
    GroupConfig,

    saveSessionToMongoDB,
    getSessionFromMongoDB,
    deleteSessionFromMongoDB,

    getUserConfigFromMongoDB,
    saveUserConfigToMongoDB,
    updateUserConfigInMongoDB,

    saveOTPToMongoDB,
    verifyOTPFromMongoDB,

    addNumberToMongoDB,
    removeNumberFromMongoDB,
    getAllNumbersFromMongoDB,

    incrementStats,
    getStatsForNumber,

    addSudo,
    removeSudo,
    getSudoList,
    isSudo,

    banUser,
    unbanUser,
    getBanList,
    isBanned,

    getGroupConfig,
    setGroupConfig,

    getUserConfig: async number => {
        return (
            await getUserConfigFromMongoDB(
                number
            )
        ) || {};
    },

    updateUserConfig:
        updateUserConfigInMongoDB
};
