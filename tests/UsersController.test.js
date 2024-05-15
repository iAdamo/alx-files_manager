import { expect } from 'chai';
import request from 'request';

describe('UsersController', () => {
  describe('POST /users', () => {
    it('should create a new user', (done) => {
      const options = {
        url: 'http://localhost:5000/users',
        json: true,
        body: { email: 'test@example.com', password: 'password123' },
      };
      request.post(options, (error, response, body) => {
        expect(response.statusCode).to.equal(201);
        expect(body).to.have.property('id');
        expect(body.email).to.equal('test@example.com');
        done();
      });
    });

    it('should return 400 if the email already exists', (done) => {
      const options = {
        url: 'http://localhost:5000/users',
        json: true,
        body: { email: 'test@example.com', password: 'password123' },
      };
      request.post(options, (error, response, body) => {
        expect(response.statusCode).to.equal(400);
        expect(body).to.have.property('error');
        expect(body.error).to.equal('Already exist');
        done();
      });
    });

    it('should return 400 if the email is missing', (done) => {
      const options = {
        url: 'http://localhost:5000/users',
        json: true,
        body: { password: 'password123' },
      };
      request.post(options, (error, response, body) => {
        expect(response.statusCode).to.equal(400);
        expect(body).to.have.property('error');
        expect(body.error).to.equal('Missing email');
        done();
      });
    });

    it('should return 400 if the password is missing', (done) => {
      const options = {
        url: 'http://localhost:5000/users',
        json: true,
        body: { email: 'test@example.com' },
      };
      request.post(options, (error, response, body) => {
        expect(response.statusCode).to.equal(400);
        expect(body).to.have.property('error');
        expect(body.error).to.equal('Missing password');
        done();
      });
    });
  });

  describe('GET /users/me', () => {
    let token;
    let email;

    before((done) => {
      email = 'test@example.com';
      const password = 'password123';
      const base64Auth = Buffer.from(`${email}:${password}`, 'utf-8').toString('base64');
      const connectOptions = {
        url: 'http://localhost:5000/connect',
        json: true,
        headers: { authorization: `Basic ${base64Auth}` }
      };
      request.get(connectOptions, (error, response, body) => {
        token = body.token;
        done();
      });
    });
    it('should return 401 if no token', (done) => {
      request.get('http://localhost:5000/users/me', (error, response, body) => {
        expect(response.statusCode).to.equal(401);
        expect(JSON.parse(body)).to.deep.equal({ error: 'Unauthorized' });
        done();
      });
    });

    it('should return 401 if invalid token', (done) => {
      const options = {
        url: 'http://localhost:5000/users/me',
        headers: { 'X-token': 'Invalid' },
      };
      request.get(options, (error, response, body) => {
        expect(response.statusCode).to.equal(401);
        expect(JSON.parse(body)).to.deep.equal({ error: 'Unauthorized' });
        done();
      });
    });
    it('should return the authenticated user', (done) => {
      const options = {
          url: 'http://localhost:5000/users/me',
          headers: { 'X-token': token }
        };
      request.get(options, (error, response, body) => {
        expect(response.statusCode).to.equal(200);
        expect(JSON.parse(body)).to.have.property('id');
        expect(JSON.parse(body).email).to.equal(email);
        done();
      });
    });
  });
});
