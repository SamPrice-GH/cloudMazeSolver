const express = require("express");
const { jobStore } = require('./sqspoller'); 
const router = express.Router();

router.get('/status/:jobId', (req, res) => {
    const jobId = req.params.jobId;
    const job = jobStore.get(jobId);

    if (!job) {
        console.log(`Status for unknown job '${jobId}' requested! (currently ${jobStore.size} stored jobs)`);
        return res.status(404).json({ error: 'Job not found' });
    }

    res.json({ status: job.status, result: job.result });

    if (job.status === "completed") {
        job.status = "stale"; 
        jobStore.set(jobId, job);
        console.log(`Web client retreived completed job '${jobId}'. Removing from internal job store in 10s...`);

        setTimeout(() => {
            jobStore.delete(jobId); 
        }, 10000);
    }
});

router.get('/health', (req, res) => {
    res.status(200).json({ server_status: 'healthy' });
});

module.exports = router;