import mongoose from "mongoose";

const accountSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  subID: {
    type: String,
    required: true,
  },
  idNum: {
    type: String,
    unique: true,
    sparse: true,
  },
  course: {
    type: String,
    enum: [
      "BSCS-ST",
      "BSMSCS",
      "BSCS-NIS",
      "BSCS-CSE",
      "BSIET-GD",
      "BSIET-AD",
      "Others",
      "-",
    ],
    required: true,
    default: "-",
  },
  role: {
    type: String,
    enum: ["student", "labHead"],
    required: true,
    default: "student",
  },
});

const Account = mongoose.model("Account", accountSchema);

export default Account;
