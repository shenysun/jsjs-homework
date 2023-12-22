const { FlowStatement } = require("./flow-statement");

/**
 * @typedef {('break' | 'return' | 'continue')} TypeFlowStatement
 */
/**
 * var 定义类型
 * @typedef {('let' | 'const' | 'var' | 'function')} TypeKind
 */

/**
 * @typedef {Object} ScopeValueItem
 * @property {TypeKind} kind
 * @property {string} key
 * @property {string | Object} value
 */

function isObject(maybeObj) {
  return typeof maybeObj === "object" && maybeObj !== null;
}

function isArray(maybeArray) {
  return Array.isArray(maybeArray);
}

class Scope {
  /**
   * @type {boolean}
   */
  closure; // 闭包
  /**
   * @type {FlowStatement}
   */
  flowStatement; // 当前作用域流程控制语句
  /**
   * 作用域定义栈
   * @type {ScopeValueItem[]} stack
   */
  stack;
  /**
   * 作用域标签，用于for label
   * @type { string | undefined }
   */
  label;

  /**
   * 创建新的作用域
   * @param {boolean} closure 是否是闭包
   * @param {Array<ScopeValueItem> | Record<string, any>} init 初始化作用域中的值
   */
  constructor(closure, init = []) {
    this.closure = closure;
    if (isArray(init)) {
      this.stack = init;
    } else if (isObject(init)) {
      this.stack = [];
      Object.keys(init).map((key) => {
        const value = init[key];
        this.stack.push({
          kind: "var",
          key,
          value,
        });
      });
    } else {
      this.stack = [];
    }
  }

  /**
   * 设置作用域流程控制语句
   * @param {TypeFlowStatement} type
   * @param {*} valueOrLabel
   */
  setFlowStatement(type, valueOrLabel) {
    this.flowStatement = new FlowStatement(type, valueOrLabel);
  }

  /**
   * 添加一个值
   * @param {ScopeValueItem} item
   */
  add(item) {
    this.stack.push(item);
  }

  /**
   * 移除值
   * @param {*} key
   */
  remove(key) {
    const index = this.getIndex(key);
    if (index > -1) {
      this.stack.splice(index, 1);
    }
  }

  /**
   * 更新值
   * @param {string} key
   * @param {*} newVal
   * @param {*} subKey
   */
  set(key, newVal, subKey = []) {
    const item = this.get(key);
    if (item) {
      if (subKey.length) {
        subKey.reduce((prev, sk, index) => {
          return index === subKey.length - 1 ? (prev[sk] = newVal) : prev[sk];
        }, item.value);
      } else {
        if (item.kind === "const") {
          throw new TypeError("Assignment to constant variable");
        }
        item.value = newVal;
      }
    }
  }

  /**
   * 获取值
   * @param {string} key
   * @returns
   */
  get(key) {
    return this.find((item) => item.key === key);
  }

  /**
   * 获取值下标
   * @param {string} key
   * @returns
   */
  getIndex(key) {
    return this.findIndex((item) => item.key === key);
  }

  /**
   *
   * @param {(item: ScopeValueItem, index: number, items: ScopeValueItem[]) => boolean} traverse
   * @returns
   */
  find(traverse) {
    for (let i = this.stack.length - 1; i >= 0; i--) {
      if (traverse(this.stack[i], i, this.stack)) {
        return this.stack[i];
      }
    }
  }

  /**
   *
   * @param {(item: ScopeValueItem, index: number, items: ScopeValueItem[]) => boolean} traverse
   * @returns
   */
  findIndex(traverse) {
    for (let i = this.stack.length - 1; i >= 0; i--) {
      if (traverse(this.stack[i], i, this.stack)) {
        return i;
      }
    }

    return -1;
  }
}

class scopeStack {
  /**
   * @type {Array<Scope>}
   */
  static stack = [];

  /**
   * 添加一个新的作用域
   * @param {boolean} closure 是否是闭包
   * @param {Array<ScopeValueItem> | Record<string, any>} init 初始化作用域中的值
   * @returns 返回新建的作用域
   */
  static addScope(closure, init = []) {
    const scope = new Scope(closure, init);
    this.stack.push(scope);
    return scope;
  }

  /**
   * 移除作用域
   * @returns
   */
  static pop() {
    return this.stack.pop();
  }

  /**
   * 查找定义所在作用域
   * @param {string} key
   * @returns
   */
  static findScope(key) {
    return this.stack.find((scope) => scope.get(key));
  }

  /**
   * 站定的作用域
   * @returns {Scope}
   */
  static topScope() {
    return this.stack.at(-1);
  }
}

module.exports = {
  scopeStack,
};
