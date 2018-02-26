const net = require('net');
const VerificationError = require('./VerificationError.js');
const logger = require('./logger.js');


module.exports = class SMTPVerification {
  constructor(options) {
    this.clientRequests = [
      { requiredCode: 220, msg: `EHLO ${options.fqdn}\r\n` },
      { requiredCode: 250, msg: `MAIL FROM:<${options.sender}>\r\n` },
      { requiredCode: 250, msg: `RCPT TO:<${options.email}>\r\n` },
      { requiredCode: 250, msg: `QUIT\r\n` },
    ].reverse();
    this.options = options;
    this.response = '';
    this.stage = options.stage || 0;
  }


  run() {
    const { mx, port, timeout } = this.options;

    return new Promise((resolve, reject) => {
      logger.info(`Creating connection to '${mx.exchange}' with priority '${mx.priority}'`);
      
      const socket = net.createConnection(port, mx.exchange)
      this.socket = socket;

      socket.on('connect', () => {
        logger.info('Connected');
      });

      socket.on('data', (buffer) => {
        this.onData(buffer)
      });

      socket.on('error', (err) => {
        this.onError(err);
        reject(this.err);
      });

      if(timeout) {
        socket.setTimeout(timeout);
        socket.on('timeout', () => {
          if(!socket.destroyed) {
            this.onTimeout();
            reject(this.err);
          } 
        })
      }

      socket.on('end', () => {
        logger.info('Closing connection');
        if(this.err) {
          reject(this.err);
        } else {
          resolve({ stage: this.stage });
        }
      });
    })
  }


  handleResponse() {
    const {
      socket,
      clientRequests,
      response
    } = this;
    if(socket.destroyed || clientRequests.length === 0) return;
    const { requiredCode, msg } = clientRequests.pop();

    if(response.search(`${requiredCode}`) !== -1) {
      this.stage += 1;
      logger.info(`stage=${this.stage}`)
      logger.client(msg);
      socket.write(msg);
    } else {
      socket.end();
      this.err = new VerificationError(this.stage, response);
    }
  }


  onData(buffer) {
    const data = buffer.toString();
    logger.server(data);
    this.response += data;
    const completed = data.slice(-1) === '\n';
    if(completed && this.clientRequests.length > 0) {
      this.handleResponse();
      this.response = '';
    }
  }


  onError({ message, code }) {
    this.err = new VerificationError(this.stage, message, code);
  }


  onTimeout() {
    this.socket.destroy();
    this.err = new VerificationError(
      this.stage,
      'Connection was closed by peer',
      421
    );
  }
}