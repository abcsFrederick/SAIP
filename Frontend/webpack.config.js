const path = require('path');
var webpack = require('webpack');
var jQuery = require('jquery');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: './src/main.js',
    output: {
        path: path.resolve(__dirname, './public'),
        // filename: 'app.bundle.js'
        filename: '[name].[contenthash].js'
    },
    module:{
        rules:[
            {
      		    test: /\.js$/,
      		    exclude: /(node_modules|bower_components)/,
      		    use: {
        		    loader: 'babel-loader',
        		    options: {
          		    	presets: ['env']
        		    }
      			 }
    		}, {
                test:/\.pug$/,use:'pug-loader'
            }, {
                test: /\.styl$/,
                loader: 'style-loader!css-loader!stylus-loader'
            }, {
                test: /\.css$/,
                loader:'style-loader!css-loader'
            }, { 
                test: /\.(png|woff|woff2|eot|ttf|svg)$/, loader: 'url-loader?limit=100000' 
            },
        ]
    },
    plugins:[
        new webpack.ProvidePlugin({
            jQuery: 'jquery',
            $: 'jquery',
            'window.jQuery': 'jquery'
        }),
        new HtmlWebpackPlugin({
           title: 'Caching'
        })
        // new UglifyJsPlugin({
        //     test: /\.js($|\?)/i,
        // 	uglifyOptions: {drop_console:true}
        // })
    ],
    devServer: {
        host: '0.0.0.0',
        port: 8888,
        disableHostCheck: true,
        contentBase: [path.join(__dirname, "public"),path.join("/")]
   	    //contentBase:path.join("/") 
   }
};
