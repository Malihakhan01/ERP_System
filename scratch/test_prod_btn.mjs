import { chromium } from "playwright";

async function test() {
  const b = await chromium.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true });
  const p = await b.newPage();
  await p.goto("http://localhost:3000/production", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1000);
  console.log("On /production, visible text has Create Work Order:", (await p.innerText("body")).includes("Create Work Order"));
  
  await p.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const createBtn = btns.find(b => b.textContent.includes("Create Work Order"));
    if (createBtn) createBtn.click();
  });

  await p.waitForTimeout(1000);
  const afterClick = await p.innerText("body");
  console.log("After click, contains Commercial Source Order:", afterClick.includes("Commercial Source Order"));
  console.log("After click, contains Release Work Order to Floor:", afterClick.includes("Release Work Order to Floor"));
  await b.close();
}

test().catch(console.error);
