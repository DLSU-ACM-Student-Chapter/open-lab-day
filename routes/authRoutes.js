import express from "express";
import passport from "passport";
import GoogleAuth from "passport-google-oauth20";
import LocalStrategy from "passport-local";
import Account from "../model/accounts.js";
import crypto from "crypto";

const router = express.Router();
const GoogleStrategy = GoogleAuth.Strategy;

export const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash("message", "Please login first.");
  req.flash("type", "warn");
  res.redirect("/");
};

export const isNotAuthenticated = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return next();
  }
  req.flash("message", "You are already logged in.");
  req.flash("type", "warn");
  res.redirect("/");
};

export const isRegistered = (req, res, next) => {
  if (
    req.user !== undefined &&
    (req.user.idNum != undefined || req.user.course != "-")
  ) {
    return next();
  }
  req.flash("message", "Please register first.");
  req.flash("type", "warn");
  res.redirect("/student/register");
};

export const isNotRegistered = (req, res, next) => {
  if (
    req.user === undefined ||
    req.user.idNum == "0" ||
    req.user.course == "-"
  ) {
    return next();
  }
  if (req.user.role == "student") {
    req.flash("message", "You are already registered.");
    req.flash("type", "warn");
    res.redirect("/student");
  } else if (req.user.role == "labHead") {
    req.flash("message", "You are already logged in.");
    req.flash("type", "warn");
    res.redirect("/lab");
  }
};

export const isStudent = (req, res, next) => {
  if (req.user !== undefined && req.user.role == "student") {
    return next();
  }
  req.flash("message", "You are UNAUTHORIZED to access that route.");
  req.flash("type", "warn");
  res.redirect("/");
};

export const isLabHead = (req, res, next) => {
  if (req.user !== undefined && req.user.role == "labHead") {
    return next();
  }
  req.flash("message", "You are UNAUTHORIZED to access that route.");
  req.flash("type", "warn");
  res.redirect("/");
};

export const logOut = (req, res, next) => {
  res.clearCookie("connect.sid"); // clear the session cookie
  req.logout(function (err) {
    // logout of passport
    if (err) {
      console.log(err);
      return next(err);
    }
    req.session.destroy(function (err) {
      // destroy the session
      if (err) {
        console.log(err);
        return next(err);
      }
    });
  });
  res.redirect("/");
};

const authRoutes = (app) => {
  const googleAuthCB = (req, accessToken, refreshToken, profile, done) => {
    const hash = crypto.createHash("sha256");
    const subID = hash.update(profile._json.sub).digest("hex");
    Account.findOne({ subID }).then((account) => {
      if (account) {
        console.log(account.subID, "found.");
        return done(null, account);
      }
      const newAccount = new Account({ subID });
      newAccount
        .save()
        .then(() => {
          console.log(newAccount.subID, "account created.");
          return done(null, newAccount);
        })
        .catch((err) => {
          console.log(err);
          req.flash(
            "message",
            "Authentication error. Approach the Registration Booth."
          );
          req.flash("type", "warn");
          return done(null, false);
        });
    });
  };

  const labLoginCB = (username, password, done) => {
    Account.findOne({ subID: username }).then((account) => {
      if (!account) {
        return done(null, false, { message: "Invalid Username." });
      }
      if (account.idNum != password) {
        return done(null, false, { message: "Invalid Password." });
      }
      if (account.role != "labHead") {
        return done(null, false, { message: "Invalid Role." });
      }
      return done(null, account);
    });
  };

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    "google",
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/auth/google/redirect",
        passReqToCallback: true,
      },
      googleAuthCB
    )
  );

  passport.use(
    "labs-login",
    new LocalStrategy(
      {
        usernameField: "username",
        passwordField: "password",
      },
      labLoginCB
    )
  );

  passport.serializeUser(function (user, done) {
    done(null, user._id);
  });

  passport.deserializeUser(function (id, done) {
    Account.findById(id).then((user) => {
      done(null, user);
    });
  });

  // google auth register
  router.get(
    "/signin",
    isNotRegistered, // only those who are not yet registered can access
    passport.authenticate("google", {
      scope: ["email", "profile"],
    })
  );

  // google auth register callback
  router.get(
    "/auth/google/redirect",
    passport.authenticate("google", {
      failureRedirect: "/",
    }),
    (req, res, next) => {
      // if user is already registered, redirect to home else proceed to registration
      if (req.user.idNum != "0" && req.user.course != "-") {
        if (process.env.REGISTER_ONLY == "true") {
          next();
        } else {
          res.redirect("/student");
        }
      } else {
        res.redirect("/student/register");
      }
    },
    logOut
  );

  // google auth logout
  router.post("/logout", isAuthenticated, logOut);

  return router;
};

export default authRoutes;
