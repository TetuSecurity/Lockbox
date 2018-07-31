var gulp        	= require('gulp');
var webpack         = require('webpack');
var webpackConfig   = require('./webpack.config');
var browserSync     = require('browser-sync-webpack-plugin');
var ts_project	    = require('gulp-typescript').createProject('./src/server/tsconfig.json');
var spawn           = require('child_process').spawn;
var server_proc;

gulp.task('compile-node', function(){
	return gulp.src('./src/server/**/*.ts')
	.pipe(ts_project()).js
	.pipe(gulp.dest('dist/server/'));
});

gulp.task('_start-server', function(){
    if (server_proc) {
        server_proc.kill();
        server_proc = undefined;
    }
    server_proc = spawn('node', ['dist/server/app.js', '--inspect=5858'], {
        cwd: __dirname,
        stdio: [0, 1, 2, 'ipc']
    });
});

gulp.task('start-server', gulp.series('compile-node', '_start-server'));

gulp.task('webpack', function(done) {
    var config = webpackConfig;
    process.env.BUILD_MODE = 'production';
    return webpack(config, function(err, stats){
        if (err) {
            console.error(err);
        }
        if (stats.hasErrors() && stats.compilation.errors) {
            stats.compilation.errors.forEach(function(e){console.error(e,'\n');});
        }
        console.log(stats.toString());
        return done(err);
    });
});

gulp.task('webpack-watch', function() {
    var config = webpackConfig;
    process.env.BUILD_MODE = 'development';
    config.watch = true;
    config.cache = true;
    config.bail = false;
    config.devtool = 'inline-eval-cheap-source-map';
    config.module.rules.push(
        {
            enforce: 'pre',
            test: /\.ts$/,
            use: 'source-map-loader'
        }
    );
    config.plugins.push(
        new browserSync({
            host: 'localhost',
            port: 3001,
            proxy: 'localhost:3000',
            ws: true,
            open: !(process.env.DOCKER_MODE)
        })
    );
    webpack(config, function(err, stats) {
        if (err) {
            console.error(err);
        }
        if (stats.hasErrors() && stats.compilation.errors) {
            stats.compilation.errors.forEach(function(e){console.error(e,'\n');});
        }
        console.log(stats.toString());
    });
});


gulp.task('_watch', function(){
    console.log('watching for changes...');
    gulp.watch('src/server/**/*.ts', gulp.series('compile-node', '_start-server'));
});

gulp.task(
    'watch', 
    gulp.parallel('start-server', '_watch', 'webpack-watch')
);

// Default Task
gulp.task('default', gulp.parallel('compile-node', 'webpack'));
