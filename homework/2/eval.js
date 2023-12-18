const acorn = require("acorn");

function evaluate(node, env) {
  switch (node.type) {
    case "BinaryExpression":
      return evaluateBinaryExpression(node, env);
    case "Identifier":
      return env[node.name];
    case "Literal":
      return node.value;
    case "LogicalExpression":
      return evaluateLogicalExpression(node, env);
    case "CallExpression":
      return evaluateCallExpression(node, env);
    case "ArrowFunctionExpression":
      return evaluateArrowFunctionExpression(node, env);
    case "ConditionalExpression":
      return evaluateConditionalExpression(node, env);
    case "ObjectExpression":
      return evaluateObjectExpression(node, env);
    case "ArrayExpression":
      return evaluateArrayExpression(node, env);
    case "SequenceExpression":
      return evaluateSequenceExpression(node, env);
    case "AssignmentExpression": // 赋值
      return evaluateAssignmentExpression(node, env);
  }

  throw new Error(
    `Unsupported Syntax ${node} ${node.type} at Location ${node.start}:${node.end}`
  );
}

/**
 * 二元表达式
 * @param {*} node
 * @param {*} env
 * @returns
 */
function evaluateBinaryExpression(node, env) {
  const { left, right, operator } = node;
  const leftValue = evaluate(left, env);
  const rightValue = evaluate(right, env);
  switch (operator) {
    case "+":
      return leftValue + rightValue;
    case "-":
      return leftValue - rightValue;
    case "*":
      return leftValue * rightValue;
    case "/":
      return leftValue / rightValue;
    case "<=":
      return leftValue <= rightValue;
    default:
      throw new Error(`Unsupported Operator ${operator}`);
  }
}

/**
 * 逻辑表达式
 * @param {*} node
 * @param {*} env
 * @returns
 */
function evaluateLogicalExpression(node, env) {
  const { left, right, operator } = node;
  const leftValue = evaluate(left, env);
  switch (operator) {
    case "||":
      return leftValue || evaluate(right, env);
    case "&&":
      return leftValue && evaluate(right, env);
    default:
      throw new Error(`Unsupported Operator ${operator}`);
  }
}

/**
 * 赋值语句
 * @param {*} node
 * @param {*} env
 */
function evaluateAssignmentExpression(node, env) {
  const { left, right, operator } = node;
  switch (operator) {
    case "=":
      let res;
      if (left.type === "Identifier") {
        res = env[left.name] = evaluate(right, env);
      } else {
        res = env[evaluate(left, env)] = evaluate(right, env);
      }
      return res;
    default:
      throw new Error(`Unsupported Operator ${operator}`);
  }
}

/**
 * 方法调用
 * @param {*} node
 * @param {*} env
 * @returns
 */
function evaluateCallExpression(node, env) {
  const callRes = evaluate(
    node.callee,
    env
  )(...node.arguments.map((arg) => evaluate(arg, env)));
  return callRes;
}

/**
 * 箭头函数
 */
function evaluateArrowFunctionExpression(node, env) {
  return function (...args) {
    const localEnv = {};
    const params = node.params;
    for (let i = 0; i < params.length; i++) {
      localEnv[params[i].name] = args[i];
    }
    return evaluate(node.body, { ...env, ...localEnv });
  };
}

/**
 * 条件表达式
 * @param {*} node
 * @param {*} env
 */
function evaluateConditionalExpression(node, env) {
  // 条件 ? 结果 : 备用
  const { test, consequent, alternate } = node;
  const testValue = evaluate(test, env);
  return testValue ? evaluate(consequent, env) : evaluate(alternate, env);
}

/**
 * 对象表达式
 * @param {*} node
 * @param {*} env
 */
function evaluateObjectExpression(node, env) {
  const res = {};
  node.properties.forEach((property) => {
    res[property.key.name] = evaluate(property.value, env);
  });
  return res;
}

function evaluateArrayExpression(node, env) {
  return node.elements.map((element) => evaluate(element, env));
}

function evaluateSequenceExpression(node, env) {
  let res;
  node.expressions.forEach((expression) => {
    res = evaluate(expression, env);
  });

  return res;
}

function customerEval(code, env = {}) {
  const node = acorn.parseExpressionAt(code, 0, {
    ecmaVersion: 6,
  });
  return evaluate(node, env);
}

module.exports = customerEval;
