const express = require("express");
const createError = require('http-errors');
//const fileUpload = require('express-fileupload');
const cors = require("cors");
const logger = require('morgan');
const app = express();
const os = require("os");
const sqspoller = require("./sqspoller");
require('dotenv').config()


// ---------------------- MIDDLEWARE SETUP ----------------------
app.use(cors());

app.use(logger(":method :url :status - :response-time ms"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------- END MIDDLEWARE SETUP ----------------------



// ---------------------- ROUTER SETUP ----------------------

const router = require("./router");

app.use("/mazesolver", router);

// ---------------------- END ROUTER SETUP ----------------------

// ---------------------- ERROR HANDLING SETUP ----------------------

// error handling middleware 'borrowed' from local library prac

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404, 'Endpoint not found'));
});

app.use(function (err, req, res, next) {
  // Log 500 Internal Server Errors
  if (err.status === 500 || !err.status) {
    console.error("Internal Server Error:", err);
  }

  // If the error doesn't have a status, default to 500
  const status = err.status || 500;

  // Send the error response
  res.status(status).json({
    error: {
      status: status,
      message: err.message,
    },
  });
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  //res.locals.error = req.app.get("env") === "development" ? err : {}; ***************** CHANGE IN PROD
  res.locals.error = err;

  // render the error page
  res.status(err.status || 500);
  res.json(err);
});

// ---------------------- END ERROR HANDLING SETUP ----------------------



// ---------------------- PORT SETUP ----------------------

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Solver listening on port ${port}!`);
  sqspoller.processMessages();
});

// ---------------------- END PORT SETUP ----------------------