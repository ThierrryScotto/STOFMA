'use strict';

var data = require('../../datatest.js');
var assert = require('assert');
var request = require('supertest');
var agent;

describe('SaleController', function() {

  // Before: Instantiate an user agent
  before(function(done) {
    agent = request.agent(sails.hooks.http.app);
    done();
  });

  /**
  * Add a Sale as a manager User
  */
  describe('#add() as a manager User', function() {

    // Before: Log in as a manager User
    before(function(done){
      agent
      .put('/user/login')
      .send({
        email: data.user_manager_01.email,
        password: data.user_manager_01.password
      })
      .expect(200)
      .end(done);
    });

    // After: Log out
    after(function(done) {
      agent
      .put('/user/logout')
      .expect(200)
      .end(done);
    });



    // Test
    it('As a manager User, should create several', function (done) {
      Product.find([{id: data.product_01.id},{id: data.product_02.id},{id: data.product_03.id},{id: data.product_04.id}], function(err,productsBefore){
        User.findOne(data.user_admin_01.id, function(err,user){
          //get the credit's user admin before the sale
          var oldCredit = user.credit;
          agent
          .post('/sale')
          .send({
            customerId: data.user_customer_02.id,
            typePayment: 'IN_CREDIT',
            products: [
              {product: data.product_01.id, quantity: 1},
              {product: data.product_02.id, quantity: 12}
            ]
          })
          .expect(200)
          .end(function(){
            agent
            .post('/sale')
            .send({
              customerId: data.user_admin_01.id,
              typePayment: 'IN_CREDIT',
              products: [
                {product: data.product_01.id, quantity: 2},
                {product: data.product_02.id, quantity: 5},
                {product: data.product_03.id, quantity: 1},
                //{product: data.product_03.id, quantity: 1},     //currently ignored because of concurrent access to the resource
                {product: data.product_04.id, quantity: 1}
              ]
            })
            .end(function(err,sale){
              User.findOne(data.user_admin_01.id, function(err,userAfter){
                assert.equal(oldCredit-sale.body.totalPrice, userAfter.credit, 'The new credit is not good.');
              });
              agent
              .post('/sale')
              .send({
                // saleDate is optionnal
                // manager is optionnal
                customerId: data.user_admin_01.id,
                typePayment: 'IN_CREDIT',
                products: [
                  {product: data.product_03.id, quantity: 2},
                  {product: data.product_01.id, quantity: 4},
                  {product: data.product_04.id, quantity: 1}
                ]
              })
              .end(function(){
                Product.find([{id: data.product_01.id},{id: data.product_02.id},{id: data.product_03.id},{id: data.product_04.id}], function(err,productsAfter){
                  assert.equal(productsAfter[0].quantity,  productsBefore[0].quantity - 7,  'Wrong quantity of product_01');
                  assert.equal(productsAfter[1].quantity,  productsBefore[1].quantity - 17, 'Wrong quantity of product_02');
                  assert.equal(productsAfter[2].quantity,  productsBefore[2].quantity - 3,  'Wrong quantity of product_03');
                  assert.equal(productsAfter[3].quantity,  productsBefore[3].quantity - 2,  'Wrong quantity of product_04');

                  User.findOne(data.user_customer_02.id, function(err,userBefore2){
                    agent
                    .post('/sale')
                    .send({

                      // saleDate is optionnal
                      // manager is optionnal
                      customerId: data.user_customer_02.id,
                      typePayment: 'IN_CASH',
                      products: [
                        {product: data.product_04.id, quantity: 100},
                      ]
                    })
                    .end(function(err,res){
                      User.findOne(data.user_customer_02.id, function(err,userAfter2){
                        assert.equal(userBefore2.credit, userAfter2.credit, 'The credit shouldn\'t change because it is a payment in cash');
                        done();
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  describe('#add() as a manager User with not enough credit', function() {

    // Before: Log in as a manager User
    before(function(done){
      agent
      .put('/user/login')
      .send({
        email: data.user_manager_01.email,
        password: data.user_manager_01.password
      })
      .end(done);
    });

    // After: Log out
    after(function(done) {
      agent
      .put('/user/logout')
      .end(done);
    });

    // Test
    it('Shouldn\'t add the new Sale because of the user doesn\'t have enough credit', function (done) {
      Product.find([{id: data.product_01.id},{id: data.product_02.id}], function(err,productsBefore){
        User.findOne(data.user_customer_01.id, function(err,userBefore){
          agent
          .post('/sale')
          .send({
            // saleDate is optionnal
            // manager is optionnal
            customerId: data.user_customer_01.id,
            typePayment: 'IN_CREDIT',
            products: [
              {product: data.product_01.id, quantity: 100},
              {product: data.product_02.id, quantity: 1200}
            ]
          })
          .expect(406)
          .end(function(err,sale){
            User.findOne(data.user_customer_01.id, function(err,userAfter){
              assert.equal(userBefore.credit, userAfter.credit, 'Credit\'s user has changed, but it shouldn\'t.');
              Product.find([{id: data.product_01.id},{id: data.product_02.id}], function(err,productsAfter){
                assert.equal(productsAfter[0].quantity, productsBefore[0].quantity, 'Wrong quantity of product_01');
                assert.equal(productsAfter[1].quantity, productsBefore[1].quantity, 'Wrong quantity of product_02');
                done();
              });
            });
          });
        });
      });
    });
  });

  describe('#add() as a manager User (not enough items in stock)', function() {

    // Before: Log in as a manager User
    before(function(done){
      agent
      .put('/user/login')
      .send({
        email: data.user_manager_01.email,
        password: data.user_manager_01.password
      })
      .end(done);
    });

    // After: Log out
    after(function(done) {
      agent
      .put('/user/logout')
      .end(done);
    });

    // Test
    it('Shouldn\'t add the new Sale because of there is no enough items in stock', function (done) {
      Product.findOne({id: data.product_01.id}, function(err,productBefore){
        User.findOne(data.user_admin_01.id, function(err,userBefore){
          agent
          .post('/sale')
          .send({
            // saleDate is optionnal
            // manager is optionnal
            customerId: data.user_customer_01.id,
            typePayment: 'IN_CREDIT',
            products: [
              {product: data.product_01.id, quantity: 2000},
            ]
          })
          .expect(407)
          .end(function(err,sale){
            User.findOne(data.user_admin_01.id, function(err,userAfter){
              assert.equal(userBefore.credit, userAfter.credit, 'Credit\'s user has changed, but it shouldn\'t.');
              Product.findOne({id: data.product_01.id}, function(err,productAfter){
                assert.equal(productAfter.quantity, productBefore.quantity, 'Quantity of product_01 has changed, but it shouldn\'t.');
                done();
              });
            });
          });
        });
      });
    });
  });

  /**
  * Add as a regular user
  */
  describe('#add() as a regular User', function() {

    // Before: Log in as a manager User
    before(function(done){
      agent
      .put('/user/login')
      .send({
        email: data.user_customer_02.email,
        password: data.user_customer_02.password
      })
      .expect(200)
      .end(done);
    });

    // After: Log out
    after(function(done) {
      agent
      .put('/user/logout')
      .end(done);
    });

    // Test
    it('As a regular user, can\'t create a Sale', function (done) {
      agent
      .post('/sale')
      .send({
        // saleDate is optionnal
        // manager is optionnal
        customerId: data.user_customer_01.id,
        typePayment: 'IN_CREDIT',
        products: [
          {product: data.product_01.id, quantity: 1},
          {product: data.product_02.id, quantity: 12}
        ]
      })
      .expect(401)
      .end(done);
    });
  });

  describe('#update() as a manager User with not enough credit', function() {

    // Before: Log in as a manager User
    before(function(done){
      agent
      .put('/user/login')
      .send({
        email: data.user_manager_01.email,
        password: data.user_manager_01.password
      })
      .end(done);
    });

    // After: Log out
    after(function(done) {
      agent
      .put('/user/logout')
      .end(done);
    });

    // Test
    it('As a manager User, can\'t update the created Sale because of the user doesn\'t have enough credit', function (done) {
      Product.find([{id: data.product_01.id}], function(err,productBefore){
        User.findOne(data.sale_01.customer, function(err,user){
          //get the credit's user before the sale
          var oldCredit = user.credit;
          agent
          .patch('/sale/' + data.sale_01.id)
          .send({
            typePayment: 'IN_CREDIT',
            products: [
              {product: data.product_01.id, quantity: 5000}
            ]
          })
          .expect(406)
          .end(function(){
            User.findOne(data.sale_01.customer, function(err,userAfter){
              assert.equal(oldCredit, userAfter.credit, 'Credit\'s user has changed, but it shouldn\'t.');
              Product.find([{id: data.product_01.id}], function(err,productAfter){
                assert.equal(productAfter[0].quantity, productBefore[0].quantity, 'Wrong quantity of product_01');
                done();
              });
            });
          });
        });
      });
    });
  });

  describe('#update() as a manager User (1 / 4)', function() {

    // Before: Log in as a manager User
    before(function(done){
      agent
      .put('/user/login')
      .send({
        email: data.user_manager_01.email,
        password: data.user_manager_01.password
      })
      .end(done);
    });

    // After: Log out
    after(function(done) {
      agent
      .put('/user/logout')
      .end(done);
    });

    // Test
    it('As a manager User, update a created Sale (CREDIT -> CREDIT)', function (done) {
      Product.find([{id: data.product_01.id},{id: data.product_02.id},{id: data.product_03.id},{id: data.product_04.id}], function(err,productsBefore){
        agent
        .patch('/sale/2')
        .send({
          typePayment: 'IN_CREDIT',
          products: [
            // remove {product: data.product_01.id, quantity: 2}
            {product: data.product_03.id, quantity: 9}
            // remove {product: data.product_04.id, quantity: 2}
          ]
        })
        .expect(200)
        .end(function(){
          Product.find([{id: data.product_01.id},{id: data.product_02.id},{id: data.product_03.id},{id: data.product_04.id}], function(err,productsAfter){
            assert.equal(productsAfter[0].quantity,  productsBefore[0].quantity + 2,  'Wrong quantity of product_01');
            assert.equal(productsAfter[1].quantity,  productsBefore[1].quantity,      'Wrong quantity of product_02');
            assert.equal(productsAfter[2].quantity,  productsBefore[2].quantity - 9,  'Wrong quantity of product_03');
            assert.equal(productsAfter[3].quantity,  productsBefore[3].quantity + 2,  'Wrong quantity of product_04');
            done();
          });
        });
      });
    });
  });

  describe('#update() as a manager User (test update of payment\'s way - 2 / 4)', function() {

    // Before: Log in as a manager User
    before(function(done){
      agent
      .put('/user/login')
      .send({
        email: data.user_manager_01.email,
        password: data.user_manager_01.password
      })
      .end(done);
    });

    // After: Log out
    after(function(done) {
      agent
      .put('/user/logout')
      .end(done);
    });

    // Test
    it('As a manager User, update a created Sale  (CREDIT -> CASH)', function (done) {
      Sale.findOne({id: data.sale_04.id}).populate('customer').populate('payment').exec(function(err,sale04Before){
        agent
        .patch('/sale/4')
        .send({
          typePayment: 'IN_CASH',
          products: [
            {product: data.product_03.id, quantity: 10}
          ]
        })
        .expect(200)
        .end(function(){
          Sale.findOne({id: data.sale_04.id}).populate('customer').populate('payment').exec(function(err,sale04After){
            assert.equal(sale04After.customer.credit,  sale04Before.customer.credit + sale04Before.totalPrice, 'Customer hasn\'t been reimbursed correctly.');
            assert.equal(sale04Before.payment.type, 'IN_CREDIT', 'The old payment type is not good.');
            assert.equal(sale04After.payment.type, 'IN_CASH', 'The new payment type is not good.');
            done();
          });
        });
      });
    });
  });

  describe('#update() as a manager User (test update of payment\'s way - 3 / 4)', function() {

    // Before: Log in as a manager User
    before(function(done){
      agent
      .put('/user/login')
      .send({
        email: data.user_manager_01.email,
        password: data.user_manager_01.password
      })
      .end(done);
    });

    // After: Log out
    after(function(done) {
      agent
      .put('/user/logout')
      .end(done);
    });

    // Test
    it('As a manager User, update a created Sale (CASH -> CASH)', function (done) {
      Sale.findOne({id: data.sale_05.id}).populate('customer').populate('payment').exec(function(err,sale05Before){
        agent
        .patch('/sale/'+data.sale_05.id)
        .send({
          typePayment: 'IN_CASH',
          products: [
            {product: data.product_03.id, quantity: 1}
          ]
        })
        .expect(200)
        .end(function(){
          Sale.findOne({id: data.sale_05.id}).populate('customer').populate('payment').exec(function(err,sale05After){
            assert.equal(sale05After.customer.credit,  sale05Before.customer.credit, 'Customer\'s credit shouldn\'t change.');
            assert.equal(sale05After.payment.type, 'IN_CASH', 'The new payment type is not good.');
            done();
          });
        });
      });
    });

    // Test
    it('As a manager User, update a created Sale (CASH -> IN_TRANSFER)', function (done) {
      Sale.findOne({id: data.sale_05.id}).populate('customer').populate('payment').exec(function(err,sale05Before){
        agent
        .patch('/sale/'+data.sale_05.id)
        .send({
          typePayment: 'IN_TRANSFER',
          products: [
            {product: data.product_03.id, quantity: 2}
          ]
        })
        .expect(200)
        .end(function(){
          Sale.findOne({id: data.sale_05.id}).populate('customer').populate('payment').exec(function(err,sale05After){
            assert.equal(sale05After.customer.credit,  sale05Before.customer.credit, 'Customer\'s credit shouldn\'t change.');
            //assert.equal(sale05After.payment.type, 'IN_TRANSFER', 'The new payment type is not good.');
            done();
          });
        });
      });
    });

    // Test
    it('As a manager User, update a created Sale (IN_TRANSFER -> OTHER)', function (done) {
      Sale.findOne({id: data.sale_05.id}).populate('customer').populate('payment').exec(function(err,sale05Before){
        agent
        .patch('/sale/'+data.sale_05.id)
        .send({
          typePayment: 'OTHER',
          products: [
            {product: data.product_03.id, quantity: 1}
          ]
        })
        .expect(200)
        .end(function(){
          Sale.findOne({id: data.sale_05.id}).populate('customer').populate('payment').exec(function(err,sale05After){
            assert.equal(sale05After.customer.credit,  sale05Before.customer.credit, 'Customer\'s credit shouldn\'t change.');
            //assert.equal(sale05After.payment.type, 'OTHER', 'The new payment type is not good.');
            done();
          });
        });
      });
    });
  });

  describe('#update() as a manager User (test update of payment\'s way - 4 / 4) with no enough credit', function() {

    // Before: Log in as a manager User
    before(function(done){
      agent
      .put('/user/login')
      .send({
        email: data.user_manager_01.email,
        password: data.user_manager_01.password
      })
      .end(done);
    });

    //Credit his account
    before(function(done){
      agent
      .patch('/user/'+data.sale_06.customer+'/credit')
      .send({credit: 9, typePayment: 'IN_CHECK'})
      .end(done);
    });

    // After: Log out
    after(function(done) {
      agent
      .put('/user/logout')
      .end(done);
    });

    // Test
    it('As a manager User, update a created Sale (CASH -> CREDIT)', function (done) {
      Sale.findOne({id: data.sale_06.id}).populate('customer').populate('payment').exec(function(err,sale06Before){
        agent
        .patch('/sale/6')
        .send({
          typePayment: 'IN_CREDIT',
          products: [
            {product: data.product_03.id, quantity: 1}
          ]
        })
        .end(function(){
          Sale.findOne({id: data.sale_06.id}).populate('customer').populate('payment').exec(function(err,sale06After){
            assert.equal(sale06Before.customer.credit, sale06After.customer.credit, 'User\'s credit shouldn\'t change.');
            done();
          });
        });
      });
    });
  });

  describe('#update() as a manager User (test update of payment\'s way - 4 bis / 4)', function() {

    // Before: Log in as a manager User
    before(function(done){
      agent
      .put('/user/login')
      .send({
        email: data.user_manager_01.email,
        password: data.user_manager_01.password
      })
      .end(done);
    });

    //Credit his account
    before(function(done){
      agent
      .patch('/user/'+data.sale_06.customer+'/credit')
      .send({credit: 20, typePayment: 'IN_CASH'})
      .end(done);
    });

    // After: Log out
    after(function(done) {
      agent
      .put('/user/logout')
      .end(done);
    });

    // Test
    it('As a manager User, update a created Sale (CASH -> CREDIT)', function (done) {
      Sale.findOne({id: data.sale_06.id}).populate('customer').populate('payment').exec(function(err,sale06Before){
        agent
        .patch('/sale/6')
        .send({
          typePayment: 'IN_CREDIT',
          products: [
            {product: data.product_03.id, quantity: 1}
          ]
        })
        .end(function(){
          Sale.findOne({id: data.sale_06.id}).populate('customer').populate('payment').exec(function(err,sale06After){
            assert.equal(sale06Before.customer.credit - sale06After.totalPrice,  sale06After.customer.credit, 'New credit is not good.');
            assert.equal(sale06After.payment.type, 'IN_CREDIT', 'The new payment type is not good.');
            done();
          });
        });
      });
    });
  });

  describe('#update() as a manager User (test update of payment\'s way - 4 tris / 4) with no enough items in stock', function() {

    // Before: Log in as a manager User
    before(function(done){
      agent
      .put('/user/login')
      .send({
        email: data.user_manager_01.email,
        password: data.user_manager_01.password
      })
      .end(done);
    });

    // After: Log out
    after(function(done) {
      agent
      .put('/user/logout')
      .end(done);
    });

    // Test
    it('Shouldn\'t add the new Sale because of there is no enough items in stock', function (done) {
      Product.findOne({id: data.product_01.id}, function(err,productBefore){
        User.findOne(data.user_admin_01.id, function(err,userBefore){
          agent
          .patch('/sale/1')
          .send({
            // saleDate is optionnal
            // manager is optionnal
            customerId: data.user_customer_01.id,
            typePayment: 'IN_CASH',
            products: [
              {product: data.product_01.id, quantity: 20000},
            ]
          })
          .expect(407)
          .end(function(err,sale){
            User.findOne(data.user_admin_01.id, function(err,userAfter){
              assert.equal(userBefore.credit, userAfter.credit, 'Credit\'s user has changed, but it shouldn\'t.');
              Product.findOne({id: data.product_01.id}, function(err,productAfter){
                assert.equal(productAfter.quantity, productBefore.quantity, 'Quantity of product_01 has changed, but it shouldn\'t.');
                done();
              });
            });
          });
        });
      });
    });
  });

  describe('#delete() as a regular User', function() {

    // Before: Log in as a regular User
    before(function(done){
      agent
      .put('/user/login')
      .send({
        email: data.user_customer_02.email,
        password: data.user_customer_02.password
      })
      .end(done);
    });

    // After: Log out
    after(function(done) {
      agent
      .put('/user/logout')
      .end(done);
    });

    // Test
    it('As a regular User, can\'t delete a Sale', function (done) {
      agent
      .delete('/sale/' + data.sale_01.id)
      .expect(401, done);
    });
  });


  describe('#delete() as a manager User', function() {

    // Before: Log in as a regular User
    before(function(done){
      agent
      .put('/user/login')
      .send({
        email: data.user_manager_01.email,
        password: data.user_manager_01.password
      })
      .end(done);
    });

    // After: Log out
    after(function(done) {
      agent
      .put('/user/logout')
      .end(done);
    });

    // Test
    it('As a manager User, delete a Sale', function (done) {
      Sale.findOne({id:data.sale_01.id},function(err,saleBefore){
        Product.find([{id: data.product_01.id},{id: data.product_02.id},{id: data.product_03.id},{id: data.product_04.id}], function(err,productsBefore){
          User.findOne({id:data.sale_01.customer}, function(err,userBefore){
            //get the credit's user before the sale
            agent
            .delete('/sale/'+data.sale_01.id)
            .expect(200)
            .end(function(){
              User.findOne({id:data.sale_01.customer}, function(err,userAfter){
                assert.equal(userBefore.credit+saleBefore.totalPrice, userAfter.credit, 'The new credit is not good.');
                Product.find([{id: data.product_01.id},{id: data.product_02.id},{id: data.product_03.id},{id: data.product_04.id}], function(err,productsAfter){
                  assert.equal(productsAfter[0].quantity,  productsBefore[0].quantity,      'Wrong quantity of product_01');
                  assert.equal(productsAfter[1].quantity,  productsBefore[1].quantity + 4,  'Wrong quantity of product_02');
                  assert.equal(productsAfter[2].quantity,  productsBefore[2].quantity + 2,  'Wrong quantity of product_03');
                  assert.equal(productsAfter[3].quantity,  productsBefore[3].quantity,      'Wrong quantity of product_04');
                  done();
                });
              });
            });
          });
        });
      });
    });
  });

  /**
  * Get as a manager user
  */
  describe('#get() as a manager User', function() {

    // Before: Log in as a manager User
    before(function(done){
      agent
      .put('/user/login')
      .send({
        email: data.user_manager_01.email,
        password: data.user_manager_01.password
      })
      .expect(200)
      .end(done);
    });

    // After: Log out
    after(function(done) {
      agent
      .put('/user/logout')
      .end(done);
    });

    // Test
    it('As a manager user, should get all sales', function (done) {
      agent
      .get('/sale')
      .expect(200)
      .end(function(err, sales){
        Sale.count().exec(function(err, nbSales){
          assert.equal(nbSales, sales.body.length, 'A manager user should get all sales.');
          done();
        });
      });
    });
  });

  /**
  * Get as a manager user result 3 to 5 (page=1, limit=3) and 0 to 1 (page=0, limit=2)
  */
  describe('#get() as a manager User result 3 to 5 (page=1, limit=3) and 0 to 1 (page=0, limit=2)', function() {

    // Before: Log in as a manager User
    before(function(done){
      agent
      .put('/user/login')
      .send({
        email: data.user_manager_01.email,
        password: data.user_manager_01.password
      })
      .expect(200)
      .end(done);
    });

    // After: Log out
    after(function(done) {
      agent
      .put('/user/logout')
      .end(done);
    });

    // Test
    it('As a manager user, should get 3 sales', function (done) {
      agent
      .get('/sale?page=1&limit=3')
      .send({
        page: 1,
        limit: 3
      })
      .end(function(err, res){
        assert.equal(res.body.length, 3, 'This request should return 3 sales.');
        done();
      });
    });
    // Test
    it('As a manager user, should get 2 sales', function (done) {
      agent
      .get('/sale?page=0&limit=2')
      .send({
        page: 0,
        limit: 3
      })
      .end(function(err, res){
        assert.equal(res.body.length, 2, 'This request should return 2 sales.');
        done();
      });
    });
  });

  /**
   * Get sales after min date, before max date and after min date and before max date
   */
  describe('#get() sales after min date, before max date and after min date and before max date', function() {

    // Before: Log in as a manager User
    before(function(done){
      agent
          .put('/user/login')
          .send({
            email: data.user_manager_01.email,
            password: data.user_manager_01.password
          })
          .expect(200)
          .end(done);
    });

    // After: Log out
    after(function(done) {
      agent
          .put('/user/logout')
          .end(done);
    });

    // Test
    it('As a manager user, should get only sales done after the min date specified', function (done) {
      agent
          .get('/sale?saleDateMin=2015-08-18')
          .expect(200)
          .end(function(err, sales){
            var ok = sales.body.length > 0;
            for (var i = 0; i < sales.body.length; i++) {
              if (sales.body[i].id == 7) { // Sale which date is before the minimum date specified
                ok = false;
                break;
              }
            }

            assert(ok, true);
            done();
          });
    });

    // Test
    it('As a manager user, should get only sales done before the max date specified', function (done) {
      agent
          .get('/sale?saleDateMax=2015-08-18')
          .expect(200)
          .end(function(err, sales){
            var ok = sales.body.length > 0;
            for (var i = 0; i < sales.body.length; i++) {
              if (sales.body[i].id == 6) { // Sale which date is after the minimum date specified
                ok = false;
                break;
              }
            }

            assert(ok, true);
            done();
          });
    });

    // Test
    it('As a manager user, should get only sales done before the max date specified and after the min date specified', function (done) {
      agent
          .get('/sale?saleDateMax=2015-08-18&saleDateMin=2015-08-18')
          .expect(200)
          .end(function(err, sales){
            var ok = sales.body.length > 0;
            for (var i = 0; i < sales.body.length; i++) {
              if (sales.body[i].id == 7 || sales.body[i].id == 6) { // Sale which date is after the minimum date specified
                ok = false;
              }
            }

            assert(ok, true);
            done();
          });
    });
  });

  /**
   * Get as a regular user
   */
  describe('#get() as a regular User', function() {

    // Before: Log in as a regular User
    before(function(done){
      agent
          .put('/user/login')
          .send({
            email: data.user_customer_05.email,
            password: data.user_customer_05.password
          })
          .expect(200)
          .end(done);
    });

    // After: Log out
    after(function(done) {
      agent
          .put('/user/logout')
          .end(done);
    });

    // Test
    it('As a regular user, should get only his own sales', function (done) {
      agent
          .get('/sale')
          .expect(200)
          .end(function(err, sales){
            Sale.count({customer: data.user_customer_05.id}, function(err, nbSales){
              assert.equal(nbSales, sales.body.length, 'A regular user shouldn\'t get all the sales.');
              done();
            });
          });
    });
  });

});
