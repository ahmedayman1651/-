
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys")

const PHONE_NUMBER = "201501255187"
const OWNER = "201501255187@s.whatsapp.net"

let groups = {}

const badWords = ["كلب","حمار","غبي","fuck","shit"]

function addWarn(g, user){
  if(!g.warnings[user]) g.warnings[user]=0
  g.warnings[user]++
  return g.warnings[user]
}

const characters = {
  sukuna:{power:1.3}, gojo:{power:1.2}, itadori:{power:1.1},
  nobara:{power:1.15}, maki:{power:1.2}, mai:{power:1.1}
}

let users = {}

function getUser(id){
  if(!users[id]) users[id]={money:2000,character:null}
  return users[id]
}

async function start(){
  const { state, saveCreds } = await useMultiFileAuthState("auth")
  const sock = makeWASocket({ auth: state, printQRInTerminal:false })

  sock.ev.on("creds.update", saveCreds)

  if(!sock.authState.creds.registered){
    const code = await sock.requestPairingCode(PHONE_NUMBER)
    console.log("🔥 Pair Code:", code)
  }

  sock.ev.on("connection.update",(u)=>{
    if(u.connection==="open") console.log("👑 Bot Ready")
    if(u.connection==="close") start()
  })

  sock.ev.on("messages.upsert", async ({messages})=>{
    const m = messages[0]
    if(!m.message) return

    const from = m.key.remoteJid
    const sender = m.key.participant || from
    const isGroup = from.endsWith("@g.us")
    const text = m.message.conversation || m.message.extendedTextMessage?.text
    if(!text) return

    if(isGroup && !groups[from]){
      groups[from]={enabled:true,antiLink:true,warnings:{}}
    }

    const g = groups[from]

    // ===== WARN SYSTEM =====
    if(isGroup && g.enabled){
      if(g.antiLink && (text.includes("http")||text.includes("www"))){
        let w = addWarn(g,sender)
        await sock.sendMessage(from,{text:`🚫 لينك! تحذير ${w}/3`})
      }

      if(badWords.some(w=>text.toLowerCase().includes(w))){
        let w = addWarn(g,sender)
        await sock.sendMessage(from,{text:`🤬 شتيمة! تحذير ${w}/3`})
      }

      if(g.warnings[sender] >=3){
        await sock.sendMessage(from,{text:"💀 تم طردك بسبب التحذيرات"})
        await sock.groupParticipantsUpdate(from,[sender],"remove")
        g.warnings[sender]=0
        return
      }
    }

    // ===== GROUP CMDS =====
    if(isGroup){
      if(text===".تفعيل"){g.enabled=true;return sock.sendMessage(from,{text:"✅"})}
      if(text===".تعطيل"){g.enabled=false;return sock.sendMessage(from,{text:"❌"})}
      if(text===".منع_روابط"){g.antiLink=true;return sock.sendMessage(from,{text:"🚫"})}
      if(text===".السماح_بالروابط"){g.antiLink=false;return sock.sendMessage(from,{text:"✅"})}
    }

    // ===== USER =====
    const u = getUser(sender)

    if(text===".ابدأ"){
      return sock.sendMessage(from,{text:"👑 Megumi Bot"})
    }

    if(text.startsWith(".شخصية")){
      let c = text.split(" ")[1]
      if(!characters[c]) return
      u.character=c
      return sock.sendMessage(from,{text:`🎌 اخترت ${c}`})
    }

    if(text===".بروفايلي"){
      return sock.sendMessage(from,{text:`💰 ${u.money}\n🎌 ${u.character||"لا"}`})
    }

    if(text.startsWith(".تنصيب")){
      let phone=text.split(" ")[1]
      if(!phone) return
      const code = await sock.requestPairingCode(phone)
      return sock.sendMessage(from,{text:`🔥 ${code}`})
    }

  })
}

start()
