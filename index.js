/*!
 * Morgan LWES | Express/Connect middleware logger using
 * liblwes emitter for output over process.(stdout|stderr)
 *
 * Based on and forked from Morgan | Connect - logger
 * - https://www.npmjs.org/package/morgan
 * - https://github.com/expressjs/morgan
 *
 * Copyright(c) 2014 Joshua P. Mervine
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var Emitter = require('liblwes').Emitter;

/**
 * Log requests with the given `options` or a `format` string.
 *
 * See README.md for documentation of options and formatting.
 *
 * @param {String|Function|Object} format or options
 * @return {Function} middleware
 * @api public
 */

exports = module.exports = function logger(options) {
  if (options && typeof options !== 'object') {
    options = { format: options };
  } else {
    options = options || {};
  }

  // output on request instead of response
  var immediate = options.immediate;

  // check if log entry should be skipped
  var skip = options.skip || function () { return false; };

  // format name
  var fmt = exports[options.format] || options.format || exports.default;

  // compile format
  if ('function' != typeof fmt) fmt = compile(fmt);

  // options

  var lwesOpts = options.lwes || {};

  // handle emitOpts default
  var emitType = 'MorganLWES::Logger';
  if (lwesOpts.type) {
      emitType = lwesOpts.type;
      delete lwesOpts.type;
  }

  lwesOpts.address = lwesOpts.address || '127.0.0.1';
  lwesOpts.port    = lwesOpts.port    || 1111;
  lwesOpts.ttl     = lwesOpts.ttl     || 3;

  // Mostly for testing, but can be used in passing an existing instance of
  // liblwes.Emitter
  var emitter = options.emitter || new Emitter(lwesOpts);

  return function logger(req, res, next) {
    req._startAt       = process.hrtime();
    req._startTime     = new Date;
    req._remoteAddress = req.connection && req.connection.remoteAddress;

    function logRequest(){
      res.removeListener('finish', logRequest);
      res.removeListener('close', logRequest);
      if (skip(req, res)) return;
      var message = fmt(exports, req, res);
      if (null == message) return;

      // deferring emit to nextTick has produced 50% more through put on
      // 'hello world' benchmarks.
      process.nextTick(function () {
          emitter.emit({
              type: emitType,
              attributes: message
          });
      });
    };

    // immediate
    if (immediate) {
      logRequest();
    // proxy end to output logging
    } else {
      res.on('finish', logRequest);
      res.on('close', logRequest);
    }

    next();
  };
};

/**
 * Compile `fmt` into a function.
 *
 * @param {String} fmt
 * @return {Function}
 * @api private
 */

function compile(values) {
    var js = 'return {';

    values.forEach(function(value) {
        js += value.replace(/:([-\w]{2,})(?:\[([^\]]+)\])?/g, function(_, name, arg) {
            var formattedName = name.replace('-', '_');

            if (arg) {
                formattedName += '_' + arg.replace('-', '_');
            }
            return '"' + formattedName + '": tokens["' + name + '"](req, res, "' + arg + '") || "-",';
        });
    });

    js += '};';

    return new Function('tokens, req, res', js);
};

// for testing
exports._compile = compile;

/**
 * Define a token function with the given `name`,
 * and callback `fn(req, res)`.
 *
 * @param {String} name
 * @param {Function} fn
 * @return {Object} exports for chaining
 * @api public
 */

exports.token = function(name, values) {
  exports[name] = values;
  return this;
};

/**
 * Define a `fmt` with the given `name`.
 *
 * @param {String} name
 * @param {Array|Function} fmt
 * @return {Object} exports for chaining
 * @api public
 */

exports.format = function(name, fmt){
  exports[name] = fmt;
  return this;
};

/**
 * Default format.
 */

exports.format('default', [ ':remote-addr', ':date', ':method', ':url', ':http-version', ':status', ':response[content-length]', ':referrer', ':user-agent', ':response-time' ])

/**
 * Short format.
 */

exports.format('short', [ ':remote-addr', ':method', ':url', ':http-version', ':status', ':response[content-length]', ':response-time' ])

/**
 * Tiny format.
 */

exports.format('tiny', [ ':method', ':url', ':status', ':response[content-length]', ':response-time' ])

/**
 * request url
 */

exports.token('url', function(req){
  return req.originalUrl || req.url;
});

/**
 * request method
 */

exports.token('method', function(req){
  return req.method;
});

/**
 * response time in milliseconds
 */

exports.token('response-time', function(req, res){
  if (!res._header || !req._startAt) return '';
  var diff = process.hrtime(req._startAt);
  var ms = diff[0] * 1e3 + diff[1] * 1e-6;
  return ms.toFixed(3);
});

/**
 * UTC date
 */

exports.token('date', function(){
  return new Date().toUTCString();
});

/**
 * response status code
 */

exports.token('status', function(req, res){
  return res._header ? res.statusCode : null;
});

/**
 * normalized referrer
 */

exports.token('referrer', function(req){
  return req.headers['referer'] || req.headers['referrer'];
});

/**
 * remote address
 */

exports.token('remote-addr', function(req){
  if (req.ip) return req.ip;
  if (req._remoteAddress) return req._remoteAddress;
  if (req.connection) return req.connection.remoteAddress;
  return undefined;
});

/**
 * HTTP version
 */

exports.token('http-version', function(req){
  return req.httpVersionMajor + '.' + req.httpVersionMinor;
});

/**
 * UA string
 */

exports.token('user-agent', function(req){
  return req.headers['user-agent'];
});

/**
 * request header
 */

exports.token('request', function(req, res, field){
  return req.headers[field.toLowerCase()];
});

/**
 * response header
 */

exports.token('response', function(req, res, field){
  return (res._headers || {})[field.toLowerCase()];
});

