'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TaskCommand = undefined;

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

exports.configure = configure;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Utility class to execute an async task from parsed options.
 *
 * @author J. Scott Smith
 * @license BSD-2-Clause-FreeBSD
 * @module task-command
 */

var nextId = 1; // Next identifier for each TaskCommmand instance

// Local logger that can be redirected
var logger = {};

function noLog() {}

function configure(options) {
  if ((typeof options === 'undefined' ? 'undefined' : (0, _typeof3.default)(options)) !== 'object') return;
  if ((0, _typeof3.default)(options.logger) === 'object' || options.logger === false) {
    ['error', 'log', 'time', 'timeEnd', 'warn'].forEach(function (k) {
      logger[k] = options.logger && options.logger[k] || noLog;
    });
  }
}

// Initial configuration
configure({
  logger: false
});

var TaskCommand = exports.TaskCommand = function () {
  function TaskCommand(tasks, options) {
    (0, _classCallCheck3.default)(this, TaskCommand);

    this.id = nextId++;
    this.numRunning = 0;
    // Not implemented
    // this.options = Object.assign({
    // }, options)
    this.tasks = tasks;
  }

  /**
   * Cancel processing immediately and clean up.
   */


  (0, _createClass3.default)(TaskCommand, [{
    key: 'destroy',
    value: function destroy() {
      logger.log('TaskCommmand(' + this.id + ')#destroy');

      this.destroyed = true;
      this.tasks = null;
    }
  }, {
    key: 'eval',


    /**
     * Begin a task or call help based on the given raw or parsed arguments.
     */
    value: function _eval(input) {
      var _this = this;

      var parsed = Array.isArray(input) ? { _: input } : input || { _: [] };
      var args = parsed._;
      var tasks = [(0, _assign2.default)({
        root: true,
        tasks: {}
      }, typeof this.tasks === 'function' ? this.tasks(parsed) : this.tasks)];

      var callHelp = void 0;

      logger.log('TaskCommmand(' + this.id + ')#eval::input', input);

      args && args.forEach(function (arg) {
        if (arg === 'help') {
          callHelp = true;
          logger.log('TaskCommmand(' + _this.id + ')#eval::callHelp', callHelp);
        } else {
          var last = tasks[tasks.length - 1];
          var lastTasks = last.tasks;
          var sub = lastTasks && (typeof lastTasks === 'function' ? lastTasks(parsed, arg) : lastTasks[arg]);

          if (sub) {
            logger.log('TaskCommmand(' + _this.id + ')#eval:match::arg', arg);

            tasks.push((0, _assign2.default)({
              arg: arg,
              root: false,
              tasks: {}
            }, sub));
          }
        }
      });

      // Coalesce task properties
      var task = _assign2.default.apply(Object, [{}].concat(tasks));
      var parsed2 = (0, _assign2.default)({}, parsed, {
        _sliced: parsed._.slice(tasks.length - (callHelp ? 0 : 1))
      });

      if (!callHelp && typeof task.execute === 'function') return this.run(task, parsed2);
      if (typeof task.help === 'function') return this.help(task, parsed2);

      logger.error('TaskCommmand(' + this.id + ')#eval:invalid');

      return _promise2.default.reject(new Error('Not a recognized command: \'' + args[0] + '\''));
    }

    /**
     * Call help for a task, passing parsed command line arguments.
     */

  }, {
    key: 'help',
    value: function help(task, parsed) {
      var _this2 = this;

      logger.log('TaskCommmand(' + this.id + ')#help::task,parsed', task, parsed);

      return _promise2.default.resolve().then(function () {
        if (_this2.destroyed) throw new Error('Command destroyed');

        return {
          task: task,
          parsed: parsed,
          // Formatted output
          output: task.help(parsed)
        };
      });
    }

    /**
     * Begin processing a task, passing parsed command line arguments.
     */

  }, {
    key: 'run',
    value: function run(task, parsed) {
      var _this3 = this;

      logger.log('TaskCommmand(' + this.id + ')#run::task,parsed', task, parsed);

      return _promise2.default.resolve().then(function () {
        if (_this3.destroyed) throw new Error('Command destroyed');

        _this3.numRunning++;

        // Prepare arguments
        if (typeof task.pre === 'function') parsed = task.pre(parsed);
        // Evaluate check condition
        if (typeof task.check === 'function' && !task.check(parsed)) throw new Error('Invalid arguments');
        // Optional beforeExecute hook
        if (typeof task.beforeExecute === 'function') task.beforeExecute(parsed);

        return task.execute(parsed);
      }).then(function (res) {
        // Process results
        if (typeof task.afterExecute === 'function') res = task.afterExecute(parsed, res);

        return {
          task: task,
          parsed: parsed,
          result: res,
          // Formatted output
          output: res && typeof task.format === 'function' ? task.format(parsed, res) : res
        };
      }).finally(function () {
        _this3.numRunning--;
      });
    }
  }, {
    key: 'isRunning',
    get: function get() {
      return this.numRunning > 0;
    }
  }]);
  return TaskCommand;
}();