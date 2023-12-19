const acorn = require("acorn");
const util = require("util");
const { scopeStack } = require("./scope");

function evaluate(node, env) {
  switch (node.type) {
    case "Program":
      return evaluateProgram(node, env);
    case "BinaryExpression":
      return evaluateBinaryExpression(node, env);
    case "Identifier":
      return evaluateIdentifier(node, env);
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
    case "ExpressionStatement":
      return evaluateExpressionStatement(node, env);
    case "AssignmentExpression": // 赋值
      return evaluateAssignmentExpression(node, env);
    case "BlockStatement":
      return evaluateBlockStatement(node, env);
    case "VariableDeclaration":
      return evaluateVariableDeclaration(node, env);
    case "VariableDeclarator":
      return evaluateVariableDeclarator(node, env);
    case "IfStatement":
      return evaluateConditionalExpression(node, env);
    case "ReturnStatement":
      return evaluateReturnStatement(node, env);
    case "ForStatement":
      return evaluateForStatement(node, env);
    case "WhileStatement":
      return evaluateWhileStatement(node, env);
    case "UpdateExpression":
      return evaluateUpdateExpression(node, env);
    case "TryStatement":
      return evaluateTryStatement(node, env);
    default:
      throw new Error(
        `Unsupported Syntax ${node.type} at Location ${node.start}:${node.end}`
      );
  }
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
    case ">":
      return leftValue > rightValue;
    case "<":
      return leftValue < rightValue;
    default:
      throw new Error(`Unsupported Operator ${operator}`);
  }
}

function getTopScope(node) {
  let key = "";
  switch (node.type) {
    case "Identifier":
      key = node.name;
      break;
    case "MemberExpression":
      const { object } = node;
      key = object.name;
      break;

    default:
      console.log(
        "ssss:",
        util.inspect(scopeStack, {
          showHidden: false,
          depth: null,
          colors: true,
        })
      );
      throw new Error(`Unsupported getTopScope ${node.type}`);
  }

  const scope = scopeStack.findScope(key);
  return {
    key,
    scope,
  };

  for (let i = scopeStack.length - 1; i >= 0; i--) {
    const scope = scopeStack[i];
    if (scope && key in scope) return { key, scope };
  }

  return {};
}

/**
 * 处理标识
 * @param {*} node
 * @param {*} env
 * @returns
 */
function evaluateIdentifier(node, env) {
  const scope = scopeStack.findScope(node.name);
  if (scope) {
    return scope.get(node.name)?.value;
  }

  return env[node.name] || node.name;
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
      let { key, scope } = getTopScope(left);
      const item = scope.get(key);
      if (item.kind === "const") {
        throw new TypeError("Assignment to constant variable");
      }
      item.value = evaluate(right, env);
      break;
    case "+=": {
      let { key, scope } = getTopScope(left);
      scope.get(key).value += evaluate(right, env);
      break;
    }
    case "*=": {
      let { key, scope } = getTopScope(left);
      scope.get(key).value *= evaluate(right, env);
      break;
    }
    default:
      throw new Error(
        `Unsupported  evaluate AssignmentExpression Operator ${operator}`
      );
  }
}

function evaluateUpdateExpression(node, env) {
  const { argument, operator } = node;
  switch (operator) {
    case "++":
      let { key, scope } = getTopScope(argument);
      if (key && scope) {
        scope.get(key).value++;
      }
      break;
    default:
      throw new Error(`Unsupported Operator ${operator}`);
  }
}

/**
 *
 * @param {*} node
 * @param {*} env
 */
function evaluateTryStatement(node, env) {
  const { block, handler, finalizer } = node;
  try {
    evaluate(block, env);
  } catch (error) {
    handler && evaluate(handler, env);
  } finally {
    finalizer && evaluate(finalizer, env);
  }
}

/**
 * 方法调用
 * @param {*} node
 * @param {*} env
 * @returns
 */
function evaluateCallExpression(node, env) {
  const func = evaluate(node.callee, env);
  const callRes = func(...node.arguments.map((arg) => evaluate(arg, env)));
  const scope = scopeStack.topScope();
  // 避免移除其自身
  if (typeof callRes !== "function" && scope && scope.closure) {
    // 闭包执行完毕，移除其所在作用域
    scopeStack.pop();
  }
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
  return evaluate(test, env)
    ? evaluate(consequent, env)
    : evaluate(alternate, env);
}

function evaluateReturnStatement(node, env) {
  return evaluate(node.argument, env);
}

/**
 * for 循环
 */
function evaluateForStatement(node, env) {
  const { init, test, update, body } = node;
  scopeStack.addScope();
  evaluate(init, env);
  while (evaluate(test, env)) {
    evaluate(body, env);
    evaluate(update, env);
  }

  scopeStack.pop();
}

/**
 * while 循环
 */
function evaluateWhileStatement(node, env) {
  const { test, body } = node;
  scopeStack.addScope();
  while (evaluate(test, env)) {
    evaluate(body, env);
  }

  scopeStack.pop();
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

function evaluateProgram(node, env) {
  let res;
  for (const child of node.body) {
    res = evaluate(child, env);
  }

  return res;
}

function evaluateExpressionStatement(node, env) {
  const expressionRes = evaluate(node.expression, env);
  if (
    expressionRes !== undefined ||
    node.expression.type === "ReturnStatement"
  ) {
    return expressionRes;
  }
}

/**
 * 块
 * @param {*} node
 * @param {*} env
 * @returns
 */
function evaluateBlockStatement(node, env) {
  scopeStack.addScope();
  let returnVal = undefined;
  for (const item of node.body) {
    returnVal = evaluate(item, env);
    if (returnVal !== undefined || item.type === "ReturnStatement") {
      break;
    }
  }

  if (typeof returnVal === "function") {
    // 闭包
    scopeStack.topScope().closure = true;
  } else {
    scopeStack.pop();
  }
  if (returnVal !== undefined) {
    return returnVal;
  }
}

let createVariableKind;

function evaluateVariableDeclaration(node, env) {
  node.declarations.forEach((declaration) => {
    createVariableKind = node.kind;
    evaluate(declaration, env);
    createVariableKind = undefined;
  });
}

function evaluateVariableDeclarator(node, env) {
  const topScope = scopeStack.topScope();
  const { id, init } = node;
  topScope.add({
    kind: createVariableKind,
    key: evaluate(id, env),
    value: node.init ? evaluate(init, env) : undefined,
  });
}

function customerEval(code, env = {}) {
  scopeStack.addScope(false, env);
  const node = acorn.parse(code, {
    ecmaVersion: 6,
  });

  let result = evaluate(node, env);
  scopeStack.pop();
  return result;
}

// const s =
//   // "(() => { let a = 1; var b = 2; (() => { a = 2; b = 3; })(); return { a, b }; })()";
//   "((() => { var n = 55; return () => { for (let i = 0; i < 10; i++) { n += i } return n } })())()";
// const result = customerEval(s);
// console.log(result, scopeStack);
module.exports = customerEval;
