import mongoose from "mongoose";

const checkListSchema = new mongoose.Schema({
  idNum: {
    type: String,
    required: true,
    unique: true,
  },
  labList: [
    {
      labName: {
        type: String,
        required: true,
      },
      visited: {
        type: Boolean,
        required: true,
        default: false,
      },
      visitTime: {
        type: Date,
      },
    },
  ],
});

const CheckLists = mongoose.model("Checklists", checkListSchema);

export default CheckLists;
