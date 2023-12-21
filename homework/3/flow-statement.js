/**
 * @typedef {('break' | 'return' | 'continue')} TypeFlowStatement
 */
/**
 * 流程控制语句
 */
class FlowStatement {
  /**
   * @type TypeFlowStatement
   */
  type;
  /**
   * 流程控制语句-返回值
   */
  value;

  /**
   * @param {TypeFlowStatement} type - 流程控制类型
   * @param {any} value 返回值
   */
  constructor(type, value) {
    this.type = type;
    this.value = value;
  }

  /**
   * 是否是流程控制语句
   * @param {any} anyValue
   * @returns boolean
   */
  static isFlowStatement(anyValue) {
    return anyValue instanceof FlowStatement;
  }

  /**
   *
   * @param {FlowStatement} anyValue
   * @returns TypeFlowStatement
   */
  static getFlowStatement(anyValue) {
    return anyValue.type;
  }
}

module.exports = {
  FlowStatement,
};
