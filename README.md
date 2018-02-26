# Email SMTP Verificator

Based on [bighappyworld's](https://github.com/bighappyworld) [email-verify](https://github.com/bighappyworld/email-verify) module.

### Requirements
node.js >= 6.4.0

### Usage

```js
const emailSMTPVerificator = require('./email-smtp-verificator');

const verify = emailSMTPVerificator({ timeout: 12000 });

verify('example@mail.com')
  .then((info) => { console.log(info); })
  .catch(console.log); // empty or non-string email
```

### Callback
The callback is a function that has an info object:
```
{
  email: string,
  verified: boolean,
  // error case attributes
  stage: integer, // stage at which the error occurred
  message: string // error message
}
```

### Options
The options are:
```
{
  port : integer,// port to connect with defaults to 25
  sender : email, // sender address, defaults to name@example.org
  timeout : integer, // socket timeout defaults to 0 which is no timeout
  fqdn : domain, // used as part of the EHLO, defaults to mail.example.org
  ignore: // set an ending response code integer to ignore, such as 450 for greylisted emails
}
```

### Flow

The basic flow has following stages:

1. Validate it is a proper email address.
2. Get the domain of the email and grab the DNS MX records for that domain.
3. Create a TCP connection to the smtp-server. *Connect to the next smpt-server in MX records list if connection to the current one fails.*
4. Send a EHLO message.
5. Send a MAIL FROM message.
6. Send a RCPT TO message. *The result of email verification depends on the server's response at this stage*.
7. Send a QUIT message. *Close the connection cleanly*.

