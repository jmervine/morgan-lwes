# morgan-lwes [![NPM version](https://badge.fury.io/js/morgan-lwes.svg)](http://badge.fury.io/js/morgan-lwes) [![Build Status](https://travis-ci.org/jmervine/morgan-lwes.svg)](https://travis-ci.org/jmervine/morgan-lwes)

Logging middleware for node.js http apps, which emits [LWES](http://www.lwes.org) events instead of logging to disk.

> Based on as forked from [morgan](https://www.npmjs.org/package/morgan).

## API

```js
var express = require('express');
var morgan  = require('morgan-lwes');

var app = express();
app.use(morgan());
```

### morgan(options)

Morgan may be passed options to configure the tokens which are emitted. The options may be passed as a predefined list of tokens, token list, or function.

```js
morgan() // default
morgan('short')
morgan('tiny')
morgan({ format: 'short', immediate: true })
morgan([':method', ':url', ':referrer'])
morgan([':request[content-type]', ':response[content-type]'])
morgan(function(tokens, req, res){ return { data: 'some format string', status: res.statusCode } });
morgan({ format: 'tiny', skip: function(req, res){ return res.statusCode === 304; }});
```

#### Predefined Formats

- `default` - Standard output.
- `short` - Shorter than default, also including response time.
- `tiny` - The minimal.

#### Options

Morgan accepts these properties in the options object.

- `format`    - Format string or Setting, see below for format tokens.
- `emitter`   - Custom emitter, defaults to built in emitter. (Mostly for testing.)
- `lwes`      - Object containing lwes configurations for `new liblwes.Emitter(...)`.
    - `type`    - Emitted `type` field, default `MorganLWES::Logger`.
    - `address` - Address to emit on, default `127.0.0.1`.
    - `port`    - Port to emit on, defaults to `1111`.
    - `esf`     - Path on disk to ESF file, defaults to `undefined`.
- `immediate` - Write log line on request instead of response (for response times).
- `skip`      - Function to determine if logging is skipped, called as `skip(req, res)`, defaults to `false`.

All default formats are defined this way, however the api is also public:
```js
morgan.format('name', 'array or function')
```

#### Tokens

- `:request[header]` ex: `:request[Accept]`
- `:response[header]` ex: `:response[Content-Length]`
- `:http-version`
- `:response-time`
- `:remote-addr`
- `:date`
- `:method`
- `:url`
- `:referrer`
- `:user-agent`
- `:status`

To define a token, simply invoke `morgan.token()` with the name and a callback function. The value returned is then available as ":type" in this case:
```js
morgan.token('type', function(req, res){ return req.headers['content-type']; })
```


## License

The MIT License (MIT)

Copyright (c) 2014 Joshua P. Mervine <joshua@mervine.net>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

