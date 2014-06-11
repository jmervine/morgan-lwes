
var http    = require('http');
var morgan  = require('..');
var assert  = require('assert');
var request = require('supertest');

var lastEmit;

describe('logger()', function () {
    describe('compile()', function () {
        it('should compile', function () {
            var compiled = morgan._compile([ ':request']).toString();
            var expected = "function anonymous(tokens, req, res) {\nreturn {\"request\": tokens[\"request\"](req, res, \"undefined\") || \"-\",};\n}";
            assert.equal(compiled, expected);
        });
    });

    describe('arguments', function () {
        it('should accept format as function', function (done) {
            var expected = { method: 'GET', url: '/', status: '200' };

            var message = null;
            var server = createServer(function (tokens, req, res) {
                message = { method: req.method, url: req.url, status: res.statusCode };
            });

            request(server).get('/').end(function (err, res) {
                if (err) return done(err)
                assert.deepEqual(message, expected);
                done()
            });
        });

        it('should use default format', function (done) {
            var expected_keys = [ 'remote_addr', 'date', 'method', 'url', 'http_version',
                             'status', 'response_content_length', 'referrer',
                             'user_agent', 'response_time' ];

            var server = createServer({});

            request(server).get('/').end(function (err, res) {
                if (err) {
                    return done(err, res);
                }

                assert.deepEqual(Object.keys(lastEmit), expected_keys);
                assert.equal(lastEmit.remote_addr, '127.0.0.1');
                assert.equal(lastEmit.method, 'GET');
                done();
            });
        });
    });

    describe('tokens', function () {
        describe(':request', function () {
            it('should get request properties', function (done) {
                var server = createServer({
                    format: [ ':request[x-from-string]' ]
                });

                request(server)
                .get('/')
                .set('x-from-string', 'me')
                .end(function (err, res) {
                    if (err) return done(err);
                    assert(lastEmit, 'me\n');
                    done();
                })
            })
        });

        describe(':response', function () {
            it('should get response properties', function (done) {
                var server = createServer({
                    format: [ ':response[x-sent]' ]
                });

                request(server)
                .get('/')
                .end(function (err, res) {
                    if (err) return done(err);
                    assert(lastEmit, 'true\n');
                    done();
                })
            })
        });

        describe(':remote-addr', function () {
            it('should get remote address', function (done) {
                var server = createServer({
                    format: [ ':remote-addr' ]
                });

                request(server)
                .get('/')
                .end(function (err, res) {
                    if (err) return done(err);
                    assert.equal(lastEmit.remote_addr, res.text);
                    done();
                })
            })

            it('should use req.ip if there', function (done) {
                var server = createServer({format: [':remote-addr']}, function (req) {
                    req.ip = '10.0.0.1';
                })

                request(server)
                .get('/')
                .end(function (err, res) {
                    if (err) return done(err);
                    assert.equal(lastEmit.remote_addr, '10.0.0.1');
                    done();
                })
            })

            it('should work on https server', function (done) {
                var fs = require('fs');
                var https = require('https');
                var cert = fs.readFileSync(__dirname + '/fixtures/server.crt', 'ascii');
                var logger = createLogger({format: [':remote-addr']});
                var server = https.createServer({
                    key: fs.readFileSync(__dirname + '/fixtures/server.key', 'ascii'),
                    cert: cert
                });

                server.on('request', function (req, res) {
                    logger(req, res, function (err) {
                        delete req._remoteAddress;
                        res.end(req.connection.remoteAddress);
                    })
                });

                var agent = new https.Agent({ca: cert});
                var createConnection = agent.createConnection;

                agent.createConnection = function (options) {
                    options.servername = 'morgan.local';
                    return createConnection.call(this, options);
                };

                var req = request(server).get('/');
                req.agent(agent);
                req.end(function (err, res) {
                    if (err) return done(err);
                    assert.equal(lastEmit.remote_addr, res.text);
                    done();
                });
            });

            it('should work when connection: close', function (done) {
                var server = createServer({format: [':remote-addr']});

                request(server)
                .get('/')
                .set('Connection', 'close')
                .end(function (err, res) {
                    if (err) return done(err);
                    assert.equal(lastEmit.remote_addr, res.text);
                    done();
                });
            });

            it('should work when connection: keep-alive', function (done) {
                var server = createServer({format: [':remote-addr']}, function (req) {
                    delete req._remoteAddress;
                })

                request(server)
                .get('/')
                .set('Connection', 'keep-alive')
                .end(function (err, res) {
                    if (err) return done(err);
                    assert.equal(lastEmit.remote_addr, res.text);
                    done();
                });
            });

            it('should not fail if req.connection missing', function (done) {
                var server = createServer({format: [':remote-addr']}, function (req) {
                    delete req.connection;
                    delete req._remoteAddress;
                });

                request(server)
                .get('/')
                .set('Connection', 'keep-alive')
                .end(function (err, res) {
                    if (err) return done(err);
                    assert.equal(lastEmit.remote_addr, res.text);
                    done();
                });
            });
        });

        describe(':response-time', function () {
            it('should be in milliseconds', function (done) {
                var start = Date.now();
                var server = createServer({format: [':response-time']});

                request(server)
                .get('/')
                .end(function (err, res) {
                    if (err) return done(err);
                    var end = Date.now();
                    var ms = parseFloat(lastEmit.response_time);

                    assert(ms >= 0, 'expected ms >= 0');

                    var n = (end - start + 1);
                    assert(ms <= n, 'expected ms <= ' + n);
                    done();
                });
            });

            it('should be empty without hidden property', function (done) {
                var server = createServer({format: [':response-time']}, function (req) {
                    delete req._startAt;
                });

                request(server)
                .get('/')
                .end(function (err, res) {
                    if (err) return done(err);
                    assert.equal(lastEmit.response_time, '-');
                    done();
                });
            });

            it('should be empty before response', function (done) {
                var server = createServer({
                    format: [':response-time'],
                    immediate: true
                });

                request(server)
                .get('/')
                .end(function (err, res) {
                    if (err) return done(err);
                    assert.equal(lastEmit.response_time, '-');
                    done();
                });
            });
        });

        describe(':status', function () {
            it('should get response status', function (done) {
                var server = createServer({
                    format: [':status']
                });

                request(server)
                .get('/')
                .end(function (err, res) {
                    if (err) return done(err);
                    assert.equal(lastEmit.status, res.statusCode);
                    done();
                });
            });

            it('should not exist before response sent', function (done) {
                var server = createServer({
                    format: [':status'],
                    immediate: true
                });

                request(server)
                .get('/')
                .end(function (err, res) {
                    if (err) return done(err);
                    assert.equal(lastEmit.status, '-');
                    done();
                });
            });
        });
    });

    describe('formats', function () {
        describe('default', function () {
            it('should match expectations', function (done) {
                var expected_keys = [ 'remote_addr', 'date', 'method', 'url', 'http_version',
                                 'status', 'response_content_length', 'referrer',
                                 'user_agent', 'response_time' ];

                var server = createServer({format: 'default'});

                request(server).get('/').end(function (err, res) {
                    if (err) {
                        return done(err, res);
                    }

                    assert.deepEqual(Object.keys(lastEmit), expected_keys);
                    done();
                });
            });
        });

        describe('short', function () {
            it('should match expectations', function (done) {
                var expected_keys = [ 'remote_addr', 'method', 'url', 'http_version',
                                 'status', 'response_content_length', 'response_time' ];

                var server = createServer({format: 'short'});

                request(server).get('/').end(function (err, res) {
                    if (err) {
                        return done(err, res);
                    }

                    assert.deepEqual(Object.keys(lastEmit), expected_keys);
                    done();
                });
            });
        });

        describe('tiny', function () {
            it('should match expectations', function (done) {
                var expected_keys = [ 'method', 'url', 'status', 'response_content_length',
                                      'response_time' ];

                var server = createServer({format: 'tiny'});

                request(server).get('/').end(function (err, res) {
                    if (err) {
                        return done(err, res);
                    }

                    assert.deepEqual(Object.keys(lastEmit), expected_keys);
                    done();
                });
            });
        });
    });

    describe('with immediate option', function () {
        it('should log before response', function (done) {
            var server = createServer({
                format: [':method', ':url', ':response[x-sent]'],
                immediate: true
            });

            var expected = {
                method: 'GET',
                url: '/',
                response_x_sent: '-'
            };

            request(server)
            .get('/')
            .end(function (err, res) {
                if (err) return done(err);
                assert.deepEqual(lastEmit, expected);
                done();
            });
        });
    });

    describe('with skip option', function () {
        it('should be able to skip based on request', function (done) {
            function skip(req) {
                return ~req.url.indexOf('skip=true');
            };

            var server = createServer({'format': 'default', 'skip': skip});

            request(server)
            .get('/?skip=true')
            .set('Connection', 'close')
            .end(function (err, res) {
                if (err) return done(err);
                assert(!lastEmit);
                done();
            });
        });

        it('should be able to skip based on response', function (done) {
            function skip(req, res) { return res.statusCode === 200 }

            var server = createServer({'format': 'default', 'skip': skip})

            request(server)
            .get('/')
            .end(function (err, res) {
                if (err) return done(err);
                assert(!lastEmit);
                done();
            });
        });
    });
});

function createLogger(opts) {
    var options = opts || {};

    if (typeof options === 'object' && !options.emitter) {
        options.emitter = {
            emit: function emit(message) {
                lastEmit = message;
            }
        };
        lastEmit = null;
    }

  return morgan(options)
}

function createServer(opts, fn) {
    var logger = createLogger(opts);
    return http.createServer(function onRequest(req, res) {
        logger(req, res, function onNext(err) {
            if (fn) {
                // allow req, res alterations
                fn(req, res);
            }

            if (err) {
                res.statusCode = 500;
                res.end(err.message);
            }

            res.setHeader('X-Sent', 'true');
            res.end((req.connection && req.connection.remoteAddress) || '-');
        });
    });
}

