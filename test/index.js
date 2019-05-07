const Generator = require('../generator').default
const fs = require('fs')

const generator = new Generator();

/**
 * elementRouter 为某UI库社区提供的admin中的 router
 * 一共有三处修正
 * 1.顶部增加  /* eslint-disable * /  --> 取消eslint,主要是gen生成的code,不一定符合规范
 * 2.在example模块下添加的  --》 此处将import单独提取出来
 * 3.顶部的import添加
 */
const codeFeRouter = generator.parseFile('./feRouter.tpl', {
  example: {
    name: 'testModule',
    title: '测试模块',
    icon: 'icon',
    componentName: 'Test'
  },
  import: {
    name: 'Test'
  }
})

fs.writeFileSync('./feRouter.js', codeFeRouter, 'utf-8')


// 这种简易的,可以直接使用模板
const codeBeRouter = generator.parseFile('./beRouter.tpl', {
  import: {
    name: 'test'
  },
  router: {
    name: 'test',
    ModelName: 'Test'
  }
})
fs.writeFileSync('./beRouter.js', codeBeRouter, 'utf-8')