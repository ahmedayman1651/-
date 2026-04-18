
// 👑 MEGUMI FULL BOT (PAIRING CODE + ALL FEATURES) 💀🔥
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys")

const OWNER = "201501255187@s.whatsapp.net"
const PHONE_NUMBER = "201501255187" // رقمك

let db = { users:{}, plane:{}, drops:null, boss:null }

function now(){ return Date.now() }
function rnd(min,max){ return Math.random()*(max-min)+min }

function getUser(id){
  if(!db.users[id]){
    db.users[id]={money:2000,bank:0,wins:0,losses:0,luck:50,weapons:[],character:null}
  }
  return db.users[id]
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
    if(u.connection==="open") console.log("👑 Connected")
    if(u.connection==="close") start()
  })

  sock.ev.on("messages.upsert", async ({messages})=>{
    const m = messages[0]
    if(!m.message) return
    const from = m.key.remoteJid
    const sender = m.key.participant || from
    const text = m.message.conversation || m.message.extendedTextMessage?.text
    if(!text) return

    const u = getUser(sender)
    const isOwner = sender===OWNER

    if(text===".ابدأ"){
      return sock.sendMessage(from,{text:"👁️ Megumi Bot شغال"})
    }

    if(text===".بروفايلي"){
      return sock.sendMessage(from,{text:`💰 ${u.money}\n🏦 ${u.bank}`})
    }

    if(text.startsWith(".تنصيب")){
      let phone=text.split(" ")[1]
      if(!phone) return sock.sendMessage(from,{text:"❌ .تنصيب 201..."})
      try{
        const code = await sock.requestPairingCode(phone)
        return sock.sendMessage(from,{text:`🔥 كودك:\n${code}`})
      }catch{
        return sock.sendMessage(from,{text:"❌ فشل"})
      }
    }

    if(text.startsWith(".طائرة")){
      let bet=parseInt(text.split(" ")[1])
      if(u.money<bet) return
      u.money-=bet
      let crash
      let r=Math.random()
      if(r<0.4) crash=1+rnd(0,1.5)
      else if(r<0.75) crash=2.5+rnd(0,3)
      else if(r<0.95) crash=5.5+rnd(0,5)
      else crash=10+rnd(0,10)

      db.plane[sender]={bet,mul:1,crash,active:true}

      let i=setInterval(()=>{
        let g=db.plane[sender]
        if(!g||!g.active){clearInterval(i);return}
        g.mul+=rnd(0.2,0.7)
        if(g.mul>=g.crash){
          sock.sendMessage(from,{text:`💥 ${g.crash.toFixed(2)}x`})
          g.active=false
          clearInterval(i)
        }else{
          sock.sendMessage(from,{text:`✈️ ${g.mul.toFixed(2)}x`})
        }
      },2000)
    }

    if(text===".سحب"){
      let g=db.plane[sender]
      if(!g||!g.active) return
      let win=Math.floor(g.bet*g.mul)
      u.money+=win
      g.active=false
      return sock.sendMessage(from,{text:`💰 ${win}`})
    }

  })
}
start()
