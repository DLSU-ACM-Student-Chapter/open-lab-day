import 'dotenv/config';
import { deactivateCode, labList } from './labcodes.js';

if (process.env.LAB_HEARTBEAT <= process.env.COUNTDOWN) {
    throw new Error('HEARTBEAT must be greater than COUNTDOWN.');
}

const heartbeat = parseInt(process.env.LAB_HEARTBEAT);
const timer = {};

labList.forEach(lab => {
    timer[lab] = null;
});
timer['KEYNOTE'] = null;

const activateTime = (lab) => {
    return setTimeout(deactivateCode, heartbeat * 1000, lab);
} 

export default (lab) => {
    clearTimeout(timer[lab]);
    timer[lab] = activateTime(lab);
}