import { expect } from 'chai';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import request from 'request';

describe('AppController', () => {
  const url = 'http://localhost:5000';
  describe('GET /status', () => {
    it('should return the status of Redis and DB', (done) => {
      request(`${url}/status`, (error, response, body) => {
        const res = JSON.parse(body);
        expect(response.statusCode).to.equal(200);
        expect(res).to.have.property('redis');
        expect(res).to.have.property('db');
        expect(res.redis).to.equal(redisClient.isAlive());
        expect(res.db).to.equal(dbClient.isAlive());
        done();
      });
    });
  });

  describe('GET /stats', () => {
    it('should return the number of users and files', (done) => {
      request(`${url}/stats`, async (error, response, body) => {
        const res = JSON.parse(body);
        expect(response.statusCode).to.equal(200);
        expect(res).to.have.property('users');
        expect(res).to.have.property('files');
        expect(res.users).to.equal(await dbClient.nbUsers());
        expect(res.files).to.equal(await dbClient.nbFiles());
        done();
      });
    });
  });
});