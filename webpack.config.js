var path = require('path');
var webpack = require('webpack');
var workbox = require('workbox-webpack-plugin');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var HtmlWebpackExcludeAssetsPlugin = require('html-webpack-exclude-assets-plugin');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var autoprefixer = require('autoprefixer');
var cssnano = require('cssnano');
var CopyWebpackPlugin = require('copy-webpack-plugin');
var CircularDependencyPlugin = require('circular-dependency-plugin');
var UglifyJsPlugin  = require('uglifyjs-webpack-plugin');
var AotPlugin = require('@ngtools/webpack').AngularCompilerPlugin;
var commonsChunkPlugin = webpack.optimize.CommonsChunkPlugin;
var NormalModuleReplacementPlugin = webpack.NormalModuleReplacementPlugin;

var bundles = ['common', 'polyfills', 'vendor', 'app', 'styles'];

var config = {
    entry: {
        'app': path.join(__dirname,'./src/client/main.ts'),
        'vendor': path.join(__dirname,'./src/client/vendor.ts'),
        'polyfills': path.join(__dirname,'./src/client/polyfills.ts'),
        'styles': path.join(__dirname, './src/client/scss/styles.scss')
    },
    output: {
        filename: '[name].[hash].min.js',
        path: path.join(__dirname, 'dist/client'),
        pathinfo: true
    },
    resolve: {
        extensions: ['.ts', '.js', '.json', '.scss', '.css']
    },
    module: {
        rules: [
            {
                test: /(?:\.ngfactory\.js|\.ngstyle\.js|\.ts)$/,
                loader: '@ngtools/webpack'
            },
            {
                test: /\.scss$/,
                include: [path.join(__dirname, './src/client/components')],
                use: [
                    {
                        loader: 'raw-loader'
                    },
                    {
                        loader: 'postcss-loader',
                        options: {
                            ident: 'postcss',
                            plugins: function(loader){
                                return [
                                    autoprefixer({remove: false, flexbox: true}),
                                    cssnano({zindex: false})
                                ];
                            }
                        }
                    },
                    {
                        loader:'sass-loader',
                        options: {
                          includePaths: [path.join(__dirname, './src/client/scss')]
                        }
                    }
                ]
            },
            {
                test: /\.scss$/,
                include: [
                    path.join(__dirname, './node_modules'), 
                    path.join(__dirname, './src/client/scss')
                ],
                use: ExtractTextPlugin.extract({
                    fallback: 'style-loader',
                    use: [
                        {
                            loader: 'css-loader'
                        },
                        {
                            loader: 'postcss-loader',
                            options: {
                                ident: 'postcss',
                                plugins: function(loader){
                                    return [
                                        autoprefixer({remove: false, flexbox: true}),
                                        cssnano({zindex: false})
                                    ];
                                }
                            }
                        },
                        {
                            loader:'sass-loader',
                            options: {
                                includePaths: [path.join(__dirname, './src/client/scss')]
                            }
                        }
                    ]
                })
            },
            // fonts
            {
                test: /\.((ttf)|(woff2?)|(eot))/i,
                loader: 'url-loader',
                exclude: [path.join(__dirname, './src/client/assets')],
                options: {
                    limit: 10240, // 10K limit
                    name: 'fonts/[name].[ext]'
                }
            },
            {
                test: /font(s)?\.svg/,
                exclude:  /\.svg\.js/,
                use: [
                    {
                        loader: 'url-loader',
                        options: {
                            limit: 10*1024,
                            name: 'fonts/[name].svg'
                        }
                    },
                    {
                        loader: 'svgo-loader'
                    }
                ]
            },
             // images
             {
                test: /\.((jpg)|(png)|(gif)|(bmp)|(ico))/,
                loader: 'url-loader',
                exclude: [path.join(__dirname, './src/client/assets')],
                options: {
                    limit: 10240, // 10K limit
                    name: 'assets/images/[name].[ext]'
                }
            },
            {
                test: /\.svg/,
                exclude: [/font(s)?/i, /\.svg\.js/],
                use: [
                    {
                        loader: 'url-loader',
                        options: {
                            limit: 10*1024,
                            name: 'assets/images/[name].svg'
                        }
                    },
                    {
                        loader: 'svgo-loader'
                    }
                ]
            },
            // templateUrl
            { 
                test: /\.html$/,
                use: [
                    {
                        loader: 'raw-loader'
                    }
                ]
            }
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            filename: path.join(__dirname, './dist/client/index.html'),
            template: path.join(__dirname, './src/client/index.html'),
            inject: 'body',
            hash: false,
            showErrors: false,
            excludeAssets: [/styles\..*js/i],
            chunksSortMode: function(a,b) {
                return bundles.indexOf(a.names[0]) - bundles.indexOf(b.names[0]);
            },
        }),
        new HtmlWebpackExcludeAssetsPlugin(),
        new AotPlugin({
            tsConfigPath: path.join(__dirname, './src/client/tsconfig.json'),
            mainPath: path.join(__dirname, './src/client/main.ts'),
            typeChecking: false,
        }),
        new UglifyJsPlugin({
            parallel: true,
            sourceMap: process.env.BUILD_MODE === 'development',
            cache: true,
            uglifyOptions: {
                output: {
                    comments: false
                }
            }
        }),
        new commonsChunkPlugin({
            name: 'common',
            minChunks: 2,
            async: false,
            children: false
        }),
        new ExtractTextPlugin({
            allChunks: true, 
            filename: 'styles.[contenthash].min.css'
        }),
        new CircularDependencyPlugin({
            exclude: /node_modules/,
            failOnError: true
        }),
        new CopyWebpackPlugin([
            {
                from: path.join(__dirname, './src/client/assets'),
                to: path.join(__dirname, './dist/client/assets')
            },
            {
                from: path.join(__dirname, './src/client/manifest.json'),
                to: path.join(__dirname, './dist/client/manifest.json')
            }
        ]),
        new NormalModuleReplacementPlugin(/environments\/environment/, function(resource) {
            resource.request = resource.request.replace(/environment$/, (process.env.BUILD_MODE === 'development' ? 'devEnvironment':'prodEnvironment'));
        }),
        new workbox.InjectManifest({
            swSrc: path.join(__dirname, './src/client/sw.js'),
            swDest: 'sw.js',
            importsDirectory: 'wb-assets',
            exclude: [
                /styles\..*\.min\.js/i, // empty bundle file from extractText
                /[0-9]+\..*?\.min\.js$/i, // lazy-loaded bundles
                /\.map/i, // source-maps
                /node_modules/, // node_modules
                /manifest/i // PWA manifest
            ]
        })
    ]
};

module.exports = config;
