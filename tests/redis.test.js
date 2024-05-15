import { expect } from 'chai';
import redisClient from '../utils/redis';

describe('RedisClient', () => {
  describe('isAlive', () => {
    it('should return true if the client is connected', () => {
      expect(redisClient.isAlive()).to.equal(true);
    });
  });

  describe('set', () => {
    it('should set a value', async () => {
      await redisClient.set('key', 'value', 5);
    });
  });


  describe('get', () => {
    it('should return null for keys that do not exist', async () => {
      const value = await redisClient.get('nonexistent');
      expect(value).to.equal(null);
    });

    it('should return the value for existing keys', async () => {
      const value = await redisClient.get('key');
      expect(value).to.equal('value');
    });

    it('should return null for expired keys', async () => {
      setTimeout(async () => {
        const  value = await redisClient.get('key');
        expect(value).to.equal(null);
      }, 15000);
    });
  });
  describe('del', () => {
    it('should delete a key', async () => {
      await redisClient.set('key', 'value', 10);
      await redisClient.del('key');
      const value = await redisClient.get('key');
      expect(value).to.equal(null);
    });
  });
});
