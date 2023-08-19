/**
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const path = require('path');
const HtmlBundlerPlugin = require('html-bundler-webpack-plugin');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [
          'css-loader',
        ],
      },
      // the bundler plugin allows webpack to copy the mainifest file
      // specified in the HTML from assets/ dir to dist/
      {
        test: /\.webmanifest$/,
        type: 'asset/resource',
        generator: {
          filename: '[name][ext]',
        },
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlBundlerPlugin({
      entry: {
        // define templates here
        index: 'src/index.html',
      },
      js: {
        // output filename of compiled JavaScript, used if inline is false
        filename: 'sw.js',
        inline: false, // inlines compiled JS into HTML using the <script> tag
      },
      css: {
        // output filename of extracted CSS, used if inline is false
        filename: 'css/[name].[contenthash:8].css',
        inline: true, // inlines CSS into HTML using the <style> tag
      },
    }),
    new CopyPlugin({
      patterns: [
        // copy only images defined in the webmanifest file
        {from: 'assets/images', to: 'images'},
      ],
    }),
  ],
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    publicPath: './',
    trustedTypes: {
      policyName: 'telnet#webpack',
    },
  },

  // this settings generate from one `src/index.ts` file many compiled files:
  // mani.js, runtime.js, vendors.js
  // note: if you will inline JS into HTML, the splitShunks option has no seanse
  // optimization: {
  //   runtimeChunk: 'single',
  //   splitChunks: {
  //     cacheGroups: {
  //       vendor: {
  //         test: /[\\/]node_modules[\\/]/,
  //         name: 'vendors',
  //         chunks: 'all'
  //       }
  //     }
  //   }
  // }
};
