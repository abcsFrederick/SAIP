const path = require('path');
var webpack = require('webpack');
var jQuery = require('jquery');
const HtmlWebpackPlugin = require('html-webpack-plugin');
var HtmlWebpackTagsPlugin = require('html-webpack-tags-plugin');

module.exports = env => {
    return {
        entry: './src/main.js',
        output: {
            path: path.resolve(__dirname, './public'),
            // filename: 'app.bundle.js'
            filename: '[name].[hash].js'
        },
        module:{
            rules:[
                {
                    test: /\.js$/,
                    exclude: /(node_modules|bower_components)/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: ['env'],
                    babelrc: false
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
                title: 'Smb'
            }),
            new webpack.DefinePlugin({
                api: env.mode === 'development' ? JSON.stringify(`https://fsivgl-infv01d.ncifcrf.gov/v0.1/`) : JSON.stringify(`http://localhost:${env.api}/`),
                ws: env.mode === 'development' ? JSON.stringify(`wss://fsivgl-infv01d.ncifcrf.gov/w0.1/`) : JSON.stringify(`ws://localhost:${env.api}/`)
            }),
            new HtmlWebpackTagsPlugin({ tags: ['./fontello/css/fontello.css', './fontello/css/animation.css', 'https://use.fontawesome.com/releases/v5.0.13/css/all.css'], append: true })
        ],
        devServer: {
            host: '0.0.0.0',
            port: env.port,
            hot: true,
            disableHostCheck: true,
            contentBase: [path.join(__dirname, "public"),path.join("/")]
        }
    }
};
