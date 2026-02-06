const createResponse = (statusCode, body, headers = {}) => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
      ...headers
    },
    body: JSON.stringify(body)
  };
};

const successResponse = (data, statusCode = 200, cacheable = false) => {
  const headers = {};
  
  // Add caching headers for GET requests if cacheable
  if (cacheable) {
    headers['Cache-Control'] = 'max-age=300, must-revalidate'; // 5 minutes
    headers['ETag'] = `"${Buffer.from(JSON.stringify(data)).toString('base64').slice(0, 32)}"`;
  } else {
    headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    headers['Pragma'] = 'no-cache';
    headers['Expires'] = '0';
  }
  
  return createResponse(statusCode, { success: true, data }, headers);
};

const errorResponse = (message, statusCode = 400, error = null) => {
  const body = { success: false, message };
  if (error && process.env.NODE_ENV !== 'production') {
    body.error = error.toString();
  }
  
  // Errors should never be cached
  const headers = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  };
  
  return createResponse(statusCode, body, headers);
};

module.exports = {
  createResponse,
  successResponse,
  errorResponse
};
