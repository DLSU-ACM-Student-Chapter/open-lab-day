import express from "express";
import {
  logOut,
  isAuthenticated,
  isNotRegistered,
  isRegistered,
  isStudent,
} from "./authRoutes.js";
import Account from "../model/accounts.js";
import CheckLists from "../model/checklists.js";
import { getLab, labList } from "../utils/labcodes.js";
import moment from "moment-timezone";

const router = express.Router();

const studentRoutes = (app) => {
  router.use(express.static("public"));

  router.get("/register", isAuthenticated, isNotRegistered, (req, res) => {
    const message = req.flash("message");
    const type = req.flash("type");
    res.render("student/register", {
      popup: message.length == 0 ? null : { message, type },
    });
  });

  router.post(
    "/register",
    isAuthenticated,
    isNotRegistered,
    (req, res, next) => {
      const idNum = req.body.idNum;
      const idNum2 = req.body["idNum-confirm"];
      const course = req.body.course;
      const isRequired = req.body.required == "true" ? true : false;

      // if idNum and idNum2 do not match
      if (idNum != idNum2) {
        req.flash("message", "ID Numbers do not match.");
        req.flash("type", "warn");
        res.redirect("/student/register");
      } else if (isNaN(Number(idNum))) {
        req.flash("message", "Invalid ID Number.");
        req.flash("type", "warn");
        res.redirect("/student/register");
      } else {
        Account.findOne({ idNum: idNum })
          .then((user) => {
            if (user) {
              req.flash("message", "ID Number already registered.");
              req.flash("type", "warn");
              res.redirect("/student/register");
            } else {
              Account.findOneAndUpdate(
                { _id: req.user._id },
                {
                  idNum,
                  course,
                  isRequired,
                }
              )
                .then((user) => {
                  console.log(user.subID, "registered.");
                })
                .catch((err) => {
                  console.log(err);
                  res.render("error", {
                    messages: [
                      "Registration Error. Please try again.",
                      "If problem persists, approach the registration booth.",
                    ],
                  });
                });
              // Create checklist for student
              var newCheckLab = [];
              labList.sort().forEach((lab) => {
                newCheckLab.push({
                  labName: lab,
                  checked: false,
                });
              });
              newCheckLab.push({
                labName: "Talk",
                visited: false,
              });

              const newCheckList = new CheckLists({
                idNum: req.body.idNum,
                labList: newCheckLab,
              });
              newCheckList
                .save()
                .then(() => {
                  console.log("Checklist created for", req.body.idNum);
                })
                .catch((err) => {
                  console.log(err);
                  res.render("error", {
                    messages: [
                      "Error creating checklist.",
                      "Please IMMEDIATELY approach the registration booth.",
                    ],
                  });
                });

              if (process.env.REGISTER_ONLY == "true") {
                next();
              } else {
                req.flash("message", "Registration successful.");
                req.flash("type", "good");
                res.redirect("/student");
              }
            }
          })
          .catch((err) => {
            console.log(err);
            res.render("error", {
              messages: [
                "ID Number Lookup Error. Please try again.",
                "If problem persists, approach the registration booth.",
              ],
            });
          });
      }
    },
    logOut
  );

  router.get("/data_privacy", (req, res) => {
    res.render("student/data_privacy");
  });

  router.get("/", isAuthenticated, isRegistered, isStudent, (req, res) => {
    const message = req.flash("message");
    const type = req.flash("type");
    CheckLists.findOne({ idNum: req.user.idNum })
      .then((checkList) => {
        let isComplete = true;
        checkList.labList.forEach((lab) => {
          if (!lab.visited) {
            isComplete = false;
          }
        });

        if (!isComplete) {
          res.render("student/index", {
            popup: message.length == 0 ? null : { message, type },
            labList: checkList.labList,
            backRoute: "/",
            idNum: req.user.idNum,
          });
        } else {
          res.redirect("/student/done");
        }
      })
      .catch((err) => {
        console.log(err);
        res.render("error", {
          messages: [
            "Error fetching checklist. Please try again.",
            "If the problem persists, approach the registration booth.",
          ],
        });
      });
  });

  router.get(
    "/lab/:lab",
    isAuthenticated,
    isRegistered,
    isStudent,
    (req, res) => {
      const lab = req.params.lab.toUpperCase();
      const message = req.flash("message");
      const type = req.flash("type");
      if (labList.includes(lab)) {
        CheckLists.findOne({ idNum: req.user.idNum }).then((checkList) => {
          let isVisited;
          checkList.labList.forEach((check) => {
            if (check.labName === lab) {
              isVisited = check.visited;
            }
          });
          if (isVisited) {
            req.flash("message", "You have already visited " + lab + ".");
            req.flash("type", "warn");
            res.redirect("/student");
          } else {
            res.render("student/lab", {
              popup: message.length == 0 ? null : { message, type },
              backRoute: "/student",
              lab,
              idNum: req.user.idNum,
            });
          }
        });
      } else {
        res.render("error", {
          messages: [
            "Invalid lab. The route you accessed is invalid.",
            "If you have any concerns, approach the registration booth.",
          ],
        });
      }
    }
  );

  router.get(
    "/seminar",
    isAuthenticated,
    isRegistered,
    isStudent,
    (req, res) => {
      const message = req.flash("message");
      const type = req.flash("type");
      CheckLists.findOne({ idNum: req.user.idNum })
        .then((checkList) => {
          let isVisited;
          checkList.labList.forEach((check) => {
            if (check.labName === "Talk") {
              isVisited = check.visited;
            }
          });

          if (isVisited) {
            req.flash("message", "You have already visited a seminar.");
            req.flash("type", "warn");
            res.redirect("/student");
          } else {
            res.render("student/seminar", {
              popup: message.length == 0 ? null : { message, type },
              backRoute: "/student",
              idNum: req.user.idNum,
            });
          }
        })
        .catch((err) => {
          console.log(err);
          res.render("error", {
            messages: [
              "Error fetching checklist. Please try again.",
              "If the problem persists, approach the registration booth.",
            ],
          });
        });
    }
  );

  router.post(
    "/code_check",
    isAuthenticated,
    isRegistered,
    isStudent,
    (req, res) => {
      const idNum = req.user.idNum;
      const labName = req.body.labName;
      const lab = getLab(labName);
      let inputCode = "";

      const keys = Object.keys(req.body);
      keys.forEach((key) => {
        if (key.startsWith("code")) {
          inputCode += req.body[key];
        }
      });
      // if lab name does not exist
      if (!labList.includes(labName)) {
        req.flash("message", "Invalid lab.");
        req.flash("type", "warn");
        res.redirect("/student/lab/" + labName);
      }
      // if lab exists but code is not activated
      else if (!lab.activated) {
        req.flash("message", "Code not yet activated.");
        req.flash("type", "warn");
        res.redirect("/student/lab/" + labName);
      }
      // if lab exists and code is incorrect
      else if (lab.code !== inputCode) {
        req.flash(
          "message",
          "Incorrect code. Please check the code from lab head."
        );
        req.flash("type", "warn");
        res.redirect("/student/lab/" + labName);
      }
      // if lab exists and code is correct and activated
      else if (lab.code === inputCode && lab.activated) {
        CheckLists.findOneAndUpdate(
          { idNum, "labList.labName": labName },
          {
            "labList.$.visited": true,
            "labList.$.visitTime": moment
              .tz("Asia/Manila")
              .format("MMMM DD YYYY, HH:mm:ss"),
          }
        )
          .then(() => {
            req.flash("message", labName + " Code accepted.");
            req.flash("type", "good");
            res.redirect("/student");
          })
          .catch((err) => {
            console.log(err);
            res.render("error", {
              messages: [
                "Error updating checklist. Please try again.",
                "If the problem persists, approach the registration booth.",
              ],
            });
          });
      } else {
        req.flash("message", "An error occurred. Please try again.");
        req.flash("type", "warn");
        res.redirect("/student/lab/" + labName);
      }
    }
  );

  router.post(
    "/seminar_check",
    isAuthenticated,
    isRegistered,
    isStudent,
    (req, res) => {
      const idNum = req.user.idNum;
      const labName = req.body.labName;
      const talkCodes = getLab("TALK");
      let inputCode = "";
      const keys = Object.keys(req.body);
      keys.forEach((key) => {
        if (key.startsWith("code")) {
          inputCode += req.body[key];
        }
      });
      if (talkCodes.includes(inputCode)) {
        CheckLists.findOneAndUpdate(
          { idNum, "labList.labName": labName },
          {
            "labList.$.visited": true,
            "labList.$.visitTime": moment
              .tz("Asia/Manila")
              .format("MMMM DD YYYY, HH:mm:ss"),
          }
        )
          .then(() => {
            req.flash("message", labName + " Code accepted.");
            req.flash("type", "good");
            res.redirect("/student");
          })
          .catch((err) => {
            console.log(err);
            res.render("error", {
              messages: [
                "Error updating checklist. Please try again.",
                "If the problem persists, approach the registration booth.",
              ],
            });
          });
      } else {
        req.flash("message", "Incorrect code. Please check the code again.");
        req.flash("type", "warn");
        res.redirect("/student/seminar");
      }
    }
  );

  router.get("/done", isAuthenticated, isRegistered, isStudent, (req, res) => {
    CheckLists.findOne({ idNum: req.user.idNum })
      .then((checkList) => {
        let isComplete = true;
        checkList.labList.forEach((lab) => {
          if (!lab.visited) {
            isComplete = false;
          }
        });
        if (!isComplete) {
          req.flash("message", "You are not done yet.");
          req.flash("type", "warn");
          res.redirect("/student");
        } else {
          res.render("student/done");
        }
      })
      .catch((err) => {
        res.render("error", {
          messages: [
            "Error updating checklist. Please try again.",
            "If the problem persists, approach the registration booth.",
          ],
        });
      });
  });

  return router;
};

export default studentRoutes;
