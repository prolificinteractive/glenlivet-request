# glenlivet-request

Adds the results of an HTTP request to a glenlivet processing pipeline.

Combines especially well with glenlivet plugins that filter HTML data, such as glenlivet-html-to-json.

## Installation

`npm install glenlivet-request`

## Usage

The plugin's main job is to resolve a `request` options object, then add the resulting response to the glenlivet data object. `pluginDefaults` on barrel configuration allows for a convenient way to setup default options.

Example:

```javascript
var fakeStore = glenlivet.createBarrel({
  plugins: [
    require('glenlivet-request'),
    require('glenlivet-html-to-json')
  ],
  pluginDefaults: {
    request: {
      protocol: 'https:',
      host: 'store.prolificinteractive.com',
      jar: function (data) {
        if (data.session) {
          return data.session.jar;
        }
      }
    }
  }
});

fakeStore.bottle('getProduct', {
  request: {
    method: 'GET',
    pathname: function (data) {
      return '/products/' + data.id;
    }
  },
  htmlToJson: {
    'id': function () {
      return this.data.id;
    },
    'name': function ($doc) {
      return $doc.find('#name').text().trim();
    },
    'price': function ($doc) {
      return $doc.find('#price').text().trim().replace('$', '');
    }
  }
});

app.get('/products/:id', function (req, resp) {
  fakeStore.getProduct({
    id: req.param('id')
  }).done(function (data) {
    resp.json(data.json);
  }, handleError);
});
```

### Dynamic Options

The plugin resolves request options recursively, resolving functions into values at any level in the options object. For example:

```javascript
fakeSite.bottle('checkout', {
  request: {
    method: 'POST',
    pathname: function (data) {
      return '/orders/' + data.orderId + '/checkout';
    },
    headers: {
      'X-Checkout-Token': function (data) {
        return data.checkoutToken;
      }
    }
  },
  htmlToJson: {
    'success': function ($doc) {
      return $doc.find('#error-msg').length === 0;
    }
  }
});
```

### Asynchronous Options

This plugin also supports option values that resolve asynchronously. For example, in scraped APIs you might need to grab the CSRF token from a page before submitting a form:

```javascript
var getCsrfToken = fakeStore.bottle({
  request: {
    method: 'GET',
    pathname: function (data) {
      return data.page || '/';
    }
  },
  htmlToJson: {
    'csrf': function ($doc) {
      return $doc.find('input#csrf').eq(0).attr('value');
    }
  }
}).method('json.csrf');

fakeStore.bottle('addToCart', {
  session: {
    required: true
  },
  request: {
    method: 'POST',
    pathname: '/cart',
    jar: function (data) {
      return data.session.jar;
    },
    headers: {
      'csrf': function () {
        return getCsrfToken({
          page: '/cart'
        });
      }
    }
  }
});

fakeStore.addToCart({
  productId: '109883'
});
```

### Response Content Types

In addition to putting the response object at `data.request.response`, it will detect the content type from the response, filter the body, and place it at its corresponding key on the data object. For example, a JSON body will be assigned to `data.json`, an HTML body to `data.html`, etc.

```javascript
fakeSite.getHomepage(function (err, data) {
  doSomethingWithHtml(data.html);
});

fakeSite.makeCallToSomeAjaxEndpoint(function (err, data) {
  doSomethingWithJson(data.json);
});
```
