const axios = require('axios');
const { performance } = require('perf_hooks');

const BASE_URL = process.env.BASE_API_URL;
const ENDPOINT = '/solve/maze/8?algo=dfs';

const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36",
};

const sendRequest = async (okCounter, errorCounter) => {
    try {
        const response = await axios.get(`${BASE_URL}${ENDPOINT}`);
        okCounter += 1;
    } catch (error) {
        errorCounter += 1;
    }
};

const stringifedRequest = async () => {
    try {
        const response = await axios.get(`${BASE_URL}${ENDPOINT}`, {headers,});
        console.log(`Status: ${response.status}, Data: ${response.data}`);
        console.log(JSON.stringify(response));
    } catch (error) {
        console.log(JSON.stringify(error));
        console.error(`Error: ${error.message}`);
    }
}

const loadTestBatch = async (numRequests, batchNumber) => {
    console.log(`Starting load test batch #${batchNumber}...`);
    let okCounter = 0;
    let errorCounter = 0;

    // Measure the time it takes to send all requests
    const startSendingTime = performance.now();
    const promises =[[], [], [], [], []];
    for (let i = 0; i < promises.length; i++) {
        for (let j = 0; j < numRequests/5; j++) {
            await new Promise(r => setTimeout(r, 50));
            promises[i].push(sendRequest(okCounter, errorCounter));
        }
    }
    const endSendingTime = performance.now();

    console.log(`All requests (${numRequests}) sent in ${(endSendingTime - startSendingTime).toFixed(2)} ms`);

    // Measure the time it takes to receive all responses
    const startResponseTime = performance.now();
    for (let i = 0; i < promises.length; i++) {
        const startMiddleTime = performance.now();
        await Promise.all(promises[i]);
        const endMiddleTime = performance.now();
        console.log(`${i+1}: ${promises[i].length} responses recieved in ${(endMiddleTime - startMiddleTime).toFixed(2)} ms`);
    }
    const endResponseTime = performance.now();
    
    console.log(`All responses (${numRequests}) recieved in ${(endResponseTime - startResponseTime).toFixed(2)} ms`);
    console.log(`Load test batch #${batchNumber} complete.`)
};

async function timedLoadTest(mins) {
    let batchCounter = 1;
    const startTime = performance.now();
    console.log(`STARTING ${mins}min LOAD TEST @ ${Date.now()}`);
    while ((performance.now() - startTime) < mins*60*1000) {
        await loadTestBatch(100, batchCounter);
        batchCounter++;
    }
    console.log(`${mins}min LOAD TEST COMPLETED @ ${Date.now()}`);
}

timedLoadTest(3);