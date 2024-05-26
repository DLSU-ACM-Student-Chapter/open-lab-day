import "dotenv/config";
import express from "express";
import bodyParser from "body-parser";
import session from "express-session";
import passport from "passport";
import flash from "connect-flash";
import compression from "compression";
import minify from "express-minify";

// MondoDB Connection
import "./model/db.js";

// Auth Routes
import authRoutes from "./routes/authRoutes.js";
import labRoutes from "./routes/labRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";

import "./utils/labcodes.js";

const app = express();
const port = 3000;

app.use(flash());
app.use(express.static("public"));
app.set("view engine", "ejs"); // Set EJS as the view engine
app.set("partials", "views/partials"); // partials directory
app.use(bodyParser.urlencoded({ extended: true })); // Middleware to parse JSON bodies
//app session and cookie
app.use(
  session({
    secret: process.env.GOOGLE_CLIENT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
    },
  })
);
//initialize passport
app.use(passport.initialize());
app.use(passport.session());
// Auth Routes
app.use("/", authRoutes(app));
app.use("/student", studentRoutes(app));
app.use("/lab", labRoutes(app));
// compressor and minifier
app.use(
  compression({
    level: 6,
    threshold: 0,
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) {
        return false;
      }
      return compression.filter(req, res);
    },
  })
);
app.use(
  minify({
    cache: false,
    jsMatch: /\.js$/,
    cssMatch: /\.css$/,
    jsonMatch: /\.json$/,
  })
);

// WELCOME PAGE
app.get("/", (req, res) => {
  const message = req.flash("message");
  const type = req.flash("type");
  let user = req.user || null;
  res.render("index", {
    popup: message.length == 0 ? null : { message, type },
    user,
  });
});

// Invalid Routes
app.get("*", (req, res) => {
  res.render("error", {
    messages: [
      "Invalid Route...",
      "If you have any concerns, approach the registration booth.",
    ],
  });
});

// SERVER
app.listen(port, () => {
  console.log(`Server running at port ${port}`);
});
