import { Table, Column, Model, Index, AllowNull, Default } from 'sequelize-typescript';
import { View } from './__utils'



/**
 * 车队模型
 * 
 */
@Table({
  tableName: 'car',
  timestamps: false,
})
export default class Car extends Model {
  @Index
  @Column({
    primaryKey: true,
    autoIncrement: true,
  })
  id: number



  @View({
    title: "车辆",
    type: 'input'
  })
  @Index
  @AllowNull(false)
  @Column
  name: string

  //状态
  @Default(1)
  @Column
  status: number

}



export function View(config) {
  return function (target, propertyName) {
    target.constructor._view = target.constructor._view || {}

    const attrs = Reflect.getMetadata("sequelize:attributes", target)
    if (attrs[propertyName].allowNull == false) {
      config.allowNull = false
    }
    config.name = propertyName
    config.typeConfig = Object.assign({}, config.typeConfig, attrs[propertyName].type.options)
    config.typeAttrs = []

    //数字类型
    let typeName = attrs[propertyName].type.toString()
    if (typeName.slice(0, 5) == 'FLOAT') {
      config.type = config.type || "input-number"
      config.typeAttrs.push({
        key: ':precision',
        value: config.typeConfig.decimals//设置精度
      })
      let max = _.repeat(9, config.typeConfig.length - config.typeConfig.decimals) + "." + _.repeat(9, config.typeConfig.decimals)

      config.typeAttrs.push({
        key: ':max',
        value: max
      })
      if (config.typeConfig.hasOwnProperty('min')) {
        config.typeAttrs.push({
          key: ':min',
          value: config.typeConfig.min
        })
      }
    } else if (typeName == 'STRING') {
      config.type = "input"
    }

    target.constructor._view[propertyName] = config
  }
}


export function ViewDependent(config) {
  return function (target, propertyName) {
    target.constructor._viewDependent = target.constructor._viewDependent || {}
    let associations = Reflect.getMetadata("sequelize:associations", target)
    let association = _.find(associations, (item) => {
      return item.options.as == propertyName
    })
    //关联模型
    let model = association.associatedClassGetter()
    const attrs = Reflect.getMetadata("sequelize:attributes", model.prototype)
    //根据config.fields 与 model 创建table模型
    config.fields = _.compact(_.map(config.fields, (item) => {
      attrs[item.prop];
      let custom = model._view[item.prop];
      if (custom) {
        item.label = custom.title;
        return item;
      } else {
        return;
      }
    }))
    target.constructor._viewDependent[propertyName] = config
  }
}