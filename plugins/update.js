// plugins/update.js
const { cmd } = require("../inconnuboy");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ===== SAFETY LOCKS =====
let isUpdating = false;
const activeUpdates = new Map();

cmd({
  pattern: "update",
  alias: ["updatenow", "sync"],
  desc: "Update bot to latest version (owner only)",
  category: "owner",
  react: "🆕",
  filename: __filename
},
async (conn, mek, m, { from, reply, isOwner }) => {

  const jid = mek.key.participant || mek.key.remoteJid;

  const cleanup = () => {
    isUpdating = false;
    activeUpdates.delete(jid);
  };

  try {
    if (!isOwner) return reply("❌ Owner Only Command!");

    if (isUpdating) return reply("⚠️ Update already running...");
    if (activeUpdates.has(jid)) return reply("⚠️ You already started an update.");

    isUpdating = true;
    activeUpdates.set(jid, true);

    const repoOwner = "Teddytech3";
    const repoName = "teddyxmdmini";
    const branch = "main";

    const apiCommitUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/commits/${branch}`;
    const zipUrl = `https://github.com/${repoOwner}/${repoName}/archive/${branch}.zip`;

    await conn.sendMessage(from, { text: "🔍 Checking for updates..." }, { quoted: mek });

    const { data: commitData } = await axios.get(apiCommitUrl, {
      headers: { "User-Agent": "node.js" }
    });

    const latestCommit = commitData.sha;

    const commitFile = path.join(
      process.cwd(),
      `.last_update_commit_${repoOwner}_${repoName}`
    );

    const getCommit = () => {
      try {
        if (fs.existsSync(commitFile)) {
          return fs.readFileSync(commitFile, "utf8").trim();
        }
      } catch {}
      return null;
    };

    const setCommit = (hash) => {
      try {
        fs.writeFileSync(commitFile, hash);
      } catch {}
    };

    const currentCommit = getCommit();

    if (currentCommit === latestCommit) {
      cleanup();
      return conn.sendMessage(from, {
        text: "✅ Already up to date!"
      }, { quoted: mek });
    }

    await conn.sendMessage(from, {
      text: "🧨 Updating bot..."
    }, { quoted: mek });

    const zipPath = path.join(__dirname, "..", `${repoName}.zip`);
    const extractPath = path.join(__dirname, "..", "tmp_update");

    // download zip
    const zipRes = await axios.get(zipUrl, {
      responseType: "arraybuffer",
      headers: { "User-Agent": "node.js" }
    });

    fs.writeFileSync(zipPath, zipRes.data);

    // clean old temp
    if (fs.existsSync(extractPath)) {
      fs.rmSync(extractPath, { recursive: true, force: true });
    }

    fs.mkdirSync(extractPath, { recursive: true });

    // ===== NO ADM-ZIP: USE SYSTEM UNZIP =====
    try {
      execSync(`unzip -o ${zipPath} -d ${extractPath}`);
    } catch (err) {
      cleanup();
      return reply("❌ Unzip failed. Make sure 'unzip' is installed on server.");
    }

    const sourcePath = path.join(extractPath, `${repoName}-${branch}`);

    const skip = [
      "config.js",
      "app.json",
      ".env",
      "session.data.json",
      "session.json",
      "session",
      "storage.json",
      "node_modules"
    ];

    copyFolderSync(sourcePath, process.cwd(), skip);

    setCommit(latestCommit);

    try { fs.unlinkSync(zipPath); } catch {}
    try { fs.rmSync(extractPath, { recursive: true, force: true }); } catch {}

    cleanup();

    await conn.sendMessage(from, {
      text: "✅ Update complete! Restarting..."
    }, { quoted: mek });

    setTimeout(() => process.exit(0), 1500);

  } catch (err) {
    console.error("Update error:", err);
    cleanup();

    return reply("❌ Update failed: " + (err?.message || err));
  }
});

// ===== COPY HELPER =====
function copyFolderSync(source, target, skipList = []) {
  if (!fs.existsSync(source)) return;
  if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });

  for (const item of fs.readdirSync(source)) {
    if (skipList.includes(item)) continue;

    const src = path.join(source, item);
    const dest = path.join(target, item);

    const stat = fs.lstatSync(src);

    if (stat.isDirectory()) {
      copyFolderSync(src, dest, skipList);
    } else {
      const dir = path.dirname(dest);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.copyFileSync(src, dest);
    }
  }
}
