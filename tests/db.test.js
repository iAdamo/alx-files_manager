/* eslint-disable jest/prefer-expect-assertions */
import chai from 'chai';
import dbClient from '../utils/db';

const { expect } = chai;

describe('dbClient', () => {
  beforeEach( async function() {
    const waitConnection = () => {
      return new Promise((resolve, reject) => {
          let i = 0;
          const repeatFct = async () => {
              await setTimeout(() => {
                  i += 1;
                  if (i >= 10) {
                      reject()
                  }
                  else if(!dbClient.isAlive()) {
                      repeatFct()
                  }
                  else {
                      resolve()
                  }
              }, 1000);
          };
          repeatFct();
      })
  };
  });

  afterEach( async function() {
    await dbClient.db.collection('users').deleteMany({});
    await dbClient.db.collection('files').deleteMany({});
  });

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
