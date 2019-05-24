const winston = require('winston');
const path = require('path');
const { createLogger, format } = require('winston');
const { combine, timestamp, label, printf } = format;
const DailyRotateFile = require('winston-daily-rotate-file');
const config = require('config');
const version = config.get('debugMode');

const customFormat = winston.format.printf(i => {
  return `${i.level.toUpperCase()}: ${i.timestamp} ${i.message}`;
});

// Log unhandled exceptions to separate file
var exceptionHandlers = [
  new (DailyRotateFile)({
    name: 'Error Logs',
    filename: path.join(__dirname, './logs/exceptions-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '128m',
    maxFiles: '31d'
  })
]

const infoAndWarnFilter = winston.format((info, opts) => { 
  return info.level === 'info' || info.level === 'warn' ? info : false
})

const errorFilter = winston.format((info, opts) => { 
  return info.level === 'error' ? info : false 
})

// Separate warn/error 
var transports = [
  new (DailyRotateFile)({
    name: 'Error Logs',
    filename: path.join(__dirname, './logs/error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '128m',
    maxFiles: '31d',
    level: 'warn',
    json: true,
    colorize: false,
    format: winston.format.combine(
      errorFilter(),
      winston.format.timestamp(),
      customFormat
    )
  }),
  new (DailyRotateFile)({
    name: 'INFO logs',
    filename: path.join(__dirname, './logs/info-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '128m',
    maxFiles: '31d',
    json: true,
    colorize: false,
    level: 'info',
    format: winston.format.combine(
      infoAndWarnFilter(),
      winston.format.timestamp(),
      customFormat
    )
  }),
  new (winston.transports.Console)({    
    level: config.debugMode ? 'debug' : 'warn', // log warn level to console only
    handleExceptions: true,
    json: false,
    colorize: true,
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  })
]

var logger = winston.createLogger({
  transports: transports,
  exceptionHandlers: exceptionHandlers,
  level: config.debugMode ? 'debug' : 'info',
  exitOnError: false,
  // Default format
  format: winston.format.combine(
    winston.format.timestamp(),
    customFormat
  )
})

module.exports = logger;