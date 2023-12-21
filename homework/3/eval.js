const acorn = require("acorn");
const { inspect } = require("util");
const { scopeStack } = require("./scope");
const { hasReturn } = require("../../common/utils");
const { FlowStatement } = require("./flow-statement");

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
    case "ThrowStatement":
      return evaluateThrowStatement(node, env);
    case "CatchClause":
      return evaluateCatchClause(node, env);
    case "FunctionExpression":
      return evaluateFunctionExpression(node, env);
    case "SwitchStatement":
      return evaluateSwitchStatement(node, env);
    case "ContinueStatement":
      return evaluateContinueStatement(node, env);
    case "MemberExpression":
      return evaluateMemberExpression(node, env);
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

function getKeyList(node) {
  let keyList = [];
  switch (node.type) {
    case "Identifier":
      keyList = [node.name];
      break;
    case "MemberExpression":
      const { object, property } = node;
      const keys = getKeyList(object);
      const subKeys = getKeyList(property);
      keyList = keys.concat(subKeys);
      break;
    default:
      throw new Error(`Unsupported getKeyList ${node.type}`);
  }

  return keyList;
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
  const keyList = getKeyList(left);
  const key = keyList.shift();
  const scope = scopeStack.findScope(key);
  const oldVal = scope.get(key).value;
  switch (operator) {
    case "=":
      scope.set(key, evaluate(right, env), keyList);
      break;
    case "+=": {
      scope.set(key, oldVal + evaluate(right, env), keyList);
      break;
    }
    case "*=": {
      scope.set(key, oldVal * evaluate(right, env), keyList);
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
  const keyList = getKeyList(argument);
  const key = keyList.shift();
  const scope = scopeStack.findScope(key);
  const oldVal = scope.get(key).value;
  switch (operator) {
    case "++":
      scope.set(key, oldVal + 1, keyList);
      break;
    default:
      throw new Error(`Unsupported Operator ${operator}`);
  }
}

/**
 * 解析 try
 * @param {*} node
 * @param {*} env
 */
function evaluateTryStatement(node, env) {
  const { block, handler, finalizer } = node;
  try {
    if (block) {
      const tryRes = evaluate(block, env);
      if (hasReturn(tryRes, block)) {
        return tryRes;
      }
    }
  } catch (error) {
    // 创建作用域
    if (handler) {
      const scope = scopeStack.addScope();
      scope.add({
        kind: "var",
        key: handler.param.name,
        value: error,
      });
      const catchRes = evaluate(handler, env);
      scopeStack.pop();
      if (hasReturn(catchRes, handler)) {
        return catchRes;
      }
    }
  } finally {
    if (finalizer) {
      const finalRes = evaluate(finalizer, env);
      if (hasReturn(finalRes)) {
        return finalRes;
      }
    }
  }
}

function evaluateThrowStatement(node, env) {
  throw evaluate(node.argument, env);
}

/**
 * 解析 catch
 * @param {*} node
 * @param {*} env
 */
function evaluateCatchClause(node, env) {
  const { body } = node;
  const returnRes = evaluate(body, env);
  if (returnRes) {
    return returnRes;
  }
}

/**
 * 方法调用
 * @param {*} node
 * @param {*} env
 * @returns
 */
function evaluateCallExpression(node, env) {
  let applyObj = null;
  if (node.callee.type === "MemberExpression") {
    applyObj = evaluate(node.callee.object);
  }
  const func = evaluate(node.callee, env);
  const callRes = func.call(
    applyObj,
    ...node.arguments.map((arg) => evaluate(arg, env))
  );
  const scope = scopeStack.topScope();
  // 避免移除其自身
  if (typeof callRes !== "function" && scope && scope.closure) {
    // 闭包执行完毕，移除其所在作用域
    scopeStack.pop();
  }
  return callRes;
}

/**
 * 定义 function
 */
function evaluateFunctionExpression(node, env) {
  const { id, params, body } = node;
  const idValue = getKeyList(id).pop();
  const func = function (...args) {
    const scope = scopeStack.addScope();
    for (let i = 0; i < params.length; i++) {
      scope.add({
        kind: "var",
        key: params[i].name,
        value: args[i],
      });
    }

    const returnVal = evaluate(body, env);
    scopeStack.pop();
    return returnVal;
  };

  const topScope = scopeStack.topScope();
  topScope.add({
    kind: "function",
    key: idValue,
    value: func,
  });

  return func;
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
 * switch 语句
 */
function evaluateSwitchStatement(node, env) {
  const { discriminant, cases } = node;
  const discriminantVal = evaluate(discriminant, env);
  for (let i = 0; i < cases.length; i++) {
    const caseItem = cases[i];
    const { test, consequent } = caseItem;
    if (evaluate(test) === discriminantVal) {
      for (const consequentItem of consequent) {
        const res = evaluate(consequentItem);
        if (res) {
          return res;
        }
      }
    }
  }
}

/**
 * continue 语句
 * @param {*} node
 * @param {*} env
 */
function evaluateContinueStatement(node, env) {
  return new FlowStatement("continue");
}

function evaluateMemberExpression(node, env) {
  const { object, property } = node;
  return evaluate(object, env)[evaluate(property, env)];
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
  const returnVal = evaluate(node.argument, env);
  if (typeof returnVal === "function") {
    // 处理闭包, 函数调用后再销毁作用域
    scopeStack.topScope().closure = true;
  }

  return returnVal;
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
    const res = evaluate(body, env);
    if (res && FlowStatement.isFlowStatement(res)) {
      const type = FlowStatement.getFlowStatement(res);
      if (type === "continue") {
        continue;
      } else if (type === "return") {
        return;
      } else if (type === "break") {
        break;
      }
    }
    console.log("res:", res);
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
  return evaluate(node.expression, env);
}

/**
 * 块
 * @param {*} node
 * @param {*} env
 * @returns
 */
function evaluateBlockStatement(node, env) {
  let returnVal = undefined;
  for (const item of node.body) {
    returnVal = evaluate(item, env);
    if (hasReturn(returnVal)) {
      break;
    }
  }

  return returnVal;
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
  console.log("start:::: code", code);
  console.log("start:::: env", inspect(scopeStack, { depth: 10 }));

  scopeStack.addScope(false, env);
  const node = acorn.parse(code, {
    ecmaVersion: 6,
  });

  try {
    let result = evaluate(node, env);
    return result;
  } catch (error) {
    throw error;
  } finally {
    scopeStack.pop();
    console.log("scopeStack:", inspect(scopeStack, { depth: 10 }));
  }
}

// const code =
//   '(function t(type) { const result = []; let i = 0; while (i < 5) { i++; switch (type + "") { case "0": continue; }result.push(i); } return result; })(0)';
// console.log(customerEval(code));

module.exports = customerEval;
