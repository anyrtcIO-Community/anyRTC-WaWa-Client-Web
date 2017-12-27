var path = require('path')
var webpack = require('webpack')
var HtmlWebpackPlugin = require('html-webpack-plugin')
var CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = {
	entry: {
		"babel-polyfill" : "babel-polyfill",
		common: './index',
		anyrtcWaWaji: './anyRTCWaWaClient.js',
		list: './list.js',
		room: './room.js'
	},
	output: {
		path: path.resolve(__dirname, './dist'),
		// publicPath: './dist/',
		publicPath: '/',
		filename: '[name].[hash].js'
	},
	module: {
		rules: [
			{
				test: /\.js$/,
				loader: 'babel-loader',
				exclude: /node_modules/
			},
			{
				test: /\.css$/,
				loader: "style-loader!css-loader"
			},
			{
				test: /\.(eot|svg|ttf|woff|woff2)(\?\S*)?$/,
				loader: 'file-loader'
			},
			{
				test: /\.(png|jpg|gif|svg)$/,
				loader: 'file-loader',
				options: {
					name: '[name].[ext]?[hash]'
				}
			}
		]
	},
	plugins: [
		new CopyWebpackPlugin([
			{ from: './static/**'}
		]),
		new HtmlWebpackPlugin({
			template: './index.html',
			filename: './index.html',
			chunks: ['common', 'anyrtcWaWaji', 'list'],
			minify:{
				removeComments: true,
				collapseWhitespace: false
			},
			chunksSortMode: function (chunk1, chunk2) {
				var order = ['common', 'anyrtcWaWaji', 'list'];
				var order1 = order.indexOf(chunk1.names[0]);
				var order2 = order.indexOf(chunk2.names[0]);
				return order1 - order2;
			}
		}),
		new HtmlWebpackPlugin({
			template: './room.html',
			filename: './room.html',
			chunks: ['common', 'anyrtcWaWaji', 'room'],
			minify:{
				removeComments: true,
				collapseWhitespace: false
			},
			chunksSortMode: function (chunk1, chunk2) {
				var order = ['common', 'anyrtcWaWaji', 'room'];
				var order1 = order.indexOf(chunk1.names[0]);
				var order2 = order.indexOf(chunk2.names[0]);
				return order1 - order2;
			}
		}),
		new webpack.optimize.UglifyJsPlugin({    //压缩代码
			compress: {
				warnings: false
			},
			except: ['$super', '$', 'exports', 'require']    //排除关键字
		})
	]
}