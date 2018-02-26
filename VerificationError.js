class VerificationError extends Error {
  constructor(stage, message, code) {
    super(message);
    this.stage = stage;
    if(code) {
      this.code = code;
    }
  }
}

VerificationError.prototype.name = 'VerificationError';


module.exports = VerificationError;