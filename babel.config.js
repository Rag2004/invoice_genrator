module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: {
        node: 'current'
      }
    }],
    ['@babel/preset-react', {
      runtime: 'classic'
    }]
  ],
  ignore: [
    'node_modules'
  ]
};