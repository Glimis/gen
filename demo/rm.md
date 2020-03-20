此处使用`sequelize模型`,用`模板`与`ast`,简易实现gen的功能

其中`sequelize`使用`sequelize-typescript`进行辅助,配合自定义的`View`装饰,用以合并`Model`[指orm模型与初始化五步的模型]

## 总结
  此处`genertor`根据原来的ts改编【第一版】,用来提供第一版的思路
  相对于ast,模板快捷,但逻辑更加混乱[需要include系列配合]