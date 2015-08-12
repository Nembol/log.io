var fs = require('fs');
var util = require("util");
var net = require('net');
var events = require('events');
var winston = require('winston');

var LogStream = function(name, paths, log) {
    this.name = name;
    this.paths = paths;
    this.log = log;
}

util.inherits(LogStream, events.EventEmitter);

LogStream.prototype.watch = function () {
    this.log.info("Starting log stream: '" + this.name + "'");
    var paths = this.paths;
    for (var i = 0; i < paths.length; i++) {
        var path = paths[i];
        this.watchFile(path);
    }
    return this;
};

LogStream.prototype.watchFile = function (path) {
    var currSize, watcher,
        instance = this;
    if (!fs.existsSync(path)) {
        this.log.error("File doesn't exist: '" + path + "'");
        setTimeout((function () {
            return instance.watchFile(path);
        }), 1000);
        return;
    } else if(fs.lstatSync(path).isDirectory()){
        fs.readdir(path, function(err, files){
            for (f in files){
                instance.watchFile(path + files[f]);
            }
        });
    } else {
        this.log.info("Watching file: '" + path + "'");
        currSize = fs.statSync(path).size;
        return watcher = fs.watch(path, function (event, filename) {
            if (event === 'rename') {
                watcher.close();
                instance.watchFile(path);
            }
            if (event === 'change') {
                return fs.stat(path, function (err, stat) {
                    instance.readNewLogs(path, stat.size, currSize);
                    return currSize = stat.size;
                });
            }
        });
    }
};

LogStream.prototype.readNewLogs = function (path, curr, prev) {
    var instance = this;
    if (curr < prev) {
        return;
    }
    var rstream = fs.createReadStream(path, {
        encoding: 'utf8',
        start: prev,
        end: curr
    });
    return rstream.on('data', function (data) {
        var lines = data.split("\n");
        var results = [];
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (line) {
                results.push(instance.emit('new_log', line));
            }
        }
        return results;
    });
};

function LogHarvester(config) {
    this.nodeName = config.nodeName;
    this.server = config.server;
    this.delim = config.delimiter || '\r\n';
    this.log = config.logging || winston;
    this.logStreams = [];

    var logStreams = config.logStreams;
    for(var s in logStreams){
        this.logStreams.push(new LogStream(s, logStreams[s], this.log));
    }
}

LogHarvester.prototype.run = function () {
    var instance = this;
    this.connect();
    return this.logStreams.forEach(function (stream) {
        return stream.watch().on('new_log', function (msg) {
            if (instance.connected) {
                return instance.sendLog(stream, msg);
            }
        });
    });
};

LogHarvester.prototype.connect = function () {
    var instance = this;
    this.socket = new net.Socket;
    this.socket.on('error', function (error) {
        instance.connected = false;
        instance.log.error("Unable to connect server, trying again...");
        return setTimeout((function () {
            return instance.connect();
        }), 2000);
    });
    this.log.info("Connecting to server...");
    return this.socket.connect(this.server.port, this.server.host, function () {
        instance.connected = true;
        return instance.announce();
    });
};

LogHarvester.prototype.sendLog = function (stream, msg) {
    this.log.debug("Sending log: (" + stream.name + ") " + msg);
    return this.send('+log', stream.name, this.nodeName, 'info', msg);
};

LogHarvester.prototype.announce = function () {
    var results = [];
    for (var i = 0; i < this.logStreams.length; i++) {
        var l = this.logStreams[i];
        results.push(l.name);
    }
    var snames = results.join();
    this.log.info("Announcing: " + this.nodeName + " (" + snames + ")");
    this.send('+node', this.nodeName, snames);
    return this.send('+bind', 'node', this.nodeName);
};

LogHarvester.prototype.send = function () {
    var mtype = arguments[0];
    var args = arguments.length >= 2 ? [].slice.call(arguments, 1) : [];
    return this.socket.write("" + mtype + "|" + (args.join('|')) + this.delim);
};

exports.LogHarvester = LogHarvester;

//(function () {
//    var LogHarvester, LogStream,
//        __hasProp = {}.hasOwnProperty,
//        __extends = function (child, parent) {
//            for (var key in parent) {
//                if (__hasProp.call(parent, key)) child[key] = parent[key];
//            }
//            function ctor() {
//                this.constructor = child;
//            }
//
//            ctor.prototype = parent.prototype;
//            child.prototype = new ctor();
//            child.__super__ = parent.prototype;
//            return child;
//        },
//        __slice = [].slice;
//    /*
//     LogStream is a group of local files paths.  It watches each file for
//     changes, extracts new log messages, and emits 'new_log' events.
//     */
//
//
//    LogStream = (function (_super) {
//
//        __extends(LogStream, _super);
//
//
//
//        return LogStream;
//
//    })(events.EventEmitter);
//
//    /*
//     LogHarvester creates LogStreams and opens a persistent TCP connection to the server.
//
//     On startup it announces itself as Node with Stream associations.
//     Log messages are sent to the server via string-delimited TCP messages
//     */
//
//
//    LogHarvester = (function () {
//
//
//
//        return LogHarvester;
//
//    })();
//
//    exports.LogHarvester = LogHarvester;
//
//}).call(this);
