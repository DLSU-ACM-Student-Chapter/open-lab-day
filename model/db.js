import mongoose from "mongoose";
import "dotenv/config";

mongoose
  .connect(process.env.DB)
  .then(() => {
    console.log("Connected to the database.");
  })
  .catch((err) => {
    console.log("Error connecting to the database", err);
  });
