const toNativeNumber = (value) => {
  if (value && typeof value.toNumber === 'function') {
    return value.toNumber();
  }

  return value;
};

module.exports = { toNativeNumber };
