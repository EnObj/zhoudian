module.exports = {
    publicPath: process.env.NODE_ENV === 'production'
    ? 'https://6465-dev-9g0suwuw61afb9f3-1252108641.tcb.qcloud.la/enobj/zhoudian/'
    : '/',
    chainWebpack: config => {
        config
            .plugin('html')
            .tap(args => {
                args[0].title = '周店 - 周围的门店'
                return args
            })
    }
}