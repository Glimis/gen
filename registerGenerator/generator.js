const fs = require('fs')
const ejs = require('ejs')
const _ = require('lodash')
const { parse } = require('@babel/parser')
const traverse = require("@babel/traverse").default
const template = require("@babel/template").default
const generate = require('@babel/generator').default

/**
 * 代码生成器
 * 1.获取待注入页代码
 * 2.对带注入页进行语法检测
 */
exports.default = class generator {
  constructor() {
    this.parseConfig = {
      sourceType: "module",
      plugins: [
        "typescript"
      ]
    } // 设置@babel/parser的参数,懒省事,使用public 属性而非事件

    this.params = {} // 设置
  }
  // 获取
  parseFile(path, params) {
    const code = fs.readFileSync(path, 'utf-8')
    return this.parse(code, params)
  }

  parse(code, params) {
    this.params = params
    let ast = parse(code, this.parseConfig)
    this.compile(ast)

    const genCode = generate(ast, { /* options */ })

    return genCode.code;
  }

  /**
   * 获取ast中的注释,如// tpl/data: import <%=name%> from './<%name%>'
   * 
   * 将tpl/([^:]*)后的模板,通过template,转换到ast中
   * 其中([^:])为该模板的数据
   * 
   * @param {待添加的ast} ast 
   * @param {模板参数} params 
   */
  compile(ast) {
    // 1.获取注释[comments] --> 查询 value 开头为  tpl/[^:]*:的注释
    const comments = _.filter(ast.comments, (item) => {
      return item.value.match(/^[*\s]*tpl\/[^:]+:/)
    })

    _.each(comments, (comment) => {
      //获取模板与数据key
      const { key, tpl } = getKeyAndTpl(comment)
      //获取代码,此处模板引擎,使用 _.template
      const code = _.template(tpl)(this.params[key])


      //获取comment的位置
      const node = getLocationNode(ast, comment)

      // 根据node类型
      addCode(code, node, comment)
    })


  }


}

function addCode(code, node, comment) {

  if (node.type == 'ArrayExpression') {
    //此时,code为对象,对象无法直接转换为ast
    //此处可以决定顺序,对于router系列,需要根据 路由name,进行顺序的插入
    //需要预留钩子
    //此处偷懒, 丢在最后
    node.elements.push(template.ast("var a = " + code).declarations[0].init)

  } else if (node.type == "File") {
    //相对于 ArrayExpression 可以偷懒, body内更依赖顺序

    let index = 0
    _.find(node.program.body, (item, i) => {
      index = i;
      return item.start > comment.end
    })

    //插入
    node.program.body.splice(index, 0, template.ast(code))
  } else {
    const addAst = template.ast(code)
  }
}

function getKeyAndTpl(comment) {
  const arr = comment.value.match(/^[*\s]*tpl\/([^:\s]+)\s*:([\s\S]+)$/)

  //1.1 key 为tpl/（）:中的内容
  const key = arr[1]
  //1.2 获取模板 模板为:后的内容
  let tpl = arr[2]

  //2 对于tpl,需要删除 \r\n\s*\*,格式交给babel\generator
  // tpl.replace(/\r\n\s*\*/g, '')
  //注:防止空格影响,此处只删除*
  tpl = tpl.replace(/\s*\*/g, (item) => {
    return item.replace(/[\f\t\v ]+\*/g, '')
  })
  return { key, tpl }
}

/**
 * 获取注释的相对位置
 * @param {} comment 
 */
function getLocationNode(ast, comment) {
  //获取根节点
  const nodeRoot = _.find(ast.program.body, (item) => {
    return item.start < comment.start && item.end > comment.end
  })
  if (nodeRoot) {
    // 一个蛋疼的问题是 Node 的种类超过200+,每个关联的组件名称都不一致
    // 1.兜底或偷懒的方法是通过toString,直接找到【leadingComments】,而后找到父类
    // 2.另一种方式是keys遍历,判断是否属于node,属于就判断
    return getNode(nodeRoot, comment)
  } else {
    //此时,通常首行内容
    return ast
  }
}

function getNode(node, comment) {
  //1.判断comment是否在里面
  const flag = _.find(node.leadingComments, (item) => {
    return item == comment
  })
  if (flag) {
    return node
  }

  const clazz = node.constructor
  for (let key of Object.keys(node)) {
    const nodeOrNodes = node[key]

    //属于node,基于node判断
    if (nodeOrNodes instanceof clazz) {
      if (nodeOrNodes.start < comment.start && nodeOrNodes.end > comment.end) {
        return getNode(nodeOrNodes, comment)
      }
    } else if (_.isArray(nodeOrNodes) && nodeOrNodes.length > 0 && nodeOrNodes[0] instanceof clazz) {

      //数组,需要循环
      for (let subNode of nodeOrNodes) {
        if (subNode.start < comment.start && subNode.end > comment.end) {
          return getNode(subNode, comment)
        }
        //可能为subNod本身
        const flag = _.find(subNode.leadingComments, (item) => {
          return item == comment
        })
        if (flag) {
          // return subNode
          return node
        }
      }



    }
  }
}
