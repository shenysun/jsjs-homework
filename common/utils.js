function hasReturn(result, node) {
  return result || node?.type === "ReturnStatement";
}

module.exports = {
  hasReturn,
};
