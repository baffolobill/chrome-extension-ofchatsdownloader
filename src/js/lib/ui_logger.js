/**
 * @name UILogger 
 * @param {Object} optionsParam. Object holding the options we want to override.
 * Accepted properties are:
 * 		- panelClasses: {String} Extra CSS classes applied to the {UILoggerPanel} instance. By default: "". The class "ui-logger-panel" is always applied.
 * 		- messageClasses: {String} Extra CSS classes applied to the {UILoggerMessage} instances. By default: "". The class "ui-logger-message" is always applied.
 * @returns {UILogger} A fresh {UILogger} instance.
 * @description This method instantiates and return a {UILogger} instance.
 * The {UILogger} instances have these public properties and methods:
 * 		- _: {Object} holds internal data needed, but available to check. It has the HTMLElement of the {UILoggerPanel} of the current instance, for example.
 *		- log: {Function} method that receives a {String:message}, which will be logged by the {UILogger}.
 *		- show: {Function} method that makes the current {UILoggerPanel} appear.
 *		- hide: {Function} method that makes the current {UILoggerPanel} disappear (but still being alive).
 *		- close: {Function} method that removes the current {UILoggerPanel} from the DOM.
 */
export function UILogger(optionsParam = {}) {
  /**
   * @name UILoggerPanel
   * @private
   * @type {Function}
   * @returns {HTMLElement > UILoggerPanel} DOM element that is the panel where the logged message are going to appear.
   * @description This method simply generates the DOM element of the logger panel, where the messages are shown.
   * It also appends the element to the DOM, but it will not appear until we call the {UILogger}.show() method.
   */
  var UILoggerPanel = function () {
    var panel = document.getElementById(options.panelId);
    if (!panel) {
        panel = document.createElement("div");
        panel.id = options.panelId;
        panel.className = "ui-logger-panel " + options.panelClasses;
        panel.style.display = "none";
        if (options.containerId) {
            document.getElementById(options.containerId).prepend(panel);
        } else {
            document.body.appendChild(panel);
        }
    }
    return panel;
  };
  /**
   * @name UILoggerMessage
   * @private
   * @type {Function}
   * @param {String} msg. Message to be logged.
   * @param {Boolean} isHTML. Defaults to false. Set to true to enable HTML in the message.
   * @returns {HTMLElement > UILoggerMessage} DOM element that has the message to be logged.
   * @description This method simply generates the DOM element that holds the message to be logged.
   */
  var UILoggerMessage = function (msg, isHTML = false) {
    var message = document.createElement("div");
    if (!isHTML) {
      message.textContent = msg;
    } else {
      message.innerHTML = msg;
    }
    message.className = "ui-logger-message " + options.messageClasses;
    return message;
  };
  /**
   * @name options
   * @private
   * @type {Object}
   * @description
   */
  var options = Object.assign({
    containerId: null,
    panelId: "id_ui-logger",
    panelClasses: "",
    messageClasses: ""
  }, optionsParam);

  var logger = this;
  /**
   * @name {UILogger}._
   * @type {Object}
   * @description This object holds the internal state of the current logger. Right now, it only holds the HTMLElement of the {UILoggerPanel}.
   */
  logger._ = {};
  logger._.panel = new UILoggerPanel();
  /**
   * @name {UILogger}.log
   * @type {Function}
   * @param {String} msg. Message to be logged.
   * @returns {UILogger} In order to keep it chainable, it returns the logger itself.
   * @description Logs the provided message through the {UILoggerPanel}.
   */
  logger.log = function (msg) {
    var message = new UILoggerMessage(msg);
    logger._.panel.appendChild(message);
    logger._.panel.scrollTop = logger._.panel.scrollHeight;
    return logger;
  };
  /**
   * @name {UILogger}.show
   * @type {Function}
   * @returns {UILogger} In order to keep it chainable, it returns the logger itself.
   * @description Shows the {UILogger} instance. This is required in order to see the panel. Otherwise, the messages will be appended, but they will not appear in the window.
   */
  logger.show = function () {
    logger._.panel.style.display = "block";
    return logger;
  };
  /**
   * @name {UILogger}.hide
   * @type {Function}
   * @returns {UILogger} In order to keep it chainable, it returns the logger itself.
   * @description Hides the {UILogger} instance. It does not destroy it, it only applies "display: none" to its styles.
   */
  logger.hide = function () {
    logger._.panel.style.display = "none";
    return logger;
  };
  /**
   * @name {UILogger}.close
   * @type {Function}
   * @returns {Void} 
   * @description Destroys the {UILogger} instance. It removes the HTMLElement of the window.
   */
  logger.close = function () {
    logger._.panel.remove();
  };
  return logger;
};