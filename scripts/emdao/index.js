const Crawler = require("crawler");

const { downloadFile } = require("../../download");

const emdao = ({ title, limit, details, io }) => {
  const document = {};
  document.write = () => {};

  console.log(title);

  const download = {
    name: title,
    seasons: [],
  };

  let mark = -1;

  for (let i = 0; i < details.length; i++) {
    const { pageNum, episodes, name, season, line } = details[i];
    download.seasons.push({
      urlPrefix: `https://m.emddm.vip/rhdm/${pageNum}/play-${line}-`,
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
      const text = $(".play_2").text();
      const reg = new RegExp(/var now=[^;]+/gi);
      let r = text.match(reg);
      eval(r[0]);
      let id = now;
      const { season, name, count, dirName, mark } = res.options;

      let filename = `${name ? `${name}-` : ""}0${season}-${
        count > 9 ? count : `0${count}`
      }.mp4`; //文件名
      console.log(filename);

      const resource = [
        "https://271dm.applinzi.com/v.php?id=",
        "http://58.218.200.8:899/yun6.php?id=",
      ];
      const uri = resource[0] + id;

      const data = {
        dirName,
        uri,
        filename,
        season,
        count,
        mark,
        io,
        site: "em",
      };
      // call
      checkCanDownload(data, "now");
    }
    done();
  };

  const c = new Crawler({
    maxConnections: 10,
    callback,
  });

  while (arr.length) {
    let { urlPrefix, episodes, name, season, line } = arr.shift();
    for (let i = 0; i < episodes; i++) {
      mark++;
      console.log(`${urlPrefix}${i}.html`);
      c.queue({
        dirName: download.name,
        uri: `${urlPrefix}${i}.html`,
        season,
        name,
        mark,
        line,
        count: i + 1,
      });
    }
  }
};

module.exports = {
  emdao,
};
