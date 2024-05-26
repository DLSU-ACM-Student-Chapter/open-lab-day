import express from "express";
import passport from "passport";
import {
  isAuthenticated,
  isLabHead,
  isNotAuthenticated,
  isNotRegistered,
} from "./authRoutes.js";
import { getLab, time, activateCode, labList } from "../utils/labcodes.js";
import startTimerToKill from "../utils/heartbeat.js";
import Account from "../model/accounts.js";
import "dotenv/config";

const router = express.Router();

const labRoutes = (app) => {
  router.use(express.static("public"));

  router.get("/", isNotAuthenticated, isNotRegistered, (req, res) => {
    const message = req.flash("message");
    const type = req.flash("type");
    res.render("lab/login", {
      popup: message.length == 0 ? null : { message, type },
    });
  });

  router.post(
    "/login",
    isNotAuthenticated,
    isNotRegistered,
    (req, res, next) => {
      const username = req.body.username;
      const password = req.body.password;
      Account.findOne({ email: username, idNum: password, role: "labHead" })
        .then((user) => {
          if (!user) {
            req.flash("message", "Invalid lab credentials.");
            req.flash("type", "warn");
            res.redirect("/lab");
          } else {
            next();
          }
        })
        .catch((err) => {
          next(err);
        });
    },
    passport.authenticate("labs-login"),
    (req, res) => {
      const labName = req.user.name;
      if (labName == "ACM Officers") {
        res.redirect("/lab/keynote");
      } else {
        res.redirect("/lab/" + labName);
      }
    }
  );

  router.get("/keynote", isAuthenticated, isLabHead, (req, res) => {
    if (req.user.name == "ACM Officers") {
      activateCode("KEYNOTE");
      startTimerToKill("KEYNOTE");
      res.render("lab/keynote", {
        code: getLab("KEYNOTE").talkCode,
        countdown: time,
        end: process.env.COUNTDOWN,
      });
    } else {
      res.render("error", {
        messages: [
          "Invalid lab. Please go back to the " + req.user.name + " lab page.",
          "If you have any concerns, approach the registration booth.",
        ],
      });
    }
  });

  router.get("/:lab", isAuthenticated, isLabHead, (req, res) => {
    const labName = req.params.lab;
    if (labList.includes(labName)) {
      if (labName == req.user.name || req.user.name == "ACM Officers") {
        activateCode(labName);
        startTimerToKill(labName);
        res.render("lab/index", {
          labName,
          code: getLab(labName).code,
          countdown: time,
          end: process.env.COUNTDOWN,
          type: "Booth",
        });
      } else {
        res.render("error", {
          messages: [
            "Invalid lab. Please go back to the " +
              req.user.name +
              " lab page.",
            "If you have any concerns, approach the registration booth.",
          ],
        });
      }
    } else {
      res.render("error", {
        messages: [
          "Invalid lab. Please go back to the " + req.user.name + " lab page.",
          "If you have any concerns, approach the registration booth.",
        ],
      });
    }
  });

  router.get("/:lab/talk", isAuthenticated, isLabHead, (req, res) => {
    const labName = req.params.lab;
    if (labList.includes(labName)) {
      if (labName == req.user.name || req.user.name == "ACM Officers") {
        activateCode(labName);
        startTimerToKill(labName);
        res.render("lab/index", {
          labName,
          code: getLab(labName).talkCode,
          countdown: time,
          end: process.env.COUNTDOWN,
          type: "Talk",
        });
      } else {
        res.render("error", {
          messages: [
            "Invalid lab. Please go back to the " +
              req.user.name +
              " lab page.",
            "If you have any concerns, approach the registration booth.",
          ],
        });
      }
    } else {
      res.render("error", {
        messages: [
          "Invalid lab. Please go back to the " + req.user.name + " lab page.",
          "If you have any concerns, approach the registration booth.",
        ],
      });
    }
  });

  return router;
};

export default labRoutes;
