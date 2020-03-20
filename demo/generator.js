//获取sequelize模型几个
const db = require('../src/config/M')
const ejs = require('ejs')
const fs = require('fs')
const _ = require('lodash')
const { parse } = require('@babel/parser')
const traverse = require("@babel/traverse")
const template = require("@babel/template")
const generate = require('@babel/generator')
const path = require('path')

//前端项目地址
const feDir = path.resolve('.', '../../fe')

//模板地址
const tpls = {
  beRouter: require("./tpl/beRouter.tpl").default,
  feVuex: require("./tpl/feVuex.tpl").default,
  feCommonList: require("./tpl/fe_common_list.tpl").default,
  feCommonModalForm: require("./tpl/fe_common_modalform.tpl").default,
  feRouter: require("./tpl/feRouter.tpl").default,
}

// 生成模板地址
const genFiles = {
  beRouter: path.resolve('.', '../src/router/<%=name%>.js'),
  feVuex: path.resolve(feDir, './src/renderer/store/modules/<%=name%>/index.ts'),
  feCommonList: path.resolve(feDir, "./src/renderer/views/base/<%=name%>/index.vue"),
  feCommonModalForm: path.resolve(feDir, "./src/renderer/views/base/<%=name%>/modalform.vue")
}

// 注册地址
const registerFiles = {
  beRouter: path.resolve('.', '../src/router/index.ts'),
  feVuex: path.resolve(feDir, './src/renderer/store/index.js'),
  feRouter: path.resolve(feDir, './src/renderer/router/baseRouter.js'),
}

/**
 * 代码生成器
 * 
 */
export default class Generator {
  name // 模型名
  model // 模型
  attrs // 模型的参数
  attrsMap
  views
  rules
  options

  viewsDependent
  viewsDependentMap
  constructor(modelName, options) {
    this.name = modelName.toLowerCase()
    this.model = db[modelName]
    //读取sequelize 模型,设置的属性
    const attrs = Reflect.getMetadata("sequelize:attributes", this.model.prototype)
    this.attrs = _.map(attrs, (item, key) => {
      item.name = key
      return item
    })
    this.attrsMap = attrs
    this.views = _.map(this.model._view)

    this.rules = _.filter(this.views, (item) => {
      return item.allowNull == false
    })
    this.options = options

    this.viewsDependent = _.map(this.model._viewDependent, (item, key) => {
      item.name = key
      return item
    }) || []
    this.viewsDependentMap = this.model._viewDependent
  }

  /**
   * 生成所有内容
   */
  create() {
    //1.注册后端模型
    this.registerBeModel()
    //2.生成/注册后端路由
    this.genBeRouter()
    this.registerBeRouter()
    //3.生成/注册前端vuex
    this.genFeVuex()
    this.registerFeVuex()
    //4.生成前端View
    this.genFeView()
    //5.注册前端路由
    this.registerFeRouter()
  }
  /**
   * 前端注册路由
   */
  registerFeRouter() {
    const ast = this.getRegisterAst(registerFiles.feRouter)

    let flag = false
    let children
    traverse(ast, {
      ExportDefaultDeclaration: (path) => {
        //1.export default
        const exportNode = path.node
        //2.找到第一个children
        children = _.find(exportNode.declaration.properties, (item) => {
          return item.key && item.key.name == 'children'
        })
        //3.验证是否存在 base/+name
        flag = _.find(children.value.elements, (item) => {
          //1.获取name
          let nameNode = _.find(item.properties, {
            key: {
              name: 'path'
            }
          })
          return nameNode.value.value == 'base/' + this.name
        })

      }
    })

    if (flag) {
      console.error("注册前端-路由,已存在", this.name)
      return
    }
    //4.在children后,添加router
    let html = ejs.render(tpls.feRouter, {
      model: this
    })

    let addAst = template.ast(html)
    //5.添加模板节点
    children.value.elements.push(addAst.declarations[0].init)

    this.regist(registerFiles.feRouter, ast)
  }
  /**
   * 生成前端视图
   */
  genFeView() {
    this.gen(tpls.feCommonList, genFiles.feCommonList)
    this.gen(tpls.feCommonModalForm, genFiles.feCommonModalForm)
  }
  /**
   * 生成前端vuex
   */
  genFeVuex() {
    this.gen(tpls.feVuex, genFiles.feVuex)
  }

  /**
   * 注册vuex
   */
  registerFeVuex() {
    const ast = this.getRegisterAst(registerFiles.feVuex)
    const body = ast.program.body

    let has = false

    traverse(ast, {
      ImportDeclaration: (path) => {
        //是否import  import staff from './modules/staff/index'
        if (path.node.source.value == `./modules/${this.name}/index`) {
          has = true
        }
      }
    })
    if (has) {
      console.error("注册前端-Vuex,已存在")
      return
    }
    //1.注入 importAST
    const importAst = template.ast(`import ${this.name} from './modules/${this.name}/index'`)
    ast.program.body.splice(1, 0, importAst)

    //2.注入 模块
    //2.1 找到storeNode
    const storeNode = _.find(body, (item) => {
      return item.kind == 'const' && item.declarations[0].id.name == 'store'
    })

    //2.2 找到modules
    const modulesNode = _.find(storeNode.declarations[0].init.arguments[0].properties, (item) => {
      return item.key.name == 'modules'
    })


    // 复制第一个节点
    let firstNode = _.cloneDeep(modulesNode.value.properties[0])
    // 修改节点名称
    firstNode.key.name = this.name
    modulesNode.value.properties.push(firstNode)


    this.regist(registerFiles.feVuex, ast)
  }

  /**
   * 注册后端路由
   */
  registerBeRouter() {
    const ast = this.getRegisterAst(registerFiles.beRouter)

    let has = false
    traverse(ast, {
      ImportDeclaration: (path) => {
        if (path.node.specifiers[0].local.name == this.name) {
          has = true
        }
      }
    })
    if (has) {
      console.error("注册后端-路由,已存在")
      return
    }

    //1.添加import
    //1.1注入 importAST 
    const importAst = template.ast(`import ${this.name} from './${this.name}'`)
    ast.program.body.unshift(importAst)

    //2.注入router信息
    //2.1找到const router 的序号
    const index = _.findIndex(ast.program.body, (item) => {
      return item.kind == "const" && item.declarations[0].id.name == "router"
    })

    //2.2 router相关ast
    const routerAst = template.ast(`router.use('/${this.name}',${this.name}.routes(),${this.name}.allowedMethods())`)

    //2.3 注册到router实例 第一个位置
    ast.program.body.splice(index + 1, 0, routerAst)

    this.regist(registerFiles.beRouter, ast)
  }

  /**
   * 生成后端路由
   */
  genBeRouter() {
    this.gen(tpls.beRouter, genFiles.beRouter)
  }



  /**
   * 注册后端模型
   */
  registerBeModel() {

  }
  /**
   * 获取"注册表"的ast
   * @param path 
   */
  getRegisterAst(path) {
    let code = fs.readFileSync(path, 'utf-8')
    let ast = parse(code, {
      sourceType: "module",
      plugins: [
        "typescript"
      ]
    })
    return ast
  }

  /**
   * 注册,将ast写入注册表
   * @param path 
   * @param ast 
   */
  regist(path, ast) {
    const output = generate(ast, { /* options */ })
    fs.writeFileSync(path, output.code, "utf-8")
  }

  gen(tpl, pathFile) {
    let code = ejs.render(tpl, {
      model: this
    })
    const _pathFile = _.template(pathFile)(this)
    fs.writeFileSync(_pathFile, code, 'utf-8')

  }
}