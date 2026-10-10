const { proto, getContentType, jidNormalizedUser } = require('xzcbailz');

const smsg = async (conn, m) => {
    if (!m) return m;
    let M = proto.WebMessageInfo;

    if (m.key) {
        m.id = m.key.id;
        m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16;
        m.chat = m.key.remoteJid;
        m.fromMe = m.key.fromMe;
        m.isGroup = m.chat.endsWith('@g.us');
        m.sender = jidNormalizedUser(m.fromMe? conn.user.id : (m.participant || m.key.participant || m.chat));
        m.botNumber = conn.user.id.split(':')[0].replace(/[^0-9]/g, '');
    }

    if (m.message) {
        m.mtype = getContentType(m.message);

        if (m.mtype === 'viewOnceMessageV2' || m.mtype === 'viewOnceMessage') {
             m.message = m.message[m.mtype].message;
             m.mtype = getContentType(m.message);
        }

        m.msg = m.message[m.mtype];

        m.body = (m.mtype === 'conversation')? m.message.conversation :
                 (m.mtype == 'imageMessage')? m.message.imageMessage.caption :
                 (m.mtype == 'videoMessage')? m.message.videoMessage.caption :
                 (m.mtype == 'extendedTextMessage')? m.message.extendedTextMessage.text :
                 (m.mtype == 'buttonsResponseMessage')? m.message.buttonsResponseMessage.selectedButtonId :
                 (m.mtype == 'listResponseMessage')? m.message.listResponseMessage.singleSelectReply.selectedRowId :
                 (m.mtype == 'templateButtonReplyMessage')? m.message.templateButtonReplyMessage.selectedId : '';

        if (m.isGroup) {
            try {
                const groupMetadata = await conn.groupMetadata(m.chat);
                const groupAdmins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);
                m.isAdmin = groupAdmins.includes(m.sender);
                m.isBotAdmin = groupAdmins.includes(jidNormalizedUser(conn.user.id));
                m.groupName = groupMetadata.subject;
                m.groupMembers = groupMetadata.participants.length;
            } catch (e) {
                m.isAdmin = false;
                m.isBotAdmin = false;
            }
        } else {
            m.isAdmin = false;
            m.isBotAdmin = false;
        }

        m.reply = (text, chatId = m.chat, options = {}) => {
            return conn.sendMessage(chatId, { text: text }, { quoted: m,...options });
        };
    }
    return m;
};

module.exports = { smsg };
