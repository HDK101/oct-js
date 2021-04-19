const encode = (content) => {
  const buff = Buffer.from(content, 'utf-8');
  return buff.toString('base64');
}

const decode = (content) => {
  const buff = Buffer.from(content, 'base64');
  return buff.toString('utf-8');
}


module.exports = {
  encode, decode
};