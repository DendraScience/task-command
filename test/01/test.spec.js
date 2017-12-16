/**
 * Main tests
 */

const mri = require('mri')

describe('Module', function () {
  let tc
  let command

  // Simple logging to an array
  const logEntries = []
  const logger = {
    log: (...args) => {
      logEntries.push([...args].join(' '))
    }
  }

  it('should import', function () {
    tc = require('../../dist')

    expect(tc).to.have.property('TaskCommand')
  })

  it('should create command with tasks', function () {
    const tasks = {
      execute (p) {
        return Promise.resolve('Execute_Root')
      },
      help (p) {
        return 'Help_Root'
      },
      tasks: {
        a: {
          execute (p) {
            return Promise.resolve('Execute_A')
          },
          help (p) {
            return 'Help_A'
          },
          tasks: {
            ab: {
              pre (p) {
                return Object.assign({
                  extra: 'extra'
                }, p)
              },
              check (p) {
                if (typeof p.num !== 'number') throw new Error('Not a number')
                return true
              },
              beforeExecute (p) {
                p.extra = 'extra2'
              },
              execute (p) {
                return Promise.resolve('Execute_AB')
              },
              afterExecute (p, res) {
                return `${res}_X`
              },
              format (p, res) {
                return `${res}_Y`
              },
              help (p) {
                return 'Help_AB'
              }
            }
          }
        },
        b: {
          execute (p) {
            return Promise.resolve('Execute_B')
          },
          help (p) {
            return 'Help_B'
          },
          tasks (p, arg) {
            return {
              pre (p) {
                return Object.assign({
                  extra: 'extra'
                }, p)
              },
              check (p) {
                if (typeof p.num !== 'number') throw new Error('Not a number')
                return true
              },
              beforeExecute (p) {
                p.extra = 'extra2'
              },
              execute (p) {
                return Promise.resolve(`Execute_B${arg}`)
              },
              afterExecute (p, res) {
                return `${res}_X`
              },
              format (p, res) {
                return `${res}_Y`
              },
              help (p) {
                return `Help_B${arg}`
              }
            }
          }
        }
      }
    }

    tc.configure({
      logger: logger
    })

    command = new tc.TaskCommand(tasks)
  })

  it('should call help for: help', function () {
    return command.eval(['help']).then(state => {
      expect(state.task).to.have.property('root', true)
      expect(state.output).to.equal('Help_Root')
    })
  })

  it('should call help for: help a', function () {
    return command.eval(['help', 'a']).then(state => {
      expect(state.task).to.have.property('arg', 'a')
      expect(state.output).to.equal('Help_A')
    })
  })

  it('should call help for: help a ab', function () {
    return command.eval(['help', 'a', 'ab']).then(state => {
      expect(state.task).to.have.property('arg', 'ab')
      expect(state.output).to.equal('Help_AB')
    })
  })

  it('should call help for: a help ab', function () {
    return command.eval(['a', 'help', 'ab']).then(state => {
      expect(state.task).to.have.property('arg', 'ab')
      expect(state.output).to.equal('Help_AB')
    })
  })

  it('should call help for: a ab help', function () {
    return command.eval(['a', 'ab', 'help']).then(state => {
      expect(state.task).to.have.property('arg', 'ab')
      expect(state.output).to.equal('Help_AB')
    })
  })

  it('should call help for: help b', function () {
    return command.eval(['help', 'b']).then(state => {
      expect(state.task).to.have.property('arg', 'b')
      expect(state.output).to.equal('Help_B')
    })
  })

  it('should call help for: help b zz', function () {
    return command.eval(['help', 'b', 'zz']).then(state => {
      expect(state.task).to.have.property('arg', 'zz')
      expect(state.output).to.equal('Help_Bzz')
    })
  })

  it('should call help for: b help zz', function () {
    return command.eval(['b', 'help', 'zz']).then(state => {
      expect(state.task).to.have.property('arg', 'zz')
      expect(state.output).to.equal('Help_Bzz')
    })
  })

  it('should call help for: b zz help', function () {
    return command.eval(['b', 'zz', 'help']).then(state => {
      expect(state.task).to.have.property('arg', 'zz')
      expect(state.output).to.equal('Help_Bzz')
    })
  })

  it('should run task: root', function () {
    return command.eval().then(state => {
      expect(state.task).to.have.property('root', true)
      expect(state.result).to.equal('Execute_Root')
      expect(state.output).to.equal('Execute_Root')
    })
  })

  it('should run task: root with options', function () {
    return command.eval({_: [], opt: 'opt'}).then(state => {
      expect(state.task).to.have.property('root', true)
      expect(state.parsed).to.have.property('opt', 'opt')
      expect(state.result).to.equal('Execute_Root')
      expect(state.output).to.equal('Execute_Root')
    })
  })

  it('should run task: a', function () {
    return command.eval({_: ['a']}).then(state => {
      expect(state.task).to.have.property('arg', 'a')
      expect(state.result).to.equal('Execute_A')
      expect(state.output).to.equal('Execute_A')
    })
  })

  it('should run task: ab with options', function () {
    return command.eval({_: ['a', 'ab'], num: 12}).then(state => {
      expect(state.task).to.have.property('arg', 'ab')
      expect(state.parsed).to.have.property('extra', 'extra2')
      expect(state.result).to.equal('Execute_AB_X')
      expect(state.output).to.equal('Execute_AB_X_Y')
    })
  })

  it('should fail to run task: ab with options', function () {
    let retErr
    let retState

    return command.eval({_: ['a', 'ab'], num: 'num'}).then(state => {
      retState = state
    }).catch(err => {
      retErr = err
    }).then(() => {
      expect(retState).to.be.undefined
      expect(retErr).to.have.property('message', 'Not a number')
    })
  })

  it('should run task: b', function () {
    return command.eval({_: ['b']}).then(state => {
      expect(state.task).to.have.property('arg', 'b')
      expect(state.result).to.equal('Execute_B')
      expect(state.output).to.equal('Execute_B')
    })
  })

  it('should run task: zz with options', function () {
    return command.eval({_: ['b', 'zz'], num: 12}).then(state => {
      expect(state.task).to.have.property('arg', 'zz')
      expect(state.parsed).to.have.property('extra', 'extra2')
      expect(state.result).to.equal('Execute_Bzz_X')
      expect(state.output).to.equal('Execute_Bzz_X_Y')
    })
  })

  it('should fail to run task: zz with options', function () {
    let retErr
    let retState

    return command.eval({_: ['b', 'zz'], num: 'num'}).then(state => {
      retState = state
    }).catch(err => {
      retErr = err
    }).then(() => {
      expect(retState).to.be.undefined
      expect(retErr).to.have.property('message', 'Not a number')
    })
  })

  it('should run task using mri', function () {
    return command.eval(mri(['a', 'ab', '--num=12'])).then(state => {
      expect(state.task).to.have.property('arg', 'ab')
      expect(state.parsed).to.have.property('extra', 'extra2')
      expect(state.result).to.equal('Execute_AB_X')
      expect(state.output).to.equal('Execute_AB_X_Y')
    })
  })

  it('should log all activity', function () {
    expect(logEntries).to.have.lengthOf(71)
  })
})
