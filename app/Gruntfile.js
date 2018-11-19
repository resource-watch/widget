
module.exports = function (grunt) {

    grunt.file.setBase('..');
    require('load-grunt-tasks')(grunt);

    grunt.initConfig({

        mochaTest: {
            e2e: {
                options: {
                    reporter: 'spec',
                    quiet: false, // Optionally suppress output to standard out (defaults to false)
                    clearRequireCache: true, // Optionally clear the require cache before running tests (defaults to false)
                    timeout: 100000,
                },
                src: ['app/test/e2e/**/*.spec.js']
            }
        },
        nyc: {
            cover: {
                options: {
                    include: ['app/src/**'],
                    exclude: '*.test.*',
                    reporter: ['lcov', 'text-summary'],
                    reportDir: 'coverage',
                    all: true
                },
                cmd: false,
                args: ['grunt', '--gruntfile', 'app/Gruntfile.js', 'mochaTest:e2e']
            }
        }
    });

    grunt.registerTask('e2eTest', ['mochaTest:e2e']);

    grunt.registerTask('test', ['unitTest']);

    grunt.registerTask('default', 'serve');
};
