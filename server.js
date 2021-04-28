const Koa = require("koa");
const bodyParser = require("koa-bodyparser");
const { downloadFile } = require("./download");
const Crawler = require("crawler");
const axios = require("axios");
const app = new Koa();

const server = require("http").createServer(app.callback());

const io = require("socket.io")({
  ...server,
  cors: {
    origin: ["http://localhost:3000"],
  },
});

app.use(bodyParser());

app.use(async (ctx) => {
  ctx.set("Access-Control-Allow-Origin", "http://localhost:3000");
  ctx.set("Access-Control-Allow-Credentials", true);
  ctx.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Content-Length, Authorization, Accept, X-Requested-With , yourHeaderFeild"
  );
  ctx.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");

  if (ctx.method == "OPTIONS") {
    ctx.body = 200;
  } else if (ctx.request.path === "/download") {
    ctx.response.status = 200;
    ctx.body = "Hello World";
    const { data } = ctx.request.body;
    //
    const document = {};
    document.write = () => {};

    const { title, totalSeason, limit } = data.main;
    console.log(title);
    const download = {
      name: title,
      total: totalSeason,
      seasons: [],
    };

    let mark = -1;

    for (let i = 0; i < data.details.length; i++) {
      const { pageNum, episodes, name, season } = data.details[i];
      download.seasons.push({
        urlPrefix: `http://www.nicotv.me/video/play/${pageNum}-1-`,
        season: Number(season),
        episodes: Number(episodes),
        name,
      });
    }

    let arr = [...download.seasons];
    const downloadLimitArr = [];
    let curRun = 0;

    const c = new Crawler({
      maxConnections: 10,
      // This will be called for each crawled page
      callback: (error, res, done) => {
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
                throw new Error("url 存在问题");
              }
              let reg = new RegExp("(http|https).*mp4");
              const temp = fileUrl.slice(1).match(reg)[0];
              console.log(temp);
              const { season, name, count, directory, mark } = res.options;

              let filename = `${directory}\\${
                name ? `${name}-` : ""
              }0${season}-${count > 9 ? count : `0${count}`}.mp4`; //文件名
              console.log(filename);

              const checkCanDownload = (
                { directory, temp, filename, season, count, io, mark },
                type
              ) => {
                if (type === "arr") {
                  downloadLimitArr.length && downloadLimitArr.shift()();
                  return;
                }
                const dod = () => {
                  curRun++;
                  downloadFile(
                    {
                      dirName: directory,
                      uri: temp,
                      filename,
                      season,
                      count,
                      io,
                      mark,
                    },
                    () => {
                      console.log(filename + "下载完毕");
                      curRun--;
                      checkCanDownload({}, "arr");
                    }
                  );
                };

                if (curRun < limit) {
                  dod();
                } else {
                  downloadLimitArr.push(dod);
                }
              };
              // call
              console.log('call func')
              checkCanDownload(
                {
                  directory,
                  temp,
                  filename,
                  season,
                  count,
                  io,
                  mark,
                },
                "now"
              );
            })
            .catch((e) => {
              console.log("reject", e);
            });
        }
        done();
      },
    });

    while (arr.length) {
      let { urlPrefix, episodes, name, season } = arr.shift();
      for (let i = 0; i < episodes; i++) {
        mark++;
        c.queue({
          directory: download.name,
          uri: `${urlPrefix}${i + 1}.html`,
          season,
          name,
          mark,
          count: i + 1,
        });
      }
    }
  } else if (ctx.request.path.match("/socket")) {
    console.log(ctx.request.path);
    ctx.body = 200;
  }
});

io.on("connection", (socket) => {
  console.log(`connect: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`disconnect: ${socket.id}`);
  });
});

server.listen(8080);
io.listen(8081);
