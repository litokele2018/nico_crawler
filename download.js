const Crawler = require("crawler");
const fs = require("fs");
const axios = require("axios");
const http = require("http");
const https = require("https");

const path = require("path");
/*
 * url 网络文件地址
 * filename 文件名
 * callback 回调函数
 */
function downloadFile(
  { dirName, uri, filename, season, count, io, mark },
  callback
) {
  const absPath = path.join(__dirname, dirName);
  //检查某个目录是否存在
  try {
    let stat = fs.statSync(absPath);
    if (!stat.isDirectory()) {
      fs.mkdir(absPath, function (error) {
        if (error) {
          console.log(error);
          return false;
        }
        console.log("创建目录" + dirName + "成功");
      });
    }
  } catch (error) {
    fs.mkdir(absPath, function (error) {
      if (error) {
        console.log(error);
        return false;
      }
      console.log("创建目录" + dirName + "成功");
    });
  }
  //如果文件已存在，获取长度
  let receivedBytes = 0;
  if (fs.existsSync(filename)) {
    let stats = fs.statSync(filename);
    receivedBytes = stats.size;
    console.log("续传");
  }
  console.log(receivedBytes);
  // 通过flag指定文件是新建还是追加
  var stream = fs.createWriteStream(filename, {
    start: receivedBytes,
    flags: receivedBytes > 0 ? "a+" : "w",
  });
  
  let len = 0;
  axios
    .head(uri)
    .then((res) => {
      len = parseInt(res.headers["content-length"]);
      console.log("len", len);
    })
    .catch((e) => {});
    
  let request = http;
  if (uri.slice(0, 5) === "https") {
    request = https;
  }

  //发送请求时，增加一个range头
  var opts = {
    headers: { Range: `bytes=${receivedBytes}-` },
  };

  request.get(uri, opts, (res) => {
    // 文件总长度
    let cur = receivedBytes;
    // 转为M 1048576 - bytes in  1Megabyte
    res.on("data", function (chunk) {
      const total = (len / 1048576).toFixed(2);
      cur += chunk.length;
      // 当前进度
      const progress = ((100.0 * cur) / len).toFixed(2);
      // 当前了多少M
      const currProgress = (cur / 1048576).toFixed(2);
      io.emit("downloadInfo", {
        dirName,
        season,
        count,
        progress,
        currProgress,
        total,
        mark,
      });
      console.log(
        `${season}-${count}:当前进度:${progress}%,current:${currProgress}M,total:${total}M`
      );
    });
    res.on("end", () => {
      console.log("下载结束");
    });
    // 超时,结束等
    stream
      .on("finish", () => {
        // console.log('文件写入结束')
        callback();
        stream.close();
      })
      .on("error", (err) => {
        fs.unlink(filename);
      });
    res.pipe(stream);
  });
}
module.exports = {
  downloadFile,
};
