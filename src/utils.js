
const fs = require("fs")
const path = require("path")
const { cwd } = require("process")
const nodemailer = require('nodemailer')
const qr = require('qrcode');


const numberToChatId = (number) => {
    return (
        number.startsWith("+")? 
            number.substring(1) : 
            number.startsWith("0")? 
                `234${number.substring(1)}` : number
    ).replace(" ", "") + "@c.us"
}

const randRangeInt = (min, max) => { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min)
}

const saveNumberMessaged = (number, messageId) => {
    const filepath = path.join(cwd(), `numbers_messaged/${messageId}.json`)
    let numberMessaged
    try {
        numberMessaged = JSON.parse(fs.readFileSync(filepath))
        
    } catch(e) {
        //console.log("saveNumberMessaged", e)
        numberMessaged = []
    }
    if(!numberMessaged.includes(number)) {
        numberMessaged.push(number)
        fs.writeFileSync(filepath, JSON.stringify(numberMessaged, null, "\t"))
    }
}

const sendMessage = (client, number, message) => {
    return new Promise((resolve, reject) => {
        const chatId = numberToChatId(number)
        client.isRegisteredUser(chatId)
        .then(yes => {
            if(yes) {
                client.sendMessage(chatId, message)
                .then(() => {
                    resolve(number)
                })
                .catch((e) => {
                    reject(e)
                })

            } else {
                reject(new Error("account-not-registered"))
            }
        })
    })
}

const getBearerToken = text => {
    text = text || ""
    if (text.startsWith("Bearer ")){
        const token = text.substring(7, text.length)
        if(voidOrEmpty(token)) return null
        return token

    } else {
        return null
    }
}

const voidOrEmpty = text => {
    return text === null || text === undefined || text.length == 0
}

const mailQrCode = (qr, mailConfig) => {
    if(!mailConfig.from || !mailConfig.to || (!mailConfig.onHtmlBody && !mailConfig.onTextBody)) return
    const transport = nodemailer.createTransport(mailConfig.smtpConfig)

    qrCodeToBase64Image(qr)
    .then(qrCodeBase64Image => {
        const message = {
            from: mailConfig.from,
            to: mailConfig.to,
            subject: mailConfig.subject,
            html: mailConfig.onHtmlBody? mailConfig.onHtmlBody(qr, qrCodeBase64Image) : null,
            text: mailConfig.onTextBody && !mailConfig.onHtmlBody? mailConfig.onTextBody(qr, qrCodeBase64Image) : null
        }

        transport.sendMail(message, function(error, info) {
            if (error) {
                console.log("QRCode mailing failed: ", error.message)

            } else {
                console.log('QRCode mailed: ' + info.response)
            }
            transport.close();
        });
    })
    .catch(e => {
        console.log("Could not generate QRCode Base64 Image: ", e.message)
    })
}

const qrCodeToBase64Image = (qrString) => {
    return new Promise((resolve, reject) => {
        resolve(`data:image/png;base64,NONE`)/*
        const options = {
            type: 'png',
            quality: 0.92,
            margin: 1,
            width: 256,
            height: 256,
        };
    
        qr.toFile('qrcode.png', qrString, options, (error) => {
            if (error) {
                reject(error)
            }
            // read the image file and convert it to base64 string
            const imageData = fs.readFileSync('qrcode.png');
            const base64Image = Buffer.from(imageData).toString('base64');
            resolve(`data:image/png;base64,${base64Image}`)
        })*/
    })

}
module.exports = {
    numberToChatId, randRangeInt, saveNumberMessaged, sendMessage, getBearerToken, voidOrEmpty, mailQrCode, qrCodeToBase64Image
}