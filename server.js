import "dotenv/config";
import express from "express";
import bodyParser from "body-parser";
import session from "express-session";
import passport from "passport";
import flash from "connect-flash";
import compression from "compression";
import minify from "express-minify";
import fs from "fs";

// MondoDB Connection
import "./model/db.js";

// Auth Routes
import authRoutes from "./routes/authRoutes.js";
import labRoutes from "./routes/labRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";

import "./utils/labcodes.js";

const app = express();
const port = 3000;

app.use(bodyParser.json());

const labsFilePath = './data/labs.json'; // Path to your JSON file
let labs = loadLabsFromFile(labsFilePath);
console.log("Loaded labs: ", labs);

function loadLabsFromFile(filePath) {
  try {
    const data = fs.readFileSync(filePath);
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading labs from file:', error);
    return []; // Return an empty array if there's an error
  }
}

function saveLabsToFile(filePath, labsData) {
  const data = JSON.stringify(labsData, null, 2); // Use 2 spaces for indentation
  fs.writeFileSync(filePath, data);
}

app.get('/api/labs', (req, res) => {
  res.json(labs);
});

app.post('/api/labs', (req, res) => {
  console.log("Request body:", req.body); // Add this line
  const newLab = req.body;

  // Server-side validation: Check if the lab object has a name property
  if (!newLab || !newLab.name || newLab.name.trim() === "") {
    return res.status(400).json({ error: "Lab name is required." });
  }

  labs.push(newLab);
  saveLabsToFile(labsFilePath, labs); // Save changes to file
  res.status(201).json(newLab);
});

app.put('/api/labs', (req, res) => {
  const updatedLabs = req.body;
  updatedLabs.forEach(updatedLab => {
    const labIndex = labs.findIndex(lab => lab.name === updatedLab.name);
    if (labIndex!== -1) {
      labs[labIndex] = updatedLab;
    }
  });
  saveLabsToFile(labsFilePath, labs); // Save changes to file
  res.json(labs);
});

app.delete('/api/labs/:labName', (req, res) => {
  const labName = req.params.labName;
  labs = labs.filter(lab => lab.name!== labName);
  saveLabsToFile(labsFilePath, labs); // Save changes to file
  res.status(204).end();
});

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

// ADMIN LABS PAGE
app.get("/admin/labs", (req, res) => {
  res.render("admin/labs");
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


export const labList = labs
  .filter(lab => lab && typeof lab === 'object' && lab.active)
  .map(lab => lab.name);