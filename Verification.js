const dns = require('dns');
const SMTPVerification = require('./SMTPVerification.js');
const VerificationError = require('./VerificationError.js');
const logger = require('./logger.js');


function promisedWhile(condition, func) {
  return new Promise((resolve, reject) => {
    let promise;
    const loop = () => {
      if(!condition()) return resolve(promise);
      promise = func();
      promise.then(loop).catch(loop);
    }

    process.nextTick(loop);
  });
}


function validateEmail(email) {
  var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
}


/*

The basic flow has following stages:

1. Validate it is a proper email address.
2. Get the domain of the email and grab the DNS MX records for that domain.
3. Create a TCP connection to the smtp-server. Connect to the next smpt-server in MX records list if connection to the current one fails.
4. Send a EHLO message.
5. Send a MAIL FROM message.
6. Send a RCPT TO message. The result of email verification depends on the server’s response at this stage.
7. Send a QUIT message. Close the connection cleanly.

*/

module.exports = class Verification {
  constructor(email, options) {
    this.email = email;
    this.options = options;
    this.stage = 0;
  }


  run() {
    const { email, options } = this;
    logger.info(`# Veryfing ${email}`);
    logger.info(`Verification options:`, options);

    return Promise.resolve()
      .then(() => this.validate())
      .then(() => this.resolveMx())
      .then(() => this.connectSMTPServer())
      .then(() => ({ email, verified: true }))
      .catch((err) => {
        logger.error(err);
        if(err instanceof VerificationError) {
          const { message, stage } = err;
          return {
            email,
            stage,
            message,
            verified: false
          };
        }
        throw err;
      })
  }


  validate() {
    const { email } = this;
    if(typeof email !== 'string') throw new Error('Invalid email');
    if(!email) throw new Error('Empty email');

    // stage 1: check for syntax of the email address
    this.stage += 1;
    if(!validateEmail(email)) {
      throw new VerificationError(this.stage, 'Invalid email structure');
    }
  }


  resolveMx() {
    // stage 2: check for the domain has hosted email servers to accept emails
    this.stage += 1;
    const domain = this.email.split('@').pop().toLowerCase();

    return new Promise((resolve, reject) => {
      dns.resolveMx(domain, (err, mxRecords) => {
        if(err) reject(new VerificationError(this.stage, err.message, err.code));

        if(mxRecords === undefined || mxRecords.length === 0) {
          reject(new VerificationError(this.stage, 'No MX Records', 'ENOTFOUND'));
          return;
        }
        // sort by priority ascending
        mxRecords.sort((a1, a2) => (a1.priority - a2.priority));
        logger.info('MX Records:', mxRecords);

        this.mxRecords = mxRecords;
        resolve(mxRecords);
      });
    });
  }


  connectSMTPServer() {
    // stage 3: connect to the smtp-server and check for email
    this.stage += 1;
    let smtpVerification;
    let done = false;
    let i = 0;
    const { options, email, stage, mxRecords } = this;
    const connectionOpts = Object.assign(
      {},
      options,
      { email, stage }
    );
    
    return promisedWhile(
      () => !done && i < mxRecords.length, // dinamic condition of while loop
      () => {
        connectionOpts.mx = mxRecords[i++];
        return new SMTPVerification(connectionOpts).run()
          .then((result) => { done = true; })
          .catch((err) => {
            if(err.code !== 421) { done = true; }
            throw err;
          })
      }
    )
  }
}
