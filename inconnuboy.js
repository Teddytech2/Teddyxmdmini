// ==========================================================
// 🧸 TEDDY-XMD - INCONNUUBOY COMMAND HANDLER
// ==========================================================
// Global command registry
// Keeps commands available across module reloads
// ==========================================================

if (!global.commands) {
    global.commands = [];
}

/**
 * Register a WhatsApp bot command
 *
 * @param {Object} info - Command configuration
 * @param {Function} func - Command function
 * @returns {Object} Registered command
 */
function cmd(info = {}, func) {

    // Make sure info is always an object
    if (typeof info !== "object" || info === null) {
        throw new TypeError(
            "TEDDY-XMD: Command info must be an object."
        );
    }

    if (typeof func !== "function") {
        throw new TypeError(
            "TEDDY-XMD: Command function is required."
        );
    }

    const data = {
        ...info
    };

    // ======================================================
    // 📝 COMMAND PATTERN
    // ======================================================

    if (!data.pattern && data.cmdname) {
        data.pattern = data.cmdname;
    }

    // Normalize pattern
    if (typeof data.pattern === "string") {
        data.pattern =
            data.pattern
                .trim()
                .toLowerCase();
    }

    // ======================================================
    // 🔗 ALIASES
    // ======================================================

    if (!Array.isArray(data.alias)) {
        data.alias = data.alias
            ? [data.alias]
            : [];
    }

    data.alias = data.alias
        .filter(Boolean)
        .map(alias =>
            String(alias)
                .trim()
                .toLowerCase()
        );

    // ======================================================
    // ⚙️ DEFAULT SETTINGS
    // ======================================================

    if (typeof data.dontAddCommandList !== "boolean") {
        data.dontAddCommandList = false;
    }

    if (!data.desc) {
        data.desc = "";
    }

    if (typeof data.fromMe !== "boolean") {
        data.fromMe = false;
    }

    if (!data.category) {
        data.category = "misc";
    }

    // ======================================================
    // ❤️ REACTION
    // ======================================================

    if (!data.react) {
        data.react = "";
    }

    // ======================================================
    // 📁 FILENAME
    // ======================================================

    if (!data.filename) {
        data.filename = "";
    }

    // ======================================================
    // 🧠 STORE COMMAND FUNCTION
    // ======================================================

    data.function = func;

    // ======================================================
    // 🛡️ PREVENT EXACT DUPLICATES
    // ======================================================
    // This prevents the same plugin from registering the
    // exact same pattern repeatedly during reloads.

    const existingIndex =
        global.commands.findIndex(command => {

            if (!command || !data.pattern) {
                return false;
            }

            return (
                command.pattern === data.pattern &&
                command.filename === data.filename
            );
        });

    if (existingIndex !== -1) {

        global.commands[existingIndex] = data;

        return data;
    }

    // ======================================================
    // 📦 ADD COMMAND
    // ======================================================

    global.commands.push(data);

    return data;
}

// ==========================================================
// 🔄 ADD COMMAND ALIAS
// ==========================================================

function AddCommand(info, func) {
    return cmd(info, func);
}

// ==========================================================
// 🔄 FUNCTION ALIAS
// ==========================================================

function Function(info, func) {
    return cmd(info, func);
}

// ==========================================================
// 📋 GET COMMANDS
// ==========================================================

function getCommands() {
    return global.commands;
}

// ==========================================================
// 🔍 FIND COMMAND
// ==========================================================

function findCommand(name) {

    if (!name) {
        return null;
    }

    const search =
        String(name)
            .trim()
            .toLowerCase();

    return global.commands.find(command => {

        if (!command) {
            return false;
        }

        if (
            command.pattern &&
            String(command.pattern).toLowerCase() === search
        ) {
            return true;
        }

        if (
            Array.isArray(command.alias) &&
            command.alias.some(
                alias =>
                    String(alias).toLowerCase() === search
            )
        ) {
            return true;
        }

        return false;
    }) || null;
}

// ==========================================================
// 📤 EXPORTS
// ==========================================================

module.exports = {

    // Main command registration
    cmd,

    // Compatibility aliases
    AddCommand,
    Function,

    // Command access
    get commands() {
        return global.commands;
    },

    getCommands,

    findCommand
};
