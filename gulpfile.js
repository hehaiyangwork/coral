/**
 * autor: hehaiyang
 * email: hehaiyangwork@qq.com
 * description: 使用gulp进行前端自动化构建
 */
var gulp = require('gulp');
var plug = require('gulp-load-plugins')();

var streamqueue = require('streamqueue'); // 连续并入
var through = require('through2');   // 文件流处理
var browserSync = require('browser-sync');  // 浏览器reload
var exec = require('child_process').exec;   // cmd命令
var minimist = require('minimist');  // 参数
var config = require('./config.json');  // 自定义配置

var log = plug.util.log;

var defaultOptions = {
  string: ['env'],
  boolean: ['min'],
  default: {
    env:  process.env.NODE_ENV ||'prod',
    min: false
  }
};

var options = minimist(process.argv.slice(2), defaultOptions);

/**
 * List the available gulp tasks
 */
gulp.task('help', plug.taskListing);

// ############## templates 模版处理 start ##############
/**
 * 预编译hbs模版
 * @type {[type]}
 */
gulp.task('compileTemplate', function(){

  var stream = streamqueue({ objectMode: true });

  stream.queue(
   gulp.src(config.vendor.template)
  );

  stream.queue(
   gulp.src(config.app.template)
     .pipe(plug.plumber({errorHandler: plug.notify.onError("Error: <%= error.message %>")}))
     .pipe(plug.handlebars({handlebars: require('handlebars')}))
     .pipe(plug.wrap('Handlebars.template(<%= contents %>)'))
     .pipe(plug.declare({namespace: 'Handlebars.templates',noRedeclare:true, processName: function(filePath) {
       // Drop the client/templates/ folder from the namespace path
       return plug.declare.processNameByPath(filePath.replace('app/components/', '').replace('templates/', ''));
     }}))
  );

  // once preprocess ended, concat result into a real file
  return stream.done()
    .pipe(plug.plumber({errorHandler: plug.notify.onError("Error: <%= error.message %>")}))
    .pipe(plug.concat(config.file.template))
    .pipe(plug.if(options.env === 'prod', plug.uglify()))
    .pipe(gulp.dest(config.public.scripts));

});

/**
 * 监听模版文件变化
 */
gulp.task('watchTemplate', function(){
  gulp.watch(config.app.template, function (event) {
    plug.sequence('compileTemplate', 'revmanifest', 'revreplace')(function (err) {
      if (err) log(err)
    })
  });
});

// ############## md5 start ##############
/**
 * 计算静态文件md5值
 */
gulp.task("revmanifest", function(){
  return gulp.src(config.manifest)
    .pipe(plug.plumber({errorHandler: plug.notify.onError("Error: <%= error.message %>")}))
    .pipe(plug.rev())
    .pipe(gulp.dest(config.public.assets))
    .pipe(plug.rev.manifest())
    .pipe(gulp.dest(config.public.manifest));
})

/**
 * 静态文件md5版本控制
 * @type {[type]}
 */
gulp.task('revreplace', function() {
  var manifest = gulp.src(config.public.manifest+config.file.manifest);
  return gulp.src(config.revreplace.path)
      .pipe(plug.revReplace({manifest: manifest}))
      .pipe(gulp.dest(config.public.views));
});

// ############## vendor start ##############
/**
 * 重置vendor库
 */
gulp.task('resetVendor', function (cb) {
  exec(config.cmd.vendor, function (err, stdout, stderr) {
    if(stdout) log(stdout);
    if(stderr) log(stderr);
    cb(err);
  });
});

// ############## analyzejshint start ############
/**
 * js文件分析
 */
gulp.task('analyzejshint', function(){
  return gulp.src(config.components.js)
    .pipe(plug.jshint('.jshintrc'))
    .pipe(plug.jshint.reporter('default'))
});

// ############## views 处理 start ##############
/**
 * 复制views文件
 */
gulp.task('views', function () {
  return gulp.src(config.views)
  .pipe(gulp.dest(config.public.views));
});
// 监听views文件
gulp.task('watchViews', function(){
  gulp.watch(config.views, function() {
    plug.sequence('views', 'revreplace')(function (err) {
      if (err) log(err)
    })
  });
});

// ############## js 模块化处理 start ##############
/**
 * 生成入口文件
 * @type {String}
 */
gulp.task('builtMainJs', function(){

  return gulp.src(config.components.js)
    .pipe(plug.plumber({errorHandler: plug.notify.onError("Error: <%= error.message %>")}))
    .pipe(through.obj(function(file,encoding,cb){
        var data = ", 'comp/"+ file.relative.replace('.js', '\'');
        file.contents = new Buffer(data);
        this.push(file);
        cb();
    }))
    .pipe(plug.concat(config.file.main))
    .pipe(through.obj(function(file,encoding,callback){
        var startStr = 'requirejs(["../../vendor/init"';
        var endStr = '],function(init) {init.initialize();});';
        file.contents = new Buffer(startStr + file.contents + endStr);
        this.push(file);
        callback();
    }))
    .pipe(plug.uglify())
    .pipe(gulp.dest(config.public.scripts));
});

/**
 * 合并压缩requireJs
 * @type {String}
 */
