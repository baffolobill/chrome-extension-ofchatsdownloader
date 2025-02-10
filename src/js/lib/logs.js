import {
  UILogger
} from './ui_logger.js';


export function getLogger() {
    var logger = new UILogger({
      containerId: 'of-download-logs'
    });
    logger.show();
    document.getElementById('of-download-logs').classList.remove('d-none');

    return logger;
}

export function sendUILog(msg){
    var logger = getLogger();
    logger.log(msg);
}