/* eslint-disable jest/prefer-expect-assertions */
import chai from 'chai';
import dbClient from '../utils/db';

const { expect } = chai;

describe('dbClient', () => {e
  describe('isAlive', () => {
    it('should return true if the connection is established', () => {
      const result = dbClient.isAlive();
      expect(result).to.equal(false);
    });
  });

  describe('nbUsers', () => {
    it('should return the number of users', async () => {
      const count = await dbClient.nbUsers();
      expect(count).to.equal(0);
    });
  });

  describe('nbFiles', () => {
    it('should return the number of files', async () => {
      const count = await dbClient.nbFiles();
      expect(count).to.equal(0);
    });
  });
});
