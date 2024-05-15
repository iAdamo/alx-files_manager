import { expect } from 'chai';
import { createHash } from 'crypto';
import request from 'request';

describe('AuthController', () => {
  describe('GET /connect', () => {
    it('should return 401 if no authorization header', (done) => {
      request.get('http://localhost:5000/connect', (error, response) => {
        expect(response.statusCode).to.equal(401);
        expect(JSON.parse(response.body)).to.deep.equal({ error: 'Unauthorized' });
        done();
      });
    });

    it('should return 401 if invalid authorization header', (done) => {
      const options = {
        url: 'http://localhost:5000/connect',
        headers: { authorization: 'Invalid' }
      };
      request.get(options, (error, response) => {
        expect(response.statusCode).to.equal(401);
        expect(JSON.parse(response.body)).to.deep.equal({ error: 'Unauthorized' });
        done();
      });
    });

    it('should return 401 if invalid credentials', (done) => {
      const options = {
        url: 'http://localhost:5000/connect',
        headers: { authorization: `Basic ${Buffer.from('invalid:credentials').toString('base64')}` }
      };
      request.get(options, (error, response) => {
        expect(response.statusCode).to.equal(401);
        expect(JSON.parse(response.body)).to.deep.equal({ error: 'Unauthorized' });
        done();
      });
    });

    it('should return 200 if valid credentials', (done) => {
      const email = 'email'
      const password = 'password';
      const base64Auth = Buffer.from(`${email}:${password}`, 'utf-8').toString('base64');
      console.log(base64Auth);
      const options = {
        url: 'http://localhost:5000/connect',
        headers: { authorization: `Basic ${base64Auth}` }
      };
      request.get(options, (error, response) => {
        expect(response.statusCode).to.equal(200);
        expect(JSON.parse(response.body)).to.have.property('token');
        done();
      });
    });
  });
});