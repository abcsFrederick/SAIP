const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../app');
var expect = chai.expect;
var Cookies;

// Configure chai
chai.use(chaiHttp);
chai.should();

var agent = chai.request.agent(app)
before(function(done){

  agent.post('/mockLogin')
      .send({ username: 'test', password: 'test123456789' })
      .end(function(err, res){
        // expect(res).to.have.cookie('session');
        // The `agent` now has the sessionid cookie saved, and will send it
        // back to the server in the next request:
        // return agent.get('/user/me')
        //   .then(function (res) {
        //      expect(res).to.have.status(200);
        //   });
        expect(res.status).to.equal(200);
        done();
        // Cookies = res.headers['set-cookie'].pop().split(';')[0];
      });
})
describe("Mapping", () => {
    describe("GET mappingAll", () => {
      it("should return all patients", (done) => {
             agent
                 .get('/api/v1/mappingAll')
                 .end((err, res) => {
                     res.should.have.status(200);
                     res.body[0].id.should.be.eql(62);
                     res.body.should.be.a('Array');
                     done();
                  });
         });
    });
});

// describe("Users", () => {
//     describe("PUT user_edit", () => {
//       it("should return someone's record is changed", (done) => {
//         let userEdit = {
//           user_id: 250,
//           last_name: 'test',
//           first_name: 'test_first',
//           position: '#372',
//           is_pi: 1,
//           status: 'Employee',
//           userID: 'miaot2'
//         }
//         agent
//            .put('/api/v1/user_edit')
//            .send(userEdit)
//            .end((err, res) => {
//                res.should.have.status(200);
//                res.body.should.be.a('object');
//                done();
//             });
//          });
//     });
// });