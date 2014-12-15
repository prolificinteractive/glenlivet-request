var glenlivet = require('glenlivet');
var plugin = require('../index');

var prolific = glenlivet.createBarrel({
  plugins: [plugin],
  pluginDefaults: {
    request: {
      protocol: 'http:',
      host: 'www.prolificinteractive.com'
    }
  }
});

var getNumberOfWordInstances = prolific.bottle({
  request: {
    pathname: '/'
  }
}).middleware({
  'after process:request': function (data) {
    var exp = new RegExp(data.word, 'g');
    data.wordInstances = data.html.match(exp).length;
  }
}).method('wordInstances');

getNumberOfWordInstances({
  word: 'Prolific'
}, function (err, wordInstances) {
  console.log('Prolific is mentioned %s times', wordInstances);
});
