const async = require('async');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const config = require('./config');
const API = require('wechat-enterprise-api');
const api = new API(config.appid, config.appsecret);


// 10mb for receive all user
app.use(bodyParser.urlencoded({ extended: false, limit: '10mb' }));
app.use(bodyParser.json({ limit: '10mb' }));

app.post('/cas/callback', function (req, res) {
  const data = req.body;
  const headers = req.headers;
  if (headers['authorization'] !== `oauth ${config.cas_identify}`) {
    console.log(`oauth ${config.cas_identify} are not right`);
    return res.sendStatus(403);
  }

  const user = data.value;
  console.log('receve event', data);
  switch (data.type) {
    case 'user.update':
      const is_delete = data.value.is_delete;
      const userid = `${data.value.username}${config.suffix}`;
      console.log(userid);
      if (is_delete) {
        api.deleteUser(userid, (err, data, res) => {
          if (err) {
            console.log('delete user error ', err);
          }
        });
      } else {
        api.createUser({
          userid,
          name: data.value.realname,
          mobile: data.value.mobile,
          gender: data.value.gender,
          tel: data.value.mobile,
          email: data.value.email,
          department: [1],
        }, (err, data, res) => {
          if (err) {
            console.log('delete user error ', err);
          }
          console.log(data);
        });
      }
      break;
    case 'user.add':
        api.createUser({
          userid,
          name: data.value.realname,
          mobile: data.value.mobile,
          gender: data.value.gender,
          tel: data.value.mobile,
          email: data.value.email,
          department: [1],
        }, (err, data, res) => {
          if (err) {
            console.log('create user error ', err);
          }
          console.log(data);
        });
      break;
    case 'user.sync':
      const fns = [];
      for (const i = 0; i < data.value.length; i ++) {
        const user = data.value[i];
        fns.push(((user) => {
          return (callback) => {
            const userid = `${user.username}${config.suffix}`;
            if (user.is_delete) {
              api.deleteUser(userid, (err, data, res) => {
                if (err) {
                  console.log('delete user error ', err);
                }
                callback();
              });
            } else {
              api.createUser({
                userid,
                name: user.realname,
                mobile: user.mobile,
                gender: user.gender,
                tel: user.mobile,
                email: user.email,
                department: [1],
              }, (err, data, res) => {
                if (err) {
                  console.log('create user error ', err);
                }
                callback();
              });
            }
          };
        })(user))
      }
      async.parallelLimit(fns, 4, () => {
        console.log("sync user done");
      });
      break;
    default:
      break;
  }
  res.send('Star Wars has begin');
});

app.listen(3001, function () {
  console.log('cas-exwechat app listening on port 3001!');
});
