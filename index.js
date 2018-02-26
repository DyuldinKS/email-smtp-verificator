const Verification = require('./Verification');
const logger = require('./logger.js');
logger.enable();


const defaultOptions = {
  port: 25,
  sender: 'name@example.org',
  timeout: 0,
  fqdn: 'mail.example.org',
  ignore: false
}


function emailSMTPVerificator(personalOptions) {
  const options = Object.assign(
    {},
    defaultOptions,
    personalOptions
  );

  return (email) => new Verification(email, options).run();
}


module.exports = emailSMTPVerificator;
