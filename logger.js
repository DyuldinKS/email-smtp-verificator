let debug = false;
const debugOptions = {

};

const log = (...messages) => { if(debug) console.log(...messages); }


module.exports = {
  enable: () => { debug = true },

  disable: () => { debug = false },

  info: (...args) => {
    args.forEach((arg) => { log('INFO:', arg); });
  },

  error: (...args) => {
    args.forEach((arg) => { log('ERROR:', arg); });
  },

  server: (msg) => { log('SERVER:', msg); },

  client: (msg) => { log('CLIENT:', msg); }
}

