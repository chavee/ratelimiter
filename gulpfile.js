const gulp = require('gulp');
const mocha = require('gulp-mocha');
const { spawn } = require('child_process');
var redisproc = null;

gulp.task('initialize', function(callback) {
    redisproc = spawn('redis-server', ['--port 6379']);
    redisproc.stdout.on('data', function(data){
        if (typeof(callback)=='function') {
            callback();
            callback = null;
        }
    });
});

gulp.task('test', ['initialize'], function() {
    //mocha spec --require spec/helpers/chai.js --reporter spec --exit
    gulp.src('spec/**', {read: false})
        .pipe(mocha({reporter: 'spec', require: 'spec/helpers/chai.js', exit:true}))
        .once('error', () => {
            process.exit(1);
        })
        .once('_result', (result) => {
            redisproc.kill('SIGTERM');
        })
        .once('end', () => {
            process.exit(0);
        })
});
