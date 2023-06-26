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

socket.on('task', (data) => {
  const { source, command } = data
  if (!cwd[source]) {
    cwd[source] = '/'
  }
  logger.info(`> task from ${source} - ${command}`)
  const payload = {
    command,
    source,
    cwd: execSync('pwd', { cwd: cwd[source] }).toString().trim(),
    time: new Date().toLocaleTimeString()
  }
  if (command === '') {
    socket.emit('task_result', {
      ...payload,
      output: ''
    })
    return
  }
  exec(command, { cwd: cwd[source] }, (error, stdout, stderr) => {
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
      }
    }
    socket.emit('task_result', {
      ...payload,
      output: stdout
    })
  })
})
