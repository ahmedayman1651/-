
const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys")
const express = require("express")

const PHONE_NUMBER = "201501255187"

let groups = {}
let users = {}

const badWords = ["كلب","حمار","غبي","fuck","shit"]

function getUser(id){
  if(!users[id]) users[id]={
    money:2000,
    xp:0,
    level:1,
    character:null,
    wins:0,
    losses:0
  }
  return users[id]
}

function addWarn(g,user){
  if(!g.warnings[user]) g.warnings[user]=0
  g.warnings[user]++
  return g.warnings[user]
}

const characters = {
  sukuna:{power:1.5},
  gojo:{power:1.4},
  itadori:{power:1.2},
  nobara:{power:1.3},
  maki:{power:1.35},
  mai:{power:1.1}
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

    const user = getUser(sender)

    user.xp += 5
    if(user.xp >= user.level*100){
      user.xp = 0
      user.level++
    }

    if(isGroup && !groups[from]){
      groups[from]={enabled:true,antiLink:true,warnings:{}}
    }

    const g = groups[from]

    // حماية
    if(isGroup && g.enabled){
      if(g.antiLink && (text.includes("http")||text.includes("www"))){
        let w = addWarn(g,sender)
        await sock.sendMessage(from,{text:`🚫 لينك! تحذير ${w}/3`})
      }

      if(badWords.some(w=>text.toLowerCase().includes(w))){
        let w = addWarn(g,sender)
        await sock.sendMessage(from,{text:`🤬 شتيمة! تحذير ${w}/3`})
      }

      if(g.warnings[sender]>=3){
        await sock.sendMessage(from,{text:"💀 تم طردك"})
        await sock.groupParticipantsUpdate(from,[sender],"remove")
        g.warnings[sender]=0
        return
      }
    }

    // اقتصاد
    if(text===".فلوسي"){
      return sock.sendMessage(from,{text:`💰 ${user.money}`})
    }

    if(text===".يومي"){
      let r = Math.floor(Math.random()*500)
      user.money += r
      return sock.sendMessage(from,{text:`🎁 ${r}`})
    }

    // لعبة حظ
    if(text.startsWith(".حظ")){
      if(Math.random()>0.5){
        user.money+=300
        user.wins++
        return sock.sendMessage(from,{text:"🎉 كسبت"})
      }else{
        user.money-=150
        user.losses++
        return sock.sendMessage(from,{text:"💀 خسرت"})
      }
    }

    // شخصيات
    if(text.startsWith(".شخصية")){
      let c = text.split(" ")[1]
      if(!characters[c]) return
      user.character=c
      return sock.sendMessage(from,{text:`🎌 اخترت ${c}`})
    }

    // بروفايل
    if(text===".بروفايلي"){
      return sock.sendMessage(from,{text:
`👑 ليفل: ${user.level}
💰 فلوس: ${user.money}
🎌 شخصية: ${user.character||"لا"}
🏆 فوز: ${user.wins}
💀 خسارة: ${user.losses}`
      })
    }

    // أوامر الجروب
    if(isGroup){
      if(text===".تفعيل"){g.enabled=true}
      if(text===".تعطيل"){g.enabled=false}
      if(text===".منع_روابط"){g.antiLink=true}
      if(text===".السماح_بالروابط"){g.antiLink=false}
    }

    // تنصيب
    if(text.startsWith(".تنصيب")){
      let phone=text.split(" ")[1]
      if(!phone) return
      const code = await sock.requestPairingCode(phone)
      return sock.sendMessage(from,{text:`🔥 ${code}`})
    }

    // منيو
    if(text===".منيو"){
      return sock.sendMessage(from,{text:
`👑 الأوامر:

💰 اقتصاد:
.فلوسي
.يومي
.حظ

🎌:
.شخصية
.بروفايلي

🛡️:
.منع_روابط
.السماح_بالروابط

⚙️:
.تنصيب`
      })
    }

  })
}

start()

const app = express()
app.get("/",(req,res)=>res.send("Bot Running"))
app.listen(3000)
