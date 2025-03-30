const request = require('supertest');
const { expect } = require('chai');
const app = require('../app');

describe('Calculator Microservice API', () => {

  describe('Basic Operations', () => {
    it('should add two numbers correctly', async () => {
      const res = await request(app).get('/add?num1=5&num2=3');
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('result', 8);
      expect(res.body.error).to.be.false;
    });

    it('should subtract two numbers correctly', async () => {
      const res = await request(app).get('/subtract?num1=10&num2=4');
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('result', 6);
      expect(res.body.error).to.be.false;
    });

    it('should multiply two numbers correctly', async () => {
      const res = await request(app).get('/multiply?num1=6&num2=7');
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('result', 42);
      expect(res.body.error).to.be.false;
    });

    it('should divide two numbers correctly', async () => {
      const res = await request(app).get('/divide?num1=20&num2=5');
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('result', 4);
      expect(res.body.error).to.be.false;
    });

    it('should return error for division by zero', async () => {
      const res = await request(app).get('/divide?num1=10&num2=0');
      expect(res.status).to.equal(400);
      expect(res.body.error).to.be.true;
      expect(res.body.message).to.contain('divide by zero');
    });
  });


  describe('Advanced Operations', () => {
    it('should calculate exponentiation correctly', async () => {
      const res = await request(app).get('/exponent?num1=2&num2=3');
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('result', 8);
      expect(res.body.error).to.be.false;
    });

    it('should calculate square root correctly', async () => {
      const res = await request(app).get('/sqrt?num1=16');
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('result', 4);
      expect(res.body.error).to.be.false;
    });

    it('should return error for negative square root', async () => {
      const res = await request(app).get('/sqrt?num1=-4');
      expect(res.status).to.equal(400);
      expect(res.body.error).to.be.true;
      expect(res.body.message).to.contain('negative number');
    });

    it('should calculate modulo correctly', async () => {
      const res = await request(app).get('/modulo?num1=10&num2=3');
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('result', 1);
      expect(res.body.error).to.be.false;
    });
  });

  // Input validation tests
  describe('Input Validation', () => {
    it('should return error for non-numeric input', async () => {
      const res = await request(app).get('/add?num1=abc&num2=5');
      expect(res.status).to.equal(400);
      expect(res.body.error).to.be.true;
      expect(res.body.message).to.contain('Invalid input');
    });

    it('should return error for missing parameters', async () => {
      const res = await request(app).get('/multiply?num1=5');
      expect(res.status).to.equal(400);
      expect(res.body.error).to.be.true;
    });
  });
  describe('Health Check', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('status', 'UP');
    });
  });
});