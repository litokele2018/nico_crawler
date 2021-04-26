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
function downloadFile(dirName, uri, filename, callback) {
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
  var stream = fs.createWriteStream(filename);
  let request = http;
  if (uri.slice(0, 5) === 'https') {
    request = https;
  }
  request.get(uri, (res) => {
    // 文件总长度
    const len = parseInt(res.headers["content-length"]);
    let cur = 0;
    // 转为M 1048576 - bytes in  1Megabyte
    const total = (len / 1048576).toFixed(2);
    res.on("data", function (chunk) {
      cur += chunk.length;
      // 当前进度
      const progress = ((100.0 * cur) / len).toFixed(2);
      // 当前了多少M
      const currProgress = (cur / 1048576).toFixed(2);
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
const document = {};
document.write = () => {};
let count = 1;
let season = 1;

const download = {
  name: "致不灭的你",
  total: 1,
  seasons: [
    {
      urlPrefix: "http://www.nicotv.me/video/play/58196-1-",
      season: 1,
      episodes: 2,
    },
  ],
};
const c = new Crawler({
  maxConnections: 10,
  // This will be called for each crawled page
  callback: (error, res, done) => {
    if (error) {
      console.log("发生错误", error);
    } else {
      const $ = res.$;
      // $ is Cheerio by default
      //a lean implementation of core jQuery designed specifically for the server
      const url = $(".ff-row.row script").attr().src;
      axios
        .get("http://www.nicotv.me/" + url)
        .then((r) => {
          eval(r.data);
          let fileUrl = cms_player.url;
          if (!fileUrl) {
            throw new Error("url 存在问题");
          }
          let reg = new RegExp("(http|https).*mp4");
          const temp = fileUrl.slice(1).match(reg)[0];
          console.log(temp);
          let filename = `${download.name}\\${
            download.seasons[season - 1].name
              ? `${download.seasons[season - 1].name}-`
              : ""
          }0${season}-${count > 9 ? count : `0${count}`}.mp4`; //文件名
          console.log(filename);
          downloadFile(download.name, temp, filename, function () {
            console.log(filename + "下载完毕");
            count++;
            if (count <= download.seasons[season - 1].episodes) {
              c.queue(download.seasons[season - 1].urlPrefix + count + ".html");
            } else if (season + 1 <= download.total) {
              count = 1;
              season++;
              c.queue(download.seasons[season - 1].urlPrefix + count + ".html");
            }
          });
        })
        .catch((e) => {
          console.log("reject", e);
        });
    }
    done();
  },
});

// Queue just one URL, with default callback
let u = download.seasons[season - 1].urlPrefix + count + ".html";
c.queue(u);
// Queue a list of URLs
// c.queue(["http://www.google.com/", "http://www.yahoo.com"]);

// // Queue URLs with custom callbacks & parameters
// c.queue([
//   {
//     uri: "http://parishackers.org/",
//     jQuery: false,

//     // The global callback won't be called
//     callback: (error, res, done) => {
//       if (error) {
//         console.log(error);
//       } else {
//         console.log("Grabbed", res.body.length, "bytes");
//       }
//       done();
//     },
//   },
// ]);
