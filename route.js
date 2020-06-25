const fs = require('fs')
const path = require('path')
const bodyParser = require('body-parser')
const cache = require('apicache').middleware
const request = require('./util/request')

const express = require('express');
const router = express.Router();

// CORS
var apply_cors = (req, res, next) => {
  if(req.path !== '/' && !req.path.includes('.')){
    res.header({
      'Access-Control-Allow-Credentials': true,
      'Access-Control-Allow-Origin': req.headers.origin || '*',
      'Access-Control-Allow-Headers': 'X-Requested-With',
      'Access-Control-Allow-Methods': 'PUT,POST,GET,DELETE,OPTIONS',
      'Content-Type': 'application/json; charset=utf-8'
    })
  }
  next()
};

// cookie parser
var apply_cookie_parse = (req, res, next) => {
  req.cookies = {}, (req.headers.cookie || '').split(/\s*;\s*/).forEach(pair => {
    let crack = pair.indexOf('=')
    if(crack < 1 || crack == pair.length - 1) return
    req.cookies[decodeURIComponent(pair.slice(0, crack)).trim()] = decodeURIComponent(pair.slice(crack + 1)).trim()
  })
  next()
};

// router
const special = {
    'daily_signin.js': '/daily_signin',
    'fm_trash.js': '/fm_trash',
    'personal_fm.js': '/personal_fm'
}

fs.readdirSync(path.join(__dirname, 'module')).reverse().forEach(file => {
    if(!(/\.js$/i.test(file))) return
    let route = (file in special) ? special[file] :
                '/' + file.replace(/\.js$/i, '').replace(/_/g, '/')
    let question = require(path.join(__dirname, 'module', file))

    router.use(route, [apply_cors, apply_cookie_parse, bodyParser.json(),
                       bodyParser.urlencoded({extended: false}),
                       cache('2 minutes', ((req, res) => res.statusCode === 200)),
      (req, res) => {
        let query = Object.assign({}, req.query, req.body, {cookie: req.cookies})
        question(query, request)
          .then(answer => {
              console.log('[OK]', decodeURIComponent(req.originalUrl))
              res.append('Set-Cookie', answer.cookie)
              res.status(answer.status).send(answer.body)
          })
          .catch(answer => {
              console.log('[ERR]', decodeURIComponent(req.originalUrl), answer)
              if(answer.body.code =='301') answer.body.msg = '需要登录'
              res.append('Set-Cookie', answer.cookie)
              res.status(answer.status).send(answer.body)
          })
    }])
})

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;

