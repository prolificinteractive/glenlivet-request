var url = require('url');
var glenlivet = require('glenlivet');
var request = require('request');
var Q = require('q');
var _ = require('lodash');

var bodyFilters = {
  'json': function (body) {
    return JSON.parse(body);
  },
  'html': function (body) {
    return body;
  }
};

function getBodyFilteredByType(response, type) {
  var body = response.body;
  var filter = bodyFilters[type];

  if (filter) {
    return filter(body);
  } else {
    return body;
  }
}

module.exports = glenlivet.createPlugin('request', function (optionsResolver) {
  this.middleware({
    'setup:request': function (data, next, abort) {
      var options = {};

      data.request = {
        options: options
      };

      function recurse(object) {
        var result = {};
        var promises = [];

        // Run through each key and resolve the value
        _.each(object, function (v, k) {
          var promise;

          // Functions are fed the bottle's input data and resolved asynchronously
          if (_.isFunction(v)) {
            promise = Q(v(data));

            promise.then(function (_v) {
              result[k] = _v;
            });
          }

          // Objects are resolved recursively
          else if (_.isObject(v) && !_.isArray(v)) {
            promise = recurse(v).then(function (_v) {
              result[k] = _v;
            });
          }

          // Constants and arrays are directly assigned
          else {
            result[k] = v;
          }

          if (promise) {
            promises.push(promise);
          }
        });

        return Q.all(promises).then(function () {
          return result;
        });
      }

      if (_.isString(optionsResolver)) {
        options.uri = optionsResolver;
        next();
      } else {
        recurse(optionsResolver).done(function (_options) {
          //In absence of uri option, try to resolve using any URL object properties
          if (!_options.uri) {
            _options.uri = url.format({
              host: _options.host,
              hostname: _options.host,
              protocol: _options.protocol,
              path: _options.path,
              pathname: _options.pathname,
              port: _options.port
            });
          }

          _.extend(options, _options);

          next();
        }, function (err) {
          abort(err);
        });
      }
    },

    'process:request': function (data, next, abort) {
      request(data.request.options, function (err, response, body) {
        if (err) {
          return abort(err);
        }

        var type = response.caseless.dict['content-type'].split(';')[0].split('/').pop();

        data[type] = getBodyFilteredByType(response, type);
        data.request.error = err;
        data.request.response = response;
        data.request.body = body;

        next();
      });
    }
  });
});
