const acorn = require("acorn");
const astring = require("astring");
const traverse = require("../../common/traverse");

function transform(root, originName, targetName) {
  // 遍历所有节点
  return traverse((node, ctx, next) => {
    // TODO: 作业代码写在这里
    if (node.type === "FunctionDeclaration") {
      if (node.id.name === originName) {
        node.id.name = targetName;
      }
    }

    if (node.type === "VariableDeclaration") {
      // 遍历所有声明的变量
      node.declarations.forEach((declaration) => {
        if (declaration.id.name === originName) {
          declaration.id.name = targetName;
        }
      });
    }

    if (node.type === "MemberExpression" && node.object.type === "Identifier") {
      if (node.object.name === originName) {
        node.object.name = targetName;
      }
    }

    if (node.type === "BinaryExpression") {
      renameBinaryExpression(node, originName, targetName);
    }

    // 继续往下遍历
    return next(node, ctx);
  })(root);
}

function renameBinaryExpression(node, originName, targetName) {
  if (node.left.type === "Identifier" && node.left.name === originName) {
    node.left.name = targetName;
  }

  if (node.right.type === "Identifier" && node.right.name === originName) {
    node.right.name = targetName;
  }

  if (node.left.type === "BinaryExpression") {
    renameBinaryExpression(node.left, originName, targetName);
  }

  if (node.right.type === "BinaryExpression") {
    renameBinaryExpression(node.right, originName, targetName);
  }
}

function rename(code, originName, targetName) {
  const ast = acorn.parse(code, {
    ecmaVersion: 5,
  });
  return astring.generate(transform(ast, originName, targetName));
}

module.exports = rename;
