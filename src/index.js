require('dotenv').config()
//console.log("Dotenv", process.env)
const QrCodeTemplate = require("./pages/QrCodeTemplate")
const { voidOrEmpty } = require("./utils")
const launchBot = require("./whatsapp")

launchBot(process.env.PORT, {
    //My airtel for the Cinegum TV
    clientId: "08101467951", 
    datPath: "sessions",
    mailConfig: {
        from: `Whatsapp Message Bot<${process.env.SMTP_USER}>`,
        to: "jinminetics@gmail.com, cyberockvalley@gmail.com",//"mail1@domain.tld, mail2@domain.tld"
        subject: "Scan Whatsapp QRCode",
        onHtmlBody: (qrCode, qrCodeBase64Image) => {
            return QrCodeTemplate(
                "Scan Your Whatsapp QRCode", 
                "https://whatsapp.feyitech.com", 
                "Feyitech Whatsapp Bot",
                qrCode
            )
        },
        onTextBody: (qrCode, qrCodeBase64Image) => {
            return ""
        },
        smtpConfig: {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: !voidOrEmpty(process.env.SMTP_SECURE),
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS
            }
        }
    },
    isValidClient: (req, bearerToken) => {
        return bearerToken === process.env.CLIENT_SECRET
    }
})