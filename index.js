const logger = require('./helpers/logger.helpers')

const { io } = require('socket.io-client')
const socket = io(process.env.REMOTE_HOST)
const { exec, execSync } = require('child_process')

const me = process.env.NODE_ID
const cwd = []

socket.on('connect', () => {
  logger.info(`connected to ${process.env.REMOTE_HOST}`)
  socket.emit('warmup', { nodeId: me })
})

socket.on('error', (error) => {
  logger.error(error)
})

socket.on('task', (data) => {
  const { source, command } = data
  let cwp = command

  if (process.env.COMMAND_PREFIX) {
    cwp = `${process.env.COMMAND_PREFIX} "${command}"`
  }

  if (!cwd[source]) {
    cwd[source] = '/'
  }
  logger.info(`> task from ${source} - ${command}`)
  const payload = {
    command,
    source,
    cwd: execSync('pwd', { cwd: cwd[source] }).toString().trim(),
    time: new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  }
  if (command === '') {
    socket.emit('task_result', {
      ...payload,
      output: ''
    })
    return
  }
  exec(cwp, { cwd: cwd[source] }, (error, stdout, stderr) => {
    if (error) {
      logger.error(`error: ${error.message}`)
      socket.emit('task_result', {
        ...payload,
        output: error.message
      })
      return
    } else if (stderr) {
      logger.error(`stderr: ${stderr}`)
      socket.emit('task_result', {
        ...payload,
        output: stderr
      })
      return
    } else {
      const cmd = command.split(' ')
      if (cmd[0] === 'cd') {
        if (cmd[1][0] === '/') {
          cwd[source] = cmd[1]
        } else {
          cwd[source] += `/${cmd[1]}`
        }
        payload.cwd = execSync('pwd', { cwd: cwd[source] }).toString().trim()
      }
    }
    socket.emit('task_result', {
      ...payload,
      output: stdout
    })
  })
})
