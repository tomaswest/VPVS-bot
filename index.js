//Required modules
require('dotenv').config({ path: `.env` })
const { Telegraf } = require('telegraf');
const puppeteer = require('puppeteer')
const bot = new Telegraf(process.env.BOT_TOKEN);
const sqlite3 = require('sqlite3').verbose();
require('log-timestamp');

//bot.start((ctx) => ctx.reply('Доброго дня. Додайте цього бота на Ваш канал, для того щоб отримувати повідомлення про нові постанови Великої Палати Верховного Суду'));

bot.launch();
console.log('Bot started')


//PARSE Site function
const main = async () => {

  //CONNECT TO SQL
  let db = await new sqlite3.Database('main.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      console.error(err.message);
      return
    }
    console.log('Connected to main database.');
  });
  let ids = [];
  await db.serialize(() => {
    //db.run('CREATE TABLE decision(id)'); 
     db.all(`SELECT id as id
             FROM decisions`, (err, row) => {
      if (err) {
        console.error(err.message);
        return
      }
      //console.log(row);
      ids = row.map(a => a.id);
      //console.log(ids);
    });
  });

        const browser = await puppeteer.launch({
          headless: true,
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
try {                       
        await page.goto('https://reyestr.court.gov.ua')
        await page.waitForSelector("#CourtRegion"); //wait for page to be loaded
        await page.evaluate(() => {
            document.querySelector("#CourtRegion").click();
            document.querySelector('input[type="checkbox"][value="27"][name="CourtRegion[]"').click();
            document.querySelector("#CourtRegion").click();
        })
        await page.waitForResponse('https://reyestr.court.gov.ua/Decision/LoadCourts/?id=27');
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
        await page.waitForNavigation()
       let decisions = await page.$$(".doc_text2");
           
       let clickAndWaitForTarget = async (clickSelector, page, browser) => {
        const pageTarget = page.target(); //save this to know that this was the opener
        await clickSelector.click(); //click on a link
        const newTarget = await browser.waitForTarget(target => target.opener() === pageTarget); //check that you opened this page, rather than just checking the url
        const newPage = await newTarget.page(); //get the page object
        // await newPage.once("load",()=>{}); //this doesn't work; wait till page is loaded
        await newPage.waitForSelector("body"); //wait for page to be loaded
      
        return newPage;
      };
                
      for (x of decisions){
            let id = await x.getProperty('innerText');
            id = await id.jsonValue();
            if (ids.includes(id)) { 
              //console.log('Found ' + id)
              continue
            }
            await page.waitForTimeout(10000)
            let newPage = await clickAndWaitForTarget(x, page, browser);
            await newPage.waitForSelector("#btnPrint")
            await newPage.click("#btnPrint")
            let allBodyText = await newPage.$eval('body', el => el.innerText);
            let shortTags = ['(скорочене)', '(скорочена)', '(вступна та резолютивна частини)']
            if (shortTags.some(v => allBodyText.includes(v))) {
              //console.log ('Found short decision, skiping')
              await newPage.close()
              await db.run(`INSERT INTO decisions(id) VALUES(?)`, [id], function(err) {
                if (err) {
                  return console.log(err.message);
                }
                console.log(`Added short ${id} to database`);
              });
              continue
          }
            let caseNumber = await newPage.$eval('#tooltp', el => el.innerText);
            //console.log(caseNumber)
            let caseDate = await newPage.$eval("#info > tbody > tr:nth-child(3) > td > b", el => el.innerText);
            
           
            let pdf = await newPage.pdf()
            await bot.telegram.sendDocument('@velyka_palata', { source: pdf, filename: `${id}.pdf`,}, 
              {
                   caption: `Постанова від ${caseDate} у справі №${caseNumber}`,
                   protect_content: 'false',
                   parse_mode: 'html',
                   reply_markup: {
                    inline_keyboard: [
                     
                    ]
                  }
                }
                  
              )
              
            await newPage.close()
           //console.log(`Adding ${id} to database`);
            await db.run(`INSERT INTO decisions(id) VALUES(?)`, [id], function(err) {
              if (err) {
                return console.log(err.message);
              }
              console.log(`Added ${id} to database`);
            });
       }
      console.log('Closing db connection')
      await db.close();
      await browser.close();
      }
      catch (error) {
        await db.close();
        await browser.close();
        console.log(error)
      }
}

main()



setInterval(() => {
    console.log('PARSE started')
    main()
  }, 3600000)
// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// Telegram things
process.on('unhandledRejection', (error) => {
  //console.error(error)
})
process.on('uncaughtException', (error) => {
  //console.error(error)
})