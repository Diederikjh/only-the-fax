'use strict';
let exec = require('child_process').exec;

exports.handler = (event, context, callback) => {
    if (!event.cmd) {
        return callback('Please specify a command to run as event.cmd');
    }
    
    // From https://aws.amazon.com/blogs/compute/running-executables-in-aws-lambda/ 
    process.env['PATH'] = process.env['PATH'] + ':' + process.env['LAMBDA_TASK_ROOT'];
    // Shipped training data (from default install of 3.03 of Tesserect)
    process.env['TESSDATA_PREFIX'] = process.env['LAMBDA_TASK_ROOT'];
    
    let command = "tesseract bing.jpg stdout";
    
    const child = exec(command, (error) => {
        // Resolve with result of process
        callback(error, 'Process complete!');
    });

    // Log process stdout and stderr
    child.stdout.on('data', console.log);
    child.stderr.on('data', console.error);
};