gulp.task('compileJs', function () {

  var stream = streamqueue({ objectMode: true });

  stream.queue(
    gulp.src(config.public.scripts+config.file.main)
      .pipe(plug.plumber({errorHandler: plug.notify.onError("Error: <%= error.message %>")}))
      .pipe(plug.requirejsOptimize({
        baseUrl: 'app/scripts',
        paths:{
            main: '../../public/assets/scripts/main',
            comp: '../components'
        }
      }))
      .pipe(plug.rename(config.file.app))
  );

  stream.queue(
   gulp.src(config.app.scripts)
  );

  // once preprocess ended, concat result into a real file
  return stream.done()
    .pipe(plug.plumber({errorHandler: plug.notify.onError("Error: <%= error.message %>")}))
    .pipe(plug.concat(config.file.app))
    .pipe(plug.if(options.env === 'prod', plug.uglify()))
    .pipe(gulp.dest(config.public.scripts));

});

/**
 * 监听模块js文件变化
 */
gulp.task('watchJs', function(){

  gulp.watch(config.components.js, function (event) {
    plug.sequence('builtMainJs', 'compileJs', 'revmanifest', 'revreplace')(function (err) {
      if (err) log(err)
    });
  });
});

// ############## sass 处理 start ##############
/**
 * 编译模块scss文件
 */
gulp.task('compileSass', function () {

  var stream = streamqueue({ objectMode: true });

  stream.queue(
    gulp.src(config.app.scssSrc)
     .pipe(plug.plumber({errorHandler: plug.notify.onError("Error: <%= error.message %>")}))
     .pipe(plug.sass())
  );

  // stream.queue(
  //  gulp.src('./app/**/*.{scss,css}')
  //   .pipe(plug.sass())
  // );

  // once preprocess ended, concat result into a real file
  return stream.done()
  .pipe(plug.plumber({errorHandler: plug.notify.onError("Error: <%= error.message %>")}))
  .pipe(plug.concat(config.file.appCss))
  .pipe(plug.if(options.env === 'prod', plug.cleancss()))
  .pipe(gulp.dest(config.public.styles))

});

/**
 * 监听模块scss文件
 */
gulp.task('watchSass', function(){
  gulp.watch(config.components.js, function (event) {
    plug.sequence('compileSass', 'revmanifest', 'revreplace')(function (err) {
      if (err) log(err)
    });
  });
});

// ############## components hbs 处理 end ##############
/**
 * 复制components文件
 */
gulp.task('components', function () {
  return gulp.src([config.components.hbs, '!app/components/**/templates/*.hbs'])
   .pipe(plug.plumber({errorHandler: plug.notify.onError("Error: <%= error.message %>")}))
   .pipe(gulp.dest(config.public.components))
});

/**
 * 监听components文件变化
 */
gulp.task('watchComponents', function(){
  gulp.watch([ config.components.hbs, '!app/components/**/templates/*.hbs'], ['components']);
});

// ############## images 处理 end ##############
/**
 * 图片处理
 */
gulp.task('images', function () {
  return gulp.src(['app/images/**/*.jpg', 'app/images/**/*.png'])
  .pipe(gulp.dest('public/assets/images'));
});

// ############## 其他 ##############

/**
 * 自动刷新浏览器
 * @type {[type]}
 */
gulp.task('reload', function() {

  // 动态页面
  browserSync.init({
    proxy: config.location,    //apache或iis等代理地址
    notify: false,              //刷新是否提示
    open: true                //是否自动打开页面
  });

  gulp.watch('./public/*', function() {
      browserSync.reload();
  });
})

/**
 * 清理发布文件夹
 * @type {[type]}
 */
gulp.task('clean', function() {
  return gulp.src(config.public.path, {read: false})
    .pipe(plug.clean());
});

// ############## 插件处理 end ##############
/**
 * 复制插件文件
 */
gulp.task('plugins', function () {
  return gulp.src(config.app.plugins)
  .pipe(gulp.dest(config.public.plugins))
})
// ############## 插件处理 end ##############

/**
 * 打包成功通知
 * @type {[type]}
 */
gulp.task('successNotity', function() {
  return gulp.src('./config.json', {read: false})
    .pipe(plug.notify('app build success !'));
});

/**
 * 开发模式
 */
gulp.task('watch', function(cb){
  plug.sequence('clean', "builtMainJs", ["compileJs", "compileSass", "compileTemplate"], ["components", "views", "plugins", "images"], ["watchComponents", "watchSass", "watchJs", "watchTemplate", "watchViews"], "successNotity", cb)(function () {
      log("########### 编译完成 ###########");
  });
});

/**
 * 打包
 */
gulp.task('build', function(cb){
  plug.sequence('clean', "builtMainJs", ["compileJs", "compileSass", "compileTemplate"], ["components", "views", "plugins"], "reload", "successNotity", cb)(function () {
      log("########### 打包完成 ###########");
  });
});

// ############## 基本设定 ##############

gulp.task('w', plug.sequence('watch'));
gulp.task('h', plug.sequence('help'));

// help
gulp.task('default', function(){
	log('gulp 默认(时间戳)');
	log('gulp help(h)	gulp参数说明');
	log('gulp watch(w)	开发模式');
	log('gulp build	打包');
  log(new Date());
});
