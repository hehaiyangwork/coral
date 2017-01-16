const config = {
  hello: "hello world !",
  vendor: {
    dir: "./vendor/",
    files: [
      {
        name: "init.js",
        url: "https://raw.githubusercontent.com/hehaiyangwork/my-js-lib/master/init.js"
      },
      {
        name: "helper.js",
        url: "https://raw.githubusercontent.com/hehaiyangwork/my-js-lib/master/helper.js"
      },
      {
        name: "handlebars.js",
        url: "https://raw.githubusercontent.com/hehaiyangwork/my-js-lib/master/handlebars.js"
      },
      {
        name: "extend.js",
        url: "https://raw.githubusercontent.com/hehaiyangwork/my-js-lib/master/extend.js"
      },
      {
        name: "validator.js",
        url: "https://raw.githubusercontent.com/hehaiyangwork/my-js-lib/master/validator/validator.js",
        child_dir: "validator/",
        version: "master"
      },
      {
        name: "jquery.serializejson.js",
        url: "https://raw.githubusercontent.com/hehaiyangwork/my-js-lib/master/serialize/jquery.serializejson.js",
        child_dir: "serialize/",
        version: "master"
      }
    ]
  },
  redis: {
    host: '127.0.0.1',
    port: 6666
  }
}

module.exports = config;
