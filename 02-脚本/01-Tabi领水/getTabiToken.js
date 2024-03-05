const axios = require('axios');
const fss = require('fs/promises');
const fs = require('fs');
//import fs from "fs/promises";
const csv = require('csv-parser');
//const config = require('../../config/runner.json');
const { HttpsProxyAgent } = require('https-proxy-agent');
const fakeUa = require('fake-useragent');
const userAgent = fakeUa();

const MAX_RETRIES = 5; // 最大重试次数
const MAX_PROXY_CHECK_ATTEMPTS = 3;
const Proxy = ''

const agent = new HttpsProxyAgent(Proxy);

async function processAddresses(filePath) {
    try {
        const ADDRESS = await fss.readFile(filePath, 'utf8');

        // 使用 split('\n') 替代正则表达式来拆分行
        const lines = ADDRESS.split(/\r?\n|\r/g);

        // 如果最后一行是空行，则去掉
        if (lines[lines.length - 1].trim() === '') {
            lines.pop();
        }

        const addList = lines.map((line) => {
            // 使用 split(':') 来获取冒号前的部分
            return line.split(':')[0]//.trim();
        });

        console.log(addList);
        return addList
        
    } catch (err) {
        console.error('读取文件时出错：', err);
    }
}

async function verifyProxy(agent) {
    for (let attempt = 1; attempt <= MAX_PROXY_CHECK_ATTEMPTS; attempt++) {
        try {
            await axios.get('https://myip.ipip.net', { httpsAgent: agent });
            console.log('代理验证成功');
            return true;
        } catch (error) {
            console.log(`代理验证失败，尝试次数：${attempt}`);
            if (attempt < MAX_PROXY_CHECK_ATTEMPTS) await sleep(60000); // 等待1分钟
        }
    }
    return false;
}
//verifyProxy()
async function main() {
    try {
        const addresses = await processAddresses('seeds.txt');
        // console.log(typeof addresses);
        // console.log(addresses);
        console.log('开始领取测试币');

        const userAgent = fakeUa();
        const agent = new HttpsProxyAgent(Proxy);
        const headers = {
            'accept': '*/*',
            'Accept-Encoding': 'gzip, deflate, br',
            'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'content-type': 'application/json',
            'origin': 'https://faucet.testnet.tabichain.com',
            'referer': 'https://faucet.testnet.tabichain.com/',
            'user-agent': userAgent,
        };

        if (!(await verifyProxy(agent))) {
            console.log('代理验证失败，无法继续执行任务');
            return;
        }

        for (const address of addresses) {
            console.log(`领取地址: ${address}`);

            for (let attempts = 0; attempts < MAX_RETRIES; attempts++) {
                try {
                    const url = `https://faucet-api.testnet.tabichain.com/api/faucet`;
                    const data = { address: address };
                    const response = await axios.post(url, data, {
                        headers: headers,
                        httpsAgent: agent,
                    });
                    console.log('领取成功✅ ', response.data.message);
                    await sleep(3000); // 等待3秒
                    break; 
                } catch (error) {
                    console.error(`领取失败❌，地址：${address}: ${error.message}`);
                    if (attempts === MAX_RETRIES - 1) console.log('达到最大重试次数，继续下一个地址');
                    else await sleep(10000); // 等待10秒后重试
                }
            }
        }
    } catch (error) {
        console.error('发生错误:', error);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

main()