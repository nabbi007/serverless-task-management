// Simple logger utility for Lambda functions

const createLogger = (functionName, event) => {
  const requestId = event?.requestContext?.requestId || 'unknown';
  
  const log = (level, message, data = {}) => {
    console.log(JSON.stringify({
      level,
      function: functionName,
      requestId,
      message,
      timestamp: new Date().toISOString(),
      ...data
    }));
  };

  return {
    info: (message, data) => log('INFO', message, data),
    error: (message, error) => log('ERROR', message, { error: error?.message || error, stack: error?.stack }),
    warn: (message, data) => log('WARN', message, data),
    debug: (message, data) => log('DEBUG', message, data),
    
    logInvocationStart: (event) => {
      log('INFO', 'Lambda invocation started', {
        httpMethod: event?.httpMethod,
        path: event?.path,
        userId: event?.requestContext?.authorizer?.claims?.sub
      });
    },
    
    logInvocationEnd: (statusCode, duration) => {
      log('INFO', 'Lambda invocation completed', {
        statusCode,
        duration: `${duration}ms`
      });
    },
    
    logDBOperation: (operation, tableName, key) => {
      log('DEBUG', `DynamoDB ${operation}`, {
        table: tableName,
        key
      });
    }
  };
};

module.exports = {
  createLogger
};
