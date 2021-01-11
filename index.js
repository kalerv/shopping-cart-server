const express = require('express');
const fs = require('fs');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  next();
});
// parse application/json
app.use(bodyParser.json());
const PORT = process.env.PORT || 5000;
app.get('/', (req, res) => {
  res.send({
    msg: 'Welcome to Shopping cart app',
    supportedRoutes: [
      '/api/products :GET',
      '/api/cart:userId : GET',
      '/api/cart :POST',
      '/api/orders/:userId : GET',
    ],
  });
});
app.post('/api/login', (req, res) => {
  const body = req.body;
  fs.readFile('data/users.json', 'utf8', function (err, data) {
    if (err) {
      return res.status(500).send({ error: 'Something went wrong!' });
    }
    const jsonRes = JSON.parse(data);
    const user = jsonRes.filter((u) => u.email === body.email)[0];
    if (user && user.password == body.password) {
      delete user.password;
      res.status(200).send({ success: true, data: user });
    } else {
      res.status(401).send({ success: false, msg: 'User not found!' });
    }
  });
});

app.get('/api/products', (req, res) => {
  fs.readFile('data/products.json', 'utf8', function (err, data) {
    if (err) {
      return res.status(500).send({ error: 'Something went wrong!' });
    }
    const jsonRes = JSON.parse(data);
    res.status(200).send({ success: true, data: jsonRes });
  });
});
app.get('/api/cart/:userId', (req, res) => {
  fs.readFile('data/cart.json', 'utf8', function (err, data) {
    if (err) {
      return res.status(500).send({ error: 'Something went wrong!' });
    }
    let jsonRes = JSON.parse(data);
    jsonRes = jsonRes.filter((c) => c.userId == req.params.userId)[0];
    if (jsonRes) {
      res.status(200).send({ success: true, data: jsonRes });
    } else {
      res.status(200).send({ success: true, data: null });
    }
  });
});

app.post('/api/cart', (req, res) => {
  const body = req.body;

  fs.readFile('data/cart.json', 'utf8', function (err, data) {
    if (err) {
      throw err;
    }
    data = JSON.parse(data);
    let existingCartIndex = 0;
    const existingCart = data.filter((cart, index) => {
      if (cart.userId === body.userId) {
        existingCartIndex = index;
        return cart;
      }
    })[0];
    if (existingCart) {
      //cart already exist
      data[existingCartIndex] = body;
    } else {
      data = [...data, body];
    }
    fs.writeFileSync('data/cart.json', JSON.stringify(data));
  });
  res.status(200).send({
    success: true,
    data: body,
  });
});

app.post('/api/checkout', (req, res) => {
  const body = req.body;
  fs.readFile('data/cart.json', 'utf8', function (err, data) {
    if (err) {
      throw err;
    }
    data = JSON.parse(data);
    let existingCartIndex = 0;
    const existingCart = data.filter((cart, index) => {
      if (cart.userId === body.userId) {
        existingCartIndex = index;
        return cart;
      }
    })[0];
    data.splice(existingCartIndex, 1);
    fs.writeFileSync('data/cart.json', JSON.stringify(data));
    const dataToSave = createOrderToSave(existingCart);
    fs.readFile('data/orders.json', 'utf8', function (err, orderData) {
      if (err) {
        throw err;
      }
      if (!orderData) {
        orderData = {};
      } else {
        orderData = JSON.parse(orderData);
      }
      console.log(orderData);
      const key = Object.keys(dataToSave)[0];
      if (orderData[key]) {
        orderData[key].push(dataToSave[key][0]);
      } else {
        orderData[key] = [dataToSave[key][0]];
      }
      fs.writeFileSync('data/orders.json', JSON.stringify(orderData));
      res.status(200).send({
        success: true,
      });
    });
  });
});

app.get('/api/orders/:userId', (req, res) => {
  const userId = req.params.userId;
  fs.readFile('data/orders.json', 'utf8', function (err, orderData) {
    if (err) {
      throw err;
    }
    if (!orderData) {
      orderData = {};
    } else {
      orderData = JSON.parse(orderData);
    }
    res.status(200).send({
      success: true,
      data: orderData[userId] || [],
    });
  });
});
const createOrderToSave = (data) => {
  const items = data['cartItems'];
  let dataToSave = {
    items: [],
    totalPrice: data['totalPrice'],
    time: Date.now(),
  };
  items.forEach((d) => {
    let item = {
      title: d.product.title,
      price: d.product.price,
      totalPrice: d.price,
      quantity: d.quantity,
      image: d.product.image,
    };
    dataToSave.items.push(item);
  });
  return { [data.userId]: [dataToSave] };
};
app.listen(PORT);
