const gulp = require("gulp");
const $ = require("gulp-load-plugins")();
const browserSync = require("browser-sync");
const autoprefixer = require("autoprefixer");

const { options } = require("./options");
const { bowerTask, vendorJs } = require("./vendor.js");

// production || development
// # gulp --env production

gulp.task("clean", () => {
  return gulp
    .src(["./public/**/*", "./.tmp"], { read: false, allowEmpty: true }) // 選項讀取：false 阻止 gulp 讀取文件的內容，使此任務更快。
    .pipe($.clean());
});

gulp.task("jade", () => {
  return gulp
    .src(["./source/**/!(_)*.jade"])
    .pipe($.plumber())
    .pipe(
      $.data(function() {
        var json = require("../source/data/data.json");
        var menus = require("../source/data/menu.json");
        var source = {
          data: json,
          menus: menus
        };
        return source;
      })
    )
    .pipe($.jade({ pretty: true }))
    .pipe(gulp.dest("./public"))
    .pipe(
      browserSync.reload({
        stream: true
      })
    );
});

gulp.task("babel", () => {
  return gulp
    .src(["./source/javascripts/**/*.js"])
    .pipe($.plumber())
    .pipe($.sourcemaps.init())
    .pipe($.concat("all.js"))
    .pipe(
      $.babel({
        presets: ["es2015"]
      })
    )
    .pipe(
      $.if(
        options.env === "production",
        $.uglify({
          compress: {
            drop_console: true
          }
        })
      )
    )
    .pipe($.sourcemaps.write("."))
    .pipe(gulp.dest("./public/javascripts"))
    .pipe(
      browserSync.reload({
        stream: true
      })
    );
});

gulp.task("sass", function() {
  var processors = [
    autoprefixer({
      browsers: ["last 5 version"]
    })
  ];

  return gulp
    .src(["./source/stylesheets/**/*.sass", "./source/stylesheets/**/*.scss"])
    .pipe($.plumber())
    .pipe($.sourcemaps.init())
    .pipe(
      $.sass({
        outputStyle: "nested",
        includePaths: ["./node_modules/bootstrap/scss"]
      }).on("error", $.sass.logError)
    )
    .pipe($.postcss(processors))
    .pipe($.if(options.env === "production", $.minifyCss())) // 假設開發環境則壓縮 CSS
    .pipe($.sourcemaps.write("."))
    .pipe(gulp.dest("./public/stylesheets"))
    .pipe(
      browserSync.reload({
        stream: true
      })
    );
});

gulp.task("imageMin", async function() {
  gulp
    .src("./source/images/*")
    .pipe($.if(options.env === "production", $.imagemin()))
    .pipe(gulp.dest("./public/images"));
});

gulp.task("deploy", function() {
  return gulp.src("./public/**/*").pipe($.ghPages());
});

// series() and parallel()
// series() 依序執行，必須一個執行完才能執行下一個
// parallel() 平行執行，可同時多個任務

gulp.task(
  "default",
  gulp.parallel(
    "jade",
    "sass",
    "babel",
    "imageMin",
    gulp.series(bowerTask, vendorJs),

    // 上述任務都完成後，執行函式
    function(done) {
      // 瀏覽器
      browserSync.init({
        server: { baseDir: "./public" },
        reloadDebounce: 2000 // 加入 Debounce 可以避免短時間大量編譯，造成瀏覽器不斷重新 Refresh 的問題
      });

      gulp.watch(
        ["./source/stylesheets/**/*.sass", "./source/stylesheets/**/*.scss"],
        gulp.series("sass")
      );
      gulp.watch(["./source/**/*.jade"], gulp.series("jade"));
      gulp.watch(["./source/javascripts/**/*.js"], gulp.series("babel"));

      // 事件完成後的 callback
      done();
    }
  )
);

gulp.task(
  "build",
  gulp.series(
    "clean",
    gulp.parallel("jade", "sass", "babel"),
    gulp.series(bowerTask, vendorJs, "imageMin")
  )
);
