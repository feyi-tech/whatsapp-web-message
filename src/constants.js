const MASS_MESSAGE_DELAY_MIN = 1000
const MASS_MESSAGE_DELAY_MAX = 4000

const MESSAGE_REPLY_DELAY_MIN = 2000
const MESSAGE_REPLY_DELAY_MAX = 5000

const WEBHOOKS_INTERVAL = 100

const MAX_MESSAGE_QUEUE_SIZE = 10000
const LAST_REPLY_TIME_CACHE_SIZE = 3000

const REPLY_INTERVAL = 300000//5 minutes

const PROMO_TEXT = `Hi, I'm Nancy from *Cinegum TV*
🥳🥳🥳🥳🥳🥳🥳

💥✨🍿 *Cinegum TV* brings you exciting updates in education, business, entertainment, and *the election*💫

🏆Daily *1,000 naira airtime each to 5 lucky winners*🏁

📌HOW TO ENJOY ALL THESE ADVANTAGES

✅ *SAVE THIS CONTACT AS “Cinegum TV”*

Send *Done* after saving 🤝🏽

🌐https://cinegum.com`

const DONE_TEXT = `🙏🏽Thanks for subscribing to *Cinegum TV*

💥✨🍿 *Cinegum TV* brings you exciting updates in education, business, entertainment, and *the election*💫

🏆Daily *1,000 naira airtime each to 5 lucky winners*🏁

📌HOW TO ENJOY ALL THESE ADVANTAGES WITH YOUR FRIENDS

✅ *TELL THEM TO SAVE THIS CONTACT AS “Cinegum TV”*

And send *Done* after saving 🤝🏽

🌐https://cinegum.com`

module.exports = {
    PROMO_TEXT, DONE_TEXT, MASS_MESSAGE_DELAY_MIN, MASS_MESSAGE_DELAY_MAX, 
    MESSAGE_REPLY_DELAY_MIN, MESSAGE_REPLY_DELAY_MAX,
    WEBHOOKS_INTERVAL, MAX_MESSAGE_QUEUE_SIZE, REPLY_INTERVAL, LAST_REPLY_TIME_CACHE_SIZE
}