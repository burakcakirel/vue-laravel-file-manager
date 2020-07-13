module.exports = {
  configureWebpack: {
    // No need for splitting
    optimization: {
      splitChunks: false
    },
    devServer: {
      proxy: 'http://minejer.test/',
    }
  }
};
