
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
    warns:0
  }
  return users[id]
}

const characters = {
  sukuna:1.5,
  gojo:1.4,
  itadori:1.2,
  nobara:1.3,
  maki:1.35,
  mai:1.1
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

    // XP
    user.xp += 5
    if(user.xp >= user.level*100){
      user.xp = 0
      user.level++
    }

    if(isGroup && !groups[from]){
      groups[from]={antiLink:true}
    }

    // protection
    if(isGroup){
      if(groups[from].antiLink && (text.includes("http")||text.includes("www"))){
        user.warns++
        await sock.sendMessage(from,{text:`🚫 لينك | تحذير ${user.warns}/3`})
      }

      if(badWords.some(w=>text.toLowerCase().includes(w))){
        user.warns++
        await sock.sendMessage(from,{text:`🤬 شتيمة | تحذير ${user.warns}/3`})
      }

      if(user.warns >=3){
        await sock.sendMessage(from,{text:"💀 تم طردك"})
        await sock.groupParticipantsUpdate(from,[sender],"remove")
        user.warns = 0
      }
    }

    // economy
    if(text === ".فلوسي"){
      return sock.sendMessage(from,{text:`💰 ${user.money}`})
    }

    if(text === ".يومي"){
      let r = Math.floor(Math.random()*500)
      user.money += r
      return sock.sendMessage(from,{text:`🎁 ${r}`})
    }

    if(text === ".حظ"){
      if(Math.random()>0.5){
        user.money+=200
        return sock.sendMessage(from,{text:"🎉 كسبت"})
      }else{
        user.money-=100
        return sock.sendMessage(from,{text:"💀 خسرت"})
      }
    }

    // characters
    if(text.startsWith(".شخصية")){
      let c = text.split(" ")[1]
      if(!characters[c]) return
      user.character=c
      return sock.sendMessage(from,{text:`🎌 اخترت ${c}`})
    }

    if(text === ".بروفايلي"){
      return sock.sendMessage(from,{text:
`👑 ليفل: ${user.level}
💰 فلوس: ${user.money}
🎌 شخصية: ${user.character||"لا"}`
      })
    }

    // group control
    if(text === ".منع_روابط"){
      groups[from].antiLink=true
      return sock.sendMessage(from,{text:"🚫 تم"})
    }

    if(text === ".السماح_بالروابط"){
      groups[from].antiLink=false
      return sock.sendMessage(from,{text:"✅ تم"})
    }

    // install
    if(text.startsWith(".تنصيب")){
      let phone=text.split(" ")[1]
      if(!phone) return
      const code = await sock.requestPairingCode(phone)
      return sock.sendMessage(from,{text:`🔥 ${code}`})
    }

    if(text === ".منيو"){
      return sock.sendMessage(from,{text:
`👑 الأوامر:

💰 .فلوسي
🎁 .يومي
🎲 .حظ

🎌 .شخصية
👤 .بروفايلي

🛡️ .منع_روابط
🛡️ .السماح_بالروابط

⚙️ .تنصيب`
      })
    }

  })
}

start()

// server for Render
const app = express()
app.get("/", (req,res)=>res.send("Bot running"))
app.listen(3000)
