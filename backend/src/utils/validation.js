/**
 * Validation utilities for Lambda handlers
 */

/**
 * Validate required environment variables
 * @param {string[]} requiredVars - Array of required environment variable names
 * @throws {Error} If any required variable is missing
 */
const validateEnvVars = (requiredVars) => {
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

/**
 * Validate request body exists and is valid JSON
 * @param {object} event - Lambda event object
 * @returns {object} Parsed body
 * @throws {Error} If body is missing or invalid JSON
 */
const validateBody = (event) => {
  if (!event.body) {
    throw new Error('Request body is required');
  }
  
  try {
    return JSON.parse(event.body);
  } catch (error) {
    throw new Error('Invalid JSON in request body');
  }
};

/**
 * Validate required fields in request body
 * @param {object} body - Request body object
 * @param {string[]} requiredFields - Array of required field names
 * @throws {Error} If any required field is missing
 */
const validateRequiredFields = (body, requiredFields) => {
  const missing = requiredFields.filter(field => !body[field]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
};

/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid
 */
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate UUID format
 * @param {string} uuid - UUID to validate
 * @returns {boolean} True if valid
 */
const validateUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Validate task priority
 * @param {string} priority - Priority value
 * @returns {boolean} True if valid
 */
const validatePriority = (priority) => {
  return ['low', 'medium', 'high'].includes(priority);
};

/**
 * Validate task status
 * @param {string} status - Status value
 * @returns {boolean} True if valid
 */
const validateStatus = (status) => {
  return ['open', 'in-progress', 'completed', 'closed'].includes(status);
};

/**
 * Sanitize string input (prevent injection attacks)
 * @param {string} input - Input string to sanitize
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized string
 */
const sanitizeString = (input, maxLength = 1000) => {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove any potential script tags or HTML
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  
  // Trim and limit length
  return sanitized.trim().slice(0, maxLength);
};

module.exports = {
  validateEnvVars,
  validateBody,
  validateRequiredFields,
  validateEmail,
  validateUUID,
  validatePriority,
  validateStatus,
  sanitizeString
};
