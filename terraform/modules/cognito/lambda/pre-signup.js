const SIGNUP_RESTRICTED_MESSAGE =
  'Sign up is currently restricted. Please use an approved organization email address or contact support.';

exports.handler = async (event) => {
  const allowedDomains = (process.env.ALLOWED_DOMAINS || '')
    .split(',')
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);

  const email = (event?.request?.userAttributes?.email || '').trim().toLowerCase();
  const emailDomain = email.includes('@') ? email.split('@').pop() : '';

  if (!email || !emailDomain) {
    throw new Error(SIGNUP_RESTRICTED_MESSAGE);
  }

  const isAllowed = allowedDomains.includes(emailDomain);
  if (!isAllowed) {
    // Keep logs useful for operations without exposing domain policy to end users.
    console.warn(
      JSON.stringify({
        level: 'WARN',
        message: 'PreSignUp rejected: domain_not_allowed',
        emailDomain,
        userPoolId: event.userPoolId,
        triggerSource: event.triggerSource
      })
    );
    throw new Error(SIGNUP_RESTRICTED_MESSAGE);
  }

  event.response.autoConfirmUser = false;
  event.response.autoVerifyEmail = false;

  return event;
};
