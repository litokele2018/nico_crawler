const Crawler = require("crawler");
const axios = require("axios");
const { downloadFile } = require("../../download");
/*
 * url 网络文件地址
 * filename 文件名
 * callback 回调函数
 */
const nico = ({ title, limit, details, io }) => {
  const document = {};
  document.write = () => {};

  const download = {
    name: title,
    seasons: [],
  };

  let mark = -1;

  for (let i = 0; i < details.length; i++) {
    const { pageNum, episodes, name, season } = details[i];
    let urlPrefix = "";

    urlPrefix = `http://www.nicotv.me/video/play/${pageNum}-1-`;

    download.seasons.push({
      urlPrefix,
      season: Number(season),
      episodes: Number(episodes),
      name,
      line,
    });
  }

  let arr = [...download.seasons];
  const downloadLimitArr = [];
  let curRun = 0;

  const checkCanDownload = (data, type) => {
    if (type === "arr") {
      downloadLimitArr.length && downloadLimitArr.shift()();
      return;
    }

    const dod = (data) => {
      curRun++;
      downloadFile(data, () => {
        console.log(data.filename + "下载完毕");
        curRun--;
        checkCanDownload({}, "arr");
      });
    };

    if (curRun < limit) {
      dod(data);
    } else {
      downloadLimitArr.push(dod.bind(null, data));
    }
  };

  const callback = (error, res, done) => {
    if (error) {
      console.log("发生错误", error);
    } else {
      const $ = res.$;
      // $ is Cheerio by default
      const url = $(".ff-row.row script").attr().src;
      axios
        .get("http://www.nicotv.me/" + url)
        .then((r) => {
          eval(r.data);
          let fileUrl = cms_player.url;
          if (!fileUrl) {
            console.log(url);
            throw new Error("url 存在问题");
          }
          let reg = new RegExp("(http|https).*mp4");
          const uri = fileUrl.slice(1).match(reg)[0];
          console.log(uri);
          const { season, name, count, dirName, mark, io, line } = res.options;

          let filename = `${line ? `line:${line}-` : ""}${
            name ? `${name}-` : ""
          }0${season}-${count > 9 ? count : `0${count}`}.mp4`; //文件名
          console.log(filename);

          const data = {
            dirName,
            uri,
            filename,
            season,
            count,
            io,
            mark,
            site: "nico",
          };
          // call
          checkCanDownload(data, "now");
        })
        .catch((e) => {
          console.log("reject", e);
        });
    }
    done();
  };

  const c = new Crawler({
    maxConnections: 10,
    // This will be called for each crawled page
    callback,
  });

  while (arr.length) {
    let { urlPrefix, episodes, name, season, line } = arr.shift();
    for (let i = 0; i < episodes; i++) {
      mark++;
      c.queue({
        dirName: download.name,
        uri: `${urlPrefix}${i + 1}.html`,
        season,
        name,
        mark,
        io,
        line,
        count: i + 1,
      });
    }
  }
};

module.exports = {
  nico,
};
