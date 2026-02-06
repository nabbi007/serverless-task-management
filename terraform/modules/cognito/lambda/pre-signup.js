exports.handler = async (event) => {
  console.log('Pre-signup event:', JSON.stringify(event, null, 2));
  
  const allowedDomains = process.env.ALLOWED_DOMAINS.split(',');
  const email = event.request.userAttributes.email;
  
  if (!email) {
    throw new Error('Email is required');
  }
  
  const emailDomain = email.split('@')[1];
  
  if (!allowedDomains.includes(emailDomain)) {
    throw new Error(`Email domain ${emailDomain} is not allowed. Only ${allowedDomains.join(', ')} are permitted.`);
  }
  
  // Auto-confirm user (optional - remove if you want manual confirmation)
  event.response.autoConfirmUser = false;
  event.response.autoVerifyEmail = false;
  
  return event;
};
