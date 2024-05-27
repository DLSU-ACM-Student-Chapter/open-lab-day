import "dotenv/config";
export let time = parseInt(process.env.COUNTDOWN);
export let talkTime = parseInt(process.env.TALK_COUNTDOWN);
export const activateCode = (lab) => {
  labCodes[lab].activated = true;
};
export const deactivateCode = (lab) => {
  labCodes[lab].activated = false;
};
export const labList = [
  "ALTDSI",
  "BIOINFOM",
  "CAR",
  "CEHCI",
  "CELT",
  "CIVI",
  "CNIS",
  "COMET",
  "TE3DHOUSE",
  "GAMELAB",
];
export const getLab = (lab) => {
  if (lab == "TALK") {
    return Object.values(labCodes)
      .filter((lab) => lab.activated == true)
      .map((lab) => lab.talkCode);
  }
  return labCodes[lab];
};

const generateRandomCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const changeAllCodes = () => {
  labList.forEach((lab) => {
    labCodes[lab].code = generateRandomCode();
    labCodes[lab].talkCode = generateRandomCode();
  });

  labCodes["KEYNOTE"].talkCode = generateRandomCode();
};

const updateCountdown = () => {
  if (time > 1) {
    time--;
  } else {
    time = parseInt(process.env.COUNTDOWN);
    changeAllCodes();
  }
};

// construct labcodes
const labCodes = {};
labList.forEach((lab) => {
  labCodes[lab] = {
    code: generateRandomCode(),
    talkCode: generateRandomCode(),
    activated: false,
  };
  labCodes["KEYNOTE"] = {
    talkCode: generateRandomCode(),
    activated: false,
  };
});

// update timer
setInterval(updateCountdown, 1000);
