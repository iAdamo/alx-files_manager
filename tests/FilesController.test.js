import { expect } from 'chai';
import request from 'request';

describe('FilesController', () => {
  let token;
  let textFileId;
  let imageFileId;
  let folderId;

  before((done) => {
    const email = 'test@example.com';
    const password = 'password123';
    const base64Auth = Buffer.from(`${email}:${password}`).toString('base64');
    const connectOptions = {
      url: 'http://localhost:5000/connect',
      json: true,
      headers: { authorization: `Basic ${base64Auth}` },
    };
    request.get(connectOptions, (error, response, body) => {
      token = body.token;
      done();
    });
  });

  describe('/POST file', () => {
    let options;

    before(() => {
      options = {
        url: 'http://localhost:5000/files',
        json: true,
        headers: { 'X-token': token },
      };
    });
    it('it should POST a text file', (done) => {
      options.body = {
          name: 'test.txt',
          type: 'file',
          data: 'SGVsbG8gV2Vic3RhY2shCg==',
        };
      request.post(options, (err, response, body) => {
        textFileId = body.id;
        expect(response.statusCode).to.equal(201);
        expect(body).to.have.property('id');
        expect(body).to.have.property('userId');
        expect(body).to.have.property('name').equal('test.txt');
        expect(body).to.have.property('type').equal('file');
        expect(body.isPublic).to.equal(false);
        expect(body.parentId).to.equal(0);
        done();
      });
    });

    it('should return 400 if the name is missing', (done) => {
      options.body = {
        type: 'file',
        data: 'SGVsbG8gV2Vic3RhY2shCg==',
      };
      request.post(options, (err, response, body) => {
        expect(response.statusCode).to.equal(400);
        expect(body).to.have.property('error').equal('Missing name');
        done();
      });
    });

    it('should return 400 if the type is missing', (done) => {
      options.body = {
        name: 'test.txt',
        data: 'SGVsbG8gV2Vic3RhY2shCg==',
      };
      request.post(options, (err, response, body) => {
        expect(response.statusCode).to.equal(400);
        expect(body).to.have.property('error').equal('Missing type');
        done();
      });
    });

    it('should return 400 if the data is missing', (done) => {
      options.body = {
        name: 'test.txt',
        type: 'file',
      };
      request.post(options, (err, response, body) => {
        expect(response.statusCode).to.equal(400);
        expect(body).to.have.property('error').equal('Missing data');
        done();
      });
    });

    it('should post a folder', (done) => {
      options.body = {
        name: 'image',
        type: 'folder',
      };
      request.post(options, (err, res, body) => {
        folderId = body.id;
        expect(res.statusCode).to.equal(201);
        expect(res.body).to.have.property('parentId').equal(0);
        expect(res.body.type).to.equal('folder');
        expect(res.body).to.not.have.property('localPath');
        done();
      });
    });

    it('should return error for invalid parentId', (done) => {
      options.body = {
        name: 'text.txt',
        type: 'file',
        data: 'SGVsbG8gV2Vic3RhY2shCg==',
        parentId: 23,
      };
      request.post(options, (err, res, body) => {
        expect(res.statusCode).to.equal(400);
        expect(body.error).to.equal('Parent not found');
        done();
      });
    });
    it('should return error for file as parent folder', (done) => {
      options.body = {
        name: 'text.txt',
        type: 'file',
        data: 'SGVsbG8gV2Vic3RhY2shCg==',
        parentId: textFileId,
      };
      request.post(options, (err, res, body) => {
        expect(res.statusCode).to.equal(400);
        expect(body.error).to.equal('Parent is not a folder');
        done();
      });
    });

  });

  describe('/GET file/:id', () => {
    let options;

    before(() => {
      options = {
        json: true,
        headers: { 'X-token': token },
      };
    });
    it('it should GET a file', (done) => {
      options.url = `http://localhost:5000/files/${textFileId}`;
      request(options, (err, res, body) => {
        expect(res.statusCode).to.equal(200);
        expect(body).to.have.property('id').equal(textFileId);
        done();
      });
    });
  });
});
