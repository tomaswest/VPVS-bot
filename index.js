//Required modules
require('dotenv').config({ path: `.env` })
const { Telegraf } = require('telegraf');
const puppeteer = require('puppeteer')
const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => ctx.reply('Доброго дня. Додайте цього бота на Ваш канал, для того щоб отримувати повідомлення про нові постанови Великої Палати Верховного Суду'));

bot.launch();
console.log('Bot started')


//PARSE Site function
const parse = async () => {
        otpText = '' // clear OTP
        const browser = await puppeteer.launch({
          headless: false,
          ignoreHTTPSErrors: true,
          args: [`--lang=en-GB`],
          defaultViewport: {
            width: 1100,
            height: 900,
          },
        }) //, slowMo: 500
        const page = await browser.newPage()
        //const pendingXHR = new PendingXHR(page);
        await page.setDefaultNavigationTimeout(240000);
        //await page.setCacheEnabled(false);
        await page.setUserAgent(
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4147.125 Safari/538.36'
        )
                       
        await page.goto('https://reyestr.court.gov.ua')
        await page.evaluate(() => {
            document.querySelector("#CourtRegion").click();
            document.querySelector('input[type="checkbox"][value="27"][name="CourtRegion[]"').click();
            document.querySelector("#CourtRegion").click();
        })
        await page.waitForSelector("#CourtName")
        await page.evaluate(() => {
            document.querySelector("#CourtName").click();
            document.querySelector('input[type="checkbox"][value="986"][name="CourtName[]"').click();
            document.querySelector("#CourtName").click();
        })
        await page.waitForSelector("#VRType")
        await page.evaluate(() => {
            document.querySelector("#VRType").click();
            document.querySelector('input[type="checkbox"][value="2"][name="VRType[]"').click();
            document.querySelector("#VRType").click();
        })
        await page.select('select#Sort', '1');
        await page.select('select#Liga', 'false');
        await page.select('select#PagingInfo_ItemsPerPage', '100');
        await page.evaluate(() => {
            document.querySelector("#btn").click()
        })
        //await page.click("#tdForWidth_1 > div.multiSelectOptions > label.checked > input[type=checkbox]")
}
parse()
// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));