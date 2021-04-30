const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");

let HttpProxyAgent = require("http-proxy-agent");
let HttpsProxyAgent = require("https-proxy-agent");

let proxy = "http://127.0.0.1:1082";
let agent = new HttpsProxyAgent(proxy);

/*
 * url 网络文件地址
 * filename 文件名
 * callback 回调函数
 */
function downloadFile(
  { dirName, uri, filename, season, count, io, mark, site = "nico" },
  callback
) {
  const absPath = path.join(__dirname, dirName);
  const filePath = path.join(absPath, filename);
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
  console.log(filePath);
  if (fs.existsSync(filePath)) {
    let stats = fs.statSync(filePath);
    receivedBytes = stats.size;
    console.log("续传");
    console.log(receivedBytes);
  }
  // 通过flag指定文件是新建还是追加
  var stream = fs.createWriteStream(filePath, {
    start: receivedBytes,
    flags: receivedBytes > 0 ? "a+" : "w",
  });

  // 超时,结束等
  stream
    .on("finish", () => {
      // console.log('文件写入结束')
      callback();
      stream.close();
    })
    .on("error", (err) => {
      console.log(err);
      fs.unlink(filePath);
    });

  //发送请求时，增加一个range头
  var opts = {
    agent: site === "em" ? agent : null,
    headers: {
      Accept: "*/*",
      Range: `bytes=${receivedBytes}-`,
      Referer: "https://271dm.applinzi.com",
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1 Mobile/15E148 Safari/604.1",
    },
  };

  const getRequest = (uri) => {
    if (!uri) return http;
    if (uri.slice(0, 5) === "https") {
      opts.agent = site === "em" ? new HttpsProxyAgent(proxy) : null;
      return https;
    } else {
      opts.agent = site === "em" ? new HttpProxyAgent(proxy) : null;
      return http;
    }
  };

  let request = getRequest(uri);
  let currentRequest = null;
  const retryCount = 12;
  let retry = 0;

  const parseResponse = (res) => {
    let len = 0;
    let cur = receivedBytes;
    try {
      len = parseInt(res.headers["content-range"].split(/\//).pop());
      if (!/video\/mp4/.test(res.headers["content-type"])) {
        throw new Error("not video type or len err");
      }
    } catch (error) {
      // console.log("error", error);
      currentRequest.destroy();
      if (retryCount > retry) {
        retry++;
        console.log("retry", retry);
        setTimeout(() => {
          currentRequest = request.get(uri, opts, parseResponse);
        }, 1000);
      }
      return;
    }
    retry = 0;
    // 转为M 1048576 - bytes in  1Megabyte
    res.on("data", function (chunk) {
      try {
        cur += chunk.length;
        console.log(`cur:${cur},len:${len}`);
        if (cur >= len) {
          currentRequest.destroy();
          return;
        }
        const total = (len / 1048576).toFixed(2);
        // 当前进度
        const progress = ((100.0 * cur) / len).toFixed(2);
        // 当前了多少M
        const currProgress = (cur / 1048576).toFixed(2);
        io &&
          io.emit("downloadInfo", {
            dirName,
            season,
            count,
            progress,
            currProgress,
            total,
            mark,
          });
        // console.log(
        //   `${season}-${count}:当前进度:${progress}%,current:${currProgress}M,total:${total}M`
        // );
      } catch (error) {
        console.log(error, "ondata");
      }
    });
    res.on("end", () => {
      console.log("下载结束");
    });
    res.pipe(stream);
  };

  try {
    if (site === "nico") {
      currentRequest = request.get(uri, opts, parseResponse);
    } else if (site === "em") {
      request.get(uri, opts, (res) => {
        uri = res.headers.location;
        request = getRequest(uri);
        currentRequest = request.get(uri, opts, parseResponse);
      });
    }
  } catch (error) {
    console.log(uri, "error", error);
  }
}
module.exports = {
  downloadFile,
};
