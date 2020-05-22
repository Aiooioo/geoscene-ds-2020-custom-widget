import fs from 'fs';
import path from 'path';

// ref: https://umijs.org/config/
export default {
  exportStatic: {
    htmlSuffix: true,
    dynamicRoot: true,
  },
  antd: {},
  dva: {
    hmr: true,
  },
  lessLoader: {
    javascriptEnabled: true,
  },
  title: '自定义LayerList微件',
};
