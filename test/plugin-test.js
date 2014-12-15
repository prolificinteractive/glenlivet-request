var http = require('http');
var express = require('express');
var glenlivet = require('glenlivet');
var plugin = require('../index');

describe('glenlivet-request plugin', function () {
  describe('dynamic options', function () {
    var TEST_URI = 'http://prolificinteractive.com';
    var TEST_COOKIE = 'foo=bar';

    it('resolves constant values as-is', function (done) {
      glenlivet
        .createBottle({
          request: {
            uri: TEST_URI,
            someArray: [99],
            nullVal: null
          }
        })
        .plugins([plugin])
        .middleware({
          'before process:request': function (data, next, abort) {
            data.request.options.uri.should.equal(TEST_URI);
            data.request.options.someArray[0].should.equal(99);
            (null === data.request.options.nullVal).should.equal(true);
            done();
            abort();
          }
        })
        .serve();
    });

    it('resolves functions by assigning return value', function (done) {
      glenlivet
        .createBottle({
          request: {
            uri: function () {
              return TEST_URI;
            }
          }
        })
        .plugins([plugin])
        .middleware({
          'before process:request': function (data, next, abort) {
            data.request.options.uri.should.equal(TEST_URI);
            done();
            abort();
          }
        })
        .serve();
    });

    it('resolves objects recursively', function (done) {
      glenlivet
        .createBottle({
          request: {
            uri: 'http://prolificinteractive.com',
            headers: {
              'Cookie': function () {
                return TEST_COOKIE;
              }
            }
          }
        })
        .plugins([plugin])
        .middleware({
          'before process:request': function (data, next, abort) {
            data.request.options.headers.Cookie.should.equal(TEST_COOKIE);
            done();
            abort();
          }
        })
        .serve();
    });
  });

  describe('making requests', function () {
    var TEST_BODY = 'Success!';
    var TEST_URL_OBJ = {
      port: 7999,
      host: 'localhost:7999',
      protocol: 'http:',
      pathname: '/'
    };

    it('uses resolved options to make http request', function (done) {
      var app = express();
      var server = http.createServer(app);

      app.get(TEST_URL_OBJ.pathname, function (req, resp) {
        resp.send(TEST_BODY);
      });

      server.listen(TEST_URL_OBJ.port, function () {
        glenlivet
          .createBottle({
            request: TEST_URL_OBJ
          })
          .plugins([plugin])
          .serve()
          .done(function (data) {
            data.request.body.should.equal(TEST_BODY);
            server.close(done);
          }, function (err) {
            server.close(function () {
              throw err;
            });
          });
      });
    });

    it('adds body to a key on the data object based on Content-Type', function (done) {
      var app = express();
      var server = http.createServer(app);

      app.get(TEST_URL_OBJ.pathname, function (req, resp) {
        resp.type('html').send(TEST_BODY);
      });

      server.listen(TEST_URL_OBJ.port, function () {
        glenlivet
          .createBottle({
            request: TEST_URL_OBJ
          })
          .plugins([plugin])
          .serve()
          .done(function (data) {
            data.html.should.equal(TEST_BODY);
            server.close(done);
          }, function (err) {
            server.close(function () {
              throw err;
            });
          });
      });
    });

    it('adds JavaScript object to data.json if response is of a JSON content type', function (done) {
      var app = express();
      var server = http.createServer(app);
      var TEST_OBJ = {
        success: true
      };

      app.get(TEST_URL_OBJ.pathname, function (req, resp) {
        resp.json(TEST_OBJ);
      });

      server.listen(TEST_URL_OBJ.port, function () {
        glenlivet
        .createBottle({
          request: TEST_URL_OBJ
        })
        .plugins([plugin])
        .serve()
        .done(function (data) {
          data.json.success.should.equal(true);
          server.close(done);
        }, function (err) {
          server.close(function () {
            throw err;
          });
        });
      });
    });
  });
});
