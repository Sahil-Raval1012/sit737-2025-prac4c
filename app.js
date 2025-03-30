const express = require('express');
const winston = require('winston');
const path = require('path');

// Initializing the Express app
const app = express();
const port = 3000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'calculator-service.log' })
  ]
});

// Handling the errors.
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  res.status(500).json({ 
    error: true, 
    message: 'An unexpected error occurred',
    details: err.message 
  });
});

// Inputing the validated 
const validateInput = (req, res, next) => {
  const num1 = parseFloat(req.query.num1);
  const num2 = parseFloat(req.query.num2);

  if (req.path === '/sqrt') {
    // Only validate num1 for square root
    if (isNaN(num1)) {
      return res.status(400).json({ 
        error: true, 
        message: 'Invalid input: num1 must be a number' 
      });
    }
    if (num1 < 0) {
      return res.status(400).json({ 
        error: true, 
        message: 'Invalid input: Cannot calculate square root of negative number' 
      });
    }
    req.num1 = num1;
    return next();
  }

  // Validating both the inputs for performing operations.
  if (isNaN(num1) || isNaN(num2)) {
    return res.status(400).json({ 
      error: true, 
      message: 'Invalid input: Both num1 and num2 must be numbers' 
    });
  }

 
  if (req.path === '/divide' && num2 === 0) {
    return res.status(400).json({ 
      error: true, 
      message: 'Invalid input: Cannot divide by zero' 
    });
  }

//Defining the values to a particular location.
  req.num1 = num1;
  req.num2 = num2;
  next();
};

const withRetry = (operation) => {
  return async (req, res) => {
    const maxRetries = 3;
    let retries = 0;
    let success = false;
    let result;
    let error;
//Creating a while loop to catch exceptions and also intializing waiting
    while (retries < maxRetries && !success) {
      try {
        result = operation(req.num1, req.num2);
        success = true;
      } catch (err) {
        error = err;
        logger.warn(`Retry ${retries + 1} failed: ${err.message}`);
        retries++;
        await new Promise(resolve => setTimeout(resolve, 100 * retries));
      }
    }

    if (success) {
      logger.info(`Operation successful after ${retries} retries`);
      return res.json({ 
        error: false, 
        result 
      });
    } else {
      logger.error(`Operation failed after ${maxRetries} retries: ${error.message}`);
      return res.status(500).json({ 
        error: true, 
        message: 'Operation failed after multiple attempts',
        details: error.message 
      });
    }
  };
};
const createCircuitBreaker = () => {
  const states = {
    CLOSED: 'CLOSED',
    OPEN: 'OPEN',
    HALF_OPEN: 'HALF_OPEN'
  };

  let state = states.CLOSED;
  let failureCount = 0;
  let lastFailureTime = null;
  const failureThreshold = 5;
  const resetTimeout = 30000; // 30 seconds

  return {
    execute: (operation) => {
      return async (req, res) => {
        // checking whether the circuit is open or closed.
        if (state === states.OPEN) {
          const now = Date.now();
          if (now - lastFailureTime >= resetTimeout) {
            state = states.HALF_OPEN;
            logger.info('Circuit breaker state changed to HALF_OPEN');
          } else {
            logger.warn('Circuit breaker is OPEN, rejecting request');
            return res.status(503).json({ 
              error: true, 
              message: 'Service temporarily unavailable' 
            });
          }
        }

        try {
          const result = operation(req.num1, req.num2);
          if (state === states.HALF_OPEN) {
            state = states.CLOSED;
            failureCount = 0;
            logger.info('Circuit breaker state changed to CLOSED');
          }
          
          return res.json({ 
            error: false, 
            result 
          });
        } catch (err) {
          // Handling failure in the program
          failureCount++;
          lastFailureTime = Date.now();
          
          // now we will check if we need to open the circuit or not.
          if ((state === states.CLOSED && failureCount >= failureThreshold) || 
              state === states.HALF_OPEN) {
            state = states.OPEN;
            logger.error(`Circuit breaker state changed to OPEN after ${failureCount} failures`);
          }
          
          return res.status(500).json({ 
            error: true, 
            message: 'Operation failed',
            details: err.message 
          });
        }
      };
    }
  };
};

const circuitBreaker = createCircuitBreaker();

// Performing all the basic calculator operations 
//Addition operation
app.get('/add', validateInput, (req, res) => {
  logger.info(`Addition operation: ${req.num1} + ${req.num2}`);
  const result = req.num1 + req.num2;
  res.json({ error: false, result });
});
//subtraction operation
app.get('/subtract', validateInput, (req, res) => {
  logger.info(`Subtraction operation: ${req.num1} - ${req.num2}`);
  const result = req.num1 - req.num2;
  res.json({ error: false, result });
});
//Multiplication operation
app.get('/multiply', validateInput, (req, res) => {
  logger.info(`Multiplication operation: ${req.num1} * ${req.num2}`);
  const result = req.num1 * req.num2;
  res.json({ error: false, result });
});
//Division Operation
app.get('/divide', validateInput, (req, res) => {
  logger.info(`Division operation: ${req.num1} / ${req.num2}`);
  const result = req.num1 / req.num2;
  res.json({ error: false, result });
});

// Performing Advanced calculator operations 
//exponent operation
app.get('/exponent', validateInput, circuitBreaker.execute((num1, num2) => {
  logger.info(`Exponentiation operation: ${num1} ^ ${num2}`);
  return Math.pow(num1, num2);
}));
// square root operation
app.get('/sqrt', validateInput, withRetry((num1) => {
  logger.info(`Square root operation: √${num1}`);
  return Math.sqrt(num1);
}));
//Modulus operation
app.get('/modulo', validateInput, (req, res) => {
  logger.info(`Modulo operation: ${req.num1} % ${req.num2}`);
  const result = req.num1 % req.num2;
  res.json({ error: false, result });
});
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', message: 'Calculator service is running' });
});

// Root endpoint for calculator UI
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Starting the server with full link
app.listen(port, () => {
  logger.info(`Calculator microservice listening at http://localhost:${port}`);
});

module.exports = app; // Export for testing