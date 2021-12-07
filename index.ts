import express from 'express';
import router from './imports/router/index';
import jwtServer from './imports/router/jwt'
import guestServer from './imports/router/guest'
import packagerServer from './imports/router/packager'

const app = express();
app.use(express.json());
app.use('/', router);

app.listen(process.env.PORT, () => {
  console.log(`Hello bugfixers! Listening ${process.env.PORT} port`);
})

const start = async () => {
  await jwtServer.start();
  await guestServer.start();
  await packagerServer.start();
  jwtServer.applyMiddleware({ path: '/api/jwt', app });
  guestServer.applyMiddleware({ path: '/api/guest', app });
  packagerServer.applyMiddleware({ path: '/api/packager', app });
}

start();