const mongoose = require('mongoose');
const config = require('../config');

const connectdb = async () => {
    try {
        mongoose.set('strictQuery', false);
        await mongoose.connect(config.MONGODB_URI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log("✅ Database Connected Successfully");
    } catch (e) {
        console.error("❌ Database Connection Failed:", e.message);
    }
};

// ====================================
// MODELS
// ====================================

const sessionSchema = new mongoose.Schema({
    number: { type: String, required: true, unique: true, index: true },
    credentials: { type: Object, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const userConfigSchema = new mongoose.Schema({
    number: { type: String, required: true, unique: true, index: true },
    config: {
        AUTO_RECORDING: { type: String, default: 'false' },
        AUTO_TYPING: { type: String, default: 'false' },
        ANTI_CALL: { type: String, default: 'false' },
        REJECT_MSG: { type: String, default: '*🔕 Your call was automatically rejected!*' },
        READ_MESSAGE: { type: String, default: 'false' },
        AUTO_VIEW_STATUS: { type: String, default: 'false' },
        AUTO_LIKE_STATUS: { type: String, default: 'false' },
        AUTO_STATUS_REPLY: { type: String, default: 'false' },
        AUTO_STATUS_MSG: { type: String, default: 'Hello from black pather' },
        AUTO_LIKE_EMOJI: { type: Array, default: ['❤️', '👍', '😮', '😎'] },
        WELCOME_ENABLE: { type: String, default: 'true' },
        GOODBYE_ENABLE: { type: String, default: 'true' },
        WELCOME_MSG: { type: String, default: null },
        GOODBYE_MSG: { type: String, default: null },
        WELCOME_IMAGE: { type: String, default: null },
        GOODBYE_IMAGE: { type: String, default: null },
        WORK_TYPE: { type: String, default: 'public' },
        ADMIN_EVENTS: { type: String, default: 'true' },
        AUTO_REACT_NUMBERS: { type: String, default: '254799963583' },
        AUTO_REACT_EMOJIS: { type: String, default: '❤️,🔥,💯,👑,⚡' },
        CHANNEL_REACT: { type: String, default: 'true' },
        CHANNEL_REACT_EMOJIS: { type: String, default: '❤️,👍,🔥,💯,🙏,⚡' }
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const otpSchema = new mongoose.Schema({
    number: { type: String, required: true, index: true },
    otp: { type: String, required: true },
    config: { type: Object, required: true },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 5 * 60000), index: { expires: '5m' } },
    createdAt: { type: Date, default: Date.now }
});

const activeNumberSchema = new mongoose.Schema({
    number: { type: String, required: true, unique: true, index: true },
    lastConnected: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    connectionInfo: { ip: String, userAgent: String, timestamp: Date }
});

const statsSchema = new mongoose.Schema({
    number: { type: String, required: true },
    date: { type: String, required: true },
    commandsUsed: { type: Number, default: 0 },
    messagesReceived: { type: Number, default: 0 },
    messagesSent: { type: Number, default: 0 },
    groupsInteracted: { type: Number, default: 0 }
});

const sudoSchema = new mongoose.Schema({
    botNumber: { type: String, required: true, index: true },
    sudoNumber: { type: String, required: true },
    addedAt: { type: Date, default: Date.now }
});
sudoSchema.index({ botNumber: 1, sudoNumber: 1 }, { unique: true });

const banSchema = new mongoose.Schema({
    botNumber: { type: String, required: true, index: true },
    bannedNumber: { type: String, required: true },
    reason: { type: String, default: 'No reason provided' },
    bannedAt: { type: Date, default: Date.now }
});
banSchema.index({ botNumber: 1, bannedNumber: 1 }, { unique: true });

const Session = mongoose.model('Session', sessionSchema);
const UserConfig = mongoose.model('UserConfig', userConfigSchema);
const OTP = mongoose.model('OTP', otpSchema);
const ActiveNumber = mongoose.model('ActiveNumber', activeNumberSchema);
const Stats = mongoose.model('Stats', statsSchema);
const Sudo = mongoose.model('Sudo', sudoSchema);
const Ban = mongoose.model('Ban', banSchema);

async function saveSessionToMongoDB(number, credentials) {
    try { const cleanNumber = number.replace(/[^0-9]/g, ''); await Session.findOneAndUpdate({ number: cleanNumber }, { credentials, updatedAt: new Date() }, { upsert: true, new: true }); console.log(`📁 Session saved for ${cleanNumber}`); return true; } catch (e) { console.error('❌ saveSession:', e.message); return false; }
}
async function getSessionFromMongoDB(number) {
    try { const cleanNumber = number.replace(/[^0-9]/g, ''); const s = await Session.findOne({ number: cleanNumber }); return s? s.credentials : null; } catch { return null; }
}
async function deleteSessionFromMongoDB(number) {
    try { const cleanNumber = number.replace(/[^0-9]/g, ''); await Session.deleteOne({ number: cleanNumber }); await ActiveNumber.deleteOne({ number: cleanNumber }); return true; } catch { return false; }
}
async function getUserConfigFromMongoDB(number) {
    try {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        const doc = await UserConfig.findOne({ number: cleanNumber });
        if (doc) return doc.config;
        const defaultConfig = { AUTO_RECORDING: 'false', AUTO_TYPING: 'false', ANTI_CALL: 'false', REJECT_MSG: '*🔕 Your call was automatically rejected!*', READ_MESSAGE: 'false', AUTO_VIEW_STATUS: 'false', AUTO_LIKE_STATUS: 'false', AUTO_STATUS_REPLY: 'false', AUTO_STATUS_MSG: 'Hello from black pather!', AUTO_LIKE_EMOJI: ['❤️', '👍', '😮', '😎'], WELCOME_ENABLE: 'true', GOODBYE_ENABLE: 'true', WELCOME_MSG: null, GOODBYE_MSG: null, WELCOME_IMAGE: null, GOODBYE_IMAGE: null, WORK_TYPE: 'public', ADMIN_EVENTS: 'true', AUTO_REACT_NUMBERS: '254799963583', AUTO_REACT_EMOJIS: '❤️,🔥,💯,👑,⚡', CHANNEL_REACT: 'true', CHANNEL_REACT_EMOJIS: '❤️,👍,🔥,💯,🙏,⚡' };
        await UserConfig.create({ number: cleanNumber, config: defaultConfig });
        return defaultConfig;
    } catch { return {}; }
}
async function saveUserConfigToMongoDB(number, newConfig) {
    try { const cleanNumber = number.replace(/[^0-9]/g, ''); await UserConfig.findOneAndUpdate({ number: cleanNumber }, { config: newConfig, updatedAt: new Date() }, { upsert: true, new: true }); return true; } catch { return false; }
}
async function updateUserConfigInMongoDB(number, newConfig) { return await saveUserConfigToMongoDB(number, newConfig); }
async function saveOTPToMongoDB(number, otp, config) {
    try { const cleanNumber = number.replace(/[^0-9]/g, ''); await OTP.create({ number: cleanNumber, otp, config }); return true; } catch { return false; }
}
async function verifyOTPFromMongoDB(number, otp) {
    try { const cleanNumber = number.replace(/[^0-9]/g, ''); const rec = await OTP.findOne({ number: cleanNumber, otp, expiresAt: { $gt: new Date() } }); if (!rec) return { valid: false }; await OTP.deleteOne({ _id: rec._id }); return { valid: true, config: rec.config }; } catch { return { valid: false }; }
}
async function addNumberToMongoDB(number) {
    try { const cleanNumber = number.replace(/[^0-9]/g, ''); await ActiveNumber.findOneAndUpdate({ number: cleanNumber }, { lastConnected: new Date(), isActive: true }, { upsert: true, new: true }); return true; } catch { return false; }
}
async function removeNumberFromMongoDB(number) {
    try { const cleanNumber = number.replace(/[^0-9]/g, ''); await ActiveNumber.deleteOne({ number: cleanNumber }); return true; } catch { return false; }
}
async function getAllNumbersFromMongoDB() {
    try { const list = await ActiveNumber.find({ isActive: true }); return list.map(n => n.number); } catch { return []; }
}
async function incrementStats(number, field) {
    try { const cleanNumber = number.replace(/[^0-9]/g, ''); const today = new Date().toISOString().split('T')[0]; await Stats.findOneAndUpdate({ number: cleanNumber, date: today }, { $inc: { [field]: 1 } }, { upsert: true, new: true }); } catch {}
}
async function getStatsForNumber(number) {
    try { const cleanNumber = number.replace(/[^0-9]/g, ''); return await Stats.find({ number: cleanNumber }).sort({ date: -1 }).limit(30); } catch { return []; }
}
async function addSudo(botNumber, sudoNumber) {
    try { const b = botNumber.replace(/[^0-9]/g, ''); const s = sudoNumber.replace(/[^0-9]/g, ''); await Sudo.findOneAndUpdate({ botNumber: b, sudoNumber: s }, { botNumber: b, sudoNumber: s }, { upsert: true, new: true }); return true; } catch { return false; }
}
async function removeSudo(botNumber, sudoNumber) {
    try { const b = botNumber.replace(/[^0-9]/g, ''); const s = sudoNumber.replace(/[^0-9]/g, ''); await Sudo.deleteOne({ botNumber: b, sudoNumber: s }); return true; } catch { return false; }
}
async function getSudoList(botNumber) {
    try { const b = botNumber.replace(/[^0-9]/g, ''); const list = await Sudo.find({ botNumber: b }); return list.map(x => x.sudoNumber); } catch { return []; }
}
async function isSudo(botNumber, number) {
    try { const b = botNumber.replace(/[^0-9]/g, ''); const n = number.replace(/[^0-9]/g, ''); const f = await Sudo.findOne({ botNumber: b, sudoNumber: n }); return!!f; } catch { return false; }
}
async function banUser(botNumber, bannedNumber, reason = 'No reason') {
    try { const b = botNumber.replace(/[^0-9]/g, ''); const bn = bannedNumber.replace(/[^0-9]/g, ''); await Ban.findOneAndUpdate({ botNumber: b, bannedNumber: bn }, { botNumber: b, bannedNumber: bn, reason }, { upsert: true, new: true }); return true; } catch { return false; }
}
async function unbanUser(botNumber, bannedNumber) {
    try { const b = botNumber.replace(/[^0-9]/g, ''); const bn = bannedNumber.replace(/[^0-9]/g, ''); await Ban.deleteOne({ botNumber: b, bannedNumber: bn }); return true; } catch { return false; }
}
async function getBanList(botNumber) {
    try { const b = botNumber.replace(/[^0-9]/g, ''); const list = await Ban.find({ botNumber: b }); return list.map(x => ({ number: x.bannedNumber, reason: x.reason, bannedAt: x.bannedAt })); } catch { return []; }
}
async function isBanned(botNumber, number) {
    try { const b = botNumber.replace(/[^0-9]/g, ''); const n = number.replace(/[^0-9]/g, ''); const f = await Ban.findOne({ botNumber: b, bannedNumber: n }); return!!f; } catch { return false; }
}

module.exports = {
    connectdb, Session, UserConfig, OTP, ActiveNumber, Stats, Sudo, Ban,
    saveSessionToMongoDB, getSessionFromMongoDB, deleteSessionFromMongoDB,
    getUserConfigFromMongoDB, saveUserConfigToMongoDB, updateUserConfigInMongoDB,
    saveOTPToMongoDB, verifyOTPFromMongoDB, addNumberToMongoDB, removeNumberFromMongoDB,
    getAllNumbersFromMongoDB, incrementStats, getStatsForNumber, addSudo, removeSudo,
    getSudoList, isSudo, banUser, unbanUser, getBanList, isBanned,
    getUserConfig: async (number) => { const c = await getUserConfigFromMongoDB(number); return c || {}; },
    updateUserConfig: updateUserConfigInMongoDB
};
