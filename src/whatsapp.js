
//import { Client, LocalAuth } from 'whatsapp-web.js'
const { Client, LocalAuth, NoAuth } = require("whatsapp-web.js");
const qrcode = require('qrcode-terminal')
const express = require('express')
const bodyParser = require('body-parser')
const axios = require('axios').default
const { numberToChatId, randRangeInt, saveNumberMessaged, sendMessage, getBearerToken, mailQrCode, voidOrEmpty } = require("./utils");
const { PROMO_TEXT, MASS_MESSAGE_DELAY_MIN, MASS_MESSAGE_DELAY_MAX, WEBHOOKS_INTERVAL, DONE_TEXT, MAX_MESSAGE_QUEUE_SIZE, REPLY_INTERVAL, LAST_REPLY_TIME_CACHE_SIZE } = require("./constants");
const HomePage = require("./pages/HomePage");
const adminAuth = require("./middlewares/admin-auth");



const launchBot = (port, options) => {
    let client
    var isLoggedIn = true
    var paused = false
    let app

    let messageQueue
    let webhookQueue
    let messagesDelivered
    let totalMessageSent
    let lastMessageOk
    let lastWebhookOk
    let lastMessageNotOk
    let lastWebhookNotOk

    let settings

    const restart = () => {
        messageQueue = []
        webhookQueue = []
        messagesDelivered = []
        totalMessageSent = 0
        lastMessageOk = {}
        lastWebhookOk = {}
        lastMessageNotOk = {}
        lastWebhookNotOk = {}

        settings = {
            message_queue_min_interval: MASS_MESSAGE_DELAY_MIN,
            message_queue_max_interval: MASS_MESSAGE_DELAY_MAX,
            webhook_queue_interval: WEBHOOKS_INTERVAL,
            max_message_queue_size: MAX_MESSAGE_QUEUE_SIZE,
            reply_interval: REPLY_INTERVAL,
            last_reply_time_cache_size: LAST_REPLY_TIME_CACHE_SIZE,
            reply_texts: {
                "*": {
                    reply: PROMO_TEXT
                },
                "done": {
                    reply: DONE_TEXT,
                    flags: "i"
                }
            }
        }
    }

    restart()

    if(options.clientId) {
        client = new Client({
            puppeteer: { headless: true,args: ['--no-sandbox', '--disable-setuid-sandbox']},
            authStrategy: new LocalAuth({ 
                clientId: options.clientId,
                dataPath: options.dataPath || "sessions"
            })
        })

    } else {
        client = new Client({
            authStrategy: new NoAuth()
        })
    }
    
    client.on('qr', qr => {
        //console.log("Client.onQrCode", qr)
        isLoggedIn = false
        //qrcode.generate(qr, {small: true})
        console.log("Client.onQrCode", "sending to email address...")
        mailQrCode(qr, options.mailConfig)
    })
    
    client.on('ready', async () => {
        console.log("Client ready")
        isLoggedIn = true
        if(!app) {
            app = express()
     
            app.use(bodyParser.json())
            app.use(bodyParser.urlencoded({ extended: false }))
            app.use(adminAuth(["/"], options.isValidClient))
            
            app.get('/', (req, res) => {
                res.send(HomePage()).status(200)
            })

            app.get('/info', (req, res) => {
                res.json({
                    is_paused: paused,
                    message_queue_size: messageQueue.length,
                    webhook_queue_size: webhookQueue.length,
                    messages_delivered_size: messagesDelivered.length,
                    total_message_sent: totalMessageSent,
                    is_logged_in: isLoggedIn,
                    last_success_message: lastMessageOk,
                    last_success_webhook: lastWebhookOk,
                    last_failed_message: lastMessageNotOk,
                    last_failed_webhook: lastWebhookNotOk,
                    settings: settings,
                })
            })

            app.post('/testmail', (req, res) => {
                mailQrCode(JSON.stringify(req.body), req.body)
                res.json({message: "ok"})
            })

            app.get('/messages', (req, res) => {
                res.json({
                    message_queue_size: messageQueue,
                    messages_delivered: messagesDelivered
                })
            })

            app.post('/messages', (req, res) => {
                if(req.body.clear_delivered) {
                    messagesDelivered = []
                }
                if(req.body.clear_message_queue) {
                    messageQueue = []
                }
                if(req.body.pause) {
                    paused = true

                } else if(req.body.play) {
                    paused = false
                }
                res.json({
                    message: "ok"
                })
            })

            app.post('/send',  (req, res) => {
                
                const body = req.body
                if(body.number && body.number.length > 0 && ((body.message && body.message.length > 0) || settings?.reply_texts?.["*"])) {
                    const data = {
                        number: body.number,
                        message: body.message || settings?.reply_texts?.["*"]?.text,
                        messageId: body.message_id,
                        webhook: body.webhook
                    }
                    if(messageQueue.length + 1 > settings.max_message_queue_size || (
                        Array.isArray(body.number) && (
                            messageQueue.length + body.number.length > settings.max_message_queue_size
                        ) 
                    )) {
                        messageQueue = [data]

                    } else {
                        messageQueue.push(data)
                    }
                    res.json({message: "ok"})

                } else {
                    res.json({
                        message: "Make sure at least a number or an array of numbers and a message is provided."
                    })
                }
            })
            
            app.post('/settings', (req, res) => {
                if(req.body.restart) {
                    restart()
                }
                if(!isNaN(req.body.message_queue_min_interval)) {
                    settings.message_queue_min_interval = req.body.message_queue_min_interval
                }
                if(!isNaN(req.body.message_queue_max_interval)) {
                    settings.message_queue_max_interval = req.body.message_queue_max_interval
                }
                if(!isNaN(req.body.webhook_queue_interval)) {
                    settings.webhook_queue_interval = req.body.webhook_queue_interval
                }
                if(!isNaN(req.body.reply_interval)) {
                    settings.reply_interval = req.body.reply_interval
                }
                if(!isNaN(req.body.max_message_queue_size)) {
                    settings.max_message_queue_size = req.body.max_message_queue_size
                }
                if(!isNaN(req.body.last_reply_time_cache_size)) {
                    settings.last_reply_time_cache_size = req.body.last_reply_time_cache_size
                }

                var errors = ""
                var replyTextsUpdate = {}
                if(req.body.reply_texts) {
                    if(!Array.isArray(req.body.reply_texts)) {
                        errors = `The reply texts must be an array of object with regex as 
                        key and an object of the format {regex: REGEX, reply: TEXT, flags: FLAGS} as value`

                    } else {
                        for(const text of req.body.reply_texts) {
                            if(!text.regex) {
                                errors += "No regex object item; "

                            } else if(!text.reply) {
                                errors += "No reply in object item; "

                            } else {
                                replyTextsUpdate[text.regex] = {
                                    reply: text.reply,
                                    flags: text.flags
                                }
                            }
                        }
                    }
                }
                if(!voidOrEmpty(errors)) {
                    res.json({message: errors})

                } else {
                    if(Object.keys(replyTextsUpdate)) {
                        settings.reply_texts = { ...settings.reply_texts, ...replyTextsUpdate}
                    }
                    res.json({message: "ok"})
                }
            })
            
            
            app.listen(port, () => {
                console.log(`Whatsapp server listening on port ${port}!`)
            })
    
            startSending()
            startCallingWebhook()
        }
        
    })

    const lastReplyTime = {}
    client.on('message', msg => {
        if(
            !lastReplyTime[msg.from] || 
            (new Date()).getTime() >= lastReplyTime[msg.from].getTime() + settings.reply_interval
        ) {
            if(Object.keys(lastReplyTime).length > settings.last_reply_time_cache_size) {
                lastReplyTime = {
                    [msg.from]: new Date()
                }

            } else {
                lastReplyTime[msg.from] = new Date()
            }

            //saveNumberMessaged(msg, "messageId")
            const reply = getReply(msg.body)
            if(reply) {
                client.sendMessage(msg.from, reply)
            }

        }
    })
    
    client.initialize()

    const getReply = (text) => {
        let replyText
        var chatMap = {...settings.reply_texts}
        delete chatMap["*"]
        for(const [regexText, data] of Object.entries(chatMap)) {
            const regex = new RegExp(regexText, data.flags)
            if(text.match(regex)) replyText = data.reply
        }
        if(replyText) {
            return replyText

        } else {
            return settings.reply_texts["*"]?.reply
        }
    }
    
    const addToWebhookQueue = (webhook, number, messageId, status, error) => {
        webhookQueue.push({
            webhook: webhook,
            number: number,
            messageId: messageId,
            status: status,
            error: error
        })
    }
    
    var nextSendTime = null
    const futureDate = (millis) => {
        var d = new Date()
        d.setTime(d.getTime() + millis)
        return d
    }
    const startSending = () => {
        setTimeout(() => {
            if(!paused && isLoggedIn && messageQueue.length > 0 && (nextSendTime === null || (new Date()).getTime() >= nextSendTime.getTime())) {
                nextSendTime = null
                var number = Array.isArray(messageQueue[0].number)? messageQueue[0].number[0] : messageQueue[0].number
                sendMessage(client, number, messageQueue[0].message)
                .then(num => {
                    // get the chat you want to archive
                    //client.getChatById('1234567890@c.us')
                    // archive the chat
                    //await chat.archive();

                    if(messageQueue[0].messageId) {
                        saveNumberMessaged(num, messageId)
                    }
                    if(messageQueue[0].webhook) {
                        addToWebhookQueue(num, messageId, "success")
                    }
                    totalMessageSent++
                    lastMessageOk = {...messageQueue[0], number: number, time: (new Date()).toISOString}
                    
                    if(messagesDelivered.length > settings.max_message_queue_size) {
                        messagesDelivered = [lastMessageOk]

                    } else {
                        messagesDelivered.push(lastMessageOk)
                    }
                    if(!Array.isArray(messageQueue[0].number) || messageQueue[0].number.length - 1 == 0) {
                        messageQueue.shift(1)

                    } else {
                        messageQueue[0].number.shift(1)
                    }
                    startSending()
                })
                .catch(e => {
                    if(e.message === "account-not-registered") {
                        if(messageQueue[0].webhook) {
                            addToWebhookQueue(messageQueue[0].webhook, num, messageId, "failure", e.message)
                        }
                        lastMessageNotOk = {...messageQueue[0], number: number, time: (new Date()).toISOString, error: e.message}
                        if(!Array.isArray(messageQueue[0].number) || messageQueue[0].number.length - 1 == 0) {
                            messageQueue.shift(1)
    
                        } else {
                            messageQueue[0].number.shift(1)
                        }
                        startSending()
    
                    } else if(e.message.includes("network")) {
                        //Retry it
                        lastMessageNotOk = {...messageQueue[0], number: number, time: (new Date()).toISOString, error: e.message}
                        startSending()
    
                    } else {
                        //console.log(`An error occurred on number, ${numbers[0]}.`, e.message)
                        lastMessageNotOk = {...messageQueue[0], number: number, time: (new Date()).toISOString, error: e.message}
                        nextSendTime = futureDate(1000 * 60 * 2)//2 minutes pause
                    }
                })
    
            } else {
                startSending()
            }
        }, randRangeInt(settings.message_queue_min_interval, settings.message_queue_max_interval))
    }
    
    const startCallingWebhook = () => {
        setTimeout(() => {
            if(webhookQueue.length > 0) {
                const data = {...webhookQueue[0]}
                webhookQueue.shift(1)
                axios.post(data.webhook, {
                    number: data.number,
                    messageId: data.messageId,
                    status: data.status,
                    error: data.error
                })
                .then(() => {
                    lastWebhookOk = {...data, time: (new Date()).toISOString}
                })
                .catch((e) => {
                    //add it back to the end to be retried
                    webhookQueue.push(data)
                    lastWebhookNotOk = {...data, time: (new Date()).toISOString, erro: e.message}
                })
                startCallingWebhook()
    
            } else {
                startCallingWebhook()
            }
        }, settings.webhook_queue_interval);
    }
    
    
    //Closing correcily using CTRL+C 
    process.on('SIGINT', async () => {
        console.log('(SIGINT) Shutting down...')
        await client.destroy()
        console.log('client destroyed')
        process.exit(0)
    });
}

module.exports = launchBot