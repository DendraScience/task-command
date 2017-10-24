/**
 * Utility class to execute an async task from parsed options.
 *
 * @author J. Scott Smith
 * @license BSD-2-Clause-FreeBSD
 * @module task-command
 */

let nextId = 1 // Next identifier for each TaskCommmand instance

// Local logger that can be redirected
const logger = {}

function noLog () {}

export function configure (options) {
  if (typeof options !== 'object') return
  if (typeof options.logger === 'object' || options.logger === false) {
    ['error', 'log', 'time', 'timeEnd', 'warn'].forEach(k => { logger[k] = (options.logger && options.logger[k]) || noLog })
  }
}

// Initial configuration
configure({
  logger: false
})

export class TaskCommand {
  constructor (tasks, options) {
    this.id = nextId++
    this.numRunning = 0
    // Not implemented
    // this.options = Object.assign({
    // }, options)
    this.tasks = tasks
  }

  /**
   * Cancel processing immediately and clean up.
   */
  destroy () {
    logger.log(`TaskCommmand(${this.id})#destroy`)

    this.destroyed = true
    this.tasks = null
  }

  get isRunning () { return this.numRunning > 0 }

  /**
   * Begin a task or call help based on the given raw or parsed arguments.
   */
  eval (input) {
    const parsed = Array.isArray(input) ? {_: input} : (input || {_: []})
    const args = parsed._
    const tasks = [Object.assign({
      root: true,
      tasks: {}
    }, this.tasks)]

    let callHelp

    logger.log(`TaskCommmand(${this.id})#eval::input`, input)

    args && args.forEach(arg => {
      if (arg === 'help') {
        callHelp = true
        logger.log(`TaskCommmand(${this.id})#eval::callHelp`, callHelp)
      } else {
        const last = tasks[tasks.length - 1]
        const sub = last.tasks && last.tasks[arg]

        if (sub) {
          logger.log(`TaskCommmand(${this.id})#eval:match::arg`, arg)

          tasks.push(Object.assign({
            arg,
            root: false,
            tasks: {}
          }, sub))
        }
      }
    })

    // Coalesce task properties
    const task = Object.assign({}, ...tasks)
    const parsed2 = Object.assign({}, parsed, {
      _sliced: parsed._.slice(tasks.length - (callHelp ? 0 : 1))
    })

    if (!callHelp && typeof task.execute === 'function') return this.run(task, parsed2)
    if (typeof task.help === 'function') return this.help(task, parsed2)

    logger.error(`TaskCommmand(${this.id})#eval:invalid`)

    return Promise.reject(new Error(`Not a recognized command: '${args[0]}'`))
  }

  /**
   * Call help for a task, passing parsed command line arguments.
   */
  help (task, parsed) {
    logger.log(`TaskCommmand(${this.id})#help::task,parsed`, task, parsed)

    return Promise.resolve().then(() => {
      if (this.destroyed) throw new Error('Command destroyed')

      return {
        task,
        parsed,
        // Formatted output
        output: task.help(parsed)
      }
    })
  }

  /**
   * Begin processing a task, passing parsed command line arguments.
   */
  run (task, parsed) {
    logger.log(`TaskCommmand(${this.id})#run::task,parsed`, task, parsed)

    return Promise.resolve().then(() => {
      if (this.destroyed) throw new Error('Command destroyed')

      this.numRunning++

      // Prepare arguments
      if (typeof task.pre === 'function') parsed = task.pre(parsed)
      // Evaluate check condition
      if ((typeof task.check === 'function') && !task.check(parsed)) throw new Error('Invalid arguments')
      // Optional beforeExecute hook
      if (typeof task.beforeExecute === 'function') task.beforeExecute(parsed)

      return task.execute(parsed)
    }).then(res => {
      // Process results
      if (typeof task.afterExecute === 'function') res = task.afterExecute(parsed, res)

      return {
        task,
        parsed,
        result: res,
        // Formatted output
        output: res && (typeof task.format === 'function') ? task.format(parsed, res) : res
      }
    }).finally(() => {
      this.numRunning--
    })
  }
}
