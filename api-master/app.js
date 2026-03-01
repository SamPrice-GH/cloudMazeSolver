const express = require("express");
const createError = require('http-errors');
const fileUpload = require('express-fileupload');
const cors = require("cors");
const logger = require('morgan');
const app = express();
const os = require("os");
require('dotenv').config()


// ---------------------- DATABASE SETUP ----------------------

// // Set up mongoose connection
// const mongoose = require("mongoose");

// mongoose.set("strictQuery", false);

// const mongoDB = process.env.MONGODB_URI;

// main().catch((err) => console.log(err));
// async function main() {
//   await mongoose.connect(mongoDB);
// }

// ---------------------- END DATABASE SETUP ----------------------



// ---------------------- MIDDLEWARE SETUP ----------------------
app.use(cors());

// include auth status in logs
logger.token('auth-status', (req) => {
  if (req.user) {
      if (req.user.isAdmin) { return `(${req.user.username} - admin)`; } // log username and show admin
      else { return `(${req.user.username})`; } // log just username
  }
  return '(no auth)'; // Log 'unauthenticated' if not logged in
});

app.use(logger(":auth-status :method :url :status - :response-time ms"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());
// error handling is technically middleware but it has its own section below...

// ---------------------- END MIDDLEWARE SETUP ----------------------



// ---------------------- ROUTER SETUP ----------------------

// require routers
const mazeRouter = require("./src/routes/mazeRoutes.js");
const solveRouter = require("./src/routes/solveRoutes.js");
const authRouter = require("./src/routes/authRoutes.js");

app.use("/api/maze", mazeRouter);
app.use("/api/solve", solveRouter);
app.use("/api/auth", authRouter);

app.get("/health", (req, res) => {
  res.status(200).json({ server_status: 'healthy' });
});

app.get("/", (req, res) => {
  res.redirect("/api/maze");
});

// ---------------------- END ROUTER SETUP ----------------------

// ---------------------- ERROR HANDLING SETUP ----------------------

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

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`API listening on port ${port}!`);
});

// ---------------------- END PORT SETUP ----------------------