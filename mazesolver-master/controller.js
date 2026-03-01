const express = require('express');
const { jobStore } = require('./sqspoller');  // Import the jobStore
const router = express.Router();

router.get('/status/:jobId', (req, res) => {
    const jobId = req.params.jobId;
    const job = jobStore.get(jobId);

    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }

    res.json({ status: job.status, result: job.result });
});

module.exports = router;