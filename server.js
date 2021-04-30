const Koa = require("koa");
const bodyParser = require("koa-bodyparser");
const app = new Koa();

const server = require("http").createServer(app.callback());

const document = {};
document.write = () => {};
const NICO = "nico";
const EM = "em";

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

  try {
    if (ctx.method == "OPTIONS") {
      ctx.body = 200;
    } else if (ctx.request.path === "/download") {
      ctx.response.status = 200;
      ctx.body = "Hello World";
      const { data } = ctx.request.body;

      const { title, totalSeason, limit, site } = data.main;
      const { details } = data;

      if (site === NICO) {
        const { nico } = require("./scripts/nico/index");
        nico({
          title,
          totalSeason,
          limit,
          details,
          io,
        });
      } else if (site === EM) {
        const { emdao } = require("./scripts/emdao/index");
        emdao({
          title,
          totalSeason,
          limit,
          details,
          io,
        });
      }
    } else if (ctx.request.path.match("/socket")) {
      console.log(ctx.request.path);
      ctx.body = 200;
    }
  } catch (error) {
    console.log("some err", error);
  }
});

try {
  io.on("connection", (socket) => {
    console.log(`connect: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`disconnect: ${socket.id}`);
    });
  });

  server.listen(8080);
  io.listen(8081);
} catch (error) {
  console.log(error);
}
